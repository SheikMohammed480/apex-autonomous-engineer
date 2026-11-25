import os
import copy
import json
from pathlib import Path
from typing import List, Dict, Any
from app.tools.search import search_files


def generate_repo_map(workspace_dir: str, max_files: int = 40) -> str:
    """
    Builds a concise skeleton map of the repository structure
    to orient the local model without exceeding context limits.
    """
    files = search_files(workspace_dir, pattern="*", max_results=max_files)
    if not files:
        return "(Workspace appears to be empty or contains only excluded directories)"

    tree_str = "Workspace File Outline:\n" + "\n".join(f"- {f}" for f in files)
    return tree_str


def compact_messages(messages: List[Dict[str, Any]], max_history_turns: int = 8) -> List[Dict[str, Any]]:
    """
    Compacts conversation history to prevent blowing through rate limits (TPM)
    and context windows.
    1. Prunes giant file contents from previous write_file tool calls in history (saving 95% of tokens).
    2. Preserves system prompt, initial user prompt, and recent turns.
    """
    # Deep copy to avoid mutating original objects in memory
    cleaned_messages = []
    for i, m in enumerate(messages):
        m_copy = copy.deepcopy(m)
        # Prune older assistant tool calls that wrote giant files
        if i < len(messages) - 2 and m_copy.get("tool_calls"):
            for tc in m_copy["tool_calls"]:
                fn = tc.get("function", {})
                if fn.get("name") == "write_file":
                    args = fn.get("arguments")
                    if isinstance(args, str):
                        try:
                            parsed = json.loads(args)
                            if "content" in parsed and len(parsed["content"]) > 100:
                                parsed["content"] = f"[{len(parsed['content'])} characters written to {parsed.get('path', 'file')}]"
                                fn["arguments"] = json.dumps(parsed)
                        except Exception:
                            pass
                    elif isinstance(args, dict):
                        if "content" in args and len(args["content"]) > 100:
                            args["content"] = f"[{len(args['content'])} characters written to {args.get('path', 'file')}]"
        cleaned_messages.append(m_copy)

    if len(cleaned_messages) <= max_history_turns + 2:
        return cleaned_messages

    system_msg = cleaned_messages[0] if cleaned_messages and cleaned_messages[0].get("role") == "system" else None
    first_user_msg = None
    for m in cleaned_messages:
        if m.get("role") == "user":
            first_user_msg = m
            break

    recent_turns = cleaned_messages[-max_history_turns:]
    compacted = []
    if system_msg:
        compacted.append(system_msg)
    if first_user_msg and first_user_msg not in recent_turns:
        compacted.append(first_user_msg)
        compacted.append({
            "role": "system",
            "content": "[Previous conversation history compacted to prevent rate limits]"
        })

    compacted.extend(recent_turns)
    return compacted
