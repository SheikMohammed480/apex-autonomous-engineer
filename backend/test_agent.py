import asyncio
from app.ollama_client import OllamaClient
from app.agent.core import AgentEngine

async def run_test():
    client = OllamaClient()
    models = await client.list_models()
    print(f"Available Ollama Models: {[m.name for m in models]}")

    engine = AgentEngine(ollama_client=client, default_model="qwen2.5:3b")
    print("\nRunning Agent ReAct Loop Test:")
    print("-" * 50)

    async for step in engine.run_task(
        prompt="List the files in the workspace using the search_files tool and tell me what you see.",
        workspace_dir="d:/Agentic"
    ):
        step_name = step.step_type.upper()
        print(f"[{step_name}] {step.title or ''}")
        if step.tool_name:
            print(f"  Tool: {step.tool_name}")
        content_preview = step.content.replace('\n', ' ')[:120]
        print(f"  Content: {content_preview}...")
        print("-" * 50)

if __name__ == "__main__":
    asyncio.run(run_test())
