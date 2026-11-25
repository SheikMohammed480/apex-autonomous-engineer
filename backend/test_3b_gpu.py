import httpx

payload = {
    "model": "qwen2.5:3b",
    "messages": [
        {"role": "user", "content": "Write one sentence about software testing."}
    ],
    "options": {
        "num_gpu": 28,
        "num_ctx": 2048
    },
    "stream": False
}

res = httpx.post("http://localhost:11434/api/chat", json=payload, timeout=60.0)
print("Status:", res.status_code)
print("Response:", res.json().get("message", {}).get("content"))
