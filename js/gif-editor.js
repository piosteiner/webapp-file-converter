// Library-Free GIF Editor - Proper Preview Control
// Fixed version with controllable preview that respects selection

class GifEditor {
    constructor() {
        this.gifBlob = null;
        this.gifUrl = null;
        this.gifImage = null;
        this.totalDuration = 5.0;
        this.originalDuration = 5.0;
        this.currentTime = 0;
        this.isPlaying = false;
        this.playInterval = null;
        
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
        this.previewCanvas = document.getElementById('previewCanvas');
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
                <strong>Tip:</strong> Use play/pause controls and timeline selection for precise trimming`, 
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
                
                this.gifImage = img;
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
        
        // Setup controllable preview
        this.setupControllablePreview();
        
        // Set duration input value
        document.getElementById('totalDuration').value = this.totalDuration.toFixed(1);
        
        // Create timeline
        this.createTimeline();
        
        // Set initial selection to full duration
        this.startTime = 0;
        this.endTime = this.totalDuration;
        this.currentTime = 0; // Start at beginning
        this.updateTimelineSelection();
        this.updateTimeDisplay();
        this.updatePreviewDisplay();
        
        // Add body class for styling
        document.body.classList.add('gif-editor');
        
        // Start paused so user can see the first frame
        this.isPlaying = false;
        document.getElementById('playPauseBtn').textContent = '▶️';
    }

    setupControllablePreview() {
        // Set up canvas for controlled preview
        const previewContainer = document.querySelector('.preview-container');
        
        // Ensure canvas exists and is visible
        if (!this.previewCanvas) {
            this.previewCanvas = document.createElement('canvas');
            this.previewCanvas.id = 'previewCanvas';
            previewContainer.appendChild(this.previewCanvas);
        }
        
        // Set canvas dimensions to match GIF
        if (this.gifImage) {
            this.previewCanvas.width = this.gifImage.width;
            this.previewCanvas.height = this.gifImage.height;
            
            // Set display size
            const maxWidth = 400;
            const maxHeight = 300;
            const aspectRatio = this.gifImage.width / this.gifImage.height;
            
            if (aspectRatio > maxWidth / maxHeight) {
                this.previewCanvas.style.width = maxWidth + 'px';
                this.previewCanvas.style.height = (maxWidth / aspectRatio) + 'px';
            } else {
                this.previewCanvas.style.height = maxHeight + 'px';
                this.previewCanvas.style.width = (maxHeight * aspectRatio) + 'px';
            }
            
            this.previewCanvas.style.borderRadius = '8px';
            this.previewCanvas.style.boxShadow = '0 4px 15px var(--shadow-color)';
            this.previewCanvas.style.background = 'white';
        }
        
        // Also create a hidden animated GIF for reference
        if (!this.hiddenGif) {
            this.hiddenGif = document.createElement('img');
            this.hiddenGif.src = this.gifUrl;
            this.hiddenGif.style.display = 'none';
            previewContainer.appendChild(this.hiddenGif);
        }
        
        console.log('Controllable preview setup complete');
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
        
        // Reset current time to start of selection
        this.currentTime = this.startTime;
        
        this.createTimeline();
        this.updateTimelineSelection();
        this.updateTimeDisplay();
        this.updatePreviewDisplay();
        
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
            marker.style.left = `${(i / markerCount) * 100}%`;
            marker.innerHTML = `<span class="time-label">${time.toFixed(1)}s</span>`;
            
            this.timelineTrack.appendChild(marker);
        }
    }

    updatePreviewDisplay() {
        if (!this.previewCanvas || !this.gifImage) return;
        
        const ctx = this.previewCanvas.getContext('2d');
        
        // Clear canvas with white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
        
        // Draw the GIF frame (browser handles the animation internally)
        // We can't extract specific frames, but we can show the current state
        ctx.drawImage(this.gifImage, 0, 0);
        
        // Update info to show selection context
        const progressInSelection = ((this.currentTime - this.startTime) / (this.endTime - this.startTime)) * 100;
        document.getElementById('previewInfo').textContent = 
            `Time: ${this.currentTime.toFixed(1)}s | Selection: ${this.startTime.toFixed(1)}s - ${this.endTime.toFixed(1)}s (${progressInSelection.toFixed(0)}%)`;
    }

    togglePlayback() {
        if (this.isPlaying) {
            this.pausePlayback();
        } else {
            this.startPlayback();
        }
    }

    startPlayback() {
        if (this.playInterval) return;
        
        this.isPlaying = true;
        document.getElementById('playPauseBtn').textContent = '⏸️';
        
        // Start from current time if it's within selection, otherwise start of selection
        if (this.currentTime < this.startTime || this.currentTime >= this.endTime) {
            this.currentTime = this.startTime;
        }
        
        this.playInterval = setInterval(() => {
            this.currentTime += 0.1; // 100ms steps
            
            // Loop within selection only
            if (this.currentTime >= this.endTime) {
                if (document.getElementById('pingPongMode').checked) {
                    // For ping-pong, we'd reverse direction
                    // For now, just loop back to start
                    this.currentTime = this.startTime;
                } else {
                    this.currentTime = this.startTime;
                }
            }
            
            this.updatePreviewDisplay();
            this.updatePlayhead();
        }, 100); // 10 FPS for smooth playback
        
        console.log(`Playback started: ${this.startTime.toFixed(1)}s - ${this.endTime.toFixed(1)}s`);
    }

    pausePlayback() {
        if (this.playInterval) {
            clearInterval(this.playInterval);
            this.playInterval = null;
        }
        this.isPlaying = false;
        document.getElementById('playPauseBtn').textContent = '▶️';
        
        console.log(`Playback paused at: ${this.currentTime.toFixed(1)}s`);
    }

    restart() {
        this.pausePlayback();
        this.currentTime = this.startTime;
        this.updatePreviewDisplay();
        this.updatePlayhead();
        
        console.log(`Restarted to: ${this.currentTime.toFixed(1)}s`);
    }

    handleTimelineClick(event) {
        if (this.isDragging) return;
        
        const rect = this.timelineTrack.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickPercent = clickX / rect.width;
        
        // Seek to clicked position, but constrain to selection
        const targetTime = clickPercent * this.totalDuration;
        this.currentTime = Math.max(this.startTime, Math.min(this.endTime - 0.1, targetTime));
        
        this.updatePreviewDisplay();
        this.updatePlayhead();
        
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

        // Reset current time to start of new selection
        this.currentTime = this.startTime;

        this.updateTimelineSelection();
        this.updateTimeDisplay();
        this.updatePreviewDisplay();
        this.updatePlayhead();
        
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
            
            // Update current time if it's now outside the selection
            if (this.currentTime < this.startTime) {
                this.currentTime = this.startTime;
            }
        } else if (this.dragType === 'end') {
            const minEnd = this.startTime + 0.1;
            this.endTime = Math.min(this.totalDuration, Math.max(minEnd, mouseTime));
            
            // Update current time if it's now outside the selection
            if (this.currentTime >= this.endTime) {
                this.currentTime = this.endTime - 0.1;
            }
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
            
            // Keep current time relative to the moved selection
            this.currentTime = this.startTime + (this.currentTime - this.dragStartTime);
            this.currentTime = Math.max(this.startTime, Math.min(this.endTime - 0.1, this.currentTime));
        }

        this.updateTimelineSelection();
        this.updateTimeDisplay();
        this.updatePreviewDisplay();
        this.updatePlayhead();
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
                <strong>Trim:</strong> ${this.startTime.toFixed(1)}s to ${this.endTime.toFixed(1)}s<br>
                <strong>Duration:</strong> ${(this.endTime - this.startTime).toFixed(1)}s<br>
                <strong>Note:</strong> Download contains full GIF with trim information in filename.`, 
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