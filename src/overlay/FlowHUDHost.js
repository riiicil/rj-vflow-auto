/**
 * FlowHUDHost.js — Studio HUD Host & Reactive Automation Controller
 * 
 * Manages open Shadow DOM encapsulation (#flow-auto-hud-root),
 * fluid drag physics with boundary clamping, position persistence,
 * two-column studio layout orchestration, CustomSelect enhancement,
 * and live row-based queue building.
 * 
 * Full fidelity with bahan/vflow-note.md (lines 429-631) & RJ AIO Metadata (ADR-007).
 */

import {
  getConfig,
  saveConfig,
  getQueue,
  saveQueue,
  onChanged,
  getDefaultModelForMode,
  normalizeModelForMode
} from '../core/FlowStorage.js';

import { queueManager, QUEUE_STATES } from '../core/QueueManager.js';
import {
  renderStudioLayout,
  renderEmptyDropzone,
  renderQueueRow,
  getRowStatusInfo,
  formatRowParamsBadge,
  ICONS,
  DONATION_URL,
  DONATION_VARIANTS
} from './FlowHUDTemplates.js';
import { CustomSelect } from './CustomSelect.js';
import { flowImageDB } from '../core/FlowImageDB.js';
import { logger } from '../services/LoggerService.js';

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

    // Drag Physics State
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.initialLeft = 24;
    this.initialTop = 24;
    this.currentLeft = 24;
    this.currentTop = 24;
    this.saveDebounceTimer = null;

    // Queue & Mode State
    this.queueItems = [];
    this.activeMode = 'text-to-video';
    this.paramMode = 'batch';
    this.isSortMode = false;
    this.isRunning = false;
    this.lastOverallPercent = 0;
    this.draggedRowIdx = null;
    this.activeRowIdx = null;
    this.lastSelectedIdx = null;
    this.promptSaveDebounceTimer = null;
    this.config = null;
    this.supportTickerInterval = null;
    this.supportVariantIndex = 0;
  }

  /**
   * Initializes and mounts the HUD in the DOM.
   */
  async init() {
    if (this.host) return;

    // 1. Recover from stale batch state if reloaded mid-run
    await this.recoverStaleBatchState();

    // 2. Retrieve saved position and minimize state
    try {
      const cfg = await getConfig();
      this.config = cfg;
      if (cfg.settings && cfg.settings.overlayPosition) {
        this.currentLeft = cfg.settings.overlayPosition.x ?? 24;
        this.currentTop = cfg.settings.overlayPosition.y ?? 24;
      }
      this.isMinimized = Boolean(cfg.settings && cfg.settings.overlayMinimized);
      this.activeMode = cfg.mode || 'text-to-video';
      this.paramMode = cfg.paramMode || 'batch';
    } catch (e) {
      logger.warn('[FlowHUDHost] Failed to load initial state', e);
    }

    // 3. Load initial queue from storage
    try {
      this.queueItems = await getQueue();
      if (Array.isArray(this.queueItems)) {
        this.queueItems.forEach(it => {
          if (typeof it.selected !== 'boolean') it.selected = false;
        });
      }
      await this.hydrateQueuePreviews();
    } catch (e) {
      this.queueItems = [];
    }

    // 4. Create Host & Open Shadow Root (ADR-003)
    this.host = document.getElementById(this.hostId);
    if (!this.host) {
      this.host = document.createElement('div');
      this.host.id = this.hostId;
      document.body.appendChild(this.host);
    }

    this.shadow = this.host.attachShadow({ mode: 'open' });

    // 5. Inject Stylesheets into Shadow DOM with Loading Gate
    const loadStylesheet = (href) => new Promise((resolve) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = chrome.runtime.getURL(href);
      link.onload = () => resolve();
      link.onerror = () => resolve();
      this.shadow.appendChild(link);
      // Safety timeout: never block execution beyond 150ms if event fails
      setTimeout(resolve, 150);
    });

    await Promise.all([
      loadStylesheet('styles/variables.css'),
      loadStylesheet('styles/components.css'),
      loadStylesheet('overlay/overlay.css')
    ]);

    // 6. Build HUD markup
    this.buildMarkup();

    // 7. Setup Drag Physics, Window Controls, Workspace & Queue Events
    this.setupDragPhysics();
    this.setupControls();
    this.setupStudioEvents();

    // 8. Apply clamped position
    this.applyPosition(this.currentLeft, this.currentTop);

    // 9. Initial parameters sync and CustomSelect enhancement
    await this.syncUIFromStorage();

    // 10. Clean Mount Reveal: Remove is-mounting on next frame to suppress transition artifacts
    requestAnimationFrame(() => {
      if (this.container) {
        this.container.classList.remove('is-mounting');
      }
    });

    // 11. Subscribe to storage updates for live ticker
    onChanged(cfg => this.handleStorageUpdate(cfg));
  }

  /**
   * Recovers from abrupt tab reloads or crashes during active batch.
   */
  async recoverStaleBatchState() {
    try {
      const cfg = await getConfig();
      if (cfg.activeBatch && cfg.activeBatch.isRunning) {
        await saveConfig({
          activeBatch: {
            isRunning: false,
            activeItemId: null
          }
        });
      }
    } catch (err) {
      logger.warn('[FlowHUDHost] Failed to recover stale batch state', err);
    }
  }

  /**
   * Hydrates in-memory image preview URLs from FlowImageDB for items loaded from storage.
   */
  async hydrateQueuePreviews() {
    if (!Array.isArray(this.queueItems) || this.queueItems.length === 0) return;

    for (const item of this.queueItems) {
      if (Array.isArray(item.ingredients)) {
        for (const ing of item.ingredients) {
          if (ing && typeof ing === 'object' && ing.imageId && !ing.dataUrl) {
            try {
              const record = await flowImageDB.getImage(ing.imageId);
              if (record && (record.blob || record.file)) {
                ing.dataUrl = URL.createObjectURL(record.blob || record.file);
              }
            } catch (err) {
              logger.warn('[FlowHUDHost] Failed to hydrate ingredient preview', err);
            }
          }
        }
      }

      if (item.frames && typeof item.frames === 'object') {
        for (const slot of ['start', 'end']) {
          const frame = item.frames[slot];
          if (frame && typeof frame === 'object' && frame.imageId && !frame.dataUrl) {
            try {
              const record = await flowImageDB.getImage(frame.imageId);
              if (record && (record.blob || record.file)) {
                frame.dataUrl = URL.createObjectURL(record.blob || record.file);
              }
            } catch (err) {
              logger.warn('[FlowHUDHost] Failed to hydrate frame preview', err);
            }
          }
        }
      }
    }
  }

  /**
   * Constructs the HTML template inside the Shadow Root.
   */
  buildMarkup() {
    this.container = document.createElement('div');
    this.container.id = 'flow-hud-container';
    this.container.classList.add('is-mounting');
    if (this.isMinimized) {
      this.container.classList.add('is-minimized');
    }

    this.container.innerHTML = renderStudioLayout();
    this.shadow.appendChild(this.container);

    this.windowEl = this.shadow.querySelector('.hud-window');
    this.pillEl = this.shadow.getElementById('flowHudPill');
    this.statusDot = this.shadow.getElementById('pillStatusDot');
    this.tickerEl = this.shadow.getElementById('pillTickerText');
  }

  /**
   * Setup Draggable physics for HUD header and minimized floating pill.
   */
  setupDragPhysics() {
    const dragHandle = this.shadow.getElementById('hudDragHandle');
    const pill = this.shadow.getElementById('flowHudPill');

    const startDrag = (e) => {
      if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select') || e.target.closest('textarea')) {
        return;
      }
      this.isDragging = true;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.initialLeft = this.currentLeft;
      this.initialTop = this.currentTop;
      e.preventDefault();
    };

    if (dragHandle) dragHandle.addEventListener('mousedown', startDrag);
    if (pill) pill.addEventListener('mousedown', startDrag);

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.dragStartX;
      const dy = e.clientY - this.dragStartY;
      this.applyPosition(this.initialLeft + dx, this.initialTop + dy);
    });

    window.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.persistPosition();
      }
    });

    window.addEventListener('resize', () => {
      this.applyPosition(this.currentLeft, this.currentTop);
    });
  }

  /**
   * Viewport boundary clamping.
   */
  applyPosition(left, top) {
    const pad = 12;
    const width = this.isMinimized ? 220 : 820;
    const height = this.isMinimized ? 36 : 520;
    const maxLeft = Math.max(pad, window.innerWidth - width - pad);
    const maxTop = Math.max(pad, window.innerHeight - height - pad);

    this.currentLeft = Math.max(pad, Math.min(left, maxLeft));
    this.currentTop = Math.max(pad, Math.min(top, maxTop));

    if (this.container) {
      this.container.style.left = `${this.currentLeft}px`;
      this.container.style.top = `${this.currentTop}px`;
    }
  }

  persistPosition() {
    clearTimeout(this.saveDebounceTimer);
    this.saveDebounceTimer = setTimeout(() => {
      saveConfig({
        settings: {
          overlayPosition: { x: this.currentLeft, y: this.currentTop }
        }
      }).catch(() => {});
    }, 400);
  }

  /**
   * Window controls (minimize, close, restore).
   */
  setupControls() {
    const btnMin = this.shadow.getElementById('btnMinimizeHud');
    const btnClose = this.shadow.getElementById('btnCloseHud');
    const btnExpand = this.shadow.getElementById('btnExpandHud');

    if (btnMin) btnMin.addEventListener('click', () => this.minimize());
    if (btnClose) btnClose.addEventListener('click', () => this.hide());
    if (btnExpand) btnExpand.addEventListener('click', () => this.restore());
  }

  /**
   * Primary Workspace & Automation Controls Setup.
   */
  setupStudioEvents() {
    // 1. Render Left Column Queue Content (State A, B, C, or D)
    this.renderQueueContent();

    // 2. Toolbar Actions
    const btnAddRow = this.shadow.getElementById('btnAddQueueRow');
    if (btnAddRow) {
      btnAddRow.addEventListener('click', () => {
        if (this.isRunning) return;
        this.addQueueRow();
      });
    }

    const chkSelectAll = this.shadow.getElementById('chkSelectAllQueue');
    if (chkSelectAll) {
      chkSelectAll.addEventListener('change', (e) => {
        if (this.isRunning) {
          e.preventDefault();
          return;
        }
        const isChecked = e.target.checked;
        this.queueItems.forEach(item => {
          item.selected = isChecked;
        });
        if (isChecked) {
          this.activeRowIdx = 0;
          this.lastSelectedIdx = 0;
        } else {
          this.activeRowIdx = null;
          this.lastSelectedIdx = null;
        }
        this.updateSelectionUI();
      });
    }

    const btnBulkDelete = this.shadow.getElementById('btnBulkDeleteQueue');
    if (btnBulkDelete) {
      btnBulkDelete.addEventListener('click', async () => {
        if (this.isRunning) return;
        let toDelete = this.queueItems.filter(it => it.selected);
        if (toDelete.length === 0 && this.activeRowIdx !== null && this.queueItems[this.activeRowIdx]) {
          toDelete = [this.queueItems[this.activeRowIdx]];
        }
        if (toDelete.length === 0) return;

        // Clean up FlowImageDB records for deleted items
        for (const item of toDelete) {
          if (Array.isArray(item.ingredients)) {
            for (const ing of item.ingredients) {
              if (ing && ing.imageId) {
                flowImageDB.deleteImage(ing.imageId).catch(() => {});
              }
            }
          }
          if (item.frames) {
            for (const slot of ['start', 'end']) {
              if (item.frames[slot]?.imageId) {
                flowImageDB.deleteImage(item.frames[slot].imageId).catch(() => {});
              }
            }
          }
        }

        // Remove deleted items from queue
        this.queueItems = this.queueItems.filter(it => !toDelete.includes(it));
        this.activeRowIdx = null;
        this.lastSelectedIdx = null;

        // Re-render and update UI
        this.renderQueueContent();
        this.updateSelectionUI();
        await this.saveCurrentQueue();
      });
    }

    const btnToggleSort = this.shadow.getElementById('btnToggleSortMode');
    if (btnToggleSort) {
      btnToggleSort.addEventListener('click', () => {
        if (this.isRunning || this.queueItems.length < 1 || this.queueItems.some(it => it.selected)) return;
        this.isSortMode = !this.isSortMode;
        if (!this.isSortMode) {
          this.selectedSwapSlot = null;
        }
        btnToggleSort.classList.toggle('active', this.isSortMode);
        this.renderQueueContent();
        this.updateStartButtonState();
      });
    }

    const selParam = this.shadow.getElementById('selParamMode');
    if (selParam) {
      selParam.value = this.paramMode;
      selParam.addEventListener('change', async (e) => {
        if (this.isRunning) return;
        this.paramMode = e.target.value;
        await saveConfig({ paramMode: this.paramMode });
        this.updateSidebarParamModeUI();
        this.renderQueueContent();
        this.updateAllRowBadges();
      });
    }

    // 3. Right Sidebar Parameters
    const selMode = this.shadow.getElementById('selGenerationMode');
    if (selMode) {
      selMode.addEventListener('change', async (e) => {
        if (this.isRunning) return;
        const mode = e.target.value;
        const prevMode = this.activeMode;
        const isVideo = mode !== 'text-to-image' && mode !== 'edit-image';
        const normModel = isVideo ? 'Veo 3.1 - Lite' : 'Nano Banana 2';
        const normRes = isVideo ? '1080p' : '2K';

        if (this.paramMode === 'single') {
          const selected = this.queueItems.filter(it => it.selected);
          const targetItems = selected.length > 0
            ? selected
            : (this.activeRowIdx !== null && this.queueItems[this.activeRowIdx] ? [this.queueItems[this.activeRowIdx]] : []);
          if (targetItems.length > 0) {
            targetItems.forEach(it => {
              const oldItemMode = it.mode || prevMode;
              it.mode = mode;
              it.model = normalizeModelForMode(mode, it.model);
              if (isVideo) {
                if (!it.resolution || !it.resolution.includes('p')) it.resolution = normRes;
              } else {
                if (!it.resolution || !it.resolution.includes('K')) it.resolution = normRes;
              }
              // Convert single row media representation if changing between f2v and single ingredient
              if (mode === 'frames-to-video' && (oldItemMode === 'image-to-video' || oldItemMode === 'edit-image')) {
                if (it.ingredients && it.ingredients[0]) {
                  it.frames = it.frames || {};
                  it.frames.start = it.ingredients[0];
                  it.ingredients = [];
                }
              } else if ((mode === 'image-to-video' || mode === 'edit-image') && oldItemMode === 'frames-to-video') {
                if (it.frames && (it.frames.start || it.frames.end)) {
                  it.ingredients = [it.frames.start || it.frames.end];
                  it.frames = {};
                }
              }
            });
            this.syncModeUI(mode);
            this.renderQueueContent();
            this.updateStartButtonState();
            await this.saveCurrentQueue();
          }
        } else {
          // Batch mode: convert queue rows between single ingredient and paired frames
          this.convertQueueBetweenModes(prevMode, mode);
          this.activeMode = mode;
          await saveConfig({
            mode: this.activeMode,
            model: normModel,
            videoResolution: isVideo ? '1080p' : undefined,
            imageResolution: !isVideo ? '2K' : undefined
          });
          this.syncModeUI(this.activeMode);
          this.renderQueueContent();
          this.updateStartButtonState();
          await this.saveCurrentQueue();
        }
      });
    }

    const selModel = this.shadow.getElementById('selModelFamily');
    if (selModel) {
      selModel.addEventListener('change', async (e) => {
        if (this.isRunning) return;
        const val = e.target.value;
        if (this.paramMode === 'single') {
          const selected = this.queueItems.filter(it => it.selected);
          const targetItems = selected.length > 0
            ? selected
            : (this.activeRowIdx !== null && this.queueItems[this.activeRowIdx] ? [this.queueItems[this.activeRowIdx]] : []);
          if (targetItems.length > 0) {
            targetItems.forEach(it => {
              it.model = val;
            });
            const activeMode = targetItems[0]?.mode;
            this.syncModelUI(val, activeMode);
            await this.saveCurrentQueue();
          }
        } else {
          await saveConfig({ model: val });
          this.syncModelUI(val, this.activeMode);
        }
        this.updateAllRowBadges();
      });
    }

    // Segmented Button Groups (Duration, Aspect Ratio, Outputs)
    this.setupSegmentGroup('segDuration', async (val) => {
      if (this.paramMode === 'single') {
        const selected = this.queueItems.filter(it => it.selected);
        const targetItems = selected.length > 0
          ? selected
          : (this.activeRowIdx !== null && this.queueItems[this.activeRowIdx] ? [this.queueItems[this.activeRowIdx]] : []);
        if (targetItems.length > 0) {
          targetItems.forEach(it => {
            it.duration = val;
          });
          this.updateAllRowBadges();
          await this.saveCurrentQueue();
        }
      } else {
        await saveConfig({ duration: val }).catch(() => {});
        this.updateAllRowBadges();
      }
    });

    this.setupSegmentGroup('segAspectRatio', async (val) => {
      if (this.paramMode === 'single') {
        const selected = this.queueItems.filter(it => it.selected);
        const targetItems = selected.length > 0
          ? selected
          : (this.activeRowIdx !== null && this.queueItems[this.activeRowIdx] ? [this.queueItems[this.activeRowIdx]] : []);
        if (targetItems.length > 0) {
          targetItems.forEach(it => {
            it.aspectRatio = val;
          });
          this.updateAllRowBadges();
          await this.saveCurrentQueue();
        }
      } else {
        await saveConfig({ aspectRatio: val }).catch(() => {});
        this.updateAllRowBadges();
      }
    });

    this.setupSegmentGroup('segOutputs', async (val) => {
      const count = Number(val);
      if (this.paramMode === 'single') {
        const selected = this.queueItems.filter(it => it.selected);
        const targetItems = selected.length > 0
          ? selected
          : (this.activeRowIdx !== null && this.queueItems[this.activeRowIdx] ? [this.queueItems[this.activeRowIdx]] : []);
        if (targetItems.length > 0) {
          targetItems.forEach(it => {
            it.outputs = count;
            it.outputCount = count;
          });
          this.updateAllRowBadges();
          await this.saveCurrentQueue();
        }
      } else {
        await saveConfig({ outputCount: count }).catch(() => {});
        this.updateAllRowBadges();
      }
    });

    const selRes = this.shadow.getElementById('selResolution');
    if (selRes) {
      selRes.addEventListener('change', async (e) => {
        if (this.isRunning) return;
        const val = e.target.value;
        if (this.paramMode === 'single') {
          const selected = this.queueItems.filter(it => it.selected);
          const targetItems = selected.length > 0
            ? selected
            : (this.activeRowIdx !== null && this.queueItems[this.activeRowIdx] ? [this.queueItems[this.activeRowIdx]] : []);
          if (targetItems.length > 0) {
            targetItems.forEach(it => {
              it.resolution = val;
            });
            await this.saveCurrentQueue();
          }
        } else {
          const isVideo = this.activeMode !== 'text-to-image' && this.activeMode !== 'edit-image';
          if (isVideo) {
            saveConfig({ videoResolution: val }).catch(() => {});
          } else {
            saveConfig({ imageResolution: val }).catch(() => {});
          }
        }
        this.updateAllRowBadges();
      });
    }

    // 4. Footer Execution Controls
    const btnSupportDev = this.shadow.getElementById('btnSupportDev');
    if (btnSupportDev) {
      btnSupportDev.addEventListener('click', (e) => {
        e.stopPropagation();
        try {
          window.open(DONATION_URL, '_blank');
        } catch (err) {
          logger.error('[FlowHUDHost] Failed to open donation link', err);
        }
      });
    }

    const btnClearAllQueue = this.shadow.getElementById('btnClearAllQueue');
    if (btnClearAllQueue) {
      btnClearAllQueue.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.isRunning) return;
        this.queueItems = [];
        this.activeRowIdx = null;
        this.lastSelectedIdx = null;
        this.renderQueueContent();
        this.updateSelectionUI();
        this.updateStartButtonState();
        await this.saveCurrentQueue();
      });
    }

    const btnResetQueue = this.shadow.getElementById('btnResetQueue');
    if (btnResetQueue) {
      btnResetQueue.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.isRunning) return;
        this.queueItems.forEach(it => {
          it.status = 'pending';
          it.error = null;
        });
        this.renderQueueContent();
        this.updateAllRowBadges();
        this.updateSelectionUI();
        this.updateStartButtonState();
        await this.saveCurrentQueue();
      });
    }

    const btnStart = this.shadow.getElementById('btnStartQueue');

    if (btnStart) {
      btnStart.addEventListener('click', async (e) => {
        e.preventDefault();
        const currentState = queueManager.getState();

        if (currentState === QUEUE_STATES.RUNNING) {
          btnStart.disabled = true;
          try {
            await queueManager.stop(false);
          } catch (err) {
            logger.error('[FlowHUDHost] Failed to stop queue', err);
          } finally {
            this.updateStartButtonState();
          }
        } else if (currentState === QUEUE_STATES.STOPPING) {
          // Already in graceful stop process
          return;
        } else {
          const totalRows = this.queueItems.length;
          const allPromptsFilled = totalRows > 0 && this.queueItems.every(it => Boolean(it.prompt && it.prompt.trim().length > 0));

          if (!allPromptsFilled) {
            if (totalRows === 0) {
              this.addQueueRow();
            } else {
              this.updateStartButtonState();
            }
            return;
          }

          // Persist before starting
          await this.saveCurrentQueue();

          btnStart.disabled = true;
          btnStart.classList.add('is-disabled');
          try {
            await queueManager.start();
          } catch (err) {
            logger.error('[FlowHUDHost] Failed to start queue', err);
            this.updateStartButtonState();
          }
        }
      });
    }

    // 5. Subscribe to QueueManager State Changes & Progress
    queueManager.onStateChange((state) => {
      const bStart = this.shadow.getElementById('btnStartQueue');
      const bSupport = this.shadow.getElementById('btnSupportDev');

      if (state === QUEUE_STATES.RUNNING) {
        this.isRunning = true;
        this.lastOverallPercent = 0;
        if (bStart) {
          bStart.classList.remove('rj-btn-accent', 'is-disabled', 'is-stopping');
          bStart.classList.add('rj-btn-danger', 'rj-btn-stop');
          bStart.innerHTML = `${ICONS.STOP} <span id="btnStartQueueText">Stop</span>`;
          bStart.title = 'Stop running generation';
          bStart.disabled = false;
        }
        if (bSupport) {
          bSupport.style.display = '';
          bSupport.classList.add('is-visible');
          this.startSupportTicker();
        }
        this.setFormControlsDisabled(true);
        this.updateAllRowBadges();
        this.updateQueueSummaryUI(true, { current: 1, total: Math.max(1, this.queueItems.length), percent: 0 });
      } else if (state === QUEUE_STATES.STOPPING) {
        // Graceful stop in progress: allow current item to finish generating and downloading
        if (bStart) {
          bStart.disabled = true;
          bStart.classList.remove('rj-btn-accent');
          bStart.classList.add('rj-btn-danger', 'is-disabled', 'is-stopping');
          bStart.innerHTML = `${ICONS.SPINNER} <span id="btnStartQueueText">Stopping...</span>`;
          bStart.title = 'Stopping generation (finishing active item)...';
        }
        if (bSupport) {
          bSupport.style.display = '';
          bSupport.classList.add('is-visible');
        }
        const summaryBadge = this.shadow.getElementById('hudQueueSummaryText');
        if (summaryBadge) {
          summaryBadge.innerHTML = `<span class="dot-idle" style="background-color: #ff9494;"></span> <span>Stopping...</span>`;
        }
      } else if (state === QUEUE_STATES.STOPPED || state === QUEUE_STATES.IDLE) {
        this.isRunning = false;
        this.lastOverallPercent = 0;
        if (bStart) {
          bStart.classList.remove('rj-btn-danger', 'rj-btn-stop', 'is-stopping');
          bStart.classList.add('rj-btn-accent');
          bStart.innerHTML = `${ICONS.PLAY} <span id="btnStartQueueText">Start</span>`;
        }
        if (bSupport) {
          bSupport.style.display = '';
          bSupport.classList.remove('is-visible');
          this.stopSupportTicker();
        }
        this.setFormControlsDisabled(false);
        const container = this.shadow?.getElementById('hudQueueContent');
        if (container) {
          container.querySelectorAll('.hud-queue-row.is-processing').forEach(r => r.classList.remove('is-processing'));
        }
        this.syncQueueFromStorage().catch(() => {});
        this.updateStartButtonState();
        this.updateAllRowBadges();
        this.updateQueueSummaryUI(false);
      } else {
        this.isRunning = false;
        this.lastOverallPercent = 0;
        if (bStart) {
          bStart.classList.remove('rj-btn-danger', 'rj-btn-stop', 'is-stopping');
          bStart.classList.add('rj-btn-accent');
          bStart.innerHTML = `${ICONS.PLAY} <span id="btnStartQueueText">Start</span>`;
        }
        if (bSupport) {
          bSupport.style.display = '';
          bSupport.classList.remove('is-visible');
          this.stopSupportTicker();
        }
        this.setFormControlsDisabled(false);
        const container = this.shadow?.getElementById('hudQueueContent');
        if (container) {
          container.querySelectorAll('.hud-queue-row.is-processing').forEach(r => r.classList.remove('is-processing'));
        }
        this.syncQueueFromStorage().catch(() => {});
        this.updateStartButtonState();
        this.updateAllRowBadges();
        this.updateQueueSummaryUI(false);
      }
    });

    queueManager.onProgress((payload) => {
      if (!payload || !payload.itemId) return;

      const container = this.shadow?.getElementById('hudQueueContent');
      const isProcessing = (payload.status === 'injecting' || payload.status === 'generating' || payload.status === 'downloading');

      // Manage active glowing row animation on all rows
      if (container) {
        container.querySelectorAll('.hud-queue-row').forEach(r => {
          if (r.dataset.id === payload.itemId && isProcessing) {
            r.classList.add('is-processing');
          } else {
            r.classList.remove('is-processing');
          }
        });
      }

      const row = this.shadow.querySelector(`.hud-queue-row[data-id="${payload.itemId}"]`);
      if (row) {
        const status = payload.status || 'pending';
        const isChecked = row.classList.contains('row-checked');
        const isActive = row.classList.contains('row-active');
        row.className = `hud-queue-row status-${status}${isActive ? ' row-active' : ''}${isChecked ? ' row-checked' : ''}${isProcessing ? ' is-processing' : ''}`;

        let badge = row.querySelector('.row-status-badge');
        if (!badge) {
          let badgeGroup = row.querySelector('.row-badges-group');
          if (!badgeGroup) {
            badgeGroup = document.createElement('div');
            badgeGroup.className = 'row-badges-group';
            row.querySelector('.row-input-wrapper')?.appendChild(badgeGroup);
          }
          badge = document.createElement('span');
          badgeGroup.appendChild(badge);
        }

        if (status === 'generating') {
          badge.className = 'row-status-badge status-generating';
          badge.textContent = 'GENERATING';
        } else if (status === 'downloading') {
          badge.className = 'row-status-badge status-downloading';
          badge.textContent = 'DOWNLOADING';
        } else if (status === 'injecting') {
          badge.className = 'row-status-badge status-injecting';
          badge.textContent = 'INJECTING';
        } else if (status === 'completed') {
          badge.className = 'row-status-badge status-completed';
          badge.textContent = 'COMPLETED';
        } else if (status === 'failed') {
          badge.className = 'row-status-badge status-failed';
          badge.textContent = 'FAILED';
        } else {
          const idx = Number(row.dataset.idx);
          const it = this.queueItems[idx];
          if (it) {
            const rowMode = (this.paramMode === 'single' && it.mode) ? it.mode : this.activeMode;
            const info = getRowStatusInfo(it, rowMode);
            badge.className = `row-status-badge ${info.statusClass}`;
            badge.textContent = info.label;
          }
        }
      }

      // Synchronize in-memory item status
      const matchedItem = this.queueItems.find(it => it.id === payload.itemId);
      if (matchedItem) {
        matchedItem.status = payload.status;
      }

      // Refresh status badges for all rows (active becomes GENERATING/etc., waiting rows become QUEUED)
      this.updateAllRowBadges();

      let currentIdx = this.queueItems.findIndex(it => it.id === payload.itemId);
      if (currentIdx === -1) currentIdx = 0;
      const current = currentIdx + 1;
      const total = this.queueItems.length || 1;
      const overallPercent = this.calculateCumulativeProgress(payload.itemId, payload.status, payload.percent);

      if (isProcessing) {
        this.updateQueueSummaryUI(true, { current, total, percent: overallPercent });
      } else if (payload.status === 'completed' || payload.status === 'failed') {
        this.updateQueueSummaryUI(true, { current, total, percent: overallPercent });
      }
    });
  }

  /**
   * Calculates overall batch queue percentage accumulated across all row stages and sub-steps.
   * Monotonically increases without resets or jarring jumps.
   */
  calculateCumulativeProgress(activeItemId = null, activeStatus = null, activeItemPercent = 0) {
    const total = this.queueItems.length || 1;
    let accumulated = 0;

    for (const it of this.queueItems) {
      if (it.id === activeItemId) {
        if (activeStatus === 'completed' || activeStatus === 'failed') {
          accumulated += 100;
        } else {
          accumulated += Math.max(0, Math.min(100, Number(activeItemPercent) || 0));
        }
      } else if (it.status === 'completed' || it.status === 'failed') {
        accumulated += 100;
      } else {
        accumulated += 0;
      }
    }

    const calculated = Math.min(100, Math.max(0, Math.round(accumulated / total)));
    const overallPercent = Math.max(this.lastOverallPercent || 0, calculated);
    this.lastOverallPercent = overallPercent;
    return overallPercent;
  }

  /**
   * Disables or enables interactive form inputs and toolbar controls during queue execution.
   * Preserves row container clickability so users can still inspect row parameters in read-only mode.
   */
  setFormControlsDisabled(disabled) {
    const hudWindow = this.shadow?.querySelector('.hud-window');
    if (hudWindow) {
      hudWindow.classList.toggle('queue-is-running', disabled);
    }

    // 1. Right-column Parameter Controls
    const selGenerationMode = this.shadow?.getElementById('selGenerationMode');
    if (selGenerationMode) {
      selGenerationMode.disabled = disabled;
      CustomSelect.refresh(selGenerationMode);
    }

    const selModelFamily = this.shadow?.getElementById('selModelFamily');
    if (selModelFamily) {
      selModelFamily.disabled = disabled;
      CustomSelect.refresh(selModelFamily);
    }

    const selResolution = this.shadow?.getElementById('selResolution');
    if (selResolution) {
      selResolution.disabled = disabled;
      CustomSelect.refresh(selResolution);
    }

    const chkAutoDownload = this.shadow?.getElementById('chkAutoDownload');
    if (chkAutoDownload) chkAutoDownload.disabled = disabled;

    const btnResetSettings = this.shadow?.getElementById('btnResetSettings');
    if (btnResetSettings) {
      btnResetSettings.disabled = disabled;
      btnResetSettings.classList.toggle('is-disabled', disabled);
    }

    // Segmented Button Groups (Duration, Aspect Ratio, Outputs)
    ['segDuration', 'segAspectRatio', 'segOutputs'].forEach(id => {
      const segGroup = this.shadow?.getElementById(id);
      if (segGroup) {
        segGroup.classList.toggle('is-disabled', disabled);
        segGroup.querySelectorAll('.rj-segment-btn').forEach(btn => {
          btn.disabled = disabled;
          btn.classList.toggle('is-disabled', disabled);
        });
      }
    });

    // 2. Queue Action Toolbar Controls
    const selParamMode = this.shadow?.getElementById('selParamMode');
    if (selParamMode) {
      selParamMode.disabled = disabled;
      CustomSelect.refresh(selParamMode);
    }

    const chkSelectAll = this.shadow?.getElementById('chkSelectAllQueue');
    if (chkSelectAll) {
      chkSelectAll.disabled = disabled;
      chkSelectAll.classList.toggle('is-disabled', disabled);
    }

    const btnToggleSort = this.shadow?.getElementById('btnToggleSortMode');
    if (btnToggleSort) {
      btnToggleSort.disabled = disabled;
      btnToggleSort.classList.toggle('is-disabled', disabled);
    }

    const btnAddRow = this.shadow?.getElementById('btnAddQueueRow');
    if (btnAddRow) {
      btnAddRow.disabled = disabled;
      btnAddRow.classList.toggle('is-disabled', disabled);
    }

    const btnBulkDelete = this.shadow?.getElementById('btnBulkDeleteQueue');
    if (btnBulkDelete) {
      btnBulkDelete.disabled = disabled;
      btnBulkDelete.classList.toggle('is-disabled', disabled);
      if (disabled) {
        btnBulkDelete.style.display = 'none';
      }
    }

    // 3. Queue Row Interactive Items
    const content = this.shadow?.getElementById('hudQueueContent');
    if (content) {
      content.querySelectorAll('.row-select-checkbox').forEach(cb => {
        cb.disabled = disabled;
        cb.classList.toggle('is-disabled', disabled);
      });

      content.querySelectorAll('.row-prompt-input').forEach(ta => {
        ta.disabled = disabled;
        ta.readOnly = disabled;
        ta.classList.toggle('is-disabled', disabled);
        ta.classList.toggle('is-readonly', disabled);
      });

      content.querySelectorAll('.row-media-slot').forEach(slot => {
        slot.classList.toggle('is-disabled', disabled);
      });

      content.querySelectorAll('.row-remove-thumb-btn').forEach(btn => {
        btn.disabled = disabled;
        btn.classList.toggle('is-disabled', disabled);
      });

      content.querySelectorAll('.row-swap-frames-btn').forEach(btn => {
        btn.disabled = disabled;
        btn.classList.toggle('is-disabled', disabled);
      });
    }

    // 4. Empty Dropzone Quick Actions
    const btnQuickAdd = this.shadow?.getElementById('btnQuickAddEmptyRow');
    if (btnQuickAdd) {
      btnQuickAdd.disabled = disabled;
      btnQuickAdd.classList.toggle('is-disabled', disabled);
    }

    const btnQuickPaste = this.shadow?.getElementById('btnQuickPasteClipboard');
    if (btnQuickPaste) {
      btnQuickPaste.disabled = disabled;
      btnQuickPaste.classList.toggle('is-disabled', disabled);
    }

    if (!disabled) {
      this.updateSelectionUI();
    }
  }

  /**
   * Synchronizes both the bottom-left footer summary badge and minimized floating pill.
   * Idle with 0 ready items: [dot] Idle
   * Idle with N ready items: [Prompt SVG] N prompt queued (footer) / N queued (pill)
   * Running: [Spinner SVG] Processing X/Y (Z%) (footer) / Processing Z% (pill)
   */
  updateQueueSummaryUI(isProcessing = false, progressInfo = null) {
    const summaryEl = this.shadow?.getElementById('hudQueueSummaryText');
    const pillTicker = this.shadow?.getElementById('pillTickerText');
    const pillDot = this.shadow?.getElementById('pillStatusDot');

    // Count how many rows are genuinely ready with non-empty prompts and required media
    const readyCount = this.queueItems.filter(it => {
      const rowMode = (this.paramMode === 'single' && it.mode) ? it.mode : this.activeMode;
      const info = getRowStatusInfo(it, rowMode, this.isRunning);
      return info.label === 'READY' || info.label === 'QUEUED';
    }).length;

    if (isProcessing && progressInfo) {
      const { current, total, percent } = progressInfo;
      // 1. Footer summary
      if (summaryEl) {
        summaryEl.className = 'hud-stats-badge is-processing';
        summaryEl.innerHTML = `${ICONS.SPINNER} <span>Processing ${current}/${total} (${percent}%)</span>`;
      }
      // 2. Minimized floating pill
      if (pillTicker) {
        pillTicker.className = 'pill-ticker is-processing';
        pillTicker.innerHTML = `${ICONS.SPINNER} <span>Processing ${percent}%</span>`;
      }
      if (pillDot) {
        pillDot.style.display = 'none';
      }
    } else {
      // Idle state
      if (readyCount > 0) {
        if (summaryEl) {
          summaryEl.className = 'hud-stats-badge is-queued';
          summaryEl.innerHTML = `${ICONS.PROMPT} <span>${readyCount} prompt queued</span>`;
        }
        if (pillTicker) {
          pillTicker.className = 'pill-ticker is-queued';
          pillTicker.innerHTML = `${ICONS.PROMPT} <span>${readyCount} queued</span>`;
        }
        if (pillDot) {
          pillDot.style.display = 'none';
        }
      } else {
        if (summaryEl) {
          summaryEl.className = 'hud-stats-badge is-idle';
          summaryEl.innerHTML = `<span class="dot-idle"></span> <span>Idle</span>`;
        }
        if (pillTicker) {
          pillTicker.className = 'pill-ticker is-idle';
          pillTicker.innerHTML = `<span>Idle</span>`;
        }
        if (pillDot) {
          pillDot.style.display = 'inline-block';
          pillDot.className = 'pill-status-dot dot-idle';
        }
      }
    }
  }

  /**
   * Renders the dynamic Left Column content (State A, B, C, or D).
   */
  renderQueueContent() {
    const container = this.shadow.getElementById('hudQueueContent');
    if (!container) return;

    const count = this.queueItems.length;

    if (queueManager.getState() !== QUEUE_STATES.RUNNING) {
      this.updateQueueSummaryUI(false);
    }

    if (count === 0) {
      // State A: Empty State Dropzone
      container.innerHTML = renderEmptyDropzone();
      this.bindEmptyDropzoneEvents();
      this.updateSelectionUI();
      this.updateStartButtonState();
      return;
    }

    // State B, C, D: Render Rows
    container.innerHTML = this.queueItems.map((it, idx) => {
      const rowMode = (this.paramMode === 'single' && it.mode) ? it.mode : this.activeMode;
      const params = this.getEffectiveRowParams(it);
      return renderQueueRow(it, idx, rowMode, this.isSortMode, params, this.isRunning);
    }).join('');

    if (this.isSortMode && this.selectedSwapSlot) {
      const { rowIdx, slotType } = this.selectedSwapSlot;
      const activeSlot = container.querySelector(`.row-media-slot[data-idx="${rowIdx}"][data-slot="${slotType}"]`);
      if (activeSlot) activeSlot.classList.add('swap-source');
    }

    this.bindRowEvents();
    this.updateSelectionUI();
    this.updateStartButtonState();
    if (this.isRunning) {
      this.setFormControlsDisabled(true);
    }
  }

  /**
   * Binds dropzone and quick action buttons for State A.
   */
  bindEmptyDropzoneEvents() {
    const dropzone = this.shadow.getElementById('hudEmptyDropzone');
    const fileInput = this.shadow.getElementById('fileEmptyDropzone');
    const btnQuickAdd = this.shadow.getElementById('btnQuickAddEmptyRow');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
      });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          this.handleBulkFiles(Array.from(e.dataTransfer.files));
        }
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          this.handleBulkFiles(Array.from(e.target.files));
          fileInput.value = '';
        }
      });
    }

    if (btnQuickAdd) btnQuickAdd.addEventListener('click', () => this.addQueueRow());
    const btnQuickPaste = this.shadow.getElementById('btnQuickPasteClipboard');
    if (btnQuickPaste) btnQuickPaste.addEventListener('click', () => this.pasteClipboard());
  }

  /**
   * Binds inputs, media pickers, and deletion for active queue rows.
   */
  bindRowEvents() {
    const container = this.shadow.getElementById('hudQueueContent');
    if (!container) return;

    // 1. Textarea prompt changes, validation, and debounced auto-save
    container.querySelectorAll('.row-prompt-input').forEach(input => {
      input.addEventListener('input', (e) => {
        if (this.isRunning) return;
        const idx = Number(e.target.dataset.idx);
        if (this.queueItems[idx]) {
          this.queueItems[idx].prompt = e.target.value;
          if (this.paramMode === 'single' && (this.activeRowIdx === idx || this.queueItems[idx].selected)) {
            this.updateSidebarParamModeUI();
          }
          this.updateRowBadges(idx);
          this.updateStartButtonState();

          clearTimeout(this.promptSaveDebounceTimer);
          this.promptSaveDebounceTimer = setTimeout(() => {
            this.saveCurrentQueue().catch(() => {});
          }, 500);
        }
      });

      input.addEventListener('blur', () => {
        if (this.isRunning) return;
        clearTimeout(this.promptSaveDebounceTimer);
        this.saveCurrentQueue().catch(() => {});
      });

      input.addEventListener('focus', (e) => {
        if (this.isRunning) return;
        const idx = Number(e.target.dataset.idx);
        this.activeRowIdx = idx;
        this.updateSelectionUI();
      });
    });

    // 2. Row selection checkbox changes
    container.querySelectorAll('.row-select-checkbox').forEach(cb => {
      cb.addEventListener('click', (e) => {
        if (this.isRunning) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        e.stopPropagation();
      });

      cb.addEventListener('change', (e) => {
        e.stopPropagation();
        if (this.isRunning || this.isSortMode) return;
        const idx = Number(cb.dataset.idx);

        if (e.shiftKey && this.lastSelectedIdx !== null) {
          // Range selection
          const start = Math.min(this.lastSelectedIdx, idx);
          const end = Math.max(this.lastSelectedIdx, idx);
          this.queueItems.forEach((it, i) => {
            if (i >= start && i <= end) it.selected = true;
          });
          this.activeRowIdx = idx;
        } else {
          if (cb.checked) {
            this.queueItems[idx].selected = true;
            this.activeRowIdx = idx;
            this.lastSelectedIdx = idx;
          } else {
            this.queueItems[idx].selected = false;
            // When unchecking: if this row was active, shift active to remaining checked row, or null if none
            if (this.activeRowIdx === idx) {
              const remaining = this.queueItems.findIndex((it, i) => it.selected && i !== idx);
              this.activeRowIdx = remaining !== -1 ? remaining : null;
              this.lastSelectedIdx = this.activeRowIdx;
            } else {
              const remainingCount = this.queueItems.filter(it => it.selected).length;
              if (remainingCount === 0) {
                this.activeRowIdx = null;
                this.lastSelectedIdx = null;
              }
            }
          }
        }
        this.updateSelectionUI();
      });
    });

    // 3. Row container click engine (Direct Click, Shift+Click, Ctrl+Click)
    container.querySelectorAll('.hud-queue-row').forEach(row => {
      row.addEventListener('click', (e) => {
        // If batch is running: allow selecting/unselecting row to view parameters in sidebar (strictly read-only)
        if (this.isRunning) {
          const idx = Number(row.dataset.idx);
          if (!isNaN(idx) && this.queueItems[idx]) {
            if (this.activeRowIdx === idx) {
              this.activeRowIdx = null;
              this.lastSelectedIdx = null;
            } else {
              this.activeRowIdx = idx;
              this.lastSelectedIdx = idx;
            }
            this.updateSelectionUI();
            this.updateSidebarParamModeUI();
            this.setFormControlsDisabled(true);
          }
          return;
        }

        // Ignore clicks on actionable child elements
        if (e.target && (
          e.target.closest('.row-select-checkbox') ||
          e.target.closest('.row-media-slot') ||
          e.target.closest('.row-file-input') ||
          e.target.closest('.row-remove-thumb-btn') ||
          e.target.closest('.row-swap-frames-btn') ||
          e.target.closest('.row-prompt-input')
        )) {
          return;
        }

        if (this.isSortMode) return;

        const idx = Number(row.dataset.idx);
        if (isNaN(idx) || !this.queueItems[idx]) return;

        const selectedCount = this.queueItems.filter(it => it.selected).length;

        if (e.shiftKey && (this.lastSelectedIdx !== null || this.activeRowIdx !== null)) {
          // Shift + Click: Range Selection
          const anchor = this.lastSelectedIdx !== null ? this.lastSelectedIdx : this.activeRowIdx;
          const start = Math.min(anchor, idx);
          const end = Math.max(anchor, idx);
          this.queueItems.forEach((it, i) => {
            if (i >= start && i <= end) it.selected = true;
          });
          this.activeRowIdx = idx;
          this.lastSelectedIdx = idx;
        } else if (e.ctrlKey || e.metaKey) {
          // Ctrl / Cmd + Click: Toggle Selection
          if (selectedCount === 0 && this.activeRowIdx !== null && this.activeRowIdx !== idx) {
            // When a row was focused (e.g. row 2) and user Ctrl+Clicks row 3:
            // Both the previously focused row AND clicked row become CHECKED!
            const prevActive = this.activeRowIdx;
            if (this.queueItems[prevActive]) {
              this.queueItems[prevActive].selected = true;
            }
            this.queueItems[idx].selected = true;
            this.activeRowIdx = idx;
            this.lastSelectedIdx = idx;
          } else {
            this.queueItems[idx].selected = !this.queueItems[idx].selected;
            if (this.queueItems[idx].selected) {
              this.activeRowIdx = idx;
              this.lastSelectedIdx = idx;
            } else {
              if (this.activeRowIdx === idx) {
                const remaining = this.queueItems.findIndex(it => it.selected);
                this.activeRowIdx = remaining !== -1 ? remaining : null;
                this.lastSelectedIdx = this.activeRowIdx;
              }
            }
          }
        } else {
          // Normal Click:
          if (selectedCount === 0) {
            // Case A: Currently 0 items are checked
            if (this.activeRowIdx === null) {
              // Subcase A1: Focus this row without checking checkbox
              this.activeRowIdx = idx;
              this.lastSelectedIdx = idx;
            } else if (this.activeRowIdx === idx) {
              // Subcase A2 (Kondisi 1): Click already focused row again -> UN-FOCUS (lepas fokus)
              this.activeRowIdx = null;
              this.lastSelectedIdx = null;
            } else {
              // Subcase A3: Another row was focused (e.g. row 2) and user clicks row 3 WITHOUT Ctrl:
              // Normal click simply switches focus to row 3 without checking checkboxes
              this.activeRowIdx = idx;
              this.lastSelectedIdx = idx;
            }
          } else {
            // Case B: 1 or more items are already checked (selectedCount > 0)
            if (this.queueItems[idx].selected) {
              // Subcase B1 (Kondisi 2): Clicked row is already checked -> UNCHECK this row
              this.queueItems[idx].selected = false;
              // Shift active focus to remaining checked row, or null if none
              const remainingChecked = this.queueItems.findIndex((it, i) => it.selected && i !== idx);
              this.activeRowIdx = remainingChecked !== -1 ? remainingChecked : null;
              this.lastSelectedIdx = this.activeRowIdx;
            } else {
              // Subcase B2: Clicked row is not checked -> check this row too ("ikut kecentang")
              this.queueItems[idx].selected = true;
              this.activeRowIdx = idx;
              this.lastSelectedIdx = idx;
            }
          }
        }

        this.updateSelectionUI();
      });
    });

    // 3. Sort Mode Drag & Drop Reordering Handlers
    if (this.isSortMode) {
      const rows = container.querySelectorAll('.hud-queue-row');
      rows.forEach(row => {
        row.addEventListener('dragstart', (e) => {
          const idx = Number(row.dataset.idx);
          this.draggedRowIdx = idx;
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', String(idx));
          row.classList.add('is-dragging');
        });

        row.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';

          const rect = row.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          if (e.clientY < midY) {
            row.classList.add('drag-over-top');
            row.classList.remove('drag-over-bottom');
          } else {
            row.classList.add('drag-over-bottom');
            row.classList.remove('drag-over-top');
          }
        });

        row.addEventListener('dragleave', (e) => {
          if (!row.contains(e.relatedTarget)) {
            row.classList.remove('drag-over-top', 'drag-over-bottom');
          }
        });

        row.addEventListener('drop', (e) => {
          e.preventDefault();
          e.stopPropagation();

          const targetIdx = Number(row.dataset.idx);
          const draggedIdx = this.draggedRowIdx;
          const isBottom = row.classList.contains('drag-over-bottom');

          row.classList.remove('drag-over-top', 'drag-over-bottom');

          if (draggedIdx !== null && !isNaN(draggedIdx) && !isNaN(targetIdx) && draggedIdx !== targetIdx) {
            const draggedItem = this.queueItems[draggedIdx];
            const targetItem = this.queueItems[targetIdx];

            if (draggedItem && targetItem) {
              this.queueItems.splice(draggedIdx, 1);
              const newTargetIdx = this.queueItems.indexOf(targetItem);
              const insertIdx = isBottom ? newTargetIdx + 1 : newTargetIdx;
              this.queueItems.splice(insertIdx, 0, draggedItem);

              this.renderQueueContent();
              this.saveCurrentQueue().catch(() => {});
            }
          }
          this.draggedRowIdx = null;
        });

        row.addEventListener('dragend', () => {
          container.querySelectorAll('.hud-queue-row').forEach(r => {
            r.classList.remove('is-dragging', 'drag-over-top', 'drag-over-bottom');
          });
          this.draggedRowIdx = null;
        });
      });
    }

    // 3. Media Slots (Single I2V / Edit-Image)
    container.querySelectorAll('.row-media-slot[data-slot="single"]').forEach(slot => {
      const idx = Number(slot.dataset.idx);
      const fileInp = slot.querySelector('.row-file-input');

      slot.addEventListener('click', (e) => {
        if (this.isRunning) return;
        if (e.target.closest('.row-remove-thumb-btn')) return;
        if (this.isSortMode) {
          e.stopPropagation();
          this.handleSlotSwapClick(idx, 'single', slot);
          return;
        }
        if (fileInp) fileInp.click();
      });

      if (fileInp) {
        fileInp.addEventListener('change', async (e) => {
          if (this.isRunning) return;
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          const fileName = file.name;
          try {
            const imageId = await flowImageDB.saveImage(file, fileName);
            this.readFileAsDataUrl(file, (dataUrl) => {
              if (this.queueItems[idx]) {
                this.queueItems[idx].ingredients = [{ imageId, dataUrl, name: fileName }];
                this.renderQueueContent();
                this.saveCurrentQueue().catch(() => {});
              }
            });
          } catch (err) {
            logger.error('[FlowHUDHost] Failed to save image to FlowImageDB', err);
          }
        });
      }

      slot.addEventListener('dragover', (e) => e.preventDefault());
      slot.addEventListener('drop', async (e) => {
        e.preventDefault();
        if (this.isRunning) return;
        const file = e.dataTransfer?.files?.[0];
        if (!file) return;
        const fileName = file.name;
        try {
          const imageId = await flowImageDB.saveImage(file, fileName);
          this.readFileAsDataUrl(file, (dataUrl) => {
            if (this.queueItems[idx]) {
              this.queueItems[idx].ingredients = [{ imageId, dataUrl, name: fileName }];
              this.renderQueueContent();
              this.saveCurrentQueue().catch(() => {});
            }
          });
        } catch (err) {
          logger.error('[FlowHUDHost] Failed to save dropped image to FlowImageDB', err);
        }
      });
    });

    // Remove thumbnail
    container.querySelectorAll('.row-remove-thumb-btn[data-slot="single"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (this.isRunning) return;
        const idx = Number(btn.dataset.idx);
        if (this.queueItems[idx]) {
          const oldIng = this.queueItems[idx].ingredients?.[0];
          if (oldIng && oldIng.imageId) {
            await flowImageDB.deleteImage(oldIng.imageId).catch(() => {});
          }
          this.queueItems[idx].ingredients = [];
          this.renderQueueContent();
          this.saveCurrentQueue().catch(() => {});
        }
      });
    });

    // 4. Frames Slots (Start & End)
    ['start', 'end'].forEach(slotType => {
      container.querySelectorAll(`.row-media-slot[data-slot="${slotType}"]`).forEach(slot => {
        const idx = Number(slot.dataset.idx);
        const fileInp = slot.querySelector('.row-file-input');

        slot.addEventListener('click', (e) => {
          if (this.isRunning) return;
          if (e.target.closest('.row-remove-thumb-btn')) return;
          if (this.isSortMode) {
            e.stopPropagation();
            this.handleSlotSwapClick(idx, slotType, slot);
            return;
          }
          if (fileInp) fileInp.click();
        });

        if (fileInp) {
          fileInp.addEventListener('change', async (e) => {
            if (this.isRunning) return;
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const fileName = file.name;
            try {
              const imageId = await flowImageDB.saveImage(file, fileName);
              this.readFileAsDataUrl(file, (dataUrl) => {
                if (this.queueItems[idx]) {
                  this.queueItems[idx].frames = this.queueItems[idx].frames || {};
                  this.queueItems[idx].frames[slotType] = { imageId, dataUrl, name: fileName };
                  this.renderQueueContent();
                  this.saveCurrentQueue().catch(() => {});
                }
              });
            } catch (err) {
              logger.error('[FlowHUDHost] Failed to save frame to FlowImageDB', err);
            }
          });
        }

        slot.addEventListener('dragover', (e) => e.preventDefault());
        slot.addEventListener('drop', async (e) => {
          e.preventDefault();
          if (this.isRunning) return;
          const file = e.dataTransfer?.files?.[0];
          if (!file) return;
          const fileName = file.name;
          try {
            const imageId = await flowImageDB.saveImage(file, fileName);
            this.readFileAsDataUrl(file, (dataUrl) => {
              if (this.queueItems[idx]) {
                this.queueItems[idx].frames = this.queueItems[idx].frames || {};
                this.queueItems[idx].frames[slotType] = { imageId, dataUrl, name: fileName };
                this.renderQueueContent();
                this.saveCurrentQueue().catch(() => {});
              }
            });
          } catch (err) {
            logger.error('[FlowHUDHost] Failed to save dropped frame to FlowImageDB', err);
          }
        });
      });

      // Remove frame
      container.querySelectorAll(`.row-remove-thumb-btn[data-slot="${slotType}"]`).forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (this.isRunning) return;
          const idx = Number(btn.dataset.idx);
          if (this.queueItems[idx] && this.queueItems[idx].frames) {
            const oldFrame = this.queueItems[idx].frames[slotType];
            if (oldFrame && typeof oldFrame === 'object' && oldFrame.imageId) {
              await flowImageDB.deleteImage(oldFrame.imageId).catch(() => {});
            }
            delete this.queueItems[idx].frames[slotType];
            this.renderQueueContent();
            this.saveCurrentQueue().catch(() => {});
          }
        });
      });
    });

    // Swap Frames
    container.querySelectorAll('.row-swap-frames-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.isRunning) return;
        const idx = Number(btn.dataset.idx);
        const it = this.queueItems[idx];
        if (it && it.frames) {
          const temp = it.frames.start;
          it.frames.start = it.frames.end;
          it.frames.end = temp;
          this.renderQueueContent();
        }
      });
    });
  }

  /**
   * Helper to convert File to Base64 data URL.
   */
  readFileAsDataUrl(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => callback(e.target.result);
    reader.readAsDataURL(file);
  }

  /**
   * Adds an empty queue row and focuses it.
   */
  addQueueRow(initialPrompt = '', media = null) {
    const isVideo = this.activeMode !== 'text-to-image' && this.activeMode !== 'edit-image';
    const newItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      prompt: initialPrompt,
      status: 'pending',
      selected: false,
      mode: this.activeMode,
      model: isVideo ? 'Veo 3.1 - Lite' : 'Nano Banana 2',
      aspectRatio: '16:9',
      duration: '6s',
      outputs: 1,
      resolution: isVideo ? '1080p' : '2K',
      ingredients: media?.ingredients || [],
      frames: media?.frames || {}
    };

    this.queueItems.push(newItem);
    this.renderQueueContent();
    this.updateSelectionUI();
    this.updateStartButtonState();
    this.saveCurrentQueue().catch(() => {});

    // Focus the newly added prompt textarea
    const lastInput = this.shadow.querySelector(`.hud-queue-row[data-id="${newItem.id}"] .row-prompt-input`);
    if (lastInput) lastInput.focus();
  }

  /**
   * Reads plain text from clipboard, splits by lines, and creates rows.
   */
  async pasteClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length === 0) return;

      const isVideo = this.activeMode !== 'text-to-image' && this.activeMode !== 'edit-image';
      for (const line of lines) {
        this.queueItems.push({
          id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          prompt: line,
          status: 'pending',
          selected: false,
          mode: this.activeMode,
          model: isVideo ? 'Veo 3.1 - Lite' : 'Nano Banana 2',
          aspectRatio: '16:9',
          duration: '6s',
          outputs: 1,
          resolution: isVideo ? '1080p' : '2K',
          ingredients: [],
          frames: {}
        });
      }
      this.renderQueueContent();
      this.updateSelectionUI();
      this.updateStartButtonState();
      await this.saveCurrentQueue();
    } catch (err) {
      logger.warn('[FlowHUDHost] Clipboard read permission denied or failed', err);
    }
  }

  /**
   * Handles multi-file ingestion from dropzone or file input with smart mode detection:
   * - 1 image -> image-to-video (or edit-image if current mode is edit-image)
   * - 2 images -> frames-to-video (creates 1 row with start & end frames)
   * - >2 images -> image-to-video (or edit-image) with N rows
   * - Prompts are strictly empty ('') for dropped images (Issue 3 & 4)
   */
  async handleBulkFiles(files) {
    if (!files || files.length === 0) return;

    const textFiles = [];
    const imageFiles = [];

    for (const file of files) {
      const name = file.name.toLowerCase();
      if (name.endsWith('.txt') || name.endsWith('.csv')) {
        textFiles.push(file);
      } else if (file.type.startsWith('image/')) {
        imageFiles.push(file);
      }
    }

    // 1. Process text/csv files
    for (const file of textFiles) {
      await this.importFile(file);
    }

    // 2. Process image files with smart mode detection
    if (imageFiles.length > 0) {
      const loadedImages = [];
      for (const file of imageFiles) {
        const fileName = file.name;
        try {
          const imageId = await flowImageDB.saveImage(file, fileName);
          const dataUrl = await new Promise((resolve) => {
            this.readFileAsDataUrl(file, resolve);
          });
          loadedImages.push({ imageId, dataUrl, name: fileName });
        } catch (err) {
          logger.error('[FlowHUDHost] Failed to save image to FlowImageDB', err);
        }
      }

      if (loadedImages.length === 0) return;

      let targetMode = this.activeMode;

      if (loadedImages.length === 1) {
        // Drop 1 image: automatically go to i2v or edit-image
        targetMode = this.activeMode === 'edit-image' ? 'edit-image' : 'image-to-video';
        const isVideo = targetMode === 'image-to-video';
        this.queueItems.push({
          id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          prompt: '',
          status: 'pending',
          selected: false,
          mode: targetMode,
          model: isVideo ? 'Veo 3.1 - Lite' : 'Nano Banana 2',
          aspectRatio: '16:9',
          duration: '6s',
          outputs: 1,
          resolution: isVideo ? '1080p' : '2K',
          ingredients: [loadedImages[0]],
          frames: {}
        });
      } else if (loadedImages.length === 2) {
        // Drop 2 images: automatically go to frames-to-video (f2v)
        targetMode = 'frames-to-video';
        this.queueItems.push({
          id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          prompt: '',
          status: 'pending',
          selected: false,
          mode: targetMode,
          model: 'Veo 3.1 - Lite',
          aspectRatio: '16:9',
          duration: '6s',
          outputs: 1,
          resolution: '1080p',
          ingredients: [],
          frames: {
            start: loadedImages[0],
            end: loadedImages[1]
          }
        });
      } else {
        // Drop >2 images (e.g. 10 images):
        // Automatically go to i2v or edit-image with N rows
        targetMode = this.activeMode === 'edit-image' ? 'edit-image' : 'image-to-video';
        const isVideo = targetMode === 'image-to-video';

        for (const img of loadedImages) {
          this.queueItems.push({
            id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            prompt: '',
            status: 'pending',
            selected: false,
            mode: targetMode,
            model: isVideo ? 'Veo 3.1 - Lite' : 'Nano Banana 2',
            aspectRatio: '16:9',
            duration: '6s',
            outputs: 1,
            resolution: isVideo ? '1080p' : '2K',
            ingredients: [img],
            frames: {}
          });
        }
      }

      // Synchronize active mode and UI controls
      this.activeMode = targetMode;
      const selMode = this.shadow?.getElementById('selGenerationMode');
      if (selMode && selMode.value !== targetMode) {
        selMode.value = targetMode;
        CustomSelect.refresh(selMode);
      }
      this.syncModeUI(targetMode);
      await saveConfig({ mode: targetMode }).catch(() => {});

      this.renderQueueContent();
      this.updateSelectionUI();
      this.updateStartButtonState();
      await this.saveCurrentQueue();
    }
  }

  /**
   * Imports a .csv or .txt file as prompt rows.
   */
  async importFile(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target.result;
      if (!content) return;
      const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      for (const line of lines) {
        // Strip surrounding quotes if CSV
        const prompt = line.replace(/^["']|["']$/g, '');
        if (prompt) {
          this.queueItems.push({
            id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            prompt,
            status: 'pending'
          });
        }
      }
      this.renderQueueContent();
      this.updateStartButtonState();
      await this.saveCurrentQueue();
    };
    reader.readAsText(file);
  }

  /**
   * Persists the current queue items array and parameters to storage.
   */
  async saveCurrentQueue() {
    const cfg = await getConfig();

    const normalizedItems = this.queueItems.map(it => {
      const mode = (this.paramMode === 'single' && it.mode) ? it.mode : this.activeMode;
      const isVideo = mode !== 'text-to-image' && mode !== 'edit-image';

      return {
        ...it,
        mode,
        model: normalizeModelForMode(mode, (this.paramMode === 'single' && it.model) ? it.model : cfg.model),
        aspectRatio: (this.paramMode === 'single' && it.aspectRatio)
          ? it.aspectRatio
          : (cfg.aspectRatio || '16:9'),
        duration: (this.paramMode === 'single' && it.duration)
          ? it.duration
          : (cfg.duration || '6s'),
        outputs: (this.paramMode === 'single' && (it.outputs || it.outputCount))
          ? (it.outputs || it.outputCount)
          : (cfg.outputCount || 1),
        resolution: (this.paramMode === 'single' && it.resolution)
          ? it.resolution
          : (isVideo ? (cfg.videoResolution || '1080p') : (cfg.imageResolution || '2K')),
        autoDownload: true
      };
    });

    await saveQueue(normalizedItems);
  }

  /**
   * Updates selection counters, checkbox indeterminate state, bulk delete button,
   * sort button disabled state, DOM row selection classes, and parameter sidebar.
   */
  updateSelectionUI() {
    const totalCount = this.queueItems.length;
    const selectedCount = this.queueItems.filter(it => it.selected).length;

    // 1. Select All Checkbox State & Indeterminate
    const chkSelectAll = this.shadow.getElementById('chkSelectAllQueue');
    if (chkSelectAll) {
      chkSelectAll.checked = totalCount > 0 && selectedCount === totalCount;
      chkSelectAll.indeterminate = selectedCount > 0 && selectedCount < totalCount;
      if (this.isRunning) {
        chkSelectAll.disabled = true;
        chkSelectAll.classList.add('is-disabled');
      }
    }

    // 2. Bulk Delete Button Visibility
    const btnBulkDelete = this.shadow.getElementById('btnBulkDeleteQueue');
    if (btnBulkDelete) {
      if (this.isRunning) {
        btnBulkDelete.style.display = 'none';
        btnBulkDelete.disabled = true;
      } else {
        const hasSelectionOrActive = selectedCount > 0 || (this.activeRowIdx !== null && Boolean(this.queueItems[this.activeRowIdx]));
        btnBulkDelete.style.display = hasSelectionOrActive ? 'inline-flex' : 'none';
        btnBulkDelete.title = selectedCount > 1
          ? `Delete ${selectedCount} selected rows`
          : 'Delete selected row';
      }
    }

    // 3. Sort Button Conditional Disabled State
    const btnToggleSort = this.shadow.getElementById('btnToggleSortMode');
    if (btnToggleSort) {
      const hasNoRows = !this.queueItems || this.queueItems.length < 1;
      if (hasNoRows && this.isSortMode) {
        this.isSortMode = false;
        this.selectedSwapSlot = null;
        btnToggleSort.classList.remove('active');
      }

      const isSortDisabled = this.isRunning || selectedCount > 0 || hasNoRows;
      btnToggleSort.disabled = isSortDisabled;
      btnToggleSort.classList.toggle('is-disabled', isSortDisabled);
      if (this.isRunning) {
        btnToggleSort.setAttribute('title', 'Queue is running');
      } else if (hasNoRows) {
        btnToggleSort.setAttribute('title', 'Add at least one row to enable sort mode');
      } else if (selectedCount > 0) {
        btnToggleSort.setAttribute('title', 'Deselect items to enable reordering');
      } else {
        btnToggleSort.setAttribute('title', this.isSortMode ? 'Done sorting' : 'Toggle sort mode');
      }
    }

    // 4. Synchronize DOM rows and checkboxes to queueItems state
    const container = this.shadow.getElementById('hudQueueContent');
    if (container) {
      container.querySelectorAll('.hud-queue-row').forEach((row, i) => {
        const isSelected = Boolean(this.queueItems[i]?.selected);
        const isActive = (this.activeRowIdx === i);
        row.classList.toggle('row-active', isSelected || isActive);
        row.classList.toggle('row-checked', isSelected);
        const cb = row.querySelector('.row-select-checkbox');
        if (cb && cb.checked !== isSelected) {
          cb.checked = isSelected;
        }
      });
    }

    // 5. Update Sidebar Parameters UI & Header Banner
    this.updateSidebarParamModeUI();

    // 6. Update Start Button State
    this.updateStartButtonState();
  }

  /**
   * Validates prompts and updates Start button enabled/disabled state and tooltip.
   * Start button is disabled if any row in the queue has an empty prompt.
   */
  updateStartButtonState() {
    const btnStart = this.shadow?.getElementById('btnStartQueue');
    const btnClearAll = this.shadow?.getElementById('btnClearAllQueue');
    const btnReset = this.shadow?.getElementById('btnResetQueue');
    const btnSupport = this.shadow?.getElementById('btnSupportDev');
    if (!btnStart) return;

    const currentState = queueManager.getState();
    const isRunning = (currentState === QUEUE_STATES.RUNNING);
    const isStopping = (currentState === QUEUE_STATES.STOPPING);

    if (isRunning) {
      if (btnClearAll) btnClearAll.style.display = 'none';
      if (btnReset) btnReset.style.display = 'none';
      btnStart.style.display = 'inline-flex';
      btnStart.disabled = false;
      btnStart.classList.remove('is-disabled', 'is-stopping');
      btnStart.title = 'Stop running generation';
      return;
    }

    if (isStopping) {
      if (btnClearAll) btnClearAll.style.display = 'none';
      if (btnReset) btnReset.style.display = 'none';
      btnStart.style.display = 'inline-flex';
      btnStart.disabled = true;
      btnStart.classList.add('is-disabled', 'is-stopping');
      btnStart.title = 'Stopping generation (finishing active item)...';
      return;
    }

    // When IDLE / STOPPED:
    const totalRows = this.queueItems.length;
    const pendingCount = this.queueItems.filter(it => (it.status || 'pending').toLowerCase() === 'pending').length;
    const finishedCount = this.queueItems.filter(it => {
      const s = (it.status || '').toLowerCase();
      return s === 'completed' || s === 'failed';
    }).length;

    // Condition: All rows in the queue are processed (totalRows > 0, 0 pending, and all rows finished)
    const isQueueFinished = (totalRows > 0 && pendingCount === 0 && finishedCount === totalRows);

    if (isQueueFinished) {
      // Hide Start & Support buttons, Show Clear All & Reset Queue buttons
      btnStart.style.display = 'none';
      if (btnSupport) {
        btnSupport.style.display = 'none';
        btnSupport.classList.remove('is-visible');
        this.stopSupportTicker();
      }
      if (btnClearAll) btnClearAll.style.display = 'inline-flex';
      if (btnReset) btnReset.style.display = 'inline-flex';
      this.updateQueueSummaryUI(false);
      return;
    }

    // Normal state: Show Start, Hide Clear All & Reset Queue
    if (btnClearAll) btnClearAll.style.display = 'none';
    if (btnReset) btnReset.style.display = 'none';
    btnStart.style.display = 'inline-flex';

    if (this.isSortMode) {
      btnStart.disabled = true;
      btnStart.classList.add('is-disabled');
      btnStart.title = 'Sort mode active. Exit sort mode to start generation';
      this.updateQueueSummaryUI(false);
      return;
    }

    const allReady = totalRows > 0 && pendingCount > 0 && this.queueItems.every(it => {
      const s = (it.status || '').toLowerCase();
      if (s === 'completed' || s === 'failed') return true;
      const rowMode = (this.paramMode === 'single' && it.mode) ? it.mode : this.activeMode;
      const info = getRowStatusInfo(it, rowMode, false);
      return info.label !== 'NOT READY';
    });

    if (!allReady) {
      btnStart.disabled = true;
      btnStart.classList.add('is-disabled');
      if (totalRows === 0) {
        btnStart.title = 'Add at least one row to start generation';
      } else if (pendingCount === 0) {
        btnStart.title = 'All items processed';
      } else {
        btnStart.title = 'Complete prompt and required images for all rows to start';
      }
    } else {
      btnStart.disabled = false;
      btnStart.classList.remove('is-disabled');
      btnStart.title = 'Start batch generation';
    }

    this.updateQueueSummaryUI(false);
  }

  /**
   * Starts rotating support button variations every 6 seconds while running.
   */
  startSupportTicker() {
    if (this.supportTickerInterval) return;
    this.supportVariantIndex = 0;
    this.renderSupportButtonContent();
    this.supportTickerInterval = setInterval(() => {
      if (!this.isRunning) {
        this.stopSupportTicker();
        return;
      }
      this.supportVariantIndex = (this.supportVariantIndex + 1) % DONATION_VARIANTS.length;
      this.transitionSupportButtonContent();
    }, 6000);
  }

  /**
   * Stops support ticker and resets variation index.
   */
  stopSupportTicker() {
    if (this.supportTickerInterval) {
      clearInterval(this.supportTickerInterval);
      this.supportTickerInterval = null;
    }
    this.supportVariantIndex = 0;
  }

  /**
   * Smoothly transitions the support button content with a fade effect.
   */
  transitionSupportButtonContent() {
    const contentEl = this.shadow?.getElementById('supportDevContent');
    if (!contentEl) {
      this.renderSupportButtonContent();
      return;
    }
    contentEl.classList.add('fading');
    setTimeout(() => {
      this.renderSupportButtonContent();
      contentEl.classList.remove('fading');
    }, 180);
  }

  /**
   * Renders the current donation variant label, icon, and tooltip into #btnSupportDev.
   */
  renderSupportButtonContent() {
    const btn = this.shadow?.getElementById('btnSupportDev');
    if (!btn) return;
    const variant = DONATION_VARIANTS[this.supportVariantIndex] || DONATION_VARIANTS[0];
    const iconEl = this.shadow?.getElementById('supportDevIcon');
    const textEl = this.shadow?.getElementById('supportDevText');
    if (iconEl) iconEl.innerHTML = variant.icon;
    if (textEl) textEl.textContent = variant.label;
    btn.title = variant.title;
  }

  /**
   * Retrieves media asset from an item slot ('single', 'start', 'end').
   */
  getMediaFromSlot(rowIdx, slotType) {
    const it = this.queueItems[rowIdx];
    if (!it) return null;
    if (slotType === 'single') {
      return (it.ingredients && it.ingredients[0]) || null;
    } else if (slotType === 'start') {
      return (it.frames && it.frames.start) || null;
    } else if (slotType === 'end') {
      return (it.frames && it.frames.end) || null;
    }
    return null;
  }

  /**
   * Sets or clears media asset on an item slot ('single', 'start', 'end').
   */
  setMediaToSlot(rowIdx, slotType, media) {
    const it = this.queueItems[rowIdx];
    if (!it) return;
    if (slotType === 'single') {
      it.ingredients = media ? [media] : [];
    } else if (slotType === 'start') {
      it.frames = it.frames || {};
      if (media) {
        it.frames.start = media;
      } else {
        delete it.frames.start;
      }
    } else if (slotType === 'end') {
      it.frames = it.frames || {};
      if (media) {
        it.frames.end = media;
      } else {
        delete it.frames.end;
      }
    }
  }

  /**
   * Handles click-to-swap ingredient interaction in Sort Mode.
   * Works across all modes (image-to-video, edit-image, frames-to-video).
   */
  handleSlotSwapClick(rowIdx, slotType, slotEl) {
    if (!this.selectedSwapSlot) {
      const media = this.getMediaFromSlot(rowIdx, slotType);
      if (!media) return; // Cannot initiate swap from empty slot
      this.selectedSwapSlot = { rowIdx, slotType };
      slotEl.classList.add('swap-source');
    } else {
      const { rowIdx: srcRowIdx, slotType: srcSlotType } = this.selectedSwapSlot;
      if (srcRowIdx === rowIdx && srcSlotType === slotType) {
        // Clicked same slot -> cancel selection
        this.selectedSwapSlot = null;
        slotEl.classList.remove('swap-source');
      } else {
        // Different slot -> execute swap!
        const mediaSrc = this.getMediaFromSlot(srcRowIdx, srcSlotType);
        const mediaTarget = this.getMediaFromSlot(rowIdx, slotType);

        this.setMediaToSlot(srcRowIdx, srcSlotType, mediaTarget);
        this.setMediaToSlot(rowIdx, slotType, mediaSrc);

        this.selectedSwapSlot = null;
        this.renderQueueContent();
        this.saveCurrentQueue().catch(() => {});
      }
    }
  }

  /**
   * Converts existing queue rows when changing between single-ingredient and frames modes:
   * - Single ingredient -> Frames to Video: pairs ingredients 2-by-2 into Start & End frames.
   * - Frames to Video -> Single ingredient: unpairs Start & End frames into individual rows.
   */
  convertQueueBetweenModes(fromMode, toMode) {
    if (!Array.isArray(this.queueItems) || this.queueItems.length === 0) return;
    if (fromMode === toMode) return;

    const isFromSingleIngredient = (fromMode === 'image-to-video' || fromMode === 'edit-image');
    const isToFrames = (toMode === 'frames-to-video');

    const isFromFrames = (fromMode === 'frames-to-video');
    const isToSingleIngredient = (toMode === 'image-to-video' || toMode === 'edit-image');

    if (isFromSingleIngredient && isToFrames) {
      const assets = [];
      for (const it of this.queueItems) {
        if (it.ingredients && it.ingredients.length > 0) {
          for (const ing of it.ingredients) {
            assets.push({ media: ing, prompt: it.prompt || '' });
          }
        }
      }

      if (assets.length > 0) {
        const newRows = [];
        const numNewRows = Math.ceil(assets.length / 2);
        for (let i = 0; i < numNewRows; i++) {
          const item1 = assets[i * 2];
          const item2 = assets[i * 2 + 1];
          newRows.push({
            id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            prompt: item1.prompt || (item2 ? item2.prompt : ''),
            status: 'pending',
            selected: false,
            mode: 'frames-to-video',
            model: 'Veo 3.1 - Lite',
            aspectRatio: '16:9',
            duration: '6s',
            outputs: 1,
            resolution: '1080p',
            ingredients: [],
            frames: {
              start: item1.media,
              ...(item2 ? { end: item2.media } : {})
            }
          });
        }
        this.queueItems = newRows;
      } else {
        this.queueItems.forEach(it => {
          it.mode = toMode;
          it.model = normalizeModelForMode(toMode, it.model);
        });
      }
    } else if (isFromFrames && isToSingleIngredient) {
      const assets = [];
      for (const it of this.queueItems) {
        if (it.frames) {
          if (it.frames.start) {
            assets.push({ media: it.frames.start, prompt: it.prompt || '' });
          }
          if (it.frames.end) {
            assets.push({ media: it.frames.end, prompt: it.prompt || '' });
          }
        }
      }

      if (assets.length > 0) {
        const isVideo = toMode === 'image-to-video';
        const newRows = assets.map(a => ({
          id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          prompt: a.prompt || '',
          status: 'pending',
          selected: false,
          mode: toMode,
          model: isVideo ? 'Veo 3.1 - Lite' : 'Nano Banana 2',
          aspectRatio: '16:9',
          duration: '6s',
          outputs: 1,
          resolution: isVideo ? '1080p' : '2K',
          ingredients: [a.media],
          frames: {}
        }));
        this.queueItems = newRows;
      } else {
        this.queueItems.forEach(it => {
          it.mode = toMode;
        });
      }
    } else {
      this.queueItems.forEach(it => {
        it.mode = toMode;
      });
    }
  }

  /**
   * Updates sidebar visibility and controls based on paramMode ('batch' vs 'single')
   * and current selection. Dynamically renders the sidebar mode banner and clamps prompt preview.
   */
  updateSidebarParamModeUI() {
    const placeholder = this.shadow.getElementById('sidebarSinglePlaceholder');
    const controls = this.shadow.getElementById('sidebarControls');
    const banner = this.shadow.getElementById('sidebarModeBanner');
    const icon = this.shadow.getElementById('sidebarBannerIcon');
    const title = this.shadow.getElementById('sidebarBannerTitle');
    const badge = this.shadow.getElementById('sidebarBannerBadge');
    const desc = this.shadow.getElementById('sidebarBannerDesc');
    if (!placeholder || !controls) return;

    const totalCount = this.queueItems.length;
    const selectedItems = this.queueItems.filter(it => it.selected);
    const selectedCount = selectedItems.length;

    if (this.paramMode === 'batch') {
      placeholder.style.display = 'none';
      controls.style.display = '';

      if (banner) {
        banner.className = 'sidebar-mode-banner mode-batch';
      }
      if (icon) {
        icon.className = 'sidebar-banner-icon';
        icon.innerHTML = ICONS.LAYERS;
      }
      if (title) {
        title.textContent = 'Batch Settings';
      }
      if (badge) {
        badge.className = 'sidebar-banner-badge';
        badge.textContent = 'GLOBAL';
      }
      if (desc) {
        desc.className = 'sidebar-banner-desc';
        desc.textContent = totalCount > 0
          ? `Synced across all ${totalCount} rows`
          : 'Synced across all rows in queue';
        desc.title = desc.textContent;
      }
    } else {
      // Single Mode
      if (selectedCount === 0 && (this.activeRowIdx === null || !this.queueItems[this.activeRowIdx])) {
        placeholder.style.display = 'flex';
        controls.style.display = 'none';
      } else {
        placeholder.style.display = 'none';
        controls.style.display = '';

        if (selectedCount > 1) {
          // Multi-Selection (> 1 item checked)
          if (banner) {
            banner.className = 'sidebar-mode-banner mode-multi';
          }
          if (icon) {
            icon.className = 'sidebar-banner-icon icon-multi';
            icon.innerHTML = ICONS.LAYERS;
          }
          if (title) {
            title.textContent = 'Multi-Row Settings';
          }
          if (badge) {
            badge.className = 'sidebar-banner-badge badge-multi';
            badge.textContent = `${selectedCount} ROWS`;
          }
          if (desc) {
            desc.className = 'sidebar-banner-desc';
            desc.textContent = `Editing ${selectedCount} selected rows simultaneously`;
            desc.title = `${selectedCount} rows selected`;
          }

          this.syncSidebarControlsToItem(selectedItems[0]);
        } else {
          // Either 1 item checked, OR 0 items checked with 1 active row!
          const targetItem = selectedCount === 1 ? selectedItems[0] : this.queueItems[this.activeRowIdx];
          const targetIdx = this.queueItems.indexOf(targetItem);
          const rawPrompt = (targetItem?.prompt || '').trim();
          let promptPreview = '';
          if (rawPrompt) {
            const maxChars = 36;
            promptPreview = rawPrompt.length > maxChars
              ? rawPrompt.substring(0, maxChars).trim() + '...'
              : rawPrompt;
          }

          if (banner) {
            banner.className = 'sidebar-mode-banner mode-single';
          }
          if (icon) {
            icon.className = 'sidebar-banner-icon icon-single';
            icon.innerHTML = ICONS.TARGET;
          }
          if (title) {
            title.textContent = `Row #${targetIdx + 1} Settings`;
          }
          if (badge) {
            badge.className = 'sidebar-banner-badge badge-single';
            badge.textContent = `ROW #${targetIdx + 1}`;
          }
          if (desc) {
            if (promptPreview) {
              desc.className = 'sidebar-banner-desc';
              desc.textContent = promptPreview;
              desc.title = rawPrompt;
            } else {
              desc.className = 'sidebar-banner-desc is-empty';
              desc.textContent = 'Empty prompt — default parameters';
              desc.title = 'No prompt text entered yet';
            }
          }

          if (targetItem) {
            this.syncSidebarControlsToItem(targetItem);
          }
        }
      }
    }

    if (this.isRunning) {
      this.setFormControlsDisabled(true);
    }
  }

  /**
   * Synchronizes sidebar controls to reflect an individual item's parameters.
   */
  syncSidebarControlsToItem(item) {
    if (!item) return;

    // 1. Generation Mode
    const mode = item.mode || this.activeMode || 'text-to-video';
    const selMode = this.shadow.getElementById('selGenerationMode');
    if (selMode) {
      if (selMode.value !== mode) {
        selMode.value = mode;
        CustomSelect.refresh(selMode);
      }
      this.syncModeUI(mode);
    }

    // 2. Model
    const isVideo = mode !== 'text-to-image' && mode !== 'edit-image';
    const defaultModel = isVideo ? 'Veo 3.1 - Lite' : 'Nano Banana 2';
    const model = normalizeModelForMode(mode, item.model || defaultModel);
    const selModel = this.shadow.getElementById('selModelFamily');
    if (selModel) {
      if (selModel.value !== model) {
        selModel.value = model;
        CustomSelect.refresh(selModel);
      }
      this.syncModelUI(model, mode);
    }

    // 3. Duration (Omni only)
    const duration = item.duration || '6s';
    const segDur = this.shadow.getElementById('segDuration');
    if (segDur) {
      segDur.querySelectorAll('.rj-segment-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.val === duration);
      });
    }

    // 4. Aspect Ratio
    const aspectRatio = item.aspectRatio || '16:9';
    const segRatio = this.shadow.getElementById('segAspectRatio');
    if (segRatio) {
      segRatio.querySelectorAll('.rj-segment-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.val === aspectRatio);
      });
    }

    // 5. Outputs
    const outputs = String(item.outputs || item.outputCount || 1);
    const segOut = this.shadow.getElementById('segOutputs');
    if (segOut) {
      segOut.querySelectorAll('.rj-segment-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.val === outputs);
      });
    }

    // 6. Resolution
    const defaultRes = isVideo ? '1080p' : '2K';
    const resolution = item.resolution || defaultRes;
    const selRes = this.shadow.getElementById('selResolution');
    if (selRes && selRes.value !== resolution) {
      selRes.value = resolution;
      CustomSelect.refresh(selRes);
    }
  }

  /**
   * Helper to retrieve effective parameters for an item given current mode and sidebar state.
   */
  getEffectiveRowParams(item) {
    if (!item) return null;
    const isSingle = this.paramMode === 'single';
    const cfg = this.config || {};

    const selMode = this.shadow?.getElementById('selGenerationMode');
    const mode = (isSingle && item.mode) ? item.mode : (selMode?.value || this.activeMode || cfg.mode || 'text-to-video');
    const isVideo = mode !== 'text-to-image' && mode !== 'edit-image';

    const selModel = this.shadow?.getElementById('selModelFamily');
    const rawModel = (isSingle && item.model)
      ? item.model
      : (selModel?.value || cfg.model || (isVideo ? 'Veo 3.1 - Lite' : 'Nano Banana 2'));
    const model = normalizeModelForMode(mode, rawModel);

    const activeDurationBtn = this.shadow?.querySelector('#segDuration .rj-segment-btn.active');
    const duration = (isSingle && item.duration)
      ? item.duration
      : (activeDurationBtn?.dataset.val || cfg.duration || '6s');

    const activeRatioBtn = this.shadow?.querySelector('#segAspectRatio .rj-segment-btn.active');
    const aspectRatio = (isSingle && item.aspectRatio)
      ? item.aspectRatio
      : (activeRatioBtn?.dataset.val || cfg.aspectRatio || '16:9');

    const activeOutputsBtn = this.shadow?.querySelector('#segOutputs .rj-segment-btn.active');
    const outputs = (isSingle && (item.outputs || item.outputCount))
      ? (item.outputs || item.outputCount)
      : (activeOutputsBtn?.dataset.val || cfg.outputCount || cfg.outputs || 1);

    const selRes = this.shadow?.getElementById('selResolution');
    const resolution = (isSingle && item.resolution)
      ? item.resolution
      : (selRes?.value || (isVideo ? (cfg.videoResolution || '1080p') : (cfg.imageResolution || '2K')));

    return {
      mode,
      model,
      duration,
      aspectRatio,
      outputs: Number(outputs) || 1,
      resolution
    };
  }

  /**
   * Dynamically updates both parameters badge and status badge on a single row without full re-render.
   */
  updateRowBadges(rowIdx) {
    if (rowIdx === null || rowIdx === undefined) return;
    const item = this.queueItems[rowIdx];
    if (!item) return;

    const row = this.shadow?.querySelector(`.hud-queue-row[data-idx="${rowIdx}"]`);
    if (!row) return;

    const rowMode = (this.paramMode === 'single' && item.mode) ? item.mode : this.activeMode;
    const params = this.getEffectiveRowParams(item);
    const statusInfo = getRowStatusInfo(item, rowMode, this.isRunning);

    const paramsBadge = row.querySelector('.row-params-badge');
    if (paramsBadge) {
      paramsBadge.textContent = formatRowParamsBadge(params);
    }

    const statusBadge = row.querySelector('.row-status-badge');
    if (statusBadge) {
      statusBadge.className = `row-status-badge ${statusInfo.statusClass}`;
      statusBadge.textContent = statusInfo.label;
    }
  }

  /**
   * Refreshes both badges on all rows in the queue.
   */
  updateAllRowBadges() {
    this.queueItems.forEach((_, idx) => this.updateRowBadges(idx));
  }

  /**
   * Synchronizes right sidebar options when Generation Mode changes.
   */
  syncModeUI(mode) {
    const isVideo = mode !== 'text-to-image' && mode !== 'edit-image';

    const grpMultiplier = this.shadow.getElementById('grpMultiplier');
    if (grpMultiplier) grpMultiplier.style.display = 'flex';

    const grpVideoModels = this.shadow.getElementById('grpVideoModels');
    const grpImageModels = this.shadow.getElementById('grpImageModels');
    if (grpVideoModels) grpVideoModels.style.display = isVideo ? 'block' : 'none';
    if (grpImageModels) grpImageModels.style.display = isVideo ? 'none' : 'block';

    // In Image to Video, Veo 3.1 - Quality does not support single-image conditioning
    const optVeoQuality = this.shadow.querySelector('#grpVideoModels option[value="Veo 3.1 - Quality"]');
    if (optVeoQuality) {
      const isI2V = mode === 'image-to-video';
      optVeoQuality.hidden = isI2V;
      optVeoQuality.style.display = isI2V ? 'none' : 'block';
    }

    const grpVideoRes = this.shadow.getElementById('grpVideoRes');
    const grpImageRes = this.shadow.getElementById('grpImageRes');
    if (grpVideoRes) grpVideoRes.style.display = isVideo ? 'block' : 'none';
    if (grpImageRes) grpImageRes.style.display = isVideo ? 'none' : 'block';

    const ratioImgOnly = this.shadow.querySelectorAll('.ratio-img-only');
    ratioImgOnly.forEach(el => {
      el.style.display = isVideo ? 'none' : 'flex';
    });

    // If switching to video and ratio was 4:3 or 1:1, fallback to 16:9
    if (isVideo) {
      const segAspect = this.shadow.getElementById('segAspectRatio');
      const activeBtn = segAspect?.querySelector('.rj-segment-btn.active');
      if (activeBtn && (activeBtn.dataset.val === '4:3' || activeBtn.dataset.val === '1:1')) {
        segAspect.querySelectorAll('.rj-segment-btn').forEach(b => b.classList.remove('active'));
        segAspect.querySelector('[data-val="16:9"]')?.classList.add('active');
        saveConfig({ aspectRatio: '16:9' }).catch(() => {});
      }
    }

    // Refresh Model Selector
    const selModel = this.shadow.getElementById('selModelFamily');
    if (selModel) {
      if (isVideo && selModel.value.includes('Banana')) {
        selModel.value = 'Veo 3.1 - Lite';
        saveConfig({ model: 'Veo 3.1 - Lite' }).catch(() => {});
      } else if (!isVideo && !selModel.value.includes('Banana')) {
        selModel.value = 'Nano Banana 2';
        saveConfig({ model: 'Nano Banana 2' }).catch(() => {});
      } else if (mode === 'image-to-video' && selModel.value === 'Veo 3.1 - Quality') {
        selModel.value = 'Veo 3.1 - Lite';
        saveConfig({ model: 'Veo 3.1 - Lite' }).catch(() => {});
      }
      CustomSelect.refresh(selModel);
    }

    // Duration is strictly for Omni 1.1 Flash in video mode
    this.syncModelUI(selModel?.value || (isVideo ? 'Veo 3.1 - Lite' : 'Nano Banana 2'), mode);

    const selRes = this.shadow.getElementById('selResolution');
    if (selRes) {
      selRes.value = isVideo ? '1080p' : '2K';
      CustomSelect.refresh(selRes);
    }
  }

  /**
   * Synchronizes duration visibility when Model changes (strictly Omni 1.1 Flash only).
   */
  syncModelUI(model, mode = null) {
    const selMode = this.shadow?.getElementById('selGenerationMode');
    const effectiveMode = mode || (this.paramMode === 'single' && this.activeRowIdx !== null && this.queueItems[this.activeRowIdx]?.mode) || selMode?.value || this.activeMode || 'text-to-video';
    const isVideo = effectiveMode !== 'text-to-image' && effectiveMode !== 'edit-image';
    const isOmni = model === 'Omni 1.1 Flash';
    const grpDuration = this.shadow?.getElementById('grpDuration');
    if (grpDuration) {
      grpDuration.style.display = (isVideo && isOmni) ? 'flex' : 'none';
    }
  }

  /**
   * Synchronizes UI inputs from stored config & enhances with CustomSelect.
   */
  async syncUIFromStorage() {
    const cfg = await getConfig();

    if (cfg.mode) {
      this.activeMode = cfg.mode;
      const selMode = this.shadow.getElementById('selGenerationMode');
      if (selMode) selMode.value = cfg.mode;
    }

    this.syncModeUI(this.activeMode);

    const selModel = this.shadow.getElementById('selModelFamily');
    if (selModel && cfg.model) {
      selModel.value = cfg.model;
      this.syncModelUI(cfg.model);
    }

    if (cfg.duration) {
      const segDur = this.shadow.getElementById('segDuration');
      if (segDur) {
        segDur.querySelectorAll('.rj-segment-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.val === cfg.duration);
        });
      }
    }

    if (cfg.aspectRatio) {
      const segRatio = this.shadow.getElementById('segAspectRatio');
      if (segRatio) {
        segRatio.querySelectorAll('.rj-segment-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.val === cfg.aspectRatio);
        });
      }
    }

    if (cfg.outputCount) {
      const segOut = this.shadow.getElementById('segOutputs');
      if (segOut) {
        segOut.querySelectorAll('.rj-segment-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.val === String(cfg.outputCount));
        });
      }
    }

    const selRes = this.shadow.getElementById('selResolution');
    if (selRes) {
      const isVideo = this.activeMode !== 'text-to-image' && this.activeMode !== 'edit-image';
      selRes.value = isVideo ? (cfg.videoResolution || '1080p') : (cfg.imageResolution || '2K');
    }

    if (cfg.paramMode) {
      this.paramMode = cfg.paramMode;
    }
    const selParam = this.shadow.getElementById('selParamMode');
    if (selParam) {
      selParam.value = this.paramMode;
    }
    this.updateSidebarParamModeUI();

    // Enhance native selects with CustomSelect dropdowns
    CustomSelect.initAll(this.shadow);

    // Synchronize initial start button state
    this.updateStartButtonState();
  }

  setupSegmentGroup(groupId, onChange) {
    const group = this.shadow.getElementById(groupId);
    if (!group) return;

    const buttons = group.querySelectorAll('.rj-segment-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.isRunning) return;
        if (btn.classList.contains('active')) return;
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (typeof onChange === 'function') {
          onChange(btn.dataset.val);
        }
        this.updateAllRowBadges();
      });
    });
  }

  async syncQueueFromStorage() {
    this.queueItems = await getQueue();
    await this.hydrateQueuePreviews();
    this.renderQueueContent();
    this.updateSelectionUI();
    this.updateStartButtonState();
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
    if (this.isVisible) this.hide();
    else this.show();
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

    if (btnStart) {
      if (isRunning) {
        btnStart.classList.remove('rj-btn-accent');
        btnStart.classList.add('rj-btn-danger', 'rj-btn-stop');
        btnStart.innerHTML = `${ICONS.STOP} <span id="btnStartQueueText">Stop</span>`;
        btnStart.title = 'Stop running generation';
        btnStart.disabled = false;
        this.updateQueueSummaryUI(true, { current: 1, total: Math.max(1, this.queueItems.length), percent: 0 });
      } else if (queueManager.getState() !== QUEUE_STATES.RUNNING && queueManager.getState() !== QUEUE_STATES.STOPPING) {
        btnStart.classList.remove('rj-btn-danger', 'rj-btn-stop', 'is-stopping');
        btnStart.classList.add('rj-btn-accent');
        btnStart.innerHTML = `${ICONS.PLAY} <span id="btnStartQueueText">Start</span>`;
        btnStart.title = 'Start batch generation';
        btnStart.disabled = false;
        this.updateQueueSummaryUI(false);
      }
    }
  }
}

export const flowHUDHost = new FlowHUDHost();

