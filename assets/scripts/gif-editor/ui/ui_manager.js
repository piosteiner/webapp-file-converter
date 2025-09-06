// UI Manager - Simplified coordinator for all UI modules

class UIManager {
    constructor(editor) {
        this.editor = editor;
        
        // Initialize sub-modules
        this.timelineUI = new TimelineUI(editor);
        this.statusManager = new StatusManager(editor);
        this.timeFormatter = new TimeFormatter(editor);
        this.styleManager = new StyleManager(editor);
    }
    
    initialize() {
        // Initialize all sub-modules
        this.timelineUI.initialize();
        this.statusManager.initialize();
        this.timeFormatter.initialize();
        this.styleManager.initialize();
        
        // Setup ping-pong listener
        this.statusManager.setupPingPongListener();
        
        logger.debug('UIManager initialized with modular architecture');
    }
    
    // Delegate methods to appropriate sub-modules
    
    // Timeline methods
    createTimelineSelection() {
        return this.timelineUI.createTimelineSelection();
    }
    
    createTimeline() {
        return this.timelineUI.createTimeline();
    }
    
    updatePlayhead() {
        this.timelineUI.updatePlayhead();
        
        // Update preview info
        const currentTime = this.editor.previewVideo?.currentTime || 0;
        const isInSelection = currentTime >= this.editor.startTime && currentTime <= this.editor.endTime;
        const progressInSelection = isInSelection ? 
            ((currentTime - this.editor.startTime) / (this.editor.endTime - this.editor.startTime)) * 100 : 0;
        
        this.statusManager.updatePreviewInfo(currentTime, isInSelection, progressInSelection);
    }
    
    // Status methods
    showStatus(message, type = 'info') {
        return this.statusManager.showStatus(message, type);
    }
    
    updateDurationPill() {
        return this.statusManager.updateDurationPill();
    }
    
    updateFilename(filename) {
        return this.statusManager.updateFilename(filename);
    }
    
    showEditor() {
        return this.statusManager.showEditor();
    }
    
    updateExportProgress(step, percentage, message) {
        return this.statusManager.updateExportProgress(step, percentage, message);
    }
    
    hideExportProgress() {
        return this.statusManager.hideExportProgress();
    }
    
    // Time formatting methods
    updateTimeDisplay() {
        return this.timeFormatter.updateTimeDisplay();
    }
    
    formatTimeForInput(seconds) {
        return this.timeFormatter.formatTimeForInput(seconds);
    }
    
    parseTimeInput(value) {
        return this.timeFormatter.parseTimeInput(value);
    }
    
    setTimeInputError(input, hasError) {
        return this.timeFormatter.setTimeInputError(input, hasError);
    }
    
    focusTimeInput(type) {
        return this.timeFormatter.focusTimeInput(type);
    }
    
    // Style methods
    addCustomStyle(id, cssText) {
        return this.styleManager.addCustomStyle(id, cssText);
    }
    
    setCSSVariable(property, value) {
        return this.styleManager.setCSSVariable(property, value);
    }
    
    // Event handling
    onVideoLoaded() {
        // Coordinate all sub-modules for video loading
        const elements = this.timelineUI.onVideoLoaded();
        this.timeFormatter.onVideoLoaded();
        
        // Update displays
        this.updateTimeDisplay();
        this.updatePlayhead();
        this.updateDurationPill();
        
        // Enable controls
        this.editor.enableControls(true);
        
        return elements;
    }
    
    updateSelection() {
        // Coordinate all sub-modules for selection updates
        this.timeFormatter.updateSelection();
        this.statusManager.updateSelection();
        
        // Update playhead
        this.updatePlayhead();
    }
    
    // Cleanup
    cleanup() {
        // Cleanup all sub-modules
        this.timelineUI.cleanup();
        this.statusManager.cleanup();
        this.timeFormatter.cleanup();
        this.styleManager.cleanup();
        
        logger.debug('UIManager cleanup completed');
    }
}