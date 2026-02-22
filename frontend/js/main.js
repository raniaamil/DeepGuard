/**
 * DeepGuard Main JavaScript - Enhanced Version 2.0
 * Application principale
 */

class DeepGuardApp {
    constructor() {
        this.currentTab = 'image';
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupTabs();
        this.addAnimationStyles();
    }

    setupNavigation() {
        // Mobile menu
        const mobileMenu = document.getElementById('mobileMenu');
        const navLinks = document.querySelector('.nav-links');

        if (mobileMenu && navLinks) {
            mobileMenu.addEventListener('click', () => {
                navLinks.classList.toggle('active');
                mobileMenu.classList.toggle('active');
            });
        }

        // Smooth scrolling
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    }

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

    switchTab(tabName, tabButtons, tabContents) {
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
        const activeContent = document.getElementById(`${tabName}-tab`);

        if (activeButton && activeContent) {
            activeButton.classList.add('active');
            activeContent.classList.add('active');
            this.currentTab = tabName;
        }
    }

    addAnimationStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateX(100px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            
            @keyframes slideOut {
                from {
                    opacity: 1;
                    transform: translateX(0);
                }
                to {
                    opacity: 0;
                    transform: translateX(100px);
                }
            }
            
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .animate-fadeIn {
                animation: fadeInUp 0.5s ease-out;
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    window.deepGuardApp = new DeepGuardApp();
    
    // Check API connectivity
    window.deepGuardAPI.healthCheck()
        .then(health => {
            console.log('✅ DeepGuard API connected:', health);
        })
        .catch(err => {
            console.warn('⚠️ DeepGuard API not accessible:', err.message);
        });
});

// Global error handling
window.addEventListener('error', (event) => {
    console.error('JavaScript error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});
