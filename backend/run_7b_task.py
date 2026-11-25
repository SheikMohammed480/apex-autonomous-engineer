import asyncio
import sys
from pathlib import Path

# Unbuffered output
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(line_buffering=True)

backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from app.ollama_client import OllamaClient
from app.agent.core import AgentEngine
from app.db import create_session, init_db

init_db()

workspace = r"d:\Agentic\workspace\taskflow-7b"
model_name = "qwen2.5-coder:7b"

prompt = (
    "Develop a complete, production-grade Kanban Board web application called 'TaskFlow' in this workspace.\n\n"
    "Execute this project sequentially in 3 distinct steps using write_file:\n\n"
    "Step 1: Write 'index.html'\n"
    "- Complete semantic HTML5 layout.\n"
    "- Header: App title 'TaskFlow', a search input (#search-input), priority filter buttons (All, High, Medium, Low), and a 'New Task' button (#new-task-btn).\n"
    "- Stats bar displaying real-time counters: Total Tasks, In Progress, Review, and Done.\n"
    "- Kanban board container with 4 drop-zone columns: 'Backlog', 'In Progress', 'Review', and 'Done'. Each column with a header and card container.\n"
    "- A modal dialog (#task-modal) with a form to create tasks: Title, Description, Priority (High, Medium, Low), Due Date, and Save/Cancel buttons.\n"
    "- Link style.css in head and script app.js at bottom.\n\n"
    "Step 2: Write 'style.css'\n"
    "- Modern dark theme (background #121417, surface #1a1d23, card #222730, text #e2e8f0).\n"
    "- Clean grid layout for the 4 columns with subtle borders and shadows.\n"
    "- Card styling: priority badges (High: #ef4444, Medium: #f59e0b, Low: #10b981), title, due date tag, and cursor: grab.\n"
    "- Drag-over feedback: highlight drop-zone (.drag-over class) when dragging.\n"
    "- Modal backdrop blur and centered dialog styling.\n\n"
    "Step 3: Write 'app.js'\n"
    "- State management: Array of task objects with id, title, description, priority, dueDate, column ('backlog', 'in-progress', 'review', 'done').\n"
    "- LocalStorage persistence: Save tasks to localStorage ('taskflow_tasks') on every change, load on startup with sample tasks if empty.\n"
    "- Dynamic rendering: Render cards into their respective columns and update all stats counters.\n"
    "- HTML5 Drag and Drop API: Implement dragstart, dragend on cards, and dragover, dragleave, drop on columns to move cards between columns.\n"
    "- Modal handling: Open/close modal, form submit handler to add new task.\n"
    "- Search & filter: Real-time search by title and filter by priority buttons.\n\n"
    "Write complete, production-ready code for each file using the write_file tool."
)

async def main():
    session = create_session(
        title="TaskFlow 7B: Step-by-Step Kanban (CPU Mode)",
        workspace_dir=workspace,
        model=model_name
    )
    session_id = session["id"]
    print(f"Session Created: {session_id}", flush=True)
    print(f"Workspace: {workspace}", flush=True)
    print(f"Model: {model_name} (CPU Mode, num_gpu=0, 10 threads)", flush=True)
    print("=" * 60, flush=True)

    client = OllamaClient(base_url="http://localhost:11434")
    engine = AgentEngine(ollama_client=client, default_model=model_name)

    turn = 0
    async for step in engine.run_task(
        prompt=prompt,
        workspace_dir=workspace,
        model=model_name,
        session_id=session_id,
        max_turns=10
    ):
        turn += 1
        print(f"\n[{turn}] Step Type: {step.step_type} | Title: {step.title}", flush=True)
        if step.tool_name:
            print(f"    Tool Name: {step.tool_name}", flush=True)
        preview = step.content[:200].replace("\n", " ") if step.content else ""
        print(f"    Content: {preview}...", flush=True)

    print("\n" + "=" * 60, flush=True)
    print("Agent Execution Finished.", flush=True)

if __name__ == "__main__":
    asyncio.run(main())
