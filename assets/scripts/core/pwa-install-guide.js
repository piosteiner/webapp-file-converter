/**
 * PWA Installation Guide
 * Interactive guide to help users install the app on their devices
 */

class PWAInstallGuide {
    constructor() {
        this.isVisible = false;
        this.userAgent = navigator.userAgent.toLowerCase();
        this.platform = this.detectPlatform();
        this.initialized = false;
    }

    /**
     * Initialize the PWA install guide
     */
    initialize() {
        if (this.initialized) return;

        this.createGuideModal();
        this.setupTriggers();
        // DISABLED: Auto-show on first visit
        // this.checkFirstVisit();

        this.initialized = true;
        logger.debug('PWA Install Guide initialized (auto-show disabled)');
    }

    /**
     * Detect user's platform for customized instructions
     */
    detectPlatform() {
        if (/iphone|ipad|ipod/.test(this.userAgent)) {
            return 'ios';
        } else if (/android/.test(this.userAgent)) {
            return 'android';
        } else if (/macintosh/.test(this.userAgent)) {
            return 'macos';
        } else if (/windows/.test(this.userAgent)) {
            return 'windows';
        } else {
            return 'other';
        }
    }

    /**
     * Create the installation guide modal
     */
    createGuideModal() {
        const modal = document.createElement('div');
        modal.id = 'pwa-install-guide';
        modal.className = 'pwa-guide-modal hidden';
        modal.innerHTML = this.getModalHTML();
        
        document.body.appendChild(modal);
        this.addModalStyles();
        this.setupModalEvents(modal);
    }

    /**
     * Get platform-specific modal HTML
     */
    getModalHTML() {
        const instructions = this.getInstructions();
        
        return `
            <div class="pwa-guide-overlay" data-action="close-guide"></div>
            <div class="pwa-guide-content">
                <div class="pwa-guide-header">
                    <h2>📱 Install File Converter App</h2>
                    <button class="pwa-guide-close" data-action="close-guide">×</button>
                </div>
                
                <div class="pwa-guide-body">
                    <div class="pwa-platform-info">
                        <div class="platform-icon">${instructions.icon}</div>
                        <div class="platform-text">
                            <h3>${instructions.title}</h3>
                            <p>${instructions.subtitle}</p>
                        </div>
                    </div>
                    
                    <div class="pwa-benefits">
                        <h4>✨ Benefits of Installing</h4>
                        <ul>
                            <li>🚀 <strong>Faster loading</strong> - Works offline & loads instantly</li>
                            <li>📱 <strong>App-like experience</strong> - Full screen, no browser UI</li>
                            <li>🔔 <strong>Easy access</strong> - Launch from home screen like any app</li>
                            <li>💾 <strong>Less storage</strong> - Uses less space than downloading files</li>
                        </ul>
                    </div>
                    
                    <div class="pwa-instructions">
                        <h4>📋 Installation Steps</h4>
                        <ol class="install-steps">
                            ${instructions.steps.map(step => `
                                <li>
                                    <div class="step-content">
                                        <span class="step-text">${step.text}</span>
                                        ${step.image ? `<div class="step-visual">${step.image}</div>` : ''}
                                    </div>
                                </li>
                            `).join('')}
                        </ol>
                    </div>
                    
                    ${this.platform === 'other' ? `
                        <div class="pwa-alternative">
                            <h4>💡 Alternative</h4>
                            <p>You can also bookmark this page for quick access or check if your browser supports PWA installation.</p>
                        </div>
                    ` : ''}
                </div>
                
                <div class="pwa-guide-footer">
                    <button class="pwa-guide-btn primary" data-action="try-install">Got It, Thanks!</button>
                </div>
            </div>
        `;
    }

    /**
     * Get platform-specific instructions
     */
    getInstructions() {
        switch (this.platform) {
            case 'ios':
                return {
                    icon: '🍎',
                    title: 'Install on iPhone/iPad',
                    subtitle: 'Add to your home screen in just a few taps',
                    steps: [
                        {
                            text: 'Tap the Share button in Safari',
                            image: '📤'
                        },
                        {
                            text: 'Scroll down and tap "Add to Home Screen"',
                            image: '➕'
                        },
                        {
                            text: 'Tap "Add" to confirm',
                            image: '✅'
                        },
                        {
                            text: 'Find the app icon on your home screen!',
                            image: '🏠'
                        }
                    ]
                };

            case 'android':
                return {
                    icon: '🤖',
                    title: 'Install on Android',
                    subtitle: 'Add to your home screen with Chrome or Firefox',
                    steps: [
                        {
                            text: 'Tap the menu button (⋮) in your browser',
                            image: '⋮'
                        },
                        {
                            text: 'Look for "Add to Home screen" or "Install app"',
                            image: '📱'
                        },
                        {
                            text: 'Tap "Add" or "Install" to confirm',
                            image: '✅'
                        },
                        {
                            text: 'The app will appear on your home screen!',
                            image: '🏠'
                        }
                    ]
                };

            case 'windows':
                return {
                    icon: '🪟',
                    title: 'Install on Windows',
                    subtitle: 'Add to your taskbar and Start menu',
                    steps: [
                        {
                            text: 'Look for the install icon (➕) in your browser address bar',
                            image: '🔍'
                        },
                        {
                            text: 'Click "Install" when prompted',
                            image: '⬇️'
                        },
                        {
                            text: 'The app will open in its own window',
                            image: '🪟'
                        },
                        {
                            text: 'Pin to taskbar for easy access!',
                            image: '📌'
                        }
                    ]
                };

            case 'macos':
                return {
                    icon: '🍎',
                    title: 'Install on Mac',
                    subtitle: 'Add to your Dock and Applications',
                    steps: [
                        {
                            text: 'Look for the install icon in Safari\'s address bar',
                            image: '🔍'
                        },
                        {
                            text: 'Click "Install" when prompted',
                            image: '⬇️'
                        },
                        {
                            text: 'The app will appear in your Applications folder',
                            image: '📁'
                        },
                        {
                            text: 'Drag to Dock for quick access!',
                            image: '📌'
                        }
                    ]
                };

            default:
                return {
                    icon: '💻',
                    title: 'Install as Web App',
                    subtitle: 'Check your browser for installation options',
                    steps: [
                        {
                            text: 'Look for install prompts in your browser',
                            image: '🔍'
                        },
                        {
                            text: 'Check browser menu for "Install" options',
                            image: '⋮'
                        },
                        {
                            text: 'Follow your browser\'s installation process',
                            image: '📋'
                        }
                    ]
                };
        }
    }

    /**
     * Add CSS styles for the modal
     */
    addModalStyles() {
        if (document.getElementById('pwa-guide-styles')) return;

        const style = document.createElement('style');
        style.id = 'pwa-guide-styles';
        style.textContent = `
            .pwa-guide-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 1;
                visibility: visible;
                transition: all 0.3s ease;
            }
            
            .pwa-guide-modal.hidden {
                opacity: 0;
                visibility: hidden;
                pointer-events: none;
            }
            
            .pwa-guide-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(4px);
            }
            
            .pwa-guide-content {
                position: relative;
                background: var(--container-bg, #ffffff);
                border-radius: 16px;
                max-width: 500px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
                border: 1px solid var(--border-color, #e2e8f0);
                animation: slideIn 0.3s ease;
            }
            
            @keyframes slideIn {
                from {
                    transform: translateY(20px) scale(0.95);
                    opacity: 0;
                }
                to {
                    transform: translateY(0) scale(1);
                    opacity: 1;
                }
            }
            
            .pwa-guide-header {
                padding: 24px 24px 16px;
                border-bottom: 1px solid var(--border-color, #e2e8f0);
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            
            .pwa-guide-header h2 {
                margin: 0;
                font-size: 24px;
                color: var(--text-primary, #1a202c);
                font-weight: 700;
            }
            
            .pwa-guide-close {
                background: none;
                border: none;
                font-size: 24px;
                color: var(--text-secondary, #718096);
                cursor: pointer;
                padding: 8px;
                border-radius: 50%;
                transition: all 0.2s ease;
            }
            
            .pwa-guide-close:hover {
                background: var(--controls-section-bg, #f7fafc);
                color: var(--text-primary, #1a202c);
            }
            
            .pwa-guide-body {
                padding: 24px;
            }
            
            .pwa-platform-info {
                display: flex;
                align-items: center;
                gap: 16px;
                margin-bottom: 24px;
                padding: 16px;
                background: var(--controls-section-bg, #f0f7ff);
                border-radius: 12px;
                border: 1px solid var(--controls-section-border, rgba(102, 126, 234, 0.15));
            }
            
            .platform-icon {
                font-size: 32px;
                background: var(--text-accent, #667eea);
                border-radius: 50%;
                width: 56px;
                height: 56px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .platform-text h3 {
                margin: 0 0 4px 0;
                font-size: 18px;
                color: var(--text-primary, #1a202c);
                font-weight: 600;
            }
            
            .platform-text p {
                margin: 0;
                color: var(--text-secondary, #718096);
                font-size: 14px;
            }
            
            .pwa-benefits, .pwa-instructions, .pwa-alternative {
                margin-bottom: 24px;
            }
            
            .pwa-benefits h4, .pwa-instructions h4, .pwa-alternative h4 {
                margin: 0 0 12px 0;
                font-size: 16px;
                color: var(--text-primary, #1a202c);
                font-weight: 600;
            }
            
            .pwa-benefits ul {
                margin: 0;
                padding: 0;
                list-style: none;
            }
            
            .pwa-benefits li {
                margin-bottom: 8px;
                padding: 8px 0;
                color: var(--text-secondary, #4a5568);
                font-size: 14px;
                line-height: 1.5;
            }
            
            .install-steps {
                margin: 0;
                padding: 0;
                list-style: none;
                counter-reset: step-counter;
            }
            
            .install-steps li {
                counter-increment: step-counter;
                margin-bottom: 16px;
                position: relative;
            }
            
            .install-steps li::before {
                content: counter(step-counter);
                position: absolute;
                left: -40px;
                top: 0;
                background: var(--text-accent, #667eea);
                color: white;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: 600;
            }
            
            .step-content {
                margin-left: -16px;
                padding: 12px 16px;
                background: var(--controls-section-bg, #f8fafc);
                border-radius: 8px;
                border-left: 3px solid var(--text-accent, #667eea);
            }
            
            .step-text {
                display: block;
                color: var(--text-primary, #2d3748);
                font-size: 14px;
                line-height: 1.5;
                margin-bottom: 8px;
            }
            
            .step-visual {
                font-size: 20px;
                opacity: 0.7;
            }
            
            .pwa-guide-footer {
                padding: 16px 24px 24px;
                border-top: 1px solid var(--border-color, #e2e8f0);
                display: flex;
                gap: 12px;
                justify-content: center;
            }
            
            .pwa-guide-btn {
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                border: none;
            }
            
            .pwa-guide-btn.secondary {
                background: var(--controls-section-bg, #e2e8f0);
                color: var(--text-secondary, #4a5568);
                border: 1px solid var(--controls-section-border, rgba(102, 126, 234, 0.15));
            }
            
            .pwa-guide-btn.secondary:hover {
                background: var(--radio-hover-bg, #cbd5e0);
            }
            
            .pwa-guide-btn.primary {
                background: var(--text-accent, #667eea);
                color: white;
            }
            
            .pwa-guide-btn.primary:hover {
                background: var(--text-accent-hover, #5a67d8);
                transform: translateY(-1px);
            }
            
            /* Mobile responsiveness */
            @media (max-width: 640px) {
                .pwa-guide-content {
                    margin: 20px;
                    width: calc(100% - 40px);
                }
                
                .pwa-guide-header {
                    padding: 20px 20px 16px;
                }
                
                .pwa-guide-body {
                    padding: 20px;
                }
                
                .pwa-guide-footer {
                    padding: 16px 20px 20px;
                    flex-direction: column;
                }
                
                .pwa-guide-btn {
                    width: 100%;
                    justify-content: center;
                }
                
                .install-steps li::before {
                    left: -32px;
                    width: 20px;
                    height: 20px;
                    font-size: 11px;
                }
                
                .step-content {
                    margin-left: -8px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Setup modal event listeners
     */
    setupModalEvents(modal) {
        // Handle clicks on the overlay to close
        modal.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            
            if (action === 'close-guide') {
                console.log('PWA Guide: Close button clicked');
                this.hideGuide();
                return;
            }
            
            // If clicking directly on overlay, close
            if (e.target === modal) {
                console.log('PWA Guide: Overlay clicked');
                this.hideGuide();
                return;
            }
        });

        // Handle specific button clicks
        const closeBtn = modal.querySelector('.pwa-guide-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('PWA Guide: Close button clicked directly');
                this.hideGuide();
            });
        }

        const gotItBtn = modal.querySelector('[data-action="try-install"]');
        if (gotItBtn) {
            gotItBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('PWA Guide: Got It button clicked');
                this.completeGuide();
            });
        }

        // Prevent modal content clicks from closing
        const content = modal.querySelector('.pwa-guide-content');
        if (content) {
            content.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
    }

    /**
     * Setup triggers for showing the guide
     */
    setupTriggers() {
        // Add install button to header
        this.addInstallButton();
        
        // DISABLED: Automatic popup on first visit
        // setTimeout(() => {
        //     if (!this.isAppInstalled() && !this.hasSeenGuide()) {
        //         this.showGuide();
        //     }
        // }, 3000);
    }

    /**
     * Add install button to the site header
     */
    addInstallButton() {
        const header = document.querySelector('header h1');
        if (!header) return;

        const installBtn = document.createElement('button');
        installBtn.className = 'pwa-install-btn';
        installBtn.innerHTML = '📱 Install App';
        installBtn.onclick = () => this.showGuide();

        // Add button styles
        const style = document.createElement('style');
        style.textContent = `
            .pwa-install-btn {
                background: var(--primary-color, #667eea);
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                margin-left: 16px;
                transition: all 0.2s ease;
                box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
            }
            
            .pwa-install-btn:hover {
                background: var(--primary-hover, #5a67d8);
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(102, 126, 234, 0.4);
            }
            
            @media (max-width: 640px) {
                .pwa-install-btn {
                    display: block;
                    margin: 8px auto 0;
                }
            }
        `;
        
        if (!document.getElementById('pwa-install-btn-styles')) {
            style.id = 'pwa-install-btn-styles';
            document.head.appendChild(style);
        }

        header.appendChild(installBtn);
    }

    /**
     * Show the installation guide
     */
    showGuide() {
        const modal = document.getElementById('pwa-install-guide');
        if (modal) {
            modal.classList.remove('hidden');
            this.isVisible = true;
            document.body.style.overflow = 'hidden';
            
            logger.info('PWA installation guide shown');
            performanceMonitor.trackEvent('pwa_guide_shown', { platform: this.platform });
        }
    }

    /**
     * Hide the installation guide
     */
    hideGuide() {
        console.log('PWA Guide: hideGuide() called');
        const modal = document.getElementById('pwa-install-guide');
        if (modal) {
            console.log('PWA Guide: Modal found, adding hidden class');
            modal.classList.add('hidden');
            this.isVisible = false;
            document.body.style.overflow = '';
            
            logger?.debug('PWA installation guide hidden');
        } else {
            console.log('PWA Guide: Modal not found');
        }
    }

    // "Remind Later" functionality removed as requested

    /**
     * Handle guide completion
     */
    completeGuide() {
        console.log('PWA Guide: completeGuide() called');
        this.hideGuide();
        localStorage.setItem('pwa-guide-seen', 'true');
        
        logger?.info('PWA guide completed');
        performanceMonitor?.trackEvent('pwa_guide_completed', { platform: this.platform });
    }

    /**
     * Check if user has seen the guide
     */
    hasSeenGuide() {
        const seen = localStorage.getItem('pwa-guide-seen');
        return !!seen;
    }

    /**
     * Check if app appears to be installed
     */
    isAppInstalled() {
        return window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone === true;
    }

    /**
     * Check first visit
     */
    checkFirstVisit() {
        if (!localStorage.getItem('pwa-first-visit')) {
            localStorage.setItem('pwa-first-visit', Date.now().toString());
            
            // Show guide after 5 seconds on first visit
            setTimeout(() => {
                if (!this.isAppInstalled() && !this.hasSeenGuide()) {
                    this.showGuide();
                }
            }, 5000);
        }
    }

    /**
     * Cleanup
     */
    cleanup() {
        const modal = document.getElementById('pwa-install-guide');
        if (modal) {
            modal.remove();
        }
        
        const styles = document.getElementById('pwa-guide-styles');
        if (styles) {
            styles.remove();
        }
        
        logger.debug('PWA Install Guide cleanup completed');
    }
}

// Initialize PWA install guide
const pwaInstallGuide = new PWAInstallGuide();

// Auto-initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    pwaInstallGuide.initialize();
});

// Export for global use
window.PWAInstallGuide = PWAInstallGuide;
window.pwaInstallGuide = pwaInstallGuide;
