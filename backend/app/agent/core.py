import json
import logging
import re
from typing import AsyncGenerator, Dict, Any, List, Optional
from app.ollama_client import OllamaClient
from app.groq_client import GroqClient
from app.gemini_client import GeminiClient
from app.agent.prompts import SYSTEM_PROMPT
from app.agent.context import generate_repo_map, compact_messages
from app.tools.registry import TOOL_DEFINITIONS, dispatch_tool_call
from app.schemas import AgentStepUpdate
from app.db import save_step
from app.agent.errors import humanize_agent_error

logger = logging.getLogger("agent.core")


def is_gemini_model(model_name: Optional[str]) -> bool:
    if not model_name:
        return False
    return "gemini" in model_name.lower()


def is_groq_model(model_name: Optional[str]) -> bool:
    if not model_name:
        return False
    m = model_name.lower()
    return (
        "groq" in m
        or "gpt-oss" in m
        or "qwen3.8" in m
        or "llama-3" in m
        or "deepseek-r1" in m
        or "120b" in m
        or "27b" in m
        or "20b" in m
    )


def parse_fallback_tool_calls(text: str) -> List[Dict[str, Any]]:
    """
    Robust fallback parser for local models. Decodes single or multiple
    concatenated / line-delimited JSON tool calls from markdown blocks or raw text.
    Handles unescaped newlines (strict=False) and regex fallback for write_file.
    """
    extracted = []
    decoder = json.JSONDecoder(strict=False)
    
    cleaned = text.strip()
    code_block_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned, re.IGNORECASE)
    search_text = code_block_match.group(1).strip() if code_block_match else cleaned

    idx = 0
    while idx < len(search_text):
        next_brace = search_text.find('{', idx)
        if next_brace == -1:
            break
        try:
            obj, end_idx = decoder.raw_decode(search_text, next_brace)
            if isinstance(obj, dict) and "name" in obj and "arguments" in obj:
                extracted.append({
                    "function": {
                        "name": obj["name"],
                        "arguments": obj["arguments"]
                    }
                })
            idx = end_idx
        except json.JSONDecodeError:
            idx = next_brace + 1

    # Resilient fallback if JSON decoding failed (e.g. malformed quotes or markdown inside content)
    if not extracted:
        wf_match = re.search(
            r'["\']name["\']\s*:\s*["\']write_file["\'][\s\S]*?["\']path["\']\s*:\s*["\']([^"\']+)["\'][\s\S]*?["\']content["\']\s*:\s*["\']([\s\S]*?)["\']\s*\}',
            search_text
        )
        if wf_match:
            try:
                content_val = wf_match.group(2).encode().decode('unicode_escape', errors='ignore')
            except Exception:
                content_val = wf_match.group(2)
            extracted.append({
                "function": {
                    "name": "write_file",
                    "arguments": {
                        "path": wf_match.group(1),
                        "content": content_val
                    }
                }
            })

    return extracted


class AgentEngine:
    """
    Autonomous ReAct execution loop supporting local Ollama models
    and ultra-fast Groq Cloud frontier models (Llama 3.3 70B).
    Includes loop detection / circuit breaker to prevent repeated tool calls.
    """

    def __init__(
        self,
        ollama_client: OllamaClient,
        default_model: str,
        groq_client: Optional[GroqClient] = None,
        gemini_client: Optional[GeminiClient] = None
    ):
        self.client = ollama_client
        self.groq_client = groq_client or GroqClient()
        self.gemini_client = gemini_client or GeminiClient()
        self.default_model = default_model

    async def run_task(
        self,
        prompt: str,
        workspace_dir: str,
        model: Optional[str] = None,
        session_id: Optional[str] = None,
        max_turns: int = 25
    ) -> AsyncGenerator[AgentStepUpdate, None]:
        active_model = model or self.default_model
        repo_map = generate_repo_map(workspace_dir)

        full_system_prompt = (
            f"{SYSTEM_PROMPT.format(workspace_dir=workspace_dir)}\n\n"
            f"{repo_map}\n"
        )

        messages: List[Dict[str, Any]] = [
            {"role": "system", "content": full_system_prompt},
            {"role": "user", "content": prompt}
        ]

        if session_id:
            save_step(
                session_id=session_id,
                step_type="user",
                title="User Request",
                content=prompt
            )
            save_step(
                session_id=session_id,
                step_type="thought",
                title="Task Initialized",
                content=f"Starting task using model **{active_model}** in workspace `{workspace_dir}`."
            )

        yield AgentStepUpdate(
            step_type="user",
            title="User Request",
            content=prompt
        )

        yield AgentStepUpdate(
            step_type="thought",
            title="Task Initialized",
            content=f"Starting task using model **{active_model}** in workspace `{workspace_dir}`."
        )

        turn = 0
        last_tool_signature = None
        consecutive_repeats = 0
        total_tokens_used = 0

        while turn < max_turns:
            turn += 1
            if is_gemini_model(active_model):
                compacted = messages  # Gemini 2.5 has 1,000,000 token context and 1M TPM, never prune
            else:
                compacted = compact_messages(messages)

            try:
                if is_gemini_model(active_model):
                    response = await self.gemini_client.chat(
                        model=active_model,
                        messages=compacted,
                        tools=TOOL_DEFINITIONS
                    )
                elif is_groq_model(active_model):
                    response = await self.groq_client.chat(
                        model=active_model,
                        messages=compacted,
                        tools=TOOL_DEFINITIONS
                    )
                else:
                    response = await self.client.chat(
                        model=active_model,
                        messages=compacted,
                        tools=TOOL_DEFINITIONS
                    )
            except Exception as e:
                err_info = humanize_agent_error(e, active_model)
                friendly_title = err_info["title"]
                friendly_content = err_info["friendly_message"]
                if session_id:
                    save_step(
                        session_id=session_id,
                        step_type="error",
                        title=friendly_title,
                        content=friendly_content,
                        tool_args=err_info
                    )
                yield AgentStepUpdate(
                    step_type="error",
                    title=friendly_title,
                    content=friendly_content,
                    tool_args=err_info
                )
                return

            # Check if client auto-switched model due to quota limits
            used_model = response.get("model_used")
            if used_model and used_model != active_model:
                yield AgentStepUpdate(
                    step_type="thought",
                    title="Model Auto-Failover",
                    content=f"⚠️ Switched to sibling model **{used_model}** with fresh 1M TPM quota."
                )
                active_model = used_model

            # Accumulate token usage
            usage = response.get("usage") or {}
            p_tok = usage.get("prompt_tokens") or usage.get("promptTokenCount") or 0
            c_tok = usage.get("completion_tokens") or usage.get("candidatesTokenCount") or 0
            total_tokens_used += (p_tok + c_tok)

            assistant_msg = response.get("message", {})
            messages.append(assistant_msg)

            content = assistant_msg.get("content", "").strip()
            tool_calls = assistant_msg.get("tool_calls", [])

            # Fallback tool calling parser
            if not tool_calls and content:
                fallback_calls = parse_fallback_tool_calls(content)
                if fallback_calls:
                    tool_calls = fallback_calls

            # Yield reasoning or thoughts if present
            if content and not (tool_calls and (content.startswith("```json") or content.startswith("{"))):
                step_type = "thought" if tool_calls else "message"
                step_title = "Reasoning" if tool_calls else "Assistant Response"
                if session_id:
                    save_step(session_id=session_id, step_type=step_type, title=step_title, content=content)
                yield AgentStepUpdate(
                    step_type=step_type,
                    title=step_title,
                    content=content,
                    tool_args={"tokens_used": total_tokens_used, "model": active_model}
                )

            # If no tools called, the agent has concluded its work
            if not tool_calls:
                complete_msg = "Task completed successfully."
                if session_id:
                    save_step(session_id=session_id, step_type="complete", title="Task Completed", content=complete_msg)
                yield AgentStepUpdate(
                    step_type="complete",
                    title="Task Completed",
                    content=complete_msg,
                    tool_args={"tokens_used": total_tokens_used, "model": active_model}
                )
                return

            # Execute tool calls with loop detection circuit-breaker
            for call in tool_calls:
                fn = call.get("function", {})
                fn_name = fn.get("name")
                fn_args = fn.get("arguments", {})

                if isinstance(fn_args, str):
                    try:
                        fn_args = json.loads(fn_args)
                    except Exception:
                        pass

                current_sig = f"{fn_name}:{json.dumps(fn_args, sort_keys=True)}"
                if current_sig == last_tool_signature:
                    consecutive_repeats += 1
                else:
                    last_tool_signature = current_sig
                    consecutive_repeats = 0

                # Circuit breaker: if model repeats same tool call twice, intervene!
                if consecutive_repeats >= 2:
                    intervention = (
                        f"System Notice: You have already executed `{fn_name}` with these arguments. "
                        f"Do not repeat this call. Please proceed to the next step, create the remaining files, or conclude the task."
                    )
                    messages.append({"role": "system", "content": intervention})
                    yield AgentStepUpdate(
                        step_type="thought",
                        title="Loop Prevention Circuit Breaker",
                        content=intervention
                    )
                    break

                call_content = f"Executing `{fn_name}` with parameters: {json.dumps(fn_args, indent=2)}"
                if session_id:
                    save_step(
                        session_id=session_id,
                        step_type="tool_call",
                        title=f"Calling Tool: {fn_name}",
                        content=call_content,
                        tool_name=fn_name,
                        tool_args=fn_args if isinstance(fn_args, dict) else {"raw": str(fn_args)}
                    )

                yield AgentStepUpdate(
                    step_type="tool_call",
                    title=f"Calling Tool: {fn_name}",
                    content=call_content,
                    tool_name=fn_name,
                    tool_args=fn_args if isinstance(fn_args, dict) else {"raw": str(fn_args)}
                )

                result_str = await dispatch_tool_call(
                    workspace_dir=workspace_dir,
                    tool_name=fn_name,
                    arguments=fn_args if isinstance(fn_args, dict) else {}
                )

                if session_id:
                    save_step(
                        session_id=session_id,
                        step_type="tool_result",
                        title=f"Result from {fn_name}",
                        content=result_str,
                        tool_name=fn_name,
                        tool_result=result_str
                    )

                yield AgentStepUpdate(
                    step_type="tool_result",
                    title=f"Result from {fn_name}",
                    content=result_str,
                    tool_name=fn_name,
                    tool_result=result_str
                )

                tool_msg: Dict[str, Any] = {
                    "role": "tool",
                    "content": result_str,
                    "name": fn_name
                }
                if call.get("id"):
                    tool_msg["tool_call_id"] = call["id"]

                messages.append(tool_msg)

        max_turn_msg = f"Completed {max_turns} turns. Final status recorded above."
        if session_id:
            save_step(session_id=session_id, step_type="message", title="Max Iterations Reached", content=max_turn_msg)
        yield AgentStepUpdate(
            step_type="message",
            title="Max Iterations Reached",
            content=max_turn_msg
        )
