/**
 * PWA Icon Generator
 * Generates missing PWA icons programmatically
 */

class IconGenerator {
    constructor() {
        this.iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];
        this.shortcutSizes = [96];
    }

    /**
     * Generate all missing PWA icons
     */
    async generateAllIcons() {
        logger.info('Starting PWA icon generation...');
        
        try {
            // Generate main app icons
            for (const size of this.iconSizes) {
                await this.generateIcon(size, '🔄', `icon-${size}x${size}.png`);
            }

            // Generate shortcut icons
            await this.generateIcon(96, '📸', 'shortcut-png-converter.png');
            await this.generateIcon(96, '🎬', 'shortcut-gif-converter.png');
            await this.generateIcon(96, '🖼️', 'shortcut-icon-maker.png');

            logger.info('PWA icon generation completed successfully');
            return true;
        } catch (error) {
            logger.error('PWA icon generation failed:', error);
            return false;
        }
    }

    /**
     * Generate a single icon with specified parameters
     */
    async generateIcon(size, emoji, filename) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = size;
            canvas.height = size;

            // Create gradient background
            const gradient = ctx.createLinearGradient(0, 0, size, size);
            gradient.addColorStop(0, '#667eea');
            gradient.addColorStop(1, '#764ba2');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, size, size);

            // Add emoji/icon
            const fontSize = Math.floor(size * 0.6);
            ctx.font = `${fontSize}px Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff';
            
            // Shadow for better visibility
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            
            ctx.fillText(emoji, size / 2, size / 2);

            // Convert to blob and trigger download
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                logger.debug(`Generated icon: ${filename} (${size}x${size})`);
                resolve();
            }, 'image/png');
        });
    }

    /**
     * Check if icons are missing and offer to generate them
     */
    async checkAndGenerateIcons() {
        // Check if any icon is missing by trying to load the main 192x192 icon
        const testIcon = new Image();
        testIcon.onload = () => {
            logger.debug('PWA icons appear to be present');
        };
        testIcon.onerror = () => {
            logger.warn('PWA icons missing, offering to generate...');
            this.showIconGenerationPrompt();
        };
        testIcon.src = 'assets/icons/icon-192x192.png';
    }

    /**
     * Show prompt to user for icon generation
     */
    showIconGenerationPrompt() {
        const shouldGenerate = confirm(
            'PWA icons are missing. Would you like to generate them automatically?\n\n' +
            'This will download icon files that you can upload to your assets/icons/ folder.'
        );

        if (shouldGenerate) {
            this.generateAllIcons();
        }
    }
}

// Initialize icon generator
const iconGenerator = new IconGenerator();

// Auto-check on page load (only in development)
if (logger.isDevelopment) {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => iconGenerator.checkAndGenerateIcons(), 2000);
    });
}

// Export for manual use
window.IconGenerator = IconGenerator;
