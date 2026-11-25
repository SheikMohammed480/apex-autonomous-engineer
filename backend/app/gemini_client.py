import json
import logging
import asyncio
from typing import List, Dict, Any, Optional
import httpx
from app.config import settings

logger = logging.getLogger("gemini.client")

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"

GEMINI_MODELS = [
    {
        "name": "gemini-3.5-flash",
        "display_name": "gemini-3.5-flash (Google Cloud - Active)",
        "description": "Google Gemini 3.5 Flash with full daily quota and high performance"
    },
    {
        "name": "gemini-3.5-flash-lite",
        "display_name": "gemini-3.5-flash-lite (Google Cloud - Fast)",
        "description": "Lightweight Google Gemini 3.5 Flash model with high throughput"
    },
    {
        "name": "gemini-2.5-flash",
        "display_name": "gemini-2.5-flash (Google Cloud)",
        "description": "Google Gemini 2.5 Flash model"
    }
]

FALLBACK_CHAIN = {
    "gemini-2.5-flash": "gemini-3.5-flash",
    "gemini-3.5-flash": "gemini-3.5-flash-lite",
}


class GeminiClient:
    """
    Async client for Google Gemini API via the official OpenAI-compatible endpoint.
    Provides free frontier-class coding performance with a massive 1,000,000 TPM limit,
    completely eliminating the 8,000 TPM rate limit bottlenecks of Groq.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or getattr(settings, "GEMINI_API_KEY", None)

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
                "Gemini API Key is not configured. Please add GEMINI_API_KEY to your .env file or enter it in Settings."
            )

        headers = {
            "Authorization": f"Bearer {self.api_key.strip()}",
            "Content-Type": "application/json"
        }

        # Normalize model name
        clean_model = model.replace("gemini/", "").replace("google/", "").strip()
        if not clean_model:
            clean_model = "gemini-2.5-flash"

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
                    res = await client.post(GEMINI_API_URL, headers=headers, json=payload)
                    if res.status_code in (429, 503):
                        err_text = res.text
                        # Check if daily request quota for this specific model was exceeded
                        if "Generate content requests per day limit exceeded" in err_text or "limit: 20" in err_text:
                            fallback = FALLBACK_CHAIN.get(clean_model)
                            if fallback and fallback != clean_model:
                                logger.warning(f"Daily quota hit for {clean_model}, auto-failing over to {fallback}")
                                clean_model = fallback
                                payload["model"] = fallback
                                continue
                        if attempt < max_retries - 1:
                            wait_sec = 6.0 if res.status_code == 503 else 4.0
                            await asyncio.sleep(wait_sec)
                            continue

                    if res.status_code != 200:
                        err_text = res.text
                        logger.error(f"Gemini API Error {res.status_code}: {err_text}")
                        raise RuntimeError(f"Gemini API error ({res.status_code}): {err_text}")

                    data = res.json()
                    choices = data.get("choices", [])
                    if not choices:
                        raise RuntimeError(f"Gemini returned no choices: {data}")

                    msg = choices[0].get("message", {})
                    # Ensure format matches standard agent schema
                    return {
                        "message": {
                            "role": msg.get("role", "assistant"),
                            "content": msg.get("content") or "",
                            "tool_calls": msg.get("tool_calls", [])
                        }
                    }
                except httpx.RequestError as exc:
                    if attempt < max_retries - 1:
                        await asyncio.sleep(2.0)
                        continue
                    raise RuntimeError(f"Gemini connection error: {exc}")
