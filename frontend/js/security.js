/**
 * DeepGuard Security Module
 * Protection XSS, validation, sanitization
 */

const DeepGuardSecurity = {
    /**
     * Sanitize HTML to prevent XSS
     * Removes dangerous tags and attributes
     */
    sanitizeHTML(str) {
        if (typeof str !== 'string') return '';
        
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    },

    /**
     * Sanitize for use in HTML attributes
     */
    sanitizeAttribute(str) {
        if (typeof str !== 'string') return '';
        
        return str
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\//g, '&#x2F;')
            .replace(/\\/g, '&#x5C;')
            .replace(/`/g, '&#x60;');
    },

    /**
     * Sanitize URL to prevent javascript: and data: attacks
     */
    sanitizeURL(url) {
        if (typeof url !== 'string') return '';
        
        const trimmed = url.trim().toLowerCase();
        
        // Block dangerous protocols
        const dangerousProtocols = [
            'javascript:',
            'data:',
            'vbscript:',
            'file:',
            'about:'
        ];
        
        for (const protocol of dangerousProtocols) {
            if (trimmed.startsWith(protocol)) {
                console.warn(`Blocked dangerous URL: ${url}`);
                return '';
            }
        }
        
        // Allow only http, https, and relative URLs
        if (trimmed.startsWith('http://') || 
            trimmed.startsWith('https://') || 
            trimmed.startsWith('/') ||
            trimmed.startsWith('./') ||
            trimmed.startsWith('../') ||
            !trimmed.includes(':')) {
            return url;
        }
        
        console.warn(`Blocked suspicious URL: ${url}`);
        return '';
    },

    /**
     * Validate email format
     */
    validateEmail(email) {
        if (typeof email !== 'string') return false;
        
        // RFC 5322 simplified regex
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        
        return emailRegex.test(email) && email.length <= 254;
    },

    /**
     * Validate and sanitize form input
     */
    validateFormInput(input, type = 'text', options = {}) {
        const { maxLength = 1000, minLength = 0, required = false } = options;
        
        if (typeof input !== 'string') {
            input = String(input || '');
        }
        
        // Trim whitespace
        input = input.trim();
        
        // Check required
        if (required && input.length === 0) {
            return { valid: false, error: 'This field is required', value: '' };
        }
        
        // Check length
        if (input.length < minLength) {
            return { valid: false, error: `Minimum ${minLength} characters required`, value: input };
        }
        
        if (input.length > maxLength) {
            return { valid: false, error: `Maximum ${maxLength} characters allowed`, value: input.slice(0, maxLength) };
        }
        
        // Type-specific validation
        switch (type) {
            case 'email':
                if (input && !this.validateEmail(input)) {
                    return { valid: false, error: 'Invalid email format', value: input };
                }
                break;
                
            case 'url':
                const sanitizedUrl = this.sanitizeURL(input);
                if (input && !sanitizedUrl) {
                    return { valid: false, error: 'Invalid URL', value: '' };
                }
                return { valid: true, error: null, value: sanitizedUrl };
                
            case 'name':
                // Allow letters, spaces, hyphens, apostrophes
                const nameRegex = /^[a-zA-ZÀ-ÿ\s\-']+$/;
                if (input && !nameRegex.test(input)) {
                    return { valid: false, error: 'Invalid characters in name', value: this.sanitizeHTML(input) };
                }
                break;
        }
        
        // Sanitize output
        return { valid: true, error: null, value: this.sanitizeHTML(input) };
    },

    /**
     * Validate contact form
     */
    validateContactForm(formData) {
        const errors = {};
        const sanitized = {};
        
        // Name validation
        const nameResult = this.validateFormInput(formData.name, 'name', { 
            required: true, 
            minLength: 2, 
            maxLength: 100 
        });
        if (!nameResult.valid) errors.name = nameResult.error;
        sanitized.name = nameResult.value;
        
        // Email validation
        const emailResult = this.validateFormInput(formData.email, 'email', { 
            required: true, 
            maxLength: 254 
        });
        if (!emailResult.valid) errors.email = emailResult.error;
        sanitized.email = emailResult.value;
        
        // Subject validation
        const subjectResult = this.validateFormInput(formData.subject, 'text', { 
            required: true, 
            maxLength: 50 
        });
        if (!subjectResult.valid) errors.subject = subjectResult.error;
        sanitized.subject = subjectResult.value;
        
        // Message validation
        const messageResult = this.validateFormInput(formData.message, 'text', { 
            required: true, 
            minLength: 10, 
            maxLength: 5000 
        });
        if (!messageResult.valid) errors.message = messageResult.error;
        sanitized.message = messageResult.value;
        
        return {
            valid: Object.keys(errors).length === 0,
            errors,
            sanitized
        };
    },

    /**
     * Rate limiting for form submissions
     */
    _submissionTimestamps: [],
    
    checkRateLimit(maxSubmissions = 3, windowMs = 60000) {
        const now = Date.now();
        
        // Remove old timestamps
        this._submissionTimestamps = this._submissionTimestamps.filter(
            ts => now - ts < windowMs
        );
        
        if (this._submissionTimestamps.length >= maxSubmissions) {
            return false;
        }
        
        this._submissionTimestamps.push(now);
        return true;
    },

    /**
     * Generate CSRF-like token for form
     */
    generateFormToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
    },

    /**
     * Setup form with security features
     */
    setupSecureForm(formElement) {
        if (!formElement) return;
        
        // Add honeypot field (hidden, bots will fill it)
        const honeypot = document.createElement('input');
        honeypot.type = 'text';
        honeypot.name = '_gotcha';
        honeypot.style.display = 'none';
        honeypot.tabIndex = -1;
        honeypot.autocomplete = 'off';
        formElement.appendChild(honeypot);
        
        // Add form token
        const token = document.createElement('input');
        token.type = 'hidden';
        token.name = '_token';
        token.value = this.generateFormToken();
        formElement.appendChild(token);
        
        // Store token time
        formElement.dataset.tokenTime = Date.now().toString();
        
        // Intercept submission
        formElement.addEventListener('submit', (e) => {
            // Check honeypot
            if (honeypot.value) {
                e.preventDefault();
                console.warn('Bot detected via honeypot');
                return false;
            }
            
            // Check rate limit
            if (!this.checkRateLimit()) {
                e.preventDefault();
                this.showSecurityError(formElement, 'Too many submissions. Please wait a moment.');
                return false;
            }
            
            // Check token time (must be at least 3 seconds since page load)
            const tokenTime = parseInt(formElement.dataset.tokenTime || '0');
            if (Date.now() - tokenTime < 3000) {
                e.preventDefault();
                console.warn('Form submitted too quickly');
                return false;
            }
            
            // Validate form
            const formData = new FormData(formElement);
            const data = {
                name: formData.get('name'),
                email: formData.get('email'),
                subject: formData.get('subject'),
                message: formData.get('message')
            };
            
            const validation = this.validateContactForm(data);
            
            if (!validation.valid) {
                e.preventDefault();
                this.showValidationErrors(formElement, validation.errors);
                return false;
            }
            
            return true;
        });
    },

    /**
     * Show validation errors on form
     */
    showValidationErrors(formElement, errors) {
        // Clear previous errors
        formElement.querySelectorAll('.field-error').forEach(el => el.remove());
        formElement.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
        
        Object.entries(errors).forEach(([field, message]) => {
            const input = formElement.querySelector(`[name="${field}"]`);
            if (input) {
                input.classList.add('error');
                
                const errorEl = document.createElement('div');
                errorEl.className = 'field-error';
                errorEl.textContent = message;
                errorEl.style.cssText = 'color: #ef4444; font-size: 0.85rem; margin-top: 0.25rem;';
                
                input.parentNode.appendChild(errorEl);
            }
        });
    },

    /**
     * Show security error message
     */
    showSecurityError(formElement, message) {
        let errorContainer = formElement.querySelector('.security-error');
        
        if (!errorContainer) {
            errorContainer = document.createElement('div');
            errorContainer.className = 'security-error';
            errorContainer.style.cssText = `
                background: #fee2e2;
                border: 1px solid #ef4444;
                color: #dc2626;
                padding: 1rem;
                border-radius: 8px;
                margin-bottom: 1rem;
                text-align: center;
            `;
            formElement.insertBefore(errorContainer, formElement.firstChild);
        }
        
        errorContainer.textContent = message;
        
        setTimeout(() => {
            errorContainer.remove();
        }, 5000);
    },

    /**
     * Prevent clickjacking
     */
    preventClickjacking() {
        if (self !== top) {
            // Page is in an iframe
            console.warn('Clickjacking attempt detected');
            document.body.innerHTML = '<h1>This page cannot be displayed in a frame.</h1>';
            top.location = self.location;
        }
    },

    /**
     * Initialize all security measures
     */
    init() {
        // Prevent clickjacking
        this.preventClickjacking();
        
        // Setup secure forms
        document.querySelectorAll('form.contact-form').forEach(form => {
            this.setupSecureForm(form);
        });
        
        // Add security headers info (for reference, actual headers set server-side)
        console.info('DeepGuard Security Module initialized');
        console.info('For production, ensure server sets: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Content-Security-Policy');
    }
};

// Auto-initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    DeepGuardSecurity.init();
});

// Export for use in other modules
window.DeepGuardSecurity = DeepGuardSecurity;
