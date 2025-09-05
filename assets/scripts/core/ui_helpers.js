/**
 * UI Helper Functions
 * Common UI manipulation utilities
 */

class UIHelpers {
    /**
     * Show status message to user
     * @param {string} message - The message to display
     * @param {string} type - The type of status ('success', 'error', 'warning', 'processing')
     * @param {HTMLElement} statusElement - The status element to update
     * @param {number} autoHideDelay - Auto-hide delay in ms (0 = no auto-hide)
     */
    static showStatus(message, type = 'info', statusElement, autoHideDelay = 5000) {
        if (!statusElement) return;

        if (type === 'processing') {
            statusElement.innerHTML = '<span class="spinner"></span>' + message;
        } else {
            statusElement.textContent = message;
        }

        statusElement.className = `status ${type}`;
        statusElement.classList.remove('hidden');

        if (autoHideDelay > 0 && (type === 'success' || type === 'error')) {
            setTimeout(() => {
                statusElement.classList.add('hidden');
            }, autoHideDelay);
        }
    }

    /**
     * Validate file type and size
     * @param {File} file - The file to validate
     * @param {Array} allowedTypes - Array of allowed MIME types
     * @param {number} maxSizeMB - Maximum file size in MB
     * @returns {Object} Validation result with isValid and error message
     */
    static validateFile(file, allowedTypes = ['image/*'], maxSizeMB = 10) {
        // Check file type
        const isValidType = allowedTypes.some(type => {
            if (type.endsWith('*')) {
                return file.type.startsWith(type.slice(0, -1));
            }
            return file.type === type;
        });

        if (!isValidType) {
            return {
                isValid: false,
                error: 'Please select a valid file type.'
            };
        }

        // Check file size
        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        if (file.size > maxSizeBytes) {
            return {
                isValid: false,
                error: `File is too large. Maximum size: ${maxSizeMB}MB`
            };
        }

        return { isValid: true };
    }

    /**
     * Format file size for display
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted file size
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    /**
     * Get image dimensions and info
     * @param {File} file - The image file
     * @returns {Promise<Object>} Image info object
     */
    static getImageInfo(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            
            img.onload = () => {
                const info = {
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                    size: UIHelpers.formatFileSize(file.size),
                    type: file.type
                };
                URL.revokeObjectURL(url);
                resolve(info);
            };
            
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load image'));
            };
            
            img.src = url;
        });
    }

    /**
     * Download a blob as a file
     * @param {Blob} blob - The blob to download
     * @param {string} filename - The filename for download
     * @param {HTMLElement} statusElement - Status element for feedback
     */
    static downloadBlob(blob, filename, statusElement = null) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (statusElement) {
            UIHelpers.showStatus('✅ Download started!', 'success', statusElement);
        }
    }

    /**
     * Set up drag and drop functionality
     * @param {HTMLElement} dropZone - The drop zone element
     * @param {Function} onFileDrop - Callback for file drop
     */
    static setupDragAndDrop(dropZone, onFileDrop) {
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            document.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });

        dropZone.addEventListener('dragover', () => {
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', (e) => {
            if (!dropZone.contains(e.relatedTarget)) {
                dropZone.classList.remove('dragover');
            }
        });

        dropZone.addEventListener('drop', (e) => {
            dropZone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0 && onFileDrop) {
                onFileDrop(files[0]);
            }
        });
    }

    /**
     * Show/hide elements with transition
     * @param {HTMLElement} element - Element to show/hide
     * @param {boolean} show - Whether to show or hide
     */
    static toggleElement(element, show) {
        if (!element) return;

        if (show) {
            element.classList.remove('hidden');
            element.classList.add('fade-in');
        } else {
            element.classList.add('hidden');
            element.classList.remove('fade-in');
        }
    }
}

// Export for use in other modules
window.UIHelpers = UIHelpers;
