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
        this.renderNavigation();
        console.log('Navigation: Init completed');
        logger?.info('Navigation component initialized', { currentPage: this.currentPage });
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