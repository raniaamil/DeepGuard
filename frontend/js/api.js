/**
 * DeepGuard API Client
 * Communication avec le backend FastAPI
 */

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
     * Analyser une image (fichier)
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
     * Analyser une vidéo (fichier)
     */
    async analyzeVideo(videoFile) {
        const formData = new FormData();
        formData.append('file', videoFile);

        return await this.apiCall('/predict/video', {
            method: 'POST',
            body: formData,
            timeout: 180000 // 3 minutes pour les vidéos
        });
    }

    /**
     * ✅ NOUVEAU : analyser une vidéo depuis une URL (backend télécharge, pas de CORS)
     */
    async analyzeVideoUrl(url) {
        return await this.apiCall('/predict/video/url', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url }),
            timeout: 240000 // 4 minutes
        });
    }

    async getInfo() {
        return await this.apiCall('/info');
    }

    async getMetrics() {
        return await this.apiCall('/metrics');
    }

    async healthCheck() {
        return await this.apiCall('/health');
    }

    async getVideoInfo() {
        return await this.apiCall('/video/info');
    }
}

// Instance globale
window.deepGuardAPI = new DeepGuardAPI();

// Utilitaires
window.DeepGuardUtils = {
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    formatProcessingTime(ms) {
        if (ms < 1000) return `${Math.round(ms)}ms`;
        return `${(ms / 1000).toFixed(1)}s`;
    },

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    getExtension(filename = '') {
        const m = filename.toLowerCase().match(/\.([a-z0-9]+)$/i);
        return m ? `.${m[1]}` : '';
    },

    validateImageFile(file) {
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/gif'];
        const validExts  = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif'];
        const maxSize = 10 * 1024 * 1024;

        const mime = (file.type || '').toLowerCase();
        const ext  = this.getExtension(file.name || '');

        const mimeOk = validTypes.includes(mime);
        const extOk  = validExts.includes(ext);
        const acceptableUnknownMime = (!mime || mime === 'application/octet-stream') && extOk;

        if (!(mimeOk || extOk || acceptableUnknownMime)) {
            throw new Error(
                `Format non supporté: ${mime || '(mime inconnu)'} ${ext || ''}. ` +
                `Formats acceptés: JPG, PNG, WebP, BMP, GIF`
            );
        }

        if (file.size > maxSize) {
            throw new Error(`Fichier trop volumineux: ${this.formatFileSize(file.size)}. Maximum: 10MB`);
        }

        return true;
    },

    validateVideoFile(file) {
        const validTypes = [
            'video/mp4',
            'video/quicktime',
            'video/x-msvideo',
            'video/webm',
            'video/ogg',
            'video/x-matroska'
        ];
        const validExts = ['.mp4', '.mov', '.avi', '.webm', '.ogg', '.mkv', '.flv', '.wmv'];
        const maxSize = 50 * 1024 * 1024;

        const mime = (file.type || '').toLowerCase();
        const ext  = this.getExtension(file.name || '');

        const mimeOk = validTypes.includes(mime);
        const extOk  = validExts.includes(ext);
        const acceptableUnknownMime = (!mime || mime === 'application/octet-stream') && extOk;

        if (!(mimeOk || extOk || acceptableUnknownMime)) {
            throw new Error(
                `Format non supporté: ${mime || '(mime inconnu)'} ${ext || ''}. ` +
                `Formats acceptés: MP4, AVI, MOV, WebM, OGG, MKV`
            );
        }

        if (file.size > maxSize) {
            throw new Error(`Fichier trop volumineux: ${this.formatFileSize(file.size)}. Maximum: 50MB`);
        }

        return true;
    },

    validateImageUrl(url) {
        try { new URL(url); return true; } catch { return false; }
    },

    validateVideoUrl(url) {
        try { new URL(url); return true; } catch { return false; }
    },

    isVideoPlatform(url) {
        const urlLower = url.toLowerCase();
        const platforms = ['youtube', 'youtu.be', 'vimeo', 'dailymotion', 'tiktok', 'twitter', 'x.com', 'instagram', 'facebook'];
        return platforms.some(platform => urlLower.includes(platform));
    },

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

    animateCounter(element, start, end, duration = 1000) {
        const startTime = performance.now();
        const range = end - start;

        const updateCounter = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const value = start + (range * easeOut);
            element.textContent = Math.round(value * 100) / 100;

            if (progress < 1) requestAnimationFrame(updateCounter);
        };

        requestAnimationFrame(updateCounter);
    }
};