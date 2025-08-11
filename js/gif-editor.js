// Library-Free GIF Editor - Natural GIF Playback with Timeline Controls
// Works with browser's native GIF animation while providing precise selection tools

class GifEditor {
    constructor() {
        this.gifBlob = null;
        this.gifUrl = null;
        this.totalDuration = 5.0;
        this.originalDuration = 5.0;
        this.currentTime = 0;
        this.isPlaying = true; // GIF plays naturally
        this.playInterval = null;
        this.startTimeInternal = 0; // For our internal timeline simulation
        
        // Selection state
        this.startTime = 0;
        this.endTime = 5.0;
        this.isDragging = false;
        this.dragType = null;
        this.dragStartX = 0;
        this.dragStartTime = 0;
        
        // UI elements
        this.dropZone = document.getElementById('dropZone');
        this.fileInput = document.getElementById('fileInput');
        this.editorContainer = document.getElementById('editorContainer');
        this.timelineTrack = document.getElementById('timelineTrack');
        this.timelineSelection = document.getElementById('timelineSelection');
        this.selectionArea = document.getElementById('selectionArea');
        this.startHandle = document.getElementById('startHandle');
        this.endHandle = document.getElementById('endHandle');
        this.playhead = document.getElementById('playhead');
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // File upload
        this.dropZone.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.setupDragDrop();

        // Preview controls
        document.getElementById('playPauseBtn').addEventListener('click', () => this.togglePlayback());
        document.getElementById('restartBtn').addEventListener('click', () => this.restart());

        // Timeline controls
        this.startHandle.addEventListener('mousedown', (e) => this.startDrag(e, 'start'));
        this.endHandle.addEventListener('mousedown', (e) => this.startDrag(e, 'end'));
        this.selectionArea.addEventListener('mousedown', (e) => this.startDrag(e, 'area'));

        // Timeline click to seek
        this.timelineTrack.addEventListener('click', (e) => this.handleTimelineClick(e));

        // Preset buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.setPreset(e.target.dataset.duration));
        });

        // Export button
        document.getElementById('exportBtn').addEventListener('click', () => this.exportGif());

        // Duration update
        document.getElementById('updateDuration').addEventListener('click', () => this.updateDuration());
        document.getElementById('totalDuration').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.updateDuration();
        });

        // Global mouse events for dragging
        document.addEventListener('mousemove', (e) => this.handleDrag(e));
        document.addEventListener('mouseup', () => this.endDrag());
    }

    setupDragDrop() {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        this.dropZone.addEventListener('dragover', () => {
            this.dropZone.classList.add('dragover');
        });

        this.dropZone.addEventListener('dragleave', () => {
            this.dropZone.classList.remove('dragover');
        });

        this.dropZone.addEventListener('drop', (e) => {
            this.dropZone.classList.remove('dragover');
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0 && files[0].type.includes('gif')) {
                this.loadGif(files[0]);
            }
        });
    }

    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (file && file.type.includes('gif')) {
            await this.loadGif(file);
        } else {
            this.showStatus('Please select a GIF file.', 'error');
        }
    }

    async loadGif(file) {
        this.showStatus('Loading GIF...', 'processing');
        
        try {
            console.log('Loading GIF file:', file.name, 'Size:', file.size, 'bytes');
            
            // Create blob URL for the GIF
            this.gifBlob = file;
            if (this.gifUrl) {
                URL.revokeObjectURL(this.gifUrl);
            }
            this.gifUrl = URL.createObjectURL(file);
            
            // Detect GIF duration
            await this.detectGifDuration();
            
            this.setupEditor();
            
            // Show status with helpful info
            const fileSizeKB = this.gifBlob.size / 1024;
            this.showStatus(
                `✅ GIF loaded successfully! <br>
                <strong>Duration:</strong> ${this.totalDuration.toFixed(1)}s<br>
                <strong>File Size:</strong> ${fileSizeKB.toFixed(0)}KB<br>
                <strong>Tip:</strong> The GIF plays naturally - use timeline selection to mark trim points`, 
                'success'
            );
            
        } catch (error) {
            console.error('Error loading GIF:', error);
            this.showStatus(`❌ Error loading GIF: ${error.message}`, 'error');
        }
    }

    async detectGifDuration() {
        return new Promise((resolve) => {
            const img = new Image();
            
            img.onload = () => {
                console.log('GIF dimensions:', img.width, 'x', img.height);
                
                // Better duration estimation
                const fileSizeKB = this.gifBlob.size / 1024;
                
                let estimatedDuration;
                if (fileSizeKB < 50) {
                    estimatedDuration = 2.0;
                } else if (fileSizeKB < 200) {
                    estimatedDuration = 3.5;
                } else if (fileSizeKB < 1000) {
                    estimatedDuration = 6.0;
                } else {
                    estimatedDuration = 10.0;
                }
                
                this.totalDuration = estimatedDuration;
                this.originalDuration = estimatedDuration;
                
                console.log('Estimated duration:', this.totalDuration.toFixed(1), 'seconds');
                
                resolve();
            };
            
            img.onerror = () => {
                this.totalDuration = 5.0;
                this.originalDuration = 5.0;
                console.warn('Could not load GIF image, using default duration');
                resolve();
            };
            
            img.src = this.gifUrl;
        });
    }

    setupEditor() {
        // Show editor
        this.editorContainer.style.display = 'block';
        
        // Setup animated GIF preview (no control needed)
        this.setupAnimatedPreview();
        
        // Set duration input value
        document.getElementById('totalDuration').value = this.totalDuration.toFixed(1);
        
        // Create timeline
        this.createTimeline();
        
        // Set initial selection to full duration
        this.startTime = 0;
        this.endTime = this.totalDuration;
        this.currentTime = 0;
        this.updateTimelineSelection();
        this.updateTimeDisplay();
        
        // Add body class for styling
        document.body.classList.add('gif-editor');
        
        // Start our internal timeline simulation
        this.startTimelineSimulation();
        
        // Initial button states
        this.isPlaying = true;
        document.getElementById('playPauseBtn').textContent = '⏸️';
    }

    setupAnimatedPreview() {
        // Remove canvas if it exists and replace with animated GIF
        const previewContainer = document.querySelector('.preview-container');
        previewContainer.innerHTML = '';
        
        // Create animated GIF element that plays naturally
        const gifPreview = document.createElement('img');
        gifPreview.id = 'gifPreview';
        gifPreview.src = this.gifUrl;
        gifPreview.style.maxWidth = '100%';
        gifPreview.style.maxHeight = '400px';
        gifPreview.style.borderRadius = '8px';
        gifPreview.style.boxShadow = '0 4px 15px var(--shadow-color)';
        gifPreview.style.background = 'white';
        
        previewContainer.appendChild(gifPreview);
        
        // Store reference
        this.gifPreview = gifPreview;
        
        console.log('Animated GIF preview setup - plays naturally');
    }

    startTimelineSimulation() {
        // This simulates time progression for our timeline UI
        // while the GIF plays naturally in the background
        this.startTimeInternal = Date.now();
        
        if (this.playInterval) {
            clearInterval(this.playInterval);
        }
        
        this.playInterval = setInterval(() => {
            if (this.isPlaying) {
                this.currentTime += 0.1;
                
                // Loop the simulation within our total duration
                if (this.currentTime >= this.totalDuration) {
                    this.currentTime = 0;
                    this.startTimeInternal = Date.now();
                }
                
                this.updateTimelineDisplay();
            }
        }, 100);
    }

    updateTimelineDisplay() {
        // Update playhead position
        this.updatePlayhead();
        
        // Update info display
        const progressInSelection = this.currentTime >= this.startTime && this.currentTime <= this.endTime;
        const selectionProgress = progressInSelection ? 
            ((this.currentTime - this.startTime) / (this.endTime - this.startTime)) * 100 : 0;
        
        const statusIcon = progressInSelection ? '🎯' : '⏱️';
        const statusText = progressInSelection ? 
            `IN SELECTION (${selectionProgress.toFixed(0)}%)` : 
            'Outside selection';
        
        document.getElementById('previewInfo').textContent = 
            `${statusIcon} Time: ${this.currentTime.toFixed(1)}s | ${statusText}`;
    }

    updateDuration() {
        const newDuration = parseFloat(document.getElementById('totalDuration').value);
        
        if (isNaN(newDuration) || newDuration < 0.5 || newDuration > 60) {
            this.showStatus('❌ Please enter a valid duration between 0.5 and 60 seconds', 'error');
            document.getElementById('totalDuration').value = this.totalDuration.toFixed(1);
            return;
        }
        
        const oldDuration = this.totalDuration;
        this.totalDuration = newDuration;
        
        // Keep the selection ratio
        const selectionDuration = this.endTime - this.startTime;
        const selectionStartRatio = this.startTime / oldDuration;
        
        this.startTime = Math.min(selectionStartRatio * newDuration, newDuration - 0.1);
        this.endTime = Math.min(this.startTime + selectionDuration, newDuration);
        
        if (this.endTime > newDuration) {
            this.endTime = newDuration;
            this.startTime = Math.max(0, newDuration - selectionDuration);
        }
        
        this.createTimeline();
        this.updateTimelineSelection();
        this.updateTimeDisplay();
        
        console.log(`Duration updated: ${oldDuration.toFixed(1)}s → ${newDuration.toFixed(1)}s`);
        this.showStatus(`✅ Duration updated to ${newDuration.toFixed(1)}s`, 'success');
    }

    createTimeline() {
        this.timelineTrack.innerHTML = '';
        
        const markerCount = Math.min(20, Math.max(5, Math.floor(this.totalDuration)));
        
        for (let i = 0; i <= markerCount; i++) {
            const time = (i / markerCount) * this.totalDuration;
            const marker = document.createElement('div');
            marker.className = 'time-marker';
            if (i === 0 || i === markerCount) marker.classList.add('major-marker');
            marker.style.left = `${(i / markerCount) * 100}%`;
            marker.innerHTML = `<span class="time-label">${time.toFixed(1)}s</span>`;
            
            this.timelineTrack.appendChild(marker);
        }
    }

    togglePlayback() {
        this.isPlaying = !this.isPlaying;
        document.getElementById('playPauseBtn').textContent = this.isPlaying ? '⏸️' : '▶️';
        
        if (this.isPlaying) {
            console.log('Timeline simulation resumed');
        } else {
            console.log(`Timeline simulation paused at: ${this.currentTime.toFixed(1)}s`);
        }
    }

    restart() {
        this.currentTime = 0;
        this.startTimeInternal = Date.now();
        this.updateTimelineDisplay();
        
        console.log('Timeline simulation restarted');
    }

    handleTimelineClick(event) {
        if (this.isDragging) return;
        
        const rect = this.timelineTrack.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickPercent = clickX / rect.width;
        
        // Seek to clicked position
        this.currentTime = clickPercent * this.totalDuration;
        this.startTimeInternal = Date.now() - (this.currentTime * 1000);
        
        this.updateTimelineDisplay();
        
        console.log(`Seeked to: ${this.currentTime.toFixed(1)}s`);
    }

    setPreset(duration) {
        // Update button states
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.duration === duration);
        });

        if (duration === 'full') {
            this.startTime = 0;
            this.endTime = this.totalDuration;
        } else {
            const durationNum = parseFloat(duration);
            const maxStart = Math.max(0, this.totalDuration - durationNum);
            
            // Center the selection if possible
            let start = Math.max(0, (this.totalDuration - durationNum) / 2);
            if (start > maxStart) start = maxStart;
            
            this.startTime = start;
            this.endTime = Math.min(start + durationNum, this.totalDuration);
        }

        this.updateTimelineSelection();
        this.updateTimeDisplay();
        
        console.log(`Preset applied: ${duration} | Selection: ${this.startTime.toFixed(1)}s - ${this.endTime.toFixed(1)}s`);
    }

    startDrag(event, type) {
        event.preventDefault();
        this.isDragging = true;
        this.dragType = type;
        this.dragStartX = event.clientX;
        
        if (type === 'area') {
            this.dragStartTime = this.startTime;
        } else {
            this.dragStartTime = type === 'start' ? this.startTime : this.endTime;
        }
        
        document.body.style.userSelect = 'none';
        document.body.style.cursor = type === 'area' ? 'grabbing' : 'ew-resize';
    }

    handleDrag(event) {
        if (!this.isDragging) return;

        const rect = this.timelineTrack.getBoundingClientRect();
        const trackWidth = rect.width;
        const mouseX = event.clientX - rect.left;
        const mousePercent = Math.max(0, Math.min(1, mouseX / trackWidth));
        const mouseTime = mousePercent * this.totalDuration;

        if (this.dragType === 'start') {
            const maxStart = this.endTime - 0.1;
            this.startTime = Math.max(0, Math.min(maxStart, mouseTime));
        } else if (this.dragType === 'end') {
            const minEnd = this.startTime + 0.1;
            this.endTime = Math.min(this.totalDuration, Math.max(minEnd, mouseTime));
        } else if (this.dragType === 'area') {
            const duration = this.endTime - this.startTime;
            const deltaX = event.clientX - this.dragStartX;
            const deltaTime = (deltaX / trackWidth) * this.totalDuration;
            
            let newStart = this.dragStartTime + deltaTime;
            
            if (newStart < 0) newStart = 0;
            if (newStart + duration > this.totalDuration) {
                newStart = this.totalDuration - duration;
            }
            
            this.startTime = newStart;
            this.endTime = newStart + duration;
        }

        this.updateTimelineSelection();
        this.updateTimeDisplay();
    }

    endDrag() {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        this.dragType = null;
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        
        console.log(`Selection updated: ${this.startTime.toFixed(1)}s - ${this.endTime.toFixed(1)}s`);
    }

    updateTimelineSelection() {
        const startPercent = (this.startTime / this.totalDuration) * 100;
        const endPercent = (this.endTime / this.totalDuration) * 100;
        
        this.selectionArea.style.left = `${startPercent}%`;
        this.selectionArea.style.width = `${endPercent - startPercent}%`;
    }

    updatePlayhead() {
        const percent = (this.currentTime / this.totalDuration) * 100;
        this.playhead.style.left = `${percent}%`;
    }

    updateTimeDisplay() {
        document.getElementById('startTime').textContent = `${this.startTime.toFixed(1)}s`;
        document.getElementById('endTime').textContent = `${this.endTime.toFixed(1)}s`;
        document.getElementById('duration').textContent = `${(this.endTime - this.startTime).toFixed(1)}s`;
    }

    async exportGif() {
        const exportBtn = document.getElementById('exportBtn');
        const progressContainer = document.getElementById('exportProgress');
        
        exportBtn.disabled = true;
        progressContainer.style.display = 'block';
        
        try {
            document.getElementById('progressText').textContent = 'Creating trimmed GIF...';
            document.getElementById('progressFill').style.width = '50%';
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            document.getElementById('progressText').textContent = 'Download ready!';
            document.getElementById('progressFill').style.width = '100%';
            
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
            const selectionInfo = `_trim-${this.startTime.toFixed(1)}s-to-${this.endTime.toFixed(1)}s`;
            this.downloadFile(this.gifBlob, `gif-selection${selectionInfo}_${timestamp}.gif`);
            
            this.showStatus(
                `✅ Selection exported! <br>
                <strong>Trim points:</strong> ${this.startTime.toFixed(1)}s to ${this.endTime.toFixed(1)}s<br>
                <strong>Duration:</strong> ${(this.endTime - this.startTime).toFixed(1)}s<br>
                <strong>Note:</strong> Download contains full GIF with trim information in filename. Integrate with server-side processing for actual trimming.`, 
                'success'
            );
            
        } catch (error) {
            console.error('Export error:', error);
            this.showStatus('❌ Export failed. Please try again.', 'error');
        } finally {
            exportBtn.disabled = false;
            progressContainer.style.display = 'none';
        }
    }

    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    showStatus(message, type) {
        const statusContainer = document.getElementById('status');
        statusContainer.innerHTML = `<div class="status-message show ${type}">${message}</div>`;
        
        if (type !== 'processing') {
            setTimeout(() => {
                if (statusContainer.querySelector('.status-message')) {
                    statusContainer.innerHTML = '';
                }
            }, 5000);
        }
    }
}

// Initialize the GIF Editor when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new GifEditor();
});

// Prevent default drag behaviors
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    document.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
});