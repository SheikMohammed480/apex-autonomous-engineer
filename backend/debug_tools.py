import httpx
from app.tools.registry import TOOL_DEFINITIONS

payload = {
    "model": "qwen2.5-coder:7b",
    "messages": [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Create a file named index.html"}
    ],
    "tools": TOOL_DEFINITIONS,
    "stream": False
}

try:
    res = httpx.post("http://localhost:11434/api/chat", json=payload, timeout=60.0)
    print("Status:", res.status_code)
    print("Body:", res.text[:500])
except Exception as e:
    print("Exception:", type(e), e)
