/**
 * PNG Icons Converter
 * Handles the conversion of images to 100x100 PNG icons
 */

class PNGIconsConverter {
    constructor() {
        this.apiClient = new APIClient();
        this.currentFile = null;
        this.convertedBlob = null;
        this.elements = {};
        
        this.init();
    }

    init() {
        this.bindElements();
        this.setupEventListeners();
    }

    bindElements() {
        this.elements = {
            dropZone: document.getElementById('dropZone'),
            fileInput: document.getElementById('fileInput'),
            previewSection: document.getElementById('previewSection'),
            controlsSection: document.getElementById('controlsSection'),
            downloadSection: document.getElementById('downloadSection'),
            originalPreview: document.getElementById('originalPreview'),
            resultPreview: document.getElementById('resultPreview'),
            originalInfo: document.getElementById('originalInfo'),
            resultInfo: document.getElementById('resultInfo'),
            downloadBtn: document.getElementById('downloadBtn'),
            status: document.getElementById('status')
        };
    }

    setupEventListeners() {
        const { dropZone, fileInput, downloadBtn } = this.elements;

        // File selection
        dropZone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Drag and drop
        UIHelpers.setupDragAndDrop(dropZone, (file) => this.processFile(file));

        // Settings change
        document.querySelectorAll('input[name="background"], input[name="scaling"]').forEach(input => {
            input.addEventListener('change', () => this.handleSettingsChange());
        });

        // Download
        downloadBtn.addEventListener('click', () => this.downloadResult());
    }

    handleFileSelect(e) {
        if (e.target.files.length > 0) {
            this.processFile(e.target.files[0]);
        }
    }

    async processFile(file) {
        // Validate file
        const validation = UIHelpers.validateFile(file, ['image/*'], 10);
        if (!validation.isValid) {
            UIHelpers.showStatus(validation.error, 'error', this.elements.status);
            return;
        }

        this.currentFile = file;
        await this.showOriginalPreview();
        await this.convertImage();
    }

    async showOriginalPreview() {
        try {
            const imageInfo = await UIHelpers.getImageInfo(this.currentFile);
            
            // Show original preview
            const url = URL.createObjectURL(this.currentFile);
            this.elements.originalPreview.src = url;
            this.elements.originalPreview.onload = () => URL.revokeObjectURL(url);
            
            // Update info
            this.elements.originalInfo.textContent = `${imageInfo.width}×${imageInfo.height} • ${imageInfo.size}`;

            // Show sections
            UIHelpers.toggleElement(this.elements.previewSection, true);
            UIHelpers.toggleElement(this.elements.controlsSection, true);
            
            // Reset result
            this.elements.resultPreview.classList.add('hidden');
            UIHelpers.toggleElement(this.elements.downloadSection, false);
            this.elements.resultInfo.textContent = 'Processing...';

        } catch (error) {
            UIHelpers.showStatus('Failed to load image preview', 'error', this.elements.status);
        }
    }

    async convertImage() {
        try {
            UIHelpers.showStatus('Converting image to 100×100 PNG...', 'processing', this.elements.status, 0);
            this.elements.dropZone.classList.add('processing');

            const background = this.getSelectedBackground();
            const scaling = this.getSelectedScaling();

            this.convertedBlob = await this.apiClient.convertToIcon(this.currentFile, background, scaling);
            
            this.showResult();
            UIHelpers.showStatus('✅ Image converted successfully!', 'success', this.elements.status);

            // Auto-download after conversion
            setTimeout(() => {
                this.downloadResult();
            }, 500);

        } catch (error) {
            console.error('Conversion error:', error);
            UIHelpers.showStatus(`❌ Conversion failed: ${error.message}`, 'error', this.elements.status);
        } finally {
            this.elements.dropZone.classList.remove('processing');
        }
    }

    showResult() {
        const url = URL.createObjectURL(this.convertedBlob);
        this.elements.resultPreview.src = url;
        this.elements.resultPreview.classList.remove('hidden');
        
        const sizeKB = UIHelpers.formatFileSize(this.convertedBlob.size);
        this.elements.resultInfo.textContent = `100×100 PNG • ${sizeKB}`;
        
        UIHelpers.toggleElement(this.elements.downloadSection, true);
    }

    handleSettingsChange() {
        if (this.currentFile) {
            this.convertImage();
        }
    }

    getSelectedBackground() {
        return document.querySelector('input[name="background"]:checked').value;
    }

    getSelectedScaling() {
        return document.querySelector('input[name="scaling"]:checked').value;
    }

    downloadResult() {
        if (!this.convertedBlob || !this.currentFile) return;

        const originalName = this.currentFile.name.replace(/\.[^/.]+$/, '');
        const filename = `${originalName}_100x100.png`;
        
        UIHelpers.downloadBlob(this.convertedBlob, filename, this.elements.status);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PNGIconsConverter();
});
