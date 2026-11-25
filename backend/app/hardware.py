"""
Hardware auto-detection and dynamic model tier profiling module.
Enables any developer cloning this repository to automatically use the best
model configuration for their machine (NVIDIA GPU, Apple Silicon, or CPU/RAM).
"""

import os
import platform
import subprocess
import psutil
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from app.config import settings


class HardwareProfile(BaseModel):
    os_name: str
    cpu_name: str
    cpu_cores: int
    cpu_threads: int
    total_ram_gb: float
    gpu_name: Optional[str] = None
    vram_gb: float = 0.0
    has_cuda: bool = False
    has_apple_metal: bool = False
    recommended_tier: str
    recommended_model: str
    available_ollama_models: List[str] = []
    selected_model: str
    groq_configured: bool = False
    gemini_configured: bool = False



def detect_system_hardware() -> Dict[str, Any]:
    """Detects CPU, RAM, and GPU capabilities across Windows, Linux, and macOS."""
    os_name = platform.system()
    cpu_cores = psutil.cpu_count(logical=False) or 4
    cpu_threads = psutil.cpu_count(logical=True) or 8
    total_ram_gb = round(psutil.virtual_memory().total / (1024 ** 3), 2)
    cpu_name = platform.processor() or "Unknown CPU"

    gpu_name = None
    vram_gb = 0.0
    has_cuda = False
    has_apple_metal = False

    # Check for Apple Silicon
    if os_name == "Darwin" and platform.machine() == "arm64":
        has_apple_metal = True
        gpu_name = f"Apple Silicon Unified Memory ({total_ram_gb} GB)"
        vram_gb = total_ram_gb

    # Check for NVIDIA GPU via nvidia-smi
    if not has_apple_metal:
        try:
            result = subprocess.run(
                ["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader,nounits"],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0 and result.stdout.strip():
                lines = result.stdout.strip().split("\n")
                first_gpu = lines[0].split(",")
                gpu_name = first_gpu[0].strip()
                vram_mb = float(first_gpu[1].strip())
                vram_gb = round(vram_mb / 1024.0, 2)
                has_cuda = True
        except Exception:
            pass

    # Fallback GPU detection on Windows via WMI if nvidia-smi was not available
    if not gpu_name and os_name == "Windows":
        try:
            cmd = "powershell -NoProfile -Command \"Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name\""
            res = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=5)
            if res.returncode == 0 and res.stdout.strip():
                gpu_names = [line.strip() for line in res.stdout.strip().split("\n") if line.strip()]
                for name in gpu_names:
                    if any(vendor in name.upper() for vendor in ["NVIDIA", "AMD", "RADEON", "RTX", "GTX"]):
                        gpu_name = name
                        break
                if not gpu_name and gpu_names:
                    gpu_name = gpu_names[0]
        except Exception:
            pass

    return {
        "os_name": os_name,
        "cpu_name": cpu_name,
        "cpu_cores": cpu_cores,
        "cpu_threads": cpu_threads,
        "total_ram_gb": total_ram_gb,
        "gpu_name": gpu_name or "Integrated Graphics / Standard CPU",
        "vram_gb": vram_gb,
        "has_cuda": has_cuda,
        "has_apple_metal": has_apple_metal
    }


def compute_recommended_model(hardware: Dict[str, Any], available_models: List[str]) -> tuple[str, str]:
    """
    Determines tier and model recommendation based on hardware and cloud API keys:
    - If GEMINI_API_KEY is configured: Google Gemini 2.5 Flash (1,000,000 Free TPM, Frontier coding)
    - If GROQ_API_KEY is configured: Groq Cloud LPU (qwen/qwen3.8-27b, 300 t/s)
    - Otherwise fallback to hardware-based local tiers.
    """
    gemini_active = bool(getattr(settings, "GEMINI_API_KEY", None))
    if gemini_active:
        return "⚡ Google Gemini Mode (1,000,000 Free TPM)", "gemini-3.5-flash"

    groq_active = bool(getattr(settings, "GROQ_API_KEY", None))
    if groq_active:
        return "⚡ Groq Cloud LPU Mode (Free 27B Fast Coder)", "qwen/qwen3.8-27b"

    vram = hardware["vram_gb"]
    ram = hardware["total_ram_gb"]
    has_metal = hardware["has_apple_metal"]

    if (vram >= 22.0) or (has_metal and ram >= 32.0):
        tier = "Tier 3: High-End Workstation (24GB+ VRAM / Unified Memory)"
        ideal_model = "qwen2.5-coder:32b"
    elif (vram >= 7.5) or (has_metal and ram >= 16.0):
        tier = "Tier 2: Mid-Range Dedicated GPU (8-16GB VRAM)"
        ideal_model = "qwen2.5-coder:14b"
    elif vram >= 1.5 and ram >= 16.0:
        tier = "Tier 1+: 2GB GPU + 32GB RAM Hybrid Mode"
        ideal_model = "qwen2.5-coder:3b"
    elif vram >= 1.5:
        tier = "Tier 1: 100% Dedicated GPU Mode (2GB VRAM)"
        ideal_model = "qwen2.5-coder:1.5b"
    else:
        tier = "Tier 1: Entry / CPU-only (<2GB VRAM)"
        ideal_model = "qwen2.5:1.5b"

    # Prefer the ideal model if available; fallback gracefully
    selected_model = ideal_model
    if available_models:
        if any(ideal_model in m for m in available_models):
            selected_model = ideal_model
        elif any("qwen2.5-coder:3b" in m for m in available_models):
            selected_model = "qwen2.5-coder:3b"
        elif any("qwen2.5-coder:1.5b" in m for m in available_models):
            selected_model = "qwen2.5-coder:1.5b"
        else:
            selected_model = available_models[0]

    return tier, selected_model


def get_hardware_profile(available_models: Optional[List[str]] = None, override_model: Optional[str] = None) -> HardwareProfile:
    """Builds a complete HardwareProfile model including local models, Gemini, and Groq options."""
    hw = detect_system_hardware()
    gemini_active = bool(getattr(settings, "GEMINI_API_KEY", None))
    groq_active = bool(getattr(settings, "GROQ_API_KEY", None))

    gemini_options = [
        "gemini-3.5-flash",
        "gemini-3.5-flash-lite",
        "gemini-2.5-flash"
    ]

    groq_options = [
        "qwen/qwen3.8-27b",
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b"
    ]

    base_models = available_models or []
    cloud_options = []
    if gemini_active:
        cloud_options.extend(gemini_options)
    if groq_active:
        cloud_options.extend(groq_options)

    # Inactive cloud options appended so user can see them
    if not gemini_active:
        cloud_options.extend(gemini_options)
    if not groq_active:
        cloud_options.extend(groq_options)

    # Merge: if gemini_active or groq_active, cloud options first, followed by local models
    if gemini_active or groq_active:
        merged_models = [m for m in cloud_options if m in (gemini_options if gemini_active else []) + (groq_options if groq_active else [])] + \
                        [m for m in base_models if m not in cloud_options] + \
                        [m for m in cloud_options if m not in (gemini_options if gemini_active else []) + (groq_options if groq_active else [])]
    else:
        merged_models = [m for m in base_models if m not in cloud_options] + cloud_options

    # Deduplicate while preserving order
    seen = set()
    deduped_models = []
    for m in merged_models:
        if m not in seen:
            seen.add(m)
            deduped_models.append(m)

    tier, recommended = compute_recommended_model(hw, deduped_models)

    chosen = override_model if (override_model and override_model != "auto") else recommended

    return HardwareProfile(
        os_name=hw["os_name"],
        cpu_name=hw["cpu_name"],
        cpu_cores=hw["cpu_cores"],
        cpu_threads=hw["cpu_threads"],
        total_ram_gb=hw["total_ram_gb"],
        gpu_name=hw["gpu_name"],
        vram_gb=hw["vram_gb"],
        has_cuda=hw["has_cuda"],
        has_apple_metal=hw["has_apple_metal"],
        recommended_tier=tier,
        recommended_model=recommended,
        available_ollama_models=deduped_models,
        selected_model=chosen,
        groq_configured=groq_active,
        gemini_configured=gemini_active
    )
