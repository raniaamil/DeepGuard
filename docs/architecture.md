#  DeepGuard — Architecture Technique

## Vue d'ensemble

DeepGuard suit une architecture **frontend statique + API backend** avec séparation claire des responsabilités.

```
┌─────────────────────┐         ┌──────────────────────────────┐
│   Frontend (Netlify) │  HTTPS  │   Backend API (HF Spaces)    │
│   HTML/CSS/JS        │────────▶│   FastAPI + ConvNeXt-Base     │
│   deepguard.netlify  │◀────────│   raniaamil-deepguard-api.hf  │
└─────────────────────┘  JSON   └──────────────────────────────┘
                                          │
                                          ▼
                                 ┌─────────────────┐
                                 │  Hugging Face Hub │
                                 │  Modèle .pth      │
                                 └─────────────────┘
```

---

## 1. Modèle de Deep Learning

### Architecture : ConvNeXt-Base

```
Input Image (224×224×3)
        │
        ▼
┌─────────────────────┐
│  ConvNeXt-Base       │  ← Backbone pré-entraîné (ImageNet-22k → ImageNet-1k)
│  (timm)              │     89M paramètres
│  global_pool='avg'   │
└────────┬────────────┘
         │ Feature vector (1024-dim)
         ▼
┌─────────────────────┐
│  Classification Head │
│  LayerNorm           │
│  Dropout (0.3)       │
│  Linear(1024 → 512)  │
│  GELU                │
│  Dropout (0.15)      │
│  Linear(512 → 2)     │
└────────┬────────────┘
         │
         ▼
   [prob_real, prob_fake]
```

### Entraînement

- **Datasets :** FaceForensics++ (4 méthodes) + Celeb-DF v2
- **Total images :** ~28 000 (équilibré real/fake)
- **Augmentations :** albumentations (Resize 224, Normalize ImageNet)
- **Optimisation :** Transfer learning depuis ImageNet-22k fine-tuned on ImageNet-1k
- **Résultats :** 98.05% accuracy, 0.9928 AUC-ROC

### Fichier modèle

- Hébergé sur Hugging Face : `raniaamil/deepguard-convnext`
- Fichier : `best_convnext_deepguard_v3.pth`
- Contient : `model_state_dict` (checkpoint PyTorch)
- Taille : ~350 MB

---

## 2. Backend API (FastAPI)

### Structure des modules

```
src/api/
├── main.py            # App FastAPI, routes, middleware CORS, stats
├── inference_v3.py    # Classe ConvNeXtDeepfakeDetector + singleton predictor
├── gradcam.py         # GradCAM + ExplainabilityAnalyzer
├── utils.py           # Validation images (format, taille, dimensions)
└── logger.py          # Configuration logging (console + fichier)

src/video/
└── analyzer.py        # EnhancedVideoAnalyzer (MTCNN + timeline + frames suspectes)
```

### Pipeline de prédiction — Image

```
Upload image
    │
    ▼
Validation (format, taille, dimensions)
    │
    ▼
PIL Image → RGB
    │
    ▼
Albumentations (Resize 224×224, Normalize)
    │
    ▼
PyTorch tensor → ConvNeXt forward pass
    │
    ├──▶ Softmax → probabilités {real, fake}
    │
    └──▶ [Si Grad-CAM activé]
         ├── Backward pass sur la classe prédite
         ├── Gradients × Activations → Heatmap
         ├── Overlay sur image originale → base64
         ├── Détection régions suspectes (contours OpenCV)
         └── Interprétation confiance + explication
```

### Pipeline de prédiction — Vidéo

```
Upload vidéo
    │
    ▼
Sauvegarde fichier temporaire
    │
    ▼
OpenCV : extraction métadonnées (FPS, durée, résolution)
    │
    ▼
Échantillonnage frames (max 30, uniforme)
    │
    ▼
Pour chaque frame :
    ├── MTCNN : détection visage
    ├── Si visage trouvé → prédiction ConvNeXt
    ├── Génération miniature base64
    └── Stockage résultat dans timeline
    │
    ▼
Agrégation :
    ├── Vote pondéré (confidence × proportion)
    ├── Tri frames suspectes (top 5)
    ├── Analyse temporelle (segments consécutifs)
    └── Score de consistance
```

### Détection de visages

- **Librairie :** facenet-pytorch (MTCNN)
- **Configuration :** image_size=224, margin=20, min_face_size=40
- **Seuils :** [0.6, 0.7, 0.7] pour les 3 réseaux (P-Net, R-Net, O-Net)
- **Mode :** keep_all=False (un seul visage par frame)

---

## 3. Frontend

### Pages

| Page         | Fichier      | Rôle                                      |
|-------------|-------------|-------------------------------------------|
| Landing     | index.html   | Présentation, features, performances, contact |
| Application | app.html     | Upload, analyse, résultats, explicabilité |

### Modules JavaScript

| Module       | Rôle                                                       |
|-------------|-----------------------------------------------------------|
| api.js       | Client HTTP vers le backend (fetch + timeout + error handling) |
| upload.js    | Gestion drag & drop, file input, URL, barre de progression |
| results.js   | Génération HTML des résultats avec traduction complète i18n |
| i18n.js      | Système de traduction (EN/FR/ES) avec re-traduction dynamique |
| icons.js     | Bibliothèque d'icônes SVG professionnelles                |
| security.js  | Sanitization XSS, validation formulaires, rate limiting, honeypot |
| main.js      | Initialisation app, tabs, navigation                       |

### Système i18n

- 3 langues : anglais (défaut), français, espagnol
- Toutes les chaînes UI sont traduites, y compris les résultats dynamiques
- Changement de langue à chaud (re-traduit les résultats affichés)
- Persistance via `localStorage`

### Design System

- **Palette :** violet (#8B5CF6), noir (#0A0A0A), blanc
- **Fonts :** Inter (body), Space Grotesk (headings), JetBrains Mono (code)
- **Composants :** cards avec glassmorphism, gauges SVG, barres de progression animées, timeline interactive

---

## 4. Explicabilité (Grad-CAM)

### Fonctionnement

1. Forward pass normal → prédiction
2. Backward pass sur le score de la classe prédite
3. Extraction des gradients et activations de la dernière stage ConvNeXt
4. Poids = moyenne spatiale des gradients
5. CAM = ReLU(somme pondérée des activations)
6. Redimensionnement à la taille originale + colormap JET
7. Overlay alpha=0.5 sur l'image originale

### Métriques d'attention

- `mean_activation` : activation moyenne de la heatmap
- `max_activation` : pic d'activation
- `high_attention_ratio` : proportion de pixels > 0.5
- `very_high_attention_ratio` : proportion de pixels > 0.75

### Détection de régions suspectes

1. Seuillage de la heatmap à 0.6
2. Recherche de contours (OpenCV)
3. Filtrage par surface > 100 pixels
4. Tri par intensité moyenne (top 5)
5. Coordonnées normalisées en pourcentages

---

## 5. Déploiement

### Backend → Hugging Face Spaces

- **Méthode :** Docker SDK
- **CI/CD :** GitHub Actions (`.github/workflows/deploy-hf-space.yml`)
- **Trigger :** Push sur `main`
- **Processus :** rsync (exclut frontend/) → git push forcé vers HF Space
- **Port :** 7860

### Frontend → Netlify

- **Méthode :** Déploiement du dossier `frontend/` comme site statique
- **URL :** deepguard.netlify.app

### Variables d'environnement

| Variable   | Usage                              | Où             |
|-----------|-------------------------------------|----------------|
| HF_TOKEN   | Téléchargement modèle depuis HF Hub | HF Spaces      |

---

## 6. Sécurité

### Frontend
- Sanitization XSS sur tous les inputs utilisateur
- Validation URL (blocage javascript:, data:, vbscript:)
- Honeypot anti-bot sur le formulaire de contact
- Rate limiting côté client (3 soumissions/minute)
- Token CSRF côté client
- Protection clickjacking (vérification self !== top)

### Backend
- Validation stricte des fichiers (format, taille, dimensions)
- CORS configuré
- Fichiers temporaires nettoyés après chaque analyse vidéo
- Pas de stockage persistant des données utilisateur

---

## 7. Limitations connues

- Optimisé pour les visages frontaux — performances réduites sur les profils
- Images très compressées (JPEG < 30%) → confiance réduite
- Nouvelles techniques de manipulation (post-2024) possiblement non détectées
- Le modèle a été entraîné sur des datasets académiques, la performance sur des deepfakes "in the wild" peut varier
- Analyse vidéo limitée à 50 MB et 60 frames max
