// GIF to WebM Converter
// Professional video conversion with FFmpeg.wasm

let ffmpeg = null;
let ffmpegLoaded = false;
let gifMode = 'sticker';

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeGifConverter();
});

// Wait for all scripts to load, then initialize FFmpeg
window.addEventListener('load', () => {
    // Give CDN scripts a moment to initialize
    setTimeout(() => {
        loadFFmpeg();
    }, 500);
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

// Load FFmpeg.wasm with better error handling and fallbacks
async function loadFFmpeg() {
    const statusEl = document.getElementById('ffmpegStatus');
    
    try {
        console.log('Starting FFmpeg initialization...');
        
        // Check if libraries are loaded
        if (typeof window.FFmpeg === 'undefined' || typeof window.FFmpegUtil === 'undefined') {
            console.error('FFmpeg libraries not found, attempting dynamic load...');
            
            // Try to load dynamically as a fallback
            await loadFFmpegDynamically();
            return;
        }
        
        console.log('FFmpeg libraries found, creating instance...');
        
        // Access the FFmpeg constructor and utilities
        const { FFmpeg: FFmpegConstructor } = window.FFmpeg;
        const { fetchFile } = window.FFmpegUtil;
        
        // Store fetchFile globally for later use
        window.fetchFile = fetchFile;
        
        // Create FFmpeg instance
        ffmpeg = new FFmpegConstructor();
        
        // Set up logging
        ffmpeg.on('log', ({ message }) => {
            console.log('FFmpeg Log:', message);
        });
        
        // Set up progress tracking
        ffmpeg.on('progress', ({ progress, time }) => {
            updateProgress(progress * 100);
        });
        
        console.log('Loading FFmpeg core files...');
        statusEl.innerHTML = '<span class="spinner"></span>Loading FFmpeg core files (this may take a moment)...';
        
        // Load FFmpeg core - let it auto-detect CDN URLs
        await ffmpeg.load();
        
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
            <button onclick="retryFFmpegLoad()" style="
                margin-top: 10px;
                padding: 8px 16px;
                background: #667eea;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
            ">Retry Loading</button>
        `;
        statusEl.classList.remove('loaded');
        statusEl.style.background = 'rgba(244, 67, 54, 0.1)';
        statusEl.style.borderColor = 'rgba(244, 67, 54, 0.3)';
        statusEl.style.color = '#f44336';
    }
}

// Fallback: Load FFmpeg dynamically
async function loadFFmpegDynamically() {
    const statusEl = document.getElementById('ffmpegStatus');
    
    try {
        console.log('Attempting to load FFmpeg dynamically...');
        statusEl.innerHTML = '<span class="spinner"></span>Loading FFmpeg libraries...';
        
        // Load FFmpeg script
        await loadScript('https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js');
        
        // Load FFmpeg Util script
        await loadScript('https://unpkg.com/@ffmpeg/util@0.12.1/dist/umd/index.js');
        
        // Wait for scripts to initialize
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Try loading again
        await loadFFmpeg();
        
    } catch (error) {
        console.error('Dynamic loading failed:', error);
        statusEl.innerHTML = `
            ❌ Could not load FFmpeg libraries<br>
            <small>Please check your internet connection and try refreshing the page</small>
        `;
    }
}

// Helper function to load scripts dynamically
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.head.appendChild(script);
    });
}

// Global retry function
window.retryFFmpegLoad = function() {
    const statusEl = document.getElementById('ffmpegStatus');
    statusEl.innerHTML = '<span class="spinner"></span>Retrying...';
    statusEl.style.background = 'rgba(255, 152, 0, 0.1)';
    statusEl.style.borderColor = 'rgba(255, 152, 0, 0.3)';
    statusEl.style.color = '#ff9800';
    loadFFmpeg();
};

// Handle GIF file
function handleGifFile(file) {
    clearStatusOnNewFile();
    console.log('Processing GIF file:', file.name, 'Size:', file.size, 'Type:', file.type);
    
    if (!ffmpegLoaded) {
        showStatus('❌ FFmpeg is still loading. Please wait a moment and try again.', 'error');
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
    const maxSize = parseInt(document.getElementById('maxSize').value) * 1024;
    const crf = parseInt(document.getElementById('crf').value);
    
    dropZone.classList.add('processing');
    showStatus('<span class="spinner"></span>Converting GIF to WebM...', 'processing');

    try {
        // Write input file
        const inputFileName = 'input.gif';
        const outputFileName = 'output.webm';
        
        console.log('Writing input file...');
        const fileData = await window.fetchFile(file);
        await ffmpeg.writeFile(inputFileName, fileData);

        // Build scale filter
        let scaleFilter;
        if (gifMode === 'emoji') {
            // Emoji mode - exact 100x100 with padding
            scaleFilter = 'scale=100:100:force_original_aspect_ratio=decrease,pad=100:100:(ow-iw)/2:(oh-ih)/2:black@0';
        } else {
            // Sticker mode - max 512px preserving aspect ratio
            scaleFilter = 'scale=512:512:force_original_aspect_ratio=decrease';
        }

        // FFmpeg command arguments
        const args = [
            '-i', inputFileName,
            '-t', '3',                                    // Max 3 seconds
            '-c:v', 'libvpx-vp9',                        // VP9 codec
            '-crf', crf.toString(),                      // Quality
            '-b:v', '0',                                  // Variable bitrate
            '-an',                                        // No audio
            '-pix_fmt', 'yuva420p',                      // Transparency support
            '-vf', `${scaleFilter},fps=30`,              // Scale and FPS limit
            '-auto-alt-ref', '0',                        // Better compatibility
            outputFileName
        ];

        console.log('Running FFmpeg command:', args.join(' '));
        
        // Execute conversion
        await ffmpeg.exec(args);
        
        // Read output file
        console.log('Reading output file...');
        const data = await ffmpeg.readFile(outputFileName);
        const blob = new Blob([data.buffer], { type: 'video/webm' });
        
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

        // Cleanup
        try {
            await ffmpeg.deleteFile(inputFileName);
            await ffmpeg.deleteFile(outputFileName);
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

// Prevent default drag behaviors
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    document.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
});