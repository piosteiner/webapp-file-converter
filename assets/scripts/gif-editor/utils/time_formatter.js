// Time Formatter - Handles time formatting, inputs, and display updates

class TimeFormatter {
    constructor(editor) {
        this.editor = editor;
        
        // Numeric inputs
        this.startTimeInput = null;
        this.endTimeInput = null;
    }
    
    initialize() {
        this.createNumericInputs();
        console.log('TimeFormatter initialized');
    }
    
    // Create numeric time inputs for precise control
    createNumericInputs() {
        const timeDisplay = document.querySelector('.time-display');
        if (!timeDisplay) return;
        
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
        
        this.startTimeInput = document.getElementById('startTimeInput');
        this.endTimeInput = document.getElementById('endTimeInput');
    }
    
    // Format time for display
    formatTimeForInput(seconds) {
        if (seconds >= 60) {
            const mins = Math.floor(seconds / 60);
            const secs = (seconds % 60).toFixed(2);
            return `${mins}:${secs.padStart(5, '0')}`;
        }
        return seconds.toFixed(2);
    }
    
    // Parse time input (supports "5.5" or "1:23.456" format)
    parseTimeInput(value) {
        if (!value) return null;
        
        value = value.trim();
        
        // Try mm:ss.ms format
        const colonMatch = value.match(/^(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?$/);
        if (colonMatch) {
            const minutes = parseInt(colonMatch[1]);
            const seconds = parseInt(colonMatch[2]);
            const ms = colonMatch[3] ? parseInt(colonMatch[3].padEnd(3, '0')) : 0;
            return minutes * 60 + seconds + ms / 1000;
        }
        
        // Try seconds.ms format
        const secondsMatch = value.match(/^(\d+)(?:\.(\d{1,3}))?$/);
        if (secondsMatch) {
            const seconds = parseInt(secondsMatch[1]);
            const ms = secondsMatch[2] ? parseInt(secondsMatch[2].padEnd(3, '0')) : 0;
            return seconds + ms / 1000;
        }
        
        return null;
    }
    
    // Update time display
    updateTimeDisplay() {
        if (this.startTimeInput) {
            this.startTimeInput.value = this.formatTimeForInput(this.editor.startTime);
            this.startTimeInput.classList.remove('error');
        }
        if (this.endTimeInput) {
            this.endTimeInput.value = this.formatTimeForInput(this.editor.endTime);
            this.endTimeInput.classList.remove('error');
        }
        
        const durationEl = document.getElementById('trimDuration');
        if (durationEl) {
            const duration = this.editor.endTime - this.editor.startTime;
            durationEl.textContent = `${duration.toFixed(2)}s`;
        }
    }
    
    // Set time input error state
    setTimeInputError(input, hasError) {
        if (!input) return;
        input.classList.toggle('error', hasError);
    }
    
    // Validate time input in real-time
    validateTimeInput(input, value) {
        const time = this.parseTimeInput(value);
        
        if (time === null && value.trim() !== '') {
            this.setTimeInputError(input, true);
            return false;
        }
        
        // Check bounds
        if (time !== null) {
            const isStart = input.id === 'startTimeInput';
            
            if (isStart) {
                const maxStart = this.editor.endTime - this.editor.MIN_DURATION;
                if (time < 0 || time > maxStart) {
                    this.setTimeInputError(input, true);
                    return false;
                }
            } else {
                const minEnd = this.editor.startTime + this.editor.MIN_DURATION;
                if (time < minEnd || time > this.editor.videoDuration) {
                    this.setTimeInputError(input, true);
                    return false;
                }
            }
        }
        
        this.setTimeInputError(input, false);
        return true;
    }
    
    // Handle numeric time input changes
    handleTimeInputChange(type, value) {
        const time = this.parseTimeInput(value);
        const input = type === 'start' ? this.startTimeInput : this.endTimeInput;
        
        if (time === null) {
            this.setTimeInputError(input, true);
            return;
        }
        
        this.setTimeInputError(input, false);
        
        // Calculate new selection bounds
        let newStart = this.editor.startTime;
        let newEnd = this.editor.endTime;
        
        if (type === 'start') {
            const maxStart = this.editor.endTime - this.editor.MIN_DURATION;
            newStart = Math.max(0, Math.min(maxStart, time));
        } else {
            const minEnd = this.editor.startTime + this.editor.MIN_DURATION;
            newEnd = Math.min(this.editor.videoDuration, Math.max(minEnd, time));
        }
        
        // Update selection
        this.editor.updateSelection(newStart, newEnd);
        
        // Seek to the changed point
        if (this.editor.previewVideo) {
            this.editor.previewVideo.currentTime = type === 'start' ? newStart : newEnd;
        }
        
        console.log(`Time input changed: ${type} = ${time.toFixed(2)}s`);
    }
    
    // Focus time input for quick editing
    focusTimeInput(type) {
        const input = type === 'start' ? this.startTimeInput : this.endTimeInput;
        
        if (input) {
            input.focus();
            input.select();
        }
    }
    
    // Setup input validation listeners
    setupInputValidation() {
        if (this.startTimeInput) {
            this.startTimeInput.addEventListener('input', (e) => {
                this.validateTimeInput(this.startTimeInput, e.target.value);
            });
            this.startTimeInput.addEventListener('change', (e) => {
                this.handleTimeInputChange('start', e.target.value);
            });
            this.startTimeInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleTimeInputChange('start', e.target.value);
                    e.target.blur();
                }
            });
        }
        
        if (this.endTimeInput) {
            this.endTimeInput.addEventListener('input', (e) => {
                this.validateTimeInput(this.endTimeInput, e.target.value);
            });
            this.endTimeInput.addEventListener('change', (e) => {
                this.handleTimeInputChange('end', e.target.value);
            });
            this.endTimeInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleTimeInputChange('end', e.target.value);
                    e.target.blur();
                }
            });
        }
    }
    
    // Called when video loads
    onVideoLoaded() {
        // Setup input validation after a short delay
        setTimeout(() => {
            this.setupInputValidation();
        }, 100);
    }
    
    // Called when selection updates
    updateSelection() {
        this.updateTimeDisplay();
        
        // Clear any error states
        this.setTimeInputError(this.startTimeInput, false);
        this.setTimeInputError(this.endTimeInput, false);
    }
    
    // Cleanup
    cleanup() {
        this.startTimeInput = null;
        this.endTimeInput = null;
        
        console.log('TimeFormatter cleanup completed');
    }
}