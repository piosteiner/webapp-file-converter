// Main GIF Editor Controller
// Coordinates between all subsystems and manages core state
// File: gif_editor_main.js

class IntegratedGifEditor {
    constructor() {
        // Core state
        this.originalGifBlob = null;
        this.previewVideoUrl = null;
        this.videoDuration = 0;
        this.startTime = 0;
        this.endTime = 0;
        this.isProcessing = false;
        this.currentTime = 0;
        
        // Configuration
        this.MIN_DURATION = 0.1; // Minimum 0.1s selection
        this.MAX_DURATION = 30; // Maximum 30s for most platforms
        this.SERVER_URL = (window.SERVER_URL || 'https://api.piogino.ch');
        
        // NEW: Ping-pong mode tracking
        this.pingPongMode = false;
        
        // UI element references
        this.initializeElementReferences();
        
        // Timeline element references (like the original file)
        this.timelineSelection = null;
        this.selectionArea = null;
        this.startHandle = null;
        this.endHandle = null;
        this.playhead = null;
        
        // Initialize subsystems
        this.initializeSubsystems();
        
        // Wire up the main functionality
        this.initializeEditor();
    }
    
    initializeElementReferences() {
        this.editorDropZone = document.getElementById('editorDropZone');
        this.editorFileInput = document.getElementById('editorFileInput');
        this.editorContainer = document.getElementById('editorContainer');
        this.previewVideo = document.getElementById('previewVideo');
        this.timelineTrack = document.getElementById('timelineTrack');
    }
    
    initializeSubsystems() {
        // Create subsystem controllers
        this.uiManager = new UIManager(this);
        this.fileHandler = new FileHandler(this);
        this.timelineController = new TimelineController(this);
        this.videoController = new VideoController(this);
        this.inputHandler = new InputHandler(this);
        
        // Store reference to timeFormatter for easy access
        this.timeFormatter = this.uiManager.timeFormatter;
    }

    initializeEditor() {
        console.log('Initializing Enhanced GIF Editor...');
        
        // Initialize all subsystems
        this.uiManager.initialize();
        this.fileHandler.initialize();
        this.timelineController.initialize();
        this.videoController.initialize();
        this.inputHandler.initialize();
        
        // Main button event listeners
        this.setupMainButtons();
        
        console.log('Enhanced GIF Editor initialized with modular architecture.');
    }
    
    setupMainButtons() {
        // Open editor button
        document.getElementById('openEditorBtn')?.addEventListener('click', () => {
            this.editorContainer?.classList.remove('hidden');
            this.editorContainer?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });

        // Replace file button
        document.getElementById('replaceGifBtn')?.addEventListener('click', () => {
            if (!this.isProcessing) this.editorFileInput?.click();
        });
        
        // File input change
        this.editorFileInput?.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.fileHandler.loadGifForEditing(e.target.files[0]);
            }
        });

        // Export button
        document.getElementById('exportTrimmedBtn')?.addEventListener('click', () => {
            this.fileHandler.exportTrimmedGif();
        });
    }
    
    // Called when video metadata is loaded
    onVideoLoaded() {
        if (!this.previewVideo || !this.previewVideo.duration) {
            console.error('Video not properly loaded');
            this.uiManager.showStatus('❌ Failed to load video metadata', 'error');
            return;
        }
        
        this.videoDuration = this.previewVideo.duration;
        
        if (!this.videoDuration || this.videoDuration === 0 || !isFinite(this.videoDuration)) {
            console.error('Video duration is 0 or invalid:', this.videoDuration);
            this.uiManager.showStatus('❌ Failed to load video metadata', 'error');
            return;
        }
        
        // Update duration display
        const durationEl = document.getElementById('videoDuration');
        if (durationEl) {
            durationEl.textContent = `${this.videoDuration.toFixed(1)}s`;
        }
        
        // Reset selection to full video
        this.startTime = 0;
        this.endTime = this.videoDuration;
        this.currentTime = 0;
        
        // Initialize all subsystems for the loaded video
        this.timelineController.onVideoLoaded();
        this.videoController.onVideoLoaded();
        this.inputHandler.onVideoLoaded();
        
        // Get timeline element references from UI manager and store them directly
        const elements = this.uiManager.onVideoLoaded();
        if (elements) {
            this.timelineSelection = elements.timelineSelection;
            this.selectionArea = elements.selectionArea;
            this.startHandle = elements.startHandle;
            this.endHandle = elements.endHandle;
            this.playhead = elements.playhead;
        }
        
        // Update timeline selection visually (like the original)
        this.updateTimelineSelection();
        
        console.log(`Video loaded successfully: ${this.videoDuration.toFixed(1)}s duration`);
    }
    
    // Direct timeline selection update method (from original file)
    updateTimelineSelection() {
        if (this.videoDuration === 0 || !this.selectionArea) {
            console.warn('Cannot update selection - video not loaded or selection area missing');
            return;
        }
        
        const startPercent = (this.startTime / this.videoDuration) * 100;
        const endPercent = (this.endTime / this.videoDuration) * 100;
        
        this.selectionArea.style.left = `${startPercent}%`;
        this.selectionArea.style.width = `${endPercent - startPercent}%`;
        
        // Force visibility
        this.selectionArea.style.display = 'block';
        this.selectionArea.style.opacity = '1';
        
        console.log(`Timeline selection updated: ${startPercent.toFixed(1)}% to ${endPercent.toFixed(1)}%`);
    }
    
    // Update selection times (called by various subsystems)
    updateSelection(startTime, endTime) {
        // Validate and constrain the new times
        const maxStart = endTime - this.MIN_DURATION;
        const minEnd = startTime + this.MIN_DURATION;
        
        this.startTime = Math.max(0, Math.min(maxStart, startTime));
        this.endTime = Math.min(this.videoDuration, Math.max(minEnd, endTime));
        
        // Update timeline visually using direct method (like original)
        this.updateTimelineSelection();
        
        // Notify subsystems of the change
        this.videoController.updateSelection();
        this.inputHandler.updateSelection();
        this.uiManager.updateSelection();
        
        console.log(`Selection updated: ${this.startTime.toFixed(2)}s - ${this.endTime.toFixed(2)}s`);
    }
    
    // Set preset duration (called by UI)
    setPreset(duration) {
        if (this.videoDuration === 0) return;

        // Clear active states
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.duration === duration);
        });

        let newStart, newEnd;
        
        if (duration === 'full') {
            newStart = 0;
            newEnd = this.videoDuration;
        } else {
            const durationNum = parseFloat(duration);
            
            if (durationNum > this.videoDuration) {
                newStart = 0;
                newEnd = this.videoDuration;
            } else {
                const idealStart = (this.videoDuration - durationNum) / 2;
                newStart = Math.max(0, idealStart);
                newEnd = Math.min(newStart + durationNum, this.videoDuration);
            }
        }
        
        // Use updateSelection to ensure all visuals update
        this.updateSelection(newStart, newEnd);
        
        // Seek to start of selection
        if (this.previewVideo) {
            this.previewVideo.currentTime = this.startTime;
        }
        
        console.log(`Preset: ${duration} | Selection: ${this.startTime.toFixed(1)}s - ${this.endTime.toFixed(1)}s`);
    }
    
    // Set ping-pong mode (called from UI)
    setPingPongMode(enabled) {
        this.pingPongMode = enabled;
        
        // Update UI directly via status manager
        this.uiManager.statusManager.updateDurationPill();
        
        // Show status
        if (enabled) {
            this.uiManager.showStatus('🔄 Ping-Pong mode enabled - clip will play forward then backward', 'info');
        } else {
            this.uiManager.showStatus('➡️ Normal mode - clip will play forward only', 'info');
        }
        
        console.log('Ping-pong mode:', enabled);
    }
    
    // Enable/disable controls
    enableControls(enabled) {
        const controls = [
            'playPauseBtn', 
            'restartBtn', 
            'loopBtn', 
            'exportTrimmedBtn'
        ];
        
        controls.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = !enabled;
        });
        
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.disabled = !enabled;
        });
    }
    
    // Cleanup resources
    cleanup() {
        if (this.previewVideoUrl) {
            URL.revokeObjectURL(this.previewVideoUrl);
            this.previewVideoUrl = null;
        }
        
        if (this.previewVideo) {
            this.previewVideo.pause();
            this.previewVideo.src = '';
        }
        
        // Cleanup subsystems
        this.fileHandler?.cleanup();
        this.timelineController?.cleanup();
        this.videoController?.cleanup();
        this.inputHandler?.cleanup();
        this.uiManager?.cleanup();
        
        console.log('Editor cleanup completed');
    }
}

// Initialize when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.gifEditor = new IntegratedGifEditor();
        console.log('Enhanced GIF Editor instance created with modular architecture');
    }, 100);
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.gifEditor) {
        window.gifEditor.cleanup();
    }
});