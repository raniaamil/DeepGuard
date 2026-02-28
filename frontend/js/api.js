/**
 * DeepGuard API Client - Enhanced Version 2.0
 * Communication avec le backend FastAPI v2
 */

class DeepGuardAPI {
    constructor() {
        this.baseURL = 'https://raniaamil-deepguard-api.hf.space';
        this.timeout = 180000; // 3 minutes
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
     * Analyser une image avec Grad-CAM
     */
    async analyzeImage(imageFile, includeGradcam = true) {
        const formData = new FormData();
        formData.append('file', imageFile);

        const params = new URLSearchParams({ include_gradcam: includeGradcam });

        return await this.apiCall(`/predict?${params}`, {
            method: 'POST',
            body: formData
        });
    }

    /**
     * Analyser une vidéo avec timeline
     */
    async analyzeVideo(videoFile, maxFrames = 30, includeThumbnails = true) {
        const formData = new FormData();
        formData.append('file', videoFile);

        const params = new URLSearchParams({
            max_frames: maxFrames,
            include_thumbnails: includeThumbnails
        });

        return await this.apiCall(`/predict/video?${params}`, {
            method: 'POST',
            body: formData,
            timeout: 240000
        });
    }

    /**
     * Analyser une vidéo depuis URL
     */
    async analyzeVideoUrl(url, maxFrames = 30, includeThumbnails = true) {
        const params = new URLSearchParams({
            max_frames: maxFrames,
            include_thumbnails: includeThumbnails
        });

        return await this.apiCall(`/predict/video/url?${params}`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url }),
            timeout: 300000
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

/**
 * Utilitaires
 */
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
        return `${(ms / 1000).toFixed(2)}s`;
    },

    formatPercentage(value, decimals = 1) {
        return `${(value * 100).toFixed(decimals)}%`;
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
        const validExts = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif'];
        const maxSize = 10 * 1024 * 1024;

        const mime = (file.type || '').toLowerCase();
        const ext = this.getExtension(file.name || '');

        const mimeOk = validTypes.includes(mime);
        const extOk = validExts.includes(ext);
        const acceptableUnknownMime = (!mime || mime === 'application/octet-stream') && extOk;

        if (!(mimeOk || extOk || acceptableUnknownMime)) {
            throw new Error(`Unsupported format. Accepted: JPG, PNG, WebP, BMP, GIF`);
        }

        if (file.size > maxSize) {
            throw new Error(`File too large: ${this.formatFileSize(file.size)}. Maximum: 10MB`);
        }

        return true;
    },

    validateVideoFile(file) {
        const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/ogg', 'video/x-matroska'];
        const validExts = ['.mp4', '.mov', '.avi', '.webm', '.ogg', '.mkv', '.flv', '.wmv'];
        const maxSize = 50 * 1024 * 1024;

        const mime = (file.type || '').toLowerCase();
        const ext = this.getExtension(file.name || '');

        const mimeOk = validTypes.includes(mime);
        const extOk = validExts.includes(ext);
        const acceptableUnknownMime = (!mime || mime === 'application/octet-stream') && extOk;

        if (!(mimeOk || extOk || acceptableUnknownMime)) {
            throw new Error(`Unsupported format. Accepted: MP4, AVI, MOV, WebM, MKV`);
        }

        if (file.size > maxSize) {
            throw new Error(`File too large: ${this.formatFileSize(file.size)}. Maximum: 50MB`);
        }

        return true;
    },

    validateImageUrl(url) {
        try { new URL(url); return true; } catch { return false; }
    },

    validateVideoUrl(url) {
        try { new URL(url); return true; } catch { return false; }
    },

    getFilenameFromUrl(url) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            return pathname.split('/').pop() || 'file';
        } catch {
            return 'file';
        }
    },

    /**
     * Crée un graphique de gauge SVG
     */
    createGaugeSVG(percentage, color, size = 180) {
        const strokeWidth = 12;
        const radius = (size - strokeWidth) / 2;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (percentage / 100) * circumference;

        return `
            <svg class="gauge-svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
                <circle class="gauge-bg" cx="${size/2}" cy="${size/2}" r="${radius}"/>
                <circle class="gauge-fill" cx="${size/2}" cy="${size/2}" r="${radius}"
                    stroke="${color}"
                    stroke-dasharray="${circumference}"
                    stroke-dashoffset="${offset}"/>
            </svg>
        `;
    },

    /**
     * Anime un compteur
     */
    animateCounter(element, start, end, duration = 1000, suffix = '') {
        const startTime = performance.now();
        const range = end - start;

        const updateCounter = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const value = start + (range * easeOut);
            
            if (suffix === '%') {
                element.textContent = value.toFixed(1) + suffix;
            } else {
                element.textContent = Math.round(value) + suffix;
            }

            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            }
        };

        requestAnimationFrame(updateCounter);
    },

    /**
     * Crée les barres de timeline pour la vidéo
     */
    createTimelineBars(timeline) {
        return timeline.map((frame, index) => {
            let className = 'timeline-bar';
            let height = 20;
            let tooltip = frame.timestamp_formatted;

            if (frame.face_detected && frame.is_fake !== null) {
                className += frame.is_fake ? ' fake' : ' real';
                height = Math.max(20, frame.confidence * 100);
                tooltip += ` | ${frame.prediction} (${(frame.confidence * 100).toFixed(1)}%)`;
            } else {
                className += ' no-face';
                tooltip += ' | No face detected';
            }

            return `<div class="${className}" style="height: ${height}%" data-tooltip="${tooltip}" data-index="${index}"></div>`;
        }).join('');
    },

    /**
     * Génère la couleur en fonction de la confiance
     */
    getConfidenceColor(confidence) {
        if (confidence >= 0.95) return '#10B981';
        if (confidence >= 0.85) return '#34D399';
        if (confidence >= 0.70) return '#F59E0B';
        if (confidence >= 0.55) return '#EF4444';
        return '#6B7280';
    }
};
