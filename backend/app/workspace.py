import os
from pathlib import Path
from typing import List, Dict, Any, Optional

EXCLUDED_DIRS = {
    ".git", "node_modules", "__pycache__", "venv", ".venv",
    "dist", "build", ".next", ".idea", ".vscode"
}


def get_directory_tree(base_path: str, max_depth: int = 4) -> List[Dict[str, Any]]:
    """Builds a hierarchical file tree structure of the active workspace."""
    root = Path(base_path).resolve()
    if not root.exists() or not root.is_dir():
        return []

    def _build_tree(current_dir: Path, depth: int) -> List[Dict[str, Any]]:
        if depth > max_depth:
            return []

        items = []
        try:
            entries = sorted(current_dir.iterdir(), key=lambda e: (not e.is_dir(), e.name.lower()))
            for entry in entries:
                if entry.name in EXCLUDED_DIRS or entry.name.startswith("."):
                    continue

                rel_path = os.path.relpath(entry, root).replace("\\", "/")
                abs_path = str(entry.resolve())
                if entry.is_dir():
                    items.append({
                        "name": entry.name,
                        "path": rel_path,
                        "abs_path": abs_path,
                        "type": "directory",
                        "children": _build_tree(entry, depth + 1)
                    })
                else:
                    items.append({
                        "name": entry.name,
                        "path": rel_path,
                        "abs_path": abs_path,
                        "type": "file",
                        "size": entry.stat().st_size
                    })
        except PermissionError:
            pass
        return items

    return _build_tree(root, 1)


def ensure_workspace_exists(target_dir: str) -> Dict[str, Any]:
    """Ensures a project workspace folder exists; creates it if needed."""
    p = Path(target_dir).resolve()
    created = False
    if not p.exists():
        p.mkdir(parents=True, exist_ok=True)
        created = True
    return {
        "path": str(p),
        "exists": True,
        "is_directory": p.is_dir(),
        "created": created
    }
