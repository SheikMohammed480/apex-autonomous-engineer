@echo off
setlocal enabledelayedexpansion

echo =========================================================
echo   Starting Apex Agent v2.0
echo   Autonomous AI Engineer (Hybrid Cloud ^& Local ReAct)
echo =========================================================
echo.

:: 1. Verify Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

:: 2. Verify Python is installed
where python >nul 2>&1
if %errorlevel% neq 0 (
    where py >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERROR] Python is not installed or not in PATH!
        echo Please install Python 3.10+ from https://python.org/
        pause
        exit /b 1
    )
)

:: 3. Optional: Check if local Ollama is running
curl -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel% neq 0 (
    echo [NOTICE] Local Ollama is not running on http://localhost:11434.
    echo (You can still run using Google Gemini 1M TPM or Groq Cloud in the UI)
    echo If you want local models, start it via: "ollama serve"
    echo.
) else (
    echo [OK] Local Ollama detected and responding.
)

:: 4. Check / Setup Python Virtual Environment
if not exist "backend\venv\Scripts\python.exe" (
    echo [SETUP] Initializing Python virtual environment...
    py -3.10 -m venv backend\venv 2>nul || python -m venv backend\venv
    echo [SETUP] Installing backend dependencies...
    backend\venv\Scripts\pip.exe install -r backend\requirements.txt
)

:: 5. Check / Setup Frontend
if not exist "frontend\node_modules" (
    echo [SETUP] Installing frontend dependencies...
    cd frontend && npm install && cd ..
)

echo.
echo [1/2] Launching Apex Backend API (FastAPI on port 8000)...
start "Apex Agent Backend" cmd /k "cd backend && venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Launching Apex Frontend UI (React + Vite on port 3000)...
start "Apex Agent Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo =========================================================
echo   Apex Agent v2.0 is up and running!
echo   Web Studio: http://localhost:3000
echo   Backend API: http://127.0.0.1:8000
echo   API Docs:   http://127.0.0.1:8000/docs
echo =========================================================
echo.
pause
