"""
DeepGuard API - Hugging Face Spaces
"""

import os
from pathlib import Path
import urllib.request

# Télécharger le modèle si absent
MODEL_PATH = Path("models/best_convnext_deepguard_v3.pth")
MODEL_URL = "https://huggingface.co/raniaamil/deepguard-convnext/resolve/main/best_convnext_deepguard_v3.pth"

if not MODEL_PATH.exists():
    print("📥 Downloading model from Hugging Face...")
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
    print(f"✅ Model downloaded: {MODEL_PATH.stat().st_size / (1024*1024):.1f} MB")

# Lancer l'API FastAPI
import uvicorn
from src.api.main import app

if __name__ == "__main__":
    print("🚀 Starting DeepGuard API on port 7860...")
    uvicorn.run(app, host="0.0.0.0", port=7860)