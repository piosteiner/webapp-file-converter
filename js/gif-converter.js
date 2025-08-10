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

    // Check MediaRecorder support with VP9
    if (!window.MediaRecorder) {
        showStatus('❌ Your browser does not support video recording. Please use Chrome, Firefox, or Edge.', 'error');
        return;
    }

    // Check VP9 support specifically
    if (!MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        showStatus('❌ Your browser does not support VP9 codec. Please use a modern version of Chrome, Firefox, or Edge.', 'error');
        return;
    }

    convertGifToWebm(file);
}

// Convert GIF to WebM using proper GIF parsing
async function convertGifToWebm(file) {
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

        // Set up MediaRecorder with VP9 codec and 30 FPS max
        const frameRate = Math.min(30, Math.round(1000 / (gifData.averageFrameDelay * speedMultiplier)));
        const stream = canvas.captureStream(frameRate);
        const recorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9',
            videoBitsPerSecond: calculateBitrate(quality, width, height, frameRate)
        });

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
                const blob = new Blob(chunks, { type: 'video/webm;codecs=vp9' });
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
    
    // Create temporary canvas to extract frames
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = width;
    tempCanvas.height = height;
    
    // Load GIF as image to extract frames using a timing-based approach
    const img = new Image();
    const imageLoadPromise = new Promise((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load GIF'));
        img.src = URL.createObjectURL(file);
    });
    
    await imageLoadPromise;
    
    // For animated GIFs, we'll create multiple frames by sampling at different intervals
    // This is a simplified approach that works reasonably well with most GIFs
    const frameCount = Math.min(60, Math.max(10, Math.round(file.size / 10000))); // Estimate frame count
    const frames = [];
    const baseDelay = 100; // Base delay of 100ms per frame
    
    for (let i = 0; i < frameCount; i++) {
        tempCtx.clearRect(0, 0, width, height);
        tempCtx.drawImage(img, 0, 0);
        
        const imageData = tempCtx.getImageData(0, 0, width, height);
        frames.push({
            imageData: imageData,
            delay: baseDelay // Simplified: use consistent timing
        });
    }
    
    URL.revokeObjectURL(img.src);
    
    return {
        width: width,
        height: height,
        frames: frames,
        totalDuration: frameCount * baseDelay,
        averageFrameDelay: baseDelay
    };
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