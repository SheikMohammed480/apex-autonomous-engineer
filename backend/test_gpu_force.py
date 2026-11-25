import httpx

payload = {
    "model": "qwen2.5-coder:1.5b",
    "messages": [{"role": "user", "content": "hi"}],
    "options": {
        "num_gpu": 999,
        "num_ctx": 2048
    },
    "stream": False
}

res = httpx.post("http://localhost:11434/api/chat", json=payload, timeout=60.0)
print("Status:", res.status_code)
print("Response:", res.json().get("message", {}).get("content"))
