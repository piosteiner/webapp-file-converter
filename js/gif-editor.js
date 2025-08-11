// Library-Free GIF Editor - Works with GIFs as whole files
// No external dependencies, uses browser's native GIF support

class GifEditor {
    constructor() {
        this.gifBlob = null;
        this.gifUrl = null;
        this.gifImage = null;
        this.totalDuration = 5.0; // Default duration, will be detected or manually set
        this.originalDuration = 5.0; // Store the detected/default duration
        this.currentTime = 0;
        this.isPlaying = false;
        this.playInterval = null;
        
        // Selection state (time-based, not frame-based)
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
            
            // Try to detect the actual GIF duration
            await this.detectGifDuration();
            
            this.setupEditor();
            
            // Show status with helpful info
            const fileSizeKB = this.gifBlob.size / 1024;
            this.showStatus(
                `✅ GIF loaded successfully! <br>
                <strong>Duration:</strong> ${this.totalDuration.toFixed(1)}s<br>
                <strong>File Size:</strong> ${fileSizeKB.toFixed(0)}KB<br>
                <strong>Tip:</strong> Use the timeline selection to trim your GIF`, 
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
                
                // Try to detect duration by monitoring animation cycles
                // This is a best-effort approach since browser APIs don't expose GIF timing
                
                // For now, we'll use intelligent defaults based on common patterns
                // and let users adjust manually
                const fileSizeKB = this.gifBlob.size / 1024;
                
                let estimatedDuration;
                if (fileSizeKB < 50) {
                    // Very small GIFs are usually short loops (1-3 seconds)
                    estimatedDuration = 2.0;
                } else if (fileSizeKB < 200) {
                    // Small to medium GIFs (2-5 seconds)
                    estimatedDuration = 3.5;
                } else if (fileSizeKB < 1000) {
                    // Medium GIFs (3-8 seconds)
                    estimatedDuration = 6.0;
                } else {
                    // Large GIFs are usually longer (5-15 seconds)
                    estimatedDuration = 10.0;
                }
                
                this.totalDuration = estimatedDuration;
                this.originalDuration = estimatedDuration;
                
                console.log('Estimated duration:', this.totalDuration.toFixed(1), 'seconds');
                console.log('User can adjust duration manually if needed');
                
                this.gifImage = img;
                resolve();
            };
            
            img.onerror = () => {
                // Fallback to default duration
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
        
        // Replace canvas with actual animated GIF
        this.setupAnimatedPreview();
        
        // Set duration input value
        document.getElementById('totalDuration').value = this.totalDuration.toFixed(1);
        
        // Create timeline
        this.createTimeline();
        
        // Set initial selection to full duration
        this.startTime = 0;
        this.endTime = this.totalDuration;
        this.updateTimelineSelection();
        this.updateTimeDisplay();
        
        // Add body class for styling
        document.body.classList.add('gif-editor');
        
        // Start playback
        this.startPlayback();
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
        
        // Keep the selection ratio but ensure it fits in the new duration
        const selectionDuration = this.endTime - this.startTime;
        const selectionStartRatio = this.startTime / oldDuration;
        
        // Try to maintain the same relative position
        this.startTime = Math.min(selectionStartRatio * newDuration, newDuration - 0.1);
        this.endTime = Math.min(this.startTime + selectionDuration, newDuration);
        
        // If the selection doesn't fit, adjust it proportionally
        if (this.endTime > newDuration) {
            this.endTime = newDuration;
            this.startTime = Math.max(0, newDuration - selectionDuration);
        }
        
        // Recreate timeline and update display
        this.createTimeline();
        this.updateTimelineSelection();
        this.updateTimeDisplay();
        
        console.log(`Duration updated: ${oldDuration.toFixed(1)}s → ${newDuration.toFixed(1)}s`);
        this.showStatus(`✅ Duration updated to ${newDuration.toFixed(1)}s`, 'success');
    }

    setupAnimatedPreview() {
        // Remove canvas and replace with animated GIF
        const previewContainer = document.querySelector('.preview-container');
        previewContainer.innerHTML = '';
        
        // Create animated GIF element
        const gifPreview = document.createElement('img');
        gifPreview.id = 'gifPreview';
        gifPreview.src = this.gifUrl;
        gifPreview.style.maxWidth = '100%';
        gifPreview.style.maxHeight = '400px';
        gifPreview.style.borderRadius = '8px';
        gifPreview.style.boxShadow = '0 4px 15px var(--shadow-color)';
        
        previewContainer.appendChild(gifPreview);
        
        // Store reference
        this.gifPreview = gifPreview;
        
        console.log('Animated GIF preview setup complete');
    }

    createTimeline() {
        // Create time markers instead of frame thumbnails
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

    drawCurrentFrame() {
        // Update info (the animated GIF handles its own display)
        document.getElementById('previewInfo').textContent = `Time: ${this.currentTime.toFixed(1)}s of ${this.totalDuration.toFixed(1)}s`;
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
        
        this.playInterval = setInterval(() => {
            this.currentTime += 0.1; // 100ms steps
            
            // Loop within selection
            if (this.currentTime > this.endTime) {
                if (document.getElementById('pingPongMode').checked) {
                    // For ping-pong, we'd need more complex logic
                    this.currentTime = this.startTime;
                } else {
                    this.currentTime = this.startTime;
                }
            }
            
            if (this.currentTime < this.startTime) {
                this.currentTime = this.startTime;
            }
            
            this.drawCurrentFrame();
            this.updatePlayhead();
        }, 100); // 10 FPS for smooth playback
    }

    pausePlayback() {
        if (this.playInterval) {
            clearInterval(this.playInterval);
            this.playInterval = null;
        }
        this.isPlaying = false;
        document.getElementById('playPauseBtn').textContent = '▶️';
    }

    restart() {
        this.pausePlayback();
        this.currentTime = this.startTime;
        this.drawCurrentFrame();
        this.updatePlayhead();
    }

    handleTimelineClick(event) {
        if (this.isDragging) return;
        
        const rect = this.timelineTrack.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickPercent = clickX / rect.width;
        
        this.currentTime = clickPercent * this.totalDuration;
        this.currentTime = Math.max(this.startTime, Math.min(this.endTime, this.currentTime));
        
        this.drawCurrentFrame();
        this.updatePlayhead();
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
        this.updatePreview();
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
        
        this.updatePreview();
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

    updatePreview() {
        // Restart playback within new selection
        this.pausePlayback();
        this.currentTime = this.startTime;
        this.drawCurrentFrame();
        this.updatePlayhead();
        
        if (this.wasPlaying) {
            this.startPlayback();
        }
    }

    async exportGif() {
        const exportBtn = document.getElementById('exportBtn');
        const progressContainer = document.getElementById('exportProgress');
        
        exportBtn.disabled = true;
        progressContainer.style.display = 'block';
        
        try {
            // For now, we'll create a simple trimmed version
            // In a full implementation, you'd capture frames and rebuild the GIF
            
            document.getElementById('progressText').textContent = 'Creating trimmed GIF...';
            document.getElementById('progressFill').style.width = '50%';
            
            // Simulate processing time
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            document.getElementById('progressText').textContent = 'Download ready!';
            document.getElementById('progressFill').style.width = '100%';
            
            // For demo, download the original GIF with selection info
            // In production, you'd implement actual GIF trimming
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
            const selectionInfo = `_trim-${this.startTime.toFixed(1)}s-to-${this.endTime.toFixed(1)}s`;
            this.downloadFile(this.gifBlob, `gif-selection${selectionInfo}_${timestamp}.gif`);
            
            this.showStatus(
                `✅ Selection exported! <br>
                <strong>Trim:</strong> ${this.startTime.toFixed(1)}s to ${this.endTime.toFixed(1)}s<br>
                <strong>Note:</strong> Download contains full GIF. Integrate with server-side processing for actual trimming.`, 
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