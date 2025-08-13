// Enhanced GIF Editor with Twitch/StreamLadder-style trimming
// Adds numeric inputs, I/O hotkeys, scrubber dragging, and loop-in-selection
// Builds on top of existing functionality without breaking anything

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
        
        // NEW: Playhead dragging
        this.isDraggingPlayhead = false;
        
        // NEW: Constraints
        this.MIN_DURATION = 0.1; // Minimum 0.1s selection
        this.MAX_DURATION = 30; // Maximum 30s for most platforms
        
        // NEW: Loop mode
        this.loopInSelection = true; // Loop within selection by default

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
        
        // NEW: Numeric time inputs (will create if not exist)
        this.startTimeInput = null;
        this.endTimeInput = null;
        
        this.initializeEditor();
    }

    initializeEditor() {
        // Create numeric time inputs if they don't exist
        this.createNumericInputs();
        
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
        
        // ENHANCED: Loop button now toggles between full loop and selection loop
        document.getElementById('loopBtn')?.addEventListener('click', () => this.toggleLoopMode());

        // Timeline handles & area
        this.startHandle?.addEventListener('mousedown', (e) => this.startDrag(e, 'start'));
        this.endHandle?.addEventListener('mousedown', (e) => this.startDrag(e, 'end'));
        this.selectionArea?.addEventListener('mousedown', (e) => this.startDrag(e, 'area'));
        
        // ENHANCED: Click timeline to seek, drag playhead directly
        this.timelineTrack?.addEventListener('mousedown', (e) => this.handleTimelineMouseDown(e));
        this.playhead?.addEventListener('mousedown', (e) => this.startPlayheadDrag(e));

        // Preset buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.setPreset(e.target.dataset.duration));
        });

        // Export button
        document.getElementById('exportTrimmedBtn')?.addEventListener('click', () => this.exportTrimmedGif());

        // Video event listeners
        if (this.previewVideo) {
            this.previewVideo.addEventListener('loadedmetadata', () => this.onVideoLoaded());
            this.previewVideo.addEventListener('timeupdate', () => this.onVideoTimeUpdate());
            this.previewVideo.addEventListener('play', () => this.onVideoPlay());
            this.previewVideo.addEventListener('pause', () => this.onVideoPause());
            this.previewVideo.addEventListener('ended', () => this.onVideoEnded());
        }

        // Global mouse events for dragging
        document.addEventListener('mousemove', (e) => this.handleGlobalMouseMove(e));
        document.addEventListener('mouseup', () => this.handleGlobalMouseUp());

        // ENHANCED: Professional keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        console.log('Enhanced GIF Editor initialized with Twitch-style features.');
    }
    
    // NEW: Create numeric time inputs for precise control
    createNumericInputs() {
        const timeDisplay = document.querySelector('.time-display');
        if (!timeDisplay) return;
        
        // Clear existing content and rebuild with inputs
        timeDisplay.innerHTML = `
            <span>
                Start: 
                <input type="text" id="startTimeInput" class="time-input" 
                       placeholder="0.0" pattern="[0-9]{1,2}:[0-9]{2}\\.[0-9]{1,3}|[0-9]+\\.[0-9]{1,3}" 
                       title="Format: seconds.ms or mm:ss.ms">
            </span>
            <span>
                End: 
                <input type="text" id="endTimeInput" class="time-input" 
                       placeholder="0.0" pattern="[0-9]{1,2}:[0-9]{2}\\.[0-9]{1,3}|[0-9]+\\.[0-9]{1,3}"
                       title="Format: seconds.ms or mm:ss.ms">
            </span>
            <span>Duration: <span id="trimDuration">0.0s</span></span>
        `;
        
        // Store references and add listeners
        this.startTimeInput = document.getElementById('startTimeInput');
        this.endTimeInput = document.getElementById('endTimeInput');
        
        if (this.startTimeInput) {
            this.startTimeInput.addEventListener('change', (e) => this.handleTimeInputChange('start', e.target.value));
            this.startTimeInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleTimeInputChange('start', e.target.value);
                    e.target.blur();
                }
            });
        }
        
        if (this.endTimeInput) {
            this.endTimeInput.addEventListener('change', (e) => this.handleTimeInputChange('end', e.target.value));
            this.endTimeInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleTimeInputChange('end', e.target.value);
                    e.target.blur();
                }
            });
        }
        
        // Add CSS for time inputs
        const style = document.createElement('style');
        style.textContent = `
            .time-input {
                width: 80px;
                padding: 2px 4px;
                border: 1px solid var(--timeline-handle);
                border-radius: 4px;
                background: var(--controls-bg);
                color: var(--text-primary);
                font-size: 13px;
                font-family: monospace;
                text-align: center;
            }
            .time-input:focus {
                outline: none;
                border-color: var(--timeline-selection-border);
                background: var(--container-bg);
            }
            .time-input.error {
                border-color: #ef4444;
                background: rgba(239, 68, 68, 0.1);
            }
        `;
        document.head.appendChild(style);
    }
    
    // NEW: Parse time input (supports "5.5" or "1:23.456" format)
    parseTimeInput(value) {
        if (!value) return null;
        
        value = value.trim();
        
        // Try mm:ss.ms format
        const colonMatch = value.match(/^(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?$/);
        if (colonMatch) {
            const minutes = parseInt(colonMatch[1]);
            const seconds = parseInt(colonMatch[2]);
            const ms = colonMatch[3] ? parseInt(colonMatch[3].padEnd(3, '0')) : 0;
            return minutes * 60 + seconds + ms / 1000;
        }
        
        // Try seconds.ms format
        const secondsMatch = value.match(/^(\d+)(?:\.(\d{1,3}))?$/);
        if (secondsMatch) {
            const seconds = parseInt(secondsMatch[1]);
            const ms = secondsMatch[2] ? parseInt(secondsMatch[2].padEnd(3, '0')) : 0;
            return seconds + ms / 1000;
        }
        
        return null;
    }
    
    // NEW: Format time for display in input
    formatTimeForInput(seconds) {
        if (seconds >= 60) {
            const mins = Math.floor(seconds / 60);
            const secs = (seconds % 60).toFixed(2);
            return `${mins}:${secs.padStart(5, '0')}`;
        }
        return seconds.toFixed(2);
    }
    
    // NEW: Handle numeric time input changes
    handleTimeInputChange(type, value) {
        const time = this.parseTimeInput(value);
        const input = type === 'start' ? this.startTimeInput : this.endTimeInput;
        
        if (time === null) {
            input?.classList.add('error');
            return;
        }
        
        input?.classList.remove('error');
        
        if (type === 'start') {
            const maxStart = this.endTime - this.MIN_DURATION;
            this.startTime = Math.max(0, Math.min(maxStart, time));
        } else {
            const minEnd = this.startTime + this.MIN_DURATION;
            this.endTime = Math.min(this.videoDuration, Math.max(minEnd, time));
        }
        
        this.updateTimelineSelection();
        this.updateTimeDisplay();
        this.updateDurationPill();
        
        // Seek to the changed point
        if (this.previewVideo) {
            this.previewVideo.currentTime = type === 'start' ? this.startTime : this.endTime;
        }
    }
    
    // NEW: Enhanced timeline interaction - click to seek, start dragging playhead
    handleTimelineMouseDown(event) {
        if (this.videoDuration === 0) return;
        
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
        const rect = this.timelineTrack.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickPercent = Math.max(0, Math.min(1, clickX / rect.width));
        const targetTime = clickPercent * this.videoDuration;
        
        if (this.previewVideo) {
            this.previewVideo.currentTime = targetTime;
        }
        
        // Start dragging playhead from here
        this.isDraggingPlayhead = true;
        event.preventDefault();
    }
    
    // NEW: Start dragging the playhead for scrubbing
    startPlayheadDrag(event) {
        event.preventDefault();
        event.stopPropagation();
        this.isDraggingPlayhead = true;
        document.body.style.cursor = 'ew-resize';
    }
    
    // ENHANCED: Handle all mouse moves (selection AND playhead dragging)
    handleGlobalMouseMove(event) {
        // Handle playhead dragging (scrubbing)
        if (this.isDraggingPlayhead && this.videoDuration > 0) {
            const rect = this.timelineTrack.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mousePercent = Math.max(0, Math.min(1, mouseX / rect.width));
            const targetTime = mousePercent * this.videoDuration;
            
            if (this.previewVideo) {
                this.previewVideo.currentTime = targetTime;
            }
            return;
        }
        
        // Original selection dragging
        if (this.isDragging) {
            this.handleDrag(event);
        }
    }
    
    // ENHANCED: Handle mouse up for all dragging
    handleGlobalMouseUp() {
        if (this.isDraggingPlayhead) {
            this.isDraggingPlayhead = false;
            document.body.style.cursor = '';
        }
        
        if (this.isDragging) {
            this.endDrag();
        }
    }
    
    // ENHANCED: Professional keyboard shortcuts
    handleKeyboard(event) {
        // Only handle keyboard when editor container is visible and not in an input field
        if (!this.editorContainer || 
            this.editorContainer.classList.contains('hidden') ||
            this.videoDuration === 0 ||
            ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) {
            return;
        }
        
        const step = event.shiftKey ? 0.001 : 0.01; // Finer control with Shift (frame-accurate)
        let updated = false;
        
        switch(event.key.toLowerCase()) {
            // NEW: I/O hotkeys for in/out points
            case 'i':
                event.preventDefault();
                if (this.previewVideo) {
                    this.startTime = Math.min(this.previewVideo.currentTime, this.endTime - this.MIN_DURATION);
                    updated = true;
                }
                break;
                
            case 'o':
                event.preventDefault();
                if (this.previewVideo) {
                    this.endTime = Math.max(this.previewVideo.currentTime, this.startTime + this.MIN_DURATION);
                    updated = true;
                }
                break;
            
            // Frame-by-frame navigation
            case 'arrowleft':
                event.preventDefault();
                if (event.ctrlKey || event.metaKey) {
                    // Move selection left
                    const duration = this.endTime - this.startTime;
                    const newStart = Math.max(0, this.startTime - step);
                    this.startTime = newStart;
                    this.endTime = Math.min(this.videoDuration, newStart + duration);
                    updated = true;
                } else if (event.altKey) {
                    // Adjust start point
                    this.startTime = Math.max(0, this.startTime - step);
                    updated = true;
                } else {
                    // Scrub backward
                    if (this.previewVideo) {
                        this.previewVideo.currentTime = Math.max(0, this.previewVideo.currentTime - step);
                    }
                }
                break;
                
            case 'arrowright':
                event.preventDefault();
                if (event.ctrlKey || event.metaKey) {
                    // Move selection right
                    const duration = this.endTime - this.startTime;
                    const newEnd = Math.min(this.videoDuration, this.endTime + step);
                    this.endTime = newEnd;
                    this.startTime = Math.max(0, newEnd - duration);
                    updated = true;
                } else if (event.altKey) {
                    // Adjust end point
                    this.endTime = Math.min(this.videoDuration, this.endTime + step);
                    updated = true;
                } else {
                    // Scrub forward
                    if (this.previewVideo) {
                        this.previewVideo.currentTime = Math.min(this.videoDuration, this.previewVideo.currentTime + step);
                    }
                }
                break;
                
            case ' ':
                // Spacebar to play/pause
                event.preventDefault();
                this.togglePlayback();
                return;
                
            // NEW: Quick duration presets
            case '1':
                if (!event.ctrlKey && !event.metaKey && !event.altKey) {
                    event.preventDefault();
                    this.setPreset('1.5');
                }
                break;
            case '3':
                if (!event.ctrlKey && !event.metaKey && !event.altKey) {
                    event.preventDefault();
                    this.setPreset('3');
                }
                break;
            case 'f':
                if (!event.ctrlKey && !event.metaKey && !event.altKey) {
                    event.preventDefault();
                    this.setPreset('full');
                }
                break;
        }
        
        if (updated) {
            this.updateTimelineSelection();
            this.updateTimeDisplay();
            this.updatePlayhead();
            this.updateDurationPill();
            
            // Clear preset states
            document.querySelectorAll('.preset-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            console.log(`Keyboard adjustment: ${this.startTime.toFixed(2)}s - ${this.endTime.toFixed(2)}s`);
        }
    }
    
    // ENHANCED: Video time update with loop-in-selection
    onVideoTimeUpdate() {
        this.updatePlayhead();
        
        // Loop within selection if enabled
        if (this.loopInSelection && this.previewVideo && !this.previewVideo.paused) {
            if (this.previewVideo.currentTime >= this.endTime || 
                this.previewVideo.currentTime < this.startTime) {
                this.previewVideo.currentTime = this.startTime;
            }
        }
    }
    
    // ENHANCED: Toggle between full loop and selection loop
    toggleLoopMode() {
        const btn = document.getElementById('loopBtn');
        if (!btn) return;
        
        this.loopInSelection = !this.loopInSelection;
        
        if (this.loopInSelection) {
            btn.textContent = 'Loop: Selection';
            btn.classList.add('active');
            this.showEditorStatus('🔁 Looping within selection', 'info');
        } else {
            btn.textContent = 'Loop: Full';
            btn.classList.remove('active');
            this.showEditorStatus('🔁 Looping full video', 'info');
        }
    }
    
    // Override updateTimeDisplay to update numeric inputs
    updateTimeDisplay() {
        // Update numeric inputs
        if (this.startTimeInput) {
            this.startTimeInput.value = this.formatTimeForInput(this.startTime);
        }
        if (this.endTimeInput) {
            this.endTimeInput.value = this.formatTimeForInput(this.endTime);
        }
        
        // Update duration display
        const durationEl = document.getElementById('trimDuration');
        if (durationEl) {
            const duration = this.endTime - this.startTime;
            durationEl.textContent = `${duration.toFixed(2)}s`;
        }
    }
    
    // Enhanced updatePlayhead with better preview info
    updatePlayhead() {
        if (this.videoDuration === 0 || !this.playhead) return;
        
        const currentTime = this.previewVideo?.currentTime || 0;
        const percent = (currentTime / this.videoDuration) * 100;
        this.playhead.style.left = `${percent}%`;
        
        // Update current time for display
        this.currentTime = currentTime;
        
        // Enhanced preview info
        const isInSelection = currentTime >= this.startTime && currentTime <= this.endTime;
        const progressInSelection = isInSelection ? 
            ((currentTime - this.startTime) / (this.endTime - this.startTime)) * 100 : 0;
        
        const previewInfo = document.getElementById('previewInfo');
        if (previewInfo) {
            const timeStr = this.formatTimeForInput(currentTime);
            const statusIcon = isInSelection ? '🎯' : '⏱️';
            const loopMode = this.loopInSelection ? '↻ Selection' : '↻ Full';
            
            if (isInSelection) {
                previewInfo.textContent = `${statusIcon} ${timeStr} | In selection (${progressInSelection.toFixed(0)}%) | ${loopMode}`;
            } else {
                previewInfo.textContent = `${statusIcon} ${timeStr} | Outside selection | ${loopMode}`;
            }
        }
    }

    // Keep all existing methods below unchanged...
    
    showEditorStatus(message, type = 'info') {
        const el = document.getElementById('editorStatus');
        if (!el) return;
        el.textContent = message;
        el.className = `status ${type}`;
        
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

        if (!file.type.includes('gif') && !file.name.toLowerCase().endsWith('.gif')) {
            this.showEditorStatus('⌛ Please select a GIF file.', 'error');
            return;
        }

        const maxSize = 100 * 1024 * 1024;
        if (file.size > maxSize) {
            this.showEditorStatus(`⌛ File too large. Maximum size: ${maxSize / (1024*1024)}MB`, 'error');
            return;
        }

        console.log('Starting GIF upload process...');
        this.isProcessing = true;
        
        if (this.editorDropZone) {
            this.editorDropZone.classList.add('processing');
            this.editorDropZone.classList.remove('dragover', 'hover');
        }

        this.originalGifBlob = file;
        if (this.previewVideoUrl) {
            URL.revokeObjectURL(this.previewVideoUrl);
        }
        this.previewVideoUrl = null;
        if (this.previewVideo) {
            this.previewVideo.src = '';
            this.previewVideo.load();
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

            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                throw new Error(`Server error: ${uploadResponse.status} - ${errorText}`);
            }

            this.showEditorStatus('⏳ Processing preview...', 'info');

            const webmBlob = await uploadResponse.blob();

            if (!webmBlob || webmBlob.size === 0) {
                throw new Error('Received empty response from server');
            }

            this.previewVideoUrl = URL.createObjectURL(webmBlob);
            this.previewVideo.src = this.previewVideoUrl;

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
                
                setTimeout(() => {
                    this.previewVideo.removeEventListener('loadedmetadata', handleLoaded);
                    this.previewVideo.removeEventListener('error', handleError);
                    reject(new Error('Video load timeout'));
                }, 10000);
            });

            const filenameEl = document.getElementById('loadedFilename');
            if (filenameEl) {
                filenameEl.textContent = file.name;
            }

            if (this.editorContainer) {
                this.editorContainer.classList.remove('hidden');
                this.editorContainer.style.display = 'block';
                this.editorContainer.setAttribute('tabindex', '0');
                
                setTimeout(() => {
                    this.editorContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    this.editorContainer.focus();
                }, 100);
            }

            const fileSizeKB = file.size / 1024;
            this.showEditorStatus(
                `✅ Preview ready! File: ${file.name} (${fileSizeKB.toFixed(0)}KB)`, 
                'success'
            );

        } catch (err) {
            console.error('Error loading GIF:', err);
            this.showEditorStatus(`⌛ Failed to load preview: ${err.message}`, 'error');

            if (this.previewVideoUrl) {
                URL.revokeObjectURL(this.previewVideoUrl);
                this.previewVideoUrl = null;
            }
        } finally {
            this.isProcessing = false;
            if (this.editorDropZone) {
                this.editorDropZone.classList.remove('processing');
            }
        }
    }

    onVideoLoaded() {
        if (!this.previewVideo || !this.previewVideo.duration) {
            console.error('Video not properly loaded');
            this.showEditorStatus('⌛ Failed to load video metadata', 'error');
            return;
        }
        
        this.videoDuration = this.previewVideo.duration;
        
        if (!this.videoDuration || this.videoDuration === 0 || !isFinite(this.videoDuration)) {
            console.error('Video duration is 0 or invalid:', this.videoDuration);
            this.showEditorStatus('⌛ Failed to load video metadata', 'error');
            return;
        }
        
        const durationEl = document.getElementById('videoDuration');
        if (durationEl) {
            durationEl.textContent = `${this.videoDuration.toFixed(1)}s`;
        }
        
        this.startTime = 0;
        this.endTime = this.videoDuration;
        this.currentTime = 0;
        
        this.createTimeline();
        this.updateTimelineSelection();
        this.updateTimeDisplay();
        this.updatePlayhead();
        this.updateDurationPill();
        
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
        
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.disabled = !enabled;
        });
    }

    createTimeline() {
        if (!this.timelineTrack) return;
        
        this.timelineTrack.innerHTML = '';
        
        const markerCount = Math.min(20, Math.max(5, Math.floor(this.videoDuration)));
        
        for (let i = 0; i <= markerCount; i++) {
            const time = (i / markerCount) * this.videoDuration;
            const marker = document.createElement('div');
            marker.className = 'time-marker';
            
            if (i === 0 || i === markerCount) {
                marker.classList.add('major-marker');
            }
            
            marker.style.left = `${(i / markerCount) * 100}%`;
            marker.innerHTML = `<span class="time-label">${time.toFixed(1)}s</span>`;
            this.timelineTrack.appendChild(marker);
        }
    }

    handleTimelineClick(event) {
        // This is now handled by handleTimelineMouseDown
        return;
    }

    setPreset(duration) {
        if (this.videoDuration === 0) return;

        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.duration === duration);
        });

        if (duration === 'full') {
            this.startTime = 0;
            this.endTime = this.videoDuration;
        } else {
            const durationNum = parseFloat(duration);
            
            if (durationNum > this.videoDuration) {
                this.startTime = 0;
                this.endTime = this.videoDuration;
            } else {
                const idealStart = (this.videoDuration - durationNum) / 2;
                this.startTime = Math.max(0, idealStart);
                this.endTime = Math.min(this.startTime + durationNum, this.videoDuration);
            }
        }

        this.updateTimelineSelection();
        this.updateTimeDisplay();
        this.updatePlayhead();
        this.updateDurationPill();
        
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
            this.selectionArea.classList.add('dragging');
        } else {
            this.dragStartTime = type === 'start' ? this.startTime : this.endTime;
            if (type === 'start') {
                this.startHandle.classList.add('dragging');
            } else {
                this.endHandle.classList.add('dragging');
            }
        }
        
        document.body.style.userSelect = 'none';
        document.body.style.cursor = type === 'area' ? 'grabbing' : 'ew-resize';
        
        console.log(`Started dragging ${type} at time: ${this.dragStartTime.toFixed(2)}s`);
    }

    handleDrag(event) {
        if (!this.isDragging || this.videoDuration === 0) return;

        const rect = this.timelineTrack.getBoundingClientRect();
        const trackWidth = rect.width;
        const mouseX = event.clientX - rect.left;
        const mousePercent = Math.max(0, Math.min(1, mouseX / trackWidth));
        const mouseTime = mousePercent * this.videoDuration;

        if (this.dragType === 'start') {
            const maxStart = this.endTime - this.MIN_DURATION;
            const newStart = Math.max(0, Math.min(maxStart, mouseTime));
            this.startTime = newStart;
            
            if (this.previewVideo) {
                this.previewVideo.currentTime = this.startTime;
            }
            
        } else if (this.dragType === 'end') {
            const minEnd = this.startTime + this.MIN_DURATION;
            const newEnd = Math.min(this.videoDuration, Math.max(minEnd, mouseTime));
            this.endTime = newEnd;
            
            if (this.previewVideo) {
                this.previewVideo.currentTime = this.endTime;
            }
            
        } else if (this.dragType === 'area') {
            const selectionDuration = this.dragEndTime - this.dragStartTime;
            const deltaX = event.clientX - this.dragStartX;
            const deltaTime = (deltaX / trackWidth) * this.videoDuration;
            
            let newStart = this.dragStartTime + deltaTime;
            let newEnd = this.dragEndTime + deltaTime;
            
            if (newStart < 0) {
                newStart = 0;
                newEnd = selectionDuration;
            }
            if (newEnd > this.videoDuration) {
                newEnd = this.videoDuration;
                newStart = this.videoDuration - selectionDuration;
            }
            
            this.startTime = newStart;
            this.endTime = newEnd;
            
            if (this.previewVideo) {
                const centerTime = (this.startTime + this.endTime) / 2;
                this.previewVideo.currentTime = centerTime;
            }
        }

        this.updateTimelineSelection();
        this.updateTimeDisplay();
        this.updatePlayhead();
        this.updateDurationPill();
        
        const previewInfo = document.getElementById('previewInfo');
        if (previewInfo) {
            const duration = this.endTime - this.startTime;
            const dragIcon = this.dragType === 'start' ? '◀️' : 
                           this.dragType === 'end' ? '▶️' : '🔄';
            previewInfo.textContent = 
                `${dragIcon} Dragging ${this.dragType} | Selection: ${duration.toFixed(1)}s (${((duration / this.videoDuration) * 100).toFixed(0)}%)`;
        }
        
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.remove('active');
        });
    }

    endDrag() {
        if (!this.isDragging) return;
        
        const dragType = this.dragType;
        const finalStart = this.startTime;
        const finalEnd = this.endTime;
        
        if (this.selectionArea) {
            this.selectionArea.classList.remove('dragging');
        }
        if (this.startHandle) {
            this.startHandle.classList.remove('dragging');
        }
        if (this.endHandle) {
            this.endHandle.classList.remove('dragging');
        }
        
        this.isDragging = false;
        this.dragType = null;
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        
        console.log(`Finished dragging ${dragType}. Final selection: ${finalStart.toFixed(2)}s - ${finalEnd.toFixed(2)}s (duration: ${(finalEnd - finalStart).toFixed(2)}s)`);
        
        this.updatePlayhead();
        
        if (this.previewVideo && dragType !== 'area') {
            this.previewVideo.currentTime = this.startTime;
        }
    }

    updateTimelineSelection() {
        if (this.videoDuration === 0 || !this.selectionArea) return;
        
        const startPercent = (this.startTime / this.videoDuration) * 100;
        const endPercent = (this.endTime / this.videoDuration) * 100;
        
        this.selectionArea.style.left = `${startPercent}%`;
        this.selectionArea.style.width = `${endPercent - startPercent}%`;
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
            if (this.currentTime >= this.endTime || this.currentTime < this.startTime) {
                this.previewVideo.currentTime = this.startTime;
            }
            this.previewVideo.play();
            if (btn) btn.textContent = '⏸️';
        } else {
            this.previewVideo.pause();
            if (btn) btn.textContent = '▶️';
        }
    }

    restart() {
        if (!this.previewVideo) return;
        this.previewVideo.currentTime = this.startTime;
        this.updatePlayhead();
    }

    onVideoPlay() {
        const btn = document.getElementById('playPauseBtn');
        if (btn) btn.textContent = '⏸️';
    }

    onVideoPause() {
        const btn = document.getElementById('playPauseBtn');
        if (btn) btn.textContent = '▶️';
    }

    onVideoEnded() {
        if (this.loopInSelection) {
            this.previewVideo.currentTime = this.startTime;
            if (!this.previewVideo.paused) {
                this.previewVideo.play();
            }
        } else {
            const btn = document.getElementById('playPauseBtn');
            if (btn) btn.textContent = '▶️';
        }
    }

    async exportTrimmedGif() {
        if (!this.originalGifBlob) {
            this.showEditorStatus('⌛ No GIF loaded for export.', 'error');
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

            const filename = this.makeOutputName(
                this.originalGifBlob.name, 
                `_trimmed_${this.startTime.toFixed(1)}s-${this.endTime.toFixed(1)}s`
            );

            const a = document.createElement('a');
            a.href = outUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();

            URL.revokeObjectURL(outUrl);

            const outputSizeKB = outBlob.size / 1024;
            this.showEditorStatus(
                `✅ Trimmed GIF downloaded! Size: ${outputSizeKB.toFixed(0)}KB`, 
                'success'
            );
            
        } catch (err) {
            console.error('Export error:', err);
            this.showEditorStatus(`⌛ Export failed: ${err.message}`, 'error');
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
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.editorDropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

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

        this.editorDropZone.addEventListener('dragleave', (e) => {
            const rect = this.editorDropZone.getBoundingClientRect();
            const x = e.clientX;
            const y = e.clientY;
            
            if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                this.editorDropZone.classList.remove('dragover');
            }
        });

        this.editorDropZone.addEventListener('drop', (e) => {
            this.editorDropZone.classList.remove('dragover');
            
            if (!this.isProcessing && e.dataTransfer?.files?.length) {
                const file = e.dataTransfer.files[0];
                if (file && /\.gif$/i.test(file.name)) {
                    this.loadGifForEditing(file);
                } else {
                    this.showEditorStatus('⌛ Please drop a GIF file.', 'error');
                }
            }
        });

        this.editorDropZone.addEventListener('mouseenter', () => {
            if (!this.isProcessing) {
                this.editorDropZone.classList.add('hover');
            }
        });

        this.editorDropZone.addEventListener('mouseleave', () => {
            this.editorDropZone.classList.remove('hover');
        });
    }

    cleanup() {
        if (this.previewVideoUrl) {
            URL.revokeObjectURL(this.previewVideoUrl);
            this.previewVideoUrl = null;
        }
        
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
        console.log('Enhanced GIF Editor instance created with Twitch-style features');
    }, 100);
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.gifEditor) {
        window.gifEditor.cleanup();
    }
});

// Prevent default drag behaviors
['dragenter', 'dragover'].forEach(eventName => {
    document.addEventListener(eventName, (e) => {
        if (e.target.closest('#editorDropZone')) {
            e.preventDefault();
            e.stopPropagation();
        }
    });
});