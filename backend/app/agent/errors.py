import json
import re
from typing import Dict, Any, List


def humanize_agent_error(error: Exception, active_model: str) -> Dict[str, Any]:
    """
    Translates raw backend exceptions and cloud API rate limit errors (Gemini 429, Groq TPM exceeded,
    missing keys, context overflow) into human-readable, actionable guidance with 1-click model switch options.
    """
    err_str = str(error)
    model_lower = (active_model or "").lower()

    # 1. Missing API Key
    if "is not configured" in err_str or "API Key is not configured" in err_str or ("api_key" in err_str.lower() and "missing" in err_str.lower()):
        is_gem = "gemini" in model_lower
        provider = "Google Gemini" if is_gem else "Groq Cloud"
        return {
            "title": f"🔑 {provider} API Key Required",
            "error_type": "missing_key",
            "friendly_message": (
                f"No API key was detected for **{active_model}**.\n\n"
                f"You can get a free key without a credit card in 10 seconds:\n"
                f"- **Google Gemini**: [Google AI Studio](https://aistudio.google.com/app/apikey) (1,000,000 Free Tokens/Minute)\n"
                f"- **Groq Cloud**: [Groq Console](https://console.groq.com/keys) (500+ tokens/second)\n\n"
                f"Click the key button in the top banner to add your key, or switch to an offline local model below."
            ),
            "current_model": active_model,
            "suggested_models": [
                {"name": "gemini-3.5-flash", "label": "Gemini 3.5 Flash", "badge": "1M TPM Free"},
                {"name": "qwen2.5-coder:7b", "label": "Local Ollama", "badge": "Offline • Unlimited"}
            ],
            "raw_detail": err_str
        }

    # 2. Gemini Daily or Per-Minute Quota Exceeded (429 / RESOURCE_EXHAUSTED)
    if "RESOURCE_EXHAUSTED" in err_str or "limit: 20" in err_str or "requests per day limit exceeded" in err_str or ("429" in err_str and "gemini" in model_lower):
        return {
            "title": "⚠️ Google Gemini Quota Limit Reached",
            "error_type": "quota_exhausted",
            "friendly_message": (
                f"The model **{active_model}** has temporarily reached its free-tier rate limit or daily request quota on Google AI Studio.\n\n"
                f"💡 **Good News**: Google Gemini sibling models have **independent daily quotas**! "
                f"Switching to **Gemini 3.5 Flash** or **Gemini Flash-Lite** below gives you a fresh 1,000,000 TPM quota immediately with zero downtime."
            ),
            "current_model": active_model,
            "suggested_models": [
                {"name": "gemini-3.5-flash", "label": "⚡ Switch to Gemini 3.5 Flash", "badge": "1M TPM • Fresh Quota"},
                {"name": "gemini-3.5-flash-lite", "label": "🚀 Switch to Gemini Flash-Lite", "badge": "1M TPM • Fast"},
                {"name": "qwen/qwen3.8-27b", "label": "⚡ Switch to Groq Cloud", "badge": "500+ tok/s"},
                {"name": "qwen2.5-coder:7b", "label": "💻 Switch to Local Ollama", "badge": "Offline • Unlimited Tokens"}
            ],
            "raw_detail": err_str
        }

    # 3. Groq Rate Limit (TPM / RPM)
    if "429" in err_str and ("groq" in model_lower or "tpm" in err_str.lower() or "tokens per minute" in err_str.lower() or "rate limit" in err_str.lower()):
        return {
            "title": "⚠️ Groq Token Limit Exceeded (TPM Limit)",
            "error_type": "tpm_limit",
            "friendly_message": (
                f"The model **{active_model}** reached Groq's free-tier rate limit (6,000–8,000 Tokens/Minute).\n\n"
                f"Your workspace prompt requires more tokens than Groq allows in one single burst.\n\n"
                f"💡 **Recommended Action**: Switch to **Google Gemini (1,000,000 TPM)** which has **125x larger token capacity** and never chokes on large repositories."
            ),
            "current_model": active_model,
            "suggested_models": [
                {"name": "gemini-3.5-flash", "label": "⚡ Switch to Gemini 3.5 Flash", "badge": "1,000,000 TPM (125x larger)"},
                {"name": "gemini-3.5-flash-lite", "label": "🚀 Switch to Gemini Flash-Lite", "badge": "1,000,000 TPM • Fast"},
                {"name": "qwen2.5-coder:7b", "label": "💻 Switch to Local Ollama", "badge": "Unlimited Tokens"}
            ],
            "raw_detail": err_str
        }

    # 4. Context Length Exceeded (Prompt too large for model)
    if "context_length_exceeded" in err_str or "maximum context length" in err_str.lower():
        return {
            "title": "⚠️ Context Window Limit Exceeded",
            "error_type": "context_exceeded",
            "friendly_message": (
                f"The workspace files or history exceed the maximum context window of **{active_model}**.\n\n"
                f"💡 Switch to **Google Gemini (1,000,000 token context window)** to process massive projects without truncation."
            ),
            "current_model": active_model,
            "suggested_models": [
                {"name": "gemini-3.5-flash", "label": "⚡ Switch to Gemini 3.5 Flash", "badge": "1,000,000 Token Context"}
            ],
            "raw_detail": err_str
        }

    # 5. Service Overloaded / Server 503
    if "503" in err_str or "overloaded" in err_str.lower() or "temporarily unavailable" in err_str.lower():
        return {
            "title": "⚠️ AI Model Server Overloaded",
            "error_type": "server_overload",
            "friendly_message": (
                f"The upstream server for **{active_model}** is temporarily experiencing high traffic.\n\n"
                f"Please retry in a few seconds or switch to an alternate model below."
            ),
            "current_model": active_model,
            "suggested_models": [
                {"name": "gemini-3.5-flash", "label": "⚡ Switch to Gemini 3.5 Flash", "badge": "1M Free TPM"},
                {"name": "gemini-3.5-flash-lite", "label": "🚀 Switch to Gemini Flash-Lite", "badge": "High Availability"},
                {"name": "qwen2.5-coder:7b", "label": "💻 Switch to Local Ollama", "badge": "100% Offline"}
            ],
            "raw_detail": err_str
        }

    # 6. General Error fallback
    return {
        "title": "⚠️ Model Execution Notice",
        "error_type": "general_error",
        "friendly_message": (
            f"The model **{active_model}** encountered an issue during execution.\n\n"
            f"You can retry the request or switch to a different model tier below."
        ),
        "current_model": active_model,
        "suggested_models": [
            {"name": "gemini-3.5-flash", "label": "⚡ Switch to Gemini 3.5 Flash", "badge": "1M Free TPM"},
            {"name": "gemini-3.5-flash-lite", "label": "🚀 Switch to Gemini Flash-Lite", "badge": "1M Free TPM"},
            {"name": "qwen2.5-coder:7b", "label": "💻 Switch to Local Ollama", "badge": "Offline Local"}
        ],
        "raw_detail": err_str
    }
