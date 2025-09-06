// PNG to JPEG Converter with Working Bulk Support and Message History
// Fixed version with proper async handling and file processing

let isProcessing = false;
let messageHistory = [];

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
            logger.debug('Selected files:', files.length);
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
            logger.debug('Dropped files:', files.length);
            if (files.length > 0) {
                processFiles(files);
            }
        }
    });
}

// NEW: Main file processing function with enhanced validation
async function processFiles(files) {
    if (isProcessing) {
        addMessage('❌ Please wait for current conversion to complete.', 'error');
        return;
    }

    logger.debug(`Starting processing of ${files.length} files`);
    
    // Validate files first
    const validation = fileValidator.validateFiles(files, ['png'], 50 * 1024 * 1024);
    
    // Show validation summary
    if (validation.summary.total > 0) {
        const summary = fileValidator.createBatchSummary(validation);
        addMessage(summary, validation.summary.invalid > 0 ? 'error' : 'info');
        
        // Show individual file errors
        validation.invalidFiles.forEach(({ file, validation: fileValidation }) => {
            const errorMsg = fileValidator.createErrorMessage(fileValidation);
            if (errorMsg) {
                addMessage(errorMsg, 'error');
            }
        });
        
        // If no valid files, stop processing
        if (validation.validFiles.length === 0) {
            return;
        }
    }
    
    isProcessing = true;

    const dropZone = document.getElementById('dropZone');
    dropZone.classList.add('processing');

    // Use only valid files
    const pngFiles = validation.validFiles.map(item => item.file);
    
    if (pngFiles.length === 0) {
        finishProcessing('❌ No valid PNG files found. Please select PNG files only.', 'error', []);
        return;
    }

    if (pngFiles.length !== files.length) {
        logger.debug(`Filtered to ${pngFiles.length} valid PNG files from ${files.length} total files`);
    }

    let successCount = 0;
    let errorCount = 0;
    let successfulFiles = []; // Track successful conversions

    // Show initial status
    if (pngFiles.length === 1) {
        addMessage('<span class="spinner"></span>Converting PNG to JPEG...', 'processing', [], true);
    } else {
        addMessage(`<span class="spinner"></span>Converting ${pngFiles.length} PNG files to JPEG...<br>Starting conversion...`, 'processing', [], true);
    }

    // Process each file
    for (let i = 0; i < pngFiles.length; i++) {
        const file = pngFiles[i];
        logger.debug(`Processing file ${i + 1}/${pngFiles.length}: ${file.name}`);
        
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
                successfulFiles.push({
                    original: file.name,
                    converted: outputFilename
                });
                
                logger.debug(`Successfully converted: ${file.name}`);
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

    // Show final status with all converted filenames
    const now = new Date();
    const timeString = now.toLocaleString();

    if (successCount > 0) {
        if (pngFiles.length === 1) {
            finishProcessing(`✅ PNG converted to JPEG successfully!<br><strong>Downloaded:</strong> ${timeString}`, 'success', successfulFiles);
        } else if (errorCount > 0) {
            finishProcessing(`⚠️ Converted ${successCount} out of ${pngFiles.length} PNG files<br><strong>Completed:</strong> ${timeString}`, 'success', successfulFiles);
        } else {
            finishProcessing(`✅ Successfully converted all ${successCount} PNG files to JPEG!<br><strong>Completed:</strong> ${timeString}`, 'success', successfulFiles);
        }
    } else {
        finishProcessing('❌ No files were successfully converted.', 'error', []);
    }
}

// NEW: Update progress display (updates current processing message)
function updateProgress(total, current, currentFileName) {
    const statusContainer = document.getElementById('status');
    const processingMessages = statusContainer.querySelectorAll('.status-message.processing');
    
    if (processingMessages.length > 0) {
        const latestProcessingMessage = processingMessages[0]; // First one is newest
        if (total === 1) {
            latestProcessingMessage.innerHTML = `<span class="spinner"></span>Converting PNG to JPEG...<br>Processing: ${currentFileName}`;
        } else {
            const progress = Math.round((current / total) * 100);
            latestProcessingMessage.innerHTML = `<span class="spinner"></span>Converting ${total} PNG files to JPEG...<br>Progress: ${current}/${total} (${progress}%)<br>Current: ${currentFileName}`;
        }
    }
}

// NEW: Finish processing and cleanup
function finishProcessing(message, type, successfulFiles) {
    isProcessing = false;
    const dropZone = document.getElementById('dropZone');
    dropZone.classList.remove('processing');
    document.getElementById('fileInput').value = '';
    
    // Remove any processing messages and add final result
    removeProcessingMessages();
    addMessage(message, type, successfulFiles);
}

// NEW: Remove processing messages
function removeProcessingMessages() {
    const statusContainer = document.getElementById('status');
    const processingMessages = statusContainer.querySelectorAll('.status-message.processing');
    processingMessages.forEach(msg => msg.remove());
}

// NEW: Promise-based sleep function
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// NEW: Add message to history (newest on top)
function addMessage(message, type, successfulFiles = [], isProcessing = false) {
    const statusContainer = document.getElementById('status');
    
    // Create new message element
    const messageElement = document.createElement('div');
    messageElement.className = `status-message show ${type}`;
    
    // Build message content
    let messageContent = message;
    
    // Add list of successful files if any
    if (successfulFiles.length > 0) {
        messageContent += '<br><strong>Converted files:</strong><br>';
        successfulFiles.forEach(file => {
            messageContent += `• ${file.original} → ${file.converted}<br>`;
        });
    }
    
    messageElement.innerHTML = messageContent;
    
    // Insert at the top (newest first)
    if (statusContainer.firstChild) {
        statusContainer.insertBefore(messageElement, statusContainer.firstChild);
    } else {
        statusContainer.appendChild(messageElement);
    }
    
    // Keep only last 5 messages to prevent overflow
    const allMessages = statusContainer.querySelectorAll('.status-message');
    if (allMessages.length > 5) {
        for (let i = 5; i < allMessages.length; i++) {
            allMessages[i].remove();
        }
    }
    
    // Auto-hide processing messages after 30 seconds
    if (type === 'processing') {
        setTimeout(() => {
            if (messageElement.classList.contains('processing')) {
                messageElement.remove();
            }
        }, 30000);
    }
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

// DEPRECATED: Old status function (keeping for compatibility but not used)
function showStatus(message, type, filename = null) {
    addMessage(message, type, filename ? [{original: filename, converted: filename}] : []);
}

// DEPRECATED: Old clear function (keeping for compatibility but not used)
function clearStatusOnNewFile() {
    // No longer clearing messages - they persist as history
}

// Prevent default drag behaviors on the page
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    document.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
});