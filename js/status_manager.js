// Status Manager - Handles status messages, progress bars, and notifications

class StatusManager {
    constructor(editor) {
        this.editor = editor;
    }
    
    initialize() {
        console.log('StatusManager initialized');
    }
    
    // Show status message
    showStatus(message, type = 'info') {
        const el = document.getElementById('editorStatus');
        if (!el) return;
        
        el.textContent = message;
        el.className = `status ${type}`;
        
        if (type === 'success' || type === 'error') {
            setTimeout(() => {
                if (el.textContent === message) {
                    el.textContent = '';
                    el.className = 'status';
                }
            }, 5000);
        }
    }
    
    // Update duration pill with ping-pong info
    updateDurationPill() {
        const pill = document.getElementById('durationPill');
        if (!pill) return;
        
        const totalSec = this.editor.videoDuration || 0;
        const selectionDuration = Math.max(0, (this.editor.endTime || 0) - (this.editor.startTime || 0));
        const percentage = totalSec > 0 ? Math.round((selectionDuration / totalSec) * 100) : 0;
        
        // Enhanced ping-pong display
        const pingPongMode = this.editor.pingPongMode;
        const pingPongText = pingPongMode ? ' 🔄 ×2' : '';
        const effectiveDuration = pingPongMode ? selectionDuration * 2 : selectionDuration;
        
        pill.textContent = `🎬 ${selectionDuration.toFixed(1)}s selected (${percentage}% of original)${pingPongText}`;
        
        // Add visual indicator for ping-pong mode
        if (pingPongMode) {
            pill.style.background = 'linear-gradient(90deg, var(--controls-bg), rgba(139, 92, 246, 0.2))';
            pill.style.borderColor = '#8b5cf6';
            pill.title = `Ping-pong enabled: ${effectiveDuration.toFixed(1)}s total duration (forward + reverse)`;
        } else {
            pill.style.background = 'var(--controls-bg)';
            pill.style.borderColor = 'var(--timeline-handle)';
            pill.title = '';
        }
    }
    
    // Update preview info display
    updatePreviewInfo(currentTime, isInSelection, progressInSelection) {
        const previewInfo = document.getElementById('previewInfo');
        if (!previewInfo) return;
        
        const timeStr = this.editor.timeFormatter.formatTimeForInput(currentTime);
        const statusIcon = isInSelection ? '🎯' : '⏱️';
        const loopMode = this.editor.videoController?.loopInSelection ? '↻ Selection' : '↻ OFF';
        
        if (isInSelection) {
            previewInfo.textContent = `${statusIcon} ${timeStr} | In selection (${progressInSelection.toFixed(0)}%) | ${loopMode}`;
        } else {
            previewInfo.textContent = `${statusIcon} ${timeStr} | Outside selection | ${loopMode}`;
        }
    }
    
    // Update filename display
    updateFilename(filename) {
        const filenameEl = document.getElementById('loadedFilename');
        if (filenameEl) {
            filenameEl.textContent = filename;
        }
    }
    
    // Show editor container
    showEditor() {
        if (this.editor.editorContainer) {
            this.editor.editorContainer.classList.remove('hidden');
            this.editor.editorContainer.style.display = 'block';
            this.editor.editorContainer.setAttribute('tabindex', '0');
            
            setTimeout(() => {
                this.editor.editorContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                this.editor.editorContainer.focus();
            }, 100);
        }
    }
    
    // Show export progress
    updateExportProgress(step, percentage, message) {
        const progressContainer = document.getElementById('exportProgress');
        const progressText = document.getElementById('progressText');
        const progressFill = document.getElementById('progressFill');
        
        if (progressContainer) progressContainer.style.display = 'block';
        if (progressText) progressText.textContent = message;
        if (progressFill) progressFill.style.width = `${percentage}%`;
    }
    
    // Hide export progress
    hideExportProgress() {
        const progressContainer = document.getElementById('exportProgress');
        const progressFill = document.getElementById('progressFill');
        
        if (progressContainer) {
            setTimeout(() => {
                progressContainer.style.display = 'none';
                if (progressFill) progressFill.style.width = '0%';
            }, 1000);
        }
    }
    
    // Setup ping-pong mode listener
    setupPingPongListener() {
        const pingPongCheckbox = document.getElementById('pingPongMode');
        if (pingPongCheckbox) {
            pingPongCheckbox.addEventListener('change', (e) => {
                // Call main editor's setPingPongMode method
                this.editor.setPingPongMode(e.target.checked);
            });
            
            console.log('Ping-pong checkbox listener attached');
        } else {
            console.warn('Ping-pong checkbox not found');
        }
    }
    
    // Called when selection updates
    updateSelection() {
        this.updateDurationPill();
    }
    
    // Cleanup
    cleanup() {
        console.log('StatusManager cleanup completed');
    }
}