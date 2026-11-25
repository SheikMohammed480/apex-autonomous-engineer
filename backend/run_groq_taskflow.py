import asyncio
import sys
import time
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(line_buffering=True)

backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from app.ollama_client import OllamaClient
from app.groq_client import GroqClient
from app.agent.core import AgentEngine
from app.db import create_session, init_db

init_db()

workspace = r"d:\Agentic\workspace\taskflow-groq120b"
model_name = "openai/gpt-oss-120b"

prompt = (
    "Develop a complete, production-grade Kanban Board web application called 'TaskFlow' in this workspace.\n\n"
    "Requirements:\n"
    "1. 'index.html': Semantic HTML5 layout with header (app title 'TaskFlow', search input #search-input, priority filter buttons, 'New Task' button #new-task-btn), "
    "real-time stats bar showing counts (Total, Backlog, In Progress, Review, Done), 4 Kanban columns ('Backlog', 'In Progress', 'Review', 'Done') each with a drop-zone card container, "
    "and a modal dialog (#task-modal) with form fields for Title, Description, Priority (High, Medium, Low), Due Date, and Save/Cancel buttons. Link style.css and app.js.\n"
    "2. 'style.css': Modern dark theme styling (dark slate background, surface cards, clean responsive 4-column layout, priority badges with colors High:#ef4444, Med:#f59e0b, Low:#10b981, "
    "drag-over highlight styling, and modal backdrop blur).\n"
    "3. 'app.js': Full JavaScript logic with state management, localStorage persistence ('taskflow_tasks') so tasks survive page refresh, default sample tasks if empty, "
    "dynamic rendering of cards and stats counters, HTML5 Drag-and-Drop API (dragstart, dragend, dragover, dragleave, drop) to smoothly move cards between columns and persist state, "
    "modal open/close and form submit handler, and real-time search filter and priority filter.\n\n"
    "Use write_file to create index.html, style.css, and app.js with full implementation without placeholders."
)

async def main():
    groq = GroqClient()
    ollama = OllamaClient()
    engine = AgentEngine(ollama_client=ollama, default_model=model_name, groq_client=groq)

    session = create_session(
        title="Benchmark: TaskFlow Kanban with Groq 120B Frontier",
        workspace_dir=workspace,
        model=model_name
    )
    session_id = session["id"]
    print(f"Session Created: {session_id}", flush=True)
    print(f"Workspace: {workspace}", flush=True)
    print(f"Model: {model_name} (Groq Cloud 120B Frontier)", flush=True)
    print("=" * 60, flush=True)

    start_time = time.time()
    turn = 0
    async for step in engine.run_task(
        prompt=prompt,
        workspace_dir=workspace,
        model=model_name,
        session_id=session_id,
        max_turns=12
    ):
        turn += 1
        elapsed = time.time() - start_time
        print(f"\n[{elapsed:5.1f}s | Turn {turn}] ({step.step_type}) {step.title}", flush=True)
        if step.tool_name:
            print(f"       Tool: {step.tool_name}", flush=True)
        if step.content:
            preview = step.content[:160].replace("\n", " ")
            print(f"       Content: {preview}...", flush=True)

    total_time = time.time() - start_time
    print("\n" + "=" * 60, flush=True)
    print(f"Task completed in {total_time:.2f} seconds!", flush=True)

if __name__ == "__main__":
    asyncio.run(main())
