// Timeline Controller - Handles timeline interactions, dragging, and selection

class TimelineController {
    constructor(editor) {
        this.editor = editor;
        
        // Selection dragging state
        this.isDragging = false;
        this.dragType = null;
        this.dragStartX = 0;
        this.dragStartTime = 0;
        this.dragEndTime = 0;
        
        // Playhead dragging
        this.isDraggingPlayhead = false;
        
        // Element references (will be set when created)
        this.timelineSelection = null;
        this.selectionArea = null;
        this.startHandle = null;
        this.endHandle = null;
        this.playhead = null;
    }
    
    initialize() {
        this.setupTimelineEventListeners();
        this.setupGlobalMouseListeners();
        console.log('TimelineController initialized');
    }
    
    setupTimelineEventListeners() {
        // Timeline click and drag events
        this.editor.timelineTrack?.addEventListener('mousedown', (e) => this.handleTimelineMouseDown(e));
    }
    
    setupGlobalMouseListeners() {
        // Global mouse events for dragging
        document.addEventListener('mousemove', (e) => this.handleGlobalMouseMove(e));
        document.addEventListener('mouseup', () => this.handleGlobalMouseUp());
    }
    
    // Enhanced timeline interaction - click to seek, start dragging playhead
    handleTimelineMouseDown(event) {
        if (this.editor.videoDuration === 0) return;
        
        // Check if clicking on handles or selection area
        if (event.target.closest('.selection-handle') || event.target.closest('.selection-area')) {
            return; // Let the existing drag handlers take over
        }
        
        // Check if clicking on playhead
        if (event.target.closest('.timeline-playhead')) {
            this.startPlayheadDrag(event);
            return;
        }
        
        // Otherwise, seek to clicked position
        const rect = this.editor.timelineTrack.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickPercent = Math.max(0, Math.min(1, clickX / rect.width));
        const targetTime = clickPercent * this.editor.videoDuration;
        
        if (this.editor.previewVideo) {
            this.editor.previewVideo.currentTime = targetTime;
        }
        
        // Start dragging playhead from here
        this.isDraggingPlayhead = true;
        event.preventDefault();
    }
    
    // Start dragging the playhead for scrubbing
    startPlayheadDrag(event) {
        event.preventDefault();
        event.stopPropagation();
        this.isDraggingPlayhead = true;
        document.body.style.cursor = 'ew-resize';
    }
    
    // Start dragging selection handles or area
    startDrag(event, type) {
        event.preventDefault();
        event.stopPropagation();
        
        this.isDragging = true;
        this.dragType = type;
        this.dragStartX = event.clientX;
        
        if (type === 'area') {
            this.dragStartTime = this.editor.startTime;
            this.dragEndTime = this.editor.endTime;
            this.selectionArea?.classList.add('dragging');
        } else {
            this.dragStartTime = type === 'start' ? this.editor.startTime : this.editor.endTime;
            if (type === 'start') {
                this.startHandle?.classList.add('dragging');
            } else {
                this.endHandle?.classList.add('dragging');
            }
        }
        
        document.body.style.userSelect = 'none';
        document.body.style.cursor = type === 'area' ? 'grabbing' : 'ew-resize';
        
        console.log(`Started dragging ${type} at time: ${this.dragStartTime?.toFixed(2)}s`);
    }
    
    // Handle all mouse moves (selection AND playhead dragging)
    handleGlobalMouseMove(event) {
        // Handle playhead dragging (scrubbing)
        if (this.isDraggingPlayhead && this.editor.videoDuration > 0) {
            const rect = this.editor.timelineTrack.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mousePercent = Math.max(0, Math.min(1, mouseX / rect.width));
            const targetTime = mousePercent * this.editor.videoDuration;
            
            if (this.editor.previewVideo) {
                this.editor.previewVideo.currentTime = targetTime;
            }
            return;
        }
        
        // Handle selection dragging
        if (this.isDragging) {
            this.handleDrag(event);
        }
    }
    
    // Handle selection dragging
    handleDrag(event) {
        if (!this.isDragging || this.editor.videoDuration === 0) return;

        const rect = this.editor.timelineTrack.getBoundingClientRect();
        const trackWidth = rect.width;
        const mouseX = event.clientX - rect.left;
        const mousePercent = Math.max(0, Math.min(1, mouseX / trackWidth));
        const mouseTime = mousePercent * this.editor.videoDuration;

        if (this.dragType === 'start') {
            const maxStart = this.editor.endTime - this.editor.MIN_DURATION;
            const newStart = Math.max(0, Math.min(maxStart, mouseTime));
            this.editor.startTime = newStart;
            
            if (this.editor.previewVideo) {
                this.editor.previewVideo.currentTime = this.editor.startTime;
            }
            
        } else if (this.dragType === 'end') {
            const minEnd = this.editor.startTime + this.editor.MIN_DURATION;
            const newEnd = Math.min(this.editor.videoDuration, Math.max(minEnd, mouseTime));
            this.editor.endTime = newEnd;
            
            if (this.editor.previewVideo) {
                this.editor.previewVideo.currentTime = this.editor.endTime;
            }
            
        } else if (this.dragType === 'area') {
            const selectionDuration = this.dragEndTime - this.dragStartTime;
            const deltaX = event.clientX - this.dragStartX;
            const deltaTime = (deltaX / trackWidth) * this.editor.videoDuration;
            
            let newStart = this.dragStartTime + deltaTime;
            let newEnd = this.dragEndTime + deltaTime;
            
            // Constrain to timeline bounds
            if (newStart < 0) {
                newStart = 0;
                newEnd = selectionDuration;
            }
            if (newEnd > this.editor.videoDuration) {
                newEnd = this.editor.videoDuration;
                newStart = this.editor.videoDuration - selectionDuration;
            }
            
            this.editor.startTime = newStart;
            this.editor.endTime = newEnd;
            
            if (this.editor.previewVideo) {
                const centerTime = (this.editor.startTime + this.editor.endTime) / 2;
                this.editor.previewVideo.currentTime = centerTime;
            }
        }

        // Update all displays
        this.updateSelectionVisual();
        this.editor.uiManager.updateTimeDisplay();
        this.editor.uiManager.updatePlayhead();
        this.editor.uiManager.updateDurationPill();
        
        // Update preview info during drag
        this.updateDragPreviewInfo();
        
        // Clear preset button states
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.remove('active');
        });
    }
    
    // Update preview info during dragging
    updateDragPreviewInfo() {
        const previewInfo = document.getElementById('previewInfo');
        if (!previewInfo) return;
        
        const duration = this.editor.endTime - this.editor.startTime;
        const dragIcon = this.dragType === 'start' ? '◀️' : 
                       this.dragType === 'end' ? '▶️' : '🔄';
        previewInfo.textContent = 
            `${dragIcon} Dragging ${this.dragType} | Selection: ${duration.toFixed(1)}s (${((duration / this.editor.videoDuration) * 100).toFixed(0)}%)`;
    }
    
    // Handle mouse up for all dragging
    handleGlobalMouseUp() {
        if (this.isDraggingPlayhead) {
            this.isDraggingPlayhead = false;
            document.body.style.cursor = '';
        }
        
        if (this.isDragging) {
            this.endDrag();
        }
    }
    
    // End selection dragging
    endDrag() {
        if (!this.isDragging) return;
        
        const dragType = this.dragType;
        const finalStart = this.editor.startTime;
        const finalEnd = this.editor.endTime;
        
        // Remove dragging styles
        this.selectionArea?.classList.remove('dragging');
        this.startHandle?.classList.remove('dragging');
        this.endHandle?.classList.remove('dragging');
        
        // Reset drag state
        this.isDragging = false;
        this.dragType = null;
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        
        console.log(`Finished dragging ${dragType}. Final selection: ${finalStart.toFixed(2)}s - ${finalEnd.toFixed(2)}s (duration: ${(finalEnd - finalStart).toFixed(2)}s)`);
        
        // Update playhead and seek if needed
        this.editor.uiManager.updatePlayhead();
        
        if (this.editor.previewVideo && dragType !== 'area') {
            this.editor.previewVideo.currentTime = this.editor.startTime;
        }
    }
    
    // Update timeline selection visual position
    updateSelectionVisual() {
        if (this.editor.videoDuration === 0 || !this.selectionArea) {
            console.warn('Cannot update selection - video not loaded or selection area missing');
            return;
        }
        
        const startPercent = (this.editor.startTime / this.editor.videoDuration) * 100;
        const endPercent = (this.editor.endTime / this.editor.videoDuration) * 100;
        
        this.selectionArea.style.left = `${startPercent}%`;
        this.selectionArea.style.width = `${endPercent - startPercent}%`;
        
        // Force visibility
        this.selectionArea.style.display = 'block';
        this.selectionArea.style.opacity = '1';
        
        console.log(`Selection updated: ${startPercent.toFixed(1)}% to ${endPercent.toFixed(1)}%`);
    }
    
    // Setup event listeners for newly created timeline elements
    setupElementEventListeners() {
        if (!this.startHandle || !this.endHandle || !this.selectionArea) return;
        
        // Handle dragging events
        this.startHandle.addEventListener('mousedown', (e) => this.startDrag(e, 'start'));
        this.endHandle.addEventListener('mousedown', (e) => this.startDrag(e, 'end'));
        this.selectionArea.addEventListener('mousedown', (e) => {
            // Only drag the area if not clicking on handles
            if (!e.target.classList.contains('selection-handle') && 
                !e.target.classList.contains('handle-label')) {
                this.startDrag(e, 'area');
            }
        });
        
        console.log('Timeline element event listeners attached');
    }
    
    // Called when video loads
    onVideoLoaded() {
        // Get element references from UI manager
        const elements = this.editor.uiManager.onVideoLoaded();
        
        if (elements) {
            this.timelineSelection = elements.timelineSelection;
            this.selectionArea = elements.selectionArea;
            this.startHandle = elements.startHandle;
            this.endHandle = elements.endHandle;
            this.playhead = elements.playhead;
            
            // Setup event listeners for the new elements
            this.setupElementEventListeners();
        }
        
        // Update visual state
        this.updateSelectionVisual();
    }
    
    // Called when selection updates from other sources
    updateSelection() {
        this.updateSelectionVisual();
    }
    
    // Cleanup
    cleanup() {
        // Reset drag states
        this.isDragging = false;
        this.isDraggingPlayhead = false;
        this.dragType = null;
        
        // Reset cursor
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        
        console.log('TimelineController cleanup completed');
    }
}