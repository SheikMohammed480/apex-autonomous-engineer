import json
import base64
import mimetypes
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.responses import FileResponse, Response
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.hardware import get_hardware_profile, HardwareProfile
from app.ollama_client import OllamaClient
from app.groq_client import GroqClient
from app.gemini_client import GeminiClient
from app.agent.core import AgentEngine
from app.schemas import AgentRequest, SessionCreateRequest, WorkspaceEnsureRequest, GroqKeyRequest, GeminiKeyRequest
from app.db import (
    create_session,
    list_sessions,
    get_session,
    delete_session
)
from app.workspace import get_directory_tree, ensure_workspace_exists

app = FastAPI(title="Apex Agent API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Hybrid engine: Local Ollama + Groq Cloud + Google Gemini (1M Free TPM)
ollama = OllamaClient(base_url=settings.OLLAMA_HOST)
groq = GroqClient()
gemini = GeminiClient()

def get_default_model() -> str:
    if settings.GEMINI_API_KEY:
        return "gemini-3.5-flash"
    if settings.GROQ_API_KEY:
        return "qwen/qwen3.8-27b"
    return "qwen2.5-coder:3b"

agent_engine = AgentEngine(
    ollama_client=ollama,
    default_model=get_default_model(),
    groq_client=groq,
    gemini_client=gemini
)


@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "ollama_host": settings.OLLAMA_HOST,
        "groq_configured": groq.is_configured(),
        "gemini_configured": gemini.is_configured()
    }


@app.get("/api/settings")
async def get_settings_info():
    """Returns cloud API integration status."""
    gkey = settings.GROQ_API_KEY
    g_masked = f"{gkey[:4]}...{gkey[-4:]}" if (gkey and len(gkey) > 8) else None

    gemkey = settings.GEMINI_API_KEY
    gem_masked = f"{gemkey[:4]}...{gemkey[-4:]}" if (gemkey and len(gemkey) > 8) else None

    return {
        "groq_configured": bool(gkey and gkey.strip()),
        "groq_key_masked": g_masked,
        "gemini_configured": bool(gemkey and gemkey.strip()),
        "gemini_key_masked": gem_masked
    }


@app.post("/api/settings/groq-key")
async def save_groq_key(req: GroqKeyRequest):
    """Saves the user's free Groq Cloud API key and activates 70B models."""
    key = req.api_key.strip()
    if not key:
        raise HTTPException(status_code=400, detail="API Key cannot be empty")

    settings.GROQ_API_KEY = key
    groq.api_key = key

    # Persist to .env in backend directory
    env_path = Path(__file__).resolve().parent.parent / ".env"
    lines = []
    if env_path.exists():
        lines = [line for line in env_path.read_text(encoding="utf-8").splitlines() if not line.startswith("GROQ_API_KEY=")]
    lines.append(f"GROQ_API_KEY={key}")
    env_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    return {"status": "success", "groq_configured": True}


@app.post("/api/settings/gemini-key")
async def save_gemini_key(req: GeminiKeyRequest):
    """Saves the user's Google Gemini API key and activates Gemini 2.5 Flash."""
    key = req.api_key.strip()
    if not key:
        raise HTTPException(status_code=400, detail="API Key cannot be empty")

    settings.GEMINI_API_KEY = key
    gemini.api_key = key
    agent_engine.default_model = "gemini-2.5-flash"

    # Persist to .env in backend directory
    env_path = Path(__file__).resolve().parent.parent / ".env"
    lines = []
    if env_path.exists():
        lines = [line for line in env_path.read_text(encoding="utf-8").splitlines() if not line.startswith("GEMINI_API_KEY=")]
    lines.append(f"GEMINI_API_KEY={key}")
    env_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    return {"status": "success", "gemini_configured": True}


@app.get("/api/hardware", response_model=HardwareProfile)
async def get_hardware_info():
    """Returns detected system specs, VRAM, and the auto-recommended model tier."""
    models = await ollama.list_models()
    model_names = [m.name for m in models]
    profile = get_hardware_profile(
        available_models=model_names,
        override_model=settings.AGENT_MODEL
    )
    return profile


@app.get("/api/models")
async def list_available_models():
    """Lists all models installed locally in Ollama."""
    return await ollama.list_models()


# ==================== Workspace APIs ====================

@app.post("/api/workspace/ensure")
async def ensure_workspace(req: WorkspaceEnsureRequest):
    """Creates a new workspace folder if it doesn't exist or verifies it."""
    return ensure_workspace_exists(req.path)


@app.get("/api/workspace/tree")
async def get_workspace_tree(path: str = Query(..., description="Target project directory")):
    """Returns the file tree for the requested workspace path."""
    tree = get_directory_tree(path)
    return {"workspace": path, "tree": tree}


@app.get("/api/workspace/file")
async def get_workspace_file(
    path: str = Query(..., description="Absolute or relative path to file"),
    workspace_dir: Optional[str] = Query(None, description="Active workspace directory")
):
    """Reads and returns the code and metadata of a specific file."""
    candidate = Path(path)
    p = None

    if candidate.is_file():
        p = candidate.resolve()
    elif workspace_dir and (Path(workspace_dir) / path).is_file():
        p = (Path(workspace_dir) / path).resolve()
    else:
        # Try resolving relative to default workspace root
        default_ws = Path(settings.WORKSPACE_DIR) / "workspace"
        if (default_ws / path).is_file():
            p = (default_ws / path).resolve()
        elif (Path(settings.WORKSPACE_DIR) / path).is_file():
            p = (Path(settings.WORKSPACE_DIR) / path).resolve()

    if not p or not p.is_file():
        raise HTTPException(status_code=404, detail=f"File not found: {path}")

    try:
        content = p.read_text(encoding="utf-8", errors="replace")
        return {
            "path": str(p),
            "name": p.name,
            "content": content,
            "size": p.stat().st_size,
            "lines": len(content.splitlines()),
            "extension": p.suffix.lstrip(".").lower()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/preview/{ws_token}")
@app.get("/api/preview/{ws_token}/{subpath:path}")
async def serve_live_preview(ws_token: str, subpath: str = "index.html"):
    """
    Serves files from any workspace directory with proper MIME types,
    enabling full in-app live execution of HTML/CSS/JS applications in an iframe.
    """
    try:
        # Decode base64 workspace path
        # Pad base64 if needed
        padded = ws_token + "=" * (-len(ws_token) % 4)
        workspace_dir = Path(base64.urlsafe_b64decode(padded.encode()).decode("utf-8")).resolve()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid workspace token")

    if not workspace_dir.exists():
        raise HTTPException(status_code=404, detail="Workspace directory does not exist")

    clean_subpath = subpath.strip("/") if subpath else "index.html"
    if not clean_subpath:
        clean_subpath = "index.html"

    target_file = (workspace_dir / clean_subpath).resolve()

    # Prevent directory traversal outside the workspace
    if not str(target_file).startswith(str(workspace_dir)):
        raise HTTPException(status_code=403, detail="Access denied")

    if not target_file.is_file():
        # Fallback to index.html if file not found
        fallback = (workspace_dir / "index.html").resolve()
        if fallback.is_file():
            target_file = fallback
        else:
            raise HTTPException(status_code=404, detail=f"File not found: {clean_subpath}")

    mime_type, _ = mimetypes.guess_type(str(target_file))
    if not mime_type:
        if target_file.suffix == ".js":
            mime_type = "application/javascript"
        elif target_file.suffix == ".css":
            mime_type = "text/css"
        elif target_file.suffix == ".html":
            mime_type = "text/html"
        else:
            mime_type = "application/octet-stream"

    return FileResponse(path=str(target_file), media_type=mime_type)


# ==================== Session & History APIs ====================

@app.get("/api/sessions")
async def get_all_sessions():
    """Returns all past chat/task sessions."""
    return list_sessions()


@app.post("/api/sessions")
async def create_new_session(req: SessionCreateRequest):
    """Creates a new task/chat session tied to a specific project directory."""
    ensure_workspace_exists(req.workspace_dir)
    return create_session(
        title=req.title,
        workspace_dir=req.workspace_dir,
        model=req.model or "qwen2.5-coder:1.5b"
    )


@app.get("/api/sessions/{session_id}")
async def get_single_session(session_id: str):
    """Retrieves full conversation and tool step history for a session."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@app.delete("/api/sessions/{session_id}")
async def remove_session(session_id: str):
    """Deletes a session and its message history."""
    delete_session(session_id)
    return {"status": "deleted", "id": session_id}


# ==================== Agent Execution APIs ====================

@app.post("/api/agent/run")
async def run_agent_task(req: AgentRequest):
    """Executes a task and returns the complete list of step updates."""
    workspace = req.workspace_dir or str(Path(settings.WORKSPACE_DIR) / "workspace")
    ensure_workspace_exists(workspace)

    steps = []
    async for step in agent_engine.run_task(
        prompt=req.prompt,
        workspace_dir=workspace,
        model=req.model or "qwen2.5-coder:1.5b",
        session_id=req.session_id
    ):
        steps.append(step.dict())
    return {"steps": steps}


@app.websocket("/ws/agent")
async def websocket_agent_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time streaming of agent reasoning,
    tool calls, terminal command outputs, and task completion.
    """
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)

            prompt = payload.get("prompt")
            workspace = payload.get("workspace_dir") or str(Path(settings.WORKSPACE_DIR) / "workspace")
            model = payload.get("model") or "qwen2.5-coder:1.5b"
            session_id = payload.get("session_id")

            if not prompt:
                await websocket.send_json({"error": "Prompt cannot be empty"})
                continue

            ensure_workspace_exists(workspace)

            async for step in agent_engine.run_task(
                prompt=prompt,
                workspace_dir=workspace,
                model=model,
                session_id=session_id
            ):
                await websocket.send_json(step.dict())

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"error": str(e)})
        except Exception:
            pass


# ==================== Unified Static Frontend Serving ====================
from fastapi.staticfiles import StaticFiles

frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists() and (frontend_dist / "index.html").exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend_static")
