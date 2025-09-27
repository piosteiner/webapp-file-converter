/**
 * PWA Registration and Management
 * Handles service worker registration and app installation
 */

class PWAManager {
    constructor() {
        this.deferredPrompt = null;
        this.isInstalled = false;
        this.init();
    }

    async init() {
        // Register service worker
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                logger.info('Service Worker registered successfully', registration);
                
                // Check for updates
                registration.addEventListener('updatefound', () => {
                    logger.info('New Service Worker version available');
                    this.handleServiceWorkerUpdate(registration);
                });
                
            } catch (error) {
                logger.error('Service Worker registration failed', error);
            }
        }

        // Handle app installation
        this.setupInstallPrompt();
        
        // Detect if already installed
        this.detectInstallation();
    }

    setupInstallPrompt() {
        // Listen for beforeinstallprompt event
        window.addEventListener('beforeinstallprompt', (e) => {
            logger.debug('PWA install prompt available');
            // Prevent the mini-infobar from appearing
            e.preventDefault();
            // Store the event for later use
            this.deferredPrompt = e;
            // Show custom install button
            this.showInstallButton();
        });

        // Listen for app installation
        window.addEventListener('appinstalled', () => {
            logger.info('PWA installed successfully');
            this.isInstalled = true;
            this.hideInstallButton();
            this.deferredPrompt = null;
        });
    }

    detectInstallation() {
        // Check if running as installed PWA
        if (window.matchMedia('(display-mode: standalone)').matches || 
            window.navigator.standalone === true) {
            this.isInstalled = true;
            logger.debug('App is running as installed PWA');
        }
    }

    showInstallButton() {
        // TEMPORARILY DISABLED - Install button hidden
        // Uncomment the code below to re-enable the PWA install button
        /*
        // Create install button if it doesn't exist
        if (!document.getElementById('pwa-install-btn')) {
            const installBtn = document.createElement('button');
            installBtn.id = 'pwa-install-btn';
            installBtn.className = 'pwa-install-button';
            installBtn.innerHTML = `
                <span class="install-icon">📱</span>
                <span class="install-text">Install App</span>
            `;
            installBtn.setAttribute('aria-label', 'Install File Converter as an app');
            
            // Add click handler
            installBtn.addEventListener('click', () => this.promptInstall());
            
            // Add to page (after theme toggle)
            const themeToggle = document.querySelector('.theme-toggle-container');
            if (themeToggle) {
                themeToggle.parentNode.insertBefore(installBtn, themeToggle.nextSibling);
            } else {
                document.body.appendChild(installBtn);
            }
            
            // Add CSS styles
            this.addInstallButtonStyles();
        }
        */
    }

    hideInstallButton() {
        const installBtn = document.getElementById('pwa-install-btn');
        if (installBtn) {
            installBtn.style.display = 'none';
        }
    }

    async promptInstall() {
        if (!this.deferredPrompt) {
            logger.warn('Install prompt not available');
            return;
        }

        try {
            // Show the install prompt
            this.deferredPrompt.prompt();
            
            // Wait for user response
            const choiceResult = await this.deferredPrompt.userChoice;
            
            if (choiceResult.outcome === 'accepted') {
                logger.info('User accepted PWA installation');
            } else {
                logger.info('User dismissed PWA installation');
            }
            
            // Clear the prompt
            this.deferredPrompt = null;
            this.hideInstallButton();
            
        } catch (error) {
            logger.error('Error prompting PWA installation', error);
        }
    }

    handleServiceWorkerUpdate(registration) {
        const newWorker = registration.installing;
        
        if (newWorker) {
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // New version available
                    this.showUpdateNotification();
                }
            });
        }
    }

    showUpdateNotification() {
        // Show update notification
        const notification = document.createElement('div');
        notification.className = 'update-notification';
        notification.innerHTML = `
            <div class="update-content">
                <span class="update-icon">🔄</span>
                <span class="update-text">New version available!</span>
                <button class="update-button" onclick="window.location.reload()">Update</button>
                <button class="update-dismiss" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 10000);
    }

    addInstallButtonStyles() {
        if (!document.getElementById('pwa-install-styles')) {
            const styles = document.createElement('style');
            styles.id = 'pwa-install-styles';
            styles.textContent = `
                .pwa-install-button {
                    position: fixed;
                    top: 20px;
                    right: 140px;
                    background: var(--theme-toggle-bg);
                    border: 1px solid var(--theme-toggle-border);
                    border-radius: 12px;
                    padding: 8px 12px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 14px;
                    color: var(--text-primary);
                    backdrop-filter: var(--backdrop-blur);
                    transition: all 0.2s ease;
                    z-index: 1000;
                    box-shadow: 0 2px 8px var(--shadow-color);
                }
                
                .pwa-install-button:hover {
                    background: var(--theme-toggle-hover-bg);
                    transform: translateY(-1px);
                }
                
                .install-icon {
                    font-size: 16px;
                }
                
                .install-text {
                    font-weight: 500;
                }
                
                .update-notification {
                    position: fixed;
                    top: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: var(--container-bg);
                    border: 1px solid var(--processing-border);
                    border-radius: 12px;
                    padding: 12px 16px;
                    z-index: 1001;
                    box-shadow: 0 4px 16px var(--shadow-color);
                    backdrop-filter: var(--backdrop-blur);
                }
                
                .update-content {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    color: var(--text-primary);
                }
                
                .update-button {
                    background: var(--processing-text);
                    color: white;
                    border: none;
                    padding: 6px 12px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 500;
                }
                
                .update-dismiss {
                    background: none;
                    border: none;
                    color: var(--text-secondary);
                    cursor: pointer;
                    font-size: 18px;
                    padding: 0;
                    width: 24px;
                    height: 24px;
                }
                
                @media (max-width: 768px) {
                    .pwa-install-button {
                        top: 10px;
                        right: 10px;
                        font-size: 12px;
                        padding: 6px 10px;
                    }
                    
                    .install-text {
                        display: none;
                    }
                }
            `;
            document.head.appendChild(styles);
        }
    }
}

// Initialize PWA manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (typeof logger !== 'undefined') {
        window.pwaManager = new PWAManager();
    } else {
        // Fallback if logger is not available
        console.log('PWA Manager: Logger not available, using console');
        window.logger = console;
        window.pwaManager = new PWAManager();
    }
});
