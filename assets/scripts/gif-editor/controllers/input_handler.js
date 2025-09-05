// Input Handler - Manages keyboard shortcuts and numeric input processing

class InputHandler {
    constructor(editor) {
        this.editor = editor;
    }
    
    initialize() {
        this.setupKeyboardListeners();
        this.setupNumericInputListeners();
        console.log('InputHandler initialized');
    }
    
    setupKeyboardListeners() {
        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }
    
    setupNumericInputListeners() {
        // Wait for UI manager to create inputs
        setTimeout(() => {
            const startTimeInput = document.getElementById('startTimeInput');
            const endTimeInput = document.getElementById('endTimeInput');
            
            if (startTimeInput) {
                startTimeInput.addEventListener('change', (e) => this.handleTimeInputChange('start', e.target.value));
                startTimeInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.handleTimeInputChange('start', e.target.value);
                        e.target.blur();
                    }
                });
            }
            
            if (endTimeInput) {
                endTimeInput.addEventListener('change', (e) => this.handleTimeInputChange('end', e.target.value));
                endTimeInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.handleTimeInputChange('end', e.target.value);
                        e.target.blur();
                    }
                });
            }
        }, 500);
    }
    
    // Enhanced keyboard shortcuts
    handleKeyboard(event) {
        // Only handle keyboard when editor container is visible and not in an input field
        if (!this.editor.editorContainer || 
            this.editor.editorContainer.classList.contains('hidden') ||
            this.editor.videoDuration === 0 ||
            ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) {
            return;
        }
        
        const step = event.shiftKey ? 0.001 : 0.01; // Finer control with Shift (frame-accurate)
        let updated = false;
        
        switch(event.key.toLowerCase()) {
            // I/O hotkeys for in/out points
            case 'i':
                event.preventDefault();
                this.editor.videoController.setInPoint();
                updated = true;
                break;
                
            case 'o':
                event.preventDefault();
                this.editor.videoController.setOutPoint();
                updated = true;
                break;
            
            // Frame-by-frame navigation and selection adjustment
            case 'arrowleft':
                event.preventDefault();
                if (event.ctrlKey || event.metaKey) {
                    // Move entire selection left
                    this.editor.videoController.moveSelection(-step);
                    updated = true;
                } else if (event.altKey) {
                    // Adjust start point
                    this.editor.videoController.adjustSelectionStart(-step);
                    updated = true;
                } else {
                    // Scrub backward
                    this.editor.videoController.stepTime(-step);
                }
                break;
                
            case 'arrowright':
                event.preventDefault();
                if (event.ctrlKey || event.metaKey) {
                    // Move entire selection right
                    this.editor.videoController.moveSelection(step);
                    updated = true;
                } else if (event.altKey) {
                    // Adjust end point
                    this.editor.videoController.adjustSelectionEnd(step);
                    updated = true;
                } else {
                    // Scrub forward
                    this.editor.videoController.stepTime(step);
                }
                break;
                
            case ' ':
                // Spacebar to play/pause
                event.preventDefault();
                this.editor.videoController.togglePlayback();
                return;
                
            case 'home':
                // Go to selection start
                event.preventDefault();
                this.editor.videoController.seekToSelectionStart();
                break;
                
            case 'end':
                // Go to selection end
                event.preventDefault();
                this.editor.videoController.seekToSelectionEnd();
                break;
                
            case 'r':
                // Restart from selection beginning
                event.preventDefault();
                this.editor.videoController.restart();
                break;
                
            case 'l':
                // Toggle loop mode
                event.preventDefault();
                this.editor.videoController.toggleLoopMode();
                break;
                
            // Quick duration presets
            case '1':
                if (!this.hasModifiers(event)) {
                    event.preventDefault();
                    this.editor.setPreset('1.5');
                }
                break;
            case '3':
                if (!this.hasModifiers(event)) {
                    event.preventDefault();
                    this.editor.setPreset('3');
                }
                break;
            case 'f':
                if (!this.hasModifiers(event)) {
                    event.preventDefault();
                    this.editor.setPreset('full');
                }
                break;
                
            // Speed controls
            case 's':
                if (event.shiftKey) {
                    event.preventDefault();
                    this.editor.videoController.toggleSlowMotion();
                }
                break;
                
            // Export shortcut
            case 'e':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.editor.fileHandler.exportTrimmedGif();
                }
                break;
        }
        
        // If selection was updated, refresh displays
        if (updated) {
            this.clearPresetStates();
            console.log(`Keyboard adjustment: ${this.editor.startTime.toFixed(2)}s - ${this.editor.endTime.toFixed(2)}s`);
        }
    }
    
    // Check if event has modifier keys
    hasModifiers(event) {
        return event.ctrlKey || event.metaKey || event.altKey || event.shiftKey;
    }
    
    // Clear preset button active states
    clearPresetStates() {
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.remove('active');
        });
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
    
    // Handle numeric time input changes
    handleTimeInputChange(type, value) {
        const time = this.parseTimeInput(value);
        const input = type === 'start' ? 
            document.getElementById('startTimeInput') : 
            document.getElementById('endTimeInput');
        
        if (time === null) {
            this.editor.uiManager.setTimeInputError(input, true);
            return;
        }
        
        this.editor.uiManager.setTimeInputError(input, false);
        
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
        
        // Clear preset states
        this.clearPresetStates();
        
        console.log(`Time input changed: ${type} = ${time.toFixed(2)}s`);
    }
    
    // Validate time input in real-time
    validateTimeInput(input, value) {
        const time = this.parseTimeInput(value);
        
        if (time === null && value.trim() !== '') {
            this.editor.uiManager.setTimeInputError(input, true);
            return false;
        }
        
        // Check bounds
        if (time !== null) {
            const isStart = input.id === 'startTimeInput';
            
            if (isStart) {
                const maxStart = this.editor.endTime - this.editor.MIN_DURATION;
                if (time < 0 || time > maxStart) {
                    this.editor.uiManager.setTimeInputError(input, true);
                    return false;
                }
            } else {
                const minEnd = this.editor.startTime + this.editor.MIN_DURATION;
                if (time < minEnd || time > this.editor.videoDuration) {
                    this.editor.uiManager.setTimeInputError(input, true);
                    return false;
                }
            }
        }
        
        this.editor.uiManager.setTimeInputError(input, false);
        return true;
    }
    
    // Handle real-time input validation
    setupInputValidation() {
        const startInput = document.getElementById('startTimeInput');
        const endInput = document.getElementById('endTimeInput');
        
        if (startInput) {
            startInput.addEventListener('input', (e) => {
                this.validateTimeInput(startInput, e.target.value);
            });
        }
        
        if (endInput) {
            endInput.addEventListener('input', (e) => {
                this.validateTimeInput(endInput, e.target.value);
            });
        }
    }
    
    // Focus time input for quick editing
    focusTimeInput(type) {
        const input = type === 'start' ? 
            document.getElementById('startTimeInput') : 
            document.getElementById('endTimeInput');
        
        if (input) {
            input.focus();
            input.select();
        }
    }
    
    // Called when video loads
    onVideoLoaded() {
        // Setup input validation
        setTimeout(() => {
            this.setupInputValidation();
        }, 100);
    }
    
    // Called when selection updates
    updateSelection() {
        // Input values are updated by UI manager
        // Just clear any error states
        const startInput = document.getElementById('startTimeInput');
        const endInput = document.getElementById('endTimeInput');
        
        this.editor.uiManager.setTimeInputError(startInput, false);
        this.editor.uiManager.setTimeInputError(endInput, false);
    }
    
    // Cleanup
    cleanup() {
        console.log('InputHandler cleanup completed');
    }
}