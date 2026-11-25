import asyncio
import time
import shutil
from pathlib import Path
from app.ollama_client import OllamaClient
from app.agent.core import AgentEngine
from app.db import create_session
from app.workspace import ensure_workspace_exists

async def main():
    target_workspace = "d:/Agentic/workspace/taskflow-3b"
    # Ensure a fresh, clean benchmark directory
    p = Path(target_workspace)
    if p.exists():
        shutil.rmtree(p, ignore_errors=True)
    ensure_workspace_exists(target_workspace)

    client = OllamaClient()
    # 100% GPU accelerated 3B model
    engine = AgentEngine(ollama_client=client, default_model="qwen2.5:3b")

    session = create_session(
        title="Benchmark: TaskFlow Suite with qwen2.5:3b (100% GPU)",
        workspace_dir=target_workspace,
        model="qwen2.5:3b"
    )
    session_id = session["id"]

    prompt = (
        "Develop a comprehensive, full-featured project management application named 'TaskFlow' in this directory. "
        "Create the following modular files: "
        "1. index.html: A modern dashboard layout featuring a top navigation bar with search bar, priority filters (All, High, Medium, Low), "
        "a 'New Task' button, stats bar (total tasks, in-progress, completed), and a 4-column Kanban board (Backlog, In Progress, Review, Done). "
        "Include a task modal with inputs for title, description, priority, and subtask checklist. "
        "2. style.css: Sleek dark-mode interface using CSS variables, custom scrollbars, card hover animations, priority badges (red/yellow/blue/green), "
        "drag ghost styling, and responsive layout. "
        "3. app.js: Complete JavaScript application containing state management, localStorage auto-save, task creation/editing/deletion, "
        "column movement, filter search by title/tag, and preloaded sample project tasks so the board looks active immediately. "
        "Verify your files after writing them."
    )

    print("=" * 65)
    print("  TASKFLOW BENCHMARK: qwen2.5:3b (100% GPU MX150)")
    print("=" * 65)
    print(f"Session ID        : {session_id}")
    print(f"Target Directory  : {target_workspace}")
    print(f"Active Model      : qwen2.5:3b")
    print(f"Context / Layers  : 1536 ctx / 100% GPU offload")
    print("=" * 65 + "\n")

    start_time = time.time()
    turn_count = 0
    tool_calls_count = 0

    async for step in engine.run_task(
        prompt=prompt,
        workspace_dir=target_workspace,
        model="qwen2.5:3b",
        session_id=session_id
    ):
        step_type = step.step_type.upper()
        title = step.title or ""
        print(f"\n[{step_type}] {title}")
        
        if step.tool_name:
            tool_calls_count += 1
            print(f"  Tool Dispatched: {step.tool_name}")
            
        content_preview = step.content.strip()
        if len(content_preview) > 250:
            content_preview = content_preview[:250] + " ... [truncated]"
        print(f"  Details: {content_preview}")
        print("-" * 65)
        
        if step.step_type in ("thought", "message"):
            turn_count += 1

    total_time = round(time.time() - start_time, 2)
    print("\n" + "=" * 65)
    print("  BENCHMARK SUMMARY")
    print("=" * 65)
    print(f"Total Elapsed Time : {total_time} seconds")
    print(f"Total Turns        : {turn_count}")
    print(f"Tool Calls Count   : {tool_calls_count}")

    # Inspect generated files
    files = list(Path(target_workspace).glob("*"))
    print(f"Files Created ({len(files)}):")
    for f in files:
        print(f"  - {f.name} ({f.stat().st_size} bytes)")
    print("=" * 65)

if __name__ == "__main__":
    asyncio.run(main())
