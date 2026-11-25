import sqlite3
import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional

DB_PATH = Path(__file__).resolve().parent.parent / "agentic_history.db"


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initializes the SQLite tables for chat sessions and message steps."""
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                workspace_dir TEXT NOT NULL,
                model TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                step_type TEXT NOT NULL,
                title TEXT,
                content TEXT NOT NULL,
                tool_name TEXT,
                tool_args TEXT,
                tool_result TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
            )
        """)
        conn.commit()


def create_session(title: str, workspace_dir: str, model: str) -> Dict[str, Any]:
    session_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    with get_connection() as conn:
        conn.execute(
            "INSERT INTO sessions (id, title, workspace_dir, model, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            (session_id, title, workspace_dir, model, now, now)
        )
        conn.commit()
    return {
        "id": session_id,
        "title": title,
        "workspace_dir": workspace_dir,
        "model": model,
        "created_at": now,
        "updated_at": now
    }


def list_sessions() -> List[Dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM sessions ORDER BY updated_at DESC").fetchall()
        return [dict(r) for r in rows]


def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
        if not row:
            return None
        session = dict(row)
        msg_rows = conn.execute(
            "SELECT * FROM messages WHERE session_id = ? ORDER BY id ASC",
            (session_id,)
        ).fetchall()
        
        messages = []
        for m in msg_rows:
            item = dict(m)
            if item.get("tool_args"):
                try:
                    item["tool_args"] = json.loads(item["tool_args"])
                except Exception:
                    pass
            messages.append(item)
            
        session["messages"] = messages
        return session


def delete_session(session_id: str):
    with get_connection() as conn:
        conn.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
        conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        conn.commit()


def update_session_title_if_default(session_id: str, new_title: str):
    """Updates session title if it currently has a default auto-generated name."""
    clean_title = new_title.strip().replace("\n", " ")
    if len(clean_title) > 42:
        clean_title = clean_title[:40] + "..."
    if not clean_title:
        return
    with get_connection() as conn:
        row = conn.execute("SELECT title FROM sessions WHERE id = ?", (session_id,)).fetchone()
        if row:
            curr = row["title"]
            if curr.startswith("Task in ") or curr == "New Task" or curr == "Untitled Session" or not curr:
                conn.execute("UPDATE sessions SET title = ? WHERE id = ?", (clean_title, session_id))
                conn.commit()


def save_step(
    session_id: str,
    step_type: str,
    content: str,
    title: Optional[str] = None,
    tool_name: Optional[str] = None,
    tool_args: Optional[Dict[str, Any]] = None,
    tool_result: Optional[str] = None
):
    now = datetime.utcnow().isoformat()
    tool_args_str = json.dumps(tool_args) if tool_args else None

    # Automatically set title to first user prompt if still default
    if step_type == "user" and content:
        try:
            update_session_title_if_default(session_id, content)
        except Exception:
            pass

    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO messages (session_id, step_type, title, content, tool_name, tool_args, tool_result, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (session_id, step_type, title, content, tool_name, tool_args_str, tool_result, now)
        )
        conn.execute(
            "UPDATE sessions SET updated_at = ? WHERE id = ?",
            (now, session_id)
        )
        conn.commit()


# Initialize on import
init_db()
