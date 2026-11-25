import asyncio
import websockets
import json
import httpx

async def make_app():
    async with httpx.AsyncClient() as client:
        res = await client.post("http://127.0.0.1:8000/api/sessions", json={
            "title": "Trading Platform Controller (app.js via gemini-3.5-flash-lite)",
            "workspace_dir": r"d:\Agentic\workspace\trading-platform",
            "model": "gemini-3.5-flash-lite"
        })
        sid = res.json()["id"]

    uri = "ws://127.0.0.1:8000/ws/agent"
    async with websockets.connect(uri) as ws:
        req = {
            "prompt": (
                "Write app.js directly to the workspace using write_file. "
                "Do NOT spend turns reading files. Just write app.js directly: "
                "Initialize document.addEventListener('DOMContentLoaded', () => { ... }): "
                "1. Instantiate market engine, canvas chart, and portfolio. "
                "2. Hook up Buy and Sell buttons, leverage slider, order book rendering, "
                "3. Start a setInterval at 500ms to advance market price, render candles on canvas, update ticker and DOM. "
                "4. Implement the Auto-trading bot start/stop toggle. Write app.js directly."
            ),
            "workspace_dir": r"d:\Agentic\workspace\trading-platform",
            "model": "gemini-3.5-flash-lite",
            "session_id": sid,
            "allow_shell_commands": True
        }
        await ws.send(json.dumps(req))
        print("Started app.js write...")

        while True:
            try:
                msg = await asyncio.wait_for(ws.recv(), timeout=60.0)
                data = json.loads(msg)
                st = data.get("step_type")
                title = data.get("title")
                print(f"[{st}] {title}")
                if st == "tool_call":
                    t_name = data.get("tool_name")
                    t_args = str(data.get("tool_args"))[:80]
                    print(f"   Tool: {t_name} args: {t_args}")
                elif st == "complete":
                    print("app.js completed successfully!")
                    break
                elif st == "error":
                    print("Error:", data.get("content"))
                    break
            except asyncio.TimeoutError:
                print("Timeout.")
                break

if __name__ == "__main__":
    asyncio.run(make_app())
