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
        this.SERVER_URL = (window.SERVER_URL || 'https://api.piogino.ch');

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
        // Button wiring (editor section)
        document.getElementById('openEditorBtn')?.addEventListener('click', () => {
            this.editorContainer?.classList.remove('hidden');
            this.editorContainer?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });

        // Replace file
        document.getElementById('replaceGifBtn')?.addEventListener('click', () => {
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
        document.getElementById('restartBtn').addEventListener('click', () => this.seekTo(this.startTime));
        document.getElementById('loopBtn').addEventListener('click', () => this.toggleLoop());

        // Timeline handles & area
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
        this.previewVideo.addEventListener('timeupdate', () => this.updateTimelineDisplay());

        // Global mouse events for dragging
        document.addEventListener('mousemove', (e) => this.handleDrag(e));
        document.addEventListener('mouseup', () => this.endDrag());

        console.log('Editor initialized.');
    }

    showEditorStatus(message, type = 'info') {
        const el = document.getElementById('editorStatus');
        if (!el) return;
        el.textContent = message;
        el.className = `status ${type}`;
    }

    async loadGifForEditing(file) {
        if (!file) return;

        // Reset state
        this.originalGifBlob = file;
        this.previewVideoUrl && URL.revokeObjectURL(this.previewVideoUrl);
        this.previewVideoUrl = null;
        this.previewVideo.src = '';
        this.videoDuration = 0;
        this.startTime = 0;
        this.endTime = 0;

        // Upload GIF -> server converts to WebM for preview
        try {
            this.isProcessing = true;
            this.showEditorStatus('⏳ Uploading GIF for preview...', 'info');

            const formData = new FormData();
            formData.append('file', file, file.name);

            const uploadResponse = await fetch(`${this.SERVER_URL}/convert/gif-to-webm`, {
                method: 'POST',
                body: formData
            });

            if (!uploadResponse.ok) {
                throw new Error(`Upload failed: ${uploadResponse.status}`);
            }

            this.showEditorStatus('✅ Uploaded. Preparing preview...', 'success');

            // Server returns a temporary WebM; stream it
            const webmBlob = await uploadResponse.blob();
            this.previewVideoUrl = URL.createObjectURL(webmBlob);
            this.previewVideo.src = this.previewVideoUrl;
            this.previewVideo.load();

            document.getElementById('loadedFilename').textContent = file.name;
        } catch (err) {
            console.error(err);
            this.showEditorStatus('❌ Failed to upload/prepare preview.', 'error');
        } finally {
            this.isProcessing = false;
        }
    }

    async downloadProcessed(url) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Download failed: ${res.status}`);
        return await res.blob();
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
        this.updateTimelineDisplay();
        this.updateDurationPill();
        
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

    handleTimelineClick(event) {
        if (this.videoDuration === 0) return;
        
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
        this.updateTimelineDisplay();
        this.updateDurationPill();
        
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
            
            // Clamp
            if (newStart < 0) newStart = 0;
            if (newStart + duration > this.videoDuration) {
                newStart = this.videoDuration - duration;
            }
            
            this.startTime = newStart;
            this.endTime = newStart + duration;
        }

        this.updateTimelineSelection();
        this.updateTimeDisplay();
        this.updateTimelineDisplay();
        this.updateDurationPill();
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

    updateDurationPill() {
        const pill = document.getElementById('durationPill');
        if (!pill) return;
        const totalSec = this.videoDuration || 0;
        const sel = Math.max(0, (this.endTime || 0) - (this.startTime || 0));
        const pct = totalSec > 0 ? Math.round((sel / totalSec) * 100) : 0;
        pill.textContent = `🎯 ${sel.toFixed(1)}s | IN SELECTION (${pct}%)`;
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
            // Ask server to trim the original GIF with current start/end
            this.showEditorStatus('✂️ Trimming on server...', 'info');

            const form = new FormData();
            form.append('file', this.originalGifBlob, this.originalGifBlob.name);
            form.append('start', String(this.startTime));
            form.append('end', String(this.endTime));

            const res = await fetch(`${this.SERVER_URL}/edit/trim-gif`, {
                method: 'POST',
                body: form
            });

            if (!res.ok) throw new Error(`Server error: ${res.status}`);

            const outBlob = await res.blob();
            const outUrl = URL.createObjectURL(outBlob);

            // Trigger download
            const a = document.createElement('a');
            a.href = outUrl;
            a.download = this.makeOutputName(this.originalGifBlob.name, '_trimmed');
            document.body.appendChild(a);
            a.click();
            a.remove();

            URL.revokeObjectURL(outUrl);

            this.showEditorStatus('✅ Trimmed GIF downloaded.', 'success');
        } catch (err) {
            console.error(err);
            this.showEditorStatus('❌ Export failed.', 'error');
        } finally {
            this.isProcessing = false;
            exportBtn.disabled = false;
            progressContainer.style.display = 'none';
        }
    }

    makeOutputName(name, suffix) {
        const dot = name.lastIndexOf('.');
        if (dot <= 0) return name + suffix + '.gif';
        return name.slice(0, dot) + suffix + name.slice(dot);
    }

    togglePlayback() {
        if (this.previewVideo.paused) {
            this.previewVideo.play();
            document.getElementById('playPauseBtn').textContent = 'Pause';
        } else {
            this.previewVideo.pause();
            document.getElementById('playPauseBtn').textContent = 'Play';
        }
    }

    seekTo(t) {
        if (this.videoDuration === 0) return;
        this.previewVideo.currentTime = Math.max(0, Math.min(this.videoDuration, t));
    }

    toggleLoop() {
        const btn = document.getElementById('loopBtn');
        const looping = btn.classList.toggle('active');
        this.previewVideo.loop = looping;
        btn.textContent = looping ? 'Loop: ON' : 'Loop: OFF';
    }

    setupEditorDragDrop() {
        if (!this.editorDropZone) return;
        
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
            if (!this.isProcessing && e.dataTransfer?.files?.length) {
                const file = e.dataTransfer.files[0];
                if (file && /gif$/i.test(file.name)) this.loadGifForEditing(file);
            }
        });
    }
}

// Boot
window.addEventListener('DOMContentLoaded', () => {
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
