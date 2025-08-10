// GIF to WebM Converter - Pure browser APIs only, zero dependencies
// Uses Canvas API + MediaRecorder for reliable conversion

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
        showStatus('❌ Your browser does not support video recording. Please use Chrome, Firefox, or Edge.', 'error');
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
        showStatus('❌ Your browser does not support WebM recording. Please use Chrome, Firefox, or Edge.', 'error');
        return;
    }

    convertGifToWebm(file, supportedType);
}

// Convert GIF to WebM using pure browser APIs
async function convertGifToWebm(file, mimeType) {
    isProcessing = true;
    const dropZone = document.getElementById('dropZone');
    const maxSize = parseInt(document.getElementById('maxSize').value) * 1024;
    const quality = parseInt(document.getElementById('crf').value);
    
    dropZone.classList.add('processing');
    showStatus('<span class="spinner"></span>Loading GIF...', 'processing');

    try {
        // Create image element to load the GIF
        const img = new Image();
        const imageLoadPromise = new Promise((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Failed to load GIF image'));
            img.src = URL.createObjectURL(file);
        });

        await imageLoadPromise;
        console.log(`Loaded GIF: ${img.naturalWidth}x${img.naturalHeight}`);
        
        showStatus('<span class="spinner"></span>Converting to WebM...', 'processing');

        // Calculate dimensions based on mode
        const { width, height } = calculateDimensions(img.naturalWidth, img.naturalHeight);
        
        // Create canvas for rendering
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = width;
        canvas.height = height;

        // Set up MediaRecorder with calculated settings
        const frameRate = 15; // 15 FPS for smaller file sizes
        const stream = canvas.captureStream(frameRate);
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

        // Create a looping animation by drawing the GIF multiple times
        await renderGifAnimation(ctx, img, width, height, frameRate);

        // Stop recording
        recorder.stop();

        // Wait for recording to finish
        const webmBlob = await new Promise((resolve) => {
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: mimeType });
                resolve(blob);
            };
        });

        // Clean up
        URL.revokeObjectURL(img.src);

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
                `<strong>Format:</strong> WebM`,
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
                `Try reducing quality or using a smaller GIF.`,
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
    const baseBitrate = Math.max(150000, pixels * 0.05); // Lower base bitrate for smaller files
    
    // Quality affects bitrate (higher quality number = lower bitrate)
    const qualityMultiplier = Math.max(0.1, (63 - quality) / 43);
    
    return Math.round(baseBitrate * qualityMultiplier);
}

// Render GIF animation by drawing the image multiple times with slight variations
async function renderGifAnimation(ctx, img, canvasWidth, canvasHeight, frameRate) {
    const duration = 2000; // 2 seconds of animation
    const frameCount = Math.round((duration / 1000) * frameRate);
    const frameDelay = 1000 / frameRate;
    
    for (let frame = 0; frame < frameCount; frame++) {
        // Clear canvas
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        // Add transparent background for emoji mode
        if (gifMode === 'emoji') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0)';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }
        
        // Draw the GIF image
        if (gifMode === 'emoji') {
            // Center the image in 100x100 square, maintaining aspect ratio
            const scale = Math.min(100 / img.naturalWidth, 100 / img.naturalHeight);
            const scaledWidth = img.naturalWidth * scale;
            const scaledHeight = img.naturalHeight * scale;
            const x = (100 - scaledWidth) / 2;
            const y = (100 - scaledHeight) / 2;
            
            ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
        } else {
            // Sticker mode - fill canvas while maintaining aspect ratio
            ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
        }
        
        // Add subtle animation effect by slightly scaling or rotating
        const animationProgress = frame / frameCount;
        const scale = 1 + Math.sin(animationProgress * Math.PI * 4) * 0.02; // Very subtle scale animation
        
        if (scale !== 1) {
            ctx.save();
            ctx.translate(canvasWidth / 2, canvasHeight / 2);
            ctx.scale(scale, scale);
            ctx.translate(-canvasWidth / 2, -canvasHeight / 2);
            
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            if (gifMode === 'emoji') {
                const scaleImg = Math.min(100 / img.naturalWidth, 100 / img.naturalHeight);
                const scaledWidth = img.naturalWidth * scaleImg;
                const scaledHeight = img.naturalHeight * scaleImg;
                const x = (100 - scaledWidth) / 2;
                const y = (100 - scaledHeight) / 2;
                ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
            } else {
                ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
            }
            
            ctx.restore();
        }
        
        // Wait for next frame
        await new Promise(resolve => setTimeout(resolve, frameDelay));
        
        // Update progress
        const conversionProgress = ((frame + 1) / frameCount) * 100;
        updateProgress(conversionProgress);
    }
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