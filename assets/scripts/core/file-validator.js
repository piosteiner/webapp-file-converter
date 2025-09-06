/**
 * File Validation and Error Handling System
 * Provides comprehensive file validation and user-friendly error messages
 */

class FileValidator {
    constructor() {
        // File type configurations
        this.mimeTypes = {
            png: ['image/png'],
            jpeg: ['image/jpeg', 'image/jpg'],
            gif: ['image/gif'],
            webp: ['image/webp'],
            bmp: ['image/bmp'],
            tiff: ['image/tiff', 'image/tif'],
            svg: ['image/svg+xml'],
            ico: ['image/x-icon', 'image/vnd.microsoft.icon']
        };

        // File size limits (in bytes)
        this.sizeLimits = {
            image: 50 * 1024 * 1024, // 50MB for images
            gif: 100 * 1024 * 1024,  // 100MB for GIFs
            default: 20 * 1024 * 1024 // 20MB default
        };

        // File extension mapping
        this.extensions = {
            '.png': 'png',
            '.jpg': 'jpeg',
            '.jpeg': 'jpeg',
            '.gif': 'gif',
            '.webp': 'webp',
            '.bmp': 'bmp',
            '.tiff': 'tiff',
            '.tif': 'tiff',
            '.svg': 'svg',
            '.ico': 'ico'
        };
    }

    /**
     * Validate a single file
     * @param {File} file - File to validate
     * @param {Array} allowedTypes - Array of allowed file types
     * @param {number} maxSize - Maximum file size in bytes
     * @returns {Object} Validation result
     */
    validateFile(file, allowedTypes = [], maxSize = null) {
        const result = {
            isValid: true,
            errors: [],
            warnings: [],
            fileInfo: {
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified
            }
        };

        try {
            // Check if file exists and has content
            if (!file || file.size === 0) {
                result.errors.push('File is empty or corrupted');
                result.isValid = false;
                return result;
            }

            // Validate file type
            const typeValidation = this.validateFileType(file, allowedTypes);
            if (!typeValidation.isValid) {
                result.errors.push(...typeValidation.errors);
                result.isValid = false;
            }

            // Validate file size
            const sizeValidation = this.validateFileSize(file, maxSize);
            if (!sizeValidation.isValid) {
                result.errors.push(...sizeValidation.errors);
                result.isValid = false;
            }
            if (sizeValidation.warnings.length > 0) {
                result.warnings.push(...sizeValidation.warnings);
            }

            // Check file name
            const nameValidation = this.validateFileName(file.name);
            if (!nameValidation.isValid) {
                result.warnings.push(...nameValidation.warnings);
            }

            // Additional security checks
            const securityValidation = this.validateSecurity(file);
            if (!securityValidation.isValid) {
                result.errors.push(...securityValidation.errors);
                result.isValid = false;
            }

            logger.debug('File validation completed', { file: file.name, result });

        } catch (error) {
            logger.error('File validation failed', error);
            result.errors.push('File validation failed: ' + error.message);
            result.isValid = false;
        }

        return result;
    }

    /**
     * Validate multiple files
     * @param {FileList|Array} files - Files to validate
     * @param {Array} allowedTypes - Array of allowed file types
     * @param {number} maxSize - Maximum file size in bytes
     * @returns {Object} Validation results
     */
    validateFiles(files, allowedTypes = [], maxSize = null) {
        const results = {
            validFiles: [],
            invalidFiles: [],
            totalSize: 0,
            summary: {
                total: files.length,
                valid: 0,
                invalid: 0,
                warnings: 0
            }
        };

        Array.from(files).forEach((file, index) => {
            const validation = this.validateFile(file, allowedTypes, maxSize);
            
            if (validation.isValid) {
                results.validFiles.push({ file, validation, index });
                results.totalSize += file.size;
                results.summary.valid++;
            } else {
                results.invalidFiles.push({ file, validation, index });
                results.summary.invalid++;
            }

            if (validation.warnings.length > 0) {
                results.summary.warnings++;
            }
        });

        logger.info('Batch file validation completed', results.summary);
        return results;
    }

    /**
     * Validate file type against allowed types
     */
    validateFileType(file, allowedTypes) {
        const result = { isValid: true, errors: [] };

        if (allowedTypes.length === 0) {
            return result; // No restrictions
        }

        const fileExtension = this.getFileExtension(file.name);
        const fileMimeType = file.type;

        let isValidType = false;

        // Check against allowed types
        for (const allowedType of allowedTypes) {
            const mimeTypes = this.mimeTypes[allowedType] || [];
            
            // Check MIME type
            if (mimeTypes.includes(fileMimeType)) {
                isValidType = true;
                break;
            }

            // Check extension as fallback
            if (this.extensions[fileExtension] === allowedType) {
                isValidType = true;
                break;
            }
        }

        if (!isValidType) {
            const allowedExtensions = allowedTypes.map(type => 
                Object.keys(this.extensions).filter(ext => this.extensions[ext] === type)
            ).flat();
            
            result.errors.push(
                `Invalid file type. Expected: ${allowedTypes.join(', ')} ` +
                `(${allowedExtensions.join(', ')}). Got: ${fileExtension || 'unknown'}`
            );
            result.isValid = false;
        }

        return result;
    }

    /**
     * Validate file size
     */
    validateFileSize(file, maxSize = null) {
        const result = { isValid: true, errors: [], warnings: [] };

        // Determine max size
        if (!maxSize) {
            const fileType = this.getFileTypeFromFile(file);
            maxSize = this.sizeLimits[fileType] || this.sizeLimits.default;
        }

        // Check if file exceeds limit
        if (file.size > maxSize) {
            result.errors.push(
                `File too large. Maximum size: ${this.formatFileSize(maxSize)}, ` +
                `actual size: ${this.formatFileSize(file.size)}`
            );
            result.isValid = false;
        }

        // Warning for large files (over 10MB)
        if (file.size > 10 * 1024 * 1024 && result.isValid) {
            result.warnings.push(
                `Large file detected (${this.formatFileSize(file.size)}). Processing may take longer.`
            );
        }

        return result;
    }

    /**
     * Validate file name
     */
    validateFileName(fileName) {
        const result = { isValid: true, warnings: [] };

        // Check for problematic characters
        const problematicChars = /[<>:"/\\|?*\x00-\x1f]/;
        if (problematicChars.test(fileName)) {
            result.warnings.push('File name contains special characters that may cause issues');
        }

        // Check length
        if (fileName.length > 255) {
            result.warnings.push('File name is very long and may be truncated');
        }

        // Check for Unicode characters
        if (/[^\x00-\x7F]/.test(fileName)) {
            result.warnings.push('File name contains non-ASCII characters');
        }

        return result;
    }

    /**
     * Basic security validation
     */
    validateSecurity(file) {
        const result = { isValid: true, errors: [] };

        // Check for suspicious file names
        const suspiciousPatterns = [
            /\.exe$/i, /\.scr$/i, /\.bat$/i, /\.cmd$/i,
            /\.com$/i, /\.pif$/i, /\.vbs$/i, /\.js$/i
        ];

        if (suspiciousPatterns.some(pattern => pattern.test(file.name))) {
            result.errors.push('File type not allowed for security reasons');
            result.isValid = false;
        }

        return result;
    }

    /**
     * Get file extension from filename
     */
    getFileExtension(fileName) {
        return fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    }

    /**
     * Get file type from file object
     */
    getFileTypeFromFile(file) {
        const extension = this.getFileExtension(file.name);
        const type = this.extensions[extension];
        
        if (type === 'gif') return 'gif';
        if (['png', 'jpeg', 'webp', 'bmp', 'tiff'].includes(type)) return 'image';
        return 'default';
    }

    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Create user-friendly error message
     */
    createErrorMessage(validation) {
        if (validation.isValid) return null;

        let message = `❌ ${validation.fileInfo.name}:\n`;
        message += validation.errors.map(error => `• ${error}`).join('\n');
        
        if (validation.warnings.length > 0) {
            message += '\n⚠️ Warnings:\n';
            message += validation.warnings.map(warning => `• ${warning}`).join('\n');
        }

        return message;
    }

    /**
     * Create batch validation summary
     */
    createBatchSummary(results) {
        let message = '';

        if (results.summary.valid > 0) {
            message += `✅ ${results.summary.valid} file(s) ready for processing`;
        }

        if (results.summary.invalid > 0) {
            if (message) message += '\n';
            message += `❌ ${results.summary.invalid} file(s) have errors`;
        }

        if (results.summary.warnings > 0) {
            if (message) message += '\n';
            message += `⚠️ ${results.summary.warnings} file(s) have warnings`;
        }

        if (results.totalSize > 0) {
            if (message) message += '\n';
            message += `📊 Total size: ${this.formatFileSize(results.totalSize)}`;
        }

        return message;
    }
}

// Create global validator instance
window.fileValidator = new FileValidator();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileValidator;
}
