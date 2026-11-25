#!/usr/bin/env bash
set -e

echo "========================================================="
echo "  Starting Apex Agent v2.0"
echo "  Autonomous AI Engineer (Hybrid Cloud & Local ReAct)"
echo "========================================================="
echo ""

# 1. Check Node.js
if ! command -v node >/dev/null 2>&1; then
    echo "[ERROR] Node.js is not installed or not in PATH!"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

# 2. Check Python
if ! command -v python3 >/dev/null 2>&1; then
    echo "[ERROR] Python 3 is not installed or not in PATH!"
    echo "Please install Python 3.10+ from https://python.org/"
    exit 1
fi

# 3. Check Ollama (Optional)
if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
    echo "[OK] Local Ollama detected and responding."
else
    echo "[NOTICE] Local Ollama is not active on http://localhost:11434."
    echo "You can still run using Google Gemini 1M TPM or Groq Cloud in the UI."
fi

# 4. Backend venv
if [ ! -f "backend/venv/bin/python" ]; then
    echo "[SETUP] Creating Python virtual environment in backend/venv..."
    python3 -m venv backend/venv
    echo "[SETUP] Installing Python dependencies..."
    backend/venv/bin/pip install -r backend/requirements.txt
fi

# 5. Frontend dependencies
if [ ! -d "frontend/node_modules" ]; then
    echo "[SETUP] Installing frontend npm packages..."
    (cd frontend && npm install)
fi

echo ""
echo "[1/2] Starting Apex Backend API on http://127.0.0.1:8000..."
(cd backend && ./venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload) &
BACKEND_PID=$!

echo "[2/2] Starting Apex Frontend Studio on http://localhost:3000..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT

echo ""
echo "========================================================="
echo "  Apex Agent v2.0 is up and running!"
echo "  Studio UI:   http://localhost:3000"
echo "  Backend API: http://127.0.0.1:8000"
echo "========================================================="
echo "Press Ctrl+C to stop both servers."

wait
