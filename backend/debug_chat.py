import httpx
import json

try:
    payload = {
        "model": "qwen2.5-coder:7b",
        "messages": [{"role": "user", "content": "hello"}],
        "stream": False
    }
    res = httpx.post("http://localhost:11434/api/chat", json=payload, timeout=60.0)
    print("Status:", res.status_code)
    print("Body:", res.text[:300])
except Exception as e:
    print("Exception:", type(e), e)
