# Image de base avec Python
FROM python:3.9-slim

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
COPY models/ ./models/

# Créer le dossier de logs
RUN mkdir -p logs

# Exposer le port
EXPOSE 7860

# Commande de démarrage
CMD ["python", "-m", "uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "7860"]
