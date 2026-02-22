"""
Analyseur vidéo enrichi pour DeepGuard
Avec timeline des scores par frame et frames suspectes
"""

import cv2
import numpy as np
from PIL import Image
import torch
from pathlib import Path
import logging
from typing import Dict, List, Optional, Tuple
import time
import base64
import io
from facenet_pytorch import MTCNN

logger = logging.getLogger(__name__)


class EnhancedVideoAnalyzer:
    """
    Analyseur vidéo enrichi avec:
    - Timeline des scores par frame
    - Extraction des frames les plus suspectes
    - Métriques détaillées
    - Visualisations
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
        
        logger.info(f"EnhancedVideoAnalyzer initialized on {self.device}")

    def _image_to_base64(self, image: Image.Image, max_size: int = 300) -> str:
        """Convertit une image PIL en base64 avec redimensionnement"""
        # Redimensionner pour limiter la taille
        ratio = min(max_size / image.width, max_size / image.height)
        if ratio < 1:
            new_size = (int(image.width * ratio), int(image.height * ratio))
            image = image.resize(new_size, Image.LANCZOS)
        
        buffer = io.BytesIO()
        image.save(buffer, format='JPEG', quality=85)
        return base64.b64encode(buffer.getvalue()).decode('utf-8')

    def extract_frames_enhanced(
        self, 
        video_path: str, 
        max_frames: int = 30, 
        sample_rate: int = 10
    ) -> Tuple[List[Dict], Dict]:
        """
        Extrait les frames avec métadonnées enrichies
        
        Returns:
            (frames_data, video_metadata)
        """
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            raise ValueError(f"Unable to open video: {video_path}")
        
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        duration = total_frames / fps if fps > 0 else 0
        
        video_metadata = {
            'total_frames': total_frames,
            'fps': round(fps, 2),
            'duration_seconds': round(duration, 2),
            'resolution': f"{width}x{height}",
            'width': width,
            'height': height
        }
        
        logger.info(f"Video: {total_frames} frames, {fps:.1f} FPS, {duration:.1f}s")
        
        frames_data = []
        
        # Calculer les indices à extraire
        if total_frames <= max_frames * sample_rate:
            target_indices = list(range(0, total_frames, sample_rate))
        else:
            target_indices = np.linspace(0, total_frames - 1, max_frames, dtype=int)
        
        target_indices = target_indices[:max_frames]
        
        for i, target_idx in enumerate(target_indices):
            cap.set(cv2.CAP_PROP_POS_FRAMES, target_idx)
            ret, frame = cap.read()
            
            if ret:
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                timestamp = target_idx / fps if fps > 0 else 0
                
                frames_data.append({
                    'frame_index': int(target_idx),
                    'sequence_index': i,
                    'timestamp_seconds': round(timestamp, 2),
                    'timestamp_formatted': self._format_timestamp(timestamp),
                    'frame_rgb': frame_rgb
                })
        
        cap.release()
        
        logger.info(f"{len(frames_data)} frames extracted")
        return frames_data, video_metadata

    def _format_timestamp(self, seconds: float) -> str:
        """Formate un timestamp en MM:SS"""
        minutes = int(seconds // 60)
        secs = int(seconds % 60)
        return f"{minutes:02d}:{secs:02d}"

    def analyze_video_enhanced(
        self, 
        video_path: str, 
        max_frames: int = 30, 
        sample_rate: int = 10,
        include_thumbnails: bool = True
    ) -> Dict:
        """
        Analyse vidéo complète avec métriques enrichies
        
        Args:
            video_path: Chemin vers la vidéo
            max_frames: Nombre max de frames
            sample_rate: Échantillonnage
            include_thumbnails: Inclure les miniatures base64
            
        Returns:
            Dict avec résultats détaillés
        """
        start_time = time.time()
        
        logger.info(f"Enhanced video analysis: {video_path}")
        
        try:
            # Extraction des frames
            frames_data, video_metadata = self.extract_frames_enhanced(
                video_path, max_frames, sample_rate
            )
            
            if not frames_data:
                return {
                    'success': False,
                    'error': 'No frames extracted',
                    'video_path': video_path,
                    'video_metadata': video_metadata
                }
            
            # Analyse frame par frame
            timeline_data = []
            suspicious_frames = []
            all_predictions = []
            
            for frame_info in frames_data:
                frame_rgb = frame_info['frame_rgb']
                
                try:
                    # Détection de visage
                    pil_img = Image.fromarray(frame_rgb)
                    face_tensor = self.face_detector(pil_img)
                    
                    if face_tensor is not None:
                        # Convertir le visage détecté
                        face_array = face_tensor.permute(1, 2, 0).cpu().numpy()
                        face_array = (face_array * 255).astype(np.uint8)
                        face_pil = Image.fromarray(face_array)
                        
                        # Prédiction
                        pred = self.predictor.predict(face_pil)
                        
                        frame_result = {
                            'frame_index': frame_info['frame_index'],
                            'sequence_index': frame_info['sequence_index'],
                            'timestamp_seconds': frame_info['timestamp_seconds'],
                            'timestamp_formatted': frame_info['timestamp_formatted'],
                            'face_detected': True,
                            'is_fake': pred['is_deepfake'],
                            'prediction': pred['prediction'],
                            'confidence': pred['confidence'],
                            'prob_real': pred['probabilities']['real'],
                            'prob_fake': pred['probabilities']['fake']
                        }
                        
                        # Ajouter miniature si demandé
                        if include_thumbnails:
                            frame_result['thumbnail_base64'] = self._image_to_base64(
                                pil_img, max_size=200
                            )
                        
                        timeline_data.append(frame_result)
                        all_predictions.append(pred)
                        
                        # Collecter les frames suspectes (fake avec haute confiance)
                        if pred['is_deepfake'] and pred['confidence'] > 0.7:
                            suspicious_frames.append({
                                **frame_result,
                                'thumbnail_base64': self._image_to_base64(pil_img, max_size=300)
                            })
                    else:
                        timeline_data.append({
                            'frame_index': frame_info['frame_index'],
                            'sequence_index': frame_info['sequence_index'],
                            'timestamp_seconds': frame_info['timestamp_seconds'],
                            'timestamp_formatted': frame_info['timestamp_formatted'],
                            'face_detected': False,
                            'is_fake': None,
                            'prediction': 'NO_FACE',
                            'confidence': 0,
                            'prob_real': 0,
                            'prob_fake': 0
                        })
                        
                except Exception as e:
                    logger.warning(f"Error on frame {frame_info['frame_index']}: {e}")
                    timeline_data.append({
                        'frame_index': frame_info['frame_index'],
                        'sequence_index': frame_info['sequence_index'],
                        'timestamp_seconds': frame_info['timestamp_seconds'],
                        'timestamp_formatted': frame_info['timestamp_formatted'],
                        'face_detected': False,
                        'error': str(e)
                    })
            
            # Calculer les statistiques
            valid_predictions = [t for t in timeline_data if t.get('face_detected')]
            
            if not valid_predictions:
                return {
                    'success': False,
                    'error': 'No faces detected in video',
                    'video_path': video_path,
                    'video_metadata': video_metadata,
                    'frames_analyzed': len(frames_data),
                    'faces_detected': 0
                }
            
            # Agrégation des résultats
            fake_count = sum(1 for p in valid_predictions if p['is_fake'])
            real_count = len(valid_predictions) - fake_count
            
            # Calcul pondéré
            fake_confidences = [p['confidence'] for p in valid_predictions if p['is_fake']]
            real_confidences = [p['confidence'] for p in valid_predictions if not p['is_fake']]
            
            if fake_count > 0 and real_count > 0:
                fake_weighted = np.mean(fake_confidences) * (fake_count / len(valid_predictions))
                real_weighted = np.mean(real_confidences) * (real_count / len(valid_predictions))
                is_deepfake = fake_weighted > real_weighted
                confidence = max(fake_weighted, real_weighted)
            else:
                is_deepfake = fake_count > real_count
                all_confidences = [p['confidence'] for p in valid_predictions]
                confidence = np.mean(all_confidences)
            
            # Trier les frames suspectes par confiance
            suspicious_frames.sort(key=lambda x: x['confidence'], reverse=True)
            top_suspicious = suspicious_frames[:5]  # Top 5
            
            processing_time = time.time() - start_time
            
            # Construire le résultat final
            result = {
                'success': True,
                'video_path': video_path,
                
                # Résultat principal
                'is_deepfake': bool(is_deepfake),
                'prediction': 'FAKE' if is_deepfake else 'REAL',
                'confidence': float(confidence),
                
                # Métadonnées vidéo
                'video_metadata': video_metadata,
                
                # Statistiques d'analyse
                'analysis_stats': {
                    'frames_extracted': len(frames_data),
                    'frames_with_faces': len(valid_predictions),
                    'frames_predicted_fake': fake_count,
                    'frames_predicted_real': real_count,
                    'fake_percentage': round(fake_count / len(valid_predictions) * 100, 1),
                    'average_fake_confidence': round(np.mean(fake_confidences), 3) if fake_confidences else 0,
                    'average_real_confidence': round(np.mean(real_confidences), 3) if real_confidences else 0,
                    'processing_time_seconds': round(processing_time, 2)
                },
                
                # Timeline pour graphique
                'timeline': timeline_data,
                
                # Frames les plus suspectes
                'suspicious_frames': top_suspicious,
                
                # Interprétation
                'interpretation': self._generate_interpretation(
                    is_deepfake, 
                    confidence, 
                    fake_count, 
                    real_count,
                    timeline_data
                ),
                
                # Infos modèle
                'model_version': 'ConvNeXt-Base v3',
                'model_accuracy': '98.05%'
            }
            
            logger.info(f"Analysis complete: {result['prediction']} ({confidence*100:.1f}%)")
            
            return result
            
        except Exception as e:
            logger.error(f"Enhanced video analysis error: {e}")
            return {
                'success': False,
                'error': str(e),
                'video_path': str(video_path),
                'processing_time_seconds': float(time.time() - start_time)
            }

    def _generate_interpretation(
        self, 
        is_deepfake: bool, 
        confidence: float,
        fake_count: int,
        real_count: int,
        timeline: List[Dict]
    ) -> Dict:
        """Génère une interprétation détaillée des résultats vidéo"""
        
        total = fake_count + real_count
        
        # Analyser la distribution temporelle
        temporal_analysis = self._analyze_temporal_distribution(timeline)
        
        # Points clés
        key_points = []
        
        if is_deepfake:
            if fake_count / total > 0.8:
                key_points.append("Consistent manipulation detected throughout the entire video.")
            elif fake_count / total > 0.5:
                key_points.append("Manipulation detected in the majority of analyzed frames.")
            else:
                key_points.append("Signs of manipulation detected in certain portions of the video.")
            
            if temporal_analysis['has_suspicious_segments']:
                key_points.append(f"Suspicious segments identified: {temporal_analysis['suspicious_segments_count']}")
        else:
            if real_count / total > 0.9:
                key_points.append("No signs of manipulation detected.")
            else:
                key_points.append("The video appears authentic despite a few ambiguous frames.")
        
        # Confidence level
        if confidence >= 0.9:
            confidence_level = "Very high confidence"
            confidence_color = "#10B981"
        elif confidence >= 0.75:
            confidence_level = "High confidence"
            confidence_color = "#34D399"
        elif confidence >= 0.6:
            confidence_level = "Moderate confidence"
            confidence_color = "#F59E0B"
        else:
            confidence_level = "Low confidence"
            confidence_color = "#EF4444"
        
        return {
            'summary': f"{'Deepfake detected' if is_deepfake else 'Authentic video'} with {confidence*100:.1f}% confidence",
            'key_points': key_points,
            'confidence_level': confidence_level,
            'confidence_color': confidence_color,
            'temporal_analysis': temporal_analysis,
            'recommendation': self._get_video_recommendation(is_deepfake, confidence, fake_count, total)
        }

    def _analyze_temporal_distribution(self, timeline: List[Dict]) -> Dict:
        """Analyse la distribution temporelle des prédictions"""
        
        valid_frames = [t for t in timeline if t.get('face_detected') and t.get('is_fake') is not None]
        
        if not valid_frames:
            return {
                'has_suspicious_segments': False,
                'suspicious_segments_count': 0,
                'consistency_score': 0
            }
        
        # Détecter les segments consécutifs de fake
        suspicious_segments = []
        current_segment = None
        
        for frame in valid_frames:
            if frame['is_fake']:
                if current_segment is None:
                    current_segment = {
                        'start': frame['timestamp_formatted'],
                        'start_index': frame['sequence_index'],
                        'frames': [frame]
                    }
                else:
                    current_segment['frames'].append(frame)
            else:
                if current_segment is not None and len(current_segment['frames']) >= 2:
                    current_segment['end'] = current_segment['frames'][-1]['timestamp_formatted']
                    current_segment['end_index'] = current_segment['frames'][-1]['sequence_index']
                    current_segment['avg_confidence'] = np.mean([f['confidence'] for f in current_segment['frames']])
                    suspicious_segments.append(current_segment)
                current_segment = None
        
        # Fermer le dernier segment si nécessaire
        if current_segment is not None and len(current_segment['frames']) >= 2:
            current_segment['end'] = current_segment['frames'][-1]['timestamp_formatted']
            current_segment['avg_confidence'] = np.mean([f['confidence'] for f in current_segment['frames']])
            suspicious_segments.append(current_segment)
        
        # Score de consistance (à quel point les prédictions sont cohérentes)
        predictions = [1 if f['is_fake'] else 0 for f in valid_frames]
        if len(predictions) > 1:
            consistency = 1 - np.std(predictions)
        else:
            consistency = 1.0
        
        return {
            'has_suspicious_segments': len(suspicious_segments) > 0,
            'suspicious_segments_count': len(suspicious_segments),
            'suspicious_segments': [
                {
                    'start': s['start'],
                    'end': s['end'],
                    'frame_count': len(s['frames']),
                    'avg_confidence': round(s['avg_confidence'], 3)
                }
                for s in suspicious_segments
            ],
            'consistency_score': round(consistency, 3)
        }

    def _get_video_recommendation(
        self, 
        is_deepfake: bool, 
        confidence: float,
        fake_count: int,
        total: int
    ) -> str:
        """Génère une recommandation pour la vidéo"""
        
        if is_deepfake:
            if confidence >= 0.85 and fake_count / total > 0.7:
                return "This video shows strong indicators of manipulation. We strongly recommend not considering it authentic."
            elif confidence >= 0.7:
                return "Significant signs of manipulation have been detected. A thorough manual review is recommended."
            else:
                return "Anomalies have been detected, but the result is uncertain. An expert review is recommended."
        else:
            if confidence >= 0.85:
                return "This video appears authentic. No signs of manipulation detected."
            elif confidence >= 0.7:
                return "The video appears likely authentic, but a few frames show minor ambiguities."
            else:
                return "The model leans toward authenticity but with limited confidence. Further analysis may be helpful."


def create_enhanced_video_analyzer(predictor, device='cpu') -> EnhancedVideoAnalyzer:
    """Factory function pour créer l'analyseur vidéo enrichi"""
    return EnhancedVideoAnalyzer(predictor, device)
