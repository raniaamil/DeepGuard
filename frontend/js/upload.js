/**
 * DeepGuard Upload Handler 
 */

class UploadHandler {
    constructor() {
        this.currentImageFile = null;
        this.currentImageUrl = null;
        this.currentVideoFile = null;
        this.currentVideoUrl = null;
        this._currentVideoObjectUrl = null;
        this._progressInterval = null;
        this._previewToken = null;
        this.init();
    }

    t(key) {
        return window.i18n ? window.i18n.t(key) : key;
    }

    init() {
        this.setupImageUpload();
        this.setupVideoUpload();
        this.setupDragAndDrop();
        this.setupUrlUploads();
        this.setupAnalyzeButtons();
    }

    // ═══════════════════════════════════════════════════════════════════
    // SETUP METHODS
    // ═══════════════════════════════════════════════════════════════════

    setupAnalyzeButtons() {
        const analyzeImageBtn = document.getElementById('analyzeImageBtn');
        if (analyzeImageBtn) {
            analyzeImageBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.analyzeCurrentImage();
            });
        }

        const analyzeVideoBtn = document.getElementById('analyzeVideoBtn');
        if (analyzeVideoBtn) {
            analyzeVideoBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.analyzeCurrentVideo();
            });
        }
    }

    setupImageUpload() {
        const imageInput = document.getElementById('imageInput');
        const imageUploadArea = document.getElementById('imageUploadArea');

        if (imageInput) {
            imageInput.addEventListener('change', async (e) => {
                const file = e.target.files?.[0];
                if (file) await this.handleImageFile(file);
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
                if (file) await this.handleVideoFile(file);
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

    setupDragAndDrop() {
        const areas = [
            document.getElementById('imageUploadArea'),
            document.getElementById('videoUploadArea')
        ];

        areas.forEach((area) => {
            if (!area) return;

            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
                area.addEventListener(eventName, this.preventDefaults);
            });

            ['dragenter', 'dragover'].forEach((eventName) => {
                area.addEventListener(eventName, () => area.classList.add('drag-over'));
            });

            ['dragleave', 'drop'].forEach((eventName) => {
                area.addEventListener(eventName, () => area.classList.remove('drag-over'));
            });

            area.addEventListener('drop', (e) => this.handleDrop(e, area));
        });
    }

    setupUrlUploads() {
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

    // ═══════════════════════════════════════════════════════════════════
    // PROGRESS BAR
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Show loading overlay with animated progress bar
     * @param {string} type - 'image' or 'video'
     */
    showProgress(type) {
        const overlay = document.getElementById('loadingOverlay');
        if (!overlay) return;

        const isVideo = type === 'video';
        const title = this.t('loading_analyzing');
        const subtitle = isVideo ? this.t('loading_video') : this.t('loading_image');

        // Steps for the progress bar
        const steps = isVideo
            ? [
                { key: 'loading_step_upload', fallback: 'Uploading video...' },
                { key: 'loading_step_extracting', fallback: 'Extracting frames...' },
                { key: 'loading_step_faces', fallback: 'Detecting faces...' },
                { key: 'loading_step_analyzing', fallback: 'Analyzing frames...' },
                { key: 'loading_step_generating', fallback: 'Generating results...' }
              ]
            : [
                { key: 'loading_step_upload', fallback: 'Uploading image...' },
                { key: 'loading_step_processing', fallback: 'Processing image...' },
                { key: 'loading_step_gradcam', fallback: 'Generating Grad-CAM...' },
                { key: 'loading_step_generating', fallback: 'Generating results...' }
              ];

        overlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <h3 id="loadingText">${title}</h3>
                <p id="loadingSubtext">${subtitle}</p>
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill" id="progressFill"></div>
                    </div>
                    <div class="progress-info">
                        <span class="progress-step" id="progressStep">${this.t(steps[0].key) || steps[0].fallback}</span>
                        <span class="progress-percent" id="progressPercent">0%</span>
                    </div>
                </div>
                <p class="progress-reassurance" id="progressReassurance">${this.t('loading_dont_leave')}</p>
            </div>
        `;

        overlay.style.display = 'flex';

        // Animate progress
        this._startProgressAnimation(steps, isVideo);
    }

    /**
     * Simulated progress animation that matches typical processing time
     */
    _startProgressAnimation(steps, isVideo) {
        // Clear any existing interval
        if (this._progressInterval) {
            clearInterval(this._progressInterval);
        }

        const totalDuration = isVideo ? 30000 : 8000; // 30s video, 8s image
        const startTime = Date.now();
        let currentStepIndex = 0;

        const fillEl = document.getElementById('progressFill');
        const stepEl = document.getElementById('progressStep');
        const percentEl = document.getElementById('progressPercent');
        const reassuranceEl = document.getElementById('progressReassurance');

        if (!fillEl) return;

        this._progressInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            // Use an easing curve: fast at start, slows down approaching 90%
            // Never reaches 100% until hideProgress() is called
            const linearProgress = Math.min(elapsed / totalDuration, 1);
            const easedProgress = 1 - Math.pow(1 - linearProgress, 0.4);
            const percent = Math.min(Math.round(easedProgress * 90), 90);

            if (fillEl) fillEl.style.width = `${percent}%`;
            if (percentEl) percentEl.textContent = `${percent}%`;

            // Update step text based on progress
            const stepProgress = percent / 90;
            const newStepIndex = Math.min(
                Math.floor(stepProgress * steps.length),
                steps.length - 1
            );

            if (newStepIndex !== currentStepIndex) {
                currentStepIndex = newStepIndex;
                if (stepEl) {
                    stepEl.style.opacity = '0';
                    setTimeout(() => {
                        stepEl.textContent = this.t(steps[currentStepIndex].key) || steps[currentStepIndex].fallback;
                        stepEl.style.opacity = '1';
                    }, 200);
                }
            }

            // Show reassurance messages for long waits
            if (reassuranceEl && isVideo) {
                if (elapsed > 15000 && elapsed < 15500) {
                    reassuranceEl.textContent = this.t('loading_almost_there');
                } else if (elapsed > 25000 && elapsed < 25500) {
                    reassuranceEl.textContent = this.t('loading_final_steps');
                }
            }

        }, 100);
    }

    /**
     * Complete progress to 100% and hide overlay
     */
    hideProgress() {
        if (this._progressInterval) {
            clearInterval(this._progressInterval);
            this._progressInterval = null;
        }

        const fillEl = document.getElementById('progressFill');
        const percentEl = document.getElementById('progressPercent');
        const stepEl = document.getElementById('progressStep');

        if (fillEl) fillEl.style.width = '100%';
        if (percentEl) percentEl.textContent = '100%';
        if (stepEl) stepEl.textContent = this.t('loading_step_done') || 'Done!';

        // Short delay to show 100% before hiding
        setTimeout(() => {
            const overlay = document.getElementById('loadingOverlay');
            if (overlay) overlay.style.display = 'none';
        }, 400);
    }

    // ═══════════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════════════

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleDrop(e, area) {
        const files = e.dataTransfer?.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        if (area.id === 'imageUploadArea') {
            this.handleImageFile(file);
        } else if (area.id === 'videoUploadArea') {
            this.handleVideoFile(file);
        }
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

    // ═══════════════════════════════════════════════════════════════════
    // FILE HANDLERS
    // ═══════════════════════════════════════════════════════════════════

    async handleImageFile(file) {
        try {
            window.DeepGuardUtils.validateImageFile(file);
            this.currentImageFile = file;
            this.currentImageUrl = null;

            await this.displayImagePreview(file);

            const resultsSection = document.getElementById('imageResults');
            if (resultsSection) {
                resultsSection.style.display = 'block';
                resultsSection.scrollIntoView({ behavior: 'smooth' });
            }

            const fileName = document.getElementById('imageFileName');
            if (fileName) fileName.textContent = file.name;

            const fileSize = document.getElementById('imageFileSize');
            if (fileSize) fileSize.textContent = window.DeepGuardUtils.formatFileSize(file.size);

            this.hideExplainabilitySections('image');
            this.resetResultCard('imageResultCard');

        } catch (error) {
            this.showError(error.message);
        }
    }

    async handleVideoFile(file) {
        try {
            window.DeepGuardUtils.validateVideoFile(file);

            this.currentVideoFile = file;
            this.currentVideoUrl = null;

            this.cleanupVideoResources();

            const previewVideo = document.getElementById('previewVideo');
            if (previewVideo) {
                const videoUrl = URL.createObjectURL(file);
                this._currentVideoObjectUrl = videoUrl;
                previewVideo.src = videoUrl;
                previewVideo.load();
            }

            const resultsSection = document.getElementById('videoResults');
            if (resultsSection) {
                resultsSection.style.display = 'block';
                resultsSection.scrollIntoView({ behavior: 'smooth' });
            }

            const fileName = document.getElementById('videoFileName');
            if (fileName) fileName.textContent = file.name;

            const fileSize = document.getElementById('videoFileSize');
            if (fileSize) fileSize.textContent = window.DeepGuardUtils.formatFileSize(file.size);

            this.hideExplainabilitySections('video');
            this.resetResultCard('videoResultCard');

        } catch (error) {
            this.showError(error.message);
        }
    }

    async handleImageUrl(url) {
        try {
            if (!window.DeepGuardUtils.validateImageUrl(url)) {
                throw new Error(this.t('error_invalid_url'));
            }

            // Aucun fetch() direct vers le site source : la plupart des sites
            // n'exposent pas Access-Control-Allow-Origin, ce qui faisait
            // échouer la lecture côté navigateur. C'est le backend qui
            // télécharge l'image (serveur à serveur, hors contexte CORS) au
            // moment de l'analyse, sur le modèle de handleVideoUrl.
            this.currentImageFile = null;
            this.currentImageUrl = url;

            // Aperçu provisoire : tentative de chargement direct, avec repli
            // sur le placeholder si le site refuse le hotlinking.
            this.tryDirectImagePreview(url);

            const resultsSection = document.getElementById('imageResults');
            if (resultsSection) {
                resultsSection.style.display = 'block';
                resultsSection.scrollIntoView({ behavior: 'smooth' });
            }

            const fileName = document.getElementById('imageFileName');
            if (fileName) {
                fileName.textContent = window.DeepGuardUtils.getImageLabelFromUrl(
                    url,
                    this.t('result_image_from_url')
                );
            }

            const fileSize = document.getElementById('imageFileSize');
            if (fileSize) fileSize.textContent = '—';

            this.hideExplainabilitySections('image');
            this.resetResultCard('imageResultCard');

            const imageUrlInput = document.getElementById('imageUrlInput');
            if (imageUrlInput) imageUrlInput.value = '';

        } catch (err) {
            this.hideProgress();
            this.showError(err.message || this.t('error_load_image'));
        }
    }

    async handleVideoUrl(url) {
        try {
            if (!window.DeepGuardUtils.validateVideoUrl(url)) {
                throw new Error(this.t('error_invalid_url'));
            }

            this.showProgress('video');

            this.currentVideoFile = null;
            this.currentVideoUrl = url;

            this.cleanupVideoResources();

            const previewVideo = document.getElementById('previewVideo');
            if (previewVideo) {
                previewVideo.src = url;
                previewVideo.load();
            }

            const resultsSection = document.getElementById('videoResults');
            if (resultsSection) {
                resultsSection.style.display = 'block';
                resultsSection.scrollIntoView({ behavior: 'smooth' });
            }

            const fileName = document.getElementById('videoFileName');
            if (fileName) fileName.textContent = window.DeepGuardUtils.getFilenameFromUrl(url);

            this.hideExplainabilitySections('video');
            this.resetResultCard('videoResultCard');

            this.hideProgress();

            const videoUrlInput = document.getElementById('videoUrlInput');
            if (videoUrlInput) videoUrlInput.value = '';

        } catch (err) {
            this.hideProgress();
            this.showError(err.message || this.t('error_load_video'));
        }
    }

    /**
     * Bascule entre l'aperçu <img> et le placeholder "aperçu après analyse".
     * Sans src, le navigateur afficherait une icône d'image cassée.
     */
    showImagePlaceholder(show) {
        const previewImage = document.getElementById('previewImage');
        const placeholder = document.getElementById('previewImagePlaceholder');

        if (previewImage) previewImage.style.display = show ? 'none' : '';
        if (placeholder) placeholder.style.display = show ? 'flex' : 'none';
    }

    /**
     * Tente d'afficher directement l'URL dans le <img> avant l'analyse.
     *
     * Une balise <img> n'est pas soumise à la même politique que fetch() : le
     * chargement réussit sur beaucoup de sites qui n'exposent pas
     * Access-Control-Allow-Origin. En cas d'échec (hotlink protection, 403,
     * URL non-image), onerror bascule proprement sur le placeholder plutôt
     * que de laisser l'icône d'image cassée.
     *
     * L'aperçu définitif reste celui renvoyé par l'API (image_base64) : c'est
     * lui qui garantit que l'on montre exactement les octets analysés.
     */
    tryDirectImagePreview(url) {
        const previewImage = document.getElementById('previewImage');
        if (!previewImage) return;

        // Jeton anti-concurrence : si une autre URL est saisie pendant le
        // chargement, la réponse tardive de la précédente est ignorée.
        const token = Symbol('preview');
        this._previewToken = token;

        this.showImagePlaceholder(true);

        const probe = new Image();
        probe.onload = () => {
            if (this._previewToken !== token) return;
            previewImage.src = url;
            previewImage.alt = this.t('result_image_from_url');
            this.showImagePlaceholder(false);
        };
        probe.onerror = () => {
            if (this._previewToken !== token) return;
            previewImage.removeAttribute('src');
            this.showImagePlaceholder(true);
        };
        probe.src = url;
    }

    displayImagePreview(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('Failed to read image.'));
            reader.onload = (e) => {
                const previewImage = document.getElementById('previewImage');
                if (previewImage) {
                    previewImage.src = e.target.result;
                    previewImage.alt = file.name;
                }
                // Une éventuelle tentative d'aperçu par URL encore en vol ne
                // doit pas écraser l'aperçu du fichier choisi ensuite.
                this._previewToken = null;
                this.showImagePlaceholder(false);
                resolve();
            };
            reader.readAsDataURL(file);
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // ANALYSIS METHODS (with progress bar)
    // ═══════════════════════════════════════════════════════════════════

    async analyzeCurrentImage() {
        if (!this.currentImageFile && !this.currentImageUrl) {
            this.showError(this.t('error_no_image'));
            return;
        }

        const analyzeBtn = document.getElementById('analyzeImageBtn');

        try {
            if (analyzeBtn) analyzeBtn.disabled = true;
            this.showProgress('image');

            let result;
            if (this.currentImageFile) {
                result = await window.deepGuardAPI.analyzeImage(this.currentImageFile, true);
            } else {
                result = await window.deepGuardAPI.analyzeImageUrl(this.currentImageUrl, true);

                // L'aperçu vient de l'image renvoyée par le backend : le
                // navigateur n'a jamais à requêter le site source.
                if (result.image_base64) {
                    const previewImage = document.getElementById('previewImage');
                    if (previewImage) {
                        const mime = result.image_mime || 'image/jpeg';
                        // Remplace l'aperçu provisoire : ces octets sont
                        // exactement ceux qui ont été analysés.
                        this._previewToken = null;
                        previewImage.src = `data:${mime};base64,${result.image_base64}`;
                        this.showImagePlaceholder(false);
                    }
                }

                const fileSize = document.getElementById('imageFileSize');
                if (fileSize && result.file_size_kb) {
                    fileSize.textContent = window.DeepGuardUtils.formatFileSize(result.file_size_kb * 1024);
                }
            }

            this.hideProgress();
            window.resultsDisplay.displayImageResults(result);

        } catch (err) {
            this.hideProgress();
            this.showError(err.message || this.t('error_analysis_image'));
        } finally {
            if (analyzeBtn) analyzeBtn.disabled = false;
        }
    }

    async analyzeCurrentVideo() {
        if (!this.currentVideoFile && !this.currentVideoUrl) {
            this.showError(this.t('error_no_video'));
            return;
        }

        const analyzeBtn = document.getElementById('analyzeVideoBtn');

        try {
            if (analyzeBtn) analyzeBtn.disabled = true;
            this.showProgress('video');

            let result;
            if (this.currentVideoFile) {
                result = await window.deepGuardAPI.analyzeVideo(this.currentVideoFile, 30, true);
            } else {
                result = await window.deepGuardAPI.analyzeVideoUrl(this.currentVideoUrl, 30, true);
            }

            this.hideProgress();

            if (result && result.success !== false) {
                window.resultsDisplay.displayVideoResults(result);
            } else {
                throw new Error(result?.error || this.t('error_analysis_video'));
            }

        } catch (err) {
            this.hideProgress();
            this.showError(err.message || this.t('error_analysis_video'));
        } finally {
            if (analyzeBtn) analyzeBtn.disabled = false;
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // UI HELPERS
    // ═══════════════════════════════════════════════════════════════════

    hideExplainabilitySections(type) {
        const sections = type === 'image'
            ? ['imageExplainability', 'imageModelMetrics']
            : ['videoTimeline', 'videoSuspiciousFrames', 'videoAnalysisStats', 'videoModelMetrics'];

        sections.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
    }

    resetResultCard(cardId) {
        const card = document.getElementById(cardId);
        if (!card) return;

        card.className = 'result-card';
        card.innerHTML = `
            <div class="result-placeholder">
                <div class="placeholder-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <rect width="18" height="10" x="3" y="11" rx="2"/>
                        <circle cx="12" cy="5" r="2"/>
                        <path d="M12 7v4"/>
                        <circle cx="8" cy="16" r="1" fill="currentColor"/>
                        <circle cx="16" cy="16" r="1" fill="currentColor"/>
                    </svg>
                </div>
                <p>${this.t('result_placeholder')}</p>
            </div>
        `;
    }

    reset(type) {
        if (type === 'image') {
            this.currentImageFile = null;
            this.currentImageUrl = null;
            this._previewToken = null;
            const previewImage = document.getElementById('previewImage');
            if (previewImage) previewImage.removeAttribute('src');
            this.showImagePlaceholder(true);

            const resultsSection = document.getElementById('imageResults');
            if (resultsSection) resultsSection.style.display = 'none';
            
            this.hideExplainabilitySections('image');
            this.resetResultCard('imageResultCard');
        }

        if (type === 'video') {
            this.currentVideoFile = null;
            this.currentVideoUrl = null;
            this.cleanupVideoResources();
            
            const resultsSection = document.getElementById('videoResults');
            if (resultsSection) resultsSection.style.display = 'none';
            
            this.hideExplainabilitySections('video');
            this.resetResultCard('videoResultCard');
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // NOTIFICATIONS
    // ═══════════════════════════════════════════════════════════════════

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type = 'info') {
        const bgColor = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#8b5cf6';

        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 90px;
            right: 2rem;
            background: ${bgColor};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            z-index: 10000;
            animation: slideIn 0.3s ease;
            max-width: 400px;
            font-size: 0.95rem;
        `;

        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem;">
                <span style="flex: 1;">${message}</span>
                <button onclick="this.parentElement.parentElement.remove()"
                    style="background: none; border: none; color: white; cursor: pointer; font-size: 1.25rem; opacity: 0.8;">×</button>
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideOut 0.3s ease forwards';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.uploadHandler = new UploadHandler();
});
