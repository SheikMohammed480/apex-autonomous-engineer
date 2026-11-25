import React, { useState, useRef, useEffect } from 'react';
import { AgentStepUpdate } from '../services/api';
import { Send, Terminal, Code, CheckCircle, AlertCircle, Loader2, Sparkles, Clock, User, Bot } from 'lucide-react';

interface Props {
  steps: AgentStepUpdate[];
  isRunning: boolean;
  onSendMessage: (msg: string) => void;
  onSelectResult: (step: AgentStepUpdate) => void;
}

export const ChatPane: React.FC<Props> = ({ steps, isRunning, onSendMessage, onSelectResult }) => {
  const [input, setInput] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [steps]);

  // Live timer while running
  useEffect(() => {
    let timer: any;
    if (isRunning) {
      setElapsed(0);
      timer = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    } else {
      clearInterval(timer);
    }
    return () => clearInterval(timer);
  }, [isRunning]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isRunning) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleChipClick = (prompt: string) => {
    if (isRunning) return;
    onSendMessage(prompt);
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}s`;
  };

  const suggestions = [
    {
      title: 'Kanban TaskFlow Board',
      icon: '🚀',
      desc: 'Drag-and-drop, priority tags, localStorage',
      prompt: 'Build a complete modern Kanban TaskFlow Board with drag-and-drop, category columns (Todo, In Progress, Done), priority badges, search filter, and localStorage.'
    },
    {
      title: 'Trading Terminal Simulator',
      icon: '📊',
      desc: 'Candlestick canvas chart, indicators, order book',
      prompt: 'Build a modern Cyberpunk Crypto & Stock Trading Simulator with live candlestick canvas chart, orderbook, technical indicators (RSI, SMA), and automated trading bot.'
    },
    {
      title: 'Scientific Calculator App',
      icon: '🧮',
      desc: 'Math engine, history panel, hotkeys',
      prompt: 'Build a full-featured dark glassmorphism scientific calculator with calculation history panel, trigonometric functions, square roots, and full keyboard bindings.'
    },
    {
      title: '2D Retro Arcade Canvas Game',
      icon: '🎮',
      desc: 'Space shooter, particles, wave progression',
      prompt: 'Build an interactive 2D Space Shooter arcade canvas game with keyboard controls (arrow keys to move, spacebar to shoot), particle explosions, enemy waves, and high score tracking.'
    }
  ];

  return (
    <div className="flex flex-col h-full bg-[#161b22] border-r border-[#30363d]">
      {/* Stream Header */}
      <div className="px-4 py-3 border-b border-[#30363d] flex items-center justify-between">
        <div className="flex items-center gap-2 font-medium text-sm text-white">
          <Terminal className="w-4 h-4 text-purple-400" />
          <span>Apex Execution Stream</span>
        </div>
        {isRunning && (
          <div className="flex items-center gap-2 text-xs text-purple-300 bg-purple-950/60 border border-purple-700/60 px-2.5 py-1 rounded-full font-mono shadow-sm animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin text-purple-400" />
            <Clock className="w-3 h-3 text-purple-400" />
            <span>{formatTime(elapsed)}</span>
          </div>
        )}
      </div>

      {/* Message & Step List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {steps.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 text-xs px-2 py-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center mb-3 shadow-lg shadow-purple-500/25">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <p className="font-semibold text-white text-sm mb-1">Apex Agent Ready</p>
            <p className="text-gray-400 max-w-xs leading-relaxed mb-6">
              Autonomous software engineer powered by hybrid cloud & local models. Select a starter task or describe what you want to build.
            </p>

            {/* Quick Starter Chips */}
            <div className="w-full grid grid-cols-1 gap-2 text-left">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleChipClick(s.prompt)}
                  disabled={isRunning}
                  className="p-2.5 rounded-lg bg-[#0d1117] hover:bg-[#21262d] border border-[#30363d] hover:border-purple-500/60 transition group flex items-start gap-2.5 text-left disabled:opacity-50"
                >
                  <span className="text-base shrink-0 p-1 rounded bg-[#161b22] border border-[#30363d]">
                    {s.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-gray-200 group-hover:text-purple-300 transition text-xs block truncate">
                      {s.title}
                    </span>
                    <span className="text-[11px] text-gray-500 block truncate">
                      {s.desc}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          steps.map((step, idx) => {
            const isUser = step.step_type === 'user';
            const isMessage = step.step_type === 'message';
            const isTool = step.step_type === 'tool_call' || step.step_type === 'tool_result';
            const isComplete = step.step_type === 'complete';
            const isError = step.step_type === 'error';

            if (isUser) {
              return (
                <div
                  key={idx}
                  onClick={() => onSelectResult(step)}
                  className="p-3.5 rounded-xl text-xs cursor-pointer transition border border-purple-500/50 bg-gradient-to-br from-purple-950/70 via-indigo-950/50 to-[#120d20] text-purple-100 shadow-md shadow-purple-950/30 hover:border-purple-400"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center shadow-sm">
                        <User className="w-3 h-3 text-white" />
                      </div>
                      <span className="font-semibold text-purple-200 text-xs">You</span>
                    </div>
                    <span className="text-[10px] bg-purple-900/60 text-purple-300 border border-purple-700/50 px-2 py-0.5 rounded-full font-mono">
                      User Prompt
                    </span>
                  </div>
                  <div className="text-purple-100 font-sans text-xs whitespace-pre-wrap leading-relaxed select-text">
                    {step.content}
                  </div>
                </div>
              );
            }

            if (isMessage) {
              return (
                <div
                  key={idx}
                  onClick={() => onSelectResult(step)}
                  className="p-3.5 rounded-xl text-xs cursor-pointer transition border border-emerald-800/50 bg-[#0d1615] text-gray-200 shadow-sm hover:border-emerald-700/80"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center shadow-sm">
                        <Bot className="w-3 h-3 text-white" />
                      </div>
                      <span className="font-semibold text-emerald-300 text-xs">Apex Agent</span>
                    </div>
                    <span className="text-[10px] bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 rounded-full font-mono">
                      Assistant Response
                    </span>
                  </div>
                  <div className="text-gray-200 font-sans text-xs whitespace-pre-wrap leading-relaxed select-text">
                    {step.content}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={idx}
                onClick={() => onSelectResult(step)}
                className={`p-3 rounded-lg text-xs cursor-pointer transition border ${
                  isError
                    ? 'bg-rose-950/30 border-rose-800/50 text-rose-200 shadow-sm'
                    : isComplete
                    ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-200 shadow-sm'
                    : isTool
                    ? 'bg-[#0d1117] border-[#30363d] hover:border-purple-500/60 text-gray-300'
                    : 'bg-[#161b22] border-[#30363d] text-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold flex items-center gap-1.5">
                    {isComplete ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    ) : isError ? (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                    ) : isTool ? (
                      <Code className="w-3.5 h-3.5 text-blue-400" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    {step.title || step.step_type.toUpperCase()}
                  </span>
                  {step.tool_name && (
                    <span className="text-[10px] bg-purple-950/60 border border-purple-800/40 text-purple-300 px-1.5 py-0.2 rounded font-mono">
                      {step.tool_name}
                    </span>
                  )}
                </div>
                <div className="text-gray-400 font-mono text-[11px] whitespace-pre-wrap line-clamp-3">
                  {step.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-[#30363d] bg-[#0d1117]">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isRunning}
            placeholder={
              isRunning
                ? 'Apex Agent is executing...'
                : 'Describe an app or feature to build...'
            }
            className="flex-1 bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 font-sans"
          />
          <button
            type="submit"
            disabled={isRunning || !input.trim()}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium px-3.5 py-2 rounded-lg transition disabled:opacity-40 flex items-center gap-1.5 shadow-md shadow-purple-500/20"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">Run</span>
          </button>
        </div>
      </form>
    </div>
  );
};
