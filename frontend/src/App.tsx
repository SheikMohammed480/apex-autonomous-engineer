import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { HardwareBanner } from './components/HardwareBanner';
import { ChatPane } from './components/ChatPane';
import { WorkspaceViewer } from './components/WorkspaceViewer';
import { FileExplorer } from './components/FileExplorer';
import {
  fetchHardwareProfile,
  fetchSessions,
  createSession,
  fetchSessionDetails,
  deleteSessionApi,
  fetchWorkspaceTree,
  ensureWorkspaceApi,
  HardwareProfile,
  Session,
  AgentStepUpdate,
  FileTreeItem
} from './services/api';

export const App: React.FC = () => {
  const [profile, setProfile] = useState<HardwareProfile | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('qwen2.5-coder:7b');
  const [activeWorkspace, setActiveWorkspace] = useState<string>('d:\\Agentic\\workspace');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [steps, setSteps] = useState<AgentStepUpdate[]>([]);
  const [activeStep, setActiveStep] = useState<AgentStepUpdate | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<FileTreeItem[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [ws, setWs] = useState<WebSocket | null>(null);

  // Refresh workspace file tree
  const refreshTree = useCallback((path: string) => {
    fetchWorkspaceTree(path).then(setFileTree);
  }, []);

  // Initialize Hardware and Sessions
  useEffect(() => {
    fetchHardwareProfile()
      .then((data) => {
        setProfile(data);
        if (data.available_ollama_models.includes('qwen2.5-coder:7b')) {
          setSelectedModel('qwen2.5-coder:7b');
        } else {
          setSelectedModel(data.selected_model || 'qwen2.5-coder:7b');
        }
      })
      .catch((err) => console.error('Failed to load hardware profile:', err));

    fetchSessions().then((list) => {
      setSessions(list);
      if (list.length > 0) {
        // Load most recent session
        handleSelectSession(list[0]);
      } else {
        handleNewSession();
      }
    });

    ensureWorkspaceApi(activeWorkspace);
    refreshTree(activeWorkspace);
  }, []);

  // WebSocket Connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/agent`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => console.log('Connected to Agent WebSocket');

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.error) {
          setSteps((prev) => [
            ...prev,
            { step_type: 'error', title: 'Error', content: data.error }
          ]);
          setIsRunning(false);
          return;
        }

        const step = data as AgentStepUpdate;

        // Deduplicate optimistic user prompt
        if (step.step_type === 'user') {
          setSteps((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.step_type === 'user' && last.content.trim() === step.content.trim()) {
              return prev;
            }
            return [...prev, step];
          });
          return;
        }

        setSteps((prev) => [...prev, step]);
        setActiveStep(step);

        if (step.step_type === 'tool_result') {
          // If a file was modified or created, refresh tree
          if (step.tool_name === 'write_file' || step.tool_name === 'apply_diff') {
            refreshTree(activeWorkspace);
          }
        }

        if (step.step_type === 'complete' || step.step_type === 'error') {
          setIsRunning(false);
          refreshTree(activeWorkspace);
          fetchSessions().then(setSessions);
        }
      } catch (e) {
        console.error('Error parsing WS message:', e);
      }
    };

    setWs(socket);
    return () => socket.close();
  }, [activeWorkspace, refreshTree]);

  // Create new chat session
  const handleNewSession = async (customPath?: string) => {
    const targetPath = customPath || activeWorkspace;
    const defaultTitle = `Task in ${targetPath.split(/[\\/]/).pop() || 'Project'}`;
    try {
      const newSess = await createSession(defaultTitle, targetPath, selectedModel);
      setSessions((prev) => [newSess, ...prev]);
      setActiveSessionId(newSess.id);
      setActiveWorkspace(newSess.workspace_dir);
      setSteps([]);
      setActiveStep(null);
      setSelectedFile(null);
      refreshTree(newSess.workspace_dir);
    } catch (e) {
      console.error(e);
    }
  };

  // Select existing session
  const handleSelectSession = async (session: Session) => {
    try {
      setActiveSessionId(session.id);
      setActiveWorkspace(session.workspace_dir);
      const details = await fetchSessionDetails(session.id);
      setSteps(details.messages || []);
      if (details.messages && details.messages.length > 0) {
        setActiveStep(details.messages[details.messages.length - 1]);
      } else {
        setActiveStep(null);
      }
      setSelectedFile(null);
      refreshTree(session.workspace_dir);
    } catch (e) {
      console.error(e);
    }
  };

  // Delete session
  const handleDeleteSession = async (id: string) => {
    await deleteSessionApi(id);
    const updated = sessions.filter((s) => s.id !== id);
    setSessions(updated);
    if (activeSessionId === id) {
      if (updated.length > 0) {
        handleSelectSession(updated[0]);
      } else {
        handleNewSession();
      }
    }
  };

  // Switch Workspace Folder
  const handleChangeWorkspace = async (newPath: string) => {
    setActiveWorkspace(newPath);
    await ensureWorkspaceApi(newPath);
    refreshTree(newPath);
    handleNewSession(newPath);
  };

  // Send Prompt to Agent
  const handleSendMessage = (prompt: string) => {
    setIsRunning(true);
    setSelectedFile(null);

    // Optimistically show user request immediately in execution stream
    const userStep: AgentStepUpdate = {
      step_type: 'user',
      title: 'User Request',
      content: prompt
    };
    setSteps((prev) => [...prev, userStep]);
    setActiveStep(userStep);

    // Optimistically update session title in sidebar
    if (activeSessionId) {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSessionId && (s.title.startsWith('Task in ') || s.title.startsWith('Untitled'))) {
            const clean = prompt.trim().split('\n')[0];
            const title = clean.length > 36 ? clean.slice(0, 36) + '...' : clean;
            return { ...s, title };
          }
          return s;
        })
      );
    }

    const payload = {
      prompt,
      workspace_dir: activeWorkspace,
      model: selectedModel,
      session_id: activeSessionId
    };

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    } else {
      fetch('/api/agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.steps) {
            setSteps(data.steps);
            if (data.steps.length > 0) {
              setActiveStep(data.steps[data.steps.length - 1]);
            }
          }
          refreshTree(activeWorkspace);
        })
        .catch((err) => {
          setSteps((prev) => [
            ...prev,
            { step_type: 'error', title: 'Network Error', content: String(err) }
          ]);
        })
        .finally(() => setIsRunning(false));
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0d1117] text-[#c9d1d9]">
      {/* Top Banner: Dynamic Hardware Specs & Active Model */}
      <HardwareBanner
        profile={profile}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
        onRefreshProfile={() => fetchHardwareProfile().then(setProfile)}
      />

      {/* Main Multi-Pane Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Chat Sessions & Workspace Location */}
        <Sidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          activeWorkspace={activeWorkspace}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
          onDeleteSession={handleDeleteSession}
          onChangeWorkspace={handleChangeWorkspace}
        />

        {/* Center Pane: Agent ReAct Stream & Input */}
        <div className="w-[440px] min-w-[340px] max-w-[550px] h-full flex flex-col">
          <ChatPane
            steps={steps}
            isRunning={isRunning}
            onSendMessage={handleSendMessage}
            onSelectResult={(step) => {
              setActiveStep(step);
              setSelectedFile(null);
            }}
          />
        </div>

        {/* Center-Right Pane: Execution Inspector / Diff Viewer / Live Preview */}
        <div className="flex-1 h-full overflow-hidden border-r border-[#30363d]">
          <WorkspaceViewer
            activeItem={activeStep}
            selectedFilePath={selectedFile}
            activeWorkspace={activeWorkspace}
          />
        </div>

        {/* Far-Right Pane: Project File Explorer */}
        <div className="w-64 h-full">
          <FileExplorer
            tree={fileTree}
            onRefresh={() => refreshTree(activeWorkspace)}
            onSelectFile={(path) => {
              setSelectedFile(path);
              setActiveStep(null);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
