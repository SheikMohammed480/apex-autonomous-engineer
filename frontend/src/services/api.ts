export interface HardwareProfile {
  os_name: string;
  cpu_name: string;
  cpu_cores: number;
  cpu_threads: number;
  total_ram_gb: number;
  gpu_name: string;
  vram_gb: number;
  has_cuda: boolean;
  has_apple_metal: boolean;
  recommended_tier: string;
  recommended_model: string;
  available_ollama_models: string[];
  selected_model: string;
  groq_configured?: boolean;
  gemini_configured?: boolean;
}

export interface AgentStepUpdate {
  id?: number;
  step_type: 'user' | 'thought' | 'tool_call' | 'tool_result' | 'message' | 'error' | 'complete';
  title?: string;
  content: string;
  tool_name?: string;
  tool_args?: Record<string, any>;
  tool_result?: string;
}

export interface Session {
  id: string;
  title: string;
  workspace_dir: string;
  model: string;
  created_at: string;
  updated_at: string;
  messages?: AgentStepUpdate[];
}

export interface FileTreeItem {
  name: string;
  path: string;
  abs_path?: string;
  type: 'file' | 'directory';
  size?: number;
  children?: FileTreeItem[];
}

export interface FileDetail {
  path: string;
  name: string;
  content: string;
  size: number;
  lines: number;
  extension: string;
}

export async function fetchFileContent(path: string, workspaceDir?: string): Promise<FileDetail> {
  const params = new URLSearchParams({ path });
  if (workspaceDir) {
    params.set('workspace_dir', workspaceDir);
  }
  const res = await fetch(`/api/workspace/file?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to load file');
  return res.json();
}

export function getWorkspacePreviewUrl(workspacePath: string, subpath: string = 'index.html'): string {
  // Safe base64 encoding of workspace path
  const b64 = btoa(unescape(encodeURIComponent(workspacePath)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `/api/preview/${b64}/${subpath}`;
}

export async function fetchHardwareProfile(): Promise<HardwareProfile> {
  const res = await fetch('/api/hardware');
  if (!res.ok) throw new Error('Failed to fetch hardware profile');
  return res.json();
}

export async function fetchSessions(): Promise<Session[]> {
  const res = await fetch('/api/sessions');
  if (!res.ok) return [];
  return res.json();
}

export async function createSession(title: string, workspace_dir: string, model: string): Promise<Session> {
  const res = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, workspace_dir, model })
  });
  if (!res.ok) throw new Error('Failed to create session');
  return res.json();
}

export async function fetchSessionDetails(sessionId: string): Promise<Session> {
  const res = await fetch(`/api/sessions/${sessionId}`);
  if (!res.ok) throw new Error('Failed to fetch session details');
  return res.json();
}

export async function deleteSessionApi(sessionId: string): Promise<void> {
  await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
}

export async function fetchWorkspaceTree(path: string): Promise<FileTreeItem[]> {
  try {
    const res = await fetch(`/api/workspace/tree?path=${encodeURIComponent(path)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.tree || [];
  } catch {
    return [];
  }
}

export async function ensureWorkspaceApi(path: string): Promise<any> {
  const res = await fetch('/api/workspace/ensure', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path })
  });
  return res.json();
}

export async function fetchSettingsApi(): Promise<{
  groq_configured: boolean;
  groq_key_masked?: string;
  gemini_configured?: boolean;
  gemini_key_masked?: string;
}> {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return { groq_configured: false, gemini_configured: false };
    return res.json();
  } catch {
    return { groq_configured: false, gemini_configured: false };
  }
}

export async function saveGroqKeyApi(apiKey: string): Promise<any> {
  const res = await fetch('/api/settings/groq-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey })
  });
  if (!res.ok) throw new Error('Failed to save Groq API key');
  return res.json();
}

export async function saveGeminiKeyApi(apiKey: string): Promise<any> {
  const res = await fetch('/api/settings/gemini-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey })
  });
  if (!res.ok) throw new Error('Failed to save Gemini API key');
  return res.json();
}
