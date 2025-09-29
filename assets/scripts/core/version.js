/**
 * Automatic Version Management for File Converter PWA
 * Handles cache busting and resource versioning automatically
 */

class VersionManager {
    constructor() {
        this.version = this.generateVersion();
        this.init();
    }

    /**
     * Generate version based on build time or deployment
     */
    generateVersion() {
        // In production, this could be replaced with build-time version
        const buildDate = new Date();
        return buildDate.getFullYear().toString() + 
               (buildDate.getMonth() + 1).toString().padStart(2, '0') +
               buildDate.getDate().toString().padStart(2, '0') +
               buildDate.getHours().toString().padStart(2, '0') +
               buildDate.getMinutes().toString().padStart(2, '0');
    }

    /**
     * Initialize version management
     */
    init() {
        // Store current version
        localStorage.setItem('app-version', this.version);
        
        // Check for version updates
        this.checkForUpdates();
        
        // Auto-update CSS with version
        this.updateCSSVersion();
        
        console.log(`File Converter v${this.version} initialized`);
    }

    /**
     * Check if app version has updated
     */
    checkForUpdates() {
        const storedVersion = localStorage.getItem('app-version');
        const currentVersion = this.version;
        
        if (storedVersion && storedVersion !== currentVersion) {
            console.log(`Version updated: ${storedVersion} → ${currentVersion}`);
            this.handleVersionUpdate();
        }
    }

    /**
     * Handle version update (clear caches, etc.)
     */
    async handleVersionUpdate() {
        try {
            // Clear old caches
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName.includes('file-converter')) {
                            console.log('Clearing old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }
            
            // Update service worker
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration) {
                    registration.update();
                }
            }
            
            console.log('Version update completed');
        } catch (error) {
            console.error('Version update failed:', error);
        }
    }

    /**
     * Automatically version CSS files
     */
    updateCSSVersion() {
        const cssLinks = document.querySelectorAll('link[rel="stylesheet"]');
        cssLinks.forEach(link => {
            if (link.href.includes('/assets/styles/')) {
                const url = new URL(link.href);
                url.searchParams.set('v', this.version);
                link.href = url.toString();
            }
        });
    }

    /**
     * Get versioned URL for any resource
     */
    getVersionedUrl(url) {
        const versionedUrl = new URL(url, window.location.origin);
        versionedUrl.searchParams.set('v', this.version);
        return versionedUrl.toString();
    }

    /**
     * Force cache refresh (for manual use)
     */
    async forceCacheRefresh() {
        try {
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
            }
            
            window.location.reload(true);
        } catch (error) {
            console.error('Force refresh failed:', error);
        }
    }
}

// Auto-initialize version manager
document.addEventListener('DOMContentLoaded', () => {
    window.versionManager = new VersionManager();
});

// Global function for manual cache clearing
window.clearAllCaches = () => {
    if (window.versionManager) {
        window.versionManager.forceCacheRefresh();
    }
};

export default VersionManager;