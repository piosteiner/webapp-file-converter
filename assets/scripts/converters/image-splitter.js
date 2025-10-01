class BattleMapSplitter {
    constructor() {
        this.originalImage = null;
        this.baseFileName = 'image'; // Default filename if none provided
        this.generatedTiles = []; // Store all generated tiles for bulk download
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
                expectedHeight: 4914, // Fixed: 1638px × 3 = 4914px (was 4911px)
                totalTiles: 9,
                description: '3 rows × 3 columns (9 tiles)',
                sizeMM: '570 × 832 mm'
            }
        };
        
        this.selectedGrid = null;
        this.tileWidth = Math.round(190 * 150 / 25.4);   // 190mm at 150 DPI = 1122px
        this.tileHeight = Math.round(277 * 150 / 25.4); // 277mm at 150 DPI = 1638px  
        this.marginPixels = Math.round(10 * 150 / 25.4); // 10mm at 150 DPI = 59px
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const fileInput = document.getElementById('fileInput');
        const uploadArea = document.getElementById('uploadArea');
        const exportBtn = document.getElementById('exportBtn');
        const gridOptions = document.querySelectorAll('.grid-option');
        const backToGridBtn = document.getElementById('backToGridBtn');

        // Grid selection
        console.log(`Found ${gridOptions.length} grid options`);
        gridOptions.forEach(option => {
            console.log(`Adding click handler to:`, option.dataset.grid);
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
        
        // Download all button
        const downloadAllBtn = document.getElementById('downloadAllBtn');
        downloadAllBtn.addEventListener('click', () => this.downloadAllTiles());
    }

    selectGrid(gridType) {
        console.log(`Grid selected: ${gridType}`);
        this.selectedGrid = gridType;
        const config = this.gridConfigs[gridType];
        console.log(`Grid config:`, config);
        
        // Update UI
        document.querySelectorAll('.grid-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        document.querySelector(`[data-grid="${gridType}"]`).classList.add('selected');
        
        // Update upload description
        document.getElementById('uploadDescription').textContent = 
            `Upload a ${config.expectedWidth} × ${config.expectedHeight} pixel image (${config.sizeMM})`;
        
        // Update input dimensions in the size requirements box
        const inputDimensions = document.getElementById('inputDimensions');
        if (inputDimensions) {
            inputDimensions.innerHTML = `<strong>${config.expectedWidth} × ${config.expectedHeight} pixels</strong> (${config.sizeMM})`;
        }
        
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

        // Store the current file for size calculations
        this.currentFile = file;
        
        // Extract filename without extension for tile naming
        const fileName = file.name;
        const lastDot = fileName.lastIndexOf('.');
        let baseFileName = lastDot > 0 ? fileName.substring(0, lastDot) : fileName;
        
        // Clean filename to remove problematic characters
        this.baseFileName = baseFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        console.log(`Original filename: "${file.name}" -> Base filename: "${this.baseFileName}"`);

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

        // Get actual file size from the original file if available
        const actualFileSize = this.currentFile ? this.currentFile.size : this.getImageFileSize();

        // Update image info
        imageInfo.innerHTML = `
            <h4>Image Information</h4>
            <p><strong>Dimensions:</strong> ${img.width} × ${img.height} pixels</p>
            <p><strong>Expected:</strong> ${config.expectedWidth} × ${config.expectedHeight} pixels</p>
            <p><strong>File Size:</strong> ${this.formatFileSize(actualFileSize)}</p>
        `;

        // Update grid configuration display
        document.getElementById('gridConfig').innerHTML = 
            `<strong>Grid:</strong> ${config.description}`;

        // Orientation-agnostic dimension validation
        const imageWidth = Math.max(img.width, img.height);  // Longest side
        const imageHeight = Math.min(img.width, img.height); // Shortest side
        const expectedWidth = Math.max(config.expectedWidth, config.expectedHeight);  // Longest side
        const expectedHeight = Math.min(config.expectedWidth, config.expectedHeight); // Shortest side

        // Calculate tolerances
        const widthTolerance = Math.abs(imageWidth - expectedWidth) / expectedWidth;
        const heightTolerance = Math.abs(imageHeight - expectedHeight) / expectedHeight;
        const maxTolerance = Math.max(widthTolerance, heightTolerance);

        // Tiered warning system
        let warningMessage = '';
        let warningColor = '';
        let warningBg = '';
        let warningIcon = '';

        if (maxTolerance <= 0.02) {
            // Perfect or very close (≤2% difference) - no warning
        } else if (maxTolerance <= 0.05) {
            // Minor deviation (2-5% difference) - info message
            warningColor = '#3182ce';
            warningBg = '#bee3f8';
            warningIcon = 'ℹ️';
            warningMessage = `Minor size difference detected. Your image will work perfectly, but dimensions are slightly different from the optimal ${config.sizeMM} size.`;
        } else if (maxTolerance <= 0.15) {
            // Moderate deviation (5-15% difference) - warning
            warningColor = '#d69e2e';
            warningBg = '#faf089';
            warningIcon = '⚠️';
            warningMessage = `Image dimensions differ from the expected ${config.sizeMM} size. The app will work, but print results may not be perfectly optimized for A4.`;
        } else {
            // Large deviation (>15% difference) - strong warning
            warningColor = '#e53e3e';
            warningBg = '#fed7d7';
            warningIcon = '❗';
            warningMessage = `Significant size mismatch! Expected ${config.sizeMM}, but got different dimensions. Tiles may not fit properly on A4 pages. Consider resizing your image.`;
        }

        if (warningMessage) {
            imageInfo.innerHTML += `
                <div style="color: ${warningColor}; margin-top: 10px; padding: 10px; background: ${warningBg}; border-radius: 5px; border-left: 4px solid ${warningColor};">
                    <strong>${warningIcon} ${maxTolerance <= 0.05 ? 'Info:' : maxTolerance <= 0.15 ? 'Warning:' : 'Important:'}</strong> ${warningMessage}
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
                
                // Draw background circle with border for better visibility
                ctx.beginPath();
                ctx.arc(x, y, 22, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 1.0)'; // Fully opaque white
                ctx.fill();
                
                // Draw border around circle for extra contrast
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.lineWidth = 1;
                ctx.stroke();
                
                // Draw number with high contrast color
                ctx.fillStyle = '#1a202c'; // Dark text for maximum readability
                ctx.font = 'bold 18px Arial';
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

        // Show export section and reset generated tiles
        exportSection.style.display = 'block';
        downloadLinks.innerHTML = '';
        this.generatedTiles = []; // Reset for new export
        
        // Hide bulk download section initially
        document.getElementById('bulkDownloadSection').style.display = 'none';

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
                
                // Debug: Log actual dimensions for verification
                const canvasWidthMM = (canvas.width * 25.4) / 150;
                const canvasHeightMM = (canvas.height * 25.4) / 150;
                console.log(`Tile ${tileNumber}: Canvas ${canvas.width}×${canvas.height}px = ${canvasWidthMM.toFixed(1)}×${canvasHeightMM.toFixed(1)}mm`);
                
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

                // Add tile numbers in all four corners for easy reassembly
                this.addTileNumbers(ctx, canvas.width, canvas.height, row + 1, col + 1);

                // Store tile for bulk download
                const tileFilename = `${this.baseFileName}_tile_${tileNumber}`;
                this.generatedTiles.push({
                    canvas: canvas,
                    filename: tileFilename,
                    tileNumber: tileNumber,
                    format: format
                });
                
                // Export based on format
                try {
                    if (format === 'png') {
                        await this.exportAsPNG(canvas, tileFilename, tileNumber);
                    } else {
                        await this.exportAsPDF(canvas, tileFilename, tileNumber);
                    }
                } catch (error) {
                    console.error(`Export failed for tile ${tileNumber}:`, error);
                    ErrorHandler.showError(`Tile ${tileNumber} Export Failed`, 
                        `Failed to export tile ${tileNumber} as ${format.toUpperCase()}: ${error.message}`);
                    // Continue with other tiles
                }

                processedTiles++;
                const progress = (processedTiles / config.totalTiles) * 100;
                progressFill.style.width = `${progress}%`;
                progressText.textContent = `${processedTiles}/${config.totalTiles} tiles exported`;

                // Small delay to show progress
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
        
        // Show bulk download button after all tiles are generated
        if (this.generatedTiles.length > 0) {
            document.getElementById('bulkDownloadSection').style.display = 'block';
        }
    }

    async downloadAllTiles() {
        if (!this.generatedTiles || this.generatedTiles.length === 0) {
            ErrorHandler.showError('No Tiles Available', 'Please export tiles first before downloading.');
            return;
        }

        const downloadBtn = document.getElementById('downloadAllBtn');
        downloadBtn.disabled = true;
        downloadBtn.textContent = '� Downloading files...';

        try {
            // Download each tile individually with a small delay between downloads
            for (let i = 0; i < this.generatedTiles.length; i++) {
                const tile = this.generatedTiles[i];
                const canvas = tile.canvas;
                const filename = tile.filename;
                const format = tile.format;
                
                // Update button text with progress
                downloadBtn.textContent = `📁 Downloading ${i + 1}/${this.generatedTiles.length}...`;
                
                if (format === 'png') {
                    // Convert canvas to blob and download
                    const blob = await new Promise(resolve => {
                        canvas.toBlob(resolve, 'image/png');
                    });
                    this.triggerDownload(blob, `${filename}.png`);
                } else {
                    // For PDF, generate and download
                    const { jsPDF } = window.jspdf;
                    const pdf = new jsPDF({
                        orientation: 'portrait',
                        unit: 'mm',
                        format: 'a4'
                    });
                    
                    const imgData = canvas.toDataURL('image/png');
                    const pdfWidth = 210;  // Full A4 width (margins already in canvas)
                    const pdfHeight = 297; // Full A4 height (margins already in canvas)
                    
                    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                    const pdfBlob = pdf.output('blob');
                    this.triggerDownload(pdfBlob, `${filename}.pdf`);
                }
                
                // Small delay between downloads to avoid browser blocking
                if (i < this.generatedTiles.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
            
            downloadBtn.disabled = false;
            downloadBtn.textContent = '� Download All Tiles';
            
        } catch (error) {
            console.error('Bulk download failed:', error);
            ErrorHandler.showError('Download Failed', `Failed to download files: ${error.message}`);
            
            downloadBtn.disabled = false;
            downloadBtn.textContent = '� Download All Tiles';
        }
    }

    triggerDownload(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the URL after a short delay
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    async exportAsPNG(canvas, filename, tileNumber) {
        return new Promise((resolve) => {
            // Use higher quality PNG export
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const downloadLinks = document.getElementById('downloadLinks');
                
                const link = document.createElement('a');
                link.href = url;
                link.download = `${filename}.png`;
                link.className = 'download-link';
                link.textContent = `�️ Download ${filename}.png`;
                
                downloadLinks.appendChild(link);
                resolve();
            }, 'image/png', 1.0); // Maximum quality
        });
    }

    async exportAsPDF(canvas, filename, tileNumber) {
        return new Promise((resolve, reject) => {
            try {
                // Check if jsPDF is available
                if (!window.jspdf || !window.jspdf.jsPDF) {
                    throw new Error('jsPDF library not loaded. Please refresh the page and try again.');
                }
                
                // Convert canvas to image data
                const imgData = canvas.toDataURL('image/png');
                
                // Create PDF (A4 size: 210 × 297 mm)
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: 'a4'
                });
                
                // Add image to PDF (full A4 size - margins already in canvas)
                const pdfWidth = 210;  // Full A4 width (margins already built into canvas)
                const pdfHeight = 297; // Full A4 height (margins already built into canvas)
                
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                
                // Create download link
                const pdfBlob = pdf.output('blob');
                const url = URL.createObjectURL(pdfBlob);
                const downloadLinks = document.getElementById('downloadLinks');
                
                const link = document.createElement('a');
                link.href = url;
                link.download = `${filename}.pdf`;
                link.className = 'download-link';
                link.textContent = `📄 Download ${filename}.pdf`;
                
                downloadLinks.appendChild(link);
                resolve();
            } catch (error) {
                console.error('PDF export failed:', error);
                ErrorHandler.showError('PDF Export Failed', error.message);
                reject(error);
            }
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
        // Try to get actual file size first, fall back to canvas estimation if needed
        if (this.currentFile) {
            return this.currentFile.size;
        }
        
        // Fallback to canvas estimation only if no file available
        if (!this.originalImage) return 0;
        return this.originalImage.width * this.originalImage.height * 4; // 4 bytes per pixel (RGBA)
    }

    // Add tile numbers in all four corners for easy reassembly
    addTileNumbers(ctx, canvasWidth, canvasHeight, row, col) {
        const tileId = `${row}-${col}`;
        
        // Configure text styling
        const fontSize = Math.min(canvasWidth, canvasHeight) * 0.02; // 2% of smaller dimension
        ctx.font = `bold ${Math.max(12, fontSize)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Add text with outline for visibility
        const drawTextWithOutline = (text, x, y) => {
            // White outline for visibility on any background
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#FFFFFF';
            ctx.strokeText(text, x, y);
            
            // Black text
            ctx.fillStyle = '#000000';
            ctx.fillText(text, x, y);
        };

        const margin = 15; // Distance from corner

        // Top-left corner
        drawTextWithOutline(tileId, margin, margin);
        
        // Top-right corner
        drawTextWithOutline(tileId, canvasWidth - margin, margin);
        
        // Bottom-left corner
        drawTextWithOutline(tileId, margin, canvasHeight - margin);
        
        // Bottom-right corner
        drawTextWithOutline(tileId, canvasWidth - margin, canvasHeight - margin);
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Check if jsPDF is loaded
    if (window.jspdf && window.jspdf.jsPDF) {
        console.log('✓ jsPDF library loaded successfully');
    } else {
        console.error('✗ jsPDF library not loaded');
        ErrorHandler.showError('Library Missing', 'PDF export functionality requires jsPDF library. Please refresh the page.');
    }
    
    new BattleMapSplitter();
});