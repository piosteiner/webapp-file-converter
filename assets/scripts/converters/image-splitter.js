class BattleMapSplitter {
    constructor() {
        this.originalImage = null;
        this.previewCanvas = document.getElementById('previewCanvas');
        this.previewCtx = this.previewCanvas.getContext('2d');
        
        // Grid configurations
        this.gridConfigs = {
            '2x3': {
                rows: 2,
                cols: 3,
                expectedWidth: 3366,
                expectedHeight: 3276,
                totalTiles: 6,
                description: '2 rows × 3 columns (6 tiles)',
                sizeMM: '570 × 554 mm'
            },
            '3x3': {
                rows: 3,
                cols: 3,
                expectedWidth: 3366,
                expectedHeight: 4911,
                totalTiles: 9,
                description: '3 rows × 3 columns (9 tiles)',
                sizeMM: '570 × 831 mm'
            }
        };
        
        this.selectedGrid = null;
        this.tileWidth = 1122;  // 190mm at 150 DPI
        this.tileHeight = 1638; // 277mm at 150 DPI
        this.marginPixels = 59; // 1cm at 150 DPI (10mm * 150 DPI / 25.4)
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const fileInput = document.getElementById('fileInput');
        const uploadArea = document.getElementById('uploadArea');
        const exportBtn = document.getElementById('exportBtn');
        const gridOptions = document.querySelectorAll('.grid-option');
        const backToGridBtn = document.getElementById('backToGridBtn');

        // Grid selection
        gridOptions.forEach(option => {
            option.addEventListener('click', () => this.selectGrid(option.dataset.grid));
        });

        // Back to grid selection
        backToGridBtn.addEventListener('click', () => this.showGridSelection());

        // File input change
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.processFile(files[0]);
            }
        });

        // Export button
        exportBtn.addEventListener('click', () => this.exportTiles());
    }

    selectGrid(gridType) {
        this.selectedGrid = gridType;
        const config = this.gridConfigs[gridType];
        
        // Update UI
        document.querySelectorAll('.grid-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        document.querySelector(`[data-grid="${gridType}"]`).classList.add('selected');
        
        // Update upload description
        document.getElementById('uploadDescription').textContent = 
            `Upload a ${config.expectedWidth} × ${config.expectedHeight} pixel image (${config.sizeMM})`;
        
        // Show upload section
        document.querySelector('.grid-selection-section').style.display = 'none';
        document.querySelector('.upload-section').style.display = 'block';
    }

    showGridSelection() {
        document.querySelector('.grid-selection-section').style.display = 'block';
        document.querySelector('.upload-section').style.display = 'none';
        document.querySelector('#previewSection').style.display = 'none';
        document.querySelector('#exportSection').style.display = 'none';
        this.selectedGrid = null;
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    processFile(file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file (PNG, JPG, JPEG)');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.originalImage = img;
                this.validateAndDisplayImage(img);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    validateAndDisplayImage(img) {
        if (!this.selectedGrid) {
            alert('Please select a grid layout first');
            return;
        }

        const config = this.gridConfigs[this.selectedGrid];
        const imageInfo = document.getElementById('imageInfo');
        const previewSection = document.getElementById('previewSection');

        // Update image info
        imageInfo.innerHTML = `
            <h4>Image Information</h4>
            <p><strong>Dimensions:</strong> ${img.width} × ${img.height} pixels</p>
            <p><strong>Expected:</strong> ${config.expectedWidth} × ${config.expectedHeight} pixels</p>
            <p><strong>File Size:</strong> ${this.formatFileSize(this.getImageFileSize())}</p>
        `;

        // Update grid configuration display
        document.getElementById('gridConfig').innerHTML = 
            `<strong>Grid:</strong> ${config.description}`;

        // Check if dimensions are close to expected (allow some tolerance)
        const widthTolerance = Math.abs(img.width - config.expectedWidth) / config.expectedWidth;
        const heightTolerance = Math.abs(img.height - config.expectedHeight) / config.expectedHeight;

        if (widthTolerance > 0.1 || heightTolerance > 0.1) {
            imageInfo.innerHTML += `
                <div style="color: #e53e3e; margin-top: 10px; padding: 10px; background: #fed7d7; border-radius: 5px;">
                    <strong>⚠️ Warning:</strong> Image dimensions don't match the expected ${config.sizeMM} size. 
                    The app will still work, but tiles may not be optimal for A4 printing.
                </div>
            `;
        }

        // Display preview
        this.displayPreview(img);
        previewSection.style.display = 'block';
    }

    displayPreview(img) {
        // Calculate preview size (max 600px wide)
        const maxPreviewWidth = 600;
        const scale = Math.min(maxPreviewWidth / img.width, maxPreviewWidth / img.height);
        const previewWidth = img.width * scale;
        const previewHeight = img.height * scale;

        // Set canvas size
        this.previewCanvas.width = previewWidth;
        this.previewCanvas.height = previewHeight;

        // Draw image
        this.previewCtx.drawImage(img, 0, 0, previewWidth, previewHeight);

        // Draw grid overlay
        this.drawGridOverlay(previewWidth, previewHeight);
    }

    drawGridOverlay(width, height) {
        const ctx = this.previewCtx;
        const config = this.gridConfigs[this.selectedGrid];
        
        // Grid lines
        ctx.strokeStyle = 'rgba(102, 126, 234, 0.7)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        // Vertical lines
        for (let i = 1; i < config.cols; i++) {
            const x = (width / config.cols) * i;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        // Horizontal lines
        for (let i = 1; i < config.rows; i++) {
            const y = (height / config.rows) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Reset line dash
        ctx.setLineDash([]);

        // Add tile numbers
        ctx.fillStyle = 'rgba(102, 126, 234, 0.8)';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let tileNumber = 1;
        for (let row = 0; row < config.rows; row++) {
            for (let col = 0; col < config.cols; col++) {
                const x = (width / config.cols) * col + (width / (config.cols * 2));
                const y = (height / config.rows) * row + (height / (config.rows * 2));
                
                // Draw background circle
                ctx.beginPath();
                ctx.arc(x, y, 20, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.fill();
                
                // Draw number
                ctx.fillStyle = 'rgba(102, 126, 234, 1)';
                ctx.fillText(tileNumber.toString(), x, y);
                tileNumber++;
            }
        }
    }

    async exportTiles() {
        if (!this.originalImage || !this.selectedGrid) {
            alert('Please upload an image and select a grid layout first');
            return;
        }

        const config = this.gridConfigs[this.selectedGrid];
        const format = document.querySelector('input[name="format"]:checked').value;
        const exportSection = document.getElementById('exportSection');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const downloadLinks = document.getElementById('downloadLinks');

        // Show export section
        exportSection.style.display = 'block';
        downloadLinks.innerHTML = '';

        // Calculate actual tile dimensions based on image size
        const actualTileWidth = this.originalImage.width / config.cols;
        const actualTileHeight = this.originalImage.height / config.rows;

        const tiles = [];
        let processedTiles = 0;

        // Create tiles
        for (let row = 0; row < config.rows; row++) {
            for (let col = 0; col < config.cols; col++) {
                const tileNumber = row * config.cols + col + 1;
                
                // Create canvas for this tile with margins
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Canvas size includes margins (1cm = ~59 pixels at 150 DPI)
                canvas.width = actualTileWidth + (this.marginPixels * 2);
                canvas.height = actualTileHeight + (this.marginPixels * 2);
                
                // Fill with white background
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Draw the tile portion with margins
                const sourceX = col * actualTileWidth;
                const sourceY = row * actualTileHeight;
                
                ctx.drawImage(
                    this.originalImage,
                    sourceX, sourceY, actualTileWidth, actualTileHeight,
                    this.marginPixels, this.marginPixels, actualTileWidth, actualTileHeight
                );

                // Export based on format
                if (format === 'png') {
                    await this.exportAsPNG(canvas, `tile_${tileNumber}`, tileNumber);
                } else {
                    await this.exportAsPDF(canvas, `tile_${tileNumber}`, tileNumber);
                }

                processedTiles++;
                const progress = (processedTiles / config.totalTiles) * 100;
                progressFill.style.width = `${progress}%`;
                progressText.textContent = `${processedTiles}/${config.totalTiles} tiles exported`;

                // Small delay to show progress
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
    }

    async exportAsPNG(canvas, filename, tileNumber) {
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const downloadLinks = document.getElementById('downloadLinks');
                
                const link = document.createElement('a');
                link.href = url;
                link.download = `${filename}.png`;
                link.className = 'download-link';
                link.textContent = `📄 Download Tile ${tileNumber} (PNG)`;
                
                downloadLinks.appendChild(link);
                resolve();
            }, 'image/png');
        });
    }

    async exportAsPDF(canvas, filename, tileNumber) {
        return new Promise((resolve) => {
            // Convert canvas to image data
            const imgData = canvas.toDataURL('image/png');
            
            // Create PDF (A4 size: 210 × 297 mm)
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });
            
            // Add image to PDF (fit to A4 with margins)
            const pdfWidth = 210 - 20; // A4 width minus 1cm margins on each side
            const pdfHeight = 297 - 20; // A4 height minus 1cm margins on each side
            
            pdf.addImage(imgData, 'PNG', 10, 10, pdfWidth, pdfHeight);
            
            // Create download link
            const pdfBlob = pdf.output('blob');
            const url = URL.createObjectURL(pdfBlob);
            const downloadLinks = document.getElementById('downloadLinks');
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `${filename}.pdf`;
            link.className = 'download-link';
            link.textContent = `📄 Download Tile ${tileNumber} (PDF)`;
            
            downloadLinks.appendChild(link);
            resolve();
        });
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getImageFileSize() {
        // This is an approximation since we can't get the exact file size from canvas
        if (!this.originalImage) return 0;
        return this.originalImage.width * this.originalImage.height * 4; // 4 bytes per pixel (RGBA)
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new BattleMapSplitter();
});