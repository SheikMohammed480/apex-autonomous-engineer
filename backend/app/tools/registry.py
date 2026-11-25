from typing import Dict, Any, List
from app.tools.filesystem import read_file, write_file, apply_diff
from app.tools.shell import run_command
from app.tools.search import search_files, grep_code

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Read file contents with line numbers and optional line bounds.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Relative file path from workspace root"},
                    "start_line": {"type": "integer", "description": "First line number to read (1-indexed)"},
                    "end_line": {"type": "integer", "description": "Last line number to read (inclusive)"}
                },
                "required": ["path"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "apply_diff",
            "description": "Applies a surgical search-and-replace modification to an existing file.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Relative file path from workspace root"},
                    "search_block": {"type": "string", "description": "Exact text block to replace"},
                    "replace_block": {"type": "string", "description": "New replacement text"}
                },
                "required": ["path", "search_block", "replace_block"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "write_file",
            "description": "Create a new file or overwrite an existing file with complete content.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Relative file path to create/overwrite"},
                    "content": {"type": "string", "description": "The full content to write"}
                },
                "required": ["path", "content"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "run_command",
            "description": "Run shell commands in the workspace (builds, tests, git, package installs).",
            "parameters": {
                "type": "object",
                "properties": {
                    "command": {"type": "string", "description": "The command line string to run"}
                },
                "required": ["command"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_files",
            "description": "Find files in the workspace matching a glob pattern (e.g., '*.py', 'src/**/*.ts').",
            "parameters": {
                "type": "object",
                "properties": {
                    "pattern": {"type": "string", "description": "Glob pattern (defaults to '*')"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "grep_code",
            "description": "Search across file contents in workspace for a string or regex.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search term or regex pattern"},
                    "file_pattern": {"type": "string", "description": "Optional file filter (e.g. '*.py')"}
                },
                "required": ["query"]
            }
        }
    }
]


async def dispatch_tool_call(workspace_dir: str, tool_name: str, arguments: Dict[str, Any]) -> str:
    """Dispatches tool execution to the appropriate implementation."""
    try:
        if tool_name == "read_file":
            return read_file(
                workspace_dir=workspace_dir,
                path=arguments["path"],
                start_line=arguments.get("start_line"),
                end_line=arguments.get("end_line")
            )
        elif tool_name == "apply_diff":
            return apply_diff(
                workspace_dir=workspace_dir,
                path=arguments["path"],
                search_block=arguments["search_block"],
                replace_block=arguments["replace_block"]
            )
        elif tool_name == "write_file":
            return write_file(
                workspace_dir=workspace_dir,
                path=arguments["path"],
                content=arguments["content"]
            )
        elif tool_name == "run_command":
            res = await run_command(workspace_dir=workspace_dir, command=arguments["command"])
            status = "Success" if res["success"] else f"Failed (Exit Code {res['exit_code']})"
            return f"[{status}]\n{res['output']}"
        elif tool_name == "search_files":
            files = search_files(workspace_dir=workspace_dir, pattern=arguments.get("pattern", "*"))
            if not files:
                return "No files found matching the pattern."
            return f"Found {len(files)} files:\n" + "\n".join(files[:40])
        elif tool_name == "grep_code":
            return grep_code(
                workspace_dir=workspace_dir,
                query=arguments["query"],
                file_pattern=arguments.get("file_pattern")
            )
        else:
            return f"Error: Unknown tool '{tool_name}'."
    except Exception as e:
        return f"Error executing tool '{tool_name}': {str(e)}"
