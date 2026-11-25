import httpx
import json

payload = {
    "model": "qwen2.5-coder:1.5b",
    "messages": [
        {"role": "user", "content": "Write a 3 sentence poem about coding."}
    ],
    "options": {
        "num_gpu": 99,
        "num_ctx": 2048
    },
    "stream": False
}

res = httpx.post("http://localhost:11434/api/chat", json=payload, timeout=60.0)
print("Status:", res.status_code)
print("Response:", res.json().get("message", {}).get("content"))
