import json
import logging
import asyncio
from typing import List, Dict, Any, Optional
import httpx
from app.config import settings

logger = logging.getLogger("groq.client")

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

# Popular free high-performance Groq models
GROQ_MODELS = [
    {
        "name": "qwen/qwen3.8-27b",
        "display_name": "qwen/qwen3.8-27b (Groq 27B Fast Coder - Free)",
        "description": "27B specialized coding model, instant 134ms token reset"
    },
    {
        "name": "openai/gpt-oss-120b",
        "display_name": "openai/gpt-oss-120b (Groq 120B Frontier - Free)",
        "description": "120B Frontier model, ultra-deep reasoning and code generation"
    },
    {
        "name": "openai/gpt-oss-20b",
        "display_name": "openai/gpt-oss-20b (Groq 20B Fast - Free)",
        "description": "20B lightweight model, 500+ tokens/sec"
    }
]


class GroqClient:
    """
    Async client for Groq Cloud API.
    Provides free LPU-accelerated inference (300+ tokens/sec) for Llama 3.3 70B
    with standard OpenAI-compatible tool calling.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or getattr(settings, "GROQ_API_KEY", None)

    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key.strip())

    async def chat(
        self,
        model: str,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.2
    ) -> Dict[str, Any]:
        if not self.is_configured():
            raise RuntimeError(
                "Groq API Key is not configured. Please add GROQ_API_KEY to your .env file or enter it in Settings."
            )

        headers = {
            "Authorization": f"Bearer {self.api_key.strip()}",
            "Content-Type": "application/json"
        }

        # Normalize model name if prefixed
        clean_model = model.replace("groq/", "").strip()
        if not clean_model:
            clean_model = "qwen/qwen3.8-27b"

        # Prepare payload
        payload: Dict[str, Any] = {
            "model": clean_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": 8192
        }

        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"

        max_retries = 3
        async with httpx.AsyncClient(timeout=120.0) as client:
            for attempt in range(max_retries):
                try:
                    res = await client.post(GROQ_API_URL, headers=headers, json=payload)
                    if res.status_code == 429 and attempt < max_retries - 1:
                        # Auto-wait on rate limit
                        retry_header = res.headers.get("retry-after")
                        wait_time = 5.0
                        if retry_header:
                            try:
                                wait_time = float(retry_header)
                            except Exception:
                                pass
                        else:
                            try:
                                err_msg = res.json().get("error", {}).get("message", "")
                                import re
                                m = re.search(r"try again in ([\d\.]+)s", err_msg)
                                if m:
                                    wait_time = float(m.group(1)) + 1.0
                            except Exception:
                                pass
                        wait_time = max(2.0, min(wait_time, 50.0))
                        logger.info(f"Groq rate limit reached (429). Auto-waiting {wait_time:.1f}s (retry {attempt+1}/{max_retries})...")
                        await asyncio.sleep(wait_time)
                        continue

                    if res.status_code != 200:
                        err_body = res.text
                        try:
                            err_json = res.json()
                            err_body = err_json.get("error", {}).get("message", err_body)
                        except Exception:
                            pass
                        raise RuntimeError(f"Groq API error ({res.status_code}): {err_body}")

                    data = res.json()
                    choices = data.get("choices", [])
                    if not choices:
                        raise RuntimeError("Groq returned empty response choices.")

                    first_msg = choices[0].get("message", {})
                    usage = data.get("usage", {})
                    
                    # Normalize tool_calls arguments if needed (ensure string format conforms)
                    tool_calls = first_msg.get("tool_calls") or []
                    
                    return {
                        "message": {
                            "role": "assistant",
                            "content": first_msg.get("content") or "",
                            "tool_calls": tool_calls
                        },
                        "usage": usage,
                        "model_used": clean_model
                    }
                except httpx.TimeoutException:
                    if attempt < max_retries - 1:
                        await asyncio.sleep(2.0)
                        continue
                    raise RuntimeError("Groq API request timed out after 120s.")
                except Exception as e:
                    if "429" in str(e) and attempt < max_retries - 1:
                        await asyncio.sleep(5.0)
                        continue
                    raise RuntimeError(f"Groq connection error: {str(e)}")
