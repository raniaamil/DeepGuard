---
title: DeepGuard API
emoji: 🛡️
colorFrom: purple
colorTo: pink
sdk: docker
app_port: 7860
license: mit
---

# DeepGuard - Deepfake Detection API

API de détection de deepfakes avec ConvNeXt-Base (98.05% accuracy).

## Documentation

Une fois le Space démarré :
- **Swagger UI** : `/docs`
- **Health check** : `/health`

## Stack technique
- ConvNeXt-Base (89M paramètres)
- FastAPI + Uvicorn
- Grad-CAM pour l'explicabilité