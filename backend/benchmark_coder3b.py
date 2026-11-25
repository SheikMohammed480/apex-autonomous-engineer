import asyncio
import time
import shutil
from pathlib import Path
from app.ollama_client import OllamaClient
from app.agent.core import AgentEngine
from app.db import create_session
from app.workspace import ensure_workspace_exists

async def main():
    target_workspace = "d:/Agentic/workspace/taskflow-coder3b"
    # Ensure fresh directory
    p = Path(target_workspace)
    if p.exists():
        shutil.rmtree(p, ignore_errors=True)
    ensure_workspace_exists(target_workspace)

    client = OllamaClient()
    engine = AgentEngine(ollama_client=client, default_model="qwen2.5-coder:3b")

    session = create_session(
        title="Benchmark: TaskFlow with qwen2.5-coder:3b",
        workspace_dir=target_workspace,
        model="qwen2.5-coder:3b"
    )
    session_id = session["id"]

    prompt = (
        "Develop a complete, interactive project management application named 'TaskFlow' in this directory. "
        "Create the following files: "
        "1. index.html - with structured display, top bar (search, priority filters, new task button), stats bar, and a kanban board with columns (Backlog, In Progress, Review, Done). "
        "2. style.css - modern dark-mode stylesheet with clean CSS rules, card styles, priority badges, and responsive layout. "
        "3. app.js - JavaScript logic for managing tasks, adding new tasks, and updating the stats bar. "
        "After creating all files, verify them using read_file or search_files."
    )

    print("=" * 65)
    print("  TASKFLOW BENCHMARK: qwen2.5-coder:3b")
    print("=" * 65)
    print(f"Session ID       : {session_id}")
    print(f"Target Directory : {target_workspace}")
    print(f"Active Model     : qwen2.5-coder:3b")
    print(f"VRAM Headroom    : num_gpu=28 (500MB free buffer)")
    print("=" * 65 + "\n")

    start_time = time.time()
    tool_count = 0
    turn_count = 0

    async for step in engine.run_task(
        prompt=prompt,
        workspace_dir=target_workspace,
        model="qwen2.5-coder:3b",
        session_id=session_id
    ):
        step_type = step.step_type.upper()
        title = step.title or ""
        print(f"\n[{step_type}] {title}")
        if step.tool_name:
            tool_count += 1
            print(f"  Tool Dispatched: {step.tool_name}")
        content = step.content.strip()
        if len(content) > 250:
            content = content[:250] + " ... [truncated]"
        print(f"  Content: {content}")
        print("-" * 65)
        if step.step_type in ("thought", "message"):
            turn_count += 1

    total_time = round(time.time() - start_time, 2)
    print("\n" + "=" * 65)
    print("  BENCHMARK SUMMARY")
    print("=" * 65)
    print(f"Total Elapsed Time : {total_time} seconds")
    print(f"Total Turns        : {turn_count}")
    print(f"Total Tool Calls   : {tool_count}")

    files = list(Path(target_workspace).glob("*"))
    print(f"Files Created ({len(files)}):")
    for f in files:
        print(f"  - {f.name} ({f.stat().st_size} bytes)")
    print("=" * 65)

if __name__ == "__main__":
    asyncio.run(main())
