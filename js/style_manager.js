// Style Manager - Handles CSS injection and styling management

class StyleManager {
    constructor(editor) {
        this.editor = editor;
    }
    
    initialize() {
        this.addHandleStyles();
        this.addTimeInputStyles();
        console.log('StyleManager initialized');
    }
    
    // Add CSS for improved handle styling
    addHandleStyles() {
        if (!document.getElementById('handle-styles')) {
            const style = document.createElement('style');
            style.id = 'handle-styles';
            style.textContent = `
                .selection-handle {
                    width: 8px !important;
                    height: 100% !important;
                    background: #8b5cf6 !important;
                    border: 2px solid #7c3aed !important;
                    border-radius: 4px !important;
                    cursor: ew-resize !important;
                    position: absolute !important;
                    top: 0 !important;
                    z-index: 15 !important;
                    transition: all 0.2s ease !important;
                }
                .selection-handle:hover {
                    background: #7c3aed !important;
                    border-color: #6d28d9 !important;
                    transform: scaleX(1.2) !important;
                }
                .selection-handle.dragging {
                    background: #6d28d9 !important;
                    border-color: #5b21b6 !important;
                    transform: scaleX(1.3) !important;
                    box-shadow: 0 0 10px rgba(139, 92, 246, 0.5) !important;
                }
                .selection-handle.left {
                    left: -4px !important;
                }
                .selection-handle.right {
                    right: -4px !important;
                }
                .handle-label {
                    display: none !important;
                }
                .selection-area {
                    background: rgba(139, 92, 246, 0.1) !important;
                    border: 1px solid rgba(139, 92, 246, 0.3) !important;
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    addTimeInputStyles() {
        if (!document.getElementById('time-input-styles')) {
            const style = document.createElement('style');
            style.id = 'time-input-styles';
            style.textContent = `
                .time-input {
                    width: 80px;
                    padding: 2px 4px;
                    border: 1px solid var(--timeline-handle);
                    border-radius: 4px;
                    background: var(--controls-bg);
                    color: var(--text-primary);
                    font-size: 13px;
                    font-family: monospace;
                    text-align: center;
                }
                .time-input:focus {
                    outline: none;
                    border-color: var(--timeline-selection-border);
                    background: var(--container-bg);
                }
                .time-input.error {
                    border-color: #ef4444;
                    background: rgba(239, 68, 68, 0.1);
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // Add custom CSS styles dynamically
    addCustomStyle(id, cssText) {
        if (!document.getElementById(id)) {
            const style = document.createElement('style');
            style.id = id;
            style.textContent = cssText;
            document.head.appendChild(style);
        }
    }
    
    // Remove CSS styles
    removeStyle(id) {
        const style = document.getElementById(id);
        if (style) {
            style.remove();
        }
    }
    
    // Update CSS variable
    setCSSVariable(property, value) {
        document.documentElement.style.setProperty(property, value);
    }
    
    // Get CSS variable
    getCSSVariable(property) {
        return getComputedStyle(document.documentElement).getPropertyValue(property);
    }
    
    // Cleanup
    cleanup() {
        console.log('StyleManager cleanup completed');
    }
}