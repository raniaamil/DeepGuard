# Image de base avec Python
# 3.11 requis : les versions corrigées de fastapi (>=0.141), starlette
# (>=1.3.1), pillow (>=12.3.0) et python-multipart (>=0.0.31) exigent
# toutes Python >=3.10. Sur 3.9, pip échoue et le build du Space casse.
FROM python:3.11-slim

# Informations
LABEL maintainer="Rania AMIL"
LABEL description="DeepGuard API - Deepfake Detection"
LABEL version="1.0.0"

# Variables d'environnement
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

# Dossier de travail
WORKDIR /app

# Installer les dépendances système (OpenCV etc.)
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copier les requirements
COPY requirements.txt .

# Installer les dépendances Python
RUN pip install --no-cache-dir -r requirements.txt

# Copier le code source
COPY src/ ./src/

# Créer le dossier de logs
RUN mkdir -p logs

# Exposer le port
EXPOSE 7860

# Commande de démarrage
CMD ["python", "-m", "uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "7860"]
