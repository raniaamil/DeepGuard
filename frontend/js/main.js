/**
 * DeepGuard Main JavaScript
 * Logic principale et gestion des interactions
 */

class DeepGuardApp {
    constructor() {
        this.currentTab = 'image';
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupTabs();
        this.setupEventListeners();
        this.loadAnimations();
    }

    /**
     * Configuration de la navigation
     */
    setupNavigation() {
        // Mobile menu toggle
        const mobileMenu = document.getElementById('mobileMenu');
        const navLinks = document.querySelector('.nav-links');

        if (mobileMenu && navLinks) {
            mobileMenu.addEventListener('click', () => {
                navLinks.classList.toggle('active');
                mobileMenu.classList.toggle('active');
            });
        }

        // Smooth scrolling pour les liens d'ancrage
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    /**
     * Configuration des tabs
     */
    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.getAttribute('data-tab');
                this.switchTab(tabName, tabButtons, tabContents);
            });
        });
    }

    /**
     * Changer de tab
     */
    switchTab(tabName, tabButtons, tabContents) {
        // Retirer la classe active de tous les boutons et contenus
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        // Ajouter la classe active au bouton et contenu sélectionnés
        const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
        const activeContent = document.getElementById(`${tabName}-tab`);

        if (activeButton && activeContent) {
            activeButton.classList.add('active');
            activeContent.classList.add('active');
            this.currentTab = tabName;
        }
    }

    /**
     * Configuration des event listeners
     */
    setupEventListeners() {
        // Boutons d'analyse
        const analyzeImageBtn = document.getElementById('analyzeImageBtn');
        const analyzeVideoBtn = document.getElementById('analyzeVideoBtn');

        if (analyzeImageBtn) {
            analyzeImageBtn.addEventListener('click', () => {
                if (window.uploadHandler) {
                    window.uploadHandler.analyzeCurrentImage();
                }
            });
        }

        if (analyzeVideoBtn) {
            analyzeVideoBtn.addEventListener('click', () => {
                if (window.uploadHandler) {
                    window.uploadHandler.analyzeCurrentVideo();
                }
            });
        }

        // Gestion du redimensionnement de la fenêtre
        window.addEventListener('resize', this.handleResize.bind(this));

        // Gestion de l'historique (retour navigateur)
        window.addEventListener('popstate', this.handlePopState.bind(this));

        // Intersection Observer pour les animations
        this.setupIntersectionObserver();
    }

    /**
     * Gérer le redimensionnement
     */
    handleResize() {
        // Ajuster la hauteur du hero sur mobile
        const hero = document.querySelector('.hero');
        if (hero && window.innerWidth <= 768) {
            hero.style.minHeight = `${window.innerHeight}px`;
        }
    }

    /**
     * Gérer l'historique du navigateur
     */
    handlePopState(event) {
        // Gérer la navigation browser
        if (event.state && event.state.tab) {
            this.switchTab(event.state.tab);
        }
    }

    /**
     * Configurer l'Intersection Observer pour les animations
     */
    setupIntersectionObserver() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                    
                    // Animer les compteurs
                    if (entry.target.classList.contains('stat-number')) {
                        this.animateStatNumber(entry.target);
                    }
                    
                    // Animer les barres de métrique
                    if (entry.target.classList.contains('metric-fill')) {
                        this.animateMetricBar(entry.target);
                    }
                }
            });
        }, observerOptions);

        // Observer les éléments à animer
        document.querySelectorAll('.feature-card, .stat, .metric').forEach(el => {
            observer.observe(el);
        });
    }

    /**
     * Animer un compteur de statistique
     */
    animateStatNumber(element) {
        const text = element.textContent;
        const matches = text.match(/[\d.]+/);
        
        if (matches) {
            const endValue = parseFloat(matches[0]);
            const suffix = text.replace(matches[0], '');
            
            let startValue = 0;
            const duration = 2000;
            const startTime = performance.now();

            const updateNumber = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Easing function
                const easeOut = 1 - Math.pow(1 - progress, 3);
                const currentValue = startValue + (endValue - startValue) * easeOut;
                
                // Formater selon le type de nombre
                let displayValue;
                if (text.includes('%')) {
                    displayValue = currentValue.toFixed(2);
                } else if (text.includes('.')) {
                    displayValue = currentValue.toFixed(4);
                } else {
                    displayValue = Math.floor(currentValue);
                }
                
                element.textContent = displayValue + suffix;
                
                if (progress < 1) {
                    requestAnimationFrame(updateNumber);
                }
            };

            requestAnimationFrame(updateNumber);
        }
    }

    /**
     * Animer une barre de métrique
     */
    animateMetricBar(element) {
        const targetWidth = element.style.width;
        element.style.width = '0%';
        
        requestAnimationFrame(() => {
            element.style.transition = 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)';
            element.style.width = targetWidth;
        });
    }

    /**
     * Charger les animations CSS
     */
    loadAnimations() {
        // Ajouter des styles d'animation dynamiques
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateX(100%);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            
            .animate-in {
                animation: fadeInUp 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            }
            
            @media (prefers-reduced-motion: reduce) {
                *, *::before, *::after {
                    animation-duration: 0.01ms !important;
                    animation-iteration-count: 1 !important;
                    transition-duration: 0.01ms !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Afficher une notification de succès
     */
    showSuccess(message) {
        this.showNotification(message, 'success', '');
    }

    /**
     * Afficher une notification d'erreur
     */
    showError(message) {
        this.showNotification(message, 'error', '');
    }

    /**
     * Afficher une notification
     */
    showNotification(message, type = 'info', icon = '') {
        const notification = document.createElement('div');
        const bgColor = type === 'success' ? 'var(--success)' : 
                       type === 'error' ? 'var(--error)' : 
                       'var(--violet-primary)';
        
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 2rem;
            background: ${bgColor};
            color: white;
            padding: 1rem 2rem;
            border-radius: 12px;
            box-shadow: var(--shadow-card);
            z-index: 10000;
            animation: slideIn 0.3s ease;
            max-width: 400px;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem;">
                <span style="font-size: 1.2rem;">${icon}</span>
                <span style="flex: 1;">${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: none; border: none; color: white; cursor: pointer; font-size: 1.5rem; opacity: 0.7; transition: opacity 0.2s;">×</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-supprimer après 5 secondes
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideOut 0.3s ease forwards';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    /**
     * Copier du texte dans le presse-papiers
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showSuccess('Copié dans le presse-papiers !');
        } catch (err) {
            console.error('Erreur de copie:', err);
            this.showError('Impossible de copier dans le presse-papiers');
        }
    }

    /**
     * Partager via l'API Web Share (si supportée)
     */
    async shareResult(data) {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Résultat DeepGuard',
                    text: `Analyse DeepGuard: ${data.prediction} (${(data.confidence * 100).toFixed(1)}% confiance)`,
                    url: window.location.href
                });
            } catch (err) {
                console.log('Partage annulé ou échoué:', err);
            }
        } else {
            // Fallback: copier l'URL
            await this.copyToClipboard(window.location.href);
        }
    }
}

// Utilitaires globaux
window.DeepGuardApp = {
    // Fonction pour formater les dates
    formatDate(date) {
        return new Intl.DateTimeFormat('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    },

    // Fonction pour télécharger un fichier
    downloadFile(content, filename, type = 'text/plain') {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // Fonction pour vérifier la connectivité
    async checkConnectivity() {
        try {
            const response = await fetch(window.deepGuardAPI.baseURL + '/health', {
                method: 'GET',
                timeout: 5000
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }
};

// Initialiser l'application quand le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
    window.deepGuardMainApp = new DeepGuardApp();
    
    // Vérifier la connectivité à l'API
    window.DeepGuardApp.checkConnectivity().then(isConnected => {
        if (!isConnected) {
            console.warn('⚠️ API DeepGuard non accessible');
            // Optionnel: afficher une notification
        }
    });
});

// Gestion des erreurs globales
window.addEventListener('error', (event) => {
    console.error('Erreur JavaScript:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Promise rejetée:', event.reason);
});
