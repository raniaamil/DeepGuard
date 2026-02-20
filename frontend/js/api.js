/**
 * DeepGuard API Client
 * Communication avec le backend FastAPI
 */
window.deepGuardAPI = {
    baseURL: 'http://localhost:8000',
};

class DeepGuardAPI {
    constructor() {
        this.baseURL = 'http://localhost:8000';  // Adapter selon ton déploiement
        this.timeout = 120000; // 2 minutes timeout
    }

    /**
     * Appel API générique
     */
    async apiCall(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const defaultOptions = {
            timeout: this.timeout,
            headers: {
                'Accept': 'application/json',
            }
        };

        const config = { ...defaultOptions, ...options };

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), config.timeout);

            const response = await fetch(url, {
                ...config,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timeout - Please try again');
            }
            throw error;
        }
    }

    /**
     * Analyser une image
     */
    async analyzeImage(imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);

        return await this.apiCall('/predict', {
            method: 'POST',
            body: formData
        });
    }

    /**
     * Analyser une vidéo
     */
    async analyzeVideo(videoFile, onProgress = null) {
        const formData = new FormData();
        formData.append('file', videoFile);

        return await this.apiCall('/predict/video', {
            method: 'POST',
            body: formData,
            timeout: 180000 // 3 minutes pour les vidéos
        });
    }

    /**
     * Obtenir les informations de l'API
     */
    async getInfo() {
        return await this.apiCall('/info');
    }

    /**
     * Obtenir les métriques
     */
    async getMetrics() {
        return await this.apiCall('/metrics');
    }

    /**
     * Health check
     */
    async healthCheck() {
        return await this.apiCall('/health');
    }

    /**
     * Informations sur l'analyse vidéo
     */
    async getVideoInfo() {
        return await this.apiCall('/video/info');
    }
}

// Instance globale
window.deepGuardAPI = new DeepGuardAPI();

// Utilitaires
window.DeepGuardUtils = {
    /**
     * Formater la taille des fichiers
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    /**
     * Formater le temps en millisecondes
     */
    formatProcessingTime(ms) {
        if (ms < 1000) {
            return `${Math.round(ms)}ms`;
        }
        return `${(ms / 1000).toFixed(1)}s`;
    },

    /**
     * Créer un délai
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Valider un fichier image
     */
    validateImageFile(file) {
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/gif'];
        const maxSize = 10 * 1024 * 1024; // 10MB

        if (!validTypes.includes(file.type)) {
            throw new Error(`Format non supporté: ${file.type}. Formats acceptés: JPG, PNG, WebP, BMP, GIF`);
        }

        if (file.size > maxSize) {
            throw new Error(`Fichier trop volumineux: ${this.formatFileSize(file.size)}. Maximum: 10MB`);
        }

        return true;
    },

    /**
     * Valider un fichier vidéo
     */
    validateVideoFile(file) {
        const validTypes = ['video/mp4', 'video/avi', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/ogg'];
        const maxSize = 50 * 1024 * 1024; // 50MB

        if (!validTypes.includes(file.type)) {
            throw new Error(`Format non supporté: ${file.type}. Formats acceptés: MP4, AVI, MOV, WebM, OGG`);
        }

        if (file.size > maxSize) {
            throw new Error(`Fichier trop volumineux: ${this.formatFileSize(file.size)}. Maximum: 50MB`);
        }

        return true;
    },

    /**
     * Valider une URL d'image
     */
    validateImageUrl(url) {
        try {
            new URL(url);
            return url.match(/\.(jpg|jpeg|png|webp|bmp|gif)(\?.*)?$/i) !== null;
        } catch {
            return false;
        }
    },

    /**
     * Valider une URL de vidéo (directe)
     */
    validateVideoUrl(url) {
        try {
            new URL(url);
            return url.match(/\.(mp4|webm|ogg|mov|avi|mkv|flv|wmv)(\?.*)?$/i) !== null;
        } catch {
            return false;
        }
    },

    /**
     * Détecter si c'est une URL de plateforme vidéo
     */
    isVideoPlatform(url) {
        const urlLower = url.toLowerCase();
        const platforms = ['youtube', 'youtu.be', 'vimeo', 'dailymotion', 'tiktok', 'twitter', 'x.com', 'instagram', 'facebook'];
        return platforms.some(platform => urlLower.includes(platform));
    },

    /**
     * Extraire le nom de fichier depuis une URL
     */
    getFilenameFromUrl(url) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const filename = pathname.split('/').pop();
            return filename || 'fichier';
        } catch {
            return 'fichier';
        }
    },

    /**
     * Animer un compteur
     */
    animateCounter(element, start, end, duration = 1000) {
        const startTime = performance.now();
        const range = end - start;

        const updateCounter = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const value = start + (range * easeOut);
            
            element.textContent = Math.round(value * 100) / 100;
            
            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            }
        };

        requestAnimationFrame(updateCounter);
    }
};