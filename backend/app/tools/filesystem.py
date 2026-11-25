import os
from pathlib import Path
from typing import Optional


def resolve_path(workspace_dir: str, rel_path: str) -> Path:
    """Ensures the target path is resolved relative to the workspace directory."""
    path = Path(rel_path)
    if path.is_absolute():
        return path
    return (Path(workspace_dir) / path).resolve()


def read_file(workspace_dir: str, path: str, start_line: Optional[int] = None, end_line: Optional[int] = None) -> str:
    """Reads a file with optional line bounds to prevent exhausting context."""
    target_path = resolve_path(workspace_dir, path)
    if not target_path.exists():
        return f"Error: File '{path}' does not exist."
    if not target_path.is_file():
        return f"Error: Path '{path}' is a directory, not a file."

    try:
        with open(target_path, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()

        total_lines = len(lines)
        start = max(1, start_line) if start_line else 1
        end = min(total_lines, end_line) if end_line else total_lines

        if start > total_lines:
            return f"Error: start_line {start} exceeds total file lines ({total_lines})."

        numbered_lines = [f"{i}: {lines[i - 1]}" for i in range(start, end + 1)]
        output = "".join(numbered_lines)
        header = f"=== File: {path} (Lines {start}-{end} of {total_lines}) ===\n"
        return header + output
    except Exception as e:
        return f"Error reading file '{path}': {str(e)}"


def write_file(workspace_dir: str, path: str, content: str) -> str:
    """Creates a new file or overwrites an existing file."""
    target_path = resolve_path(workspace_dir, path)
    try:
        target_path.parent.mkdir(parents=True, exist_ok=True)
        with open(target_path, "w", encoding="utf-8") as f:
            f.write(content)
        return f"Success: File '{path}' written successfully ({len(content)} characters)."
    except Exception as e:
        return f"Error writing file '{path}': {str(e)}"


def apply_diff(workspace_dir: str, path: str, search_block: str, replace_block: str) -> str:
    """
    Applies surgical search-and-replace block changes.
    Avoids requiring local models to rewrite entire 500+ line files.
    """
    target_path = resolve_path(workspace_dir, path)
    if not target_path.exists():
        return f"Error: File '{path}' does not exist to patch."

    try:
        with open(target_path, "r", encoding="utf-8", errors="replace") as f:
            current_content = f.read()

        normalized_current = current_content.replace("\r\n", "\n")
        normalized_search = search_block.replace("\r\n", "\n")
        normalized_replace = replace_block.replace("\r\n", "\n")

        if normalized_search not in normalized_current:
            # Try trimming trailing and leading whitespace
            trimmed_search = normalized_search.strip()
            if trimmed_search in normalized_current:
                normalized_current = normalized_current.replace(trimmed_search, normalized_replace.strip(), 1)
            else:
                return (
                    f"Error: Search block not found in '{path}'. "
                    f"Ensure exact match including whitespace and indentation."
                )
        else:
            normalized_current = normalized_current.replace(normalized_search, normalized_replace, 1)

        with open(target_path, "w", encoding="utf-8") as f:
            f.write(normalized_current)

        return f"Success: Diff applied cleanly to '{path}'."
    except Exception as e:
        return f"Error applying diff to '{path}': {str(e)}"
