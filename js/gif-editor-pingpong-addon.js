/**
 * gif-editor-pingpong-addon.js
 * Drop-in addon to enable Ping-Pong (forward+reverse) loop export and UI indicators
 * Load this file *after* your original gif-editor.js.
 */

(function () {
  if (typeof window === 'undefined') return;
  const Klass = window.IntegratedGifEditor || (typeof IntegratedGifEditor !== 'undefined' ? IntegratedGifEditor : null);
  if (!Klass) {
    console.warn('[PingPong Addon] IntegratedGifEditor not found on window. Load this after gif-editor.js.');
    return;
  }

  // --- Helper to safely wrap methods ---
  function wrap(proto, name, wrapper) {
    const original = proto[name];
    proto[name] = function (...args) {
      return wrapper.call(this, original, ...args);
    };
  }

  // --- Ensure default flags exist on instances (called early in initializeEditor) ---
  wrap(Klass.prototype, 'initializeEditor', function (original, ...args) {
    // Ensure defaults exist even if constructor wasn't modified
    if (typeof this.pingPongMode === 'undefined') this.pingPongMode = false;
    if (typeof this.isPlayingBackward === 'undefined') this.isPlayingBackward = false;

    const ret = original ? original.apply(this, args) : undefined;

    // Connect ping-pong checkbox (expects <input type="checkbox" id="pingPongMode"> in HTML)
    const pingPongCheckbox = document.getElementById('pingPongMode');
    if (pingPongCheckbox && !pingPongCheckbox.__ppBound) {
      pingPongCheckbox.addEventListener('change', (e) => this.setPingPongMode(e.target.checked));
      pingPongCheckbox.__ppBound = true;
    }

    // Refresh pill once on init
    if (typeof this.updateDurationPill === 'function') {
      this.updateDurationPill();
    }

    return ret;
  });

  // --- Add setPingPongMode if missing ---
  if (typeof Klass.prototype.setPingPongMode !== 'function') {
    Klass.prototype.setPingPongMode = function setPingPongMode(enabled) {
      this.pingPongMode = !!enabled;

      // Update pill
      const pill = document.getElementById('durationPill');
      if (pill && typeof this.updateDurationPill === 'function') {
        this.updateDurationPill();
      }

      // Status toast
      if (typeof this.showEditorStatus === 'function') {
        if (this.pingPongMode) {
          this.showEditorStatus('🔄 Ping-Pong mode enabled - clip will play forward then backward', 'info');
        } else {
          this.showEditorStatus('➡️ Normal mode - clip will play forward only', 'info');
        }
      }
      console.log('[PingPong Addon] pingPongMode:', this.pingPongMode);
    };
  }

  // --- Override updateDurationPill ---
  const updateDurationPillPatched = function () {
    const pill = document.getElementById('durationPill');
    if (!pill) return;

    const totalSec = this.videoDuration || 0;
    const selectionDuration = Math.max(0, (this.endTime || 0) - (this.startTime || 0));
    const percentage = totalSec > 0 ? Math.round((selectionDuration / totalSec) * 100) : 0;

    const pingPongText = this.pingPongMode ? ' 🔄 ×2' : '';
    // const effectiveDuration = this.pingPongMode ? selectionDuration * 2 : selectionDuration; // reserved

    pill.textContent = `🎬 ${selectionDuration.toFixed(1)}s selected (${percentage}% of original)${pingPongText}`;

    if (this.pingPongMode) {
      pill.style.background = 'linear-gradient(90deg, var(--controls-bg), rgba(139, 92, 246, 0.2))';
      pill.style.borderColor = '#8b5cf6';
    } else {
      pill.style.background = 'var(--controls-bg)';
      pill.style.borderColor = 'var(--timeline-handle)';
    }
  };

  Klass.prototype.updateDurationPill = updateDurationPillPatched;

  // --- Override exportTrimmedGif to include ping-pong ---
  const exportTrimmedGifPatched = async function () {
    if (!this.originalGifBlob) {
      this.showEditorStatus && this.showEditorStatus('⌛ No GIF loaded for export.', 'error');
      return;
    }

    if (this.isProcessing) {
      this.showEditorStatus && this.showEditorStatus('⏳ Please wait for current processing to complete.', 'error');
      return;
    }

    const exportBtn = document.getElementById('exportTrimmedBtn');
    const progressContainer = document.getElementById('exportProgress');
    const progressText = document.getElementById('progressText');
    const progressFill = document.getElementById('progressFill');

    if (exportBtn) exportBtn.disabled = true;
    if (progressContainer) progressContainer.style.display = 'block';
    if (progressText) progressText.textContent = 'Preparing to trim...';
    if (progressFill) progressFill.style.width = '10%';

    this.isProcessing = true;

    try {
      const modeText = this.pingPongMode ? ' with ping-pong loop' : '';
      this.showEditorStatus && this.showEditorStatus(`✂️ Trimming GIF on server${modeText}...`, 'info');

      if (progressText) progressText.textContent = `Uploading for trimming${modeText}...`;
      if (progressFill) progressFill.style.width = '30%';

      const form = new FormData();
      form.append('file', this.originalGifBlob, this.originalGifBlob.name);
      form.append('start', String(this.startTime));
      form.append('end', String(this.endTime));
      form.append('pingpong', String(this.pingPongMode)); // NEW

      const res = await fetch(`${this.SERVER_URL}/edit/trim-gif`, {
        method: 'POST',
        body: form
      });

      if (progressText) progressText.textContent = `Processing trim${modeText}...`;
      if (progressFill) progressFill.style.width = '70%';

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[PingPong Addon] Export failed:', errorText);
        throw new Error(`Server error: ${res.status}`);
      }

      const outBlob = await res.blob();
      if (!outBlob || outBlob.size === 0) {
        throw new Error('Received empty file from server');
      }

      if (progressText) progressText.textContent = 'Download ready!';
      if (progressFill) progressFill.style.width = '100%';

      const outUrl = URL.createObjectURL(outBlob);
      const pingPongSuffix = this.pingPongMode ? '_pingpong' : '';
      const filename = this.makeOutputName(
        this.originalGifBlob.name,
        `_trimmed_${this.startTime.toFixed(1)}s-${this.endTime.toFixed(1)}s${pingPongSuffix}`
      );

      const a = document.createElement('a');
      a.href = outUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(outUrl);

      const outputSizeKB = outBlob.size / 1024;
      const effectiveText = this.pingPongMode ? ' (with ping-pong loop)' : '';
      this.showEditorStatus && this.showEditorStatus(
        `✅ Trimmed GIF downloaded! Size: ${outputSizeKB.toFixed(0)}KB${effectiveText}`,
        'success'
      );
    } catch (err) {
      console.error('[PingPong Addon] Export error:', err);
      this.showEditorStatus && this.showEditorStatus(`⌛ Export failed: ${err.message}`, 'error');
    } finally {
      this.isProcessing = false;
      if (exportBtn) exportBtn.disabled = false;
      if (progressContainer) {
        setTimeout(() => {
          progressContainer.style.display = 'none';
          if (progressFill) progressFill.style.width = '0%';
        }, 1000);
      }
    }
  };

  Klass.prototype.exportTrimmedGif = exportTrimmedGifPatched;

  // --- Override onVideoTimeUpdate to preview ping-pong loop (basic simulation) ---
  const onVideoTimeUpdatePatched = function () {
    if (typeof this.updatePlayhead === 'function') this.updatePlayhead();

    if (this.loopInSelection && this.previewVideo && !this.previewVideo.paused) {
      if (this.pingPongMode && this.isPlayingBackward) {
        if (this.previewVideo.currentTime <= this.startTime) {
          this.isPlayingBackward = false;
          this.previewVideo.currentTime = this.startTime + 0.01;
        }
      } else {
        if (this.previewVideo.currentTime >= this.endTime) {
          if (this.pingPongMode) {
            this.isPlayingBackward = true;
            this.previewVideo.currentTime = this.endTime - 0.01;
          } else {
            this.previewVideo.currentTime = this.startTime;
          }
        } else if (this.previewVideo.currentTime < this.startTime) {
          this.previewVideo.currentTime = this.startTime;
        }
      }
    }
  };

  Klass.prototype.onVideoTimeUpdate = onVideoTimeUpdatePatched;

  console.log('[PingPong Addon] Loaded and prototype patched.');
})();
