/**
 * FlowHUDHost.js — Shadow DOM Host & Floating Draggable Pill Engine
 * 
 * Manages open Shadow DOM encapsulation (#flow-auto-hud-root),
 * fluid drag physics with boundary clamping, position persistence,
 * two-column studio layout orchestration, and queue building.
 * 
 * Adheres strictly to ADR-002, ADR-003, and ADR-007.
 */

import {
  getConfig,
  saveConfig,
  getQueue,
  enqueueItem,
  enqueueBatch,
  removeQueueItem,
  clearCompletedQueue,
  clearAllQueue,
  onChanged
} from '../core/FlowStorage.js';

import { renderStudioLayout, renderQueueItem } from './FlowHUDTemplates.js';
import { queueManager, QUEUE_STATES } from '../core/QueueManager.js';

export class FlowHUDHost {
  constructor() {
    this.hostId = 'flow-auto-hud-root';
    this.host = null;
    this.shadow = null;
    this.container = null;
    this.windowEl = null;
    this.pillEl = null;
    this.statusDot = null;
    this.tickerEl = null;

    this.isMinimized = false;
    this.isVisible = true;

    // Drag State
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.initialLeft = 24;
    this.initialTop = 24;
    this.currentLeft = 24;
    this.currentTop = 24;
    this.saveDebounceTimer = null;

    // Media Dropzone Ingestion Cache
    this.stagedI2VMedia = null;
    this.stagedF2VStart = null;
    this.stagedF2VEnd = null;
  }

  /**
   * Initializes and mounts the HUD in the DOM.
   */
  async init() {
    if (this.host) return;

    // 1. Retrieve saved position and minimize state
    try {
      const cfg = await getConfig();
      if (cfg.settings && cfg.settings.overlayPosition) {
        this.currentLeft = cfg.settings.overlayPosition.x ?? 24;
        this.currentTop = cfg.settings.overlayPosition.y ?? 24;
      }
      this.isMinimized = Boolean(cfg.settings && cfg.settings.overlayMinimized);
    } catch (e) {
      console.warn('[FlowHUDHost] Failed to load initial state', e);
    }

    // 2. Recover from abrupt tab reload or crash during active batch
    await this.recoverStaleBatchState();

    // 3. Create Host & Open Shadow Root (ADR-003)
    this.host = document.getElementById(this.hostId);
    if (!this.host) {
      this.host = document.createElement('div');
      this.host.id = this.hostId;
      document.body.appendChild(this.host);
    }

    this.shadow = this.host.attachShadow({ mode: 'open' });

    // 3. Inject CSS links into Shadow DOM
    const varLink = document.createElement('link');
    varLink.rel = 'stylesheet';
    varLink.href = chrome.runtime.getURL('styles/variables.css');
    this.shadow.appendChild(varLink);

    const overlayLink = document.createElement('link');
    overlayLink.rel = 'stylesheet';
    overlayLink.href = chrome.runtime.getURL('overlay/overlay.css');
    this.shadow.appendChild(overlayLink);

    // 4. Build HUD markup with Two-Column Studio Layout
    this.buildMarkup();

    // 5. Setup Drag Physics, Window Controls, and Workspace Events
    this.setupDragPhysics();
    this.setupControls();
    this.setupStudioEvents();

    // 6. Apply initial clamped position
    this.applyPosition(this.currentLeft, this.currentTop);

    // 7. Initial queue list and parameter sync
    await this.syncUIFromStorage();

    // 8. Subscribe to storage updates for live ticker & queue updates
    onChanged(cfg => this.handleStorageUpdate(cfg));
  }

  /**
   * Recovers from abrupt tab reloads or crashes during active batch.
   * Ensures automation is not stuck in a locked running state.
   */
  async recoverStaleBatchState() {
    try {
      const cfg = await getConfig();
      if (cfg.activeBatch && cfg.activeBatch.isRunning) {
        // Reset running flag so user can start a fresh batch
        await saveConfig({
          activeBatch: {
            isRunning: false,
            isPaused: false,
            activeItemId: null
          }
        });
      }
    } catch (err) {
      console.warn('[FlowHUDHost] Failed to recover stale batch state', err);
    }
  }

  /**
   * Constructs the HTML template inside the Shadow Root.
   */
  buildMarkup() {
    const logoUrl = chrome.runtime.getURL('assets/logo/logo_rj.png');

    this.container = document.createElement('div');
    this.container.id = 'flow-hud-container';
    if (this.isMinimized) {
      this.container.classList.add('is-minimized');
    }

    this.container.innerHTML = `
      <!-- Full Studio Window -->
      <div class="hud-window">
        <header class="hud-header">
          <div class="hud-drag-handle" id="hudDragHandle">
            <img src="${logoUrl}" alt="RJ" class="hud-brand-logo">
            <span class="hud-title">RJ V-Flow Auto</span>
            <span class="hud-badge">Studio</span>
          </div>
          <div class="hud-window-controls">
            <button class="hud-icon-btn" id="btnMinimizeHud" title="Minimize to Floating Pill">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
            <button class="hud-icon-btn" id="btnCloseHud" title="Close Overlay">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </header>

        <div class="hud-body" id="hudStudioContent">
          ${renderStudioLayout()}
        </div>
      </div>

      <!-- Floating Draggable Pill (Minimized State) -->
      <div class="hud-pill" id="hudPill">
        <div class="pill-grip">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="9" cy="5" r="1"></circle>
            <circle cx="9" cy="12" r="1"></circle>
            <circle cx="9" cy="19" r="1"></circle>
            <circle cx="15" cy="5" r="1"></circle>
            <circle cx="15" cy="12" r="1"></circle>
            <circle cx="15" cy="19" r="1"></circle>
          </svg>
        </div>
        <img src="${logoUrl}" alt="RJ" class="pill-logo">
        <div class="pill-status-dot dot-idle" id="pillStatusDot"></div>
        <span class="pill-ticker" id="hudPillTicker">Idle</span>
        <button class="pill-expand-btn" id="btnRestoreHud" title="Restore Studio Window">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          </svg>
        </button>
      </div>
    `;

    this.shadow.appendChild(this.container);

    this.windowEl = this.container.querySelector('.hud-window');
    this.pillEl = this.container.querySelector('.hud-pill');
    this.statusDot = this.container.querySelector('#pillStatusDot');
    this.tickerEl = this.container.querySelector('#hudPillTicker');
  }

  /**
   * Attaches fluid drag listeners with viewport boundary clamping.
   */
  setupDragPhysics() {
    const handleDragStart = (e) => {
      if (e.target.closest('button, input, select, textarea')) return;

      this.isDragging = true;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.initialLeft = this.currentLeft;
      this.initialTop = this.currentTop;

      window.addEventListener('mousemove', onDragMove, { passive: false });
      window.addEventListener('mouseup', onDragEnd, { once: true });
    };

    const onDragMove = (e) => {
      if (!this.isDragging) return;
      e.preventDefault();

      const deltaX = e.clientX - this.dragStartX;
      const deltaY = e.clientY - this.dragStartY;

      const newLeft = this.initialLeft + deltaX;
      const newTop = this.initialTop + deltaY;

      this.applyPosition(newLeft, newTop);
    };

    const onDragEnd = () => {
      this.isDragging = false;
      window.removeEventListener('mousemove', onDragMove);

      clearTimeout(this.saveDebounceTimer);
      this.saveDebounceTimer = setTimeout(() => {
        saveConfig({
          settings: {
            overlayPosition: { x: this.currentLeft, y: this.currentTop }
          }
        }).catch(err => console.warn('[FlowHUDHost] Failed to save overlay position', err));
      }, 200);
    };

    const windowDragHandle = this.shadow.getElementById('hudDragHandle');
    if (windowDragHandle) {
      windowDragHandle.addEventListener('mousedown', handleDragStart);
    }

    if (this.pillEl) {
      this.pillEl.addEventListener('mousedown', handleDragStart);
    }
  }

  /**
   * Clamps coordinates within viewport boundaries and applies styles.
   */
  applyPosition(x, y) {
    const activeEl = this.isMinimized ? this.pillEl : this.windowEl;
    const rect = activeEl ? activeEl.getBoundingClientRect() : { width: 740, height: 500 };

    const width = rect.width || (this.isMinimized ? 160 : 740);
    const height = rect.height || (this.isMinimized ? 34 : 500);

    const maxX = Math.max(12, window.innerWidth - width - 12);
    const maxY = Math.max(12, window.innerHeight - height - 12);

    this.currentLeft = Math.max(12, Math.min(maxX, x));
    this.currentTop = Math.max(12, Math.min(maxY, y));

    this.container.style.left = `${this.currentLeft}px`;
    this.container.style.top = `${this.currentTop}px`;
  }

  setupControls() {
    const btnMin = this.shadow.getElementById('btnMinimizeHud');
    if (btnMin) btnMin.addEventListener('click', () => this.minimize());

    const btnRestore = this.shadow.getElementById('btnRestoreHud');
    if (btnRestore) btnRestore.addEventListener('click', () => this.restore());

    const btnClose = this.shadow.getElementById('btnCloseHud');
    if (btnClose) btnClose.addEventListener('click', () => this.hide());
  }

  /**
   * Wires interactive workspace events (tabs, dropzones, queue building).
   */
  setupStudioEvents() {
    // 1. Navigation Tab Switching
    const tabs = this.shadow.querySelectorAll('.hud-nav-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const tabKey = tab.dataset.tab;
        const panes = this.shadow.querySelectorAll('.hud-tab-pane');
        panes.forEach(p => p.classList.remove('active'));

        if (tabKey === 'text-batch') this.shadow.getElementById('paneTextBatch')?.classList.add('active');
        if (tabKey === 'i2v') this.shadow.getElementById('paneI2V')?.classList.add('active');
        if (tabKey === 'f2v') this.shadow.getElementById('paneF2V')?.classList.add('active');
        if (tabKey === 'queue-list') this.shadow.getElementById('paneQueueList')?.classList.add('active');
      });
    });

    // Clear Text Batch Button
    const btnClearTextBatch = this.shadow.getElementById('btnClearTextBatch');
    if (btnClearTextBatch) {
      btnClearTextBatch.addEventListener('click', () => {
        const textarea = this.shadow.getElementById('txtBatchPrompts');
        if (textarea) textarea.value = '';
      });
    }

    // 2. Media Mode Switching (Video vs Image)
    this.setupSegmentGroup('segMediaMode', (val) => {
      const isVideo = val === 'text-to-video';

      // Duration is for Omni Video
      const grpDuration = this.shadow.getElementById('grpDuration');
      if (grpDuration) grpDuration.style.display = isVideo ? 'flex' : 'none';

      // Multipliers are for Image Mode
      const grpMultiplier = this.shadow.getElementById('grpMultiplier');
      if (grpMultiplier) grpMultiplier.style.display = isVideo ? 'none' : 'flex';

      // Model options grouping
      const grpVideoModels = this.shadow.getElementById('grpVideoModels');
      const grpImageModels = this.shadow.getElementById('grpImageModels');
      if (grpVideoModels) grpVideoModels.style.display = isVideo ? 'block' : 'none';
      if (grpImageModels) grpImageModels.style.display = isVideo ? 'none' : 'block';

      // Select default model if previous selection is invalid for the new mode
      const selModel = this.shadow.getElementById('selModelFamily');
      if (selModel) {
        if (isVideo && selModel.value.startsWith('Nano Banana')) {
          selModel.value = 'Omni 1.1 Flash';
          saveConfig({ model: 'Omni 1.1 Flash' }).catch(() => {});
        } else if (!isVideo && !selModel.value.startsWith('Nano Banana')) {
          selModel.value = 'Nano Banana 2';
          saveConfig({ model: 'Nano Banana 2' }).catch(() => {});
        }
      }

      // Resolution options grouping
      const grpVideoRes = this.shadow.getElementById('grpVideoRes');
      const grpImageRes = this.shadow.getElementById('grpImageRes');
      if (grpVideoRes) grpVideoRes.style.display = isVideo ? 'block' : 'none';
      if (grpImageRes) grpImageRes.style.display = isVideo ? 'none' : 'block';

      // Select default resolution if mode changed
      const selRes = this.shadow.getElementById('selResolution');
      if (selRes) {
        if (isVideo && (selRes.value === '1K' || selRes.value === '2K')) {
          selRes.value = '1080p';
          saveConfig({ videoResolution: '1080p' }).catch(() => {});
        } else if (!isVideo && (selRes.value === '720p' || selRes.value === '1080p')) {
          selRes.value = '2K';
          saveConfig({ imageResolution: '2K' }).catch(() => {});
        }
      }

      // Aspect Ratio: Video has 16:9 and 9:16 ONLY. Image has 4:3 and 1:1 additionally.
      const ratioImgOnly = this.shadow.querySelectorAll('.ratio-img-only');
      ratioImgOnly.forEach(el => {
        el.style.display = isVideo ? 'none' : 'flex';
      });

      // If switching to video and ratio was 4:3 or 1:1, fallback to 16:9
      if (isVideo) {
        const segAspect = this.shadow.getElementById('segAspectRatio');
        const activeAspectBtn = segAspect?.querySelector('.hud-segment-btn.active');
        if (activeAspectBtn && (activeAspectBtn.dataset.val === '4:3' || activeAspectBtn.dataset.val === '1:1')) {
          segAspect.querySelectorAll('.hud-segment-btn').forEach(b => b.classList.remove('active'));
          segAspect.querySelector('[data-val="16:9"]')?.classList.add('active');
          saveConfig({ aspectRatio: '16:9' }).catch(() => {});
        }
      }

      saveConfig({ mode: val }).catch(() => {});
    });

    this.setupSegmentGroup('segDuration', (val) => saveConfig({ duration: val }).catch(() => {}));
    this.setupSegmentGroup('segAspectRatio', (val) => saveConfig({ aspectRatio: val }).catch(() => {}));
    this.setupSegmentGroup('segOutputs', (val) => saveConfig({ outputCount: Number(val) }).catch(() => {}));

    // 3. Dropdown Selects
    const selModel = this.shadow.getElementById('selModelFamily');
    if (selModel) {
      selModel.addEventListener('change', (e) => saveConfig({ model: e.target.value }).catch(() => {}));
    }

    const selResolution = this.shadow.getElementById('selResolution');
    if (selResolution) {
      selResolution.addEventListener('change', (e) => {
        const val = e.target.value;
        saveConfig({ videoResolution: val, imageResolution: val }).catch(() => {});
      });
    }

    // 4. File Dropzones (I2V and F2V)
    this.setupDropzone('dropzoneI2V', 'fileI2V', 'dropzoneI2VEmpty', 'dropzoneI2VPreview', 'imgI2VPreview', (dataUrl) => {
      this.stagedI2VMedia = dataUrl;
    });

    const btnRemoveI2V = this.shadow.getElementById('btnRemoveI2V');
    if (btnRemoveI2V) {
      btnRemoveI2V.addEventListener('click', (e) => {
        e.stopPropagation();
        this.stagedI2VMedia = null;
        this.shadow.getElementById('dropzoneI2VEmpty').style.display = 'flex';
        this.shadow.getElementById('dropzoneI2VPreview').style.display = 'none';
        const fileInput = this.shadow.getElementById('fileI2V');
        if (fileInput) fileInput.value = '';
      });
    }

    this.setupDropzone('dropzoneF2VStart', 'fileF2VStart', 'dropzoneF2VStartEmpty', 'dropzoneF2VStartPreview', 'imgF2VStartPreview', (dataUrl) => {
      this.stagedF2VStart = dataUrl;
    });

    const btnRemoveF2VStart = this.shadow.getElementById('btnRemoveF2VStart');
    if (btnRemoveF2VStart) {
      btnRemoveF2VStart.addEventListener('click', (e) => {
        e.stopPropagation();
        this.stagedF2VStart = null;
        this.shadow.getElementById('dropzoneF2VStartEmpty').style.display = 'flex';
        this.shadow.getElementById('dropzoneF2VStartPreview').style.display = 'none';
        const fileInput = this.shadow.getElementById('fileF2VStart');
        if (fileInput) fileInput.value = '';
      });
    }

    this.setupDropzone('dropzoneF2VEnd', 'fileF2VEnd', 'dropzoneF2VEndEmpty', 'dropzoneF2VEndPreview', 'imgF2VEndPreview', (dataUrl) => {
      this.stagedF2VEnd = dataUrl;
    });

    const btnRemoveF2VEnd = this.shadow.getElementById('btnRemoveF2VEnd');
    if (btnRemoveF2VEnd) {
      btnRemoveF2VEnd.addEventListener('click', (e) => {
        e.stopPropagation();
        this.stagedF2VEnd = null;
        this.shadow.getElementById('dropzoneF2VEndEmpty').style.display = 'flex';
        this.shadow.getElementById('dropzoneF2VEndPreview').style.display = 'none';
        const fileInput = this.shadow.getElementById('fileF2VEnd');
        if (fileInput) fileInput.value = '';
      });
    }

    // F2V Frames Swap Button
    const btnSwapF2V = this.shadow.getElementById('btnSwapF2V');
    if (btnSwapF2V) {
      btnSwapF2V.addEventListener('click', () => {
        const temp = this.stagedF2VStart;
        this.stagedF2VStart = this.stagedF2VEnd;
        this.stagedF2VEnd = temp;

        const startImg = this.shadow.getElementById('imgF2VStartPreview');
        const startEmpty = this.shadow.getElementById('dropzoneF2VStartEmpty');
        const startPrev = this.shadow.getElementById('dropzoneF2VStartPreview');
        if (this.stagedF2VStart) {
          if (startImg) startImg.src = this.stagedF2VStart;
          if (startEmpty) startEmpty.style.display = 'none';
          if (startPrev) startPrev.style.display = 'flex';
        } else {
          if (startImg) startImg.src = '';
          if (startEmpty) startEmpty.style.display = 'flex';
          if (startPrev) startPrev.style.display = 'none';
        }

        const endImg = this.shadow.getElementById('imgF2VEndPreview');
        const endEmpty = this.shadow.getElementById('dropzoneF2VEndEmpty');
        const endPrev = this.shadow.getElementById('dropzoneF2VEndPreview');
        if (this.stagedF2VEnd) {
          if (endImg) endImg.src = this.stagedF2VEnd;
          if (endEmpty) endEmpty.style.display = 'none';
          if (endPrev) endPrev.style.display = 'flex';
        } else {
          if (endImg) endImg.src = '';
          if (endEmpty) endEmpty.style.display = 'flex';
          if (endPrev) endPrev.style.display = 'none';
        }
      });
    }

    // 5. Add to Queue Action Buttons
    const btnAddTextBatch = this.shadow.getElementById('btnAddTextBatch');
    if (btnAddTextBatch) {
      btnAddTextBatch.addEventListener('click', async () => {
        const textarea = this.shadow.getElementById('txtBatchPrompts');
        const text = textarea ? textarea.value.trim() : '';
        if (!text) return;

        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length === 0) return;

        const cfg = await getConfig();
        const isVideo = cfg.mode !== 'text-to-image';
        const items = lines.map(prompt => ({
          prompt,
          mode: cfg.mode || 'text-to-video',
          model: cfg.model || 'Omni 1.1 Flash',
          aspectRatio: isVideo && (cfg.aspectRatio === '4:3' || cfg.aspectRatio === '1:1') ? '16:9' : (cfg.aspectRatio || '16:9'),
          duration: cfg.duration || '6s',
          outputs: cfg.outputCount || 1,
          resolution: isVideo ? (cfg.videoResolution || '1080p') : (cfg.imageResolution || '2K'),
          autoDownload: true
        }));

        await enqueueBatch(items);
        textarea.value = '';
        await this.syncQueueList();
      });
    }

    const btnAddI2V = this.shadow.getElementById('btnAddI2V');
    if (btnAddI2V) {
      btnAddI2V.addEventListener('click', async () => {
        const txtPrompt = this.shadow.getElementById('txtI2VPrompt');
        const prompt = txtPrompt ? txtPrompt.value.trim() : '';
        if (!this.stagedI2VMedia && !prompt) return;

        const cfg = await getConfig();
        await enqueueItem({
          prompt,
          mode: 'image-to-video',
          model: cfg.model || 'Omni 1.1 Flash',
          aspectRatio: cfg.aspectRatio === '9:16' ? '9:16' : '16:9',
          duration: cfg.duration || '6s',
          outputs: 1,
          resolution: cfg.videoResolution || '1080p',
          autoDownload: true,
          ingredients: this.stagedI2VMedia ? [{ dataUrl: this.stagedI2VMedia, name: 'reference.png' }] : []
        });

        if (txtPrompt) txtPrompt.value = '';
        this.stagedI2VMedia = null;
        this.shadow.getElementById('dropzoneI2VEmpty').style.display = 'flex';
        this.shadow.getElementById('dropzoneI2VPreview').style.display = 'none';
        const fileInput = this.shadow.getElementById('fileI2V');
        if (fileInput) fileInput.value = '';
        await this.syncQueueList();
      });
    }

    const btnAddF2V = this.shadow.getElementById('btnAddF2V');
    if (btnAddF2V) {
      btnAddF2V.addEventListener('click', async () => {
        const txtPrompt = this.shadow.getElementById('txtF2VPrompt');
        const prompt = txtPrompt ? txtPrompt.value.trim() : '';
        if (!this.stagedF2VStart && !this.stagedF2VEnd && !prompt) return;

        const cfg = await getConfig();
        await enqueueItem({
          prompt,
          mode: 'frames-to-video',
          model: cfg.model || 'Omni 1.1 Flash',
          aspectRatio: cfg.aspectRatio === '9:16' ? '9:16' : '16:9',
          duration: cfg.duration || '6s',
          outputs: 1,
          resolution: cfg.videoResolution || '1080p',
          autoDownload: true,
          frames: {
            start: this.stagedF2VStart,
            end: this.stagedF2VEnd
          }
        });

        if (txtPrompt) txtPrompt.value = '';
        this.stagedF2VStart = null;
        this.stagedF2VEnd = null;
        this.shadow.getElementById('dropzoneF2VStartEmpty').style.display = 'flex';
        this.shadow.getElementById('dropzoneF2VStartPreview').style.display = 'none';
        this.shadow.getElementById('dropzoneF2VEndEmpty').style.display = 'flex';
        this.shadow.getElementById('dropzoneF2VEndPreview').style.display = 'none';
        const fileStart = this.shadow.getElementById('fileF2VStart');
        if (fileStart) fileStart.value = '';
        const fileEnd = this.shadow.getElementById('fileF2VEnd');
        if (fileEnd) fileEnd.value = '';
        await this.syncQueueList();
      });
    }

    // 6. Queue List Clear Actions
    const btnClearCompleted = this.shadow.getElementById('btnClearCompletedQueue');
    if (btnClearCompleted) {
      btnClearCompleted.addEventListener('click', async () => {
        await clearCompletedQueue();
        await this.syncQueueList();
      });
    }

    const btnClearAll = this.shadow.getElementById('btnClearAllQueue');
    if (btnClearAll) {
      btnClearAll.addEventListener('click', async () => {
        await clearAllQueue();
        await this.syncQueueList();
      });
    }

    // 7. Automation Execution Controls (Start & Stop)
    const btnStartQueue = this.shadow.getElementById('btnStartQueue');
    const btnStopQueue = this.shadow.getElementById('btnStopQueue');

    if (btnStartQueue) {
      btnStartQueue.addEventListener('click', async () => {
        const queue = await getQueue();
        const pendingItems = queue.filter(it => it.status === 'pending');

        if (pendingItems.length === 0) {
          // If no pending items, switch to Text Batch tab and flash textarea
          const navTab = this.shadow.querySelector('.hud-nav-tab[data-tab="text-batch"]');
          if (navTab) navTab.click();
          const txt = this.shadow.getElementById('txtBatchPrompts');
          if (txt) {
            txt.focus();
            txt.placeholder = 'Please add prompts to queue first before starting batch!';
          }
          return;
        }

        btnStartQueue.disabled = true;
        if (btnStopQueue) btnStopQueue.disabled = false;

        try {
          await queueManager.start();
        } catch (err) {
          console.error('[FlowHUDHost] Failed to start queue', err);
          btnStartQueue.disabled = false;
          if (btnStopQueue) btnStopQueue.disabled = true;
        }
      });
    }

    if (btnStopQueue) {
      btnStopQueue.addEventListener('click', async () => {
        btnStopQueue.disabled = true;
        try {
          await queueManager.stop();
        } catch (err) {
          console.error('[FlowHUDHost] Failed to stop queue', err);
        }
      });
    }

    // 8. Queue Manager State & Progress Subscriptions
    queueManager.onStateChange((state) => {
      const btnStart = this.shadow.getElementById('btnStartQueue');
      const btnStop = this.shadow.getElementById('btnStopQueue');

      if (state === QUEUE_STATES.RUNNING) {
        if (btnStart) btnStart.disabled = true;
        if (btnStop) btnStop.disabled = false;
        this.updateTicker('Running', 'running');
      } else if (state === QUEUE_STATES.STOPPED) {
        if (btnStart) btnStart.disabled = false;
        if (btnStop) btnStop.disabled = true;
        this.updateTicker('Stopped', 'stopped');
        this.syncQueueList().catch(() => {});
      } else {
        // IDLE
        if (btnStart) btnStart.disabled = false;
        if (btnStop) btnStop.disabled = true;
        this.updateTicker('Idle', 'idle');
        this.syncQueueList().catch(() => {});
      }
    });

    queueManager.onProgress((payload) => {
      if (!payload || !payload.itemId) return;

      // 1. Update queue card directly in DOM if visible
      const card = this.shadow.querySelector(`.hud-queue-card[data-id="${payload.itemId}"]`);
      if (card) {
        const badge = card.querySelector('.queue-item-badge');
        const status = payload.status || 'pending';

        // Update card border class
        card.className = `hud-queue-card status-${status}`;

        // Update badge class and label
        if (badge) {
          badge.className = `queue-item-badge status-${status}`;
          if (status === 'generating') {
            badge.textContent = `GENERATING (${payload.percent || 25}%)`;
          } else if (status === 'downloading') {
            badge.textContent = `DOWNLOADING (${payload.percent || 85}%)`;
          } else if (status === 'injecting') {
            badge.textContent = 'INJECTING (10%)';
          } else {
            badge.textContent = status.toUpperCase();
          }
        }

        // If error payload, append error element
        if (payload.error) {
          let errEl = card.querySelector('.queue-card-error');
          if (!errEl) {
            errEl = document.createElement('div');
            errEl.className = 'queue-card-error';
            card.appendChild(errEl);
          }
          errEl.textContent = payload.error;
        }
      }

      // 2. Update pill ticker
      if (payload.status === 'generating' || payload.status === 'injecting' || payload.status === 'downloading') {
        this.updateTicker(`${payload.status.toUpperCase()} (${payload.percent || 0}%)`, 'running');
      }
    });
  }

  /**
   * Helper to bind segmented button group.
   */
  setupSegmentGroup(groupId, onChange) {
    const group = this.shadow.getElementById(groupId);
    if (!group) return;

    const buttons = group.querySelectorAll('.hud-segment-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (typeof onChange === 'function') {
          onChange(btn.dataset.val);
        }
      });
    });
  }

  /**
   * Helper to bind dropzone file picker and drag events.
   */
  setupDropzone(zoneId, inputId, emptyId, previewId, imgId, onDataUrl) {
    const zone = this.shadow.getElementById(zoneId);
    const input = this.shadow.getElementById(inputId);
    const empty = this.shadow.getElementById(emptyId);
    const preview = this.shadow.getElementById(previewId);
    const img = this.shadow.getElementById(imgId);

    if (!zone || !input) return;

    const handleFile = (file) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        if (img) img.src = dataUrl;
        if (empty) empty.style.display = 'none';
        if (preview) preview.style.display = 'flex';
        if (typeof onDataUrl === 'function') onDataUrl(dataUrl);
      };
      reader.readAsDataURL(file);
    };

    zone.addEventListener('click', () => input.click());
    input.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
      }
    });

    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('drag-over');
    });

    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));

    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    });
  }

  /**
   * Synchronizes UI inputs from stored config.
   */
  async syncUIFromStorage() {
    const cfg = await getConfig();

    // Set media mode segment
    if (cfg.mode) {
      const segMedia = this.shadow.getElementById('segMediaMode');
      if (segMedia) {
        segMedia.querySelectorAll('.hud-segment-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.val === cfg.mode);
        });
      }

      const isVideo = cfg.mode !== 'text-to-image';
      const grpDuration = this.shadow.getElementById('grpDuration');
      if (grpDuration) grpDuration.style.display = isVideo ? 'flex' : 'none';

      const grpMultiplier = this.shadow.getElementById('grpMultiplier');
      if (grpMultiplier) grpMultiplier.style.display = isVideo ? 'none' : 'flex';

      const grpVideoModels = this.shadow.getElementById('grpVideoModels');
      const grpImageModels = this.shadow.getElementById('grpImageModels');
      if (grpVideoModels) grpVideoModels.style.display = isVideo ? 'block' : 'none';
      if (grpImageModels) grpImageModels.style.display = isVideo ? 'none' : 'block';

      const grpVideoRes = this.shadow.getElementById('grpVideoRes');
      const grpImageRes = this.shadow.getElementById('grpImageRes');
      if (grpVideoRes) grpVideoRes.style.display = isVideo ? 'block' : 'none';
      if (grpImageRes) grpImageRes.style.display = isVideo ? 'none' : 'block';

      const ratioImgOnly = this.shadow.querySelectorAll('.ratio-img-only');
      ratioImgOnly.forEach(el => {
        el.style.display = isVideo ? 'none' : 'flex';
      });
    }

    // Set model dropdown
    const selModel = this.shadow.getElementById('selModelFamily');
    if (selModel && cfg.model) selModel.value = cfg.model;

    // Set duration segment
    if (cfg.duration) {
      const segDur = this.shadow.getElementById('segDuration');
      if (segDur) {
        segDur.querySelectorAll('.hud-segment-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.val === cfg.duration);
        });
      }
    }

    // Set aspect ratio segment
    if (cfg.aspectRatio) {
      const segRatio = this.shadow.getElementById('segAspectRatio');
      if (segRatio) {
        segRatio.querySelectorAll('.hud-segment-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.val === cfg.aspectRatio);
        });
      }
    }

    // Set outputs segment
    if (cfg.outputCount) {
      const segOut = this.shadow.getElementById('segOutputs');
      if (segOut) {
        segOut.querySelectorAll('.hud-segment-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.val === String(cfg.outputCount));
        });
      }
    }

    // Set resolution dropdown
    const selRes = this.shadow.getElementById('selResolution');
    if (selRes) {
      const isVideo = cfg.mode !== 'text-to-image';
      const targetRes = isVideo ? (cfg.videoResolution || '1080p') : (cfg.imageResolution || '2K');
      selRes.value = targetRes;
    }

    // Synchronize execution control buttons
    const isRunning = cfg.activeBatch && cfg.activeBatch.isRunning;
    const btnStart = this.shadow.getElementById('btnStartQueue');
    const btnStop = this.shadow.getElementById('btnStopQueue');
    if (btnStart) btnStart.disabled = isRunning;
    if (btnStop) btnStop.disabled = !isRunning;

    await this.syncQueueList();
  }

  /**
   * Refreshes queue list cards and counters.
   */
  async syncQueueList() {
    const queue = await getQueue();
    const container = this.shadow.getElementById('hudQueueListContainer');
    const badge = this.shadow.getElementById('hudQueueCountBadge');
    const summaryText = this.shadow.getElementById('hudQueueSummaryText');

    if (badge) badge.textContent = String(queue.length);
    if (summaryText) summaryText.textContent = `Queue: ${queue.length} items`;

    if (!container) return;

    if (queue.length === 0) {
      container.innerHTML = '<div class="queue-empty-msg">No items in queue. Add prompts above!</div>';
      return;
    }

    container.innerHTML = queue.map(it => renderQueueItem(it)).join('');

    // Attach card removal listeners
    container.querySelectorAll('.queue-card-remove-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        await removeQueueItem(id);
        await this.syncQueueList();
      });
    });
  }

  minimize() {
    this.isMinimized = true;
    this.container.classList.add('is-minimized');
    this.applyPosition(this.currentLeft, this.currentTop);

    saveConfig({
      settings: { overlayMinimized: true }
    }).catch(() => {});
  }

  restore() {
    this.isMinimized = false;
    this.container.classList.remove('is-minimized');
    this.applyPosition(this.currentLeft, this.currentTop);

    saveConfig({
      settings: { overlayMinimized: false }
    }).catch(() => {});
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  show() {
    this.isVisible = true;
    this.container.classList.remove('is-hidden');
    this.applyPosition(this.currentLeft, this.currentTop);
  }

  hide() {
    this.isVisible = false;
    this.container.classList.add('is-hidden');
  }

  updateTicker(text, statusType = 'idle') {
    if (this.tickerEl) this.tickerEl.textContent = text;
    if (this.statusDot) {
      this.statusDot.className = 'pill-status-dot';
      if (statusType === 'running') this.statusDot.classList.add('dot-running');
      else if (statusType === 'stopped') this.statusDot.classList.add('dot-stopped');
      else this.statusDot.classList.add('dot-idle');
    }
  }

  handleStorageUpdate(cfg) {
    if (!cfg) return;

    const isRunning = cfg.activeBatch && cfg.activeBatch.isRunning;

    const btnStart = this.shadow.getElementById('btnStartQueue');
    const btnStop = this.shadow.getElementById('btnStopQueue');

    if (isRunning) {
      if (btnStart) btnStart.disabled = true;
      if (btnStop) btnStop.disabled = false;
      const activeIdx = cfg.activeBatch.completedCount || 0;
      const total = cfg.activeBatch.totalCount || 1;
      this.updateTicker(`Running #${activeIdx + 1}/${total}`, 'running');
    } else {
      if (queueManager.getState() !== QUEUE_STATES.RUNNING) {
        if (btnStart) btnStart.disabled = false;
        if (btnStop) btnStop.disabled = true;
      }
      this.updateTicker('Idle', 'idle');
    }

    this.syncQueueList().catch(() => {});
  }
}

export const flowHUDHost = new FlowHUDHost();
