import React, { useState } from 'react';
import { Session } from '../services/api';
import { Plus, Folder, FolderPlus, MessageSquare, Trash2, ChevronRight, HardDrive } from 'lucide-react';

interface Props {
  sessions: Session[];
  activeSessionId: string | null;
  activeWorkspace: string;
  onSelectSession: (session: Session) => void;
  onNewSession: (workspacePath?: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onChangeWorkspace: (newPath: string) => void;
}

export const Sidebar: React.FC<Props> = ({
  sessions,
  activeSessionId,
  activeWorkspace,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onChangeWorkspace
}) => {
  const [isChangingFolder, setIsChangingFolder] = useState(false);
  const [folderInput, setFolderInput] = useState(activeWorkspace);

  const handleFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (folderInput.trim()) {
      onChangeWorkspace(folderInput.trim());
      setIsChangingFolder(false);
    }
  };

  return (
    <div className="w-64 h-full bg-[#161b22] border-r border-[#30363d] flex flex-col text-xs">
      {/* Brand Header */}
      <div className="flex items-center gap-2.5 px-3 py-3 border-b border-[#30363d] bg-[#161b22]">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md shadow-purple-500/20">
          <HardDrive className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm tracking-wide text-white">Apex Agent</span>
            <span className="text-[9px] bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold px-1.5 py-0.2 rounded-full">v2.0</span>
          </div>
          <span className="text-[10px] text-gray-400 block font-mono">Autonomous AI Engineer</span>
        </div>
      </div>

      {/* Top Header: New Chat Button */}
      <div className="p-3 border-b border-[#30363d] space-y-2">
        <button
          onClick={() => onNewSession()}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 px-3 rounded flex items-center justify-center gap-2 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Task / Project</span>
        </button>

        {/* Active Project Location Card */}
        <div className="bg-[#0d1117] border border-[#30363d] rounded p-2">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="flex items-center gap-1 font-semibold uppercase text-[10px] tracking-wider">
              <Folder className="w-3 h-3 text-amber-400" />
              Project Folder
            </span>
            <button
              onClick={() => setIsChangingFolder(!isChangingFolder)}
              className="text-blue-400 hover:text-blue-300 text-[10px] underline"
            >
              {isChangingFolder ? 'Cancel' : 'Change'}
            </button>
          </div>

          {isChangingFolder ? (
            <form onSubmit={handleFolderSubmit} className="mt-1 space-y-1">
              <input
                type="text"
                value={folderInput}
                onChange={(e) => setFolderInput(e.target.value)}
                placeholder="C:\Projects\my-app"
                className="w-full bg-[#161b22] border border-[#30363d] rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-1 rounded text-[10px] font-medium"
              >
                Set Location
              </button>
            </form>
          ) : (
            <div
              title={activeWorkspace}
              className="font-mono text-[11px] text-gray-300 truncate"
            >
              {activeWorkspace}
            </div>
          )}
        </div>
      </div>

      {/* Chat History Section */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <div className="px-2 py-1 text-[10px] uppercase font-semibold text-gray-500 tracking-wider flex items-center gap-1">
          <MessageSquare className="w-3 h-3" />
          <span>Chat History</span>
        </div>

        {sessions.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-[11px]">
            No previous sessions. Start a new task!
          </div>
        ) : (
          sessions.map((s) => {
            const isActive = s.id === activeSessionId;
            return (
              <div
                key={s.id}
                onClick={() => onSelectSession(s)}
                className={`group px-2.5 py-2 rounded flex items-center justify-between cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-[#21262d] text-white font-medium border border-[#30363d]'
                    : 'text-gray-400 hover:bg-[#1f242c] hover:text-gray-200'
                }`}
              >
                <div className="truncate flex-1 pr-2">
                  <div className="truncate text-[11px]">{s.title || 'Untitled Session'}</div>
                  <div className="text-[10px] text-gray-500 truncate flex items-center gap-1 mt-0.5">
                    <Folder className="w-2.5 h-2.5" />
                    <span>{s.workspace_dir.split(/[\\/]/).pop()}</span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(s.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 hover:text-rose-400 p-1 text-gray-500 transition-opacity"
                  title="Delete Session"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
