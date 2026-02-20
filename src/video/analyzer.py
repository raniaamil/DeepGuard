"""
Analyseur vidéo pour DeepGuard
Détection de deepfakes frame par frame
"""

import cv2
import numpy as np
from PIL import Image
import torch
from pathlib import Path
import logging
from typing import Dict, List, Optional, Tuple
import time
from facenet_pytorch import MTCNN

logger = logging.getLogger(__name__)


class VideoDeepfakeAnalyzer:
    """
    Analyseur de vidéos pour détection de deepfakes
    
    Processus :
    1. Extraction de frames échantillonnées
    2. Détection de visages (MTCNN)
    3. Prédiction sur chaque visage
    4. Agrégation des résultats
    """
    
    def __init__(self, deepfake_predictor, device='cpu'):
        """
        Args:
            deepfake_predictor: Instance de DeepfakeDetectorV3
            device: 'cpu' ou 'cuda'
        """
        self.predictor = deepfake_predictor
        self.device = torch.device(device)
        
        # MTCNN pour détection de visages
        self.face_detector = MTCNN(
            image_size=224,
            margin=20,
            min_face_size=40,
            thresholds=[0.6, 0.7, 0.7],
            factor=0.709,
            post_process=True,
            keep_all=False,  # Garder le visage le plus confiant
            device=self.device
        )
        
        logger.info(f"✅ VideoAnalyzer initialisé sur {self.device}")

    def extract_frames(self, video_path: str, max_frames: int = 30, sample_rate: int = 10) -> List[Tuple[np.ndarray, int]]:
        """
        Extrait des frames d'une vidéo
        
        Args:
            video_path: chemin vers la vidéo
            max_frames: nombre maximum de frames à extraire
            sample_rate: extraire 1 frame toutes les N frames
            
        Returns:
            Liste de (frame_array, frame_index)
        """
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            raise ValueError(f"Impossible d'ouvrir la vidéo : {video_path}")
        
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        duration = total_frames / fps if fps > 0 else 0
        
        logger.info(f"📹 Vidéo : {total_frames} frames, {fps:.1f} FPS, {duration:.1f}s")
        
        frames = []
        frame_idx = 0
        
        # Calculer les indices de frames à extraire
        if total_frames <= max_frames * sample_rate:
            # Vidéo courte : prendre toutes les N frames
            target_indices = list(range(0, total_frames, sample_rate))
        else:
            # Vidéo longue : échantillonner uniformément
            target_indices = np.linspace(0, total_frames - 1, max_frames, dtype=int)
        
        target_indices = target_indices[:max_frames]
        
        for target_idx in target_indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, target_idx)
            ret, frame = cap.read()
            
            if ret:
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                frames.append((frame_rgb, target_idx))
        
        cap.release()
        
        logger.info(f"✅ {len(frames)} frames extraites sur {total_frames}")
        return frames

    def detect_faces_in_frames(self, frames: List[Tuple[np.ndarray, int]]) -> List[Dict]:
        """
        Détecte les visages dans les frames
        
        Args:
            frames: liste de (frame_array, frame_index)
            
        Returns:
            Liste de résultats avec visages détectés
        """
        results = []
        
        for frame_rgb, frame_idx in frames:
            try:
                pil_img = Image.fromarray(frame_rgb)
                
                # Détection de visage avec MTCNN
                face_tensor = self.face_detector(pil_img)
                
                if face_tensor is not None:
                    # Convertir tensor vers PIL Image
                    face_array = face_tensor.permute(1, 2, 0).cpu().numpy()
                    face_array = (face_array * 255).astype(np.uint8)
                    face_pil = Image.fromarray(face_array)
                    
                    results.append({
                        'frame_index': frame_idx,
                        'face_detected': True,
                        'face_image': face_pil,
                        'original_frame': frame_rgb
                    })
                else:
                    results.append({
                        'frame_index': frame_idx,
                        'face_detected': False,
                        'face_image': None,
                        'original_frame': frame_rgb
                    })
                    
            except Exception as e:
                logger.warning(f"Erreur détection visage frame {frame_idx}: {e}")
                results.append({
                    'frame_index': frame_idx,
                    'face_detected': False,
                    'face_image': None,
                    'original_frame': frame_rgb,
                    'error': str(e)
                })
        
        faces_detected = sum(1 for r in results if r['face_detected'])
        logger.info(f"👤 Visages détectés : {faces_detected}/{len(results)} frames")
        
        return results

    def analyze_video(self, video_path: str, max_frames: int = 30, sample_rate: int = 10) -> Dict:
        """
        Analyse complète d'une vidéo
        
        Args:
            video_path: chemin vers la vidéo
            max_frames: nombre max de frames à analyser
            sample_rate: échantillonnage des frames
            
        Returns:
            Dict avec résultats d'analyse
        """
        start_time = time.time()
        
        logger.info(f"🎬 Analyse vidéo : {video_path}")
        
        try:
            # 1. Extraction de frames
            frames = self.extract_frames(video_path, max_frames, sample_rate)
            
            if not frames:
                return {
                    'success': False,
                    'error': 'Aucune frame extraite',
                    'video_path': video_path
                }
            
            # 2. Détection de visages
            face_results = self.detect_faces_in_frames(frames)
            
            # 3. Prédictions sur les visages
            predictions = []
            valid_faces = 0
            
            for result in face_results:
                if result['face_detected'] and result['face_image']:
                    try:
                        pred = self.predictor.predict(result['face_image'])
                        predictions.append({
                            'frame_index': result['frame_index'],
                            'prediction': pred,
                            'is_fake': pred['is_deepfake'],
                            'confidence': pred['confidence']
                        })
                        valid_faces += 1
                    except Exception as e:
                        logger.warning(f"Erreur prédiction frame {result['frame_index']}: {e}")
            
            if not predictions:
                return {
                    'success': False,
                    'error': 'Aucun visage analysable trouvé',
                    'video_path': video_path,
                    'frames_extracted': len(frames),
                    'faces_detected': sum(1 for r in face_results if r['face_detected'])
                }
            
            # 4. Agrégation des résultats
            fake_predictions = [p for p in predictions if p['is_fake']]
            real_predictions = [p for p in predictions if not p['is_fake']]
            
            fake_count = len(fake_predictions)
            real_count = len(real_predictions)
            total_predictions = len(predictions)
            
            # Décision finale : majorité pondérée par la confiance
            fake_confidence_sum = sum(p['confidence'] for p in fake_predictions)
            real_confidence_sum = sum(p['confidence'] for p in real_predictions)
            
            # Score global
            if fake_count > 0 and real_count > 0:
                # Pondération par confiance moyenne
                fake_weighted = fake_confidence_sum / fake_count if fake_count > 0 else 0
                real_weighted = real_confidence_sum / real_count if real_count > 0 else 0
                
                # Décision basée sur confiance pondérée + majorité
                fake_score = (fake_count / total_predictions) * fake_weighted
                real_score = (real_count / total_predictions) * real_weighted
                
                is_deepfake = fake_score > real_score
                confidence = max(fake_score, real_score)
            else:
                # Cas simple : toutes les prédictions vont dans le même sens
                is_deepfake = fake_count > real_count
                confidence = np.mean([p['confidence'] for p in predictions])
            
            processing_time = time.time() - start_time
            
            result = {
                'success': True,
                'video_path': video_path,
                'is_deepfake': bool(is_deepfake),
                'prediction': 'FAKE' if is_deepfake else 'REAL',
                'confidence': float(confidence),  # ← Conversion explicite
                'processing_time_seconds': float(processing_time),  # ← Conversion explicite
                'analysis_details': {
                    'frames_extracted': int(len(frames)),  # ← Conversion explicite
                    'faces_detected': int(sum(1 for r in face_results if r['face_detected'])),  # ← Conversion explicite
                    'faces_analyzed': int(total_predictions),  # ← Conversion explicite
                    'fake_predictions': int(fake_count),  # ← Conversion explicite
                    'real_predictions': int(real_count),  # ← Conversion explicite
                    'fake_percentage': float((fake_count / total_predictions) * 100) if total_predictions > 0 else 0.0,  # ← Conversion explicite
                    'avg_confidence': float(np.mean([p['confidence'] for p in predictions]))  # ← Conversion explicite
                },
                'frame_predictions': [
                    {
                        'frame_index': int(p['frame_index']),  # ← Conversion explicite
                        'is_fake': bool(p['is_fake']),  # ← Conversion explicite
                        'confidence': float(p['confidence'])  # ← Conversion explicite
                    }
                    for p in predictions[:10]  # Garder max 10 détails pour l'API
                ]
            }
            
            logger.info(f"✅ Analyse terminée : {result['prediction']} ({float(confidence)*100:.1f}%)")
            logger.info(f"   {total_predictions} faces analysées en {processing_time:.1f}s")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Erreur analyse vidéo : {e}")
            return {
                'success': False,
                'error': str(e),
                'video_path': str(video_path),  # ← Conversion explicite
                'processing_time_seconds': float(time.time() - start_time)  # ← Conversion explicite
            }

def create_video_analyzer(predictor, device='cpu') -> VideoDeepfakeAnalyzer:
    """
    Factory function pour créer un analyseur vidéo
    
    Args:
        predictor: Instance de DeepfakeDetectorV3
        device: 'cpu' ou 'cuda'
        
    Returns:
        Instance de VideoDeepfakeAnalyzer
    """
    return VideoDeepfakeAnalyzer(predictor, device)