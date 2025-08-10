// GIF to WebM Converter - Updated for FFmpeg.wasm v0.12+
// This version uses the new v0.12+ API

let ffmpeg = null;
let ffmpegLoaded = false;
let gifMode = 'sticker';

// Initialize when DOM is ready
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

// Load FFmpeg.wasm using v0.12+ API
async function loadFFmpeg() {
    const statusEl = document.getElementById('ffmpegStatus');
    
    try {
        console.log('Initializing FFmpeg v0.12+...');
        
        // Check if FFmpeg is available
        if (typeof FFmpeg === 'undefined') {
            throw new Error('FFmpeg library not loaded. Please check your internet connection.');
        }
        
        // Use the v0.12+ API
        const { FFmpeg } = FFmpeg;
        const { fetchFile } = FFmpegUtil;
        
        // Create FFmpeg instance with v0.12+ API
        ffmpeg = new FFmpeg();
        
        // Store fetchFile globally for later use
        window.fetchFile = fetchFile;
        
        // Set up logging
        ffmpeg.on('log', ({ message }) => {
            console.log('FFmpeg:', message);
        });
        
        // Set up progress tracking
        ffmpeg.on('progress', ({ progress }) => {
            updateProgress(progress * 100);
        });
        
        console.log('Loading FFmpeg core files...');
        statusEl.innerHTML = '<span class="spinner"></span>Loading FFmpeg core (this may take a moment)...';
        
        // Load FFmpeg with the correct base URL for v0.12+
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
        await ffmpeg.load({
            coreURL: await fetchFile(`${baseURL}/ffmpeg-core.js`),
            wasmURL: await fetchFile(`${baseURL}/ffmpeg-core.wasm`),
        });
        
        ffmpegLoaded = true;
        console.log('FFmpeg loaded successfully!');
        
        // Update status
        statusEl.innerHTML = '✅ FFmpeg.wasm loaded and ready!';
        statusEl.classList.add('loaded');
        
        // Hide status after 3 seconds
        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 3000);
        
    } catch (error) {
        console.error('FFmpeg loading error:', error);
        
        // Show error with retry option
        statusEl.innerHTML = `
            ❌ Failed to load FFmpeg.wasm<br>
            <small>${error.message}</small><br>
            <button onclick="location.reload()" style="
                margin-top: 10px;
                padding: 8px 16px;
                background: #667eea;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
            ">Refresh Page</button>
        `;
        statusEl.classList.remove('loaded');
        statusEl.style.background = 'rgba(244, 67, 54, 0.1)';
        statusEl.style.borderColor = 'rgba(244, 67, 54, 0.3)';
        statusEl.style.color = '#f44336';
    }
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

// Convert GIF to WebM using v0.12+ API
async function convertGifToWebm(file) {
    const dropZone = document.getElementById('dropZone');
    const maxSize = parseInt(document.getElementById('maxSize').value) * 1024;
    const crf = parseInt(document.getElementById('crf').value);
    
    dropZone.classList.add('processing');
    showStatus('<span class="spinner"></span>Converting GIF to WebM...', 'processing');

    try {
        // Write input file using v0.12+ API
        console.log('Writing input file...');
        await ffmpeg.writeFile('input.gif', await window.fetchFile(file));

        // Calculate scale filter based on mode
        let scaleFilter;
        if (gifMode === 'emoji') {
            scaleFilter = 'scale=100:100:force_original_aspect_ratio=decrease,pad=100:100:(ow-iw)/2:(oh-ih)/2:black@0';
        } else {
            // Sticker mode - preserve aspect ratio, max 512px on longest side
            scaleFilter = 'scale=512:512:force_original_aspect_ratio=decrease';
        }

        // FFmpeg command arguments for v0.12+
        console.log('Running FFmpeg conversion...');
        await ffmpeg.exec([
            '-i', 'input.gif',
            '-t', '3',                              // Limit to 3 seconds
            '-c:v', 'libvpx-vp9',                   // VP9 codec
            '-crf', crf.toString(),                 // Quality setting
            '-b:v', '0',                            // Use CRF mode
            '-an',                                  // Remove audio
            '-pix_fmt', 'yuva420p',                 // Support transparency
            '-vf', `${scaleFilter},fps=30`,         // Scale and limit FPS to 30
            '-auto-alt-ref', '0',                   // Better compatibility
            'output.webm'
        ]);
        
        // Read output file using v0.12+ API
        console.log('Reading output file...');
        const data = await ffmpeg.readFile('output.webm');
        const blob = new Blob([data], { type: 'video/webm' });
        
        console.log(`Conversion complete. Size: ${blob.size} bytes (${(blob.size/1024).toFixed(1)} KB)`);

        // Check file size
        if (blob.size <= maxSize) {
            // Success - download the file
            const sanitizedName = sanitizeFilename(file.name);
            const suffix = gifMode === 'emoji' ? '_emoji' : '_sticker';
            const outputFilename = `${sanitizedName}${suffix}.webm`;
            
            downloadFile(blob, outputFilename);
            
            dropZone.classList.remove('processing');
            showStatus(
                `✅ GIF converted successfully!<br>` +
                `<strong>Output:</strong> ${outputFilename}<br>` +
                `<strong>Size:</strong> ${(blob.size/1024).toFixed(1)} KB<br>` +
                `<strong>Mode:</strong> ${gifMode}`,
                'success',
                outputFilename
            );
        } else {
            // File too large
            dropZone.classList.remove('processing');
            showStatus(
                `❌ Output file too large!<br>` +
                `<strong>Size:</strong> ${(blob.size/1024).toFixed(1)} KB<br>` +
                `<strong>Limit:</strong> ${maxSize/1024} KB<br>` +
                `Try increasing CRF value (lower quality) to reduce file size.`,
                'error'
            );
        }

        // Cleanup using v0.12+ API
        try {
            await ffmpeg.deleteFile('input.gif');
            await ffmpeg.deleteFile('output.webm');
        } catch (e) {
            console.warn('Cleanup warning:', e);
        }
        
        document.getElementById('fileInput').value = '';

    } catch (error) {
        console.error('Conversion error:', error);
        dropZone.classList.remove('processing');
        showStatus(`❌ Conversion failed: ${error.message}`, 'error');
    }
}

// Sanitize filename
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

// Clear status
function clearStatusOnNewFile() {
    const status = document.getElementById('status');
    if (!status.classList.contains('processing')) {
        status.classList.remove('show');
        status.innerHTML = '';
    }
}

// Update progress
function updateProgress(percent) {
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