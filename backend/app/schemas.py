from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str
    content: Optional[str] = ""
    tool_calls: Optional[List[Dict[str, Any]]] = None
    name: Optional[str] = None


class AgentRequest(BaseModel):
    prompt: str
    workspace_dir: Optional[str] = None
    model: Optional[str] = None
    session_id: Optional[str] = None
    allow_shell_commands: bool = True


class ToolExecutionRequest(BaseModel):
    tool_call_id: str
    name: str
    arguments: Dict[str, Any]
    approved: bool = True


class AgentStepUpdate(BaseModel):
    step_type: str  # "user" | "thought" | "tool_call" | "tool_result" | "message" | "error" | "complete"
    title: Optional[str] = None
    content: str
    tool_name: Optional[str] = None
    tool_args: Optional[Dict[str, Any]] = None
    tool_result: Optional[str] = None


class ModelInfo(BaseModel):
    name: str
    size: Optional[int] = None
    details: Optional[Dict[str, Any]] = None


class SessionCreateRequest(BaseModel):
    title: str
    workspace_dir: str
    model: Optional[str] = "qwen2.5-coder:7b"


class WorkspaceEnsureRequest(BaseModel):
    path: str


class GroqKeyRequest(BaseModel):
    api_key: str


class GeminiKeyRequest(BaseModel):
    api_key: str

