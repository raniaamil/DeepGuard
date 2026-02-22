/**
 * DeepGuard Upload Handler - Enhanced Version 2.0
 * Gestion des uploads avec support Grad-CAM et timeline vidéo
 */

class UploadHandler {
    constructor() {
        this.currentImageFile = null;
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

            // Hide explainability sections until analysis
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
        const loadingOverlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');

        try {
            if (!window.DeepGuardUtils.validateImageUrl(url)) {
                throw new Error('Invalid URL format.');
            }

            if (loadingOverlay) loadingOverlay.style.display = 'flex';
            if (loadingText) loadingText.textContent = 'Loading image...';

            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to load image from URL.');

            const blob = await response.blob();
            const filename = window.DeepGuardUtils.getFilenameFromUrl(url) || 'image.jpg';
            const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });

            await this.handleImageFile(file);

            const imageUrlInput = document.getElementById('imageUrlInput');
            if (imageUrlInput) imageUrlInput.value = '';

        } catch (err) {
            this.showError(err.message || 'Error loading image from URL.');
        } finally {
            if (loadingOverlay) loadingOverlay.style.display = 'none';
        }
    }

    async handleVideoUrl(url) {
        const loadingOverlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');

        try {
            if (!window.DeepGuardUtils.validateVideoUrl(url)) {
                throw new Error('Invalid URL format.');
            }

            if (loadingOverlay) loadingOverlay.style.display = 'flex';
            if (loadingText) loadingText.textContent = 'Loading video...';

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

            const videoUrlInput = document.getElementById('videoUrlInput');
            if (videoUrlInput) videoUrlInput.value = '';

        } catch (err) {
            this.showError(err.message || 'Error loading video from URL.');
        } finally {
            if (loadingOverlay) loadingOverlay.style.display = 'none';
        }
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
                resolve();
            };
            reader.readAsDataURL(file);
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // ANALYSIS METHODS
    // ═══════════════════════════════════════════════════════════════════

    async analyzeCurrentImage() {
        if (!this.currentImageFile) {
            this.showError('No image selected.');
            return;
        }

        const loadingOverlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');
        const loadingSubtext = document.getElementById('loadingSubtext');
        const analyzeBtn = document.getElementById('analyzeImageBtn');

        try {
            if (loadingOverlay) loadingOverlay.style.display = 'flex';
            if (loadingText) loadingText.textContent = 'Analyzing image...';
            if (loadingSubtext) loadingSubtext.textContent = 'Generating Grad-CAM heatmap and predictions';
            if (analyzeBtn) analyzeBtn.disabled = true;

            const result = await window.deepGuardAPI.analyzeImage(this.currentImageFile, true);
            
            // Display results using the results display module
            window.resultsDisplay.displayImageResults(result);

        } catch (err) {
            this.showError(err.message || 'Image analysis error.');
        } finally {
            if (loadingOverlay) loadingOverlay.style.display = 'none';
            if (analyzeBtn) analyzeBtn.disabled = false;
        }
    }

    async analyzeCurrentVideo() {
        if (!this.currentVideoFile && !this.currentVideoUrl) {
            this.showError('No video selected.');
            return;
        }

        const loadingOverlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');
        const loadingSubtext = document.getElementById('loadingSubtext');
        const analyzeBtn = document.getElementById('analyzeVideoBtn');

        try {
            if (loadingOverlay) loadingOverlay.style.display = 'flex';
            if (loadingText) loadingText.textContent = 'Analyzing video...';
            if (loadingSubtext) loadingSubtext.textContent = 'Extracting frames and detecting faces';
            if (analyzeBtn) analyzeBtn.disabled = true;

            let result;
            if (this.currentVideoFile) {
                result = await window.deepGuardAPI.analyzeVideo(this.currentVideoFile, 30, true);
            } else {
                result = await window.deepGuardAPI.analyzeVideoUrl(this.currentVideoUrl, 30, true);
            }

            if (result && result.success !== false) {
                window.resultsDisplay.displayVideoResults(result);
            } else {
                throw new Error(result?.error || 'Video analysis failed.');
            }

        } catch (err) {
            this.showError(err.message || 'Video analysis error.');
        } finally {
            if (loadingOverlay) loadingOverlay.style.display = 'none';
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
                <div style="font-size: 2.5rem; margin-bottom: 1rem;">🤖</div>
                <p>Click "Analyze" to start detection</p>
            </div>
        `;
    }

    reset(type) {
        if (type === 'image') {
            this.currentImageFile = null;
            const previewImage = document.getElementById('previewImage');
            if (previewImage) previewImage.removeAttribute('src');
            
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
