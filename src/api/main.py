"""
FastAPI API for DeepGuard - IMPROVED VERSION
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io
import time
from pathlib import Path
from typing import List
import psutil
import os
import tempfile

from .inference_v3 import get_predictor
from .utils import (
    validate_image_file,
    validate_image_content,
    validate_image_dimensions,
)

from .logger import logger

# Import video module
import sys
sys.path.append(str(Path(__file__).parent.parent))
from video.analyzer import create_video_analyzer

import httpx


# Create FastAPI app
app = FastAPI(
    title="DeepGuard API",
    description="Deepfake detection API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class APIStats:
    def __init__(self):
        self.total_predictions = 0
        self.total_errors = 0
        self.total_real = 0
        self.total_fake = 0
        self.start_time = time.time()

    def record_prediction(self, is_fake: bool):
        self.total_predictions += 1
        if is_fake:
            self.total_fake += 1
        else:
            self.total_real += 1

    def record_error(self):
        self.total_errors += 1

    def get_stats(self) -> dict:
        uptime = time.time() - self.start_time
        return {
            "total_predictions": self.total_predictions,
            "total_real": self.total_real,
            "total_fake": self.total_fake,
            "total_errors": self.total_errors,
            "uptime_seconds": round(uptime, 2),
            "uptime_hours": round(uptime / 3600, 2)
        }

stats = APIStats()


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    logger.info(f"Request: {request.method} {request.url.path}")
    response = await call_next(request)
    process_time = time.time() - start_time
    logger.info(f"Response: {response.status_code} - Time: {process_time:.3f}s")
    return response


@app.on_event("startup")
async def startup_event():
    logger.info("Starting DeepGuard API v3...")

    model_path = Path(__file__).parent.parent.parent / 'models' / 'best_convnext_deepguard_v3.pth'

    if not model_path.exists():
        logger.error(f"Model not found: {model_path}")
        raise FileNotFoundError(f"ConvNeXt model not found: {model_path}")

    logger.info(f"Loading ConvNeXt-Base from: {model_path}")
    get_predictor(model_path=str(model_path), device='cpu')

    logger.info("DeepGuard API v3 ready!")


@app.get("/health")
async def health_check():
    from .inference_v3 import _predictor

    process = psutil.Process(os.getpid())
    memory_info = process.memory_info()

    return {
        "status": "healthy",
        "model_loaded": _predictor is not None,
        "system": {
            "memory_mb": round(memory_info.rss / 1024 / 1024, 2),
            "cpu_percent": psutil.cpu_percent(interval=0.1)
        },
        "timestamp": time.time()
    }


@app.post("/predict")
async def predict_deepfake(file: UploadFile = File(...)):
    logger.info(f"New image prediction: {file.filename}")

    try:
        validate_image_file(file.filename, file.content_type)

        contents = await file.read()
        image = validate_image_content(contents)
        validate_image_dimensions(image)

        predictor = get_predictor()
        start_time = time.time()
        result = predictor.predict(image)
        processing_time = time.time() - start_time

        result['processing_time_ms'] = round(processing_time * 1000, 2)
        result['filename'] = file.filename
        result['image_size'] = list(image.size)
        result['file_size_kb'] = round(len(contents) / 1024, 2)

        stats.record_prediction(result['is_deepfake'])
        return JSONResponse(content=result)

    except HTTPException as e:
        stats.record_error()
        raise e
    except Exception as e:
        stats.record_error()
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")


# ═══════════════════════════════════════════════════════════════════
# VIDEO ENDPOINT (FILE UPLOAD)
# ═══════════════════════════════════════════════════════════════════

def _ext_from_video_content_type(ct: str) -> str:
    ct = (ct or '').lower()
    mapping = {
        'video/mp4': '.mp4',
        'video/webm': '.webm',
        'video/ogg': '.ogg',
        'video/quicktime': '.mov',
        'video/x-msvideo': '.avi',
        'video/x-matroska': '.mkv'
    }
    return mapping.get(ct, '')


@app.post("/predict/video")
async def predict_video(file: UploadFile = File(...)):
    logger.info(f"New video file analysis: {file.filename}")

    video_extensions = {'.mp4', '.avi', '.mov', '.mkv', '.webm', '.ogg'}
    file_ext = Path(file.filename).suffix.lower()

    if file_ext not in video_extensions:
        guessed_ext = _ext_from_video_content_type(file.content_type)
        if guessed_ext and guessed_ext in video_extensions:
            file_ext = guessed_ext
            logger.warning(f"Video extension inferred from content-type: {file.content_type} -> {file_ext}")
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported video format: {file_ext or '(no extension)'} / content-type={file.content_type}. "
                       f"Accepted formats: {', '.join(sorted(video_extensions))}"
            )

    content = await file.read()
    file_size_mb = len(content) / (1024 * 1024)

    if file_size_mb > 50:
        raise HTTPException(status_code=400, detail=f"File too large: {file_size_mb:.1f}MB. Maximum: 50MB")

    temp_dir = tempfile.mkdtemp()
    temp_video_path = Path(temp_dir) / f"video_{int(time.time())}{file_ext}"

    try:
        with open(temp_video_path, 'wb') as f:
            f.write(content)

        predictor = get_predictor()
        video_analyzer = create_video_analyzer(predictor, device='cpu')

        result = video_analyzer.analyze_video(
            video_path=str(temp_video_path),
            max_frames=20,
            sample_rate=15
        )

        result['filename'] = file.filename
        result['file_size_mb'] = round(file_size_mb, 2)
        result['model_version'] = 'ConvNeXt-Base v3'

        if result.get('success', True):
            stats.record_prediction(result['is_deepfake'])
        else:
            stats.record_error()

        return JSONResponse(content=result)

    except Exception as e:
        stats.record_error()
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")

    finally:
        try:
            if temp_video_path.exists():
                temp_video_path.unlink()
            os.rmdir(temp_dir)
        except Exception as e:
            logger.warning(f"Cleanup error: {e}")


# ═══════════════════════════════════════════════════════════════════
# VIDEO ENDPOINT (URL)
# ═══════════════════════════════════════════════════════════════════

@app.post("/predict/video/url")
async def predict_video_from_url(payload: dict):
    """
    Downloads the video server-side (no CORS), then analyzes it.
    Body: { "url": "https://....mp4" }
    """
    url = (payload or {}).get("url")
    if not url or not isinstance(url, str):
        raise HTTPException(status_code=400, detail="Missing or invalid 'url' field.")

    logger.info(f"Video analysis from URL: {url}")

    video_extensions = {'.mp4', '.avi', '.mov', '.mkv', '.webm', '.ogg'}
    path_ext = Path(url.split('?')[0]).suffix.lower()

    max_size_bytes = 50 * 1024 * 1024
    timeout = httpx.Timeout(connect=15.0, read=60.0, write=60.0, pool=15.0)

    temp_dir = tempfile.mkdtemp()
    temp_video_path = None

    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            async with client.stream("GET", url, headers={"User-Agent": "DeepGuard/1.0"}) as resp:
                if resp.status_code >= 400:
                    raise HTTPException(status_code=400, detail=f"Unable to download video (HTTP {resp.status_code}).")

                content_type = (resp.headers.get("content-type") or "").lower()
                file_ext = path_ext if path_ext in video_extensions else _ext_from_video_content_type(content_type)

                if file_ext not in video_extensions:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Unsupported URL. Extension={path_ext or '(none)'} / content-type={content_type or '(unknown)'}."
                    )

                temp_video_path = Path(temp_dir) / f"video_url_{int(time.time())}{file_ext}"

                size = 0
                with open(temp_video_path, "wb") as f:
                    async for chunk in resp.aiter_bytes(chunk_size=1024 * 1024):
                        if not chunk:
                            continue
                        size += len(chunk)
                        if size > max_size_bytes:
                            raise HTTPException(status_code=400, detail="Video too large (>50MB).")
                        f.write(chunk)

        file_size_mb = size / (1024 * 1024)
        logger.info(f"Video downloaded from URL: {temp_video_path} ({file_size_mb:.2f}MB)")

        predictor = get_predictor()
        video_analyzer = create_video_analyzer(predictor, device='cpu')

        result = video_analyzer.analyze_video(
            video_path=str(temp_video_path),
            max_frames=20,
            sample_rate=15
        )

        result['filename'] = Path(url.split('?')[0]).name or "video_from_url"
        result['source_url'] = url
        result['file_size_mb'] = round(file_size_mb, 2)
        result['model_version'] = 'ConvNeXt-Base v3'

        if result.get('success', True):
            stats.record_prediction(result['is_deepfake'])
        else:
            stats.record_error()

        return JSONResponse(content=result)

    except HTTPException:
        stats.record_error()
        raise
    except Exception as e:
        stats.record_error()
        raise HTTPException(status_code=500, detail=f"Download/analysis error: {str(e)}")
    finally:
        try:
            if temp_video_path and temp_video_path.exists():
                temp_video_path.unlink()
            os.rmdir(temp_dir)
        except Exception as e:
            logger.warning(f"URL video cleanup error: {e}")


@app.get("/video/info")
async def video_info():
    return {
        "video_analysis": {
            "supported_formats": [".mp4", ".avi", ".mov", ".mkv", ".webm", ".ogg"],
            "max_file_size_mb": 50,
            "max_frames_analyzed": 20,
            "sample_rate": "1 frame every 15 frames"
        }
    }