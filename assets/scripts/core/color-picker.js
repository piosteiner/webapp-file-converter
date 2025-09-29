/**
 * Modern Color Picker Component
 * A sleek, embedded color picker for the Grid Generator
 */

class ModernColorPicker {
    constructor(targetElement, options = {}) {
        this.target = targetElement;
        this.options = {
            initialColor: options.initialColor || '#000000',
            showPresets: options.showPresets !== false,
            showAlpha: options.showAlpha || false,
            onChange: options.onChange || (() => {}),
            ...options
        };
        
        this.currentColor = this.hexToHsl(this.options.initialColor);
        this.isOpen = false;
        
        this.init();
    }

    init() {
        this.createColorButton();
        this.createColorPicker();
        this.updateDisplay();
    }

    createColorButton() {
        // Create the color display button
        this.colorButton = document.createElement('div');
        this.colorButton.className = 'modern-color-button';
        this.colorButton.innerHTML = `
            <div class="color-display" style="background-color: ${this.options.initialColor}"></div>
            <span class="color-value">${this.options.initialColor.toUpperCase()}</span>
            <svg class="chevron" width="12" height="12" viewBox="0 0 12 12">
                <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="2" fill="none"/>
            </svg>
        `;
        
        this.colorButton.addEventListener('click', () => this.toggle());
        this.target.appendChild(this.colorButton);
    }

    createColorPicker() {
        this.picker = document.createElement('div');
        this.picker.className = 'modern-color-picker';
        this.picker.innerHTML = `
            <div class="picker-content">
                <div class="color-area">
                    <div class="saturation-lightness">
                        <canvas class="sl-canvas" width="200" height="200"></canvas>
                        <div class="sl-cursor"></div>
                    </div>
                    <div class="hue-strip">
                        <canvas class="hue-canvas" width="20" height="200"></canvas>
                        <div class="hue-cursor"></div>
                    </div>
                </div>
                <div class="color-inputs">
                    <div class="input-group">
                        <label>HEX</label>
                        <input type="text" class="hex-input" maxlength="7">
                    </div>
                    <div class="input-row">
                        <div class="input-group">
                            <label>R</label>
                            <input type="number" class="rgb-input" data-channel="r" min="0" max="255">
                        </div>
                        <div class="input-group">
                            <label>G</label>
                            <input type="number" class="rgb-input" data-channel="g" min="0" max="255">
                        </div>
                        <div class="input-group">
                            <label>B</label>
                            <input type="number" class="rgb-input" data-channel="b" min="0" max="255">
                        </div>
                    </div>
                </div>
                ${this.options.showPresets ? this.createPresetsHTML() : ''}
            </div>
        `;
        
        document.body.appendChild(this.picker);
        
        // Initialize canvases and event listeners
        this.initializeCanvases();
        this.attachEventListeners();
    }

    createPresetsHTML() {
        const presets = [
            '#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF',
            '#FF0000', '#FF6600', '#FFCC00', '#33FF00', '#00CCFF', '#0066FF',
            '#6600FF', '#FF00CC', '#FF3366', '#66FF33', '#33CCFF', '#9966FF'
        ];
        
        return `
            <div class="color-presets">
                <label>Quick Colors</label>
                <div class="preset-colors">
                    ${presets.map(color => `
                        <div class="preset-color" data-color="${color}" style="background-color: ${color}"></div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    initializeCanvases() {
        this.slCanvas = this.picker.querySelector('.sl-canvas');
        this.slCtx = this.slCanvas.getContext('2d');
        this.hueCanvas = this.picker.querySelector('.hue-canvas');
        this.hueCtx = this.hueCanvas.getContext('2d');
        
        this.drawHueStrip();
        this.drawSaturationLightness();
    }

    drawHueStrip() {
        const gradient = this.hueCtx.createLinearGradient(0, 0, 0, 200);
        for (let i = 0; i <= 6; i++) {
            gradient.addColorStop(i / 6, `hsl(${i * 60}, 100%, 50%)`);
        }
        this.hueCtx.fillStyle = gradient;
        this.hueCtx.fillRect(0, 0, 20, 200);
    }

    drawSaturationLightness() {
        const { h } = this.currentColor;
        
        // Clear canvas
        this.slCtx.clearRect(0, 0, 200, 200);
        
        // Create base hue background
        this.slCtx.fillStyle = `hsl(${h}, 100%, 50%)`;
        this.slCtx.fillRect(0, 0, 200, 200);
        
        // Add saturation gradient (white to transparent)
        const satGradient = this.slCtx.createLinearGradient(0, 0, 200, 0);
        satGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        satGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        this.slCtx.fillStyle = satGradient;
        this.slCtx.fillRect(0, 0, 200, 200);
        
        // Add lightness gradient (transparent to black)
        const lightGradient = this.slCtx.createLinearGradient(0, 0, 0, 200);
        lightGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        lightGradient.addColorStop(1, 'rgba(0, 0, 0, 1)');
        this.slCtx.fillStyle = lightGradient;
        this.slCtx.fillRect(0, 0, 200, 200);
    }

    attachEventListeners() {
        // Saturation/Lightness canvas
        let isDraggingSL = false;
        this.slCanvas.addEventListener('mousedown', (e) => {
            isDraggingSL = true;
            this.handleSLMove(e);
        });
        
        document.addEventListener('mousemove', (e) => {
            if (isDraggingSL) this.handleSLMove(e);
        });
        
        document.addEventListener('mouseup', () => {
            isDraggingSL = false;
        });
        
        // Hue canvas
        let isDraggingHue = false;
        this.hueCanvas.addEventListener('mousedown', (e) => {
            isDraggingHue = true;
            this.handleHueMove(e);
        });
        
        document.addEventListener('mousemove', (e) => {
            if (isDraggingHue) this.handleHueMove(e);
        });
        
        document.addEventListener('mouseup', () => {
            isDraggingHue = false;
        });
        
        // Input fields
        this.picker.querySelector('.hex-input').addEventListener('input', (e) => {
            this.handleHexInput(e.target.value);
        });
        
        this.picker.querySelectorAll('.rgb-input').forEach(input => {
            input.addEventListener('input', (e) => {
                this.handleRGBInput();
            });
        });
        
        // Preset colors
        if (this.options.showPresets) {
            this.picker.querySelectorAll('.preset-color').forEach(preset => {
                preset.addEventListener('click', (e) => {
                    const color = e.target.dataset.color;
                    this.setColor(color);
                });
            });
        }
        
        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.picker.contains(e.target) && !this.colorButton.contains(e.target)) {
                this.close();
            }
        });
    }

    handleSLMove(e) {
        const rect = this.slCanvas.getBoundingClientRect();
        const x = Math.max(0, Math.min(200, e.clientX - rect.left));
        const y = Math.max(0, Math.min(200, e.clientY - rect.top));
        
        this.currentColor.s = (x / 200) * 100;
        this.currentColor.l = 100 - (y / 200) * 100;
        
        this.updateDisplay();
        this.updateCursors();
    }

    handleHueMove(e) {
        const rect = this.hueCanvas.getBoundingClientRect();
        const y = Math.max(0, Math.min(200, e.clientY - rect.top));
        
        this.currentColor.h = (y / 200) * 360;
        
        this.drawSaturationLightness();
        this.updateDisplay();
        this.updateCursors();
    }

    handleHexInput(hex) {
        if (/^#?[0-9A-Fa-f]{6}$/.test(hex)) {
            const color = hex.startsWith('#') ? hex : '#' + hex;
            this.currentColor = this.hexToHsl(color);
            this.drawSaturationLightness();
            this.updateDisplay();
            this.updateCursors();
        }
    }

    handleRGBInput() {
        const r = parseInt(this.picker.querySelector('[data-channel="r"]').value) || 0;
        const g = parseInt(this.picker.querySelector('[data-channel="g"]').value) || 0;
        const b = parseInt(this.picker.querySelector('[data-channel="b"]').value) || 0;
        
        const hex = this.rgbToHex(r, g, b);
        this.currentColor = this.hexToHsl(hex);
        this.drawSaturationLightness();
        this.updateDisplay();
        this.updateCursors();
    }

    updateDisplay() {
        const hex = this.hslToHex(this.currentColor);
        const rgb = this.hexToRgb(hex);
        
        // Update button
        this.colorButton.querySelector('.color-display').style.backgroundColor = hex;
        this.colorButton.querySelector('.color-value').textContent = hex.toUpperCase();
        
        // Update inputs
        this.picker.querySelector('.hex-input').value = hex;
        this.picker.querySelector('[data-channel="r"]').value = rgb.r;
        this.picker.querySelector('[data-channel="g"]').value = rgb.g;
        this.picker.querySelector('[data-channel="b"]').value = rgb.b;
        
        // Trigger callback
        this.options.onChange(hex);
    }

    updateCursors() {
        const slCursor = this.picker.querySelector('.sl-cursor');
        const hueCursor = this.picker.querySelector('.hue-cursor');
        
        const x = (this.currentColor.s / 100) * 200;
        const y = 200 - (this.currentColor.l / 100) * 200;
        const hueY = (this.currentColor.h / 360) * 200;
        
        slCursor.style.left = `${x - 6}px`;
        slCursor.style.top = `${y - 6}px`;
        hueCursor.style.top = `${hueY - 2}px`;
    }

    setColor(hex) {
        this.currentColor = this.hexToHsl(hex);
        this.drawSaturationLightness();
        this.updateDisplay();
        this.updateCursors();
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        this.isOpen = true;
        this.picker.style.display = 'block';
        this.colorButton.classList.add('open');
        
        // Position picker
        const rect = this.colorButton.getBoundingClientRect();
        this.picker.style.top = `${rect.bottom + 8}px`;
        this.picker.style.left = `${rect.left}px`;
        
        // Update cursors for current color
        this.updateCursors();
    }

    close() {
        this.isOpen = false;
        this.picker.style.display = 'none';
        this.colorButton.classList.remove('open');
    }

    // Color conversion utilities
    hexToHsl(hex) {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        return { h: h * 360, s: s * 100, l: l * 100 };
    }

    hslToHex({ h, s, l }) {
        s /= 100;
        l /= 100;
        h /= 360;

        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h * 6) % 2 - 1));
        const m = l - c / 2;
        let r = 0, g = 0, b = 0;

        if (0 <= h && h < 1/6) { r = c; g = x; b = 0; }
        else if (1/6 <= h && h < 2/6) { r = x; g = c; b = 0; }
        else if (2/6 <= h && h < 3/6) { r = 0; g = c; b = x; }
        else if (3/6 <= h && h < 4/6) { r = 0; g = x; b = c; }
        else if (4/6 <= h && h < 5/6) { r = x; g = 0; b = c; }
        else if (5/6 <= h && h < 1) { r = c; g = 0; b = x; }

        r = Math.round((r + m) * 255);
        g = Math.round((g + m) * 255);
        b = Math.round((b + m) * 255);

        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    hexToRgb(hex) {
        return {
            r: parseInt(hex.slice(1, 3), 16),
            g: parseInt(hex.slice(3, 5), 16),
            b: parseInt(hex.slice(5, 7), 16)
        };
    }

    rgbToHex(r, g, b) {
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
}

// Export for use in other modules
window.ModernColorPicker = ModernColorPicker;