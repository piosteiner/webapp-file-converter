// FFmpeg.wasm GIF to WebM Converter - Direct translation of Python script
// Uses FFmpeg.wasm with exact same logic as your Python code

let ffmpeg = null;
let ffmpegLoaded = false;
let isProcessing = false;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeConverter();
    loadFFmpegWasm();
});

function initializeConverter() {
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

    // Update CRF display (same as Python)
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
        if (!isProcessing && ffmpegLoaded) {
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
        if (!isProcessing && ffmpegLoaded) {
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
        
        if (!isProcessing && ffmpegLoaded) {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handler(files[0]);
            }
        }
    });
}

// Load FFmpeg.wasm properly
async function loadFFmpegWasm() {
    const statusEl = document.getElementById('ffmpegStatus');
    if (!statusEl) {
        // Create status element if it doesn't exist
        const container = document.querySelector('.container');
        const statusDiv = document.createElement('div');
        statusDiv.id = 'ffmpegStatus';
        statusDiv.className = 'ffmpeg-status';
        statusDiv.innerHTML = '<span class="spinner"></span>Loading FFmpeg.wasm...';
        container.insertBefore(statusDiv, document.querySelector('.controls'));
    }
    
    try {
        console.log('Loading FFmpeg.wasm...');
        
        // Check if FFmpeg is available from CDN
        if (typeof FFmpeg === 'undefined' || !FFmpeg.FFmpeg) {
            throw new Error('FFmpeg library not loaded. Please check your internet connection.');
        }
        
        if (typeof FFmpegUtil === 'undefined' || !FFmpegUtil.fetchFile) {
            throw new Error('FFmpeg utilities not loaded. Please check your internet connection.');
        }
        
        // Use UMD version - access the classes directly
        ffmpeg = new FFmpeg.FFmpeg();
        
        // Set up progress and logging
        ffmpeg.on('log', ({ message }) => {
            console.log('FFmpeg:', message);
        });
        
        ffmpeg.on('progress', ({ progress }) => {
            if (isProcessing) {
                updateProgress(progress * 100);
            }
        });
        
        // Load FFmpeg with explicit core URLs
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
        await ffmpeg.load({
            coreURL: await FFmpegUtil.fetchFile(`${baseURL}/ffmpeg-core.js`),
            wasmURL: await FFmpegUtil.fetchFile(`${baseURL}/ffmpeg-core.wasm`),
        });
        
        ffmpegLoaded = true;
        console.log('FFmpeg.wasm loaded successfully!');
        
        // Update status
        const statusEl = document.getElementById('ffmpegStatus');
        statusEl.innerHTML = '✅ FFmpeg.wasm ready for GIF conversion!';
        statusEl.classList.add('loaded');
        
        // Hide after 3 seconds
        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 3000);
        
        // Store fetchFile globally
        window.fetchFile = FFmpegUtil.fetchFile;
        
    } catch (error) {
        console.error('FFmpeg loading error:', error);
        ffmpegLoaded = false;
        
        const statusEl = document.getElementById('ffmpegStatus');
        statusEl.innerHTML = `
            ❌ Failed to load FFmpeg.wasm<br>
            <small>${error.message}</small><br>
            <button onclick="location.reload()" style="
                margin-top: 10px; padding: 8px 16px; background: #667eea; color: white;
                border: none; border-radius: 6px; cursor: pointer; font-size: 14px;
            ">Retry</button>
        `;
        statusEl.style.background = 'rgba(244, 67, 54, 0.1)';
        statusEl.style.borderColor = 'rgba(244, 67, 54, 0.3)';
        statusEl.style.color = '#f44336';
    }
}

// Handle GIF file
function handleGifFile(file) {
    if (isProcessing) {
        showStatus('❌ Please wait for current conversion to complete.', 'error');
        return;
    }

    if (!ffmpegLoaded) {
        showStatus('❌ FFmpeg is still loading. Please wait and try again.', 'error');
        return;
    }

    clearStatusOnNewFile();
    console.log('Processing GIF file:', file.name, 'Size:', file.size, 'Type:', file.type);

    if (!file.type.includes('gif')) {
        showStatus('❌ Please select a GIF file only.', 'error');
        return;
    }

    if (file.size > 100 * 1024 * 1024) {
        showStatus('❌ File too large. Please select a file under 100MB.', 'error');
        return;
    }

    convertGifToWebm(file);
}

// Convert GIF to WebM - Direct translation of Python script logic
async function convertGifToWebm(file) {
    isProcessing = true;
    const dropZone = document.getElementById('dropZone');
    const maxSizeKB = parseInt(document.getElementById('maxSize').value);
    const startingCRF = parseInt(document.getElementById('crf').value);
    
    dropZone.classList.add('processing');
    showStatus('<span class="spinner"></span>Analyzing GIF...', 'processing');

    try {
        // Write input file
        console.log('Writing input file...');
        await ffmpeg.writeFile('input.gif', await window.fetchFile(file));
        
        // Get video info (equivalent to Python's get_video_info)
        showStatus('<span class="spinner"></span>Getting video information...', 'processing');
        
        let videoInfo;
        try {
            await ffmpeg.exec(['-i', 'input.gif', '-f', 'null', '-']);
        } catch (e) {
            // FFmpeg writes info to stderr, which causes "error" but is normal
            console.log('Info extraction completed');
        }
        
        // Try different CRF values until size requirement is met (same as Python)
        const maxSizeBytes = maxSizeKB * 1024;
        const crfValues = [startingCRF, 40, 45, 50, 55, 60, 63]; // Same progression as Python
        
        for (let i = 0; i < crfValues.length; i++) {
            const crf = crfValues[i];
            console.log(`Trying CRF ${crf}...`);
            showStatus(`<span class="spinner"></span>Converting with CRF ${crf}... (attempt ${i + 1}/${crfValues.length})`, 'processing');
            
            try {
                // Calculate scale filter (same logic as Python)
                const scaleFilter = "scale=512:512:force_original_aspect_ratio=decrease";
                
                // Build video filter chain (same as Python)
                const videoFilter = `${scaleFilter},fps=fps=min(30\\,source_fps)`;
                
                // Build FFmpeg command (exact translation of Python command)
                const ffmpegArgs = [
                    '-i', 'input.gif',
                    '-t', '3',                          // Limit duration to 3 seconds
                    '-c:v', 'libvpx-vp9',               // VP9 codec
                    '-crf', crf.toString(),             // Quality setting
                    '-b:v', '0',                        // Use CRF mode
                    '-an',                              // Remove audio stream
                    '-pix_fmt', 'yuva420p',             // Support transparency
                    '-vf', videoFilter,                 // Video filters
                    '-f', 'webm',                       // Force WebM format
                    '-y',                               // Overwrite output
                    'output.webm'
                ];
                
                console.log('FFmpeg command:', ffmpegArgs.join(' '));
                await ffmpeg.exec(ffmpegArgs);
                
                // Check if output file exists and get size
                const data = await ffmpeg.readFile('output.webm');
                const fileSize = data.length;
                
                console.log(`CRF ${crf}: ${fileSize} bytes (${(fileSize/1024).toFixed(1)} KB)`);
                
                if (fileSize <= maxSizeBytes) {
                    // Success! File meets size requirement (same as Python logic)
                    const blob = new Blob([data], { type: 'video/webm' });
                    const sanitizedName = sanitizeFilename(file.name);
                    const outputFilename = `${sanitizedName}_sticker.webm`;
                    
                    downloadFile(blob, outputFilename);
                    
                    dropZone.classList.remove('processing');
                    showStatus(
                        `✅ GIF converted to WebM sticker successfully!<br>` +
                        `<strong>Output:</strong> ${outputFilename}<br>` +
                        `<strong>Size:</strong> ${(fileSize/1024).toFixed(1)} KB<br>` +
                        `<strong>CRF:</strong> ${crf}<br>` +
                        `<strong>Max side:</strong> 512px<br>` +
                        `<strong>Codec:</strong> VP9<br>` +
                        `<strong>Format:</strong> WebM`,
                        'success',
                        outputFilename
                    );
                    
                    // Cleanup
                    await cleanupFiles();
                    document.getElementById('fileInput').value = '';
                    return;
                } else {
                    console.log(`File too large (${(fileSize/1024).toFixed(1)} KB > ${maxSizeKB} KB), trying higher CRF...`);
                }
                
            } catch (error) {
                console.error(`CRF ${crf} failed:`, error);
                continue;
            }
        }
        
        // If we get here, couldn't meet size requirement (same as Python)
        dropZone.classList.remove('processing');
        showStatus(
            `❌ Could not create file under ${maxSizeKB} KB limit!<br>` +
            `Try using a smaller GIF or increase the file size limit.`,
            'error'
        );
        
    } catch (error) {
        console.error('Conversion error:', error);
        dropZone.classList.remove('processing');
        showStatus(`❌ Conversion failed: ${error.message}`, 'error');
    } finally {
        await cleanupFiles();
        isProcessing = false;
        document.getElementById('fileInput').value = '';
    }
}

// Cleanup temporary files
async function cleanupFiles() {
    try {
        await ffmpeg.deleteFile('input.gif');
        await ffmpeg.deleteFile('output.webm');
    } catch (e) {
        console.warn('Cleanup warning:', e);
    }
}

// Update progress
function updateProgress(percent) {
    const status = document.getElementById('status');
    if (status.classList.contains('processing')) {
        const currentText = status.innerHTML;
        if (currentText.includes('Converting with CRF')) {
            const baseText = currentText.split('<br>')[0];
            status.innerHTML = `${baseText}<br>Progress: ${Math.round(percent)}%`;
        }
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

// Prevent default drag behaviors
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    document.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
});