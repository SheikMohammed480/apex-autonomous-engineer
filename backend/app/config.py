import os
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings


ENV_FILE_PATH = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    OLLAMA_HOST: str = "http://localhost:11434"
    AGENT_MODEL: str = "auto"
    WORKSPACE_DIR: str = str(Path(__file__).resolve().parent.parent.parent)
    REQUIRE_SHELL_APPROVAL: bool = False
    GROQ_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    HOST: str = "127.0.0.1"
    PORT: int = 8000

    class Config:
        env_file = ENV_FILE_PATH
        extra = "ignore"


settings = Settings()
