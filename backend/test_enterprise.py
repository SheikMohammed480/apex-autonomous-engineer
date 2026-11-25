import asyncio
from app.ollama_client import OllamaClient
from app.agent.core import AgentEngine
from app.db import create_session, get_session

async def verify_enterprise():
    client = OllamaClient()
    engine = AgentEngine(ollama_client=client, default_model="qwen2.5-coder:7b")

    # 1. Create a session in SQLite
    session = create_session(
        title="Verification Test",
        workspace_dir="d:/Agentic/workspace",
        model="qwen2.5-coder:7b"
    )
    session_id = session["id"]
    print(f"Created Session ID: {session_id}")

    # 2. Run agent task with session tracking
    prompt = "Create a hello.py file in the workspace that prints 'Hello from Antigravity Local Agent!' and run it."
    print(f"\nRunning Task: {prompt}\n" + "-"*50)

    async for step in engine.run_task(
        prompt=prompt,
        workspace_dir="d:/Agentic/workspace",
        model="qwen2.5-coder:7b",
        session_id=session_id
    ):
        print(f"[{step.step_type.upper()}] {step.title}: {step.content[:100]}...")

    # 3. Verify SQLite recorded the steps
    saved = get_session(session_id)
    print(f"\nPersisted {len(saved['messages'])} steps in SQLite history!")

if __name__ == "__main__":
    asyncio.run(verify_enterprise())
