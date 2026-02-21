/**
 * DeepGuard Upload Handler
 * Gestion des uploads et drag & drop + URL + previews robustes
 */

class UploadHandler {
    constructor() {
        this.currentImageFile = null;

        // Vidéo peut être soit un File, soit une URL
        this.currentVideoFile = null;
        this.currentVideoUrl = null;

        this._currentVideoObjectUrl = null;

        this.init();
    }

    init() {
        this.setupImageUpload();
        this.setupVideoUpload();
        this.setupDragAndDrop();
        this.setupUrlUploads();
        this.setupAnalyzeButtons();
        this.setupResetButtons();
    }

    setupAnalyzeButtons() {
        const analyzeImageBtn = document.getElementById('analyzeImageBtn');
        if (analyzeImageBtn) analyzeImageBtn.addEventListener('click', () => this.analyzeCurrentImage());

        const analyzeVideoBtn = document.getElementById('analyzeVideoBtn');
        if (analyzeVideoBtn) analyzeVideoBtn.addEventListener('click', () => this.analyzeCurrentVideo());
    }

    setupResetButtons() {
        const resetImageBtn = document.getElementById('resetImageBtn');
        if (resetImageBtn) resetImageBtn.addEventListener('click', () => this.reset('image'));

        const resetVideoBtn = document.getElementById('resetVideoBtn');
        if (resetVideoBtn) resetVideoBtn.addEventListener('click', () => this.reset('video'));
    }

    /* ============================================================
       =====================  HELPERS  =============================
       ============================================================ */

    getExtension(name = '') {
        const m = name.toLowerCase().match(/\.([a-z0-9]+)$/i);
        return m ? `.${m[1]}` : '';
    }

    isDirectVideoUrl(url) {
        return /\.(mp4|webm|ogg|mov|avi|mkv|flv|wmv)(\?.*)?$/i.test(url);
    }

    detectPlatform(url) {
        const u = url.toLowerCase();
        if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
        if (u.includes('vimeo.com')) return 'vimeo';
        if (u.includes('dailymotion.com') || u.includes('dai.ly')) return 'dailymotion';
        if (u.includes('tiktok.com')) return 'tiktok';
        if (u.includes('twitter.com') || u.includes('x.com')) return 'twitter';
        if (u.includes('instagram.com')) return 'instagram';
        if (u.includes('facebook.com')) return 'facebook';
        return 'unknown';
    }

    cleanupVideoResources() {
        const previewVideo = document.getElementById('previewVideo');

        if (this._currentVideoObjectUrl) {
            try { URL.revokeObjectURL(this._currentVideoObjectUrl); } catch (_) {}
            this._currentVideoObjectUrl = null;
        }

        if (previewVideo && previewVideo.src && previewVideo.src.startsWith('blob:')) {
            try { URL.revokeObjectURL(previewVideo.src); } catch (_) {}
        }

        if (previewVideo) {
            previewVideo.removeAttribute('src');
            previewVideo.load();
        }
    }

    /* ============================================================
       =====================  URL UPLOADS  =========================
       ============================================================ */

    setupUrlUploads() {
        // Image URL (tu as déjà ton système qui marche)
        const loadImageUrlBtn = document.getElementById('loadImageUrl');
        const imageUrlInput = document.getElementById('imageUrlInput');

        if (loadImageUrlBtn && imageUrlInput) {
            loadImageUrlBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                const url = imageUrlInput.value.trim();
                if (url) await this.handleImageUrl(url);
            });

            imageUrlInput.addEventListener('keypress', async (e) => {
                if (e.key === 'Enter') {
                    const url = e.target.value.trim();
                    if (url) await this.handleImageUrl(url);
                }
            });
        }

        // Video URL
        const loadVideoUrlBtn = document.getElementById('loadVideoUrl');
        const videoUrlInput = document.getElementById('videoUrlInput');

        if (loadVideoUrlBtn && videoUrlInput) {
            loadVideoUrlBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                const url = videoUrlInput.value.trim();
                if (url) await this.handleVideoUrl(url);
            });

            videoUrlInput.addEventListener('keypress', async (e) => {
                if (e.key === 'Enter') {
                    const url = e.target.value.trim();
                    if (url) await this.handleVideoUrl(url);
                }
            });
        }
    }

    async handleImageUrl(url) {
        // IMPORTANT : tu as déjà un handler image URL qui marche chez toi.
        // Ici je ne le réécris pas pour éviter de casser ton flow.
        // Si tu veux, remplace par ton code image URL actuel.
        this.showInfo("Ton import image URL fonctionne déjà (on ne touche pas ici).");
    }

    /**
     * ✅ NOUVEAU FLOW :
     * Pour les vidéos URL : on ne télécharge PLUS le fichier côté navigateur (CORS),
     * on fait juste :
     * - preview via <video src=url> (ça marche souvent même cross-origin)
     * - stockage de currentVideoUrl
     * - analyse : envoie l'URL au backend (/predict/video/url)
     */
    async handleVideoUrl(url) {
        const loadingOverlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');

        try {
            if (window.DeepGuardUtils?.validateVideoUrl && !window.DeepGuardUtils.validateVideoUrl(url)) {
                throw new Error("URL invalide.");
            }

            const platform = this.detectPlatform(url);
            if (platform !== 'unknown' && !this.isDirectVideoUrl(url)) {
                this.showInfo(`${platform.toUpperCase()} détecté : colle un lien direct (.mp4/.webm) ou télécharge en local.`);
                throw new Error("Lien de plateforme non supporté directement.");
            }

            if (loadingOverlay) loadingOverlay.style.display = 'flex';
            if (loadingText) loadingText.textContent = "Chargement de la vidéo...";

            // Reset sources
            this.currentVideoFile = null;
            this.currentVideoUrl = url;

            // Preview direct
            this.cleanupVideoResources();

            const previewVideo = document.getElementById('previewVideo');
            if (previewVideo) {
                previewVideo.src = url;
                previewVideo.preload = 'metadata';
                previewVideo.muted = true;
                previewVideo.playsInline = true;
                previewVideo.load();
            }

            // UI info
            const fileName = document.getElementById('videoFileName');
            if (fileName) fileName.textContent = window.DeepGuardUtils.getFilenameFromUrl(url);

            const resultsSection = document.getElementById('videoResults');
            if (resultsSection) {
                resultsSection.style.display = 'block';
                resultsSection.scrollIntoView({ behavior: 'smooth' });
            }

            const detailedResults = document.getElementById('videoDetailedResults');
            if (detailedResults) detailedResults.style.display = 'none';

            this.resetResultCard('videoResultCard');

            const videoUrlInput = document.getElementById('videoUrlInput');
            if (videoUrlInput) videoUrlInput.value = '';

            this.showSuccess("Vidéo chargée depuis l'URL ! (Analyse via backend)");
        } catch (err) {
            console.error('URL video error:', err);
            this.showError(err.message || "Erreur lors du chargement de la vidéo.");
        } finally {
            if (loadingOverlay) loadingOverlay.style.display = 'none';
        }
    }

    /* ============================================================
       ===================  INPUT FILE UPLOADS  ====================
       ============================================================ */

    setupImageUpload() {
        const imageInput = document.getElementById('imageInput');
        const imageUploadArea = document.getElementById('imageUploadArea');

        if (imageInput) {
            imageInput.addEventListener('change', async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                    await this.handleImageFile(file);
                }
                e.target.value = '';
            });
        }

        if (imageUploadArea && imageInput) {
            imageUploadArea.addEventListener('click', (e) => {
                if (e.target.closest('button') || e.target.closest('input') || e.target.closest('a')) return;
                imageInput.click();
            });
        }
    }

    setupVideoUpload() {
        const videoInput = document.getElementById('videoInput');
        const videoUploadArea = document.getElementById('videoUploadArea');

        if (videoInput) {
            videoInput.addEventListener('change', async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                    await this.handleVideoFile(file);
                }
                e.target.value = '';
            });
        }

        if (videoUploadArea && videoInput) {
            videoUploadArea.addEventListener('click', (e) => {
                if (e.target.closest('button') || e.target.closest('input') || e.target.closest('a')) return;
                videoInput.click();
            });
        }
    }

    /* ============================================================
       =======================  DRAG & DROP  =======================
       ============================================================ */

    setupDragAndDrop() {
        const areas = [
            document.getElementById('imageUploadArea'),
            document.getElementById('videoUploadArea')
        ];

        areas.forEach(area => {
            if (!area) return;

            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                area.addEventListener(eventName, this.preventDefaults);
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                area.addEventListener(eventName, () => this.highlight(area));
            });

            ['dragleave', 'drop'].forEach(eventName => {
                area.addEventListener(eventName, () => this.unhighlight(area));
            });

            area.addEventListener('drop', (e) => this.handleDrop(e, area));
        });
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    highlight(area) {
        area.classList.add('drag-over');
    }

    unhighlight(area) {
        area.classList.remove('drag-over');
    }

    handleDrop(e, area) {
        const dt = e.dataTransfer;
        const files = dt?.files;
        if (!files || files.length === 0) return;

        const file = files[0];

        if (area.id === 'imageUploadArea') {
            this.handleImageFile(file);
        } else if (area.id === 'videoUploadArea') {
            this.handleVideoFile(file);
        }
    }

    /* ============================================================
       =====================  FILE HANDLERS  =======================
       ============================================================ */

    async handleImageFile(file) {
        try {
            window.DeepGuardUtils.validateImageFile(file);
            this.currentImageFile = file;

            // reset video url if needed (indépendant)
            // nothing

            await this.displayImagePreview(file);

            const resultsSection = document.getElementById('imageResults');
            if (resultsSection) {
                resultsSection.style.display = 'block';
                resultsSection.scrollIntoView({ behavior: 'smooth' });
            }

            const fileName = document.getElementById('imageFileName');
            if (fileName) fileName.textContent = file.name;

            const detailedResults = document.getElementById('imageDetailedResults');
            if (detailedResults) detailedResults.style.display = 'none';

            this.resetResultCard('imageResultCard');
        } catch (error) {
            this.showError(error.message);
        }
    }

    async handleVideoFile(file) {
        try {
            window.DeepGuardUtils.validateVideoFile(file);

            // ✅ si on a un fichier local, on reset l'URL
            this.currentVideoFile = file;
            this.currentVideoUrl = null;

            // preview via blob
            this.cleanupVideoResources();
            const previewVideo = document.getElementById('previewVideo');
            if (previewVideo) {
                const videoUrl = URL.createObjectURL(file);
                this._currentVideoObjectUrl = videoUrl;
                previewVideo.src = videoUrl;
                previewVideo.preload = 'metadata';
                previewVideo.muted = true;
                previewVideo.playsInline = true;
                previewVideo.load();
            }

            const resultsSection = document.getElementById('videoResults');
            if (resultsSection) {
                resultsSection.style.display = 'block';
                resultsSection.scrollIntoView({ behavior: 'smooth' });
            }

            const fileName = document.getElementById('videoFileName');
            if (fileName) fileName.textContent = file.name;

            const detailedResults = document.getElementById('videoDetailedResults');
            if (detailedResults) detailedResults.style.display = 'none';

            this.resetResultCard('videoResultCard');
        } catch (error) {
            this.showError(error.message);
        }
    }

    displayImagePreview(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error("Impossible de lire l'image."));
            reader.onload = (e) => {
                const previewImage = document.getElementById('previewImage');
                if (previewImage) {
                    previewImage.src = e.target.result;
                    previewImage.alt = file.name;
                }
                resolve();
            };
            reader.readAsDataURL(file);
        });
    }

    resetResultCard(cardId) {
        const card = document.getElementById(cardId);
        if (!card) return;

        card.innerHTML = `
            <div class="result-placeholder">
                <div style="font-size: 2rem; margin-bottom: 1rem;">🤖</div>
                <p style="color: var(--text-secondary);">Cliquez sur "Analyser" pour démarrer la détection</p>
            </div>
        `;
        card.className = 'result-card';
    }

    /* ============================================================
       ======================  RESET HANDLER  ======================
       ============================================================ */

    reset(type) {
        if (type === 'image') {
            this.currentImageFile = null;

            const previewImage = document.getElementById('previewImage');
            if (previewImage) previewImage.removeAttribute('src');

            const resultsSection = document.getElementById('imageResults');
            if (resultsSection) resultsSection.style.display = 'none';

            const detailed = document.getElementById('imageDetailedResults');
            if (detailed) detailed.style.display = 'none';

            const fileName = document.getElementById('imageFileName');
            if (fileName) fileName.textContent = '';

            const input = document.getElementById('imageInput');
            if (input) input.value = '';

            this.resetResultCard('imageResultCard');
            return;
        }

        if (type === 'video') {
            this.currentVideoFile = null;
            this.currentVideoUrl = null;

            this.cleanupVideoResources();

            const resultsSection = document.getElementById('videoResults');
            if (resultsSection) resultsSection.style.display = 'none';

            const detailed = document.getElementById('videoDetailedResults');
            if (detailed) detailed.style.display = 'none';

            const fileName = document.getElementById('videoFileName');
            if (fileName) fileName.textContent = '';

            const input = document.getElementById('videoInput');
            if (input) input.value = '';

            const urlInput = document.getElementById('videoUrlInput');
            if (urlInput) urlInput.value = '';

            this.resetResultCard('videoResultCard');
        }
    }

    /* ============================================================
       =====================  ANALYZE ACTIONS  =====================
       ============================================================ */

    async analyzeCurrentImage() {
        if (!this.currentImageFile) {
            this.showError('Aucune image sélectionnée');
            return;
        }

        const loadingOverlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');
        const analyzeBtn = document.getElementById('analyzeImageBtn');

        try {
            if (loadingOverlay) loadingOverlay.style.display = 'flex';
            if (loadingText) loadingText.textContent = "Analyse de l'image...";
            if (analyzeBtn) analyzeBtn.disabled = true;

            const result = await window.deepGuardAPI.analyzeImage(this.currentImageFile);
            this.displayImageResult(result);
        } catch (err) {
            this.showError(err.message || "Erreur analyse image.");
        } finally {
            if (loadingOverlay) loadingOverlay.style.display = 'none';
            if (analyzeBtn) analyzeBtn.disabled = false;
        }
    }

    async analyzeCurrentVideo() {
        if (!this.currentVideoFile && !this.currentVideoUrl) {
            this.showError('Aucune vidéo sélectionnée');
            return;
        }

        const loadingOverlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');
        const analyzeBtn = document.getElementById('analyzeVideoBtn');

        try {
            if (loadingOverlay) loadingOverlay.style.display = 'flex';
            if (loadingText) loadingText.textContent = "Analyse de la vidéo...";
            if (analyzeBtn) analyzeBtn.disabled = true;

            let result;
            if (this.currentVideoFile) {
                result = await window.deepGuardAPI.analyzeVideo(this.currentVideoFile);
            } else {
                // ✅ URL -> backend
                result = await window.deepGuardAPI.analyzeVideoUrl(this.currentVideoUrl);
            }

            if (result && (result.success === undefined || result.success === true)) {
                this.displayVideoResult(result);
            } else {
                throw new Error(result?.error || "Échec de l'analyse vidéo");
            }
        } catch (err) {
            this.showError(err.message || "Erreur analyse vidéo.");
        } finally {
            if (loadingOverlay) loadingOverlay.style.display = 'none';
            if (analyzeBtn) analyzeBtn.disabled = false;
        }
    }

    /* ============================================================
       =====================  RESULTS DISPLAY  =====================
       ============================================================ */

    displayImageResult(result) {
        const card = document.getElementById('imageResultCard');
        if (!card) return;

        const isReal = !result.is_deepfake;
        const status = isReal ? 'REAL' : 'FAKE';
        const statusIcon = isReal ? '✅' : '⚠️';
        const confidence = ((result.confidence ?? 0) * 100).toFixed(1);

        card.className = `result-card ${isReal ? 'real' : 'fake'}`;
        card.innerHTML = `
            <div class="result-status">${statusIcon} ${status}</div>
            <div class="result-confidence">${confidence}%</div>
            <p style="color: var(--text-secondary); margin-top: 1rem;">
                ${isReal ? 'Cette image semble authentique' : 'Deepfake détecté'}
            </p>
        `;

        const detailedResults = document.getElementById('imageDetailedResults');
        if (detailedResults) detailedResults.style.display = 'block';
    }

    displayVideoResult(result) {
        const card = document.getElementById('videoResultCard');
        if (!card) return;

        const isReal = !result.is_deepfake;
        const status = isReal ? 'REAL' : 'FAKE';
        const statusIcon = isReal ? '✅' : '⚠️';
        const confidence = ((result.confidence ?? 0) * 100).toFixed(1);

        card.className = `result-card ${isReal ? 'real' : 'fake'}`;
        card.innerHTML = `
            <div class="result-status">${statusIcon} ${status}</div>
            <div class="result-confidence">${confidence}%</div>
            <p style="color: var(--text-secondary); margin-top: 1rem;">
                ${isReal ? 'Cette vidéo semble authentique' : 'Deepfake détecté dans la vidéo'}
            </p>
        `;

        const detailedResults = document.getElementById('videoDetailedResults');
        if (detailedResults) detailedResults.style.display = 'block';
    }

    /* ============================================================
       =====================  NOTIFICATIONS  =======================
       ============================================================ */

    showError(message) { this.showNotification(message, 'error', '❌'); }
    showSuccess(message) { this.showNotification(message, 'success', '✅'); }
    showInfo(message) { this.showNotification(message, 'info', 'ℹ️'); }

    showNotification(message, type = 'info', icon = 'ℹ️') {
        const notification = document.createElement('div');
        const bgColor = type === 'success' ? '#10b981' :
            type === 'error' ? '#ef4444' : '#8b5cf6';

        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 2rem;
            background: ${bgColor};
            color: white;
            padding: 1rem 2rem;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            z-index: 10000;
            animation: slideIn 0.3s ease;
            max-width: 420px;
        `;

        notification.innerHTML = `
            <div style="display:flex; align-items:center; gap:1rem;">
                <span style="font-size:1.2rem;">${icon}</span>
                <span style="flex:1;">${message}</span>
                <button onclick="this.parentElement.parentElement.remove()"
                        style="background:none;border:none;color:white;cursor:pointer;font-size:1.5rem;opacity:.7;">×</button>
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideOut 0.3s ease forwards';
                setTimeout(() => notification.remove(), 300);
            }
        }, 6000);
    }
}

// Initialiser quand le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
    window.uploadHandler = new UploadHandler();
});