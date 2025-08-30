// PNG Sticker Converter - Auto-converts images to PNG with 512px max side
// Based on existing PNG converter structure with auto-download functionality

let isProcessing = false;
let messageHistory = [];

document.addEventListener('DOMContentLoaded', () => {
    initializePngStickerConverter();
});

function initializePngStickerConverter() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    // Click to browse
    dropZone.addEventListener('click', () => {
        if (!isProcessing) {
            fileInput.click();
        }
    });

    // File input change - handles multiple files
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            console.log('Selected files:', files.length);
            processFiles(files);
        }
    });

    // Drag and drop events - handles multiple files
    setupDragDrop(dropZone);
}

// Simplified drag and drop setup
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

// Main file processing function that handles both single and multiple files
async function processFiles(files) {
    if (isProcessing) {
        addMessage('❌ Please wait for current conversion to complete.', 'error');
        return;
    }

    console.log(`Starting processing of ${files.length} files`);
    isProcessing = true;

    const dropZone = document.getElementById('dropZone');
    dropZone.classList.add('processing');

    // Filter to image files only
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
        finishProcessing('❌ No image files found. Please select image files only.', 'error', []);
        return;
    }

    if (imageFiles.length !== files.length) {
        console.log(`Filtered to ${imageFiles.length} image files from ${files.length} total files`);
    }

    let successCount = 0;
    let errorCount = 0;
    let successfulFiles = []; // Track successful conversions

    // Show initial status
    if (imageFiles.length === 1) {
        addMessage('<span class="spinner"></span>Converting to PNG sticker...', 'processing', [], true);
    } else {
        addMessage(`<span class="spinner"></span>Converting ${imageFiles.length} images to PNG stickers...<br>Starting conversion...`, 'processing', [], true);
    }

    // Process each file
    for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        console.log(`Processing file ${i + 1}/${imageFiles.length}: ${file.name}`);
        
        // Update progress
        updateProgress(imageFiles.length, i + 1, file.name);

        try {
            // Validate file size (50MB max)
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

            // Convert file
            const blob = await convertToStickerBlob(file);
            if (blob) {
                const sanitizedName = sanitizeFilename(file.name);
                const outputFilename = `${sanitizedName}_512.png`;
                
                // Download immediately
                downloadFile(blob, outputFilename);
                successCount++;
                successfulFiles.push({
                    original: file.name,
                    converted: outputFilename
                });
                
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
        if (i < imageFiles.length - 1) {
            await sleep(100);
        }
    }

    // Show final status with all converted filenames
    const now = new Date();
    const timeString = now.toLocaleString();

    if (successCount > 0) {
        if (imageFiles.length === 1) {
            finishProcessing(`✅ PNG sticker created successfully!<br><strong>Downloaded:</strong> ${timeString}`, 'success', successfulFiles);
        } else if (errorCount > 0) {
            finishProcessing(`⚠️ Converted ${successCount} out of ${imageFiles.length} images<br><strong>Completed:</strong> ${timeString}`, 'success', successfulFiles);
        } else {
            finishProcessing(`✅ Successfully converted all ${successCount} images to PNG stickers!<br><strong>Completed:</strong> ${timeString}`, 'success', successfulFiles);
        }
    } else {
        finishProcessing('❌ No files were successfully converted.', 'error', []);
    }
}

// Update progress display (updates current processing message)
function updateProgress(total, current, currentFileName) {
    const statusContainer = document.getElementById('status');
    const processingMessages = statusContainer.querySelectorAll('.status-message.processing');
    
    if (processingMessages.length > 0) {
        const latestProcessingMessage = processingMessages[0]; // First one is newest
        if (total === 1) {
            latestProcessingMessage.innerHTML = `<span class="spinner"></span>Converting to PNG sticker...<br>Processing: ${currentFileName}`;
        } else {
            const progress = Math.round((current / total) * 100);
            latestProcessingMessage.innerHTML = `<span class="spinner"></span>Converting ${total} images to PNG stickers...<br>Progress: ${current}/${total} (${progress}%)<br>Current: ${currentFileName}`;
        }
    }
}

// Finish processing and cleanup
function finishProcessing(message, type, successfulFiles) {
    isProcessing = false;
    const dropZone = document.getElementById('dropZone');
    dropZone.classList.remove('processing');
    document.getElementById('fileInput').value = '';
    
    // Remove any processing messages and add final result
    removeProcessingMessages();
    addMessage(message, type, successfulFiles);
}

// Remove processing messages
function removeProcessingMessages() {
    const statusContainer = document.getElementById('status');
    const processingMessages = statusContainer.querySelectorAll('.status-message.processing');
    processingMessages.forEach(msg => msg.remove());
}

// Promise-based sleep function
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Add message to history (newest on top)
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

// Convert image to PNG sticker (512px max side, preserving aspect ratio)
function convertToStickerBlob(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            
            img.onload = () => {
                try {
                    // Calculate new dimensions (longest side = exactly 512px)
                    let newWidth = img.width;
                    let newHeight = img.height;
                    
                    // Find the longest side and scale to exactly 512px
                    if (newWidth > newHeight) {
                        // Width is the longest side
                        if (newWidth !== 512) {
                            newHeight = Math.round(newHeight * (512 / newWidth));
                            newWidth = 512;
                        }
                    } else {
                        // Height is the longest side (or equal)
                        if (newHeight !== 512) {
                            newWidth = Math.round(newWidth * (512 / newHeight));
                            newHeight = 512;
                        }
                    }
                    
                    // Check for reasonable dimensions
                    if (img.width > 10000 || img.height > 10000) {
                        reject(new Error('Image dimensions too large (max 10,000px)'));
                        return;
                    }
                    
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    if (!ctx) {
                        reject(new Error('Could not get canvas context'));
                        return;
                    }
                    
                    canvas.width = newWidth;
                    canvas.height = newHeight;
                    
                    // Draw the resized image
                    ctx.drawImage(img, 0, 0, newWidth, newHeight);
                    
                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Failed to create PNG blob'));
                        }
                    }, 'image/png');
                    
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
    
    return sanitized || 'sticker'; // Fallback name if empty
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

// Prevent default drag behaviors on the page
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    document.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
});
