/**
 * DeepGuard Upload Handler
 * Gestion des uploads et drag & drop + URL + previews robustes
 */

class UploadHandler {
    constructor() {
        this.currentImageFile = null;
        this.currentVideoFile = null;

        // Pour éviter les fuites mémoire côté vidéo
        this._currentVideoObjectUrl = null;

        this.init();
    }

    init() {
        this.setupImageUpload();
        this.setupVideoUpload();
        this.setupDragAndDrop();
        this.setupUrlUploads();
    }

    /* ============================================================
       ===============  URL UPLOADS (Image / Video)  ===============
       ============================================================ */

    setupUrlUploads() {
        // Image URL
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

    getProxiedUrl(url) {
        // Proxy simple (le plus stable en général)
        return `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    }

    async fetchWithProxy(url, options = {}) {
        const proxies = [
            `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
            `https://corsproxy.io/?${encodeURIComponent(url)}`
        ];

        // 1) Essai direct (souvent échoue à cause CORS)
        try {
            const resp = await fetch(url, { mode: 'cors', ...options });
            if (resp.ok) return resp;
        } catch (_) {
            // ignore
        }

        // 2) Essai via proxies
        for (const proxyUrl of proxies) {
            try {
                const resp = await fetch(proxyUrl, options);
                if (resp.ok) return resp;
            } catch (_) {
                // ignore
            }
        }

        throw new Error("Impossible de télécharger le fichier (CORS / URL invalide).");
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

    extractVideoUrlFromHtml(html, baseUrl) {
        const patterns = [
            /<video[^>]+src="([^"]+)"/i,
            /<source[^>]+src="([^"]+)"[^>]+type="video\/[^"]+"/i,
            /"contentUrl":"([^"]+\.(mp4|webm|ogg))"/i,
            /"video"[^}]+"url":"([^"]+)"/i
        ];

        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match && match[1]) {
                let videoUrl = match[1];
                if (videoUrl.startsWith('/')) {
                    try {
                        const urlObj = new URL(baseUrl);
                        videoUrl = `${urlObj.protocol}//${urlObj.host}${videoUrl}`;
                    } catch (_) {}
                }
                return videoUrl;
            }
        }
        return null;
    }

    async handleImageUrl(url) {
        const loadingOverlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');

        try {
            if (loadingOverlay) loadingOverlay.style.display = 'flex';
            if (loadingText) loadingText.textContent = "Chargement de l'image...";

            const response = await this.fetchWithProxy(url);
            const blob = await response.blob();

            if (!blob.type.startsWith('image/')) {
                throw new Error("L'URL ne pointe pas vers une image valide.");
            }

            const filename = window.DeepGuardUtils?.getFilenameFromUrl?.(url) || 'image-from-url.jpg';
            const file = new File([blob], filename, { type: blob.type });

            await this.handleImageFile(file);

            const imageUrlInput = document.getElementById('imageUrlInput');
            if (imageUrlInput) imageUrlInput.value = '';

            this.showSuccess("Image chargée depuis l'URL !");
        } catch (err) {
            console.error('URL image error:', err);
            this.showError(err.message || "Erreur lors du chargement de l'image.");
        } finally {
            if (loadingOverlay) loadingOverlay.style.display = 'none';
        }
    }

    async handleVideoUrl(url) {
        const loadingOverlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');

        try {
            if (loadingOverlay) loadingOverlay.style.display = 'flex';
            if (loadingText) loadingText.textContent = "Chargement de la vidéo...";

            const platform = this.detectPlatform(url);
            const isDirect = this.isDirectVideoUrl(url);

            if (platform !== 'unknown' && !isDirect) {
                // Les plateformes ne fournissent pas des liens directs mp4 utilisables en fetch CORS
                this.showInfo(
                    `${platform.toUpperCase()} détecté : utilise un lien direct (.mp4/.webm) ou télécharge la vidéo en local.`
                );
                throw new Error("Lien de plateforme non supporté directement.");
            }

            const response = await this.fetchWithProxy(url);

            const contentType = response.headers.get('content-type') || '';
            if (contentType.startsWith('video/')) {
                const videoBlob = await response.blob();
                const filename = window.DeepGuardUtils?.getFilenameFromUrl?.(url) || 'video.mp4';
                const file = new File([videoBlob], filename, { type: videoBlob.type || 'video/mp4' });

                await this.handleVideoFile(file);

                const videoUrlInput = document.getElementById('videoUrlInput');
                if (videoUrlInput) videoUrlInput.value = '';

                this.showSuccess("Vidéo chargée depuis l'URL !");
                return;
            }

            // Si pas une vidéo directe, tenter extraction depuis HTML
            const html = await response.text();
            const extracted = this.extractVideoUrlFromHtml(html, url);
            if (extracted) {
                return await this.handleVideoUrl(extracted);
            }

            throw new Error("Aucune vidéo directe trouvée. Utilise un lien .mp4/.webm.");
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
                // ✅ IMPORTANT : permet de re-sélectionner le même fichier sans bug
                e.target.value = '';
            });
        }

        if (imageUploadArea && imageInput) {
            imageUploadArea.addEventListener('click', (e) => {
                // ✅ Évite le double click déclenché par le bouton interne (qui fait déjà click())
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
                // ✅ IMPORTANT : permet de re-sélectionner le même fichier sans bug
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

            await this.displayImagePreview(file);

            const resultsSection = document.getElementById('imageResults');
            if (resultsSection) {
                resultsSection.style.display = 'block';
                resultsSection.scrollIntoView({ behavior: 'smooth' });
            }

            this.updateImageFileInfo(file);

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
            this.currentVideoFile = file;

            // ✅ Preview beaucoup plus robuste
            try {
                await this.displayVideoPreview(file);
            } catch (previewError) {
                console.warn('Video preview failed:', previewError);
                this.showInfo("Vidéo chargée, mais aperçu indisponible sur ce navigateur. Tu peux quand même analyser.");
            }

            const resultsSection = document.getElementById('videoResults');
            if (resultsSection) {
                resultsSection.style.display = 'block';
                resultsSection.scrollIntoView({ behavior: 'smooth' });
            }

            this.updateVideoFileInfo(file);

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

    /**
     * Preview vidéo robuste :
     * - revoke ancien blob
     * - écoute loadedmetadata/loadeddata/canplay + fallback timeout
     * - petit play() silencieux pour forcer l'affichage sur certains navigateurs
     */
    displayVideoPreview(file) {
        return new Promise((resolve, reject) => {
            const previewVideo = document.getElementById('previewVideo');
            if (!previewVideo) return resolve();

            try {
                // Clean ancienne ressource
                this.cleanupVideoResources();

                const videoUrl = URL.createObjectURL(file);
                this._currentVideoObjectUrl = videoUrl;

                previewVideo.src = videoUrl;
                previewVideo.preload = 'metadata';
                previewVideo.muted = true;         // aide les autoplay policies
                previewVideo.playsInline = true;

                let done = false;
                const finishOk = () => {
                    if (done) return;
                    done = true;
                    resolve();
                };
                const finishErr = (msg) => {
                    if (done) return;
                    done = true;
                    reject(new Error(msg || "Erreur lors du chargement de la vidéo."));
                };

                const onLoadedMeta = async () => {
                    // Avance très légèrement pour afficher une frame sur certains fichiers
                    try {
                        if (previewVideo.duration && previewVideo.duration > 0) {
                            previewVideo.currentTime = Math.min(0.1, previewVideo.duration / 10);
                        }
                    } catch (_) {}

                    // Essai play/pause silencieux (ignore si interdit)
                    try {
                        await previewVideo.play();
                        previewVideo.pause();
                    } catch (_) {}

                    // Si on a metadata c'est déjà bon pour rassurer l'utilisateur
                    finishOk();
                };

                const onLoadedData = () => finishOk();
                const onCanPlay = () => finishOk();
                const onError = () => finishErr("Impossible de prévisualiser la vidéo (format ou codec non supporté).");

                previewVideo.addEventListener('loadedmetadata', onLoadedMeta, { once: true });
                previewVideo.addEventListener('loadeddata', onLoadedData, { once: true });
                previewVideo.addEventListener('canplay', onCanPlay, { once: true });
                previewVideo.addEventListener('error', onError, { once: true });

                previewVideo.load();

                // Timeout de sécurité : on n'empêche pas l'analyse si preview capricieuse
                setTimeout(() => {
                    if (done) return;
                    if (previewVideo.readyState >= 1) finishOk();
                    else finishErr("Timeout preview vidéo.");
                }, 12000);

            } catch (err) {
                reject(err);
            }
        });
    }

    cleanupVideoResources() {
        const previewVideo = document.getElementById('previewVideo');

        // revoke via store
        if (this._currentVideoObjectUrl) {
            try { URL.revokeObjectURL(this._currentVideoObjectUrl); } catch (_) {}
            this._currentVideoObjectUrl = null;
        }

        // revoke via element.src (si jamais)
        if (previewVideo && previewVideo.src && previewVideo.src.startsWith('blob:')) {
            try { URL.revokeObjectURL(previewVideo.src); } catch (_) {}
        }

        if (previewVideo) {
            previewVideo.removeAttribute('src');
            previewVideo.load();
        }
    }

    updateImageFileInfo(file) {
        const fileName = document.getElementById('imageFileName');
        if (fileName) fileName.textContent = file.name;
    }

    updateVideoFileInfo(file) {
        const fileName = document.getElementById('videoFileName');
        if (fileName) fileName.textContent = file.name;
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

    /**
     * Reset UI & state (appelé depuis app.html)
     * type: 'image' | 'video'
     */
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

            this.cleanupVideoResources();

            const resultsSection = document.getElementById('videoResults');
            if (resultsSection) resultsSection.style.display = 'none';

            const detailed = document.getElementById('videoDetailedResults');
            if (detailed) detailed.style.display = 'none';

            const fileName = document.getElementById('videoFileName');
            if (fileName) fileName.textContent = '';

            const input = document.getElementById('videoInput');
            if (input) input.value = '';

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
        if (!this.currentVideoFile) {
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

            const result = await window.deepGuardAPI.analyzeVideo(this.currentVideoFile);

            // Certains backends renvoient directement {is_deepfake,...} sans success
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

        this.displayDetailedImageResults(result);
    }

    displayDetailedImageResults(result) {
        const confidence = document.getElementById('imageConfidence');
        if (confidence) confidence.textContent = `${((result.confidence ?? 0) * 100).toFixed(1)}%`;

        const probReal = document.getElementById('probReal');
        const probFake = document.getElementById('probFake');
        const probRealValue = document.getElementById('probRealValue');
        const probFakeValue = document.getElementById('probFakeValue');

        const realProb = ((result.probabilities?.real ?? 0) * 100);
        const fakeProb = ((result.probabilities?.fake ?? 0) * 100);

        if (probReal) probReal.style.width = `${realProb}%`;
        if (probFake) probFake.style.width = `${fakeProb}%`;
        if (probRealValue) probRealValue.textContent = `${realProb.toFixed(1)}%`;
        if (probFakeValue) probFakeValue.textContent = `${fakeProb.toFixed(1)}%`;

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

        this.displayDetailedVideoResults(result);
    }

    displayDetailedVideoResults(result) {
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