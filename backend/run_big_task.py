import asyncio
from app.ollama_client import OllamaClient
from app.agent.core import AgentEngine
from app.db import create_session
from app.workspace import ensure_workspace_exists

async def main():
    target_workspace = "d:/Agentic/workspace/taskflow"
    ensure_workspace_exists(target_workspace)

    client = OllamaClient()
    engine = AgentEngine(ollama_client=client, default_model="qwen2.5-coder:1.5b")

    session = create_session(
        title="Develop TaskFlow Kanban Suite",
        workspace_dir=target_workspace,
        model="qwen2.5-coder:1.5b"
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
