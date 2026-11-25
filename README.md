# ⚡ Apex Agent v2.0 — Autonomous AI Engineer

> An autonomous, hybrid cloud & local-first AI software engineer powered by **ReAct agent loops**, **Google Gemini (1,000,000 token context)**, **Groq Cloud (500+ tokens/sec)**, and **Local Ollama** with dynamic hardware auto-profiling.

---

## 🌟 Highlights & Capabilities

- 🤖 **Autonomous Multi-Turn ReAct Loop**: Reads workspace code, executes shell commands, writes complete files, and verifies implementations autonomously.
- ⚡ **Triple-Engine Model Flexibility**:
  - **Google Gemini Cloud**: Free 1,000,000 context window & 1M TPM (`gemini-2.5-flash`, `gemini-3.5-flash`, `gemini-3.5-flash-lite`) with automatic failover between sibling models.
  - **Groq Cloud**: Ultra-fast 500+ tokens/second inference (`llama-3.3-70b-versatile`, `qwen/qwen3.8-27b`).
  - **Local Ollama**: 100% offline private execution with dynamic GPU/VRAM hardware auto-detection (`qwen2.5-coder:7b`, `14b`, `3b`).
- 🌐 **In-App Live Interactive Web Preview**: Embedded responsive sandboxed iframe with Desktop, Tablet, and Mobile viewport toggles and reload controls.
- 💻 **Real Code Viewer**: Clean file viewer with line numbers gutter, syntax language detection, line counts, and 1-click clipboard copy.
- 🔍 **Step & Diff Inspector**: Inspect exact tool calls, terminal outputs, JSON payloads, and reasoning chains.
- 📂 **Workspace Tree Explorer**: Real-time project file browser with on-the-fly project directory switching.
- 💬 **Session Chat History**: Full multi-task SQLite memory with auto-generated session titles based on user prompts.

---

## 🖥️ Dynamic Hardware Adaptation Matrix

When running locally with Ollama, Apex Agent scans your CPU, RAM, and GPU VRAM to select the optimal model tier:

| Detected Hardware Profile | Recommended Model Tier | Ollama Command |
| :--- | :--- | :--- |
| **Tier 0: Cloud Zero-GPU** | `gemini-3.5-flash` / `llama-3.3-70b` | *Free Cloud API (0 VRAM required)* |
| **Tier 1A**: Low VRAM / <16GB RAM | `qwen2.5:3b` | `ollama run qwen2.5:3b` |
| **Tier 1B**: Hybrid / High RAM (32GB+ RAM, low VRAM) | `qwen2.5-coder:7b` | `ollama run qwen2.5-coder:7b` |
| **Tier 2**: Mid-Range GPU (8GB – 16GB VRAM) | `qwen2.5-coder:14b` | `ollama run qwen2.5-coder:14b` |
| **Tier 3**: Workstation (24GB+ VRAM or 32GB+ Mac) | `qwen2.5-coder:32b` | `ollama run qwen2.5-coder:32b` |

---

## 📋 System Prerequisites

Ensure you have the following installed on your machine:

1. **Git**: [git-scm.com/downloads](https://git-scm.com/downloads)
2. **Python 3.10+**: [python.org/downloads](https://www.python.org/downloads/) *(Ensure "Add Python to PATH" is checked)*
3. **Node.js 18+ & npm**: [nodejs.org/en/download](https://nodejs.org/)
4. *(Optional for local models)* **Ollama**: [ollama.com/download](https://ollama.com/download)
5. *(Optional for unlimited cloud)* **Google Gemini API Key** ([aistudio.google.com](https://aistudio.google.com/)) or **Groq Key** ([console.groq.com](https://console.groq.com/))

---

## 🚀 Quick Start (1-Click Launch)

### 1. Clone the Repository

```bash
git clone https://github.com/YourUsername/Apex-Agent.git
cd Apex-Agent
```

### 2. Launch with 1-Click

#### 🪟 Windows (Batch / Command Prompt)
Double-click `start.bat` or run:
```cmd
start.bat
```

#### 🪟 Windows (PowerShell)
```powershell
.\start.ps1
```
*(If script execution is disabled in PowerShell, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` first).*

#### 🍎 macOS / 🐧 Linux
```bash
chmod +x start.sh
./start.sh
```

The script automatically:
1. Creates the Python virtual environment (`backend/venv`).
2. Installs all Python dependencies.
3. Installs all frontend npm packages.
4. Boots the **FastAPI Agent API** on `http://127.0.0.1:8000`.
5. Boots the **React Web Studio** on `http://localhost:3000`.

---

## 🌐 Deploy & Host Online (Free Cloud Platforms)

You can host Apex Agent online 24/7 with zero server costs using any free cloud platform:

### Option 1: 1-Click Deploy on Render (Recommended — 100% Free)
Render hosts the unified Docker container (Frontend + FastAPI backend + WebSockets) with automatic HTTPS:
1. Click the button below or visit [render.com](https://render.com):
   
   [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/SheikMohammed480/apex-autonomous-engineer)
2. Sign in with GitHub and select your repository: `SheikMohammed480/apex-autonomous-engineer`.
3. Select **Docker** environment.
4. *(Optional)* Add your `GEMINI_API_KEY` in Environment Variables.
5. Click **Deploy Web Service** — Render automatically builds and hosts your live app at `https://apex-autonomous-engineer.onrender.com`.

### Option 2: 1-Click Deploy on Railway
1. Go to [railway.app](https://railway.app/new).
2. Choose **Deploy from GitHub repo** and select `SheikMohammed480/apex-autonomous-engineer`.
3. Railway detects the `Dockerfile` automatically and assigns a live public domain.

### Option 3: Instant Public URL via Tunnel (Test Right Now)
If you want a live public URL immediately to share with anyone without deploying to the cloud:
```bash
npx localtunnel --port 8000
```
*(Provides an instant `https://xxxx.loca.lt` public link serving your full studio interface).*

### Option 4: Self-Hosted Docker (Any VPS, AWS, GCP, DigitalOcean)
```bash
# Build the unified production container
docker build -t apex-agent .

# Run container on port 8000
docker run -d -p 8000:8000 -e GEMINI_API_KEY="your-gemini-key" apex-agent
```

---

## 🛠️ Step-by-Step Manual Setup

If you prefer to run services manually in separate terminals:

### Terminal 1: Backend API (FastAPI)

```bash
# Navigate to backend
cd backend

# Create Python virtual environment
python -m venv venv

# Activate virtual environment
# Windows (cmd/PowerShell):
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server with live reload
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*API is accessible at `http://127.0.0.1:8000` (Interactive docs: `http://127.0.0.1:8000/docs`).*

### Terminal 2: Frontend Studio (React + Vite + Tailwind)

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
*Web studio is accessible at `http://localhost:3000`.*

---

## 🔑 Cloud API Setup (Google Gemini & Groq)

You do **not** need an expensive GPU to run Apex Agent. You can use free high-tier cloud models:

### Option A: Via the Web UI (Easiest)
1. Open `http://localhost:3000`.
2. Look at the top banner:
   - Click **`+ Add Gemini Key`** and paste your free key from [Google AI Studio](https://aistudio.google.com/app/apikey).
   - Click **`+ Add Groq Key`** and paste your key from [Groq Console](https://console.groq.com/keys).
3. The key is automatically verified and saved to `backend/.env`.
4. Switch to `gemini-3.5-flash` or `llama-3.3-70b-versatile` from the model dropdown.

### Option B: Via `backend/.env` File
Create `backend/.env` (or copy from `backend/.env.example`):

```env
# Google Gemini (Free 1,000,000 Token Context Window & 1M TPM)
GEMINI_API_KEY=AIzaSy...

# Groq Cloud (500+ tokens/sec)
GROQ_API_KEY=gsk_...

# Local Ollama Host
OLLAMA_HOST=http://localhost:11434

# Default Model Selection: auto, gemini-2.5-flash, or qwen2.5-coder:7b
AGENT_MODEL=auto

# Server bind settings
HOST=127.0.0.1
PORT=8000
```

---

## 📖 How to Use Apex Agent

### 1. Starting a New Task or Project
- Click **`+ New Task / Project`** in the left sidebar.
- Enter your project destination folder (default is `d:\Agentic\workspace` or `./workspace`).

### 2. Issuing Prompts
- Type your prompt in the chat box at the bottom, or select a Quick-Starter card:
  - 🚀 **Kanban TaskFlow Board** (Drag-and-drop, badges, localStorage)
  - 📊 **Trading Terminal Simulator** (Canvas candlestick chart, RSI/SMA, bots)
  - 🧮 **Scientific Calculator** (Trigonometry, math history, keyboard hotkeys)
  - 🎮 **2D Retro Arcade Canvas Game** (Shooter, enemy waves, particles)
- Press **Run** (or hit Enter).

### 3. Monitoring Real-Time Execution
- **User Prompt Card**: Displays your request in a distinct purple/indigo card.
- **Stopwatch Timer**: Tracks active model inference time live (`⏱️ 00:14s`).
- **Tool Calls**: Shows when files are read, written, or terminal commands are executed.
- **Apex Agent Response**: Displays structured Markdown solutions and instructions.

### 4. Interactive Live Web Preview
- When building web applications (`index.html`, CSS, JS), click the **`🌐 Live Web Preview`** tab in the main panel.
- Switch between **Desktop**, **Tablet**, and **Mobile** preview viewports.
- Click **`⟳ Reload`** to re-render changes instantly or **`Open in New Tab`** to test in full screen.

### 5. Inspecting Code & Diffs
- Click any file in the **Workspace Files** tree on the right to open it in **`</> Code Viewer`**.
- View line numbers, file size, line counts, and copy code with 1-click.
- Click on any execution step in the stream to inspect exact parameters in the **`Step Inspector`**.

---

## 📂 Project Architecture

```
Apex-Agent/
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI REST endpoints & WebSocket /ws/agent
│   │   ├── hardware.py         # Hardware specs inspection & auto-tier recommendation
│   │   ├── gemini_client.py    # Google Gemini 1M TPM client with automatic model fallback
│   │   ├── groq_client.py      # Groq Cloud API integration
│   │   ├── ollama_client.py    # Local Ollama integration with tool-calling
│   │   ├── db.py               # SQLite session memory and message history
│   │   ├── agent/
│   │   │   ├── core.py         # Autonomous ReAct state machine & step generator
│   │   │   ├── prompts.py      # Apex Agent autonomous persona & instructions
│   │   │   └── context.py      # Repository tree mapper & token compaction
│   │   └── tools/
│   │       ├── filesystem.py   # Safe read, write, and surgical search/replace diff applier
│   │       ├── shell.py        # Safe asynchronous command runner
│   │       └── search.py       # High-speed file globbing & regex grep
│   ├── requirements.txt        # Python backend dependencies
│   └── .env.example            # Environment variables template
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.tsx         # Apex Agent brand, workspace selector, chat history
│   │   │   ├── HardwareBanner.tsx  # Specs bar, live model switcher, API key modal
│   │   │   ├── ChatPane.tsx        # Execution stream, user prompt bubbles, quick starters
│   │   │   ├── WorkspaceViewer.tsx # 3-in-1 Web Preview, Code Viewer, Step Inspector
│   │   │   └── FileExplorer.tsx    # Live workspace file tree
│   │   ├── services/
│   │   │   └── api.ts              # REST and WebSocket client
│   │   ├── App.tsx                 # Main layout and state orchestration
│   │   └── index.css               # Tailwind CSS styling & animations
│   ├── package.json
│   └── vite.config.ts
│
├── workspace/                  # Default sandbox directory where the agent creates projects
├── start.bat                   # 1-Click launcher for Windows Command Prompt
├── start.ps1                   # 1-Click launcher for Windows PowerShell
├── start.sh                    # 1-Click launcher for macOS and Linux
└── README.md                   # Complete documentation
```

---

## ❓ Troubleshooting & FAQs

#### Q1: "Port 8000 or Port 3000 is already in use"
- Kill running processes:
  - Windows: `netstat -ano | findstr :8000` then `taskkill /PID <PID> /F`
  - Linux/Mac: `lsof -ti:8000 | xargs kill -9`

#### Q2: "PowerShell says `Execution of scripts is disabled on this system`"
- Run PowerShell as Administrator and run:
  ```powershell
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
  ```
  Then run `.\start.ps1` again.

#### Q3: "Gemini returns error 429: Resource Exhausted"
- Free-tier accounts allow 15 RPM / 1,500 RPD. Apex Agent has built-in auto-fallback between `gemini-2.5-flash`, `gemini-3.5-flash`, and `gemini-3.5-flash-lite`, ensuring uninterrupted generation.

#### Q4: "How do I make the agent work on my existing git project?"
- In the left sidebar, click **`Change`** next to **Project Folder** and type/paste the absolute path to your project (e.g. `C:\Users\You\Projects\my-website`). The agent will immediately index the repository and operate directly inside it!

---

## 📄 License

MIT License — free for personal and commercial development. Built with ❤️ for autonomous AI engineering.
