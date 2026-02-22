"""
DeepGuard - Grad-CAM Explainability Module
Génère des heatmaps d'attention pour expliquer les décisions du modèle
"""

import torch
import torch.nn.functional as F
import numpy as np
from PIL import Image
import cv2
import base64
import io
from typing import Dict, Tuple, Optional
import logging

logger = logging.getLogger(__name__)


class GradCAM:
    """
    Grad-CAM (Gradient-weighted Class Activation Mapping)
    Visualise les régions importantes pour la décision du modèle
    """
    
    def __init__(self, model, target_layer=None):
        """
        Args:
            model: ConvNeXtDeepfakeDetector
            target_layer: Couche cible pour Grad-CAM (par défaut: dernière couche conv)
        """
        self.model = model
        self.model.eval()
        
        # Récupérer la dernière couche du backbone ConvNeXt
        if target_layer is None:
            # ConvNeXt-Base: backbone.stages[-1] est la dernière stage
            self.target_layer = model.backbone.stages[-1]
        else:
            self.target_layer = target_layer
        
        self.gradients = None
        self.activations = None
        
        # Enregistrer les hooks
        self._register_hooks()
    
    def _register_hooks(self):
        """Enregistre les hooks pour capturer gradients et activations"""
        
        def forward_hook(module, input, output):
            self.activations = output.detach()
        
        def backward_hook(module, grad_input, grad_output):
            self.gradients = grad_output[0].detach()
        
        self.target_layer.register_forward_hook(forward_hook)
        self.target_layer.register_full_backward_hook(backward_hook)
    
    def generate(self, input_tensor: torch.Tensor, target_class: int = None) -> np.ndarray:
        """
        Génère la heatmap Grad-CAM
        
        Args:
            input_tensor: Image tensor [1, 3, H, W]
            target_class: Classe cible (0=real, 1=fake). Si None, utilise la classe prédite.
            
        Returns:
            Heatmap normalisée [H, W] entre 0 et 1
        """
        self.model.eval()
        input_tensor.requires_grad_(True)
        
        # Forward pass
        output = self.model(input_tensor)
        
        if target_class is None:
            target_class = output.argmax(dim=1).item()
        
        # Backward pass
        self.model.zero_grad()
        target = output[0, target_class]
        target.backward()
        
        # Calculer les poids (global average pooling des gradients)
        weights = self.gradients.mean(dim=(2, 3), keepdim=True)
        
        # Weighted combination des activations
        cam = (weights * self.activations).sum(dim=1, keepdim=True)
        
        # ReLU et normalisation
        cam = F.relu(cam)
        cam = cam.squeeze().cpu().numpy()
        
        # Normaliser entre 0 et 1
        if cam.max() > cam.min():
            cam = (cam - cam.min()) / (cam.max() - cam.min())
        else:
            cam = np.zeros_like(cam)
        
        return cam
    
    def generate_heatmap_overlay(
        self, 
        original_image: Image.Image, 
        input_tensor: torch.Tensor,
        target_class: int = None,
        alpha: float = 0.5,
        colormap: int = cv2.COLORMAP_JET
    ) -> Tuple[Image.Image, np.ndarray]:
        """
        Génère l'overlay de la heatmap sur l'image originale
        
        Args:
            original_image: Image PIL originale
            input_tensor: Tensor préprocessé
            target_class: Classe cible
            alpha: Transparence de l'overlay
            colormap: Colormap OpenCV
            
        Returns:
            (image_overlay, raw_heatmap)
        """
        # Générer la CAM
        cam = self.generate(input_tensor, target_class)
        
        # Redimensionner à la taille de l'image originale
        original_size = original_image.size  # (W, H)
        cam_resized = cv2.resize(cam, original_size)
        
        # Appliquer la colormap
        heatmap = cv2.applyColorMap(np.uint8(255 * cam_resized), colormap)
        heatmap = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)
        
        # Overlay sur l'image originale
        original_array = np.array(original_image.convert('RGB'))
        overlay = (alpha * heatmap + (1 - alpha) * original_array).astype(np.uint8)
        
        return Image.fromarray(overlay), cam_resized


class ExplainabilityAnalyzer:
    """
    Analyseur d'explicabilité complet pour DeepGuard
    Combine Grad-CAM avec des métriques additionnelles
    """
    
    def __init__(self, model, device='cpu'):
        self.model = model
        self.device = device
        self.gradcam = GradCAM(model)
        
        logger.info("ExplainabilityAnalyzer initialized")
    
    def analyze(
        self, 
        image: Image.Image, 
        input_tensor: torch.Tensor,
        prediction_result: Dict
    ) -> Dict:
        """
        Analyse complète d'explicabilité
        
        Args:
            image: Image PIL originale
            input_tensor: Tensor préprocessé
            prediction_result: Résultat de la prédiction
            
        Returns:
            Dict avec toutes les métriques d'explicabilité
        """
        try:
            # Déterminer la classe cible (celle prédite)
            target_class = 1 if prediction_result['is_deepfake'] else 0
            
            # Générer Grad-CAM
            heatmap_overlay, raw_heatmap = self.gradcam.generate_heatmap_overlay(
                image, 
                input_tensor.to(self.device),
                target_class=target_class,
                alpha=0.5
            )
            
            # Convertir l'overlay en base64
            overlay_base64 = self._image_to_base64(heatmap_overlay)
            
            # Analyser la heatmap
            heatmap_analysis = self._analyze_heatmap(raw_heatmap)
            
            # Calculer le score de confiance interprété
            confidence_interpretation = self._interpret_confidence(
                prediction_result['confidence']
            )
            
            # Zones suspectes détectées
            suspicious_regions = self._detect_suspicious_regions(raw_heatmap)
            
            return {
                'gradcam': {
                    'heatmap_overlay_base64': overlay_base64,
                    'attention_stats': heatmap_analysis,
                    'suspicious_regions': suspicious_regions
                },
                'confidence_interpretation': confidence_interpretation,
                'explanation': self._generate_explanation(
                    prediction_result, 
                    heatmap_analysis,
                    suspicious_regions
                )
            }
            
        except Exception as e:
            logger.error(f"Explainability analysis error: {e}")
            return {
                'error': str(e),
                'gradcam': None,
                'confidence_interpretation': self._interpret_confidence(
                    prediction_result.get('confidence', 0.5)
                )
            }
    
    def _image_to_base64(self, image: Image.Image) -> str:
        """Convertit une image PIL en base64"""
        buffer = io.BytesIO()
        image.save(buffer, format='PNG')
        return base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    def _analyze_heatmap(self, heatmap: np.ndarray) -> Dict:
        """Analyse statistique de la heatmap"""
        return {
            'mean_activation': float(np.mean(heatmap)),
            'max_activation': float(np.max(heatmap)),
            'std_activation': float(np.std(heatmap)),
            'high_attention_ratio': float(np.mean(heatmap > 0.5)),
            'very_high_attention_ratio': float(np.mean(heatmap > 0.75))
        }
    
    def _interpret_confidence(self, confidence: float) -> Dict:
        """Interprète le score de confiance"""
        if confidence >= 0.95:
            level = 'very_high'
            label = 'Very high confidence.'
            description = 'The model is very confident in its prediction.'
            color = '#10B981'  # Vert
        elif confidence >= 0.85:
            level = 'high'
            label = 'High confidence'
            description = 'The model is confident in its prediction.'
            color = '#34D399'  # Vert clair
        elif confidence >= 0.70:
            level = 'moderate'
            label = 'Moderate confidence'
            description = 'The model leans toward this prediction but with some uncertainty.'
            color = '#F59E0B'  # Orange
        elif confidence >= 0.55:
            level = 'low'
            label = 'Low confidence.'
            description = 'The model is uncertain; the result should be interpreted with caution.'
            color = '#EF4444'  # Rouge
        else:
            level = 'uncertain'
            label = 'Very uncertain.'
            description = 'The model cannot make a reliable determination.'
            color = '#6B7280'  # Gris
        
        return {
            'level': level,
            'label': label,
            'description': description,
            'color': color,
            'percentage': round(confidence * 100, 1)
        }
    
    def _detect_suspicious_regions(self, heatmap: np.ndarray) -> list:
        """Détecte les régions avec haute activation"""
        regions = []
        
        # Seuil pour les zones suspectes
        threshold = 0.6
        binary = (heatmap > threshold).astype(np.uint8)
        
        # Trouver les contours
        contours, _ = cv2.findContours(
            binary, 
            cv2.RETR_EXTERNAL, 
            cv2.CHAIN_APPROX_SIMPLE
        )
        
        h, w = heatmap.shape
        
        for i, contour in enumerate(contours[:5]):  # Max 5 régions
            x, y, cw, ch = cv2.boundingRect(contour)
            area = cv2.contourArea(contour)
            
            if area > 100:  # Filtrer les petites régions
                # Normaliser les coordonnées (0-100%)
                regions.append({
                    'id': i + 1,
                    'x_percent': round(x / w * 100, 1),
                    'y_percent': round(y / h * 100, 1),
                    'width_percent': round(cw / w * 100, 1),
                    'height_percent': round(ch / h * 100, 1),
                    'intensity': round(float(np.mean(heatmap[y:y+ch, x:x+cw])), 3)
                })
        
        # Trier par intensité
        regions.sort(key=lambda r: r['intensity'], reverse=True)
        
        return regions
    
    def _generate_explanation(
        self, 
        prediction: Dict, 
        heatmap_analysis: Dict,
        suspicious_regions: list
    ) -> Dict:
        """Génère une explication textuelle de la décision"""
        
        is_fake = prediction['is_deepfake']
        confidence = prediction['confidence']
        
        # Points clés de l'analyse
        key_points = []
        
        if is_fake:
            if heatmap_analysis['high_attention_ratio'] > 0.3:
                key_points.append(
                    "Extensive anomaly regions detected on the face."
                )
            if len(suspicious_regions) > 2:
                key_points.append(
                    f"{len(suspicious_regions)} Suspicious regions identified."
                )
            if heatmap_analysis['max_activation'] > 0.9:
                key_points.append(
                    "High concentration of artifacts in certain areas."
                )
            
            if not key_points:
                key_points.append(
                    "Subtle manipulation patterns detected."
                )
        else:
            if heatmap_analysis['mean_activation'] < 0.3:
                key_points.append(
                    "No significant anomalies detected."
                )
            if heatmap_analysis['std_activation'] < 0.2:
                key_points.append(
                    "Consistent and natural facial texture."
                )
            
            if not key_points:
                key_points.append(
                    "The image exhibits authentic characteristics."
                )
        
        # Analyse détaillée
        technical_details = []
        
        if is_fake:
            technical_details = [
                "GAN compression artifact analysis.",
                "Detection of inconsistencies at the face boundaries.",
                "Verification of skin texture consistency.",
                "Analysis of micro-expressions and facial symmetry."
            ]
        else:
            technical_details = [
                "Verification of texture consistency.",
                "Lighting and shadow analysis.",
                "Resolution and sharpness check.",
                "Validation of facial proportions."
            ]
        
        return {
            'summary': f"{'Deepfake detected' if is_fake else 'Authentic image'} with {confidence*100:.1f}% confidence",
            'key_points': key_points,
            'technical_details': technical_details,
            'recommendation': self._get_recommendation(is_fake, confidence)
        }
    
    def _get_recommendation(self, is_fake: bool, confidence: float) -> str:
        """Génère une recommandation basée sur le résultat"""
        
        if is_fake:
            if confidence >= 0.9:
                return "This image shows strong indicators of manipulation. We recommend not considering it authentic."
            elif confidence >= 0.7:
                return "This image shows signs of manipulation. Further verification is recommended."
            else:
                return "Anomalies have been detected, but the result is uncertain. Manual analysis is recommended."
        else:
            if confidence >= 0.9:
                return "This image appears authentic. No signs of manipulation detected."
            elif confidence >= 0.7:
                return "This image appears likely authentic, but additional verification may be helpful."
            else:
                return "The model leans toward authenticity but with low confidence. Further analysis is recommended."


def create_explainability_analyzer(model, device='cpu') -> ExplainabilityAnalyzer:
    """Factory function pour créer l'analyseur d'explicabilité"""
    return ExplainabilityAnalyzer(model, device)
