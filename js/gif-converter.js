// Server-Side GIF to WebM Converter with BULK SUPPORT
// Uploads multiple files to Flask server for processing

let isProcessing = false;
const SERVER_URL = 'https://api.piogino.ch'; // API base URL

// === Helpers ================================================================
function withTimeout(ms) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(id) };
}

async function safeJson(response) {
  const text = await response.text();
  try { return JSON.parse(text); }
  catch { return { error: text || `HTTP ${response.status}` }; }
}

// Smart retry for health check with backoff and UI feedback
async function retryHealth(maxAttempts = 3) {
  const btn = document.getElementById('retryBtn');
  const hint = document.getElementById('retryHint');
  if (!btn) return;

  btn.disabled = true;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    btn.textContent = `Retrying… (${attempt}/${maxAttempts})`;

    const ok = await checkServerHealth(); // returns true/false
    if (ok) {
      if (hint) hint.textContent = '';
      btn.disabled = false;
      btn.textContent = 'Retry Connection';
      return;
    }

    if (attempt < maxAttempts) {
      let wait = Math.min(2 ** attempt, 8); // 2s, 4s, 8s
      for (let s = wait; s > 0; s--) {
        if (hint) hint.textContent = `Retrying in ${s}s…`;
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }

  btn.disabled = false;
  btn.textContent = 'Retry Connection';
  if (hint) hint.textContent = 'Still no connection. Is the server online?';
}
// ===========================================================================

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
    if (!isProcessing) fileInput.click();
  });

  // File input change - handles multiple files
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      processFiles(files);
    }
  });

  // Drag and drop events - handles multiple files
  setupDragDrop(dropZone);
}

// Check if server is running (returns true/false)
async function checkServerHealth() {
  let statusEl = document.getElementById('serverStatus');
  if (!statusEl) {
    const container = document.querySelector('.container');
    const statusDiv = document.createElement('div');
    statusDiv.id = 'serverStatus';
    statusDiv.className = 'ffmpeg-status';
    statusDiv.innerHTML = '<span class="spinner"></span>Checking server connection...';
    container.insertBefore(statusDiv, document.querySelector('.controls'));
    statusEl = statusDiv;
  } else {
    statusEl.innerHTML = '<span class="spinner"></span>Checking server connection...';
    statusEl.style.display = '';
  }

  const t = withTimeout(8000);
  try {
    const response = await fetch(`${SERVER_URL}/api/health`, { cache: 'no-store', signal: t.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    if (data.status === 'healthy') {
      if (data.ffmpeg_available && data.converter_available) {
        statusEl.innerHTML = '✅ Server ready for GIF conversion!';
        statusEl.classList.add('loaded');
        setTimeout(() => { statusEl.style.display = 'none'; }, 3000);
      } else {
        statusEl.innerHTML = '⚠️ Server running but FFmpeg/converter not available';
        statusEl.style.background = 'rgba(255, 152, 0, 0.1)';
        statusEl.style.borderColor = 'rgba(255, 152, 0, 0.3)';
        statusEl.style.color = '#ff9800';
      }
    }
    return true; // health endpoint reachable
  } catch (error) {
    console.error('Server health check failed:', error);
    statusEl.innerHTML = `
      ❌ Server not available<br>
      <small>${error.name === 'AbortError' ? 'Request timed out' : 'Unable to reach the server'}</small><br>
      <button id="retryBtn" style="
        margin-top: 10px; padding: 8px 16px; background: #667eea; color: white;
        border: none; border-radius: 6px; cursor: pointer; font-size: 14px;
      ">Retry Connection</button>
      <span id="retryHint" style="margin-left:8px; font-size:12px; opacity:.8;"></span>
    `;
    statusEl.style.background = 'rgba(244, 67, 54, 0.1)';
    statusEl.style.borderColor = 'rgba(244, 67, 54, 0.3)';
    statusEl.style.color = '#f44336';

    // attach retry handler (once per button)
    const btn = document.getElementById('retryBtn');
    if (btn) btn.addEventListener('click', () => retryHealth(3), { once: true });

    return false;
  } finally {
    t.clear();
  }
}

// Drag and drop setup
function setupDragDrop(dropZone) {
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (!isProcessing) dropZone.classList.add('dragover');
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
      if (files.length > 0) processFiles(files);
    }
  });
}

// Process multiple files
async function processFiles(files) {
  if (isProcessing) {
    addMessage('❌ Please wait for current conversion to complete.', 'error');
    return;
  }

  isProcessing = true;
  const dropZone = document.getElementById('dropZone');
  dropZone.classList.add('processing');

  // Filter to GIF files only (MIME OR filename)
  const gifFiles = files.filter(f =>
    (f.type && f.type.toLowerCase().includes('gif')) ||
    f.name.toLowerCase().endsWith('.gif')
  );

  if (gifFiles.length === 0) {
    finishProcessing('❌ No GIF files found. Please select GIF files only.', 'error', []);
    return;
  }

  // Check for oversized files
  const oversizedFiles = gifFiles.filter(f => f.size > 100 * 1024 * 1024);
  if (oversizedFiles.length > 0) {
    finishProcessing('❌ Some files are over 100MB. Please use smaller files.', 'error', []);
    return;
  }

  // Single file or bulk?
  if (gifFiles.length === 1) {
    await convertSingleFile(gifFiles[0]);
  } else {
    await convertMultipleFiles(gifFiles);
  }
}

// Convert single file
async function convertSingleFile(file) {
  const maxSizeKB = parseInt(document.getElementById('maxSize').value);
  const crf = parseInt(document.getElementById('crf').value);

  showStatus('<span class="spinner"></span>Uploading GIF to server...', 'processing');

  const t = withTimeout(90_000);
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('max_size', maxSizeKB);
    formData.append('mode', 'sticker');
    formData.append('crf', crf);

    showStatus('<span class="spinner"></span>Converting on server...', 'processing');

    const response = await fetch(`${SERVER_URL}/api/convert`, {
      method: 'POST',
      body: formData,
      signal: t.signal
    });

    const result = await safeJson(response);

    if (response.ok && result.success) {
      showStatus('<span class="spinner"></span>Downloading converted file...', 'processing');
      await downloadConvertedFile(result.download_id, result.output_filename);

      const now = new Date().toLocaleString();
      finishProcessing(
        `✅ GIF converted to WebM sticker successfully!<br>` +
        `<strong>Output:</strong> ${result.output_filename}<br>` +
        `<strong>Original:</strong> ${result.original_size_kb} KB → <strong>Final:</strong> ${result.output_size_kb} KB<br>` +
        `<strong>Compression:</strong> ${result.compression_ratio}% reduction<br>` +
        `<strong>Downloaded:</strong> ${now}`,
        'success',
        [{ original: file.name, converted: result.output_filename }]
      );
    } else {
      finishProcessing(`❌ Conversion failed: ${result.error || `HTTP ${response.status}`}`, 'error', []);
    }
  } catch (error) {
    console.error('Conversion error:', error);
    finishProcessing(`❌ Conversion failed: ${error.name === 'AbortError' ? 'Request timed out' : error.message}`, 'error', []);
  } finally {
    t.clear();
  }
}

// Convert multiple files using bulk endpoint
async function convertMultipleFiles(files) {
  const maxSizeKB = parseInt(document.getElementById('maxSize').value);
  const crf = parseInt(document.getElementById('crf').value);

  showStatus(`<span class="spinner"></span>Uploading ${files.length} GIF files to server...`, 'processing');

  const t = withTimeout(180_000);
  try {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    formData.append('max_size', maxSizeKB);
    formData.append('mode', 'sticker');
    formData.append('crf', crf);

    showStatus(`<span class="spinner"></span>Converting ${files.length} files on server...`, 'processing');

    const response = await fetch(`${SERVER_URL}/api/convert-bulk`, {
      method: 'POST',
      body: formData,
      signal: t.signal
    });

    const result = await safeJson(response);

    if (response.ok) {
      const successfulFiles = [];
      let statusMessage = '';

      if (result.successful > 0) {
        for (const fileResult of result.results) {
          if (fileResult.success) {
            showStatus(`<span class="spinner"></span>Downloading ${fileResult.output_filename}...`, 'processing');
            await downloadConvertedFile(fileResult.download_id, fileResult.output_filename);
            successfulFiles.push({ original: fileResult.filename, converted: fileResult.output_filename });
          }
        }
      }

      const now = new Date().toLocaleString();

      if (result.successful === result.total) {
        statusMessage = `✅ Successfully converted all ${result.successful} GIF files!<br><strong>Completed:</strong> ${now}`;
      } else if (result.successful > 0) {
        statusMessage = `⚠️ Converted ${result.successful} out of ${result.total} files<br><strong>Completed:</strong> ${now}`;
        const failedFiles = result.results.filter(r => !r.success);
        if (failedFiles.length > 0) {
          statusMessage += '<br><strong>Failed files:</strong><br>';
          failedFiles.forEach(f => { statusMessage += `• ${f.filename}: ${f.error}<br>`; });
        }
      } else {
        statusMessage = '❌ No files were successfully converted.';
      }

      finishProcessing(statusMessage, result.successful > 0 ? 'success' : 'error', successfulFiles);
    } else {
      finishProcessing(`❌ Bulk conversion failed: ${result.error || `HTTP ${response.status}`}`, 'error', []);
    }
  } catch (error) {
    console.error('Bulk conversion error:', error);
    finishProcessing(`❌ Bulk conversion failed: ${error.name === 'AbortError' ? 'Request timed out' : error.message}`, 'error', []);
  } finally {
    t.clear();
  }
}

// Download converted file from server
async function downloadConvertedFile(downloadId, filename) {
  const t = withTimeout(60_000);
  try {
    const response = await fetch(`${SERVER_URL}/api/download/${downloadId}`, { cache: 'no-store', signal: t.signal });
    if (response.ok) {
      const blob = await response.blob();
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
    throw new Error(error.name === 'AbortError' ? 'Download timed out' : error.message);
  } finally {
    t.clear();
  }
}

// Finish processing and cleanup
function finishProcessing(message, type, successfulFiles) {
  isProcessing = false;
  const dropZone = document.getElementById('dropZone');
  dropZone.classList.remove('processing');
  document.getElementById('fileInput').value = '';
  addMessage(message, type, successfulFiles);
}

// Add message to status (with file list if applicable)
function addMessage(message, type, successfulFiles = []) {
  const statusContainer = document.getElementById('status');

  // Clear processing messages
  const processingMessages = statusContainer.querySelectorAll('.status-message.processing');
  processingMessages.forEach(msg => msg.remove());

  const messageElement = document.createElement('div');
  messageElement.className = `status-message show ${type}`;

  let messageContent = message;

  if (successfulFiles.length > 0) {
    messageContent += '<br><strong>Converted files:</strong><br>';
    successfulFiles.forEach(file => {
      messageContent += `• ${file.original} → ${file.converted}<br>`;
    });
  }

  messageElement.innerHTML = messageContent;

  if (statusContainer.firstChild) {
    statusContainer.insertBefore(messageElement, statusContainer.firstChild);
  } else {
    statusContainer.appendChild(messageElement);
  }

  // Keep only last 5 messages
  const allMessages = statusContainer.querySelectorAll('.status-message');
  if (allMessages.length > 5) {
    for (let i = 5; i < allMessages.length; i++) {
      allMessages[i].remove();
    }
  }
}

// Show status (simple wrapper for compatibility)
function showStatus(message, type) {
  const statusContainer = document.getElementById('status');

  if (type === 'processing') {
    let processingMsg = statusContainer.querySelector('.status-message.processing');
    if (!processingMsg) {
      processingMsg = document.createElement('div');
      processingMsg.className = 'status-message show processing';
      if (statusContainer.firstChild) {
        statusContainer.insertBefore(processingMsg, statusContainer.firstChild);
      } else {
        statusContainer.appendChild(processingMsg);
      }
    }
    processingMsg.innerHTML = message;
  } else {
    addMessage(message, type);
  }
}

// Prevent default drag behaviors
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  document.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
});
