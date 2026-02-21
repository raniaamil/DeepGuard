/**
 * DeepGuard Upload Handler
 * Upload local + URL (image & video) + previews robustes + analyze + reset
 *
 * - Images URL: téléchargement côté front (via proxy si besoin) -> File normalisé -> analyse OK
 * - Vidéos URL: preview direct <video src=url> + analyse via backend (/predict/video/url) pour éviter CORS
 */

class UploadHandler {
  constructor() {
    this.currentImageFile = null;

    // Vidéo peut être soit un File, soit une URL
    this.currentVideoFile = null;
    this.currentVideoUrl = null;

    // Pour éviter les fuites mémoire côté vidéo blob
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

  /* ============================================================
     =====================  BUTTONS  =============================
     ============================================================ */

  setupAnalyzeButtons() {
    const analyzeImageBtn = document.getElementById("analyzeImageBtn");
    if (analyzeImageBtn) {
      analyzeImageBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.analyzeCurrentImage();
      });
    }

    const analyzeVideoBtn = document.getElementById("analyzeVideoBtn");
    if (analyzeVideoBtn) {
      analyzeVideoBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.analyzeCurrentVideo();
      });
    }
  }

  setupResetButtons() {
    const resetImageBtn = document.getElementById("resetImageBtn");
    if (resetImageBtn) {
      resetImageBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.reset("image");
      });
    }

    const resetVideoBtn = document.getElementById("resetVideoBtn");
    if (resetVideoBtn) {
      resetVideoBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.reset("video");
      });
    }
  }

  /* ============================================================
     =====================  HELPERS  =============================
     ============================================================ */

  getExtension(name = "") {
    const m = name.toLowerCase().match(/\.([a-z0-9]+)$/i);
    return m ? `.${m[1]}` : "";
  }

  extFromImageMime(mime = "") {
    const m = (mime || "").toLowerCase();
    if (m === "image/jpeg") return ".jpg";
    if (m === "image/png") return ".png";
    if (m === "image/webp") return ".webp";
    if (m === "image/bmp") return ".bmp";
    if (m === "image/gif") return ".gif";
    return ".jpg";
  }

  normalizeFilename(baseName, desiredExt) {
    const ext = this.getExtension(baseName);
    if (!ext) return `${baseName}${desiredExt}`;
    return baseName;
  }

  createFileFromBlob({ blob, url, fallbackKind }) {
    const utils = window.DeepGuardUtils;

    const rawName =
      (utils && typeof utils.getFilenameFromUrl === "function"
        ? utils.getFilenameFromUrl(url)
        : null) || (fallbackKind === "video" ? "video" : "image");

    const blobType = (blob.type || "").toLowerCase();

    if (fallbackKind === "image") {
      const desiredExt = this.extFromImageMime(blobType || "image/jpeg");
      const filename = this.normalizeFilename(rawName, desiredExt);

      const type = blobType && blobType.startsWith("image/") ? blobType : "image/jpeg";
      return new File([blob], filename, { type });
    }

    // fallback generic
    return new File([blob], rawName, { type: blobType || "application/octet-stream" });
  }

  async fetchWithProxy(url, options = {}) {
    const proxies = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      `https://corsproxy.io/?${encodeURIComponent(url)}`,
    ];

    // 1) Essai direct (peut échouer CORS)
    try {
      const resp = await fetch(url, { mode: "cors", ...options });
      if (resp.ok) return resp;
    } catch (_) {}

    // 2) Essai via proxies
    for (const proxyUrl of proxies) {
      try {
        const resp = await fetch(proxyUrl, options);
        if (resp.ok) return resp;
      } catch (_) {}
    }

    throw new Error("Impossible de télécharger le fichier (CORS / URL invalide).");
  }

  isDirectVideoUrl(url) {
    return /\.(mp4|webm|ogg|mov|avi|mkv|flv|wmv)(\?.*)?$/i.test(url);
  }

  detectPlatform(url) {
    const u = url.toLowerCase();
    if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
    if (u.includes("vimeo.com")) return "vimeo";
    if (u.includes("dailymotion.com") || u.includes("dai.ly")) return "dailymotion";
    if (u.includes("tiktok.com")) return "tiktok";
    if (u.includes("twitter.com") || u.includes("x.com")) return "twitter";
    if (u.includes("instagram.com")) return "instagram";
    if (u.includes("facebook.com")) return "facebook";
    return "unknown";
  }

  cleanupVideoResources() {
    const previewVideo = document.getElementById("previewVideo");

    if (this._currentVideoObjectUrl) {
      try {
        URL.revokeObjectURL(this._currentVideoObjectUrl);
      } catch (_) {}
      this._currentVideoObjectUrl = null;
    }

    if (previewVideo && previewVideo.src && previewVideo.src.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(previewVideo.src);
      } catch (_) {}
    }

    if (previewVideo) {
      previewVideo.removeAttribute("src");
      previewVideo.load();
    }
  }

  /* ============================================================
     ===============  URL UPLOADS (Image / Video)  ===============
     ============================================================ */

  setupUrlUploads() {
    // Image URL
    const loadImageUrlBtn = document.getElementById("loadImageUrl");
    const imageUrlInput = document.getElementById("imageUrlInput");

    if (loadImageUrlBtn && imageUrlInput) {
      loadImageUrlBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        const url = imageUrlInput.value.trim();
        if (url) await this.handleImageUrl(url);
      });

      imageUrlInput.addEventListener("keypress", async (e) => {
        if (e.key === "Enter") {
          const url = e.target.value.trim();
          if (url) await this.handleImageUrl(url);
        }
      });
    }

    // Video URL
    const loadVideoUrlBtn = document.getElementById("loadVideoUrl");
    const videoUrlInput = document.getElementById("videoUrlInput");

    if (loadVideoUrlBtn && videoUrlInput) {
      loadVideoUrlBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        const url = videoUrlInput.value.trim();
        if (url) await this.handleVideoUrl(url);
      });

      videoUrlInput.addEventListener("keypress", async (e) => {
        if (e.key === "Enter") {
          const url = e.target.value.trim();
          if (url) await this.handleVideoUrl(url);
        }
      });
    }
  }

  /**
   * IMAGE URL: télécharge -> normalise -> handleImageFile()
   */
  async handleImageUrl(url) {
    const loadingOverlay = document.getElementById("loadingOverlay");
    const loadingText = document.getElementById("loadingText");

    try {
      if (window.DeepGuardUtils?.validateImageUrl && !window.DeepGuardUtils.validateImageUrl(url)) {
        throw new Error("Invalide URL.");
      }

      if (loadingOverlay) loadingOverlay.style.display = "flex";
      if (loadingText) loadingText.textContent = "Loading image...";

      const response = await this.fetchWithProxy(url);
      const contentTypeHeader = (response.headers.get("content-type") || "").toLowerCase();

      const blob = await response.blob();
      const blobType = (blob.type || "").toLowerCase();

      const isImage = contentTypeHeader.startsWith("image/") || blobType.startsWith("image/");
      if (!isImage) {
        throw new Error("The URL does not point to a valid image. (content-type no image/*).");
      }

      const fixedBlob =
        blobType && blobType.startsWith("image/")
          ? blob
          : new Blob([blob], { type: contentTypeHeader.startsWith("image/") ? contentTypeHeader : "image/jpeg" });

      const file = this.createFileFromBlob({ blob: fixedBlob, url, fallbackKind: "image" });
      await this.handleImageFile(file);

      const imageUrlInput = document.getElementById("imageUrlInput");
      if (imageUrlInput) imageUrlInput.value = "";

      this.showSuccess("Image loaded from URL!");
    } catch (err) {
      console.error("URL image error:", err);
      this.showError(err.message || "Error loading the image.");
    } finally {
      if (loadingOverlay) loadingOverlay.style.display = "none";
    }
  }

  /**
   *   VIDEO URL:
   * - preview direct <video src=url>
   * - analyse via backend (/predict/video/url)
   */
  async handleVideoUrl(url) {
    const loadingOverlay = document.getElementById("loadingOverlay");
    const loadingText = document.getElementById("loadingText");

    try {
      if (window.DeepGuardUtils?.validateVideoUrl && !window.DeepGuardUtils.validateVideoUrl(url)) {
        throw new Error("Invalide URL.");
      }

      const platform = this.detectPlatform(url);
      if (platform !== "unknown" && !this.isDirectVideoUrl(url)) {
        this.showInfo(`${platform.toUpperCase()} detected: paste a direct link (.mp4/.webm) or upload the video locally.`);
        throw new Error("Platform link not directly supported.");
      }

      if (loadingOverlay) loadingOverlay.style.display = "flex";
      if (loadingText) loadingText.textContent = "Loading video...";

      // Reset source
      this.currentVideoFile = null;
      this.currentVideoUrl = url;

      // Preview direct
      this.cleanupVideoResources();
      const previewVideo = document.getElementById("previewVideo");
      if (previewVideo) {
        previewVideo.src = url;
        previewVideo.preload = "metadata";
        previewVideo.muted = true;
        previewVideo.playsInline = true;
        previewVideo.load();
      }

      // UI
      const fileName = document.getElementById("videoFileName");
      if (fileName) fileName.textContent = window.DeepGuardUtils?.getFilenameFromUrl?.(url) || "video-from-url";

      const resultsSection = document.getElementById("videoResults");
      if (resultsSection) {
        resultsSection.style.display = "block";
        resultsSection.scrollIntoView({ behavior: "smooth" });
      }

      const detailedResults = document.getElementById("videoDetailedResults");
      if (detailedResults) detailedResults.style.display = "none";

      this.resetResultCard("videoResultCard");

      const videoUrlInput = document.getElementById("videoUrlInput");
      if (videoUrlInput) videoUrlInput.value = "";

      this.showSuccess("Video loaded from URL!");
    } catch (err) {
      console.error("URL video error:", err);
      this.showError(err.message || "Error loading the video.");
    } finally {
      if (loadingOverlay) loadingOverlay.style.display = "none";
    }
  }

  /* ============================================================
     ===================  INPUT FILE UPLOADS  ====================
     ============================================================ */

  setupImageUpload() {
    const imageInput = document.getElementById("imageInput");
    const imageUploadArea = document.getElementById("imageUploadArea");

    if (imageInput) {
      imageInput.addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (file) await this.handleImageFile(file);
        e.target.value = ""; // re-select same file
      });
    }

    if (imageUploadArea && imageInput) {
      imageUploadArea.addEventListener("click", (e) => {
        if (e.target.closest("button") || e.target.closest("input") || e.target.closest("a")) return;
        imageInput.click();
      });
    }
  }

  setupVideoUpload() {
    const videoInput = document.getElementById("videoInput");
    const videoUploadArea = document.getElementById("videoUploadArea");

    if (videoInput) {
      videoInput.addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (file) await this.handleVideoFile(file);
        e.target.value = "";
      });
    }

    if (videoUploadArea && videoInput) {
      videoUploadArea.addEventListener("click", (e) => {
        if (e.target.closest("button") || e.target.closest("input") || e.target.closest("a")) return;
        videoInput.click();
      });
    }
  }

  /* ============================================================
     =======================  DRAG & DROP  =======================
     ============================================================ */

  setupDragAndDrop() {
    const areas = [document.getElementById("imageUploadArea"), document.getElementById("videoUploadArea")];

    areas.forEach((area) => {
      if (!area) return;

      ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
        area.addEventListener(eventName, this.preventDefaults);
      });

      ["dragenter", "dragover"].forEach((eventName) => {
        area.addEventListener(eventName, () => this.highlight(area));
      });

      ["dragleave", "drop"].forEach((eventName) => {
        area.addEventListener(eventName, () => this.unhighlight(area));
      });

      area.addEventListener("drop", (e) => this.handleDrop(e, area));
    });
  }

  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  highlight(area) {
    area.classList.add("drag-over");
  }

  unhighlight(area) {
    area.classList.remove("drag-over");
  }

  handleDrop(e, area) {
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (area.id === "imageUploadArea") this.handleImageFile(file);
    else if (area.id === "videoUploadArea") this.handleVideoFile(file);
  }

  /* ============================================================
     =====================  FILE HANDLERS  =======================
     ============================================================ */

  async handleImageFile(file) {
    try {
      window.DeepGuardUtils.validateImageFile(file);
      this.currentImageFile = file;

      await this.displayImagePreview(file);

      const resultsSection = document.getElementById("imageResults");
      if (resultsSection) {
        resultsSection.style.display = "block";
        resultsSection.scrollIntoView({ behavior: "smooth" });
      }

      const fileName = document.getElementById("imageFileName");
      if (fileName) fileName.textContent = file.name;

      const detailedResults = document.getElementById("imageDetailedResults");
      if (detailedResults) detailedResults.style.display = "none";

      this.resetResultCard("imageResultCard");
    } catch (error) {
      this.showError(error.message);
    }
  }

  async handleVideoFile(file) {
    try {
      window.DeepGuardUtils.validateVideoFile(file);

      // local file -> reset URL mode
      this.currentVideoFile = file;
      this.currentVideoUrl = null;

      // preview via blob
      this.cleanupVideoResources();
      const previewVideo = document.getElementById("previewVideo");
      if (previewVideo) {
        const videoUrl = URL.createObjectURL(file);
        this._currentVideoObjectUrl = videoUrl;
        previewVideo.src = videoUrl;
        previewVideo.preload = "metadata";
        previewVideo.muted = true;
        previewVideo.playsInline = true;
        previewVideo.load();
      }

      const resultsSection = document.getElementById("videoResults");
      if (resultsSection) {
        resultsSection.style.display = "block";
        resultsSection.scrollIntoView({ behavior: "smooth" });
      }

      const fileName = document.getElementById("videoFileName");
      if (fileName) fileName.textContent = file.name;

      const detailedResults = document.getElementById("videoDetailedResults");
      if (detailedResults) detailedResults.style.display = "none";

      this.resetResultCard("videoResultCard");
    } catch (error) {
      this.showError(error.message);
    }
  }

  displayImagePreview(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Impossible de lire l'image."));
      reader.onload = (e) => {
        const previewImage = document.getElementById("previewImage");
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
        <p style="color: var(--text-secondary);">Click on "Analyze" to start detection</p>
      </div>
    `;
    card.className = "result-card";
  }

  /* ============================================================
     ======================  RESET (FIX)  ========================
     ============================================================ */

  reset(type) {
    if (type === "image") {
      this.currentImageFile = null;

      const previewImage = document.getElementById("previewImage");
      if (previewImage) previewImage.removeAttribute("src");

      const resultsSection = document.getElementById("imageResults");
      if (resultsSection) resultsSection.style.display = "none";

      const detailed = document.getElementById("imageDetailedResults");
      if (detailed) detailed.style.display = "none";

      const fileName = document.getElementById("imageFileName");
      if (fileName) fileName.textContent = "";

      const input = document.getElementById("imageInput");
      if (input) input.value = "";

      const urlInput = document.getElementById("imageUrlInput");
      if (urlInput) urlInput.value = "";

      this.resetResultCard("imageResultCard");
      return;
    }

    if (type === "video") {
      this.currentVideoFile = null;
      this.currentVideoUrl = null;

      this.cleanupVideoResources();

      const resultsSection = document.getElementById("videoResults");
      if (resultsSection) resultsSection.style.display = "none";

      const detailed = document.getElementById("videoDetailedResults");
      if (detailed) detailed.style.display = "none";

      const fileName = document.getElementById("videoFileName");
      if (fileName) fileName.textContent = "";

      const input = document.getElementById("videoInput");
      if (input) input.value = "";

      const urlInput = document.getElementById("videoUrlInput");
      if (urlInput) urlInput.value = "";

      this.resetResultCard("videoResultCard");
    }
  }

  /* ============================================================
     =====================  ANALYZE ACTIONS  =====================
     ============================================================ */

  async analyzeCurrentImage() {
    if (!this.currentImageFile) {
      this.showError("No image selected.");
      return;
    }

    const loadingOverlay = document.getElementById("loadingOverlay");
    const loadingText = document.getElementById("loadingText");
    const analyzeBtn = document.getElementById("analyzeImageBtn");

    try {
      if (loadingOverlay) loadingOverlay.style.display = "flex";
      if (loadingText) loadingText.textContent = "Analyzing image...";
      if (analyzeBtn) analyzeBtn.disabled = true;

      const result = await window.deepGuardAPI.analyzeImage(this.currentImageFile);
      this.displayImageResult(result);
    } catch (err) {
      this.showError(err.message || "Image analysis error.");
    } finally {
      if (loadingOverlay) loadingOverlay.style.display = "none";
      if (analyzeBtn) analyzeBtn.disabled = false;
    }
  }

  async analyzeCurrentVideo() {
    if (!this.currentVideoFile && !this.currentVideoUrl) {
      this.showError("No video selected.");
      return;
    }

    const loadingOverlay = document.getElementById("loadingOverlay");
    const loadingText = document.getElementById("loadingText");
    const analyzeBtn = document.getElementById("analyzeVideoBtn");

    try {
      if (loadingOverlay) loadingOverlay.style.display = "flex";
      if (loadingText) loadingText.textContent = "Analyzing video...";
      if (analyzeBtn) analyzeBtn.disabled = true;

      let result;
      if (this.currentVideoFile) {
        result = await window.deepGuardAPI.analyzeVideo(this.currentVideoFile);
      } else {
        if (!window.deepGuardAPI.analyzeVideoUrl) {
          throw new Error("API manquante: analyzeVideoUrl. Vérifie ton api.js.");
        }
        result = await window.deepGuardAPI.analyzeVideoUrl(this.currentVideoUrl);
      }

      if (result && (result.success === undefined || result.success === true)) {
        this.displayVideoResult(result);
      } else {
        throw new Error(result?.error || "Video analysis failed.");
      }
    } catch (err) {
      this.showError(err.message || "Video analysis error.");
    } finally {
      if (loadingOverlay) loadingOverlay.style.display = "none";
      if (analyzeBtn) analyzeBtn.disabled = false;
    }
  }

  /* ============================================================
     =====================  RESULTS DISPLAY  =====================
     ============================================================ */

  displayImageResult(result) {
    const card = document.getElementById("imageResultCard");
    if (!card) return;

    const isReal = !result.is_deepfake;
    const status = isReal ? "REAL" : "FAKE";
    const statusIcon = isReal ? "✅" : "⚠️";
    const confidence = ((result.confidence ?? 0) * 100).toFixed(1);

    card.className = `result-card ${isReal ? "real" : "fake"}`;
    card.innerHTML = `
      <div class="result-status">${statusIcon} ${status}</div>
      <div class="result-confidence">${confidence}%</div>
      <p style="color: var(--text-secondary); margin-top: 1rem;">
        ${isReal ? "This image appears to be authentic." : "Deepfake detected"}
      </p>
    `;

    const detailedResults = document.getElementById("imageDetailedResults");
    if (detailedResults) detailedResults.style.display = "block";
  }

  displayVideoResult(result) {
    const card = document.getElementById("videoResultCard");
    if (!card) return;

    const isReal = !result.is_deepfake;
    const status = isReal ? "REAL" : "FAKE";
    const statusIcon = isReal ? "✅" : "⚠️";
    const confidence = ((result.confidence ?? 0) * 100).toFixed(1);

    card.className = `result-card ${isReal ? "real" : "fake"}`;
    card.innerHTML = `
      <div class="result-status">${statusIcon} ${status}</div>
      <div class="result-confidence">${confidence}%</div>
      <p style="color: var(--text-secondary); margin-top: 1rem;">
        ${isReal ? "This video appears to be authentic." : "Deepfake detected in the video."}
      </p>
    `;

    const detailedResults = document.getElementById("videoDetailedResults");
    if (detailedResults) detailedResults.style.display = "block";
  }

  /* ============================================================
     =====================  NOTIFICATIONS  =======================
     ============================================================ */

  showError(message) { this.showNotification(message, "error"); }
  showSuccess(message) { this.showNotification(message, "success"); }
  showInfo(message) { this.showNotification(message, "info"); }

  showNotification(message, type = "info") {
    const notification = document.createElement("div");
    const bgColor = type === "success" ? "#10b981" : type === "error" ? "#ef4444" : "#8b5cf6";

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
      max-width: 520px;
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
        notification.style.animation = "slideOut 0.3s ease forwards";
        setTimeout(() => notification.remove(), 300);
      }
    }, 4000);
  }
}

// Initialiser quand le DOM est chargé
document.addEventListener("DOMContentLoaded", () => {
  window.uploadHandler = new UploadHandler();
});