// Integrated GIF Editor for gif-converter.html
// Provides video-based editing with WebM preview and GIF export

class IntegratedGifEditor {
    constructor() {
        this.originalGifBlob = null;
        this.previewVideoUrl = null;
        this.videoDuration = 0;
        this.startTime = 0;
        this.endTime = 0;
        this.isProcessing = false;
        
        // Selection dragging state
        this.isDragging = false;
        this.dragType = null;
        this.dragStartX = 0;
        this.dragStartTime = 0;
        
        // Server URL (same as main converter)
        this.SERVER_URL = 'https://api.piogino.ch';
        
        // UI elements
        this.editorDropZone = document.getElementById('editorDropZone');
        this.editorFileInput = document.getElementById('editorFileInput');
        this.editorContainer = document.getElementById('editorContainer');
        this.previewVideo = document.getElementById('previewVideo');
        this.timelineTrack = document.getElementById('timelineTrack');
        this.selectionArea = document.getElementById('selectionArea');
        this.startHandle = document.getElementById('startHandle');
        this.endHandle = document.getElementById('endHandle');
        this.playhead = document.getElementById('playhead');
        
        this.initializeEditor();
    }

    initializeEditor() {
        // File upload for editor
        this.editorDropZone.addEventListener('click', () => {
            if (!this.isProcessing) this.editorFileInput.click();
        });
        
        this.editorFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.loadGifForEditing(e.target.files[0]);
            }
        });

        // Drag and drop for editor
        this.setupEditorDragDrop();

        // Video controls
        document.getElementById('playPauseBtn').addEventListener('click', () => this.togglePlayback());
        document.getElementById('restartBtn').addEventListener('click', () => this.restart());

        // Timeline controls
        this.startHandle.addEventListener('mousedown', (e) => this.startDrag(e, 'start'));
        this.endHandle.addEventListener('mousedown', (e) => this.startDrag(e, 'end'));
        this.selectionArea.addEventListener('mousedown', (e) => this.startDrag(e, 'area'));
        this.timelineTrack.addEventListener('click', (e) => this.handleTimelineClick(e));

        // Preset buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.setPreset(e.target.dataset.duration));
        });

        // Export button
        document.getElementById('exportTrimmedBtn').addEventListener('click', () => this.exportTrimmedGif());

        // Video event listeners
        this.previewVideo.addEventListener('loadedmetadata', () => this.onVideoLoaded());
        this.previewVideo.addEventListener('timeupdate', () => this.updatePlayhead());

        // Global mouse events for dragging
        document.addEventListener('mousemove', (e) => this.handleDrag(e));
        document.addEventListener('mouseup', () => this.endDrag());

        console.log('Integrated GIF Editor initialized');
    }

    setupEditorDragDrop() {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.editorDropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        this.editorDropZone.addEventListener('dragover', () => {
            if (!this.isProcessing) this.editorDropZone.classList.add('dragover');
        });

        this.editorDropZone.addEventListener('dragleave', () => {
            this.editorDropZone.classList.remove('dragover');
        });

        this.editorDropZone.addEventListener('drop', (e) => {
            this.editorDropZone.classList.remove('dragover');
            if (!this.isProcessing) {
                const files = Array.from(e.dataTransfer.files);
                const gifFile = files.find(f => f.type.includes('gif'));
                if (gifFile) {
                    this.loadGifForEditing(gifFile);
                }
            }
        });
    }

    async loadGifForEditing(file) {
        if (this.isProcessing) {
            this.showEditorStatus('❌ Please wait for current processing to complete.', 'error');
            return;
        }

        if (!file.type.includes('gif')) {
            this.showEditorStatus('❌ Please select a GIF file for editing.', 'error');
            return;
        }

        this.isProcessing = true;
        this.editorDropZone.classList.add('processing');
        
        try {
            this.originalGifBlob = file;
            
            this.showEditorStatus('📡 Converting GIF to video for editing...', 'processing');
            
            // Convert GIF to WebM for video preview
            const webmBlob = await this.convertGifToWebmForPreview(file);
            
            // Create video URL and load
            if (this.previewVideoUrl) {
                URL.revokeObjectURL(this.previewVideoUrl);
            }
            this.previewVideoUrl = URL.createObjectURL(webmBlob);
            this.previewVideo.src = this.previewVideoUrl;
            
            // Show editor interface
            this.editorContainer.style.display = 'block';
            
            this.showEditorStatus(
                `✅ GIF loaded for editing! <br>
                <strong>File:</strong> ${file.name}<br>
                <strong>Size:</strong> ${(file.size / 1024).toFixed(0)}KB<br>
                <strong>Tip:</strong> Use video controls to find perfect trim points`, 
                'success'
            );
            
        } catch (error) {
            console.error('Error loading GIF for editing:', error);
            this.showEditorStatus(`❌ Failed to load GIF: ${error.message}`, 'error');
            this.editorContainer.style.display = 'none';
        } finally {
            this.isProcessing = false;
            this.editorDropZone.classList.remove('processing');
            this.editorFileInput.value = '';
        }
    }

    async convertGifToWebmForPreview(gifFile) {
        const formData = new FormData();
        formData.append('file', gifFile);
        formData.append('max_size', '2048'); // Higher quality for editing preview
        formData.append('mode', 'preview'); // Special mode for editing
        formData.append('crf', '25'); // High quality

        const response = await fetch(`${this.SERVER_URL}/api/convert`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Conversion failed: HTTP ${response.status}`);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Conversion failed');
        }

        // Download the converted WebM
        const downloadResponse = await fetch(`${this.SERVER_URL}/api/download/${result.download_id}`);
        if (!downloadResponse.ok) {
            throw new Error('Failed to download preview video');
        }

        return await downloadResponse.blob();
    }

    onVideoLoaded() {
        this.videoDuration = this.previewVideo.duration;
        document.getElementById('videoDuration').textContent = `${this.videoDuration.toFixed(1)}s`;
        
        // Set initial selection to full video
        this.startTime = 0;
        this.endTime = this.videoDuration;
        
        // Create timeline and update display
        this.createTimeline();
        this.updateTimelineSelection();
        this.updateTimeDisplay();
        
        console.log(`Video loaded: ${this.videoDuration.toFixed(1)}s duration`);
    }

    createTimeline() {
        this.timelineTrack.innerHTML = '';
        
        const markerCount = Math.min(20, Math.max(5, Math.floor(this.videoDuration)));
        
        for (let i = 0; i <= markerCount; i++) {
            const time = (i / markerCount) * this.videoDuration;
            const marker = document.createElement('div');
            marker.className = 'time-marker';
            if (i === 0 || i === markerCount) marker.classList.add('major-marker');
            marker.style.left = `${(i / markerCount) * 100}%`;
            marker.innerHTML = `<span class="time-label">${time.toFixed(1)}s</span>`;
            
            this.timelineTrack.appendChild(marker);
        }
    }

    togglePlayback() {
        if (this.previewVideo.paused) {
            this.previewVideo.play();
            document.getElementById('playPauseBtn').textContent = '⏸️';
        } else {
            this.previewVideo.pause();
            document.getElementById('playPauseBtn').textContent = '▶️';
        }
    }

    restart() {
        this.previewVideo.currentTime = this.startTime;
        this.previewVideo.pause();
        document.getElementById('playPauseBtn').textContent = '▶️';
    }

    handleTimelineClick(event) {
        if (this.isDragging || this.videoDuration === 0) return;
        
        const rect = this.timelineTrack.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickPercent = clickX / rect.width;
        
        // Seek to clicked position
        const targetTime = clickPercent * this.videoDuration;
        this.previewVideo.currentTime = Math.max(this.startTime, Math.min(this.endTime, targetTime));
    }

    setPreset(duration) {
        if (this.videoDuration === 0) return;

        // Update button states
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.duration === duration);
        });

        if (duration === 'full') {
            this.startTime = 0;
            this.endTime = this.videoDuration;
        } else {
            const durationNum = parseFloat(duration);
            const maxStart = Math.max(0, this.videoDuration - durationNum);
            
            // Center the selection if possible
            let start = Math.max(0, (this.videoDuration - durationNum) / 2);
            if (start > maxStart) start = maxStart;
            
            this.startTime = start;
            this.endTime = Math.min(start + durationNum, this.videoDuration);
        }

        this.updateTimelineSelection();
        this.updateTimeDisplay();
        
        // Seek to start of selection
        this.previewVideo.currentTime = this.startTime;
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
        if (!this.isDragging || this.videoDuration === 0) return;

        const rect = this.timelineTrack.getBoundingClientRect();
        const trackWidth = rect.width;
        const mouseX = event.clientX - rect.left;
        const mousePercent = Math.max(0, Math.min(1, mouseX / trackWidth));
        const mouseTime = mousePercent * this.videoDuration;

        if (this.dragType === 'start') {
            const maxStart = this.endTime - 0.1;
            this.startTime = Math.max(0, Math.min(maxStart, mouseTime));
        } else if (this.dragType === 'end') {
            const minEnd = this.startTime + 0.1;
            this.endTime = Math.min(this.videoDuration, Math.max(minEnd, mouseTime));
        } else if (this.dragType === 'area') {
            const duration = this.endTime - this.startTime;
            const deltaX = event.clientX - this.dragStartX;
            const deltaTime = (deltaX / trackWidth) * this.videoDuration;
            
            let newStart = this.dragStartTime + deltaTime;
            
            if (newStart < 0) newStart = 0;
            if (newStart + duration > this.videoDuration) {
                newStart = this.videoDuration - duration;
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
    }

    updateTimelineSelection() {
        if (this.videoDuration === 0) return;
        
        const startPercent = (this.startTime / this.videoDuration) * 100;
        const endPercent = (this.endTime / this.videoDuration) * 100;
        
        this.selectionArea.style.left = `${startPercent}%`;
        this.selectionArea.style.width = `${endPercent - startPercent}%`;
    }

    updatePlayhead() {
        if (this.videoDuration === 0) return;
        
        const currentTime = this.previewVideo.currentTime;
        const percent = (currentTime / this.videoDuration) * 100;
        this.playhead.style.left = `${percent}%`;
        
        // Update info
        const isInSelection = currentTime >= this.startTime && currentTime <= this.endTime;
        const progressInSelection = isInSelection ? 
            ((currentTime - this.startTime) / (this.endTime - this.startTime)) * 100 : 0;
        
        const statusIcon = isInSelection ? '🎯' : '⏱️';
        const statusText = isInSelection ? 
            `IN SELECTION (${progressInSelection.toFixed(0)}%)` : 
            'Outside selection';
        
        document.getElementById('previewInfo').textContent = 
            `${statusIcon} ${currentTime.toFixed(1)}s | ${statusText}`;
    }

    updateTimeDisplay() {
        document.getElementById('startTime').textContent = `${this.startTime.toFixed(1)}s`;
        document.getElementById('endTime').textContent = `${this.endTime.toFixed(1)}s`;
        document.getElementById('trimDuration').textContent = `${(this.endTime - this.startTime).toFixed(1)}s`;
    }

    async exportTrimmedGif() {
        if (!this.originalGifBlob) {
            this.showEditorStatus('❌ No GIF loaded for export.', 'error');
            return;
        }

        if (this.isProcessing) {
            this.showEditorStatus('❌ Please wait for current processing to complete.', 'error');
            return;
        }

        const exportBtn = document.getElementById('exportTrimmedBtn');
        const progressContainer = document.getElementById('exportProgress');
        
        exportBtn.disabled = true;
        progressContainer.style.display = 'block';
        this.isProcessing = true;
        
        try {
            document.getElementById('progressText').textContent = 'Trimming GIF on server...';
            document.getElementById('progressFill').style.width = '30%';
            
            // Send trim request to server
            const formData = new FormData();
            formData.append('file', this.originalGifBlob);
            formData.append('start_time', this.startTime.toString());
            formData.append('end_time', this.endTime.toString());
            formData.append('ping_pong', document.getElementById('pingPongMode').checked.toString());
            
            const response = await fetch(`${this.SERVER_URL}/api/trim-gif`, {
                method: 'POST',
                body: formData
            });

            document.getElementById('progressFill').style.width = '70%';
            
            if (!response.ok) {
                throw new Error(`Trim failed: HTTP ${response.status}`);
            }

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Trim failed');
            }

            document.getElementById('progressText').textContent = 'Downloading trimmed GIF...';
            document.getElementById('progressFill').style.width = '90%';

            // Download the trimmed GIF
            const downloadResponse = await fetch(`${this.SERVER_URL}/api/download/${result.download_id}`);
            if (!downloadResponse.ok) {
                throw new Error('Download failed');
            }

            const blob = await downloadResponse.blob();
            
            document.getElementById('progressFill').style.width = '100%';
            document.getElementById('progressText').textContent = 'Download complete!';
            
            // Create download
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
            const filename = `trimmed-gif_${this.startTime.toFixed(1)}s-to-${this.endTime.toFixed(1)}s_${timestamp}.gif`;
            this.downloadFile(blob, filename);
            
            this.showEditorStatus(
                `✅ GIF trimmed and exported! <br>
                <strong>Trimmed:</strong> ${this.startTime.toFixed(1)}s to ${this.endTime.toFixed(1)}s<br>
                <strong>Duration:</strong> ${(this.endTime - this.startTime).toFixed(1)}s<br>
                <strong>Tip:</strong> Now you can convert this to WebM using the converter above!`, 
                'success'
            );
            
        } catch (error) {
            console.error('Export error:', error);
            this.showEditorStatus(`❌ Export failed: ${error.message}`, 'error');
        } finally {
            exportBtn.disabled = false;
            progressContainer.style.display = 'none';
            this.isProcessing = false;
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

    showEditorStatus(message, type) {
        const statusContainer = document.getElementById('editorStatus');
        
        // Create new message element
        const messageElement = document.createElement('div');
        messageElement.className = `status-message show ${type}`;
        messageElement.innerHTML = message;
        
        // Clear previous messages and add new one
        statusContainer.innerHTML = '';
        statusContainer.appendChild(messageElement);
        
        // Auto-hide non-processing messages
        if (type !== 'processing') {
            setTimeout(() => {
                if (statusContainer.contains(messageElement)) {
                    messageElement.remove();
                }
            }, 7000);
        }
    }
}

// Initialize the integrated GIF editor when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit to ensure the main converter is initialized first
    setTimeout(() => {
        new IntegratedGifEditor();
    }, 100);
});

// Prevent default drag behaviors (but don't interfere with main converter)
['dragenter', 'dragover'].forEach(eventName => {
    document.addEventListener(eventName, (e) => {
        // Only prevent default if it's over the editor drop zone
        if (e.target.closest('#editorDropZone')) {
            e.preventDefault();
            e.stopPropagation();
        }
    });
});