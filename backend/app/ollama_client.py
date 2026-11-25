import json
import httpx
from typing import List, Dict, Any, Optional
from app.schemas import ModelInfo


class OllamaClient:
    """Async client interfacing with the local Ollama daemon."""

    def __init__(self, base_url: str = "http://localhost:11434"):
        self.base_url = base_url.rstrip("/")

    async def list_models(self) -> List[ModelInfo]:
        """Fetches the list of locally pulled models from Ollama."""
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    models = []
                    for m in data.get("models", []):
                        models.append(ModelInfo(
                            name=m.get("name", ""),
                            size=m.get("size"),
                            details=m.get("details")
                        ))
                    return models
        except Exception:
            pass
        return []

    async def chat(
        self,
        model: str,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.2
    ) -> Dict[str, Any]:
        """
        Sends a chat completion request to Ollama with hardware-aware settings.

        Model-specific tuning (MX150 2GB VRAM + 32GB RAM):
        - 1.5b / 3b : 28 GPU layers (fits in 2GB VRAM), 2K context
        - 7b        : 10 GPU layers (partial VRAM), 4K context, 10 CPU threads
        - 14b       : 6  GPU layers (partial VRAM), 4K context, 10 CPU threads
        - 32b+      : 0  GPU layers (pure CPU/RAM),  4K context, 10 CPU threads
        """
        m = model.lower()

        if any(x in m for x in ["1.5b", "1b"]):
            gpu_layers, ctx, threads = 99, 2048, 6
            timeout_s = 120.0
        elif "3b" in m:
            gpu_layers, ctx, threads = 28, 2048, 8
            timeout_s = 180.0
        elif "7b" in m:
            # On 2GB MX150, 7B must run pure CPU (num_gpu=0) to avoid 2GB VRAM paging freeze
            gpu_layers, ctx, threads = 0, 2048, 10
            timeout_s = 600.0
        elif "14b" in m:
            gpu_layers, ctx, threads = 0, 2048, 10
            timeout_s = 900.0
        else:
            gpu_layers, ctx, threads = 0, 2048, 10
            timeout_s = 600.0

        payload: Dict[str, Any] = {
            "model": model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_gpu": gpu_layers,
                "num_ctx": ctx,
                "num_thread": threads
            }
        }
        if tools:
            payload["tools"] = tools

        async with httpx.AsyncClient(timeout=timeout_s) as client:
            try:
                res = await client.post(f"{self.base_url}/api/chat", json=payload)
                if res.status_code != 200:
                    raise RuntimeError(f"Ollama HTTP {res.status_code}: {res.text}")
                return res.json()
            except httpx.TimeoutException:
                raise RuntimeError(f"Model inference timed out after {int(timeout_s)}s.")
            except Exception as e:
                raise RuntimeError(f"Ollama connection error: {str(e)}")

    async def pull_model(self, model_name: str) -> bool:
        """Pulls a model asynchronously via Ollama."""
        try:
            async with httpx.AsyncClient(timeout=600.0) as client:
                res = await client.post(f"{self.base_url}/api/pull", json={"name": model_name, "stream": False})
                return res.status_code == 200
        except Exception:
            return False
