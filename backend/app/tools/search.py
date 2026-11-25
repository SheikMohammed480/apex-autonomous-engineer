import os
import re
from pathlib import Path
from typing import List, Optional


EXCLUDED_DIRS = {
    ".git", "node_modules", "__pycache__", "venv", ".venv",
    "dist", "build", ".next", ".idea", ".vscode"
}


def search_files(workspace_dir: str, pattern: str = "*", max_results: int = 50) -> List[str]:
    """Finds files in the workspace matching a glob pattern, skipping binary/virtual environment folders."""
    matches = []
    base_path = Path(workspace_dir)

    for root, dirs, files in os.walk(base_path):
        # Exclude common noise directories in-place
        dirs[:] = [d for d in dirs if d not in EXCLUDED_DIRS and not d.startswith(".")]

        for file in files:
            rel_path = os.path.relpath(os.path.join(root, file), workspace_dir)
            if Path(rel_path).match(pattern) or pattern == "*":
                matches.append(rel_path.replace("\\", "/"))
                if len(matches) >= max_results:
                    return matches

    return matches


def grep_code(workspace_dir: str, query: str, file_pattern: Optional[str] = None, max_results: int = 40) -> str:
    """Searches file contents across the workspace for a string or regex pattern."""
    results = []
    base_path = Path(workspace_dir)

    try:
        regex = re.compile(query, re.IGNORECASE)
    except re.error:
        # Fallback to plain substring match
        regex = None

    for root, dirs, files in os.walk(base_path):
        dirs[:] = [d for d in dirs if d not in EXCLUDED_DIRS and not d.startswith(".")]

        for file in files:
            rel_file = os.path.relpath(os.path.join(root, file), workspace_dir).replace("\\", "/")
            if file_pattern and not Path(rel_file).match(file_pattern):
                continue

            full_file = os.path.join(root, file)
            try:
                with open(full_file, "r", encoding="utf-8", errors="ignore") as f:
                    for line_num, line in enumerate(f, start=1):
                        matched = bool(regex.search(line)) if regex else (query.lower() in line.lower())
                        if matched:
                            results.append(f"{rel_file}:{line_num}: {line.strip()[:140]}")
                            if len(results) >= max_results:
                                return "\n".join(results) + f"\n... (reached max limit of {max_results} matches)"
            except Exception:
                continue

    if not results:
        return f"No matches found for '{query}'."
    return "\n".join(results)
