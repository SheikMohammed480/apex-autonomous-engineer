import asyncio
import os
import subprocess
from typing import Dict, Any


async def run_command(workspace_dir: str, command: str, timeout_seconds: int = 45) -> Dict[str, Any]:
    """
    Executes a shell command asynchronously in the workspace directory with timeout
    and output size limits to avoid bloating context.
    """
    is_windows = os.name == "nt"
    shell_cmd = ["powershell", "-NoProfile", "-Command", command] if is_windows else ["bash", "-c", command]

    try:
        process = await asyncio.create_subprocess_exec(
            *shell_cmd,
            cwd=workspace_dir,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )

        try:
            stdout_data, stderr_data = await asyncio.wait_for(
                process.communicate(),
                timeout=float(timeout_seconds)
            )
            stdout = stdout_data.decode("utf-8", errors="replace")
            stderr = stderr_data.decode("utf-8", errors="replace")
            exit_code = process.returncode

            # Output truncation guard (cap at 150 lines or 6KB)
            combined = ""
            if stdout:
                lines = stdout.splitlines()
                if len(lines) > 150:
                    combined += "\n".join(lines[:75]) + f"\n... [{len(lines)-150} lines truncated] ...\n" + "\n".join(lines[-75:])
                else:
                    combined += stdout
            if stderr:
                combined += f"\n[STDERR]:\n{stderr}"

            if not combined.strip():
                combined = "(Command completed with no output)"

            return {
                "exit_code": exit_code,
                "output": combined.strip(),
                "success": exit_code == 0
            }
        except asyncio.TimeoutError:
            try:
                process.kill()
            except Exception:
                pass
            return {
                "exit_code": -1,
                "output": f"Command timed out after {timeout_seconds} seconds and was terminated.",
                "success": False
            }
    except Exception as e:
        return {
            "exit_code": -1,
            "output": f"Execution error: {str(e)}",
            "success": False
        }
