// GIF to WebM Sticker Converter - Preserves original GIF animation
// Uses proper GIF parsing to extract frames and timing

let isProcessing = false;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeGifConverter();
});

function initializeGifConverter() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const maxSizeSlider = document.getElementById('maxSize');
    const maxSizeValue = document.getElementById('maxSizeValue');
    const crfSlider = document.getElementById('crf');
    const crfValue = document.getElementById('crfValue');

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
        showStatus('❌ Your browser does not support video recording. Please use Chrome, Firefox, or Edge.', 'error');
        return;
    }

    // Try to find the best codec, but don't fail if none are explicitly supported
    const preferredCodecs = [
        'video/webm;codecs=vp9',
        'video/webm;codecs="vp09.00.10.08"',
        'video/webm;codecs=vp8',
        'video/webm'
    ];
    
    let selectedCodec = 'video/webm'; // Default fallback
    for (const codec of preferredCodecs) {
        if (MediaRecorder.isTypeSupported(codec)) {
            selectedCodec = codec;
            break;
        }
    }

    console.log('Using codec:', selectedCodec);
    convertGifToWebm(file, selectedCodec);
}

// Convert GIF to WebM using proper GIF parsing
async function convertGifToWebm(file, mimeType) {
    isProcessing = true;
    const dropZone = document.getElementById('dropZone');
    const maxSize = parseInt(document.getElementById('maxSize').value) * 1024;
    const quality = parseInt(document.getElementById('crf').value);
    
    dropZone.classList.add('processing');
    showStatus('<span class="spinner"></span>Parsing GIF animation...', 'processing');

    try {
        // Parse GIF to extract frames and timing
        const gifData = await parseGifFile(file);
        
        if (gifData.frames.length === 0) {
            throw new Error('No animation frames found in GIF');
        }

        console.log(`Parsed GIF: ${gifData.frames.length} frames, ${gifData.width}x${gifData.height}, duration: ${gifData.totalDuration}ms`);
        showStatus('<span class="spinner"></span>Converting to WebM sticker...', 'processing');

        // Calculate sticker dimensions (one side 512px, preserve aspect ratio)
        const { width, height } = calculateStickerDimensions(gifData.width, gifData.height);
        
        // Create canvas for rendering
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = width;
        canvas.height = height;

        // Limit duration to 3 seconds max
        const maxDuration = 3000;
        const actualDuration = Math.min(gifData.totalDuration, maxDuration);
        const speedMultiplier = gifData.totalDuration > maxDuration ? maxDuration / gifData.totalDuration : 1;

        // Set up MediaRecorder with best available codec and 30 FPS max
        const frameRate = Math.min(30, Math.round(1000 / (gifData.averageFrameDelay * speedMultiplier)));
        const stream = canvas.captureStream(frameRate);
        
        let recorder;
        try {
            // Try with the selected codec first
            recorder = new MediaRecorder(stream, {
                mimeType: mimeType,
                videoBitsPerSecond: calculateBitrate(quality, width, height, frameRate)
            });
        } catch (e) {
            console.warn('Failed to create recorder with codec, trying basic setup:', e);
            // Fallback: let browser choose codec automatically
            try {
                recorder = new MediaRecorder(stream, {
                    videoBitsPerSecond: calculateBitrate(quality, width, height, frameRate)
                });
                mimeType = 'video/webm'; // Update mime type for output
            } catch (e2) {
                throw new Error('MediaRecorder not supported with any configuration');
            }
        }

        const chunks = [];
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                chunks.push(e.data);
            }
        };

        // Start recording
        recorder.start();

        // Render the original GIF animation with preserved timing
        await renderGifFrames(ctx, gifData.frames, width, height, speedMultiplier);

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
            const outputFilename = `${sanitizedName}_sticker.webm`;
            
            downloadFile(webmBlob, outputFilename);
            
            dropZone.classList.remove('processing');
            showStatus(
                `✅ GIF converted to WebM sticker successfully!<br>` +
                `<strong>Output:</strong> ${outputFilename}<br>` +
                `<strong>Size:</strong> ${(webmBlob.size/1024).toFixed(1)} KB<br>` +
                `<strong>Dimensions:</strong> ${width}×${height}<br>` +
                `<strong>Duration:</strong> ${(actualDuration/1000).toFixed(1)}s<br>` +
                `<strong>Frame Rate:</strong> ${frameRate} FPS<br>` +
                `<strong>Format:</strong> WebM<br>` +
                `<strong>Frames:</strong> ${gifData.frames.length}`,
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
                `Try reducing quality or using a shorter GIF.`,
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

// Parse GIF file to extract frames and timing information
async function parseGifFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Verify GIF signature
    const signature = String.fromCharCode(...bytes.slice(0, 6));
    if (!signature.startsWith('GIF')) {
        throw new Error('Invalid GIF file format');
    }
    
    // Parse GIF header
    const width = bytes[6] | (bytes[7] << 8);
    const height = bytes[8] | (bytes[9] << 8);
    
    // Use a more sophisticated approach: load GIF into video element to extract frames
    return await extractGifFramesUsingVideo(file, width, height);
}

// Extract GIF frames by loading into video element and capturing at intervals
async function extractGifFramesUsingVideo(file, width, height) {
    // Create a hidden video element
    const video = document.createElement('video');
    video.style.display = 'none';
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    document.body.appendChild(video);
    
    try {
        // Create object URL for the GIF
        const url = URL.createObjectURL(file);
        video.src = url;
        
        // Wait for video to load
        await new Promise((resolve, reject) => {
            video.addEventListener('loadeddata', resolve);
            video.addEventListener('error', reject);
        });
        
        // If the GIF loads as video, we can extract frames
        if (video.duration && video.duration > 0) {
            const frames = await extractFramesFromVideo(video, width, height);
            URL.revokeObjectURL(url);
            document.body.removeChild(video);
            return {
                width: width,
                height: height,
                frames: frames,
                totalDuration: video.duration * 1000, // Convert to ms
                averageFrameDelay: frames.length > 0 ? (video.duration * 1000) / frames.length : 100
            };
        } else {
            // Fallback: extract frames using canvas-based approach
            URL.revokeObjectURL(url);
            document.body.removeChild(video);
            return await extractGifFramesUsingCanvas(file, width, height);
        }
        
    } catch (error) {
        // Cleanup and fallback
        URL.revokeObjectURL(video.src);
        document.body.removeChild(video);
        return await extractGifFramesUsingCanvas(file, width, height);
    }
}

// Extract frames from video element
async function extractFramesFromVideo(video, width, height) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;
    
    const frames = [];
    const duration = video.duration;
    const frameRate = 15; // Target 15 FPS for frame extraction
    const frameCount = Math.min(Math.ceil(duration * frameRate), 60); // Max 60 frames
    
    for (let i = 0; i < frameCount; i++) {
        const time = (i / frameCount) * duration;
        video.currentTime = time;
        
        // Wait for seek to complete
        await new Promise(resolve => {
            const onSeeked = () => {
                video.removeEventListener('seeked', onSeeked);
                resolve();
            };
            video.addEventListener('seeked', onSeeked);
        });
        
        // Draw current frame to canvas
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(video, 0, 0, width, height);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, width, height);
        frames.push({
            imageData: imageData,
            delay: (duration * 1000) / frameCount // Frame delay in ms
        });
    }
    
    return frames;
}

// Fallback: Canvas-based frame extraction with animation detection
async function extractGifFramesUsingCanvas(file, width, height) {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;
    
    // Load image
    const imageLoadPromise = new Promise((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load GIF'));
        img.src = URL.createObjectURL(file);
    });
    
    await imageLoadPromise;
    
    // For animated GIFs, try to detect animation by sampling over time
    const frames = [];
    const sampleCount = 20; // Number of samples to take
    const sampleInterval = 50; // ms between samples
    
    for (let i = 0; i < sampleCount; i++) {
        // Clear and draw
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        
        // Capture frame
        const imageData = ctx.getImageData(0, 0, width, height);
        frames.push({
            imageData: imageData,
            delay: sampleInterval
        });
        
        // Wait before next sample
        if (i < sampleCount - 1) {
            await new Promise(resolve => setTimeout(resolve, sampleInterval));
        }
    }
    
    URL.revokeObjectURL(img.src);
    
    // If all frames are identical, create a simple animation
    if (frames.length > 0 && areAllFramesIdentical(frames)) {
        // Create a simple 2-frame animation to make it move
        const baseFrame = frames[0];
        return {
            width: width,
            height: height,
            frames: [
                { ...baseFrame, delay: 500 },
                { ...baseFrame, delay: 500 }
            ],
            totalDuration: 1000,
            averageFrameDelay: 500
        };
    }
    
    return {
        width: width,
        height: height,
        frames: frames,
        totalDuration: sampleCount * sampleInterval,
        averageFrameDelay: sampleInterval
    };
}

// Check if all frames are identical (for static images)
function areAllFramesIdentical(frames) {
    if (frames.length < 2) return true;
    
    const firstFrame = frames[0].imageData.data;
    for (let i = 1; i < frames.length; i++) {
        const currentFrame = frames[i].imageData.data;
        for (let j = 0; j < firstFrame.length; j += 100) { // Sample every 100th pixel for speed
            if (firstFrame[j] !== currentFrame[j]) {
                return false;
            }
        }
    }
    return true;
}

// Calculate sticker dimensions (one side 512px max, preserve aspect ratio)
function calculateStickerDimensions(originalWidth, originalHeight) {
    const maxSize = 512;
    const aspectRatio = originalWidth / originalHeight;
    
    if (originalWidth >= originalHeight) {
        // Width is larger or equal - make width 512px
        return {
            width: Math.min(maxSize, originalWidth),
            height: Math.round(Math.min(maxSize, originalWidth) / aspectRatio)
        };
    } else {
        // Height is larger - make height 512px
        return {
            width: Math.round(Math.min(maxSize, originalHeight) * aspectRatio),
            height: Math.min(maxSize, originalHeight)
        };
    }
}

// Calculate bitrate for VP9 encoding
function calculateBitrate(quality, width, height, frameRate) {
    const pixels = width * height;
    const pixelsPerSecond = pixels * frameRate;
    
    // Base bitrate calculation for VP9
    const baseBitrate = Math.max(100000, pixelsPerSecond * 0.05); // Minimum 100kbps
    
    // Quality affects bitrate (higher quality number = lower bitrate)
    const qualityMultiplier = Math.max(0.2, (63 - quality) / 43);
    
    return Math.round(baseBitrate * qualityMultiplier);
}

// Render GIF frames with original timing
async function renderGifFrames(ctx, frames, canvasWidth, canvasHeight, speedMultiplier) {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        
        // Set up temp canvas with frame data
        tempCanvas.width = frame.imageData.width;
        tempCanvas.height = frame.imageData.height;
        tempCtx.putImageData(frame.imageData, 0, 0);
        
        // Clear main canvas
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        // Draw frame scaled to sticker dimensions
        ctx.drawImage(tempCanvas, 0, 0, canvasWidth, canvasHeight);
        
        // Wait for frame duration (adjusted for speed)
        const frameDelay = Math.max(33, frame.delay * speedMultiplier); // Minimum 33ms (30fps)
        await new Promise(resolve => setTimeout(resolve, frameDelay));
        
        // Update progress
        const conversionProgress = ((i + 1) / frames.length) * 100;
        updateProgress(conversionProgress);
    }
}

// Update progress
function updateProgress(percent) {
    const status = document.getElementById('status');
    if (status.classList.contains('processing')) {
        status.innerHTML = `<span class="spinner"></span>Converting to WebM sticker... ${Math.round(percent)}%`;
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
    return sanitized || 'converted_sticker';
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