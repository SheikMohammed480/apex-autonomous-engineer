import asyncio
from app.ollama_client import OllamaClient
from app.agent.core import AgentEngine
from app.db import create_session
from app.workspace import ensure_workspace_exists

async def main():
    target_workspace = "d:/Agentic/workspace/calculator"
    ensure_workspace_exists(target_workspace)

    client = OllamaClient()
    # 100% Dedicated GPU Mode on MX150
    engine = AgentEngine(ollama_client=client, default_model="qwen2.5-coder:1.5b")

    session = create_session(
        title="Develop Calculator App with UI",
        workspace_dir=target_workspace,
        model="qwen2.5-coder:1.5b"
    )
    session_id = session["id"]

    prompt = (
        "Develop a complete, interactive web calculator application in this directory with a clean modern UI. "
        "Create the following files: "
        "1. index.html - with structured display and buttons for digits (0-9), operators (+, -, *, /), decimal, clear (C), and equals (=). "
        "2. style.css - modern dark-mode layout with responsive button grid, hover states, and smooth shadows. "
        "3. app.js - complete JavaScript calculator logic handling operations, decimals, and display updates. "
        "After creating all files, verify them using search_files or read_file."
    )

    print(f"Task Session ID: {session_id}")
    print(f"Target Project Folder: {target_workspace}")
    print(f"Model: qwen2.5-coder:1.5b (100% GPU VRAM)\n" + "="*60)

    async for step in engine.run_task(
        prompt=prompt,
        workspace_dir=target_workspace,
        model="qwen2.5-coder:1.5b",
        session_id=session_id
    ):
        step_type = step.step_type.upper()
        title = step.title or ""
        print(f"\n[{step_type}] {title}")
        if step.tool_name:
            print(f"  Tool: {step.tool_name}")
        content_preview = step.content.strip()
        if len(content_preview) > 300:
            content_preview = content_preview[:300] + " ... [truncated]"
        print(f"  Content:\n{content_preview}")
        print("-" * 60)

if __name__ == "__main__":
    asyncio.run(main())
