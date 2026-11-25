import httpx
import asyncio
import websockets
import json
import os
import time

async def run_stress_test():
    target_dir = r"d:\Agentic\workspace\trading-platform"
    os.makedirs(target_dir, exist_ok=True)

    # 1. Register session in database
    async with httpx.AsyncClient() as client:
        res = await client.post("http://127.0.0.1:8000/api/sessions", json={
            "title": "Heavy Stress Test: Live Trading & Market Simulator",
            "workspace_dir": target_dir,
            "model": "gemini-2.5-flash"
        })
        session = res.json()
        session_id = session["id"]
        print(f"Stress Test Session Created: {session_id}")

    # 2. Heavy multi-file prompt that tests continuous token generation
    prompt = (
        "BUILD A COMPLETE, HEAVY, MULTI-FILE CYBERPUNK CRYPTO & STOCK TRADING SIMULATOR PLATFORM.\n"
        "You must generate all of the following separate, production-ready files in the workspace:\n"
        "1. index.html - Multi-panel layout: live price ticker banner, interactive chart viewport, order book (bids & asks), order execution panel (Market/Limit orders with leverage slider), open positions & portfolio table, and automated trading bot control panel.\n"
        "2. styles.css - Comprehensive cyberpunk dark-mode theme: neon accents, order book depth bars with green/red gradients, glassmorphism panels, responsive layout, and glowing indicators.\n"
        "3. market_engine.js - Real-time market price generator simulating realistic price action (Geometric Brownian Motion), depth of market order book generator with dynamic bid/ask spreads, and order matching engine.\n"
        "4. indicators.js - Real mathematical calculation algorithms for: SMA (Simple Moving Average), EMA, RSI (Relative Strength Index), MACD, and Bollinger Bands with full historical array processing.\n"
        "5. chart.js - High-performance HTML5 Canvas chart renderer that draws realistic candlestick charts, volume bars, moving average overlays, and mouse crosshair with price/time labels.\n"
        "6. portfolio.js - Portfolio state manager: tracks balance ($100,000 demo), margin, unrealized/realized P&L, position liquidation checks, trade history log, and localStorage persistence.\n"
        "7. app.js - Main dashboard controller: coordinates the ticker interval, connects market_engine ticks to chart.js and portfolio.js, handles user buy/sell clicks, and includes an auto-trading algorithmic bot mode that places trades on RSI signals.\n"
        "Write out each file completely with full logic and no placeholders."
    )

    start_time = time.time()
    uri = "ws://127.0.0.1:8000/ws/agent"
    async with websockets.connect(uri) as ws:
        req = {
            "prompt": prompt,
            "workspace_dir": target_dir,
            "model": "gemini-2.5-flash",
            "session_id": session_id,
            "allow_shell_commands": True
        }
        await ws.send(json.dumps(req))
        print("Heavy stress-test agent run initiated on Gemini 2.5 Flash...")

        step_idx = 0
        total_bytes_written = 0
        while True:
            try:
                msg = await asyncio.wait_for(ws.recv(), timeout=180.0)
                data = json.loads(msg)
                st = data.get("step_type")
                title = data.get("title")
                step_idx += 1
                elapsed = round(time.time() - start_time, 1)

                if st == "tool_call":
                    t_name = data.get("tool_name")
                    t_args = data.get("tool_args") or {}
                    p = t_args.get("path", "file")
                    c_len = len(str(t_args.get("content", "")))
                    total_bytes_written += c_len
                    print(f"[{elapsed}s][TOOL #{step_idx}] {t_name} -> {p} ({c_len} bytes) | Cumulative: {total_bytes_written} bytes")
                elif st == "tool_result":
                    print(f"[{elapsed}s][RESULT] Tool call completed")
                elif st == "thought":
                    print(f"[{elapsed}s][THOUGHT] {title}")
                elif st == "message":
                    c = (data.get("content") or "")[:120].replace("\n", " ")
                    print(f"[{elapsed}s][MESSAGE] {c}...")
                elif st == "error":
                    print(f"[{elapsed}s][ERROR] {data.get('content')}")
                    break
                elif st == "complete":
                    print(f"[{elapsed}s][SUCCESS] Stress test completed successfully! Total code generated: {total_bytes_written} bytes.")
                    break
            except asyncio.TimeoutError:
                print("Timeout waiting for message.")
                break

if __name__ == "__main__":
    asyncio.run(run_stress_test())
