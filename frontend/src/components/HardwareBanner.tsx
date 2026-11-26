import React, { useState } from 'react';
import { HardwareProfile, saveGroqKeyApi, saveGeminiKeyApi } from '../services/api';
import { Cpu, HardDrive, ShieldCheck, Zap, Key, ExternalLink, Check, X, Sparkles } from 'lucide-react';

interface Props {
  profile: HardwareProfile | null;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  onRefreshProfile?: () => void;
}

export const HardwareBanner: React.FC<Props> = ({
  profile,
  selectedModel,
  onSelectModel,
  onRefreshProfile
}) => {
  const [modalType, setModalType] = useState<'gemini' | 'groq' | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!profile) return null;

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      if (modalType === 'gemini') {
        await saveGeminiKeyApi(apiKeyInput.trim());
        setSaveSuccess(true);
        onSelectModel('gemini-2.5-flash');
      } else {
        await saveGroqKeyApi(apiKeyInput.trim());
        setSaveSuccess(true);
        onSelectModel('qwen/qwen3.8-27b');
      }
      if (onRefreshProfile) onRefreshProfile();
      setTimeout(() => {
        setModalType(null);
        setSaveSuccess(false);
        setApiKeyInput('');
      }, 1200);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save API key');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="bg-[#161b22] border-b border-[#30363d] px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 text-gray-300">
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-medium text-white">{profile.cpu_name}</span>
            <span className="text-gray-500">({profile.cpu_cores}C / {profile.cpu_threads}T)</span>
          </div>

          <div className="flex items-center gap-1.5 text-gray-300">
            <HardDrive className="w-3.5 h-3.5 text-purple-400" />
            <span>RAM: <strong className="text-white">{profile.total_ram_gb} GB</strong></span>
          </div>

          <div className="flex items-center gap-1.5 text-gray-300">
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            <span>GPU: <strong className="text-white">{profile.gpu_name}</strong></span>
            {profile.vram_gb > 0 && <span className="text-gray-400">({profile.vram_gb} GB VRAM)</span>}
          </div>

          <div className="flex items-center gap-1 text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 rounded px-2 py-0.5 font-mono">
            <ShieldCheck className="w-3 h-3" />
            <span>{profile.recommended_tier}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Gemini Key Status & Setup Button */}
          {profile.gemini_configured ? (
            <button
              onClick={() => { setApiKeyInput(''); setModalType('gemini'); }}
              className="flex items-center gap-1.5 bg-blue-950/60 text-blue-300 border border-blue-600/60 rounded px-2.5 py-1 text-xs hover:bg-blue-900/60 transition"
              title="Google Gemini Cloud Active (1,000,000 Free TPM)"
            >
              <Sparkles className="w-3 h-3 fill-blue-300 text-blue-300" />
              <span>Gemini 2.5 Active (1M TPM)</span>
            </button>
          ) : (
            <button
              onClick={() => { setApiKeyInput(''); setModalType('gemini'); }}
              className="flex items-center gap-1.5 bg-blue-950/70 text-blue-300 border border-blue-500/60 rounded px-2.5 py-1 text-xs hover:bg-blue-900/70 transition font-medium"
            >
              <Key className="w-3 h-3" />
              <span>Free Gemini Key (1M TPM)</span>
            </button>
          )}

          {/* Groq Key Status & Setup Button */}
          {profile.groq_configured ? (
            <button
              onClick={() => { setApiKeyInput(''); setModalType('groq'); }}
              className="flex items-center gap-1.5 bg-emerald-950/60 text-emerald-400 border border-emerald-700/60 rounded px-2.5 py-1 text-xs hover:bg-emerald-900/60 transition"
              title="Groq Cloud Active"
            >
              <Zap className="w-3 h-3 fill-emerald-400" />
              <span>Groq Active</span>
            </button>
          ) : (
            <button
              onClick={() => { setApiKeyInput(''); setModalType('groq'); }}
              className="flex items-center gap-1.5 bg-amber-950/70 text-amber-300 border border-amber-600/60 rounded px-2.5 py-1 text-xs hover:bg-amber-900/70 transition font-medium"
            >
              <Key className="w-3 h-3" />
              <span>Free Groq Key</span>
            </button>
          )}

          {/* Model Selector */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Active Model:</span>
            <select
              value={selectedModel}
              onChange={(e) => onSelectModel(e.target.value)}
              className="bg-[#0d1117] border border-[#30363d] rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
            >
              {profile.available_ollama_models.map((m) => {
                const isGemini = m.includes('gemini');
                const isGroq = m.includes('openai') || m.includes('qwen3.8') || m.includes('llama') || m.includes('deepseek') || m.includes('groq');
                
                let label = `🖥️ ${m} [Local • Unlimited Tokens]`;
                if (isGemini) {
                  if (m.includes('3.5-flash-lite')) {
                    label = `🚀 ${m} [1,000,000 TPM • Ultra-Fast]`;
                  } else if (m.includes('3.5-flash')) {
                    label = `✨ ${m} [1,000,000 TPM Free • High Limit]`;
                  } else {
                    label = `✨ ${m} [1,000,000 TPM Free]`;
                  }
                } else if (isGroq) {
                  if (m.includes('120b')) {
                    label = `⚡ ${m} [Groq 6K TPM • 120B Frontier]`;
                  } else {
                    label = `⚡ ${m} [Groq 8K TPM • 500+ tok/s]`;
                  }
                }

                return (
                  <option key={m} value={m}>
                    {label} {m === profile.recommended_model ? '★ Best' : ''}
                  </option>
                );
              })}
            </select>
            {/* Active Model Token Quota Pill */}
            <span
              className="text-[10px] bg-purple-950/80 text-purple-300 border border-purple-700/60 px-2 py-0.5 rounded-full font-mono shrink-0"
              title="Token quota capacity per minute"
            >
              Quota:{' '}
              {selectedModel.includes('gemini')
                ? '1M TPM'
                : selectedModel.includes('openai') || selectedModel.includes('qwen3.8') || selectedModel.includes('groq')
                ? '8K TPM'
                : 'Unlimited'}
            </span>
          </div>
        </div>
      </div>

      {/* Cloud API Key Setup Modal */}
      {modalType && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl max-w-md w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#30363d]">
              <div className="flex items-center gap-2">
                {modalType === 'gemini' ? (
                  <>
                    <div className="w-7 h-7 rounded-lg bg-blue-950/80 border border-blue-600/60 flex items-center justify-center text-blue-400">
                      <Sparkles className="w-4 h-4 fill-blue-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-white">Google Gemini 2.5 (1M Free TPM)</h3>
                  </>
                ) : (
                  <>
                    <div className="w-7 h-7 rounded-lg bg-orange-950/80 border border-orange-700/60 flex items-center justify-center text-orange-400">
                      <Zap className="w-4 h-4 fill-orange-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-white">Groq Cloud Integration (100% Free)</h3>
                  </>
                )}
              </div>
              <button
                onClick={() => setModalType(null)}
                className="text-gray-400 hover:text-white transition p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveKey} className="mt-4 space-y-4">
              {modalType === 'gemini' ? (
                <>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Google Gemini 2.5 Flash provides <strong>frontier-class coding intelligence</strong> with a massive <strong>1,000,000 Tokens Per Minute quota</strong> — 125x larger than Groq, with no rate limit bottlenecks.
                  </p>

                  <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3 text-xs text-gray-400 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">How to get your free key:</span>
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-blue-400 hover:text-blue-300 underline"
                      >
                        <span>aistudio.google.com</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <ol className="list-decimal list-inside space-y-0.5 text-gray-400 pt-1">
                      <li>Sign in with your Google account.</li>
                      <li>Click <strong>Create API Key</strong>.</li>
                      <li>Paste the key below.</li>
                    </ol>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Groq LPUs deliver <strong>300+ tokens/second</strong> running open models.
                    Produces fast code with <strong>zero CPU/GPU load</strong> on your laptop.
                  </p>

                  <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3 text-xs text-gray-400 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">How to get your free key:</span>
                      <a
                        href="https://console.groq.com/keys"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-blue-400 hover:text-blue-300 underline"
                      >
                        <span>console.groq.com</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <ol className="list-decimal list-inside space-y-0.5 text-gray-400 pt-1">
                      <li>Sign in with Google / GitHub.</li>
                      <li>Click <strong>API Keys</strong> &rarr; <strong>Create API Key</strong>.</li>
                      <li>Paste the key below.</li>
                    </ol>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  {modalType === 'gemini' ? 'Google AI Studio Key' : 'Groq API Key'}
                </label>
                <input
                  type="password"
                  placeholder={modalType === 'gemini' ? 'AQ...' : 'gsk_...'}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 font-mono"
                  autoFocus
                />
              </div>

              {saveError && (
                <div className="text-xs text-red-400 bg-red-950/50 border border-red-800/60 rounded p-2">
                  {saveError}
                </div>
              )}

              {saveSuccess && (
                <div className="text-xs text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 rounded p-2 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  <span>{modalType === 'gemini' ? 'Gemini 2.5 Flash is now active!' : 'Groq API Key saved!'}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !apiKeyInput.trim()}
                  className={`px-4 py-1.5 text-xs font-medium text-white rounded-lg transition disabled:opacity-50 flex items-center gap-1.5 ${
                    modalType === 'gemini'
                      ? 'bg-blue-600 hover:bg-blue-500'
                      : 'bg-orange-600 hover:bg-orange-500'
                  }`}
                >
                  {isSaving ? 'Saving...' : modalType === 'gemini' ? 'Activate Gemini 2.5' : 'Save Groq Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
