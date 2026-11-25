import React from 'react';
import { FileTreeItem } from '../services/api';
import { Folder, FileCode, RefreshCw, ChevronRight, ChevronDown } from 'lucide-react';

interface Props {
  tree: FileTreeItem[];
  onRefresh: () => void;
  onSelectFile: (filePath: string) => void;
}

export const FileExplorer: React.FC<Props> = ({ tree, onRefresh, onSelectFile }) => {
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});

  const toggleExpand = (path: string) => {
    setExpanded((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const renderTree = (items: FileTreeItem[], level: number = 0) => {
    return items.map((item) => {
      const isDir = item.type === 'directory';
      const isOpen = expanded[item.path] ?? true;

      return (
        <div key={item.path} style={{ paddingLeft: `${level * 12}px` }}>
          <div
            onClick={() => {
              if (isDir) {
                toggleExpand(item.path);
              } else {
                onSelectFile(item.abs_path || item.path);
              }
            }}
            className="flex items-center gap-1.5 py-1 px-1.5 rounded hover:bg-[#21262d] cursor-pointer text-xs text-gray-300 hover:text-white transition-colors"
          >
            {isDir ? (
              <>
                {isOpen ? (
                  <ChevronDown className="w-3 h-3 text-gray-500" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-gray-500" />
                )}
                <Folder className="w-3.5 h-3.5 text-amber-400" />
              </>
            ) : (
              <>
                <span className="w-3" />
                <FileCode className="w-3.5 h-3.5 text-blue-400" />
              </>
            )}
            <span className="truncate">{item.name}</span>
          </div>

          {isDir && isOpen && item.children && (
            <div>{renderTree(item.children, level + 1)}</div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1117] border-l border-[#30363d] text-xs">
      <div className="px-3 py-2 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between">
        <span className="font-semibold text-gray-300 uppercase tracking-wider text-[10px]">
          Workspace Files
        </span>
        <button
          onClick={onRefresh}
          className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#30363d]"
          title="Refresh File Tree"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {tree.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-[11px]">
            No files in project yet. The agent will create files as it executes tasks.
          </div>
        ) : (
          renderTree(tree)
        )}
      </div>
    </div>
  );
};
