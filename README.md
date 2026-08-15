---
title: DeepGuard API
sdk: docker
pinned: false
---

#  DeepGuard — AI Deepfake Detection

<p align="center">
  <strong>Détection de deepfakes par intelligence artificielle avec explicabilité complète</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Accuracy-98.05%25-brightgreen" alt="Accuracy">
  <img src="https://img.shields.io/badge/Model-ConvNeXt--Base-blueviolet" alt="Model">
  <img src="https://img.shields.io/badge/Parameters-89M-blue" alt="Parameters">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
  <img src="https://img.shields.io/badge/Python-3.9+-yellow" alt="Python">
</p>

---

##  Présentation

DeepGuard est une application complète de détection de deepfakes combinant un modèle ConvNeXt-Base entraîné sur 28 000+ images avec une API FastAPI et une interface web moderne. Le système fournit une explicabilité complète via Grad-CAM, permettant de comprendre visuellement pourquoi une prédiction a été faite.

** Démo live :** [deepguard.netlify.app](https://deep-guard.netlify.app)

---

##  Fonctionnalités

- **Analyse d'images** — Détection deepfake avec heatmap Grad-CAM, score de confiance et détection de régions suspectes
- **Analyse vidéo** — Analyse frame par frame avec timeline interactive, extraction des frames suspectes et analyse temporelle
- **Explicabilité** — Grad-CAM Visualization, interprétation de confiance, points clés et détails techniques
- **Multilingue** — Interface disponible en anglais, français et espagnol
- **API REST** — Endpoints documentés via Swagger pour intégration dans d'autres applications
- **Temps réel** — Inférence < 300ms par image sur CPU

---

##  Performances du modèle

| Métrique   | Score    |
|------------|----------|
| Accuracy   | 98.05%   |
| Precision  | 98.21%   |
| Recall     | 98.84%   |
| F1 Score   | 98.52%   |
| AUC-ROC    | 0.9928   |

**Datasets d'entraînement :** FaceForensics++ (Deepfakes, Face2Face, FaceSwap, NeuralTextures) + Celeb-DF v2

---

##  Architecture technique

```
DeepGuard/
├── src/
│   ├── api/                    # Backend FastAPI
│   │   ├── main.py             # Endpoints API (image, vidéo, santé, métriques)
│   │   ├── inference_v3.py     # Modèle ConvNeXt-Base + prédiction
│   │   ├── gradcam.py          # Module Grad-CAM pour l'explicabilité
│   │   ├── utils.py            # Validation des fichiers
│   │   └── logger.py           # Configuration logging
│   └── video/
│       └── analyzer.py         # Analyseur vidéo avec MTCNN + timeline
├── frontend/                   # Interface web
│   ├── index.html              # Landing page
│   ├── app.html                # Application d'analyse
│   ├── css/style.css           # Styles (thème violet/noir)
│   └── js/
│       ├── api.js              # Client API
│       ├── upload.js           # Gestion uploads + barre de progression
│       ├── results.js          # Affichage résultats traduits
│       ├── i18n.js             # Traductions EN/FR/ES
│       ├── icons.js            # Icônes SVG professionnelles
│       ├── security.js         # Protection XSS, validation
│       └── main.js             # Initialisation app
├── Dockerfile                  # Image Docker pour le backend
├── requirements.txt            # Dépendances Python
├── app.py                      # Entry point Hugging Face Spaces
└── docs/
    └── architecture.md         # Documentation technique détaillée
```

> Pour une documentation détaillée de l'architecture, voir [`docs/architecture.md`](docs/architecture.md).

---

##  Installation et lancement

### Prérequis

- Python 3.9+
- Le modèle ConvNeXt-Base (~350 MB, téléchargé automatiquement depuis Hugging Face)

### Backend (API)

```bash
# Cloner le dépôt
git clone https://github.com/rania-amil/DeepGuard.git
cd DeepGuard

# Créer un environnement virtuel
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Installer les dépendances
pip install -r requirements.txt

# Lancer l'API
python app.py
```

L'API sera accessible sur `http://localhost:7860`.

### Frontend

Le frontend est un site statique. Ouvrez `frontend/index.html` dans un navigateur, ou déployez le dossier `frontend/` sur Netlify, Vercel, ou tout hébergeur statique.

### Docker

```bash
docker build -t deepguard-api .
docker run -p 7860:7860 -e HF_TOKEN=your_token deepguard-api
```

---

##  Endpoints API

| Méthode | Endpoint              | Description                           |
|---------|-----------------------|---------------------------------------|
| GET     | `/health`             | État de santé de l'API                |
| GET     | `/info`               | Informations sur le modèle            |
| GET     | `/metrics`            | Statistiques d'utilisation            |
| POST    | `/predict`            | Analyser une image (+ Grad-CAM)       |
| POST    | `/predict/video`      | Analyser une vidéo (upload)           |
| POST    | `/predict/video/url`  | Analyser une vidéo depuis une URL     |
| GET     | `/video/info`         | Infos sur l'analyse vidéo             |

**Documentation interactive :** `/docs` (Swagger UI)

---

##  Stack technique

**Backend :** Python, FastAPI, PyTorch, timm (ConvNeXt-Base), OpenCV, facenet-pytorch (MTCNN), albumentations

**Frontend :** HTML5, CSS3 (custom design system), JavaScript vanilla, i18n maison

**Déploiement :** Hugging Face Spaces (backend Docker), Netlify (frontend statique)

**CI/CD :** GitHub Actions (déploiement automatique vers HF Spaces à chaque push sur main)

---

##  Sécurité

L'API applique plusieurs protections côté serveur :

- **Rate limiting** — 10 requêtes/minute par IP sur les endpoints de prédiction (`/predict`, `/predict/video`, `/predict/video/url`), qui sont coûteux en CPU *(voir la limitation ci-dessous : inopérant sur HF Spaces)*
- **Protection SSRF** — sur `/predict/video/url`, le schéma et l'IP résolue sont validés avant toute requête sortante ; les adresses privées, loopback et link-local sont rejetées, et chaque redirection est revalidée
- **Validation des uploads** — lecture bornée en flux (rejet avant absorption en RAM), vérification des magic bytes pour les vidéos, validation du contenu des images via PIL
- **Restriction CORS** — liste d'origines autorisées explicite, sans credentials
- **Erreurs génériques** — aucun détail interne (chemins, exceptions) n'est renvoyé au client ; le détail est journalisé côté serveur

### Limitation connue : CORS sur Hugging Face Spaces

**La restriction d'origine CORS définie dans le code est inopérante sur Hugging Face Spaces.**

Le proxy de HF Spaces intercepte et réécrit les en-têtes CORS avant que la requête n'atteigne l'application : il renvoie un `Access-Control-Allow-Origin` reflétant l'origine appelante, quelle qu'elle soit. La liste `ALLOWED_ORIGINS` de [`src/api/main.py`](src/api/main.py) n'a donc aucun effet sur cet hébergement.

Vérifiable ainsi — une origine arbitraire reçoit malgré tout l'en-tête :

```bash
curl -i -X OPTIONS https://raniaamil-deepguard-api.hf.space/predict \
  -H "Origin: https://exemple-arbitraire.com" \
  -H "Access-Control-Request-Method: POST"
# -> access-control-allow-origin: https://exemple-arbitraire.com
```

**Conséquence :** sur ce déploiement, l'API reste appelable depuis n'importe quel site.

La configuration CORS est conservée dans le code : elle est correcte et redeviendra effective sur tout hébergement ne réécrivant pas ces en-têtes (VPS, Cloud Run, Render, etc.).

### Limitation connue : rate limiting derrière le proxy HF

**Le rate limiting est lui aussi inopérant sur Hugging Face Spaces**, pour une raison connexe.

`slowapi` identifie les clients via `get_remote_address`, qui lit l'adresse du pair TCP. Derrière le proxy de HF Spaces, cette adresse est celle du proxy et non celle du client réel : le compteur ne discrimine donc pas les appelants.

Mesuré en production : 15 requêtes consécutives sur `/predict` renvoient toutes `200`, aucun `429`. Le même test en local déclenche bien le `429` à partir de la 11ᵉ requête — le code est correct, c'est l'environnement d'exécution qui neutralise la protection.

**Conséquence — état réel de ce déploiement :** ni la restriction CORS ni le rate limiting ne protègent l'API sur HF Spaces. Les protections effectives se limitent à celles qui ne dépendent pas de l'identité de l'appelant : validation SSRF, validation des uploads (taille, magic bytes), et messages d'erreur génériques.

Pour rendre le rate limiting effectif, il faudrait dériver la clé du header `X-Forwarded-For` transmis par le proxy plutôt que de l'adresse TCP — en gardant à l'esprit que ce header est falsifiable par le client s'il n'est pas assaini en amont.

---

##  Licence

Ce projet est distribué sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

##  Auteure

**Rania AMIL** — Conceptrice Développeuse d'Applications · Aspirante Ingénieure ML

- GitHub : [github.com/rania-amil](https://github.com/rania-amil)
- LinkedIn : [linkedin.com/in/rania-amil](https://linkedin.com/in/rania-amil)
