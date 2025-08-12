// Integrated GIF Editor for gif-converter.html
// Provides video-based editing with WebM preview and server-side GIF trimming
// Consolidated version with all fixes applied

class IntegratedGifEditor {
    constructor() {
        this.originalGifBlob = null;
        this.previewVideoUrl = null;
        this.videoDuration = 0;
        this.startTime = 0;
        this.endTime = 0;
        this.isProcessing = false;
        this.currentTime = 0;
        
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
            if (!this.isProcessing) this.editorFileInput?.click();
        });
        
        this.editorFileInput?.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.loadGifForEditing(e.target.files[0]);
            }
        });

        // Drag and drop for editor + click to open file dialog
        this.setupEditorDragDrop();
        this.editorDropZone?.addEventListener('click', () => {
            if (!this.isProcessing) {
                this.editorFileInput?.click();
            }
        });

        // Video controls
        document.getElementById('playPauseBtn')?.addEventListener('click', () => this.togglePlayback());
        document.getElementById('restartBtn')?.addEventListener('click', () => this.restart());
        document.getElementById('loopBtn')?.addEventListener('click', () => this.toggleLoop());

        // Timeline handles & area
        this.startHandle?.addEventListener('mousedown', (e) => this.startDrag(e, 'start'));
        this.endHandle?.addEventListener('mousedown', (e) => this.startDrag(e, 'end'));
        this.selectionArea?.addEventListener('mousedown', (e) => this.startDrag(e, 'area'));
        this.timelineTrack?.addEventListener('click', (e) => this.handleTimelineClick(e));

        // Preset buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.setPreset(e.target.dataset.duration));
        });

        // Export button
        document.getElementById('exportTrimmedBtn')?.addEventListener('click', () => this.exportTrimmedGif());

        // Video event listeners - Using arrow functions to preserve 'this' context
        if (this.previewVideo) {
            this.previewVideo.addEventListener('loadedmetadata', () => this.onVideoLoaded());
            this.previewVideo.addEventListener('timeupdate', () => this.updatePlayhead());
            this.previewVideo.addEventListener('play', () => this.onVideoPlay());
            this.previewVideo.addEventListener('pause', () => this.onVideoPause());
            this.previewVideo.addEventListener('ended', () => this.onVideoEnded());
        }

        // Global mouse events for dragging
        document.addEventListener('mousemove', (e) => this.handleDrag(e));
        document.addEventListener('mouseup', () => this.endDrag());

        console.log('GIF Editor initialized.');
    }

    showEditorStatus(message, type = 'info') {
        const el = document.getElementById('editorStatus');
        if (!el) return;
        el.textContent = message;
        el.className = `status ${type}`;
        
        // Auto-hide success/error messages after 5 seconds
        if (type === 'success' || type === 'error') {
            setTimeout(() => {
                if (el.textContent === message) {
                    el.textContent = '';
                    el.className = 'status';
                }
            }, 5000);
        }
    }

    async loadGifForEditing(file) {
        if (!file) return;

        // Validate file type
        if (!file.type.includes('gif') && !file.name.toLowerCase().endsWith('.gif')) {
            this.showEditorStatus('❌ Please select a GIF file.', 'error');
            return;
        }

        // File size check
        const maxSize = 100 * 1024 * 1024; // 100MB
        if (file.size > maxSize) {
            this.showEditorStatus(`❌ File too large. Maximum size: ${maxSize / (1024*1024)}MB`, 'error');
            return;
        }

        // IMMEDIATELY add processing state for visual feedback
        console.log('Starting GIF upload process...');
        this.isProcessing = true;
        
        if (this.editorDropZone) {
            this.editorDropZone.classList.add('processing');
            this.editorDropZone.classList.remove('dragover', 'hover');
            console.log('Processing class added to drop zone');
            console.log('Drop zone classes:', this.editorDropZone.classList.toString());
        }

        // Reset state
        this.originalGifBlob = file;
        if (this.previewVideoUrl) {
            URL.revokeObjectURL(this.previewVideoUrl);
        }
        this.previewVideoUrl = null;
        if (this.previewVideo) {
            this.previewVideo.src = '';
            this.previewVideo.load(); // Force reset
        }
        this.videoDuration = 0;
        this.startTime = 0;
        this.endTime = 0;
        this.currentTime = 0;

        this.showEditorStatus('⏳ Uploading GIF for preview...', 'info');

        try {
            const formData = new FormData();
            formData.append('file', file, file.name);

            const uploadResponse = await fetch(`${this.SERVER_URL}/convert/gif-to-webm`, {
                method: 'POST',
                body: formData
            });

            // DEBUG: Check the server response
            console.log('Server response status:', uploadResponse.status);
            console.log('Server response headers:', Object.fromEntries(uploadResponse.headers.entries()));

            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                console.error('Server response error:', errorText);
                throw new Error(`Server error: ${uploadResponse.status} - ${errorText}`);
            }

            this.showEditorStatus('⏳ Processing preview...', 'info');

            // Server returns a WebM blob
            const webmBlob = await uploadResponse.blob();

            // DEBUG: Check the blob
            console.log('Received blob:', webmBlob);
            console.log('Blob size:', webmBlob.size);
            console.log('Blob type:', webmBlob.type);

            // Verify we got a valid blob
            if (!webmBlob || webmBlob.size === 0) {
                throw new Error('Received empty response from server');
            }

            this.previewVideoUrl = URL.createObjectURL(webmBlob);
            console.log('Created blob URL:', this.previewVideoUrl);

            this.previewVideo.src = this.previewVideoUrl;

            // DEBUG: Check video element
            console.log('Video element:', this.previewVideo);
            console.log('Video src set to:', this.previewVideo.src);
            console.log('Video readyState:', this.previewVideo.readyState);

            // Force load the video and wait for it
            await new Promise((resolve, reject) => {
                const handleLoaded = () => {
                    this.previewVideo.removeEventListener('loadedmetadata', handleLoaded);
                    this.previewVideo.removeEventListener('error', handleError);
                    resolve();
                };
                
                const handleError = (e) => {
                    this.previewVideo.removeEventListener('loadedmetadata', handleLoaded);
                    this.previewVideo.removeEventListener('error', handleError);
                    reject(new Error(`Video load error: ${e.message}`));
                };
                
                this.previewVideo.addEventListener('loadedmetadata', handleLoaded);
                this.previewVideo.addEventListener('error', handleError);
                
                this.previewVideo.load();
                
                // Timeout after 10 seconds
                setTimeout(() => {
                    this.previewVideo.removeEventListener('loadedmetadata', handleLoaded);
                    this.previewVideo.removeEventListener('error', handleError);
                    reject(new Error('Video load timeout'));
                }, 10000);
            });

            console.log('Video loaded successfully, duration:', this.previewVideo.duration);

            // Update filename display
            const filenameEl = document.getElementById('loadedFilename');
            if (filenameEl) {
                filenameEl.textContent = file.name;
            }

            // Show the editor container now that we have a file loaded
            if (this.editorContainer) {
                console.log('About to show editor container...');
                console.log('Container classes before:', this.editorContainer.classList.toString());
                console.log('Container display before:', window.getComputedStyle(this.editorContainer).display);
                
                this.editorContainer.classList.remove('hidden');
                
                // Force display as backup
                this.editorContainer.style.display = 'block';
                
                console.log('Container classes after:', this.editorContainer.classList.toString());
                console.log('Container display after:', window.getComputedStyle(this.editorContainer).display);
                
                // Scroll to editor
                setTimeout(() => {
                    this.editorContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            } else {
                console.error('Editor container not found!');
            }

            // Show file info
            const fileSizeKB = file.size / 1024;
            this.showEditorStatus(
                `✅ Preview ready! File: ${file.name} (${fileSizeKB.toFixed(0)}KB)`, 
                'success'
            );

        } catch (err) {
            console.error('Error loading GIF:', err);
            this.showEditorStatus(`❌ Failed to load preview: ${err.message}`, 'error');

            // Clean up on error
            if (this.previewVideoUrl) {
                URL.revokeObjectURL(this.previewVideoUrl);
                this.previewVideoUrl = null;
            }
        } finally {
            this.isProcessing = false;
            // Remove processing class from drop zone
            if (this.editorDropZone) {
                this.editorDropZone.classList.remove('processing');
                console.log('Removed processing class from editor drop zone');
                console.log('Final drop zone classes:', this.editorDropZone.classList.toString());
            }
        }
    }

    onVideoLoaded() {
        // Add safety check
        if (!this.previewVideo || !this.previewVideo.duration) {
            console.error('Video not properly loaded');
            this.showEditorStatus('❌ Failed to load video metadata', 'error');
            return;
        }
        
        this.videoDuration = this.previewVideo.duration;
        
        if (!this.videoDuration || this.videoDuration === 0 || !isFinite(this.videoDuration)) {
            console.error('Video duration is 0 or invalid:', this.videoDuration);
            this.showEditorStatus('❌ Failed to load video metadata', 'error');
            return;
        }
        
        // Update duration display
        const durationEl = document.getElementById('videoDuration');
        if (durationEl) {
            durationEl.textContent = `${this.videoDuration.toFixed(1)}s`;
        }
        
        // Set initial selection to full video
        this.startTime = 0;
        this.endTime = this.videoDuration;
        this.currentTime = 0;
        
        // Create timeline and update display
        this.createTimeline();
        this.updateTimelineSelection();
        this.updateTimeDisplay();
        this.updatePlayhead();
        this.updateDurationPill();
        
        // Enable controls
        this.enableControls(true);
        
        console.log(`Video loaded successfully: ${this.videoDuration.toFixed(1)}s duration`);
    }

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
        
        // Enable preset buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.disabled = !enabled;
        });
    }

    createTimeline() {
        if (!this.timelineTrack) return;
        
        this.timelineTrack.innerHTML = '';
        
        // Calculate optimal number of markers
        const markerCount = Math.min(20, Math.max(5, Math.floor(this.videoDuration)));
        
        for (let i = 0; i <= markerCount; i++) {
            const time = (i / markerCount) * this.videoDuration;
            const marker = document.createElement('div');
            marker.className = 'time-marker';
            
            // Mark first and last as major markers
            if (i === 0 || i === markerCount) {
                marker.classList.add('major-marker');
            }
            
            marker.style.left = `${(i / markerCount) * 100}%`;
            marker.innerHTML = `<span class="time-label">${time.toFixed(1)}s</span>`;
            this.timelineTrack.appendChild(marker);
        }
    }

    handleTimelineClick(event) {
        if (this.videoDuration === 0 || this.isDragging) return;
        
        const rect = this.timelineTrack.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickPercent = Math.max(0, Math.min(1, clickX / rect.width));
        
        // Seek to clicked position (within selection bounds)
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
            
            // Don't allow preset longer than video
            if (durationNum > this.videoDuration) {
                this.startTime = 0;
                this.endTime = this.videoDuration;
            } else {
                // Center the selection if possible
                const idealStart = (this.videoDuration - durationNum) / 2;
                this.startTime = Math.max(0, idealStart);
                this.endTime = Math.min(this.startTime + durationNum, this.videoDuration);
            }
        }

        this.updateTimelineSelection();
        this.updateTimeDisplay();
        this.updatePlayhead();
        this.updateDurationPill();
        
        // Seek to start of selection
        this.previewVideo.currentTime = this.startTime;
        
        console.log(`Preset: ${duration} | Selection: ${this.startTime.toFixed(1)}s - ${this.endTime.toFixed(1)}s`);
    }

    startDrag(event, type) {
        event.preventDefault();
        event.stopPropagation();
        
        this.isDragging = true;
        this.dragType = type;
        this.dragStartX = event.clientX;
        
        if (type === 'area') {
            this.dragStartTime = this.startTime;
            this.dragEndTime = this.endTime;
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
            // Minimum selection duration: 0.1s
            const maxStart = this.endTime - 0.1;
            this.startTime = Math.max(0, Math.min(maxStart, mouseTime));
        } else if (this.dragType === 'end') {
            // Minimum selection duration: 0.1s
            const minEnd = this.startTime + 0.1;
            this.endTime = Math.min(this.videoDuration, Math.max(minEnd, mouseTime));
        } else if (this.dragType === 'area') {
            const duration = this.dragEndTime - this.dragStartTime;
            const deltaX = event.clientX - this.dragStartX;
            const deltaTime = (deltaX / trackWidth) * this.videoDuration;
            
            let newStart = this.dragStartTime + deltaTime;
            let newEnd = this.dragEndTime + deltaTime;
            
            // Keep within bounds
            if (newStart < 0) {
                newStart = 0;
                newEnd = duration;
            }
            if (newEnd > this.videoDuration) {
                newEnd = this.videoDuration;
                newStart = this.videoDuration - duration;
            }
            
            this.startTime = newStart;
            this.endTime = newEnd;
        }

        this.updateTimelineSelection();
        this.updateTimeDisplay();
        this.updatePlayhead();
        this.updateDurationPill();
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
        if (this.videoDuration === 0 || !this.selectionArea) return;
        
        const startPercent = (this.startTime / this.videoDuration) * 100;
        const endPercent = (this.endTime / this.videoDuration) * 100;
        
        this.selectionArea.style.left = `${startPercent}%`;
        this.selectionArea.style.width = `${endPercent - startPercent}%`;
    }

    updatePlayhead() {
        if (this.videoDuration === 0 || !this.playhead) return;
        
        const currentTime = this.previewVideo?.currentTime || 0;
        const percent = (currentTime / this.videoDuration) * 100;
        this.playhead.style.left = `${percent}%`;
        
        // Update current time for display
        this.currentTime = currentTime;
        
        // Update preview info
        const isInSelection = currentTime >= this.startTime && currentTime <= this.endTime;
        const progressInSelection = isInSelection ? 
            ((currentTime - this.startTime) / (this.endTime - this.startTime)) * 100 : 0;
        
        const statusIcon = isInSelection ? '🎯' : '⏱️';
        const statusText = isInSelection ? 
            `IN SELECTION (${progressInSelection.toFixed(0)}%)` : 
            'Outside selection';
        
        const previewInfo = document.getElementById('previewInfo');
        if (previewInfo) {
            previewInfo.textContent = 
                `${statusIcon} ${currentTime.toFixed(1)}s | ${statusText}`;
        }
    }

    updateTimeDisplay() {
        const startEl = document.getElementById('startTime');
        const endEl = document.getElementById('endTime');
        const durationEl = document.getElementById('trimDuration');
        
        if (startEl) startEl.textContent = `${this.startTime.toFixed(1)}s`;
        if (endEl) endEl.textContent = `${this.endTime.toFixed(1)}s`;
        if (durationEl) durationEl.textContent = `${(this.endTime - this.startTime).toFixed(1)}s`;
    }

    updateDurationPill() {
        const pill = document.getElementById('durationPill');
        if (!pill) return;
        
        const totalSec = this.videoDuration || 0;
        const selectionDuration = Math.max(0, (this.endTime || 0) - (this.startTime || 0));
        const percentage = totalSec > 0 ? Math.round((selectionDuration / totalSec) * 100) : 0;
        
        pill.textContent = `🎬 ${selectionDuration.toFixed(1)}s selected (${percentage}% of original)`;
    }

    togglePlayback() {
        if (!this.previewVideo) return;
        
        const btn = document.getElementById('playPauseBtn');
        if (this.previewVideo.paused) {
            // If at end of selection, restart from beginning of selection
            if (this.currentTime >= this.endTime) {
                this.previewVideo.currentTime = this.startTime;
            }
            this.previewVideo.play();
            if (btn) btn.textContent = 'Pause';
        } else {
            this.previewVideo.pause();
            if (btn) btn.textContent = 'Play';
        }
    }

    restart() {
        if (!this.previewVideo) return;
        this.previewVideo.currentTime = this.startTime;
        this.updatePlayhead();
    }

    toggleLoop() {
        const btn = document.getElementById('loopBtn');
        if (!btn || !this.previewVideo) return;
        
        const looping = btn.classList.toggle('active');
        this.previewVideo.loop = looping;
        btn.textContent = looping ? 'Loop: ON' : 'Loop: OFF';
    }

    onVideoPlay() {
        const btn = document.getElementById('playPauseBtn');
        if (btn) btn.textContent = 'Pause';
    }

    onVideoPause() {
        const btn = document.getElementById('playPauseBtn');
        if (btn) btn.textContent = 'Play';
    }

    onVideoEnded() {
        if (!this.previewVideo.loop) {
            const btn = document.getElementById('playPauseBtn');
            if (btn) btn.textContent = 'Play';
            // Reset to start of selection
            this.previewVideo.currentTime = this.startTime;
        }
    }

    async exportTrimmedGif() {
        if (!this.originalGifBlob) {
            this.showEditorStatus('❌ No GIF loaded for export.', 'error');
            return;
        }

        if (this.isProcessing) {
            this.showEditorStatus('⏳ Please wait for current processing to complete.', 'error');
            return;
        }

        const exportBtn = document.getElementById('exportTrimmedBtn');
        const progressContainer = document.getElementById('exportProgress');
        const progressText = document.getElementById('progressText');
        const progressFill = document.getElementById('progressFill');
        
        if (exportBtn) exportBtn.disabled = true;
        if (progressContainer) progressContainer.style.display = 'block';
        if (progressText) progressText.textContent = 'Preparing to trim...';
        if (progressFill) progressFill.style.width = '10%';
        
        this.isProcessing = true;

        try {
            // Ask server to trim the original GIF with current start/end
            this.showEditorStatus('✂️ Trimming GIF on server...', 'info');
            
            if (progressText) progressText.textContent = 'Uploading for trimming...';
            if (progressFill) progressFill.style.width = '30%';

            const form = new FormData();
            form.append('file', this.originalGifBlob, this.originalGifBlob.name);
            form.append('start', String(this.startTime));
            form.append('end', String(this.endTime));

            const res = await fetch(`${this.SERVER_URL}/edit/trim-gif`, {
                method: 'POST',
                body: form
            });

            if (progressText) progressText.textContent = 'Processing trim...';
            if (progressFill) progressFill.style.width = '70%';

            if (!res.ok) {
                const errorText = await res.text();
                console.error('Export failed:', errorText);
                throw new Error(`Server error: ${res.status}`);
            }

            const outBlob = await res.blob();
            
            if (!outBlob || outBlob.size === 0) {
                throw new Error('Received empty file from server');
            }
            
            if (progressText) progressText.textContent = 'Download ready!';
            if (progressFill) progressFill.style.width = '100%';
            
            const outUrl = URL.createObjectURL(outBlob);

            // Generate filename with trim info
            const filename = this.makeOutputName(
                this.originalGifBlob.name, 
                `_trimmed_${this.startTime.toFixed(1)}s-${this.endTime.toFixed(1)}s`
            );

            // Trigger download
            const a = document.createElement('a');
            a.href = outUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();

            URL.revokeObjectURL(outUrl);

            // Show success with details
            const outputSizeKB = outBlob.size / 1024;
            this.showEditorStatus(
                `✅ Trimmed GIF downloaded! Size: ${outputSizeKB.toFixed(0)}KB`, 
                'success'
            );
            
        } catch (err) {
            console.error('Export error:', err);
            this.showEditorStatus(`❌ Export failed: ${err.message}`, 'error');
        } finally {
            this.isProcessing = false;
            if (exportBtn) exportBtn.disabled = false;
            if (progressContainer) {
                setTimeout(() => {
                    progressContainer.style.display = 'none';
                    if (progressFill) progressFill.style.width = '0%';
                }, 1000);
            }
        }
    }

    makeOutputName(name, suffix) {
        const dot = name.lastIndexOf('.');
        if (dot <= 0) return name + suffix + '.gif';
        return name.slice(0, dot) + suffix + name.slice(dot);
    }

    setupEditorDragDrop() {
        if (!this.editorDropZone) return;
        
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.editorDropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        // Visual feedback on drag enter/over
        this.editorDropZone.addEventListener('dragenter', () => {
            if (!this.isProcessing) {
                this.editorDropZone.classList.add('dragover');
            }
        });

        this.editorDropZone.addEventListener('dragover', () => {
            if (!this.isProcessing) {
                this.editorDropZone.classList.add('dragover');
            }
        });

        // Remove visual feedback on drag leave
        this.editorDropZone.addEventListener('dragleave', (e) => {
            // Only remove dragover if we're actually leaving the drop zone
            // Check if the mouse is leaving the drop zone (not just moving to a child element)
            const rect = this.editorDropZone.getBoundingClientRect();
            const x = e.clientX;
            const y = e.clientY;
            
            if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                this.editorDropZone.classList.remove('dragover');
            }
        });

        // Handle file drop
        this.editorDropZone.addEventListener('drop', (e) => {
            this.editorDropZone.classList.remove('dragover');
            
            if (!this.isProcessing && e.dataTransfer?.files?.length) {
                const file = e.dataTransfer.files[0];
                if (file && /\.gif$/i.test(file.name)) {
                    this.loadGifForEditing(file);
                } else {
                    this.showEditorStatus('❌ Please drop a GIF file.', 'error');
                }
            }
        });

        // Add hover effects (matching main converter)
        this.editorDropZone.addEventListener('mouseenter', () => {
            if (!this.isProcessing) {
                this.editorDropZone.classList.add('hover');
            }
        });

        this.editorDropZone.addEventListener('mouseleave', () => {
            this.editorDropZone.classList.remove('hover');
        });
    }

    // Cleanup method for when editor is closed or page unloads
    cleanup() {
        if (this.previewVideoUrl) {
            URL.revokeObjectURL(this.previewVideoUrl);
            this.previewVideoUrl = null;
        }
        
        // Reset video element
        if (this.previewVideo) {
            this.previewVideo.pause();
            this.previewVideo.src = '';
        }
        
        console.log('Editor cleanup completed');
    }
}

// Initialize the editor when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.gifEditor = new IntegratedGifEditor();
        console.log('GIF Editor instance created and available as window.gifEditor');
    }, 100);
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.gifEditor) {
        window.gifEditor.cleanup();
    }
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