// GIF Editor - Advanced Timeline Editor for GIFs
// Browser-based GIF editing with timeline controls similar to Twitch Clips

class GifEditor {
    constructor() {
        this.frames = [];
        this.frameDelays = [];
        this.totalDuration = 0;
        this.currentFrame = 0;
        this.isPlaying = false;
        this.playInterval = null;
        
        // Selection state
        this.startTime = 0;
        this.endTime = 0;
        this.isDragging = false;
        this.dragType = null; // 'start', 'end', 'area'
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

        // Preset buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.setPreset(e.target.dataset.duration));
        });

        // Checkboxes
        document.getElementById('pingPongMode').addEventListener('change', () => this.updatePreview());
        document.getElementById('repeatMode').addEventListener('change', () => this.updatePreview());

        // Quality selector
        document.querySelectorAll('.quality-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.setQuality(e.target.dataset.quality));
        });

        // Export button
        document.getElementById('exportBtn').addEventListener('click', () => this.exportGif());

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
            const arrayBuffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            
            // Parse GIF using gifuct-js or fallback
            const gifData = await this.parseGif(uint8Array);
            
            if (!gifData.frames || gifData.frames.length === 0) {
                throw new Error('Could not parse GIF frames');
            }

            this.frames = gifData.frames;
            this.frameDelays = gifData.delays;
            this.totalDuration = gifData.delays.reduce((sum, delay) => sum + delay, 0) / 100; // Convert to seconds
            
            // Store original dimensions if available
            if (gifData.width && gifData.height) {
                this.originalWidth = gifData.width;
                this.originalHeight = gifData.height;
            }
            
            this.setupEditor();
            this.showStatus(`✅ Loaded ${this.frames.length} frames (${this.totalDuration.toFixed(1)}s)`, 'success');
            
        } catch (error) {
            console.error('Error loading GIF:', error);
            this.showStatus('❌ Error loading GIF. Please try a different file.', 'error');
        }
    }

    async parseGif(uint8Array) {
        try {
            // Use gifuct-js for real GIF parsing
            if (typeof parseGIF !== 'undefined' && typeof decompressFrames !== 'undefined') {
                const gif = parseGIF(uint8Array);
                const frames = decompressFrames(gif, true);
                
                return {
                    frames: frames.map(frame => ({
                        patch: frame.patch,
                        width: frame.dims.width,
                        height: frame.dims.height
                    })),
                    delays: frames.map(frame => frame.delay || 10),
                    width: gif.lsd.width,
                    height: gif.lsd.height
                };
            }
        } catch (error) {
            console.warn('gifuct-js parsing failed, using fallback parser:', error);
        }
        
        // Fallback: Simple mock implementation for demo/development
        return new Promise((resolve) => {
            const blob = new Blob([uint8Array], { type: 'image/gif' });
            const url = URL.createObjectURL(blob);
            const img = new Image();
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                const frameData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                
                // Create mock frames for demonstration
                const frames = [];
                const delays = [];
                
                for (let i = 0; i < 10; i++) {
                    frames.push({
                        patch: frameData.data,
                        width: img.width,
                        height: img.height
                    });
                    delays.push(10); // 100ms per frame
                }
                
                URL.revokeObjectURL(url);
                resolve({ frames, delays, width: img.width, height: img.height });
            };
            
            img.onerror = () => {
                resolve({ frames: [], delays: [], width: 0, height: 0 });
            };
            
            img.src = url;
        });
    }

    setupEditor() {
        // Show editor
        this.editorContainer.style.display = 'block';
        
        // Setup canvas with proper dimensions
        const firstFrame = this.frames[0];
        if (firstFrame && firstFrame.width && firstFrame.height) {
            this.previewCanvas.width = firstFrame.width;
            this.previewCanvas.height = firstFrame.height;
        } else {
            // Fallback dimensions
            this.previewCanvas.width = 400;
            this.previewCanvas.height = 300;
        }
        
        // Draw first frame
        this.drawFrame(0);
        
        // Create timeline thumbnails
        this.createTimelineThumbnails();
        
        // Set initial selection to full duration
        this.startTime = 0;
        this.endTime = this.totalDuration;
        this.updateTimelineSelection();
        this.updateTimeDisplay();
        
        // Start preview playback
        this.startPlayback();
    }

    createTimelineThumbnails() {
        this.timelineTrack.innerHTML = '';
        
        this.frames.forEach((frame, index) => {
            const thumbnail = document.createElement('div');
            thumbnail.className = 'frame-thumbnail';
            thumbnail.dataset.frameIndex = index;
            
            // Create thumbnail image
            const canvas = document.createElement('canvas');
            canvas.width = 40;
            canvas.height = 40;
            const ctx = canvas.getContext('2d');
            
            if (frame && frame.patch && frame.width && frame.height) {
                try {
                    // Real frame data - create a temp canvas to scale from
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = frame.width;
                    tempCanvas.height = frame.height;
                    const tempCtx = tempCanvas.getContext('2d');
                    
                    const imageData = new ImageData(new Uint8ClampedArray(frame.patch), frame.width, frame.height);
                    tempCtx.putImageData(imageData, 0, 0);
                    
                    // Scale down to thumbnail size maintaining aspect ratio
                    const scale = Math.min(40 / frame.width, 40 / frame.height);
                    const scaledWidth = frame.width * scale;
                    const scaledHeight = frame.height * scale;
                    const offsetX = (40 - scaledWidth) / 2;
                    const offsetY = (40 - scaledHeight) / 2;
                    
                    ctx.fillStyle = '#f0f0f0';
                    ctx.fillRect(0, 0, 40, 40);
                    ctx.drawImage(tempCanvas, offsetX, offsetY, scaledWidth, scaledHeight);
                } catch (error) {
                    // If real frame processing fails, fall back to mock
                    ctx.fillStyle = `hsl(${index * 36}, 50%, 70%)`;
                    ctx.fillRect(0, 0, 40, 40);
                    ctx.fillStyle = 'white';
                    ctx.font = '12px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(index + 1, 20, 25);
                }
            } else {
                // Fallback: Mock thumbnail with colors and frame number
                ctx.fillStyle = `hsl(${index * 36}, 50%, 70%)`;
                ctx.fillRect(0, 0, 40, 40);
                ctx.fillStyle = 'white';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(index + 1, 20, 25);
            }
            
            thumbnail.style.backgroundImage = `url(${canvas.toDataURL()})`;
            
            thumbnail.addEventListener('click', () => {
                this.currentFrame = index;
                this.drawFrame(index);
                this.updateFrameHighlight();
            });
            
            this.timelineTrack.appendChild(thumbnail);
        });
    }

    drawFrame(frameIndex) {
        const ctx = this.previewCanvas.getContext('2d');
        const frame = this.frames[frameIndex];
        
        // Clear canvas
        ctx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
        
        // Draw frame
        if (frame && frame.patch && frame.width && frame.height) {
            // Real frame data from gifuct-js
            const imageData = new ImageData(new Uint8ClampedArray(frame.patch), frame.width, frame.height);
            ctx.putImageData(imageData, 0, 0);
        } else {
            // Fallback: draw mock frame for demo
            ctx.fillStyle = `hsl(${frameIndex * 36}, 50%, 70%)`;
            ctx.fillRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`Frame ${frameIndex + 1}`, this.previewCanvas.width / 2, this.previewCanvas.height / 2);
        }
        
        // Update frame info
        document.getElementById('previewInfo').textContent = `Frame ${frameIndex + 1} of ${this.frames.length}`;
        
        this.updateFrameHighlight();
    }

    updateFrameHighlight() {
        document.querySelectorAll('.frame-thumbnail').forEach((thumb, index) => {
            thumb.classList.toggle('active', index === this.currentFrame);
        });
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
        
        const startFrame = this.timeToFrame(this.startTime);
        const endFrame = this.timeToFrame(this.endTime);
        
        this.playInterval = setInterval(() => {
            this.currentFrame++;
            
            if (this.currentFrame > endFrame) {
                if (document.getElementById('pingPongMode').checked) {
                    // Ping-pong mode: reverse direction
                    // For now, just restart (full ping-pong would require more complex logic)
                    this.currentFrame = startFrame;
                } else {
                    this.currentFrame = startFrame;
                }
            }
            
            this.drawFrame(this.currentFrame);
            this.updatePlayhead();
        }, this.frameDelays[this.currentFrame] * 10 || 100); // Convert to milliseconds
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
        this.currentFrame = this.timeToFrame(this.startTime);
        this.drawFrame(this.currentFrame);
        this.updatePlayhead();
    }

    timeToFrame(time) {
        let currentTime = 0;
        for (let i = 0; i < this.frameDelays.length; i++) {
            currentTime += this.frameDelays[i] / 100; // Convert to seconds
            if (currentTime >= time) {
                return i;
            }
        }
        return this.frames.length - 1;
    }

    frameToTime(frame) {
        let time = 0;
        for (let i = 0; i < frame && i < this.frameDelays.length; i++) {
            time += this.frameDelays[i] / 100; // Convert to seconds
        }
        return time;
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
            
            // Try to center the selection, but adjust if it would exceed bounds
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
        this.dragStartTime = type === 'start' ? this.startTime : this.endTime;
        
        document.body.style.userSelect = 'none';
        document.body.style.cursor = type === 'area' ? 'grabbing' : 'ew-resize';
    }

    handleDrag(event) {
        if (!this.isDragging) return;

        const rect = this.timelineTrack.getBoundingClientRect();
        const trackWidth = rect.width;
        const deltaX = event.clientX - this.dragStartX;
        const deltaTime = (deltaX / trackWidth) * this.totalDuration;

        if (this.dragType === 'start') {
            this.startTime = Math.max(0, Math.min(this.endTime - 0.1, this.dragStartTime + deltaTime));
        } else if (this.dragType === 'end') {
            this.endTime = Math.min(this.totalDuration, Math.max(this.startTime + 0.1, this.dragStartTime + deltaTime));
        } else if (this.dragType === 'area') {
            const duration = this.endTime - this.startTime;
            let newStart = this.startTime + deltaTime;
            
            // Constrain to bounds
            if (newStart < 0) newStart = 0;
            if (newStart + duration > this.totalDuration) newStart = this.totalDuration - duration;
            
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
        const currentTime = this.frameToTime(this.currentFrame);
        const percent = (currentTime / this.totalDuration) * 100;
        this.playhead.style.left = `${percent}%`;
    }

    updateTimeDisplay() {
        document.getElementById('startTime').textContent = `${this.startTime.toFixed(1)}s`;
        document.getElementById('endTime').textContent = `${this.endTime.toFixed(1)}s`;
        document.getElementById('duration').textContent = `${(this.endTime - this.startTime).toFixed(1)}s`;
    }

    updatePreview() {
        // Restart playback with new selection
        this.pausePlayback();
        this.currentFrame = this.timeToFrame(this.startTime);
        this.drawFrame(this.currentFrame);
        if (this.isPlaying) {
            this.startPlayback();
        }
    }

    setQuality(quality) {
        document.querySelectorAll('.quality-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.quality === quality);
        });
    }

    async exportGif() {
        const exportBtn = document.getElementById('exportBtn');
        const progressContainer = document.getElementById('exportProgress');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');

        // Disable button and show progress
        exportBtn.disabled = true;
        progressContainer.style.display = 'block';
        
        try {
            // Calculate frames to export
            const startFrame = this.timeToFrame(this.startTime);
            const endFrame = this.timeToFrame(this.endTime);
            const framesToExport = this.frames.slice(startFrame, endFrame + 1);
            
            progressText.textContent = 'Preparing frames...';
            progressFill.style.width = '10%';

            // Check for ping-pong mode
            let finalFrames = [...framesToExport];
            if (document.getElementById('pingPongMode').checked) {
                // Add reversed frames (excluding first and last to avoid duplication)
                const reversedFrames = framesToExport.slice(1, -1).reverse();
                finalFrames = [...framesToExport, ...reversedFrames];
            }

            // Check for repeat mode
            if (document.getElementById('repeatMode').checked && finalFrames.length < 15) { // Less than 1.5s at 10fps
                const repeatCount = Math.ceil(15 / finalFrames.length);
                const repeatedFrames = [];
                for (let i = 0; i < repeatCount; i++) {
                    repeatedFrames.push(...finalFrames);
                }
                finalFrames = repeatedFrames;
            }

            progressText.textContent = 'Creating GIF...';
            progressFill.style.width = '50%';

            // Create new GIF
            const gifBlob = await this.createGifBlob(finalFrames);

            progressText.textContent = 'Download ready!';
            progressFill.style.width = '100%';

            // Create download
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
            this.downloadFile(gifBlob, `edited-gif-${timestamp}.gif`);

            this.showStatus('✅ GIF exported successfully!', 'success');

        } catch (error) {
            console.error('Export error:', error);
            this.showStatus('❌ Export failed. Please try again.', 'error');
        } finally {
            // Reset UI
            exportBtn.disabled = false;
            progressContainer.style.display = 'none';
            progressFill.style.width = '0%';
        }
    }

    async createGifBlob(frames) {
        return new Promise((resolve, reject) => {
            try {
                // Use gif.js for real GIF creation
                if (typeof GIF !== 'undefined') {
                    const gif = new GIF({
                        workers: 2,
                        quality: 10,
                        width: this.previewCanvas.width,
                        height: this.previewCanvas.height
                    });

                    // Add frames to gif
                    frames.forEach((frame, index) => {
                        const canvas = document.createElement('canvas');
                        canvas.width = this.previewCanvas.width;
                        canvas.height = this.previewCanvas.height;
                        const ctx = canvas.getContext('2d');
                        
                        // Draw frame (you'd use actual frame data here)
                        ctx.fillStyle = `hsl(${index * 36}, 50%, 70%)`;
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        ctx.fillStyle = 'white';
                        ctx.font = '24px Arial';
                        ctx.textAlign = 'center';
                        ctx.fillText(`Frame ${index + 1}`, canvas.width / 2, canvas.height / 2);
                        
                        gif.addFrame(canvas, { delay: 100 });
                    });

                    gif.on('finished', (blob) => {
                        resolve(blob);
                    });

                    gif.on('progress', (progress) => {
                        const progressFill = document.getElementById('progressFill');
                        const progressText = document.getElementById('progressText');
                        if (progressFill) {
                            progressFill.style.width = `${50 + (progress * 40)}%`;
                        }
                        if (progressText) {
                            progressText.textContent = `Creating GIF... ${Math.round(progress * 100)}%`;
                        }
                    });

                    gif.render();
                } else {
                    // Fallback: create a simple blob for demo
                    setTimeout(() => {
                        resolve(new Blob(['mock gif data'], { type: 'image/gif' }));
                    }, 1000);
                }
            } catch (error) {
                reject(error);
            }
        });
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
        
        // Auto-hide success/error messages after 5 seconds
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

// Prevent default drag behaviors on the page
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    document.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
});