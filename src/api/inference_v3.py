"""
DeepGuard V3 - Inference avec ConvNeXt-Base
98.05% accuracy sur test set
"""

import torch
import torch.nn as nn
import timm
import numpy as np
from PIL import Image
from torchvision import transforms
import albumentations as A
from albumentations.pytorch import ToTensorV2
import time
import logging

logger = logging.getLogger(__name__)


class ConvNeXtDeepfakeDetector(nn.Module):
    """
    ConvNeXt-Base Deepfake Detector
    Architecture identique à l'entraînement
    """

    def __init__(self, model_name='convnext_base.fb_in22k_ft_in1k', num_classes=2, dropout_rate=0.3):
        super().__init__()

        # Backbone ConvNeXt
        self.backbone = timm.create_model(
            model_name,
            pretrained=False,  # On charge nos propres poids
            num_classes=0,
            global_pool='avg'
        )

        feature_dim = self.backbone.num_features
        
        # Classifier (identique à l'entraînement)
        self.classifier = nn.Sequential(
            nn.LayerNorm(feature_dim),
            nn.Dropout(p=dropout_rate),
            nn.Linear(feature_dim, 512),
            nn.GELU(),
            nn.Dropout(p=dropout_rate / 2),
            nn.Linear(512, num_classes)
        )

    def forward(self, x):
        features = self.backbone(x)
        output = self.classifier(features)
        return output


class DeepfakeDetectorV3:
    """
    Détecteur de deepfakes V3 - ConvNeXt-Base
    Performance : 98.05% accuracy
    """
    
    def __init__(self, model_path: str, device: str = 'cpu'):
        """
        Args:
            model_path: chemin vers best_convnext_deepguard_v3.pth
            device: 'cpu' ou 'cuda'
        """
        self.device = torch.device(device)
        self.model = self._load_model(model_path)
        self.transform = self._create_transform()
        
        logger.info(f"✅ ConvNeXt-Base chargé sur {self.device}")
        logger.info(f"   Modèle : {model_path}")
        logger.info(f"   Performance : 98.05% test accuracy")

    def _load_model(self, model_path: str) -> ConvNeXtDeepfakeDetector:
        """Charge le modèle ConvNeXt"""
        try:
            # Créer l'architecture
            model = ConvNeXtDeepfakeDetector(
                model_name='convnext_base.fb_in22k_ft_in1k',
                num_classes=2,
                dropout_rate=0.3
            )
            
            # Charger les poids
            checkpoint = torch.load(model_path, map_location=self.device, weights_only=False)
            model.load_state_dict(checkpoint['model_state_dict'])
            
            model.to(self.device)
            model.eval()
            
            logger.info(f"✅ Modèle chargé depuis : {model_path}")
            logger.info(f"   Epoch : {checkpoint.get('epoch', 'N/A')}")
            logger.info(f"   Val Acc : {checkpoint.get('val_acc', 0)*100:.2f}%")
            
            return model
            
        except Exception as e:
            logger.error(f"❌ Erreur chargement modèle : {e}")
            raise

    def _create_transform(self):
        """Transforms identiques à l'entraînement (validation)"""
        return A.Compose([
            A.Resize(224, 224),
            A.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            ),
            ToTensorV2()
        ])

    def predict(self, image: Image.Image) -> dict:
        """
        Prédit si une image est un deepfake
        
        Args:
            image: PIL Image RGB
            
        Returns:
            dict avec résultats de prédiction
        """
        start_time = time.time()
        
        try:
            # Preprocessing
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            img_array = np.array(image)
            
            # Albumentations transform
            augmented = self.transform(image=img_array)
            img_tensor = augmented['image'].unsqueeze(0).to(self.device)
            
            # Prédiction
            with torch.no_grad():
                outputs = self.model(img_tensor)
                probabilities = torch.softmax(outputs, dim=1)[0]
                prediction = torch.argmax(outputs, dim=1)[0]
            
            # Formatage résultats
            is_deepfake = prediction.item() == 1
            confidence = probabilities[prediction.item()].item()
            
            prob_real = probabilities[0].item()
            prob_fake = probabilities[1].item()
            
            processing_time = (time.time() - start_time) * 1000
            
            return {
                'is_deepfake': is_deepfake,
                'prediction': 'FAKE' if is_deepfake else 'REAL',
                'confidence': confidence,
                'probabilities': {
                    'real': prob_real,
                    'fake': prob_fake
                },
                'processing_time_ms': processing_time,
                'model_version': 'ConvNeXt-Base v3',
                'model_accuracy': '98.05%'
            }
            
        except Exception as e:
            logger.error(f"❌ Erreur prédiction : {e}")
            raise


# ═══════════════════════════════════════════════════════════════════
# SINGLETON GLOBAL (compatible avec ancien code)
# ═══════════════════════════════════════════════════════════════════

_predictor = None

def get_predictor(model_path: str = None, device: str = 'cpu') -> DeepfakeDetectorV3:
    """
    Récupère le singleton predictor
    Compatible avec l'ancien code de l'API
    """
    global _predictor
    
    if _predictor is None:
        if model_path is None:
            raise ValueError("model_path requis pour initialiser le predictor")
        _predictor = DeepfakeDetectorV3(model_path, device)
        logger.info(" Predictor V3 initialisé")
    
    return _predictor