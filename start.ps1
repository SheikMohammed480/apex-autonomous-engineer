# Apex Agent v2.0 Startup Script for PowerShell
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "  Starting Apex Agent v2.0" -ForegroundColor Cyan
Write-Host "  Autonomous AI Engineer (Hybrid Cloud & Local ReAct)" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan

# 1. Verify Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js is not installed or not in PATH!" -ForegroundColor Red
    Write-Host "Please install Node.js 18+ from https://nodejs.org/" -ForegroundColor Yellow
    Exit 1
}

# 2. Verify Python
$pyCmd = $null
if (Get-Command python -ErrorAction SilentlyContinue) {
    $pyCmd = "python"
} elseif (Get-Command py -ErrorAction SilentlyContinue) {
    $pyCmd = "py"
} else {
    Write-Host "[ERROR] Python is not installed or not in PATH!" -ForegroundColor Red
    Write-Host "Please install Python 3.10+ from https://python.org/" -ForegroundColor Yellow
    Exit 1
}

# 3. Check Ollama (Optional)
try {
    $res = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "[OK] Local Ollama is active and responding." -ForegroundColor Green
} catch {
    Write-Host "[NOTICE] Local Ollama is not active on http://localhost:11434." -ForegroundColor Yellow
    Write-Host "You can use Google Gemini (1M TPM) or Groq Cloud directly in the UI." -ForegroundColor Yellow
    Write-Host "If you want local inference, start it via 'ollama serve'." -ForegroundColor Yellow
}

# 4. Python Virtual Environment Setup
$venvPython = "backend\venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
    Write-Host "[SETUP] Initializing Python virtual environment in backend\venv..." -ForegroundColor Yellow
    if ($pyCmd -eq "py") {
        & py -3.10 -m venv backend\venv
    } else {
        & python -m venv backend\venv
    }
    Write-Host "[SETUP] Installing Python dependencies..." -ForegroundColor Yellow
    & "backend\venv\Scripts\pip.exe" install -r backend\requirements.txt
}

# 5. Frontend Dependencies Setup
if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "[SETUP] Installing frontend node_modules..." -ForegroundColor Yellow
    Push-Location "frontend"
    npm install
    Pop-Location
}

Write-Host "`n[1/2] Starting Apex Backend API on http://127.0.0.1:8000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; .\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

Write-Host "[2/2] Starting Apex Frontend Studio on http://localhost:3000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "`n=========================================================" -ForegroundColor Green
Write-Host "  Apex Agent v2.0 is running!" -ForegroundColor Green
Write-Host "  Studio UI:   http://localhost:3000" -ForegroundColor Green
Write-Host "  Backend API: http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "  Swagger Doc: http://127.0.0.1:8000/docs" -ForegroundColor Green
Write-Host "=========================================================" -ForegroundColor Green
