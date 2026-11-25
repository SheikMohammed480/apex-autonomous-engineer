import asyncio
import time
from pathlib import Path
from app.ollama_client import OllamaClient
from app.agent.core import AgentEngine
from app.db import create_session

async def main():
    target_workspace = "d:/Agentic/workspace/taskflow-3b"
    client = OllamaClient()
    engine = AgentEngine(ollama_client=client, default_model="qwen2.5:3b")

    session = create_session(
        title="Complete TaskFlow: style.css & app.js (qwen2.5:3b)",
        workspace_dir=target_workspace,
        model="qwen2.5:3b"
    )
    session_id = session["id"]

    prompt = (
        "In this directory, index.html is already created. "
        "Inspect index.html using read_file, and then create the remaining two files: "
        "1. style.css - a modern dark theme with clean styles for the header, search bar, stats bar, and kanban board. "
        "2. app.js - JavaScript logic for managing tasks, adding new tasks, and updating the stats bar. "
        "Use write_file to save style.css and app.js."
    )

    print("=" * 65)
    print("  TASKFLOW COMPLETION RUN: qwen2.5:3b")
    print("=" * 65)
    print(f"Session ID : {session_id}")
    print(f"Workspace  : {target_workspace}")
    print("=" * 65 + "\n")

    start_time = time.time()
    tool_count = 0

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
            tool_count += 1
            print(f"  Tool Dispatched: {step.tool_name}")
        content = step.content.strip()
        if len(content) > 300:
            content = content[:300] + " ... [truncated]"
        print(f"  Content: {content}")
        print("-" * 65)

    print(f"\nCompleted in {round(time.time() - start_time, 2)} seconds. Total tool calls: {tool_count}")
    files = list(Path(target_workspace).glob("*"))
    print(f"Current Workspace Files ({len(files)}):")
    for f in files:
        print(f"  - {f.name} ({f.stat().st_size} bytes)")

if __name__ == "__main__":
    asyncio.run(main())
