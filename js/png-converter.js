// PNG to JPEG Converter with Working Bulk Support
// Fixed version with proper async handling and file processing

let isProcessing = false;

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
        if (!isProcessing) {
            fileInput.click();
        }
    });

    // File input change - NOW HANDLES MULTIPLE FILES
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            console.log('Selected files:', files.length);
            processFiles(files);
        }
    });

    // Drag and drop events - NOW HANDLES MULTIPLE FILES
    setupDragDrop(dropZone);
}

// NEW: Simplified drag and drop setup
function setupDragDrop(dropZone) {
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
            const files = Array.from(e.dataTransfer.files);
            console.log('Dropped files:', files.length);
            if (files.length > 0) {
                processFiles(files);
            }
        }
    });
}

// NEW: Main file processing function that handles both single and multiple files
async function processFiles(files) {
    if (isProcessing) {
        showStatus('❌ Please wait for current conversion to complete.', 'error');
        return;
    }

    console.log(`Starting processing of ${files.length} files`);
    clearStatusOnNewFile();
    isProcessing = true;

    const dropZone = document.getElementById('dropZone');
    dropZone.classList.add('processing');

    // Filter to PNG files only
    const pngFiles = files.filter(file => file.type.includes('png'));
    
    if (pngFiles.length === 0) {
        finishProcessing('❌ No PNG files found. Please select PNG files only.', 'error');
        return;
    }

    if (pngFiles.length !== files.length) {
        console.log(`Filtered to ${pngFiles.length} PNG files from ${files.length} total files`);
    }

    let successCount = 0;
    let errorCount = 0;

    // Show initial status
    if (pngFiles.length === 1) {
        showStatus('<span class="spinner"></span>Converting PNG to JPEG...', 'processing');
    } else {
        showStatus(`<span class="spinner"></span>Converting ${pngFiles.length} PNG files to JPEG...<br>Starting conversion...`, 'processing');
    }

    // Process each file
    for (let i = 0; i < pngFiles.length; i++) {
        const file = pngFiles[i];
        console.log(`Processing file ${i + 1}/${pngFiles.length}: ${file.name}`);
        
        // Update progress
        updateProgress(pngFiles.length, i + 1, file.name);

        try {
            // Validate file size
            if (file.size > 50 * 1024 * 1024) {
                console.warn(`Skipping ${file.name}: too large`);
                errorCount++;
                continue;
            }

            if (file.size === 0) {
                console.warn(`Skipping ${file.name}: empty file`);
                errorCount++;
                continue;
            }

            // Validate PNG signature
            const isValidPng = await isPngFile(file);
            if (!isValidPng) {
                console.warn(`Skipping ${file.name}: not a valid PNG`);
                errorCount++;
                continue;
            }

            // Convert file
            const blob = await convertPngToJpegBlob(file);
            if (blob) {
                const sanitizedName = sanitizeFilename(file.name);
                const outputFilename = `${sanitizedName}.jpg`;
                
                // Download immediately
                downloadFile(blob, outputFilename);
                successCount++;
                
                console.log(`Successfully converted: ${file.name}`);
            } else {
                errorCount++;
                console.error(`Failed to convert: ${file.name}`);
            }

        } catch (error) {
            errorCount++;
            console.error(`Error converting ${file.name}:`, error);
        }

        // Small delay between files
        if (i < pngFiles.length - 1) {
            await sleep(100);
        }
    }

    // Show final status
    const now = new Date();
    const timeString = now.toLocaleString();

    if (successCount > 0) {
        if (pngFiles.length === 1) {
            finishProcessing(`✅ PNG converted to JPEG successfully!<br><strong>Downloaded:</strong> ${timeString}`, 'success');
        } else if (errorCount > 0) {
            finishProcessing(`⚠️ Converted ${successCount} out of ${pngFiles.length} PNG files<br><strong>Files downloaded:</strong> ${successCount}<br><strong>Completed:</strong> ${timeString}`, 'success');
        } else {
            finishProcessing(`✅ Successfully converted all ${successCount} PNG files to JPEG!<br><strong>Files downloaded:</strong> ${successCount}<br><strong>Completed:</strong> ${timeString}`, 'success');
        }
    } else {
        finishProcessing('❌ No files were successfully converted.', 'error');
    }
}

// NEW: Update progress display
function updateProgress(total, current, currentFileName) {
    const status = document.getElementById('status');
    if (total === 1) {
        status.innerHTML = `<span class="spinner"></span>Converting PNG to JPEG...<br>Processing: ${currentFileName}`;
    } else {
        const progress = Math.round((current / total) * 100);
        status.innerHTML = `<span class="spinner"></span>Converting ${total} PNG files to JPEG...<br>Progress: ${current}/${total} (${progress}%)<br>Current: ${currentFileName}`;
    }
}

// NEW: Finish processing and cleanup
function finishProcessing(message, type) {
    isProcessing = false;
    const dropZone = document.getElementById('dropZone');
    dropZone.classList.remove('processing');
    document.getElementById('fileInput').value = '';
    showStatus(message, type);
}

// NEW: Promise-based sleep function
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// UPDATED: Convert PNG to JPEG and return blob (no auto-download)
function convertPngToJpegBlob(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    if (!ctx) {
                        reject(new Error('Could not get canvas context'));
                        return;
                    }
                    
                    canvas.width = img.width;
                    canvas.height = img.height;
                    
                    // Check for reasonable dimensions
                    if (img.width > 10000 || img.height > 10000) {
                        reject(new Error('Image dimensions too large (max 10,000px)'));
                        return;
                    }
                    
                    // Fill with white background (removes PNG transparency)
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);
                    
                    const quality = document.getElementById('quality').value / 100;
                    
                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Failed to create JPEG blob'));
                        }
                    }, 'image/jpeg', quality);
                    
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = () => {
                reject(new Error('Could not load image'));
            };
            
            img.src = e.target.result;
        };
        
        reader.onerror = () => {
            reject(new Error('Could not read file'));
        };
        
        reader.readAsDataURL(file);
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

// Download file
function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
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