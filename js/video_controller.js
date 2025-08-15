// Video Controller - Handles video playback, seeking, looping, and controls

class VideoController {
    constructor(editor) {
        this.editor = editor;
        
        // Loop mode - start with OFF to match HTML
        this.loopInSelection = false;
        
        // Ping-pong preview state
        this.isPlayingBackward = false;
    }
    
    initialize() {
        this.setupVideoEventListeners();
        this.setupControlButtons();
        console.log('VideoController initialized');
    }
    
    setupVideoEventListeners() {
        if (!this.editor.previewVideo) return;
        
        // Video metadata and state events
        this.editor.previewVideo.addEventListener('loadedmetadata', () => this.editor.onVideoLoaded());
        this.editor.previewVideo.addEventListener('timeupdate', () => this.onVideoTimeUpdate());
        this.editor.previewVideo.addEventListener('play', () => this.onVideoPlay());
        this.editor.previewVideo.addEventListener('pause', () => this.onVideoPause());
        this.editor.previewVideo.addEventListener('ended', () => this.onVideoEnded());
    }
    
    setupControlButtons() {
        // Play/pause button
        document.getElementById('playPauseBtn')?.addEventListener('click', () => this.togglePlayback());
        
        // Restart button
        document.getElementById('restartBtn')?.addEventListener('click', () => this.restart());
        
        // Loop button
        document.getElementById('loopBtn')?.addEventListener('click', () => this.toggleLoopMode());
        
        // Preset buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.editor.setPreset(e.target.dataset.duration));
        });
    }
    
    // Video time update with loop-in-selection
    onVideoTimeUpdate() {
        // Update playhead position
        this.editor.uiManager.updatePlayhead();
        
        // Handle looping within selection
        if (this.loopInSelection && this.editor.previewVideo && !this.editor.previewVideo.paused) {
            // Enhanced ping-pong preview (simplified version)
            if (this.editor.pingPongMode && this.isPlayingBackward) {
                // Playing backward in ping-pong mode (simulated)
                if (this.editor.previewVideo.currentTime <= this.editor.startTime) {
                    this.isPlayingBackward = false;
                    this.editor.previewVideo.currentTime = this.editor.startTime + 0.01;
                }
            } else {
                // Normal forward play
                if (this.editor.previewVideo.currentTime >= this.editor.endTime) {
                    if (this.editor.pingPongMode) {
                        // Start "playing backward" (restart from end for preview)
                        this.isPlayingBackward = true;
                        this.editor.previewVideo.currentTime = this.editor.endTime - 0.01;
                        // Note: True ping-pong preview would require complex video manipulation
                        // The actual ping-pong effect will be applied when exporting
                    } else {
                        // Normal loop
                        this.editor.previewVideo.currentTime = this.editor.startTime;
                    }
                } else if (this.editor.previewVideo.currentTime < this.editor.startTime) {
                    this.editor.previewVideo.currentTime = this.editor.startTime;
                }
            }
        }
    }
    
    // Toggle between play and pause
    togglePlayback() {
        if (!this.editor.previewVideo) return;
        
        const btn = document.getElementById('playPauseBtn');
        
        if (this.editor.previewVideo.paused) {
            // If outside selection or at end, start from beginning of selection
            if (this.editor.currentTime >= this.editor.endTime || this.editor.currentTime < this.editor.startTime) {
                this.editor.previewVideo.currentTime = this.editor.startTime;
            }
            this.editor.previewVideo.play();
            if (btn) btn.textContent = '⏸️';
        } else {
            this.editor.previewVideo.pause();
            if (btn) btn.textContent = '▶️';
        }
    }
    
    // Restart playback from selection start
    restart() {
        if (!this.editor.previewVideo) return;
        this.editor.previewVideo.currentTime = this.editor.startTime;
        this.isPlayingBackward = false; // Reset ping-pong state
        this.editor.uiManager.updatePlayhead();
    }
    
    // Toggle between full loop and selection loop
    toggleLoopMode() {
        const btn = document.getElementById('loopBtn');
        if (!btn) return;
        
        this.loopInSelection = !this.loopInSelection;
        
        if (this.loopInSelection) {
            btn.textContent = 'Loop: Selection';
            btn.classList.add('active');
            this.editor.uiManager.showStatus('🔁 Looping within selection', 'info');
        } else {
            btn.textContent = 'Loop: OFF';
            btn.classList.remove('active');
            this.editor.uiManager.showStatus('🔁 Loop disabled', 'info');
        }
    }
    
    // Seek to specific time
    seekTo(time) {
        if (!this.editor.previewVideo) return;
        
        const constrainedTime = Math.max(0, Math.min(this.editor.videoDuration, time));
        this.editor.previewVideo.currentTime = constrainedTime;
        this.editor.uiManager.updatePlayhead();
    }
    
    // Seek to start of selection
    seekToSelectionStart() {
        this.seekTo(this.editor.startTime);
    }
    
    // Seek to end of selection
    seekToSelectionEnd() {
        this.seekTo(this.editor.endTime);
    }
    
    // Step forward/backward by specified amount
    stepTime(deltaSeconds) {
        if (!this.editor.previewVideo) return;
        
        const currentTime = this.editor.previewVideo.currentTime;
        const newTime = currentTime + deltaSeconds;
        this.seekTo(newTime);
    }
    
    // Frame-by-frame navigation (assuming 30fps for frame calculation)
    stepFrame(direction) {
        const frameTime = 1 / 30; // Approximate frame duration
        this.stepTime(direction * frameTime);
    }
    
    // Move selection while maintaining duration
    moveSelection(deltaSeconds) {
        const duration = this.editor.endTime - this.editor.startTime;
        let newStart = this.editor.startTime + deltaSeconds;
        let newEnd = this.editor.endTime + deltaSeconds;
        
        // Constrain to video bounds
        if (newStart < 0) {
            newStart = 0;
            newEnd = duration;
        }
        if (newEnd > this.editor.videoDuration) {
            newEnd = this.editor.videoDuration;
            newStart = this.editor.videoDuration - duration;
        }
        
        this.editor.updateSelection(newStart, newEnd);
    }
    
    // Adjust selection start point
    adjustSelectionStart(deltaSeconds) {
        const newStart = this.editor.startTime + deltaSeconds;
        const maxStart = this.editor.endTime - this.editor.MIN_DURATION;
        const constrainedStart = Math.max(0, Math.min(maxStart, newStart));
        
        this.editor.updateSelection(constrainedStart, this.editor.endTime);
    }
    
    // Adjust selection end point
    adjustSelectionEnd(deltaSeconds) {
        const newEnd = this.editor.endTime + deltaSeconds;
        const minEnd = this.editor.startTime + this.editor.MIN_DURATION;
        const constrainedEnd = Math.min(this.editor.videoDuration, Math.max(minEnd, newEnd));
        
        this.editor.updateSelection(this.editor.startTime, constrainedEnd);
    }
    
    // Set IN point to current playhead position
    setInPoint() {
        if (!this.editor.previewVideo) return;
        
        const currentTime = this.editor.previewVideo.currentTime;
        const maxStart = this.editor.endTime - this.editor.MIN_DURATION;
        const newStart = Math.min(currentTime, maxStart);
        
        this.editor.updateSelection(newStart, this.editor.endTime);
        
        console.log(`IN point set to ${newStart.toFixed(2)}s`);
    }
    
    // Set OUT point to current playhead position
    setOutPoint() {
        if (!this.editor.previewVideo) return;
        
        const currentTime = this.editor.previewVideo.currentTime;
        const minEnd = this.editor.startTime + this.editor.MIN_DURATION;
        const newEnd = Math.max(currentTime, minEnd);
        
        this.editor.updateSelection(this.editor.startTime, newEnd);
        
        console.log(`OUT point set to ${newEnd.toFixed(2)}s`);
    }
    
    // Video event handlers
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
            // Loop back to selection start
            this.editor.previewVideo.currentTime = this.editor.startTime;
            if (!this.editor.previewVideo.paused) {
                this.editor.previewVideo.play();
            }
        } else {
            // Just pause at end
            const btn = document.getElementById('playPauseBtn');
            if (btn) btn.textContent = '▶️';
        }
    }
    
    // Check if currently playing
    isPlaying() {
        return this.editor.previewVideo && !this.editor.previewVideo.paused;
    }
    
    // Check if playhead is within selection
    isInSelection() {
        if (!this.editor.previewVideo) return false;
        
        const currentTime = this.editor.previewVideo.currentTime;
        return currentTime >= this.editor.startTime && currentTime <= this.editor.endTime;
    }
    
    // Get current playback rate
    getPlaybackRate() {
        return this.editor.previewVideo?.playbackRate || 1.0;
    }
    
    // Set playback rate
    setPlaybackRate(rate) {
        if (this.editor.previewVideo) {
            this.editor.previewVideo.playbackRate = rate;
        }
    }
    
    // Toggle between normal and slow playback
    toggleSlowMotion() {
        const currentRate = this.getPlaybackRate();
        const newRate = currentRate === 1.0 ? 0.25 : 1.0;
        this.setPlaybackRate(newRate);
        
        this.editor.uiManager.showStatus(
            `🎬 Playback speed: ${newRate === 1.0 ? 'Normal' : 'Slow (0.25x)'}`, 
            'info'
        );
    }
    
    // Called when video loads
    onVideoLoaded() {
        // Reset loop mode button state
        const loopBtn = document.getElementById('loopBtn');
        if (loopBtn) {
            loopBtn.textContent = this.loopInSelection ? 'Loop: Selection' : 'Loop: OFF';
            loopBtn.classList.toggle('active', this.loopInSelection);
        }
        
        // Reset play button
        const playBtn = document.getElementById('playPauseBtn');
        if (playBtn) {
            playBtn.textContent = '▶️';
        }
        
        // Reset ping-pong state
        this.isPlayingBackward = false;
        
        // Ensure video starts at beginning of selection
        if (this.editor.previewVideo) {
            this.editor.previewVideo.currentTime = this.editor.startTime;
        }
    }
    
    // Called when selection updates
    updateSelection() {
        // If playing and now outside selection with loop enabled, seek back to start
        if (this.loopInSelection && this.isPlaying() && !this.isInSelection()) {
            this.seekToSelectionStart();
        }
    }
    
    // Cleanup
    cleanup() {
        // Pause video
        if (this.editor.previewVideo) {
            this.editor.previewVideo.pause();
        }
        
        console.log('VideoController cleanup completed');
    }
}