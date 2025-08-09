// PNG to JPEG Converter
// Simple, clean implementation for browser-based image conversion

document.addEventListener('DOMContentLoaded', () => {
    initializePngConverter();
});

function initializePngConverter() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const qualitySlider = document.getElementById('quality');
    const qualityValue = document.getElementById('qualityValue');

    // Update quality display
    qualitySlider.addEventListener('input', (e) => {
        qualityValue.textContent = e.target.value + '%';
    });

    // Click to browse
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handlePngFile(e.target.files[0]);
        }
    });

    // Drag and drop events
    setupDragDrop(dropZone, handlePngFile);
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

// Validate PNG file signature
function isPngFile(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const arr = new Uint8Array(e.target.result);
            // PNG signature: 89 50 4E 47 0D 0A 1A 0A
            const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
            
            if (arr.length < 8) {
                resolve(false);
                return;
            }
            
            for (let i = 0; i < 8; i++) {
                if (arr[i] !== pngSignature[i]) {
                    resolve(false);
                    return;
                }
            }
            resolve(true);
        };
        reader.onerror = () => resolve(false);
        reader.readAsArrayBuffer(file.slice(0, 8));
    });
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
    
    return sanitized || 'converted_image'; // Fallback name if empty
}

// Handle PNG file
async function handlePngFile(file) {
    clearStatusOnNewFile();
    console.log('Processing file:', file.name, 'Size:', file.size, 'Type:', file.type);
    
    if (!file.type.includes('png')) {
        showStatus('❌ Please select a PNG file only.', 'error');
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

    // Validate PNG file signature
    const isValidPng = await isPngFile(file);
    if (!isValidPng) {
        showStatus('❌ File is not a valid PNG image. It may be corrupted or incorrectly named.', 'error');
        return;
    }

    convertPngToJpeg(file);
}

// Convert PNG to JPEG
function convertPngToJpeg(file) {
    const dropZone = document.getElementById('dropZone');
    dropZone.classList.add('processing');
    showStatus('Converting PNG to JPEG...', 'processing');

    const reader = new FileReader();
    
    reader.onload = (e) => {
        console.log('FileReader loaded successfully');
        const img = new Image();
        
        img.onload = () => {
            console.log('Image loaded successfully:', img.width + 'x' + img.height);
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                if (!ctx) {
                    throw new Error('Could not get canvas context');
                }
                
                canvas.width = img.width;
                canvas.height = img.height;
                
                // Check for reasonable dimensions
                if (img.width > 10000 || img.height > 10000) {
                    throw new Error('Image dimensions too large (max 10,000px)');
                }
                
                // Fill with white background (removes PNG transparency)
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                
                const quality = document.getElementById('quality').value / 100;
                
                canvas.toBlob((blob) => {
                    if (blob) {
                        console.log('Conversion successful, blob size:', blob.size);
                        const sanitizedName = sanitizeFilename(file.name);
                        const outputFilename = `${sanitizedName}.jpg`;
                        downloadFile(blob, outputFilename);
                        dropZone.classList.remove('processing');
                        showStatus('PNG converted to JPEG successfully!', 'success', outputFilename);
                        document.getElementById('fileInput').value = '';
                    } else {
                        throw new Error('Failed to create JPEG blob - canvas.toBlob returned null');
                    }
                }, 'image/jpeg', quality);
                
            } catch (error) {
                console.error('Canvas processing error:', error);
                dropZone.classList.remove('processing');
                showStatus(`❌ Processing failed: ${error.message}`, 'error');
            }
        };
        
        img.onerror = (error) => {
            console.error('Image load error:', error);
            dropZone.classList.remove('processing');
            showStatus('❌ Could not load image. File may be corrupted or not a valid PNG.', 'error');
        };
        
        img.src = e.target.result;
    };
    
    reader.onerror = (error) => {
        console.error('FileReader error:', error);
        dropZone.classList.remove('processing');
        showStatus('❌ Could not read file. Please try again.', 'error');
    };
    
    reader.readAsDataURL(file);
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
        status.innerHTML = `✅ ${message}<br><strong>File:</strong> ${filename}<br><strong>Downloaded:</strong> ${timeString}`;
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

// Prevent default drag behaviors on the page
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    document.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
});