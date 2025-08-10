// GIF to WebM Converter - Browser-based with proper GIF parsing
// Uses gifuct-js for GIF parsing + Canvas API + MediaRecorder for WebM output

let isProcessing = false;
let gifMode = 'sticker';

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeGifConverter();
});

function initializeGifConverter() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const modeButtons = document.querySelectorAll('.mode-btn');
    const maxSizeSlider = document.getElementById('maxSize');
    const maxSizeValue = document.getElementById('maxSizeValue');
    const crfSlider = document.getElementById('crf');
    const crfValue = document.getElementById('crfValue');

    // Mode selection
    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            modeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gifMode = btn.dataset.mode;
        });
    });

    // Update max size display
    maxSizeSlider.addEventListener('input', (e) => {
        maxSizeValue.textContent = e.target.value + ' KB';
    });

    // Update quality display
    crfSlider.addEventListener('input', (e) => {
        const quality = parseInt(e.target.value);
        let qualityText = 'Ultra High';
        if (quality > 20) qualityText = 'High';
        if (quality > 30) qualityText = 'Medium';
        if (quality > 45) qualityText = 'Low';
        if (quality > 55) qualityText = 'Very Low';
        crfValue.textContent = `${quality} (${qualityText})`;
    });

    // Click to browse
    dropZone.addEventListener('click', () => {
        if (!isProcessing) {
            fileInput.click();
        }
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleGifFile(e.target.files[0]);
        }
    });

    // Drag and drop events
    setupDragDrop(dropZone, handleGifFile);
}

// Drag and drop setup
function setupDragDrop(dropZone, handler) {
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (!isProcessing) {
            dropZone.classList.add('dragover');
        }
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        
        if (!isProcessing) {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handler(files[0]);
            }
        }
    });
}

// Handle GIF file
function handleGifFile(file) {
    if (isProcessing) {
        showStatus('❌ Please wait for current conversion to complete.', 'error');
        return;
    }

    clearStatusOnNewFile();
    console.log('Processing GIF file:', file.name, 'Size:', file.size, 'Type:', file.type);

    if (!file.type.includes('gif')) {
        showStatus('❌ Please select a GIF file only.', 'error');
        return;
    }

    if (file.size > 50 * 1024 * 1024) {
        showStatus('❌ File too large. Please select a file under 50MB.', 'error');
        return;
    }

    if (file.size === 0) {
        showStatus('❌ File appears to be empty. Please try another file.', 'error');
        return;
    }

    // Check MediaRecorder support
    if (!window.MediaRecorder) {
        showStatus('❌ Your browser does not support video recording. Please try a modern browser like Chrome or Firefox.', 'error');
        return;
    }

    // Check WebM support
    const supportedTypes = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8', 
        'video/webm'
    ];
    
    const supportedType = supportedTypes.find(type => MediaRecorder.isTypeSupported(type));
    if (!supportedType) {
        showStatus('❌ Your browser does not support WebM recording. Please try Chrome or Firefox.', 'error');
        return;
    }

    convertGifToWebm(file, supportedType);
}

// Convert GIF to WebM using gifuct-js + Canvas + MediaRecorder
async function convertGifToWebm(file, mimeType) {
    isProcessing = true;
    const dropZone = document.getElementById('dropZone');
    const maxSize = parseInt(document.getElementById('maxSize').value) * 1024;
    const quality = parseInt(document.getElementById('crf').value);
    
    dropZone.classList.add('processing');
    showStatus('<span class="spinner"></span>Parsing GIF...', 'processing');

    try {
        // Parse GIF using gifuct-js
        const buffer = await file.arrayBuffer();
        
        // Check if gifuct-js is loaded
        if (typeof gifuct === 'undefined') {
            throw new Error('GIF parsing library not loaded. Please refresh the page.');
        }
        
        const gif = gifuct.parseGIF(buffer);
        const frames = gifuct.decompressFrames(gif, true);
        
        if (frames.length === 0) {
            throw new Error('No frames found in GIF');
        }

        console.log(`Parsed GIF: ${frames.length} frames, ${gif.lsd.width}x${gif.lsd.height}`);
        showStatus('<span class="spinner"></span>Converting to WebM...', 'processing');

        // Calculate dimensions based on mode
        const { width, height } = calculateDimensions(gif.lsd.width, gif.lsd.height);
        
        // Create canvas for rendering
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = width;
        canvas.height = height;

        // Set up MediaRecorder
        const stream = canvas.captureStream();
        const recorder = new MediaRecorder(stream, {
            mimeType: mimeType,
            videoBitsPerSecond: calculateBitrate(quality, width, height)
        });

        const chunks = [];
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                chunks.push(e.data);
            }
        };

        // Start recording
        recorder.start();

        // Render GIF frames to canvas
        await renderGifFrames(ctx, frames, gif.lsd.width, gif.lsd.height, width, height);

        // Stop recording
        recorder.stop();

        // Wait for recording to finish
        const webmBlob = await new Promise((resolve) => {
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: mimeType });
                resolve(blob);
            };
        });

        console.log(`Conversion complete. Size: ${webmBlob.size} bytes (${(webmBlob.size/1024).toFixed(1)} KB)`);

        // Check file size
        if (webmBlob.size <= maxSize) {
            // Success - download the file
            const sanitizedName = sanitizeFilename(file.name);
            const suffix = gifMode === 'emoji' ? '_emoji' : '_sticker';
            const outputFilename = `${sanitizedName}${suffix}.webm`;
            
            downloadFile(webmBlob, outputFilename);
            
            dropZone.classList.remove('processing');
            showStatus(
                `✅ GIF converted successfully!<br>` +
                `<strong>Output:</strong> ${outputFilename}<br>` +
                `<strong>Size:</strong> ${(webmBlob.size/1024).toFixed(1)} KB<br>` +
                `<strong>Mode:</strong> ${gifMode}<br>` +
                `<strong>Dimensions:</strong> ${width}×${height}<br>` +
                `<strong>Frames:</strong> ${frames.length}`,
                'success',
                outputFilename
            );
        } else {
            // File too large
            dropZone.classList.remove('processing');
            showStatus(
                `❌ Output file too large!<br>` +
                `<strong>Size:</strong> ${(webmBlob.size/1024).toFixed(1)} KB<br>` +
                `<strong>Limit:</strong> ${maxSize/1024} KB<br>` +
                `Try reducing quality or using a smaller/shorter GIF.`,
                'error'
            );
        }

        document.getElementById('fileInput').value = '';

    } catch (error) {
        console.error('Conversion error:', error);
        dropZone.classList.remove('processing');
        showStatus(`❌ Conversion failed: ${error.message}`, 'error');
    } finally {
        isProcessing = false;
    }
}

// Calculate output dimensions based on mode
function calculateDimensions(originalWidth, originalHeight) {
    if (gifMode === 'emoji') {
        return { width: 100, height: 100 };
    } else {
        // Sticker mode - preserve aspect ratio, max 512px
        const maxSize = 512;
        const aspectRatio = originalWidth / originalHeight;
        
        if (originalWidth > originalHeight) {
            const width = Math.min(maxSize, originalWidth);
            return {
                width: Math.round(width),
                height: Math.round(width / aspectRatio)
            };
        } else {
            const height = Math.min(maxSize, originalHeight);
            return {
                width: Math.round(height * aspectRatio),
                height: Math.round(height)
            };
        }
    }
}

// Calculate bitrate based on quality setting
function calculateBitrate(quality, width, height) {
    const pixels = width * height;
    const baseBitrate = Math.max(200000, pixels * 0.08); // Minimum 200kbps
    
    // Quality affects bitrate (lower quality = higher number = lower bitrate)
    const qualityMultiplier = Math.max(0.1, (63 - quality) / 43);
    
    return Math.round(baseBitrate * qualityMultiplier);
}

// Render GIF frames to canvas with proper timing
async function renderGifFrames(ctx, frames, originalWidth, originalHeight, canvasWidth, canvasHeight) {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = originalWidth;
    tempCanvas.height = originalHeight;
    
    // Calculate total duration and limit to 3 seconds
    const totalDelay = frames.reduce((sum, frame) => sum + frame.delay, 0);
    const maxDuration = 3000; // 3 seconds
    const speedMultiplier = totalDelay > maxDuration ? maxDuration / totalDelay : 1;
    
    let frameIndex = 0;
    const startTime = Date.now();
    
    // Render frames with timing
    for (const frame of frames) {
        const frameDelay = Math.max(50, frame.delay * speedMultiplier); // Minimum 50ms per frame
        
        // Clear temp canvas
        tempCtx.clearRect(0, 0, originalWidth, originalHeight);
        
        // Create ImageData from frame
        const imageData = tempCtx.createImageData(originalWidth, originalHeight);
        imageData.data.set(frame.patch);
        tempCtx.putImageData(imageData, 0, 0);
        
        // Clear main canvas
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        // Draw frame to main canvas
        if (gifMode === 'emoji') {
            // Center the image in 100x100 square
            const scale = Math.min(100 / originalWidth, 100 / originalHeight);
            const scaledWidth = originalWidth * scale;
            const scaledHeight = originalHeight * scale;
            const x = (100 - scaledWidth) / 2;
            const y = (100 - scaledHeight) / 2;
            
            ctx.drawImage(tempCanvas, x, y, scaledWidth, scaledHeight);
        } else {
            // Scale to fit canvas while preserving aspect ratio
            ctx.drawImage(tempCanvas, 0, 0, canvasWidth, canvasHeight);
        }
        
        // Wait for frame duration
        await new Promise(resolve => setTimeout(resolve, frameDelay));
        
        frameIndex++;
        
        // Update progress
        const progress = (frameIndex / frames.length) * 100;
        updateProgress(progress);
    }
    
    // Hold the last frame for a moment
    await new Promise(resolve => setTimeout(resolve, 200));
}

// Update progress
function updateProgress(percent) {
    const status = document.getElementById('status');
    if (status.classList.contains('processing')) {
        status.innerHTML = `<span class="spinner"></span>Converting to WebM... ${Math.round(percent)}%`;
    }
}

// Utility functions
function sanitizeFilename(filename) {
    const name = filename.replace(/\.[^/.]+$/, '');
    const sanitized = name
        .replace(/[<>:"/\\|?*]/g, '_')
        .replace(/\s+/g, '_')
        .replace(/,/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 100);
    return sanitized || 'converted_video';
}

function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function showStatus(message, type, filename = null) {
    const status = document.getElementById('status');
    
    if (type === 'success' && filename) {
        const now = new Date();
        const timeString = now.toLocaleString();
        status.innerHTML = message + `<br><strong>Downloaded:</strong> ${timeString}`;
    } else {
        status.innerHTML = message;
    }
    
    status.className = `status show ${type}`;
    
    if (type === 'processing') {
        setTimeout(() => {
            if (status.classList.contains('processing')) {
                status.classList.remove('show');
            }
        }, 30000);
    }
}

function clearStatusOnNewFile() {
    const status = document.getElementById('status');
    if (!status.classList.contains('processing')) {
        status.classList.remove('show');
        status.innerHTML = '';
    }
}

// Prevent default drag behaviors on the page
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    document.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
});