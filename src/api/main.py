"""
API FastAPI pour DeepGuard - VERSION AMÉLIORÉE
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

from .inference_v3 import get_predictor
from .utils import (
    validate_image_file, 
    validate_image_content, 
    validate_image_dimensions,
    format_error_response
)
from .logger import logger

# Ajouts pour support vidéo
import tempfile
import os
from pathlib import Path

# Import du module vidéo
import sys
sys.path.append(str(Path(__file__).parent.parent))
from video.analyzer import create_video_analyzer

# Créer l'app FastAPI
app = FastAPI(
    title="DeepGuard API",
    description="API de détection de deepfakes en temps réel utilisant EfficientNet-B0",
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
    logger.info(" Démarrage de DeepGuard API v3...")
    
    model_path = Path(__file__).parent.parent.parent / 'models' / 'best_convnext_deepguard_v3.pth'
    
    if not model_path.exists():
        logger.error(f" Modèle non trouvé : {model_path}")
        raise FileNotFoundError(f"Modèle ConvNeXt non trouvé : {model_path}")
    
    logger.info(f" Chargement ConvNeXt-Base depuis : {model_path}")
    get_predictor(model_path=str(model_path), device='cpu')
    
    logger.info(" DeepGuard API v3 prête !")
    logger.info(" Modèle : ConvNeXt-Base (98.05% accuracy)")


@app.get("/")
async def root():
    return {
        "name": "DeepGuard API",
        "version": "1.0.0",
        "description": "API de détection de deepfakes en temps réel",
        "model": {
            "architecture": "EfficientNet-B0",
            "accuracy": "94-98%",
            "dataset": "FaceForensics++"
        },
        "endpoints": {
            "docs": "/docs",
            "health": "/health",
            "metrics": "/metrics",
            "predict": "/predict",
            "predict_batch": "/predict/batch",
            "info": "/info"
        },
        "status": "operational"
    }


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


@app.get("/metrics")
async def get_metrics():
    return {
        "statistics": stats.get_stats(),
        "model": {
            "architecture": "EfficientNet-B0",
            "accuracy": "94.67%",
            "precision": "94.81%",
            "recall": "93.43%",
            "f1_score": "94.12%",
            "auc_roc": "0.9924"
        }
    }


@app.get("/info")
async def model_info():
    return {
        "model": {
            "version": "v3",
            "architecture": "ConvNeXt-Base",
            "framework": "PyTorch + timm",
            "input_size": "224x224",
            "parameters": "89M",
            "dataset": "FaceForensics++ (4 methods) + Celeb-DF",
            "training_images": "28,772 faces",
            "performance": {
                "test_accuracy": 98.05,
                "test_precision": 98.21,
                "test_recall": 98.84,
                "test_f1": 98.52,
                "auc_roc": 0.9928
            }
        },
        "preprocessing": {
            "resize": "224x224",
            "normalization": "ImageNet (mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])",
            "augmentation": "None (inference mode)"
        },
        "supported_formats": [".jpg", ".jpeg", ".png", ".bmp", ".webp"],
        "max_file_size_mb": 10
    }


@app.post("/predict")
async def predict_deepfake(file: UploadFile = File(...)):
    logger.info(f" Nouvelle prédiction : {file.filename}")
    
    try:
        # Validation du fichier (maintenant tolérante si pas d'extension)
        validate_image_file(file.filename, file.content_type)

        contents = await file.read()
        image = validate_image_content(contents)
        validate_image_dimensions(image)
        
        logger.info(f" Image validée : {image.size[0]}x{image.size[1]}")
        
        start_time = time.time()
        predictor = get_predictor()
        result = predictor.predict(image)
        
        processing_time = time.time() - start_time
        
        result['processing_time_ms'] = round(processing_time * 1000, 2)
        result['filename'] = file.filename
        result['image_size'] = list(image.size)
        result['file_size_kb'] = round(len(contents) / 1024, 2)
        
        stats.record_prediction(result['is_deepfake'])
        
        logger.info(f" Prédiction : {result['prediction']} (confidence: {result['confidence']:.2%})")
        return JSONResponse(content=result)
    
    except HTTPException as e:
        stats.record_error()
        logger.error(f" Erreur validation : {e.detail}")
        raise e
    
    except Exception as e:
        stats.record_error()
        logger.error(f" Erreur inattendue : {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors du traitement : {str(e)}"
        )


@app.post("/predict/batch")
async def predict_batch(files: List[UploadFile] = File(...)):
    logger.info(f"📥 Prédiction batch : {len(files)} images")
    
    if len(files) > 10:
        raise HTTPException(
            status_code=400,
            detail="Maximum 10 images par batch"
        )
    
    results = []
    errors = []
    
    for idx, file in enumerate(files):
        try:
            validate_image_file(file.filename, file.content_type)
            contents = await file.read()
            image = validate_image_content(contents)
            validate_image_dimensions(image)
            
            predictor = get_predictor()
            result = predictor.predict(image)
            
            result['filename'] = file.filename
            result['index'] = idx
            
            results.append(result)
            stats.record_prediction(result['is_deepfake'])
            
        except Exception as e:
            logger.error(f" Erreur sur {file.filename}: {str(e)}")
            errors.append({
                "filename": file.filename,
                "index": idx,
                "error": str(e)
            })
            stats.record_error()
    
    logger.info(f"✅ Batch terminé : {len(results)} succès, {len(errors)} erreurs")
    
    return {
        "total": len(files),
        "success": len(results),
        "errors": len(errors),
        "results": results,
        "error_details": errors if errors else None
    }


# ═══════════════════════════════════════════════════════════════════
# ENDPOINT VIDÉO - NOUVEAU
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
    logger.info(f" Nouvelle analyse vidéo : {file.filename}")
    
    video_extensions = {'.mp4', '.avi', '.mov', '.mkv', '.webm', '.ogg'}
    file_ext = Path(file.filename).suffix.lower()

    # ✅ Si extension absente / invalide, on tente de déduire depuis content_type
    if file_ext not in video_extensions:
        guessed_ext = _ext_from_video_content_type(file.content_type)
        if guessed_ext and guessed_ext in video_extensions:
            file_ext = guessed_ext
            logger.warning(f"⚠️ Extension vidéo déduite depuis content-type: {file.content_type} -> {file_ext}")
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Format vidéo non supporté: {file_ext or '(sans extension)'} / content-type={file.content_type}. "
                       f"Formats acceptés: {', '.join(sorted(video_extensions))}"
            )
    
    content = await file.read()
    file_size_mb = len(content) / (1024 * 1024)
    
    if file_size_mb > 50:
        raise HTTPException(
            status_code=400,
            detail=f"Fichier trop volumineux: {file_size_mb:.1f}MB. Maximum: 50MB"
        )
    
    temp_dir = tempfile.mkdtemp()
    temp_video_path = Path(temp_dir) / f"video_{int(time.time())}{file_ext}"
    
    try:
        with open(temp_video_path, 'wb') as f:
            f.write(content)
        
        logger.info(f" Vidéo sauvegardée temporairement : {temp_video_path}")
        logger.info(f" Taille : {file_size_mb:.1f}MB")
        
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
        
        if result['success']:
            stats.record_prediction(result['is_deepfake'])
            logger.info(f" Vidéo analysée : {result['prediction']} ({result['confidence']*100:.1f}%)")
        else:
            stats.record_error()
            logger.error(f" Échec analyse : {result.get('error', 'Unknown')}")
        
        return JSONResponse(content=result)
        
    except Exception as e:
        stats.record_error()
        logger.error(f" Erreur analyse vidéo : {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de l'analyse : {str(e)}"
        )
        
    finally:
        try:
            if temp_video_path.exists():
                temp_video_path.unlink()
            os.rmdir(temp_dir)
        except Exception as e:
            logger.warning(f" Erreur nettoyage : {e}")


@app.get("/video/info")
async def video_info():
    return {
        "video_analysis": {
            "supported_formats": [".mp4", ".avi", ".mov", ".mkv", ".webm"],
            "max_file_size_mb": 50,
            "max_frames_analyzed": 20,
            "sample_rate": "1 frame every 15 frames",
            "face_detection": "MTCNN",
            "aggregation_method": "Confidence-weighted majority vote"
        },
        "process": {
            "1": "Extract sample frames from video",
            "2": "Detect faces in each frame (MTCNN)",
            "3": "Predict deepfake on each face (ConvNeXt-Base)",
            "4": "Aggregate results with confidence weighting",
            "5": "Return final prediction + details"
        },
        "performance": {
            "typical_processing_time": "10-30 seconds per video",
            "model_accuracy": "98.05% (on images)",
            "face_detection_rate": "~85-95%"
        }
    }

from .inference_v3 import _predictor

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")