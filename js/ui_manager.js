// UI Manager - Handles UI creation, status messages, and element management

class UIManager {
    constructor(editor) {
        this.editor = editor;
        
        // UI element references for timeline
        this.timelineSelection = null;
        this.selectionArea = null;
        this.startHandle = null;
        this.endHandle = null;
        this.playhead = null;
        
        // Numeric inputs
        this.startTimeInput = null;
        this.endTimeInput = null;
    }
    
    initialize() {
        this.createNumericInputs();
        this.createTimelineElements();
        console.log('UIManager initialized');
    }
    
    // Create numeric time inputs for precise control
    createNumericInputs() {
        const timeDisplay = document.querySelector('.time-display');
        if (!timeDisplay) return;
        
        // Clear existing content and rebuild with inputs
        timeDisplay.innerHTML = `
            <span>
                Start: 
                <input type="text" id="startTimeInput" class="time-input" 
                       placeholder="0.0" pattern="[0-9]{1,2}:[0-9]{2}\\.[0-9]{1,3}|[0-9]+\\.[0-9]{1,3}" 
                       title="Format: seconds.ms or mm:ss.ms">
            </span>
            <span>
                End: 
                <input type="text" id="endTimeInput" class="time-input" 
                       placeholder="0.0" pattern="[0-9]{1,2}:[0-9]{2}\\.[0-9]{1,3}|[0-9]+\\.[0-9]{1,3}"
                       title="Format: seconds.ms or mm:ss.ms">
            </span>
            <span>Duration: <span id="trimDuration">0.0s</span></span>
        `;
        
        // Store references
        this.startTimeInput = document.getElementById('startTimeInput');
        this.endTimeInput = document.getElementById('endTimeInput');
        
        // Add CSS for time inputs if not exists
        this.addTimeInputStyles();
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
    
    // Create timeline selection elements (playhead, selection area, handles)
    createTimelineElements() {
        console.log('Creating timeline UI elements...');
        
        const timelineTrack = document.getElementById('timelineTrack');
        if (!timelineTrack) {
            console.error('Timeline track not found!');
            return;
        }
        
        // Remove any existing elements first
        this.removeExistingTimelineElements();
        
        // Create playhead
        this.createPlayhead(timelineTrack);
        
        // Timeline selection elements will be created when video loads
        console.log('Timeline UI elements created successfully');
    }
    
    createPlayhead(timelineTrack) {
        this.playhead = document.createElement('div');
        this.playhead.className = 'timeline-playhead';
        this.playhead.id = 'playhead';
        timelineTrack.appendChild(this.playhead);
    }
    
    // Create timeline selection elements when video is loaded
    createTimelineSelection() {
        console.log('Creating timeline selection elements...');
        
        const timelineTrack = document.getElementById('timelineTrack');
        if (!timelineTrack) {
            console.error('Timeline track not found!');
            return;
        }
        
        // Remove any existing selection elements first
        const existingSelection = document.getElementById('timelineSelection');
        if (existingSelection) {
            existingSelection.remove();
        }
        
        // Create the selection container
        this.timelineSelection = document.createElement('div');
        this.timelineSelection.className = 'timeline-selection';
        this.timelineSelection.id = 'timelineSelection';
        timelineTrack.appendChild(this.timelineSelection);
        
        // Create the selection area (the blue highlighted region)
        this.selectionArea = document.createElement('div');
        this.selectionArea.className = 'selection-area';
        this.selectionArea.id = 'selectionArea';
        this.timelineSelection.appendChild(this.selectionArea);
        
        // Create the IN handle (start)
        this.startHandle = document.createElement('div');
        this.startHandle.className = 'selection-handle left';
        this.startHandle.id = 'startHandle';
        this.startHandle.innerHTML = '<span class="handle-label">IN</span>';
        this.selectionArea.appendChild(this.startHandle);
        
        // Create the OUT handle (end)
        this.endHandle = document.createElement('div');
        this.endHandle.className = 'selection-handle right';
        this.endHandle.id = 'endHandle';
        this.endHandle.innerHTML = '<span class="handle-label">OUT</span>';
        this.selectionArea.appendChild(this.endHandle);
        
        console.log('Timeline selection elements created successfully');
        
        // Return references for timeline controller to use
        return {
            timelineSelection: this.timelineSelection,
            selectionArea: this.selectionArea,
            startHandle: this.startHandle,
            endHandle: this.endHandle,
            playhead: this.playhead
        };
    }
    
    removeExistingTimelineElements() {
        const existing = document.getElementById('timelineSelection');
        if (existing) {
            existing.remove();
        }
        
        const existingPlayhead = document.getElementById('playhead');
        if (existingPlayhead) {
            existingPlayhead.remove();
        }
    }
    
    // Create timeline markers
    createTimeline() {
        const timelineTrack = this.editor.timelineTrack;
        if (!timelineTrack || this.editor.videoDuration === 0) return;
        
        // Clear but preserve selection elements if they exist
        const selection = document.getElementById('timelineSelection');
        const playhead = document.getElementById('playhead');
        
        timelineTrack.innerHTML = '';
        
        const markerCount = Math.min(20, Math.max(5, Math.floor(this.editor.videoDuration)));
        
        for (let i = 0; i <= markerCount; i++) {
            const time = (i / markerCount) * this.editor.videoDuration;
            const marker = document.createElement('div');
            marker.className = 'time-marker';
            
            if (i === 0 || i === markerCount) {
                marker.classList.add('major-marker');
            }
            
            marker.style.left = `${(i / markerCount) * 100}%`;
            marker.innerHTML = `<span class="time-label">${time.toFixed(1)}s</span>`;
            timelineTrack.appendChild(marker);
        }
        
        // Re-add selection and playhead if they existed
        if (selection) timelineTrack.appendChild(selection);
        if (playhead) timelineTrack.appendChild(playhead);
    }
    
    // Show status message
    showStatus(message, type = 'info') {
        const el = document.getElementById('editorStatus');
        if (!el) return;
        
        el.textContent = message;
        el.className = `status ${type}`;
        
        // Auto-clear success/error messages
        if (type === 'success' || type === 'error') {
            setTimeout(() => {
                if (el.textContent === message) {
                    el.textContent = '';
                    el.className = 'status';
                }
            }, 5000);
        }
    }
    
    // Update time display in inputs and duration
    updateTimeDisplay() {
        // Update numeric inputs
        if (this.startTimeInput) {
            this.startTimeInput.value = this.formatTimeForInput(this.editor.startTime);
            this.startTimeInput.classList.remove('error');
        }
        if (this.endTimeInput) {
            this.endTimeInput.value = this.formatTimeForInput(this.editor.endTime);
            this.endTimeInput.classList.remove('error');
        }
        
        // Update duration display
        const durationEl = document.getElementById('trimDuration');
        if (durationEl) {
            const duration = this.editor.endTime - this.editor.startTime;
            durationEl.textContent = `${duration.toFixed(2)}s`;
        }
    }
    
    // Update duration pill
    updateDurationPill() {
        const pill = document.getElementById('durationPill');
        if (!pill) return;
        
        const totalSec = this.editor.videoDuration || 0;
        const selectionDuration = Math.max(0, (this.editor.endTime || 0) - (this.editor.startTime || 0));
        const percentage = totalSec > 0 ? Math.round((selectionDuration / totalSec) * 100) : 0;
        
        pill.textContent = `🎬 ${selectionDuration.toFixed(1)}s selected (${percentage}% of original)`;
    }
    
    // Update playhead position and preview info
    updatePlayhead() {
        if (this.editor.videoDuration === 0 || !this.playhead) return;
        
        const currentTime = this.editor.previewVideo?.currentTime || 0;
        const percent = (currentTime / this.editor.videoDuration) * 100;
        this.playhead.style.left = `${percent}%`;
        
        // Update current time for display
        this.editor.currentTime = currentTime;
        
        // Enhanced preview info
        const isInSelection = currentTime >= this.editor.startTime && currentTime <= this.editor.endTime;
        const progressInSelection = isInSelection ? 
            ((currentTime - this.editor.startTime) / (this.editor.endTime - this.editor.startTime)) * 100 : 0;
        
        this.updatePreviewInfo(currentTime, isInSelection, progressInSelection);
    }
    
    // Update preview info display
    updatePreviewInfo(currentTime, isInSelection, progressInSelection) {
        const previewInfo = document.getElementById('previewInfo');
        if (!previewInfo) return;
        
        const timeStr = this.formatTimeForInput(currentTime);
        const statusIcon = isInSelection ? '🎯' : '⏱️';
        const loopMode = this.editor.videoController?.loopInSelection ? '↻ Selection' : '↻ Full';
        
        if (isInSelection) {
            previewInfo.textContent = `${statusIcon} ${timeStr} | In selection (${progressInSelection.toFixed(0)}%) | ${loopMode}`;
        } else {
            previewInfo.textContent = `${statusIcon} ${timeStr} | Outside selection | ${loopMode}`;
        }
    }
    
    // Format time for display in input (supports mm:ss.ms and ss.ms)
    formatTimeForInput(seconds) {
        if (seconds >= 60) {
            const mins = Math.floor(seconds / 60);
            const secs = (seconds % 60).toFixed(2);
            return `${mins}:${secs.padStart(5, '0')}`;
        }
        return seconds.toFixed(2);
    }
    
    // Set time input error state
    setTimeInputError(input, hasError) {
        if (!input) return;
        input.classList.toggle('error', hasError);
    }
    
    // Update filename display
    updateFilename(filename) {
        const filenameEl = document.getElementById('loadedFilename');
        if (filenameEl) {
            filenameEl.textContent = filename;
        }
    }
    
    // Show/hide editor container
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
    
    // Called when video loads
    onVideoLoaded() {
        // Create timeline markers
        this.createTimeline();
        
        // Create selection elements
        const elements = this.createTimelineSelection();
        
        // Update displays
        this.updateTimeDisplay();
        this.updatePlayhead();
        this.updateDurationPill();
        
        // Enable controls
        this.editor.enableControls(true);
        
        // Add ready class for animations
        const container = document.getElementById('timelineContainer');
        if (container) {
            container.classList.add('ready');
        }
        
        // Return element references for timeline controller
        return elements;
    }
    
    // Called when selection updates
    updateSelection() {
        this.updateTimeDisplay();
        this.updateDurationPill();
        this.updatePlayhead();
    }
    
    // Cleanup
    cleanup() {
        // Remove any created elements
        this.removeExistingTimelineElements();
        console.log('UIManager cleanup completed');
    }
}