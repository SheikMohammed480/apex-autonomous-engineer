import React, { useState, useEffect } from 'react';
import { AgentStepUpdate, FileDetail, fetchFileContent, getWorkspacePreviewUrl } from '../services/api';
import {
  FileCode,
  TerminalSquare,
  Copy,
  Check,
  Globe,
  RotateCw,
  ExternalLink,
  Code2,
  Monitor,
  Tablet,
  Smartphone,
  Eye
} from 'lucide-react';

interface Props {
  activeItem: AgentStepUpdate | null;
  selectedFilePath: string | null;
  activeWorkspace: string;
}

export const WorkspaceViewer: React.FC<Props> = ({
  activeItem,
  selectedFilePath,
  activeWorkspace
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'inspector'>('preview');
  const [fileDetail, setFileDetail] = useState<FileDetail | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [viewportMode, setViewportMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // Load file content whenever selectedFilePath changes
  useEffect(() => {
    if (selectedFilePath) {
      setFileLoading(true);
      fetchFileContent(selectedFilePath, activeWorkspace)
        .then((data) => {
          setFileDetail(data);
          setActiveTab('code');
        })
        .catch((err) => {
          console.error('Failed to load file:', err);
          setFileDetail(null);
        })
        .finally(() => setFileLoading(false));
    }
  }, [selectedFilePath, activeWorkspace]);

  // When a tool call step is clicked, automatically show inspector
  useEffect(() => {
    if (activeItem && !selectedFilePath) {
      setActiveTab('inspector');
    }
  }, [activeItem]);

  const handleCopy = () => {
    let text = '';
    if (activeTab === 'code' && fileDetail) {
      text = fileDetail.content;
    } else {
      text = activeItem?.tool_result || activeItem?.content || '';
    }
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Determine smart preview folder
  const targetPreviewWorkspace = React.useMemo(() => {
    if (selectedFilePath) {
      const norm = selectedFilePath.replace(/\\/g, '/');
      const parts = norm.split('/');
      parts.pop();
      const folder = parts.join('/');
      if (folder && (folder.includes(':') || folder.startsWith('/'))) return folder;
      if (folder) return `${activeWorkspace.replace(/\\/g, '/')}/${folder}`;
    }
    return activeWorkspace;
  }, [selectedFilePath, activeWorkspace]);

  const previewUrl = getWorkspacePreviewUrl(targetPreviewWorkspace, 'index.html');

  // Viewport width styling
  const viewportWidthClass =
    viewportMode === 'mobile'
      ? 'max-w-[390px] border-x border-[#30363d] shadow-2xl'
      : viewportMode === 'tablet'
      ? 'max-w-[768px] border-x border-[#30363d] shadow-2xl'
      : 'w-full';

  return (
    <div className="flex flex-col h-full bg-[#0d1117]">
      {/* Top Bar with Mode Tabs & Action Tools */}
      <div className="px-3 py-2 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between gap-2 flex-wrap">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-[#0d1117] p-0.5 rounded-lg border border-[#30363d]">
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition ${
              activeTab === 'preview'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Live Web Preview</span>
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition ${
              activeTab === 'code'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Code Viewer</span>
            {fileDetail && (
              <span className="text-[10px] bg-purple-900/60 px-1 rounded text-purple-200 uppercase font-mono">
                {fileDetail.extension}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('inspector')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition ${
              activeTab === 'inspector'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <TerminalSquare className="w-3.5 h-3.5" />
            <span>Step Inspector</span>
          </button>
        </div>

        {/* Tab-Specific Action Controls */}
        <div className="flex items-center gap-2">
          {activeTab === 'preview' && (
            <>
              {/* Responsive Screen Sizers */}
              <div className="flex items-center bg-[#0d1117] border border-[#30363d] rounded p-0.5 text-gray-400">
                <button
                  onClick={() => setViewportMode('desktop')}
                  className={`p-1 rounded ${viewportMode === 'desktop' ? 'bg-[#21262d] text-white' : 'hover:text-white'}`}
                  title="Desktop View"
                >
                  <Monitor className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewportMode('tablet')}
                  className={`p-1 rounded ${viewportMode === 'tablet' ? 'bg-[#21262d] text-white' : 'hover:text-white'}`}
                  title="Tablet View"
                >
                  <Tablet className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewportMode('mobile')}
                  className={`p-1 rounded ${viewportMode === 'mobile' ? 'bg-[#21262d] text-white' : 'hover:text-white'}`}
                  title="Mobile View"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Reload Button */}
              <button
                onClick={() => setPreviewKey((k) => k + 1)}
                className="text-gray-400 hover:text-white bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded p-1.5 transition"
                title="Reload Live App"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>

              {/* Open in Full Tab */}
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-purple-300 hover:text-white bg-purple-950/60 hover:bg-purple-900/60 border border-purple-700/60 rounded px-2.5 py-1 transition font-medium"
                title="Open in Dedicated Tab"
              >
                <span>Open Full</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </>
          )}

          {activeTab === 'code' && fileDetail && (
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="font-mono text-[11px] text-gray-400">
                {fileDetail.lines} lines &bull; {(fileDetail.size / 1024).toFixed(1)} KB
              </span>
              <button
                onClick={handleCopy}
                className="text-gray-400 hover:text-white flex items-center gap-1 text-[11px] bg-[#21262d] px-2.5 py-1 rounded border border-[#30363d] transition"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>
          )}

          {activeTab === 'inspector' && (
            <button
              onClick={handleCopy}
              className="text-gray-400 hover:text-white flex items-center gap-1 text-[11px] bg-[#21262d] px-2.5 py-1 rounded border border-[#30363d] transition"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy Output'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 overflow-hidden relative">
        {/* TAB 1: LIVE INTERACTIVE PREVIEW */}
        {activeTab === 'preview' && (
          <div className="w-full h-full bg-[#080b10] flex items-center justify-center p-2">
            <div className={`h-full ${viewportWidthClass} transition-all duration-300 rounded-lg overflow-hidden border border-[#30363d] bg-white relative`}>
              <iframe
                key={previewKey}
                src={previewUrl}
                title="Apex Agent Live Preview"
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
              />
            </div>
          </div>
        )}

        {/* TAB 2: CODE VIEWER WITH LINE NUMBERS */}
        {activeTab === 'code' && (
          <div className="w-full h-full overflow-auto bg-[#0d1117] font-mono text-xs">
            {fileLoading ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                <span>Loading file...</span>
              </div>
            ) : !fileDetail ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 p-8 text-center">
                <FileCode className="w-10 h-10 mb-2 text-gray-600" />
                <p className="font-medium text-gray-400">No File Selected</p>
                <p className="text-gray-500 text-xs mt-1">
                  Click any file in the <strong>Workspace Files</strong> panel on the right to inspect its code.
                </p>
              </div>
            ) : (
              <div className="flex min-w-full">
                {/* Line Numbers Gutter */}
                <div className="bg-[#161b22] border-r border-[#30363d] py-3 px-2 text-right select-none text-gray-600 font-mono text-[11px] shrink-0 min-w-[45px]">
                  {fileDetail.content.split('\n').map((_, i) => (
                    <div key={i} className="leading-5">
                      {i + 1}
                    </div>
                  ))}
                </div>

                {/* Formatted Code Block */}
                <pre className="p-3 text-gray-200 font-mono text-[11px] leading-5 overflow-x-auto flex-1 whitespace-pre">
                  {fileDetail.content}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: STEP INSPECTOR & DIFF VIEWER */}
        {activeTab === 'inspector' && (
          <div className="w-full h-full overflow-auto p-4 bg-[#0d1117]">
            {!activeItem ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 p-8 text-center">
                <TerminalSquare className="w-10 h-10 mb-2 text-gray-600" />
                <p className="font-medium text-gray-400">No Step Selected</p>
                <p className="text-gray-500 text-xs mt-1">
                  Click on any step card in the <strong>Apex Execution Stream</strong> to view its parameters and output.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#30363d]">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-sm">{activeItem.title || 'Step Detail'}</span>
                    {activeItem.tool_name && (
                      <span className="bg-purple-950/70 border border-purple-700/60 text-purple-300 px-2 py-0.5 rounded font-mono text-xs">
                        {activeItem.tool_name}
                      </span>
                    )}
                  </div>
                </div>

                {activeItem.tool_args && (
                  <div>
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                      Tool Arguments:
                    </span>
                    <pre className="bg-[#161b22] border border-[#30363d] rounded-lg p-3 text-xs font-mono text-emerald-300 overflow-x-auto">
                      {JSON.stringify(activeItem.tool_args, null, 2)}
                    </pre>
                  </div>
                )}

                <div>
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                    Output:
                  </span>
                  <pre className="bg-[#161b22] border border-[#30363d] rounded-lg p-3 text-xs font-mono text-gray-200 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {activeItem.tool_result || activeItem.content || ''}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
