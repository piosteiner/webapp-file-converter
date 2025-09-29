class GridGenerator {
    constructor() {
        this.canvas = document.getElementById('gridCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Grid specifications
        this.DPI = 150; // Standard DPI for perfect 25mm scaling
        this.GRID_SIZE_MM = 25; // 25mm grid squares
        this.GRID_SIZE_PX = this.mmToPixels(this.GRID_SIZE_MM); // 147.6 pixels at 150 DPI
        
        // Current settings
        this.settings = {
            width: 3366,
            height: 4911,
            unit: 'pixels',
            gridColor: '#000000',
            lineThickness: 2,
            gridOpacity: 80,
            enableMajorGrid: true,
            majorLineThickness: 4
        };
        
        // Preview state
        this.currentZoom = 1;
        this.maxDisplayWidth = 800;
        this.maxDisplayHeight = 600;
        
        this.initializeEventListeners();
        this.initializeColorPicker();
        this.updateUnits();
    }

    initializeColorPicker() {
        // Initialize the modern color picker
        const colorPickerContainer = document.getElementById('gridColorPicker');
        
        this.colorPicker = new ModernColorPicker(colorPickerContainer, {
            initialColor: this.settings.gridColor,
            showPresets: true,
            onChange: (color) => {
                this.settings.gridColor = color;
                this.updateGrid();
            }
        });
    }

    // Conversion utilities
    mmToPixels(mm) {
        return Math.round(mm * this.DPI / 25.4);
    }

    pixelsToMM(pixels) {
        return Math.round(pixels * 25.4 / this.DPI * 100) / 100;
    }

    initializeEventListeners() {
        // Unit selector
        document.querySelectorAll('input[name="unit"]').forEach(radio => {
            radio.addEventListener('change', () => this.handleUnitChange());
        });

        // Size inputs
        document.getElementById('canvasWidth').addEventListener('input', (e) => {
            this.settings.width = parseInt(e.target.value);
            this.updateGridInfo();
        });

        document.getElementById('canvasHeight').addEventListener('input', (e) => {
            this.settings.height = parseInt(e.target.value);
            this.updateGridInfo();
        });

        // Preset buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const width = parseInt(e.target.dataset.width);
                const height = parseInt(e.target.dataset.height);
                this.applyPreset(width, height);
            });
        });

        // Appearance controls - color picker is initialized separately

        document.getElementById('lineThickness').addEventListener('input', (e) => {
            this.settings.lineThickness = parseInt(e.target.value);
            document.getElementById('thicknessValue').textContent = e.target.value + 'px';
        });

        document.getElementById('gridOpacity').addEventListener('input', (e) => {
            this.settings.gridOpacity = parseInt(e.target.value);
            document.getElementById('opacityValue').textContent = e.target.value + '%';
        });

        document.getElementById('enableMajorGrid').addEventListener('change', (e) => {
            this.settings.enableMajorGrid = e.target.checked;
            document.getElementById('majorGridControls').style.display = 
                e.target.checked ? 'block' : 'none';
        });

        document.getElementById('majorLineThickness').addEventListener('input', (e) => {
            this.settings.majorLineThickness = parseInt(e.target.value);
            document.getElementById('majorThicknessValue').textContent = e.target.value + 'px';
        });

        // Generation controls
        document.getElementById('generateGridBtn').addEventListener('click', () => this.generateGrid());
        document.getElementById('previewToggleBtn').addEventListener('click', () => this.togglePreview());

        // Preview controls
        document.getElementById('zoomInBtn').addEventListener('click', () => this.adjustZoom(1.25));
        document.getElementById('zoomOutBtn').addEventListener('click', () => this.adjustZoom(0.8));
        document.getElementById('fitToScreenBtn').addEventListener('click', () => this.fitToScreen());

        // Download controls
        document.getElementById('downloadPNGBtn').addEventListener('click', () => this.downloadGrid());
        document.getElementById('regenerateBtn').addEventListener('click', () => this.showConfigSection());

        // Initial setup complete
    }

    handleUnitChange() {
        const unit = document.querySelector('input[name="unit"]:checked').value;
        this.settings.unit = unit;
        
        if (unit === 'mm') {
            // Convert current pixel values to mm
            const widthMM = this.pixelsToMM(this.settings.width);
            const heightMM = this.pixelsToMM(this.settings.height);
            
            document.getElementById('canvasWidth').value = widthMM;
            document.getElementById('canvasHeight').value = heightMM;
        } else {
            // Convert current mm values back to pixels
            const currentWidth = parseFloat(document.getElementById('canvasWidth').value);
            const currentHeight = parseFloat(document.getElementById('canvasHeight').value);
            
            if (this.settings.unit === 'mm') {
                document.getElementById('canvasWidth').value = this.mmToPixels(currentWidth);
                document.getElementById('canvasHeight').value = this.mmToPixels(currentHeight);
            }
        }
        
        this.updateUnits();
        this.updateGridInfo();
    }

    updateUnits() {
        const unit = this.settings.unit;
        const displayUnit = unit === 'pixels' ? 'px' : 'mm';
        
        document.getElementById('widthUnit').textContent = displayUnit;
        document.getElementById('heightUnit').textContent = displayUnit;
        
        // Update input constraints
        const widthInput = document.getElementById('canvasWidth');
        const heightInput = document.getElementById('canvasHeight');
        
        if (unit === 'mm') {
            widthInput.setAttribute('min', '50');
            widthInput.setAttribute('max', '2000');
            heightInput.setAttribute('min', '50');
            heightInput.setAttribute('max', '2000');
        } else {
            widthInput.setAttribute('min', '100');
            widthInput.setAttribute('max', '10000');
            heightInput.setAttribute('min', '100');
            heightInput.setAttribute('max', '10000');
        }
    }

    applyPreset(width, height) {
        this.settings.width = width;
        this.settings.height = height;
        
        // Always set to pixels for presets
        document.querySelector('input[name="unit"][value="pixels"]').checked = true;
        this.settings.unit = 'pixels';
        this.updateUnits();
        
        document.getElementById('canvasWidth').value = width;
        document.getElementById('canvasHeight').value = height;
        
        this.updateGridInfo();
    }

    // Color preview is now handled by the ModernColorPicker component

    updateGridInfo() {
        // Get dimensions in pixels
        let widthPx, heightPx;
        
        if (this.settings.unit === 'mm') {
            const widthMM = parseFloat(document.getElementById('canvasWidth').value);
            const heightMM = parseFloat(document.getElementById('canvasHeight').value);
            widthPx = this.mmToPixels(widthMM);
            heightPx = this.mmToPixels(heightMM);
        } else {
            widthPx = parseInt(document.getElementById('canvasWidth').value);
            heightPx = parseInt(document.getElementById('canvasHeight').value);
        }
        
        // Calculate grid information
        const gridSquaresX = Math.floor(widthPx / this.GRID_SIZE_PX);
        const gridSquaresY = Math.floor(heightPx / this.GRID_SIZE_PX);
        const physicalWidthMM = this.pixelsToMM(widthPx);
        const physicalHeightMM = this.pixelsToMM(heightPx);
        
        // Update display (if elements exist)
        const gridDimensions = document.getElementById('gridDimensions');
        const gridSquares = document.getElementById('gridSquares');
        const physicalSize = document.getElementById('physicalSize');
        
        if (gridDimensions) {
            gridDimensions.textContent = `Canvas: ${widthPx} × ${heightPx} pixels`;
        }
        if (gridSquares) {
            gridSquares.textContent = `Grid: ${gridSquaresX} × ${gridSquaresY} squares (${gridSquaresX * gridSquaresY} total)`;
        }
        if (physicalSize) {
            physicalSize.textContent = `Physical: ${physicalWidthMM} × ${physicalHeightMM} mm at 150 DPI`;
        }
    }

    generateGrid() {
        // Get final dimensions in pixels
        let widthPx, heightPx;
        
        if (this.settings.unit === 'mm') {
            const widthMM = parseFloat(document.getElementById('canvasWidth').value);
            const heightMM = parseFloat(document.getElementById('canvasHeight').value);
            widthPx = this.mmToPixels(widthMM);
            heightPx = this.mmToPixels(heightMM);
        } else {
            widthPx = parseInt(document.getElementById('canvasWidth').value);
            heightPx = parseInt(document.getElementById('canvasHeight').value);
        }
        
        this.settings.width = widthPx;
        this.settings.height = heightPx;
        
        // Set canvas size
        this.canvas.width = widthPx;
        this.canvas.height = heightPx;
        
        // Clear canvas with transparent background
        this.ctx.clearRect(0, 0, widthPx, heightPx);
        
        // Set up grid drawing
        const opacity = this.settings.gridOpacity / 100;
        this.ctx.globalAlpha = opacity;
        this.ctx.strokeStyle = this.settings.gridColor;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        // Draw regular grid lines
        this.ctx.lineWidth = this.settings.lineThickness;
        this.drawGridLines(widthPx, heightPx, false);
        
        // Draw major grid lines (every 5 squares)
        if (this.settings.enableMajorGrid) {
            this.ctx.lineWidth = this.settings.majorLineThickness;
            this.drawGridLines(widthPx, heightPx, true);
        }
        
        // Reset context
        this.ctx.globalAlpha = 1;
        
        // Update display
        this.updateCanvasInfo();
        this.updateGridInfo();
        this.showPreviewSection();
        this.fitToScreen();
    }

    drawGridLines(width, height, majorOnly = false) {
        const gridSize = this.GRID_SIZE_PX;
        const step = majorOnly ? gridSize * 5 : gridSize;
        
        this.ctx.beginPath();
        
        // Vertical lines
        for (let x = 0; x <= width; x += step) {
            if (!majorOnly || x % (gridSize * 5) === 0) {
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, height);
            }
        }
        
        // Horizontal lines
        for (let y = 0; y <= height; y += step) {
            if (!majorOnly || y % (gridSize * 5) === 0) {
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(width, y);
            }
        }
        
        this.ctx.stroke();
    }

    updateCanvasInfo() {
        const info = document.getElementById('canvasInfo');
        const gridSquaresX = Math.floor(this.settings.width / this.GRID_SIZE_PX);
        const gridSquaresY = Math.floor(this.settings.height / this.GRID_SIZE_PX);
        
        info.innerHTML = `
            <strong>Generated Grid:</strong><br>
            ${this.settings.width} × ${this.settings.height} pixels<br>
            ${gridSquaresX} × ${gridSquaresY} grid squares<br>
            ${this.pixelsToMM(this.settings.width)} × ${this.pixelsToMM(this.settings.height)} mm at 150 DPI
        `;
    }

    showPreviewSection() {
        document.getElementById('gridConfigSection').style.display = 'none';
        document.getElementById('previewSection').style.display = 'block';
        document.getElementById('downloadSection').style.display = 'block';
        
        // Update download specs
        this.updateDownloadSpecs();
    }

    showConfigSection() {
        document.getElementById('gridConfigSection').style.display = 'block';
        document.getElementById('previewSection').style.display = 'none';
        document.getElementById('downloadSection').style.display = 'none';
    }

    togglePreview() {
        const previewSection = document.getElementById('previewSection');
        if (previewSection.style.display === 'none') {
            previewSection.style.display = 'block';
        } else {
            previewSection.style.display = 'none';
        }
    }

    adjustZoom(factor) {
        this.currentZoom *= factor;
        this.currentZoom = Math.max(0.1, Math.min(5, this.currentZoom)); // Limit zoom range
        this.updateCanvasDisplay();
    }

    fitToScreen() {
        const container = document.querySelector('.canvas-container');
        const containerWidth = container.clientWidth - 40; // Account for padding
        const containerHeight = Math.min(600, window.innerHeight * 0.6);
        
        const scaleX = containerWidth / this.settings.width;
        const scaleY = containerHeight / this.settings.height;
        this.currentZoom = Math.min(scaleX, scaleY, 1); // Don't zoom beyond 100%
        
        this.updateCanvasDisplay();
    }

    updateCanvasDisplay() {
        const displayWidth = this.settings.width * this.currentZoom;
        const displayHeight = this.settings.height * this.currentZoom;
        
        this.canvas.style.width = displayWidth + 'px';
        this.canvas.style.height = displayHeight + 'px';
        
        document.getElementById('zoomLevel').textContent = Math.round(this.currentZoom * 100) + '%';
    }

    updateDownloadSpecs() {
        const gridSquaresX = Math.floor(this.settings.width / this.GRID_SIZE_PX);
        const gridSquaresY = Math.floor(this.settings.height / this.GRID_SIZE_PX);
        const physicalWidthMM = this.pixelsToMM(this.settings.width);
        const physicalHeightMM = this.pixelsToMM(this.settings.height);
        
        const specs = document.getElementById('downloadSpecs');
        specs.innerHTML = `
            <li><strong>Dimensions:</strong> ${this.settings.width} × ${this.settings.height} pixels</li>
            <li><strong>Physical Size:</strong> ${physicalWidthMM} × ${physicalHeightMM} mm</li>
            <li><strong>Grid Squares:</strong> ${gridSquaresX} × ${gridSquaresY} (${gridSquaresX * gridSquaresY} total)</li>
            <li><strong>Grid Spacing:</strong> 25mm (147.6 pixels at 150 DPI)</li>
            <li><strong>Color:</strong> ${this.settings.gridColor} at ${this.settings.gridOpacity}% opacity</li>
            <li><strong>Line Thickness:</strong> ${this.settings.lineThickness}px${this.settings.enableMajorGrid ? ` (major: ${this.settings.majorLineThickness}px)` : ''}</li>
            <li><strong>Background:</strong> Transparent</li>
            <li><strong>Perfect for:</strong> Procreate import and battle map creation</li>
        `;
    }

    downloadGrid() {
        // Create download link
        const link = document.createElement('a');
        link.download = `25mm-grid-${this.settings.width}x${this.settings.height}.png`;
        link.href = this.canvas.toDataURL('image/png');
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Show success message
        this.showDownloadSuccess();
    }

    showDownloadSuccess() {
        const button = document.getElementById('downloadPNGBtn');
        const originalText = button.textContent;
        
        button.textContent = '✅ Downloaded!';
        button.style.background = 'var(--success-text)';
        
        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = '';
        }, 2000);
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new GridGenerator();
});