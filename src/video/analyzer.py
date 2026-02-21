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
    Video analyzer for deepfake detection
    
    Process:
    1. Extract sampled frames
    2. Face detection (MTCNN)
    3. Prediction on each face
    4. Aggregate results
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
            keep_all=False,
            device=self.device
        )
        
        logger.info(f"VideoAnalyzer initialized on {self.device}")

    def extract_frames(self, video_path: str, max_frames: int = 30, sample_rate: int = 10) -> List[Tuple[np.ndarray, int]]:
        """
        Extract frames from a video
        
        Args:
            video_path: chemin vers la vidéo
            max_frames: nombre maximum de frames à extraire
            sample_rate: extraire 1 frame toutes les N frames
            
        Returns:
            List of (frame_array, frame_index)
        """
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            raise ValueError(f"Unable to open video: {video_path}")
        
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        duration = total_frames / fps if fps > 0 else 0
        
        logger.info(f"Video: {total_frames} frames, {fps:.1f} FPS, {duration:.1f}s")
        
        frames = []
        
        if total_frames <= max_frames * sample_rate:
            target_indices = list(range(0, total_frames, sample_rate))
        else:
            target_indices = np.linspace(0, total_frames - 1, max_frames, dtype=int)
        
        target_indices = target_indices[:max_frames]
        
        for target_idx in target_indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, target_idx)
            ret, frame = cap.read()
            
            if ret:
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                frames.append((frame_rgb, target_idx))
        
        cap.release()
        
        logger.info(f"{len(frames)} frames extracted out of {total_frames}")
        return frames

    def detect_faces_in_frames(self, frames: List[Tuple[np.ndarray, int]]) -> List[Dict]:
        """
        Detect faces in frames
        
        Args:
            frames: liste de (frame_array, frame_index)
            
        Returns:
            List of detection results
        """
        results = []
        
        for frame_rgb, frame_idx in frames:
            try:
                pil_img = Image.fromarray(frame_rgb)
                
                face_tensor = self.face_detector(pil_img)
                
                if face_tensor is not None:
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
                logger.warning(f"Face detection error on frame {frame_idx}: {e}")
                results.append({
                    'frame_index': frame_idx,
                    'face_detected': False,
                    'face_image': None,
                    'original_frame': frame_rgb,
                    'error': str(e)
                })
        
        faces_detected = sum(1 for r in results if r['face_detected'])
        logger.info(f"Faces detected: {faces_detected}/{len(results)} frames")
        
        return results

    def analyze_video(self, video_path: str, max_frames: int = 30, sample_rate: int = 10) -> Dict:
        """
        Full video analysis
        
        Args:
            video_path: chemin vers la vidéo
            max_frames: nombre max de frames à analyser
            sample_rate: échantillonnage des frames
            
        Returns:
            Dict with analysis results
        """
        start_time = time.time()
        
        logger.info(f"Video analysis: {video_path}")
        
        try:
            frames = self.extract_frames(video_path, max_frames, sample_rate)
            
            if not frames:
                return {
                    'success': False,
                    'error': 'No frames extracted',
                    'video_path': video_path
                }
            
            face_results = self.detect_faces_in_frames(frames)
            
            predictions = []
            
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
                    except Exception as e:
                        logger.warning(f"Prediction error on frame {result['frame_index']}: {e}")
            
            if not predictions:
                return {
                    'success': False,
                    'error': 'No analyzable faces found',
                    'video_path': video_path,
                    'frames_extracted': len(frames),
                    'faces_detected': sum(1 for r in face_results if r['face_detected'])
                }
            
            fake_predictions = [p for p in predictions if p['is_fake']]
            real_predictions = [p for p in predictions if not p['is_fake']]
            
            fake_count = len(fake_predictions)
            real_count = len(real_predictions)
            total_predictions = len(predictions)
            
            fake_confidence_sum = sum(p['confidence'] for p in fake_predictions)
            real_confidence_sum = sum(p['confidence'] for p in real_predictions)
            
            if fake_count > 0 and real_count > 0:
                fake_weighted = fake_confidence_sum / fake_count if fake_count > 0 else 0
                real_weighted = real_confidence_sum / real_count if real_count > 0 else 0
                
                fake_score = (fake_count / total_predictions) * fake_weighted
                real_score = (real_count / total_predictions) * real_weighted
                
                is_deepfake = fake_score > real_score
                confidence = max(fake_score, real_score)
            else:
                is_deepfake = fake_count > real_count
                confidence = np.mean([p['confidence'] for p in predictions])
            
            processing_time = time.time() - start_time
            
            result = {
                'success': True,
                'video_path': video_path,
                'is_deepfake': bool(is_deepfake),
                'prediction': 'FAKE' if is_deepfake else 'REAL',
                'confidence': float(confidence),
                'processing_time_seconds': float(processing_time),
            }
            
            logger.info(f"Analysis completed: {result['prediction']} ({float(confidence)*100:.1f}%)")
            logger.info(f"{total_predictions} faces analyzed in {processing_time:.1f}s")
            
            return result
            
        except Exception as e:
            logger.error(f"Video analysis error: {e}")
            return {
                'success': False,
                'error': str(e),
                'video_path': str(video_path),
                'processing_time_seconds': float(time.time() - start_time)
            }


def create_video_analyzer(predictor, device='cpu') -> VideoDeepfakeAnalyzer:
    """
    Factory function to create a video analyzer
    
    Args:
        predictor: Instance de DeepfakeDetectorV3
        device: 'cpu' ou 'cuda'
        
    Returns:
        Instance of VideoDeepfakeAnalyzer
    """
    return VideoDeepfakeAnalyzer(predictor, device)