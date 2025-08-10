// Server-Side GIF to WebM Converter - Client
// Uploads files to Flask server for processing

let isProcessing = false;
const SERVER_URL = 'http://localhost:5000'; // Change this to your server URL

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeConverter();
    checkServerHealth();
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

// Check if server is running
async function checkServerHealth() {
    const statusEl = document.getElementById('serverStatus');
    if (!statusEl) {
        // Create status element
        const container = document.querySelector('.container');
        const statusDiv = document.createElement('div');
        statusDiv.id = 'serverStatus';
        statusDiv.className = 'ffmpeg-status';
        statusDiv.innerHTML = '<span class="spinner"></span>Checking server connection...';
        container.insertBefore(statusDiv, document.querySelector('.controls'));
    }

    try {
        const response = await fetch(`${SERVER_URL}/api/health`);
        const data = await response.json();
        
        if (data.status === 'healthy') {
            const statusEl = document.getElementById('serverStatus');
            if (data.ffmpeg_available && data.converter_available) {
                statusEl.innerHTML = '✅ Server ready for GIF conversion!';
                statusEl.classList.add('loaded');
                setTimeout(() => {
                    statusEl.style.display = 'none';
                }, 3000);
            } else {
                statusEl.innerHTML = '⚠️ Server running but FFmpeg/converter not available';
                statusEl.style.background = 'rgba(255, 152, 0, 0.1)';
                statusEl.style.borderColor = 'rgba(255, 152, 0, 0.3)';
                statusEl.style.color = '#ff9800';
            }
        } else {
            throw new Error('Server unhealthy');
        }
    } catch (error) {
        console.error('Server health check failed:', error);
        const statusEl = document.getElementById('serverStatus');
        statusEl.innerHTML = `
            ❌ Server not available<br>
            <small>Please start the Flask server</small><br>
            <button onclick="checkServerHealth()" style="
                margin-top: 10px; padding: 8px 16px; background: #667eea; color: white;
                border: none; border-radius: 6px; cursor: pointer; font-size: 14px;
            ">Retry Connection</button>
        `;
        statusEl.style.background = 'rgba(244, 67, 54, 0.1)';
        statusEl.style.borderColor = 'rgba(244, 67, 54, 0.3)';
        statusEl.style.color = '#f44336';
    }
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

    if (file.size > 100 * 1024 * 1024) {
        showStatus('❌ File too large. Please select a file under 100MB.', 'error');
        return;
    }

    if (file.size === 0) {
        showStatus('❌ File appears to be empty. Please try another file.', 'error');
        return;
    }

    convertGifOnServer(file);
}

// Convert GIF using server-side processing
async function convertGifOnServer(file) {
    isProcessing = true;
    const dropZone = document.getElementById('dropZone');
    const maxSizeKB = parseInt(document.getElementById('maxSize').value);
    const crf = parseInt(document.getElementById('crf').value);
    
    dropZone.classList.add('processing');
    showStatus('<span class="spinner"></span>Uploading GIF to server...', 'processing');

    try {
        // Create form data
        const formData = new FormData();
        formData.append('file', file);
        formData.append('max_size', maxSizeKB);
        formData.append('mode', 'sticker'); // Always sticker mode
        formData.append('crf', crf);

        // Upload and convert
        showStatus('<span class="spinner"></span>Converting on server...', 'processing');
        
        const response = await fetch(`${SERVER_URL}/api/convert`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (response.ok && result.success) {
            // Success! Download the converted file
            showStatus('<span class="spinner"></span>Downloading converted file...', 'processing');
            
            await downloadConvertedFile(result.download_id, result.output_filename);
            
            dropZone.classList.remove('processing');
            showStatus(
                `✅ GIF converted to WebM sticker successfully!<br>` +
                `<strong>Output:</strong> ${result.output_filename}<br>` +
                `<strong>Original:</strong> ${result.original_size_kb} KB → <strong>Final:</strong> ${result.output_size_kb} KB<br>` +
                `<strong>Compression:</strong> ${result.compression_ratio}% reduction<br>` +
                `<strong>Dimensions:</strong> ${result.original_width || '?'}×${result.original_height || '?'} → ${result.output_width || '?'}×${result.output_height || '?'}<br>` +
                `<strong>Duration:</strong> ${(result.output_duration || 0).toFixed(1)}s<br>` +
                `<strong>Processing:</strong> Server-side FFmpeg`,
                'success',
                result.output_filename
            );
            
        } else {
            // Server returned an error
            dropZone.classList.remove('processing');
            const errorMessage = result.error || 'Unknown server error';
            showStatus(`❌ Conversion failed: ${errorMessage}`, 'error');
        }

    } catch (error) {
        console.error('Conversion error:', error);
        dropZone.classList.remove('processing');
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showStatus('❌ Cannot connect to server. Please ensure the Flask server is running.', 'error');
        } else {
            showStatus(`❌ Conversion failed: ${error.message}`, 'error');
        }
    } finally {
        isProcessing = false;
        document.getElementById('fileInput').value = '';
    }
}

// Download converted file from server
async function downloadConvertedFile(downloadId, filename) {
    try {
        const response = await fetch(`${SERVER_URL}/api/download/${downloadId}`);
        
        if (response.ok) {
            const blob = await response.blob();
            
            // Create download link
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
        } else {
            throw new Error('Download failed');
        }
    } catch (error) {
        console.error('Download error:', error);
        showStatus(`❌ Download failed: ${error.message}`, 'error');
    }
}

// Utility functions
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