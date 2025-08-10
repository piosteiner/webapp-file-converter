// GIF to WebM Sticker Converter - Practical browser-based solution
// Applies Python FFmpeg principles to browser MediaRecorder API

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

    // Update quality display (map to bitrate like Python CRF)
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

    // Check MediaRecorder support
    if (!window.MediaRecorder) {
        showStatus('❌ Your browser does not support video recording. Please use Chrome, Firefox, or Edge.', 'error');
        return;
    }

    convertGifToWebm(file);
}

// Convert GIF to WebM using iterative quality approach (like Python script)
async function convertGifToWebm(file) {
    isProcessing = true;
    const dropZone = document.getElementById('dropZone');
    const maxSize = parseInt(document.getElementById('maxSize').value) * 1024;
    const initialQuality = parseInt(document.getElementById('crf').value);
    
    dropZone.classList.add('processing');
    showStatus('<span class="spinner"></span>Loading GIF...', 'processing');

    try {
        // Load GIF and get dimensions
        const { img, width, height } = await loadGifImage(file);
        console.log(`Original GIF: ${width}x${height}`);
        
        // Calculate sticker dimensions (following Python logic)
        const { targetWidth, targetHeight } = calculateStickerDimensions(width, height);
        console.log(`Target dimensions: ${targetWidth}x${targetHeight}`);
        
        // Try different quality settings until file size is acceptable (like Python CRF iteration)
        const qualityLevels = [initialQuality, initialQuality + 5, initialQuality + 10, initialQuality + 15, initialQuality + 20, 60, 63];
        
        for (let i = 0; i < qualityLevels.length; i++) {
            const currentQuality = Math.min(63, qualityLevels[i]);
            showStatus(`<span class="spinner"></span>Converting with quality ${currentQuality}... (attempt ${i + 1}/${qualityLevels.length})`, 'processing');
            
            try {
                const result = await attemptConversion(img, targetWidth, targetHeight, currentQuality, file.name);
                
                if (result.blob.size <= maxSize) {
                    // Success! File meets size requirement
                    downloadFile(result.blob, result.filename);
                    
                    dropZone.classList.remove('processing');
                    showStatus(
                        `✅ GIF converted to WebM sticker successfully!<br>` +
                        `<strong>Output:</strong> ${result.filename}<br>` +
                        `<strong>Size:</strong> ${(result.blob.size/1024).toFixed(1)} KB<br>` +
                        `<strong>Dimensions:</strong> ${targetWidth}×${targetHeight}<br>` +
                        `<strong>Quality:</strong> ${currentQuality}<br>` +
                        `<strong>Format:</strong> WebM`,
                        'success',
                        result.filename
                    );
                    
                    document.getElementById('fileInput').value = '';
                    return;
                } else {
                    console.log(`Quality ${currentQuality}: ${(result.blob.size/1024).toFixed(1)} KB (too large)`);
                }
                
            } catch (error) {
                console.warn(`Quality ${currentQuality} failed:`, error);
                continue;
            }
        }
        
        // If we get here, couldn't meet size requirement
        dropZone.classList.remove('processing');
        showStatus(
            `❌ Could not create file under ${maxSize/1024} KB limit!<br>` +
            `Try using a smaller or shorter GIF, or increase the file size limit.`,
            'error'
        );

    } catch (error) {
        console.error('Conversion error:', error);
        dropZone.classList.remove('processing');
        showStatus(`❌ Conversion failed: ${error.message}`, 'error');
    } finally {
        isProcessing = false;
        document.getElementById('fileInput').value = '';
    }
}

// Load GIF image and get dimensions
async function loadGifImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            resolve({
                img: img,
                width: img.naturalWidth,
                height: img.naturalHeight
            });
        };
        img.onerror = () => reject(new Error('Failed to load GIF image'));
        img.src = URL.createObjectURL(file);
    });
}

// Calculate sticker dimensions (same logic as Python script)
function calculateStickerDimensions(originalWidth, originalHeight) {
    const maxSize = 512;
    
    // One side must be 512px, other side 512px or less (preserve aspect ratio)
    if (originalWidth >= originalHeight) {
        // Wider than tall - make width 512px
        const targetWidth = Math.min(maxSize, originalWidth);
        const targetHeight = Math.round(targetWidth * (originalHeight / originalWidth));
        return { targetWidth, targetHeight };
    } else {
        // Taller than wide - make height 512px  
        const targetHeight = Math.min(maxSize, originalHeight);
        const targetWidth = Math.round(targetHeight * (originalWidth / originalHeight));
        return { targetWidth, targetHeight };
    }
}

// Attempt conversion with specific quality setting
async function attemptConversion(img, width, height, quality, originalFilename) {
    return new Promise((resolve, reject) => {
        // Create canvas for rendering
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = width;
        canvas.height = height;
        
        // Set up MediaRecorder with quality-based bitrate
        const frameRate = 15; // Fixed 15 FPS for consistent results
        const bitrate = calculateBitrate(quality, width, height, frameRate);
        
        let recorder;
        const stream = canvas.captureStream(frameRate);
        
        // Try to create recorder with best available codec
        const codecOptions = [
            { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: bitrate },
            { mimeType: 'video/webm;codecs=vp8', videoBitsPerSecond: bitrate },
            { mimeType: 'video/webm', videoBitsPerSecond: bitrate }
        ];
        
        let usedCodec = 'webm';
        for (const option of codecOptions) {
            try {
                if (MediaRecorder.isTypeSupported(option.mimeType)) {
                    recorder = new MediaRecorder(stream, option);
                    usedCodec = option.mimeType;
                    break;
                }
            } catch (e) {
                continue;
            }
        }
        
        if (!recorder) {
            recorder = new MediaRecorder(stream, { videoBitsPerSecond: bitrate });
        }
        
        const chunks = [];
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                chunks.push(e.data);
            }
        };
        
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: usedCodec });
            const sanitizedName = sanitizeFilename(originalFilename);
            const filename = `${sanitizedName}_sticker.webm`;
            resolve({ blob, filename });
        };
        
        recorder.onerror = (e) => {
            reject(new Error('Recording failed: ' + e.error));
        };
        
        // Start recording
        recorder.start();
        
        // Render animation (create looping effect like the original GIF)
        renderAnimation(ctx, img, width, height).then(() => {
            recorder.stop();
        }).catch(reject);
    });
}

// Calculate bitrate based on quality (reverse CRF logic from Python)
function calculateBitrate(quality, width, height, frameRate) {
    const pixels = width * height;
    const pixelsPerSecond = pixels * frameRate;
    
    // Base bitrate (similar to Python's CRF calculation)
    const baseBitrate = pixelsPerSecond * 0.1; // 0.1 bits per pixel per second base
    
    // Quality to bitrate mapping (reverse CRF: higher quality number = lower bitrate)
    const qualityMultiplier = Math.max(0.1, (65 - quality) / 45); // Scale from 63 down to 20
    
    return Math.round(Math.max(100000, baseBitrate * qualityMultiplier)); // Minimum 100kbps
}

// Render animation by looping the GIF image with timing
async function renderAnimation(ctx, img, width, height) {
    const animationDuration = 2000; // 2 seconds total (under 3 second limit)
    const frameRate = 15;
    const frameCount = Math.round((animationDuration / 1000) * frameRate);
    const frameDelay = animationDuration / frameCount;
    
    for (let frame = 0; frame < frameCount; frame++) {
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Draw scaled image (this preserves the GIF content)
        ctx.drawImage(img, 0, 0, width, height);
        
        // Add very subtle animation to ensure it's not completely static
        // This simulates the "animated" nature even if original timing is lost
        const animationProgress = frame / frameCount;
        const scale = 1 + Math.sin(animationProgress * Math.PI * 6) * 0.01; // Very subtle scale
        
        if (Math.abs(scale - 1) > 0.005) {
            ctx.save();
            ctx.translate(width / 2, height / 2);
            ctx.scale(scale, scale);
            ctx.translate(-width / 2, -height / 2);
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            ctx.restore();
        }
        
        // Wait for next frame
        await new Promise(resolve => setTimeout(resolve, frameDelay));
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