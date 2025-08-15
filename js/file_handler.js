// File Handler - Manages file loading, drag/drop, and export operations

class FileHandler {
    constructor(editor) {
        this.editor = editor;
    }
    
    initialize() {
        this.setupDragAndDrop();
        this.setupFileClickHandlers();
        console.log('FileHandler initialized');
    }
    
    setupFileClickHandlers() {
        // Click drop zone to open file dialog
        this.editor.editorDropZone?.addEventListener('click', () => {
            if (!this.editor.isProcessing) {
                this.editor.editorFileInput?.click();
            }
        });
    }
    
    setupDragAndDrop() {
        if (!this.editor.editorDropZone) return;
        
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.editor.editorDropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        // Drag enter - show drag state
        this.editor.editorDropZone.addEventListener('dragenter', () => {
            if (!this.editor.isProcessing) {
                this.editor.editorDropZone.classList.add('dragover');
            }
        });

        // Drag over - maintain drag state
        this.editor.editorDropZone.addEventListener('dragover', () => {
            if (!this.editor.isProcessing) {
                this.editor.editorDropZone.classList.add('dragover');
            }
        });

        // Drag leave - remove drag state when leaving bounds
        this.editor.editorDropZone.addEventListener('dragleave', (e) => {
            const rect = this.editor.editorDropZone.getBoundingClientRect();
            const x = e.clientX;
            const y = e.clientY;
            
            if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                this.editor.editorDropZone.classList.remove('dragover');
            }
        });

        // Drop - handle file drop
        this.editor.editorDropZone.addEventListener('drop', (e) => {
            this.editor.editorDropZone.classList.remove('dragover');
            
            if (!this.editor.isProcessing && e.dataTransfer?.files?.length) {
                const file = e.dataTransfer.files[0];
                if (file && /\.gif$/i.test(file.name)) {
                    this.loadGifForEditing(file);
                } else {
                    this.editor.uiManager.showStatus('❌ Please drop a GIF file.', 'error');
                }
            }
        });

        // Hover effects
        this.editor.editorDropZone.addEventListener('mouseenter', () => {
            if (!this.editor.isProcessing) {
                this.editor.editorDropZone.classList.add('hover');
            }
        });

        this.editor.editorDropZone.addEventListener('mouseleave', () => {
            this.editor.editorDropZone.classList.remove('hover');
        });
    }
    
    // Load GIF file for editing
    async loadGifForEditing(file) {
        if (!file) return;

        // Validate file type
        if (!file.type.includes('gif') && !file.name.toLowerCase().endsWith('.gif')) {
            this.editor.uiManager.showStatus('❌ Please select a GIF file.', 'error');
            return;
        }

        // Check file size
        const maxSize = 100 * 1024 * 1024; // 100MB
        if (file.size > maxSize) {
            this.editor.uiManager.showStatus(`❌ File too large. Maximum size: ${maxSize / (1024*1024)}MB`, 'error');
            return;
        }

        console.log('Starting GIF upload process...');
        this.editor.isProcessing = true;
        
        // Store the original file immediately
        this.editor.originalGifBlob = file;
        
        // Update UI state
        this.setProcessingState(true);
        this.resetVideoState();

        this.editor.uiManager.showStatus('⏳ Uploading GIF for preview...', 'info');

        try {
            // Upload file for conversion to WebM
            const webmBlob = await this.convertGifToWebm(file);
            
            // Create preview URL and load video
            await this.loadVideoPreview(webmBlob);
            
            // Update UI with loaded file info
            this.editor.uiManager.updateFilename(file.name);
            this.editor.uiManager.showEditor();

            const fileSizeKB = file.size / 1024;
            this.editor.uiManager.showStatus(
                `✅ Preview ready! File: ${file.name} (${fileSizeKB.toFixed(0)}KB)`, 
                'success'
            );

        } catch (err) {
            console.error('Error loading GIF:', err);
            this.editor.uiManager.showStatus(`❌ Failed to load preview: ${err.message}`, 'error');
            this.cleanupVideoState();
        } finally {
            this.editor.isProcessing = false;
            this.setProcessingState(false);
        }
    }
    
    // Convert GIF to WebM for preview
    async convertGifToWebm(file) {
        this.editor.uiManager.showStatus('⏳ Processing preview...', 'info');

        const formData = new FormData();
        formData.append('file', file, file.name);

        const uploadResponse = await fetch(`${this.editor.SERVER_URL}/convert/gif-to-webm`, {
            method: 'POST',
            body: formData
        });

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            throw new Error(`Server error: ${uploadResponse.status} - ${errorText}`);
        }

        const webmBlob = await uploadResponse.blob();

        if (!webmBlob || webmBlob.size === 0) {
            throw new Error('Received empty response from server');
        }

        return webmBlob;
    }
    
    // Load WebM blob as video preview
    async loadVideoPreview(webmBlob) {
        this.editor.previewVideoUrl = URL.createObjectURL(webmBlob);
        this.editor.previewVideo.src = this.editor.previewVideoUrl;

        return new Promise((resolve, reject) => {
            const handleLoaded = () => {
                this.editor.previewVideo.removeEventListener('loadedmetadata', handleLoaded);
                this.editor.previewVideo.removeEventListener('error', handleError);
                resolve();
            };
            
            const handleError = (e) => {
                this.editor.previewVideo.removeEventListener('loadedmetadata', handleLoaded);
                this.editor.previewVideo.removeEventListener('error', handleError);
                reject(new Error(`Video load error: ${e.message}`));
            };
            
            this.editor.previewVideo.addEventListener('loadedmetadata', handleLoaded);
            this.editor.previewVideo.addEventListener('error', handleError);
            
            this.editor.previewVideo.load();
            
            // Timeout after 10 seconds
            setTimeout(() => {
                this.editor.previewVideo.removeEventListener('loadedmetadata', handleLoaded);
                this.editor.previewVideo.removeEventListener('error', handleError);
                reject(new Error('Video load timeout'));
            }, 10000);
        });
    }
    
    // Set processing state UI
    setProcessingState(processing) {
        if (this.editor.editorDropZone) {
            this.editor.editorDropZone.classList.toggle('processing', processing);
            this.editor.editorDropZone.classList.remove('dragover', 'hover');
        }
    }
    
    // Reset video state
    resetVideoState() {
        // Don't reset originalGifBlob here - it's set in loadGifForEditing
        
        if (this.editor.previewVideoUrl) {
            URL.revokeObjectURL(this.editor.previewVideoUrl);
        }
        this.editor.previewVideoUrl = null;
        
        if (this.editor.previewVideo) {
            this.editor.previewVideo.src = '';
            this.editor.previewVideo.load();
        }
        
        this.editor.videoDuration = 0;
        this.editor.startTime = 0;
        this.editor.endTime = 0;
        this.editor.currentTime = 0;
    }
    
    // Clean up video state after error
    cleanupVideoState() {
        if (this.editor.previewVideoUrl) {
            URL.revokeObjectURL(this.editor.previewVideoUrl);
            this.editor.previewVideoUrl = null;
        }
    }
    
    // Export trimmed GIF with optional ping-pong loop
    async exportTrimmedGif() {
        if (!this.editor.originalGifBlob) {
            this.editor.uiManager.showStatus('❌ No GIF loaded for export.', 'error');
            return;
        }

        if (this.editor.isProcessing) {
            this.editor.uiManager.showStatus('⏳ Please wait for current processing to complete.', 'error');
            return;
        }

        const exportBtn = document.getElementById('exportTrimmedBtn');
        
        // Check if ping-pong mode is enabled
        const pingPongMode = document.getElementById('pingPongMode')?.checked || false;
        
        // Disable export button
        if (exportBtn) exportBtn.disabled = true;
        
        // Show progress
        this.editor.uiManager.updateExportProgress('prepare', 10, 'Preparing to trim...');
        
        this.editor.isProcessing = true;

        try {
            this.editor.uiManager.showStatus(
                pingPongMode ? '✂️🔄 Creating ping-pong GIF...' : '✂️ Trimming GIF on server...', 
                'info'
            );
            
            // Upload and trim
            this.editor.uiManager.updateExportProgress('upload', 30, 'Uploading for trimming...');
            const trimmedBlob = await this.trimGifOnServer(pingPongMode);
            
            // Download result
            this.editor.uiManager.updateExportProgress('download', 100, 'Download ready!');
            this.downloadTrimmedGif(trimmedBlob, pingPongMode);
            
            const outputSizeKB = trimmedBlob.size / 1024;
            this.editor.uiManager.showStatus(
                `✅ ${pingPongMode ? 'Ping-Pong' : 'Trimmed'} GIF downloaded! Size: ${outputSizeKB.toFixed(0)}KB`, 
                'success'
            );
            
        } catch (err) {
            console.error('Export error:', err);
            this.editor.uiManager.showStatus(`❌ Export failed: ${err.message}`, 'error');
        } finally {
            this.editor.isProcessing = false;
            if (exportBtn) exportBtn.disabled = false;
            this.editor.uiManager.hideExportProgress();
        }
    }
    
    // Trim GIF on server with optional ping-pong mode
    async trimGifOnServer(pingPongMode = false) {
        this.editor.uiManager.updateExportProgress('process', 70, 
            pingPongMode ? 'Creating ping-pong effect...' : 'Processing trim...');

        const form = new FormData();
        form.append('file', this.editor.originalGifBlob, this.editor.originalGifBlob.name);
        form.append('start', String(this.editor.startTime));
        form.append('end', String(this.editor.endTime));
        
        // Add ping-pong parameter if enabled
        if (pingPongMode) {
            form.append('pingpong', 'true');
        }

        // Try ping-pong endpoint first if enabled, fallback to regular trim
        let endpoint = '/edit/trim-gif';
        if (pingPongMode) {
            endpoint = '/edit/trim-gif-pingpong';
        }

        const res = await fetch(`${this.editor.SERVER_URL}${endpoint}`, {
            method: 'POST',
            body: form
        });

        // If ping-pong endpoint fails, fallback to regular trim
        if (!res.ok && pingPongMode) {
            console.warn('Ping-pong endpoint not available, using regular trim');
            this.editor.uiManager.showStatus('⚠️ Ping-pong not supported by server, using regular trim', 'info');
            
            // Retry with regular endpoint
            const fallbackForm = new FormData();
            fallbackForm.append('file', this.editor.originalGifBlob, this.editor.originalGifBlob.name);
            fallbackForm.append('start', String(this.editor.startTime));
            fallbackForm.append('end', String(this.editor.endTime));

            const fallbackRes = await fetch(`${this.editor.SERVER_URL}/edit/trim-gif`, {
                method: 'POST',
                body: fallbackForm
            });

            if (!fallbackRes.ok) {
                const errorText = await fallbackRes.text();
                console.error('Export failed:', errorText);
                throw new Error(`Server error: ${fallbackRes.status}`);
            }

            const outBlob = await fallbackRes.blob();
            
            if (!outBlob || outBlob.size === 0) {
                throw new Error('Received empty file from server');
            }
            
            return outBlob;
        }

        if (!res.ok) {
            const errorText = await res.text();
            console.error('Export failed:', errorText);
            throw new Error(`Server error: ${res.status}`);
        }

        const outBlob = await res.blob();
        
        if (!outBlob || outBlob.size === 0) {
            throw new Error('Received empty file from server');
        }
        
        return outBlob;
    }
    
    // Download trimmed GIF file with appropriate naming
    downloadTrimmedGif(blob, pingPongMode = false) {
        const outUrl = URL.createObjectURL(blob);

        const suffix = pingPongMode ? 
            `_pingpong_${this.editor.startTime.toFixed(1)}s-${this.editor.endTime.toFixed(1)}s` :
            `_trimmed_${this.editor.startTime.toFixed(1)}s-${this.editor.endTime.toFixed(1)}s`;

        const filename = this.makeOutputName(this.editor.originalGifBlob.name, suffix);

        const a = document.createElement('a');
        a.href = outUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();

        URL.revokeObjectURL(outUrl);
    }
    
    // Generate output filename with suffix
    makeOutputName(name, suffix) {
        const dot = name.lastIndexOf('.');
        if (dot <= 0) return name + suffix + '.gif';
        return name.slice(0, dot) + suffix + name.slice(dot);
    }
    
    // Check if file is valid GIF
    isValidGifFile(file) {
        return file && (file.type.includes('gif') || file.name.toLowerCase().endsWith('.gif'));
    }
    
    // Get file size in human readable format
    getFileSizeString(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    
    // Validate file before processing
    validateFile(file) {
        const errors = [];
        
        if (!this.isValidGifFile(file)) {
            errors.push('File must be a GIF');
        }
        
        const maxSize = 100 * 1024 * 1024; // 100MB
        if (file.size > maxSize) {
            errors.push(`File too large (max: ${this.getFileSizeString(maxSize)})`);
        }
        
        if (file.size === 0) {
            errors.push('File is empty');
        }
        
        return errors;
    }
    
    // Store original GIF blob
    setOriginalGif(blob) {
        this.editor.originalGifBlob = blob;
    }
    
    // Cleanup
    cleanup() {
        // Clean up any blob URLs
        if (this.editor.previewVideoUrl) {
            URL.revokeObjectURL(this.editor.previewVideoUrl);
            this.editor.previewVideoUrl = null;
        }
        
        console.log('FileHandler cleanup completed');
    }
}

// Prevent default drag behaviors globally for the drop zone
['dragenter', 'dragover'].forEach(eventName => {
    document.addEventListener(eventName, (e) => {
        if (e.target.closest('#editorDropZone')) {
            e.preventDefault();
            e.stopPropagation();
        }
    });
});