// Timeline UI - Handles timeline element creation and management

class TimelineUI {
    constructor(editor) {
        this.editor = editor;
        
        // Element references
        this.timelineSelection = null;
        this.selectionArea = null;
        this.startHandle = null;
        this.endHandle = null;
        this.playhead = null;
    }
    
    initialize() {
        this.createTimelineElements();
        console.log('TimelineUI initialized');
    }
    
    // Create timeline elements
    createTimelineElements() {
        console.log('Creating timeline UI elements...');
        
        const timelineTrack = document.getElementById('timelineTrack');
        if (!timelineTrack) {
            console.error('Timeline track not found!');
            return;
        }
        
        this.removeExistingTimelineElements();
        this.createPlayhead(timelineTrack);
        
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
        
        const existingSelection = document.getElementById('timelineSelection');
        if (existingSelection) {
            existingSelection.remove();
        }
        
        this.timelineSelection = document.createElement('div');
        this.timelineSelection.className = 'timeline-selection';
        this.timelineSelection.id = 'timelineSelection';
        timelineTrack.appendChild(this.timelineSelection);
        
        this.selectionArea = document.createElement('div');
        this.selectionArea.className = 'selection-area';
        this.selectionArea.id = 'selectionArea';
        this.timelineSelection.appendChild(this.selectionArea);
        
        this.startHandle = document.createElement('div');
        this.startHandle.className = 'selection-handle left';
        this.startHandle.id = 'startHandle';
        this.selectionArea.appendChild(this.startHandle);
        
        this.endHandle = document.createElement('div');
        this.endHandle.className = 'selection-handle right';
        this.endHandle.id = 'endHandle';
        this.selectionArea.appendChild(this.endHandle);
        
        this.attachDragEventListeners();
        
        console.log('Timeline selection elements created successfully');
        
        return {
            timelineSelection: this.timelineSelection,
            selectionArea: this.selectionArea,
            startHandle: this.startHandle,
            endHandle: this.endHandle,
            playhead: this.playhead
        };
    }
    
    // Attach drag event listeners
    attachDragEventListeners() {
        if (!this.startHandle || !this.endHandle || !this.selectionArea) {
            console.error('Cannot attach drag listeners - elements not created');
            return;
        }
        
        const timelineController = this.editor.timelineController;
        if (!timelineController) {
            console.error('TimelineController not available');
            return;
        }
        
        this.startHandle.addEventListener('mousedown', (e) => timelineController.startDrag(e, 'start'));
        this.endHandle.addEventListener('mousedown', (e) => timelineController.startDrag(e, 'end'));
        this.selectionArea.addEventListener('mousedown', (e) => {
            if (!e.target.classList.contains('selection-handle')) {
                timelineController.startDrag(e, 'area');
            }
        });
        
        console.log('Drag event listeners attached successfully');
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
        
        if (selection) timelineTrack.appendChild(selection);
        if (playhead) timelineTrack.appendChild(playhead);
    }
    
    // Update playhead position
    updatePlayhead() {
        if (this.editor.videoDuration === 0 || !this.playhead) return;
        
        const currentTime = this.editor.previewVideo?.currentTime || 0;
        const percent = (currentTime / this.editor.videoDuration) * 100;
        this.playhead.style.left = `${percent}%`;
        
        this.editor.currentTime = currentTime;
    }
    
    // Called when video loads
    onVideoLoaded() {
        this.createTimeline();
        const elements = this.createTimelineSelection();
        
        const container = document.getElementById('timelineContainer');
        if (container) {
            container.classList.add('ready');
        }
        
        return elements;
    }
    
    // Cleanup
    cleanup() {
        this.removeExistingTimelineElements();
        
        this.timelineSelection = null;
        this.selectionArea = null;
        this.startHandle = null;
        this.endHandle = null;
        this.playhead = null;
        
        console.log('TimelineUI cleanup completed');
    }
}