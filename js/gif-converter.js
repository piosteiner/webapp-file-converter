// GIF to WebM Converter
// Professional video conversion with FFmpeg.wasm

let ffmpeg = null;
let ffmpegLoaded = false;
let gifMode = 'sticker';

document.addEventListener('DOMContentLoaded', () => {
    initializeGifConverter();
    loadFFmpeg();
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

    // Update CRF display
    crfSlider.addEventListener('input', (e) => {
        const crf = parseInt(e.target.value);
        let quality = 'Ultra High';
        if (crf > 20) quality = 'High';
        if (crf > 30) quality = 'Medium';
        if (crf > 45) quality = 'Low';
        if (crf > 55) quality = 'Very Low';
        crfValue.textContent = `${crf} (${quality})`;
    });

    // Click to browse
    dropZone.addEventListener('click', () => {
        fileInput.click();
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
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handler(files[0]);
        }
    });
}

// Load FFmpeg.wasm
async function loadFFmpeg() {
    try {
        // Check if FFmpeg is available globally
        if (typeof FFmpeg === 'undefined') {
            throw new Error('FFmpeg library not loaded. Please check your internet connection.');
        }
        
        // When loaded via CDN, FFmpeg is available directly on window
        const { FFmpeg: FFmpegClass } = FFmpeg;
        const { fetchFile } = FFmpegUtil;
        
        // Store fetchFile for global access
        window.fetchFile = fetchFile;
        
        // Create new FFmpeg instance
        ffmpeg = new FFmpegClass();
        
        // Set up event listeners
        ffmpeg.on('log', ({ message }) => {
            console.log('FFmpeg:', message);
        });

        ffmpeg.on('progress', ({ progress }) => {
            updateProgress(progress * 100);
        });

        console.log('Loading FFmpeg core...');
        
        // Load FFmpeg core with explicit CDN URLs
        await ffmpeg.load({
            coreURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
            wasmURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm',
            workerURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.worker.js'
        });
        
        ffmpegLoaded = true;
        console.log('FFmpeg loaded successfully!');
        
        const statusEl = document.getElementById('ffmpegStatus');
        statusEl.innerHTML = '✅ FFmpeg.wasm loaded and ready!';
        statusEl.classList.add('loaded');
        
        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 3000);
        
    } catch (error) {
        console.error('Failed to load FFmpeg:', error);
        const statusEl = document.getElementById('ffmpegStatus');
        statusEl.innerHTML = `❌ Failed to load FFmpeg.wasm: ${error.message}<br>Please refresh the page to try again.`;
        statusEl.style.background = 'rgba(244, 67, 54, 0.1)';
        statusEl.style.borderColor = 'rgba(244, 67, 54, 0.3)';
        statusEl.style.color = '#f44336';
    }
}

// Sanitize filename for safe downloading
function sanitizeFilename(filename) {
    // Remove file extension
    const name = filename.replace(/\.[^/.]+$/, '');
    
    // Replace problematic characters with underscores
    const sanitized = name
        .replace(/[<>:"/\\|?*]/g, '_')  // Replace invalid characters
        .replace(/\s+/g, '_')           // Replace spaces with underscores
        .replace(/,/g, '_')             // Replace commas with underscores
        .replace(/_+/g, '_')            // Replace multiple underscores with single
        .replace(/^_|_$/g, '')          // Remove leading/trailing underscores
        .slice(0, 100);                // Limit length to 100 characters
    
    return sanitized || 'converted_video'; // Fallback name if empty
}

// Handle GIF file
function handleGifFile(file) {
    clearStatusOnNewFile();
    console.log('Processing GIF file:', file.name, 'Size:', file.size, 'Type:', file.type);
    
    if (!ffmpegLoaded) {
        showStatus('❌ FFmpeg is still loading. Please wait and try again.', 'error');
        return;
    }

    if (!file.type.includes('gif')) {
        showStatus('❌ Please select a GIF file only.', 'error');
        return;
    }

    if (file.size > 100 * 1024 * 1024) {
        showStatus('❌ File too large. Please select a file under 100MB.', 'error');
        return;
    }

    if (file.size === 0) {
        showStatus('❌ File appears to be empty. Please try another file.', 'error');
        return;
    }

    convertGifToWebm(file);
}

// Convert GIF to WebM
async function convertGifToWebm(file) {
    const dropZone = document.getElementById('dropZone');
    const maxSize = parseInt(document.getElementById('maxSize').value) * 1024; // Convert to bytes
    const crf = parseInt(document.getElementById('crf').value);
    
    dropZone.classList.add('processing');
    showStatus('<span class="spinner"></span>Converting GIF to WebM...', 'processing');

    try {
        // Write input file to FFmpeg filesystem
        const inputFileName = 'input.gif';
        const outputFileName = 'output.webm';
        
        console.log('Writing file to FFmpeg filesystem...');
        await ffmpeg.writeFile(inputFileName, await window.fetchFile(file));

        // Calculate scale filter based on mode
        let scaleFilter;
        if (gifMode === 'emoji') {
            scaleFilter = 'scale=100:100:force_original_aspect_ratio=decrease,pad=100:100:(ow-iw)/2:(oh-ih)/2:black@0';
        } else {
            // Sticker mode - preserve aspect ratio, max 512px on longest side
            scaleFilter = 'scale=512:512:force_original_aspect_ratio=decrease';
        }

        // Build FFmpeg command - matches Python script exactly
        const args = [
            '-i', inputFileName,
            '-t', '3',                              // Limit to 3 seconds
            '-c:v', 'libvpx-vp9',                   // VP9 codec
            '-crf', crf.toString(),                 // Quality setting
            '-b:v', '0',                            // Use CRF mode
            '-an',                                  // Remove audio
            '-pix_fmt', 'yuva420p',                 // Support transparency
            '-vf', `${scaleFilter},fps=fps=min(30\\,source_fps)`, // Scale and limit FPS to 30
            '-f', 'webm',                           // Force WebM format
            '-y',                                   // Overwrite output
            outputFileName
        ];

        console.log('Running FFmpeg with command:', args.join(' '));

        // Run FFmpeg conversion
        await ffmpeg.exec(args);

        console.log('Reading output file...');
        // Read the output file
        const data = await ffmpeg.readFile(outputFileName);
        const blob = new Blob([data.buffer], { type: 'video/webm' });

        console.log('Conversion complete. File size:', blob.size, 'bytes');

        // Check file size
        if (blob.size <= maxSize) {
            // Success!
            const sanitizedName = sanitizeFilename(file.name);
            const suffix = gifMode === 'emoji' ? '_emoji' : '_sticker';
            const outputFilename = `${sanitizedName}${suffix}.webm`;
            downloadFile(blob, outputFilename);
            
            dropZone.classList.remove('processing');
            showStatus(`✅ GIF converted to WebM successfully!<br><strong>Size:</strong> ${(blob.size/1024).toFixed(1)} KB<br><strong>Mode:</strong> ${gifMode}`, 'success', outputFilename);
        } else {
            dropZone.classList.remove('processing');
            showStatus(`❌ File too large (${(blob.size/1024).toFixed(1)} KB).<br>Max size: ${maxSize/1024} KB<br>Try increasing CRF value (lower quality) or reducing max size limit.`, 'error');
        }

        // Clean up FFmpeg filesystem
        try {
            await ffmpeg.deleteFile(inputFileName);
            await ffmpeg.deleteFile(outputFileName);
        } catch (cleanupError) {
            console.warn('Cleanup warning:', cleanupError);
        }
        
        document.getElementById('fileInput').value = '';

    } catch (error) {
        console.error('FFmpeg conversion error:', error);
        dropZone.classList.remove('processing');
        showStatus(`❌ Conversion failed: ${error.message}`, 'error');
    }
}

// Download file
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

// Show status message
function showStatus(message, type, filename = null) {
    const status = document.getElementById('status');
    
    if (type === 'success' && filename) {
        const now = new Date();
        const timeString = now.toLocaleString();
        status.innerHTML = `${message}<br><strong>File:</strong> ${filename}<br><strong>Downloaded:</strong> ${timeString}`;
    } else {
        status.innerHTML = message;
    }
    
    status.className = `status show ${type}`;
    
    // Only auto-hide processing messages
    if (type === 'processing') {
        setTimeout(() => {
            if (status.classList.contains('processing')) {
                status.classList.remove('show');
            }
        }, 30000);
    }
}

// Clear status when starting new conversion
function clearStatusOnNewFile() {
    const status = document.getElementById('status');
    if (!status.classList.contains('processing')) {
        status.classList.remove('show');
        status.innerHTML = '';
    }
}

// Update progress (for FFmpeg)
function updateProgress(percent) {
    console.log(`Progress: ${percent.toFixed(1)}%`);
    // You can implement a progress bar here if needed
    const status = document.getElementById('status');
    if (status.classList.contains('processing')) {
        status.innerHTML = `<span class="spinner"></span>Converting GIF to WebM... ${percent.toFixed(0)}%`;
    }
}

// Prevent default drag behaviors on the page
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    document.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
});