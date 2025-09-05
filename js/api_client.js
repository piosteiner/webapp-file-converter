/**
 * API Client for File Converter
 * Handles all server communication
 */

class APIClient {
    constructor() {
        this.baseURL = 'https://api.piogino.ch';
    }

    /**
     * Convert image to 100x100 PNG icon
     * @param {File} file - The image file to convert
     * @param {string} background - Background type ('transparent', 'white', 'black')
     * @param {string} scaling - Scaling method ('contain', 'cover')
     * @returns {Promise<Blob>} The converted image blob
     */
    async convertToIcon(file, background = 'transparent', scaling = 'contain') {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('background', background);
        formData.append('scaling', scaling);

        const response = await fetch(`${this.baseURL}/convert/image-to-icon`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }

        return await response.blob();
    }

    /**
     * Convert image to PNG stickers
     * @param {File} file - The image file to convert
     * @param {Object} options - Conversion options
     * @returns {Promise<Blob>} The converted image blob
     */
    async convertToSticker(file, options = {}) {
        const formData = new FormData();
        formData.append('file', file);
        
        // Add options to form data
        Object.keys(options).forEach(key => {
            formData.append(key, options[key]);
        });

        const response = await fetch(`${this.baseURL}/convert/image-to-sticker`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }

        return await response.blob();
    }

    /**
     * Convert GIF to WebM
     * @param {File} file - The GIF file to convert
     * @param {Object} options - Conversion options
     * @returns {Promise<Blob>} The converted video blob
     */
    async convertGifToWebM(file, options = {}) {
        const formData = new FormData();
        formData.append('file', file);
        
        Object.keys(options).forEach(key => {
            formData.append(key, options[key]);
        });

        const response = await fetch(`${this.baseURL}/convert/gif-to-webm`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }

        return await response.blob();
    }
}

// Export for use in other modules
window.APIClient = APIClient;
