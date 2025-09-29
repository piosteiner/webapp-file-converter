/**
 * Centralized Navigation Component
 * Dynamically generates consistent navigation across all converter pages
 */

class Navigation {
    constructor() {
        this.converters = [
            {
                id: 'home',
                icon: '🏠',
                text: 'Home',
                href: '../../index.html',
                isHome: true
            },
            {
                id: 'gif-to-webm',
                icon: '🎬',
                text: 'GIF → WebM',
                href: 'gif-to-webm.html',
                pageClass: 'gif-converter'
            },
            {
                id: 'png-to-jpeg',
                icon: '📸',
                text: 'PNG → JPEG',
                href: 'png-to-jpeg.html',
                pageClass: 'png-converter'
            },
            {
                id: 'png-icons',
                icon: '🖼️',
                text: '100×100 PNG',
                href: 'png-icons.html',
                pageClass: 'png-icons'
            },
            {
                id: 'png-stickers',
                icon: '🏷️',
                text: 'PNG Stickers',
                href: 'png-stickers.html',
                pageClass: 'png-stickers'
            },
            {
                id: 'image-splitter',
                icon: '🗺️',
                text: 'Image Splitter',
                href: 'image-splitter.html',
                pageClass: 'image-splitter'
            },
            {
                id: 'grid-generator',
                icon: '⚏',
                text: 'Grid Generator',
                href: 'grid-generator.html',
                pageClass: 'grid-generator'
            }
        ];

        this.currentPage = this.detectCurrentPage();
        console.log('Navigation: Detected current page:', this.currentPage);
        this.init();
    }

    /**
     * Detect the current page based on URL and body class
     */
    detectCurrentPage() {
        const pathname = window.location.pathname;
        const bodyClass = document.body.className;

        // Check for home page
        if (pathname.includes('index.html') || pathname.endsWith('/')) {
            return 'home';
        }

        // Check by filename
        for (const converter of this.converters) {
            if (pathname.includes(converter.href.replace('.html', ''))) {
                return converter.id;
            }
        }

        // Check by body class
        for (const converter of this.converters) {
            if (converter.pageClass && bodyClass.includes(converter.pageClass)) {
                return converter.id;
            }
        }

        return null;
    }

    /**
     * Initialize the navigation system
     */
    init() {
        console.log('Navigation: Init method called');
        this.checkAndUpdateServiceWorker();
        this.renderNavigation();
        console.log('Navigation: Init completed');
        logger?.info('Navigation component initialized', { currentPage: this.currentPage });
    }

    /**
     * Check for service worker updates and force refresh if needed
     */
    async checkAndUpdateServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration) {
                    // Force check for updates
                    await registration.update();
                    
                    // Listen for new service worker installing
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        if (newWorker) {
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    console.log('Navigation: New service worker available, clearing cache...');
                                    // Force cache clear and reload
                                    this.clearCache().then(() => {
                                        console.log('Navigation: Cache cleared, reloading...');
                                        window.location.reload(true);
                                    });
                                }
                            });
                        }
                    });
                }
            } catch (error) {
                console.error('Navigation: Service worker update check failed:', error);
            }
        }
    }

    /**
     * Generate navigation HTML
     */
    generateNavigationHTML() {
        const navItems = this.converters.map(converter => {
            const isActive = converter.id === this.currentPage;
            const isLink = !isActive;

            if (isLink) {
                return `
                    <a href="${converter.href}" class="nav-item${converter.isHome ? ' home' : ''}">
                        <span class="nav-icon">${converter.icon}</span>
                        <span class="nav-text">${converter.text}</span>
                    </a>
                `;
            } else {
                return `
                    <span class="nav-item active">
                        <span class="nav-icon">${converter.icon}</span>
                        <span class="nav-text">${converter.text}</span>
                    </span>
                `;
            }
        }).join('');

        return `
            <nav class="nav-links">
                <div class="nav-grid">
                    ${navItems}
                </div>
            </nav>
        `;
    }

    /**
     * Render the navigation into the page
     */
    renderNavigation() {
        console.log('Navigation: Rendering navigation...');
        const navContainer = document.getElementById('navigation-placeholder');
        console.log('Navigation: Found container:', navContainer);
        
        if (navContainer) {
            const html = this.generateNavigationHTML();
            console.log('Navigation: Generated HTML length:', html.length);
            navContainer.innerHTML = html;
            console.log('Navigation: Successfully inserted into placeholder');
        } else {
            // Fallback: look for existing nav-links and replace
            const existingNav = document.querySelector('.nav-links');
            if (existingNav) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = this.generateNavigationHTML();
                const newNav = tempDiv.firstElementChild;
                existingNav.parentNode.replaceChild(newNav, existingNav);
            } else {
                logger?.warn('No navigation placeholder or existing navigation found');
            }
        }
    }

    /**
     * Update active page (useful for SPA-like navigation)
     */
    setActivePage(pageId) {
        this.currentPage = pageId;
        this.renderNavigation();
    }

    /**
     * Add a new converter to the navigation
     */
    addConverter(converter) {
        // Insert before the last item (usually grid-generator)
        this.converters.splice(-1, 0, converter);
        this.renderNavigation();
    }

    /**
     * Remove a converter from the navigation
     */
    removeConverter(converterId) {
        this.converters = this.converters.filter(c => c.id !== converterId);
        this.renderNavigation();
    }

    /**
     * Force clear PWA cache (for development/troubleshooting)
     */
    async clearCache() {
        if ('serviceWorker' in navigator && 'caches' in window) {
            try {
                // Send message to service worker to clear cache
                const registration = await navigator.serviceWorker.ready;
                if (registration.active) {
                    const messageChannel = new MessageChannel();
                    return new Promise((resolve) => {
                        messageChannel.port1.onmessage = (event) => {
                            resolve(event.data.success);
                        };
                        registration.active.postMessage(
                            { type: 'CLEAR_CACHE' },
                            [messageChannel.port2]
                        );
                    });
                }
            } catch (error) {
                console.error('Navigation: Failed to clear cache:', error);
            }
        }
    }
}

// Force cache bypass for this script load
if (typeof window !== 'undefined' && 'caches' in window) {
    // Clear any cached versions of this navigation script
    caches.keys().then(cacheNames => {
        return Promise.all(
            cacheNames.map(cacheName => {
                return caches.open(cacheName).then(cache => {
                    const navScriptUrl = window.location.origin + '/assets/scripts/core/navigation.js';
                    return cache.delete(navScriptUrl);
                });
            })
        );
    }).catch(error => {
        console.log('Navigation: Cache clear attempt:', error);
    });
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Navigation: DOM Content Loaded');
    // Small delay to ensure other scripts are loaded
    setTimeout(() => {
        console.log('Navigation: Initializing...');
        try {
            window.navigation = new Navigation();
            console.log('Navigation: Initialized successfully');
        } catch (error) {
            console.error('Navigation: Failed to initialize:', error);
        }
    }, 50);
});

// Export for manual initialization if needed
window.Navigation = Navigation;

// Global cache clearing function for manual use
window.clearAllCaches = async function() {
    console.log('Manual cache clear initiated...');
    
    // Clear all browser caches
    if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
            cacheNames.map(cacheName => {
                console.log('Clearing cache:', cacheName);
                return caches.delete(cacheName);
            })
        );
    }
    
    // Force service worker update
    if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
            await registration.unregister();
            console.log('Service worker unregistered');
        }
    }
    
    console.log('All caches cleared! Reloading page...');
    setTimeout(() => {
        window.location.reload(true);
    }, 500);
};

// Keyboard shortcut for cache clearing (Ctrl+Shift+R)
document.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.shiftKey && event.key === 'R') {
        event.preventDefault();
        console.log('Cache clear shortcut triggered');
        window.clearAllCaches();
    }
});

console.log('Navigation: Cache clearing available - use clearAllCaches() or Ctrl+Shift+R');