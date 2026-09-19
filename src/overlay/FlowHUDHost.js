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
  clearAllQueue,
  onChanged
} from '../core/FlowStorage.js';

import { queueManager, QUEUE_STATES } from '../core/QueueManager.js';
import { renderStudioLayout, renderEmptyDropzone, renderQueueRow, ICONS } from './FlowHUDTemplates.js';
import { CustomSelect } from './CustomSelect.js';
import { flowImageDB } from '../core/FlowImageDB.js';

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
    this.draggedRowIdx = null;
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
      if (cfg.settings && cfg.settings.overlayPosition) {
        this.currentLeft = cfg.settings.overlayPosition.x ?? 24;
        this.currentTop = cfg.settings.overlayPosition.y ?? 24;
      }
      this.isMinimized = Boolean(cfg.settings && cfg.settings.overlayMinimized);
      this.activeMode = cfg.mode || 'text-to-video';
      this.paramMode = cfg.paramMode || 'batch';
    } catch (e) {
      console.warn('[FlowHUDHost] Failed to load initial state', e);
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

    // 5. Inject Stylesheets into Shadow DOM
    const varLink = document.createElement('link');
    varLink.rel = 'stylesheet';
    varLink.href = chrome.runtime.getURL('styles/variables.css');
    this.shadow.appendChild(varLink);

    const compLink = document.createElement('link');
    compLink.rel = 'stylesheet';
    compLink.href = chrome.runtime.getURL('styles/components.css');
    this.shadow.appendChild(compLink);

    const overlayLink = document.createElement('link');
    overlayLink.rel = 'stylesheet';
    overlayLink.href = chrome.runtime.getURL('overlay/overlay.css');
    this.shadow.appendChild(overlayLink);

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

    // 10. Subscribe to storage updates for live ticker
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
              console.warn('[FlowHUDHost] Failed to hydrate ingredient preview', err);
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
              console.warn('[FlowHUDHost] Failed to hydrate frame preview', err);
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
      btnAddRow.addEventListener('click', () => this.addQueueRow());
    }

    const chkSelectAll = this.shadow.getElementById('chkSelectAllQueue');
    if (chkSelectAll) {
      chkSelectAll.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        this.queueItems.forEach(item => {
          item.selected = isChecked;
        });
        this.shadow.querySelectorAll('.row-select-checkbox').forEach(cb => {
          cb.checked = isChecked;
        });
        this.updateSelectionUI();
      });
    }

    const btnBulkDelete = this.shadow.getElementById('btnBulkDeleteQueue');
    if (btnBulkDelete) {
      btnBulkDelete.addEventListener('click', async () => {
        const toDelete = this.queueItems.filter(it => it.selected);
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
        this.queueItems = this.queueItems.filter(it => !it.selected);

        // Re-render and update UI
        this.renderQueueContent();
        this.updateSelectionUI();
        await this.saveCurrentQueue();
      });
    }

    const btnToggleSort = this.shadow.getElementById('btnToggleSortMode');
    if (btnToggleSort) {
      btnToggleSort.addEventListener('click', () => {
        this.isSortMode = !this.isSortMode;
        btnToggleSort.classList.toggle('active', this.isSortMode);
        this.renderQueueContent();
      });
    }

    const selParam = this.shadow.getElementById('selParamMode');
    if (selParam) {
      selParam.value = this.paramMode;
      selParam.addEventListener('change', async (e) => {
        this.paramMode = e.target.value;
        await saveConfig({ paramMode: this.paramMode });
        this.updateSidebarParamModeUI();
        this.renderQueueContent();
      });
    }

    // 3. Right Sidebar Parameters
    const selMode = this.shadow.getElementById('selGenerationMode');
    if (selMode) {
      selMode.addEventListener('change', async (e) => {
        const mode = e.target.value;
        if (this.paramMode === 'single') {
          const selected = this.queueItems.filter(it => it.selected);
          if (selected.length > 0) {
            selected.forEach(it => {
              it.mode = mode;
            });
            this.syncModeUI(mode);
            this.renderQueueContent();
            await this.saveCurrentQueue();
          }
        } else {
          this.activeMode = mode;
          await saveConfig({ mode: this.activeMode });
          this.syncModeUI(this.activeMode);
          this.renderQueueContent();
        }
      });
    }

    const selModel = this.shadow.getElementById('selModelFamily');
    if (selModel) {
      selModel.addEventListener('change', async (e) => {
        const val = e.target.value;
        if (this.paramMode === 'single') {
          const selected = this.queueItems.filter(it => it.selected);
          if (selected.length > 0) {
            selected.forEach(it => {
              it.model = val;
            });
            this.syncModelUI(val);
            await this.saveCurrentQueue();
          }
        } else {
          await saveConfig({ model: val });
          this.syncModelUI(val);
        }
      });
    }

    // Segmented Button Groups (Duration, Aspect Ratio, Outputs)
    this.setupSegmentGroup('segDuration', async (val) => {
      if (this.paramMode === 'single') {
        const selected = this.queueItems.filter(it => it.selected);
        if (selected.length > 0) {
          selected.forEach(it => {
            it.duration = val;
          });
          await this.saveCurrentQueue();
        }
      } else {
        await saveConfig({ duration: val }).catch(() => {});
      }
    });

    this.setupSegmentGroup('segAspectRatio', async (val) => {
      if (this.paramMode === 'single') {
        const selected = this.queueItems.filter(it => it.selected);
        if (selected.length > 0) {
          selected.forEach(it => {
            it.aspectRatio = val;
          });
          await this.saveCurrentQueue();
        }
      } else {
        await saveConfig({ aspectRatio: val }).catch(() => {});
      }
    });

    this.setupSegmentGroup('segOutputs', async (val) => {
      const count = Number(val);
      if (this.paramMode === 'single') {
        const selected = this.queueItems.filter(it => it.selected);
        if (selected.length > 0) {
          selected.forEach(it => {
            it.outputs = count;
            it.outputCount = count;
          });
          await this.saveCurrentQueue();
        }
      } else {
        await saveConfig({ outputCount: count }).catch(() => {});
      }
    });

    const selRes = this.shadow.getElementById('selResolution');
    if (selRes) {
      selRes.addEventListener('change', async (e) => {
        const val = e.target.value;
        if (this.paramMode === 'single') {
          const selected = this.queueItems.filter(it => it.selected);
          if (selected.length > 0) {
            selected.forEach(it => {
              it.resolution = val;
            });
            await this.saveCurrentQueue();
          }
        } else {
          saveConfig({ videoResolution: val, imageResolution: val }).catch(() => {});
        }
      });
    }

    // 4. Footer Execution Controls
    const btnSaveQueue = this.shadow.getElementById('btnSaveQueue');
    if (btnSaveQueue) {
      btnSaveQueue.addEventListener('click', async () => {
        await this.saveCurrentQueue();
        const origHtml = btnSaveQueue.innerHTML;
        btnSaveQueue.innerHTML = `${ICONS.SAVE} <span>Saved!</span>`;
        btnSaveQueue.classList.add('rj-btn-active');
        setTimeout(() => {
          btnSaveQueue.innerHTML = origHtml;
          btnSaveQueue.classList.remove('rj-btn-active');
        }, 1200);
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
            await queueManager.stop();
          } catch (err) {
            console.error('[FlowHUDHost] Failed to stop queue', err);
          } finally {
            btnStart.disabled = false;
          }
        } else {
          if (this.queueItems.length === 0) {
            this.addQueueRow();
            return;
          }

          // Persist before starting
          await this.saveCurrentQueue();

          btnStart.disabled = true;
          try {
            await queueManager.start();
          } catch (err) {
            console.error('[FlowHUDHost] Failed to start queue', err);
            btnStart.disabled = false;
          }
        }
      });
    }

    // 5. Subscribe to QueueManager State Changes & Progress
    queueManager.onStateChange((state) => {
      const bStart = this.shadow.getElementById('btnStartQueue');

      if (state === QUEUE_STATES.RUNNING) {
        if (bStart) {
          bStart.classList.remove('rj-btn-accent');
          bStart.classList.add('rj-btn-danger', 'rj-btn-stop');
          bStart.innerHTML = `${ICONS.STOP} <span id="btnStartQueueText">Stop</span>`;
          bStart.title = 'Stop running generation';
          bStart.disabled = false;
        }
        this.updateTicker('Running', 'running');
      } else if (state === QUEUE_STATES.STOPPED) {
        if (bStart) {
          bStart.classList.remove('rj-btn-danger', 'rj-btn-stop');
          bStart.classList.add('rj-btn-accent');
          bStart.innerHTML = `${ICONS.PLAY} <span id="btnStartQueueText">Start</span>`;
          bStart.title = 'Start batch generation';
          bStart.disabled = false;
        }
        this.updateTicker('Stopped', 'stopped');
        this.syncQueueFromStorage().catch(() => {});
      } else {
        if (bStart) {
          bStart.classList.remove('rj-btn-danger', 'rj-btn-stop');
          bStart.classList.add('rj-btn-accent');
          bStart.innerHTML = `${ICONS.PLAY} <span id="btnStartQueueText">Start</span>`;
          bStart.title = 'Start batch generation';
          bStart.disabled = false;
        }
        this.updateTicker('Idle', 'idle');
        this.syncQueueFromStorage().catch(() => {});
      }
    });


    queueManager.onProgress((payload) => {
      if (!payload || !payload.itemId) return;

      const row = this.shadow.querySelector(`.hud-queue-row[data-id="${payload.itemId}"]`);
      if (row) {
        const status = payload.status || 'pending';
        row.className = `hud-queue-row status-${status}`;

        let badge = row.querySelector('.row-status-badge');
        if (!badge) {
          badge = document.createElement('span');
          row.querySelector('.row-input-wrapper')?.appendChild(badge);
        }
        badge.className = `row-status-badge status-${status}`;

        if (status === 'generating') {
          badge.textContent = `GENERATING (${payload.percent || 25}%)`;
        } else if (status === 'downloading') {
          badge.textContent = `DOWNLOADING (${payload.percent || 85}%)`;
        } else if (status === 'injecting') {
          badge.textContent = 'INJECTING (10%)';
        } else {
          badge.textContent = status.toUpperCase();
        }

        if (payload.error) {
          let errEl = row.querySelector('.row-error-hint');
          if (!errEl) {
            errEl = document.createElement('div');
            errEl.className = 'row-error-hint';
            row.querySelector('.row-input-wrapper')?.appendChild(errEl);
          }
          errEl.textContent = payload.error;
        }
      }

      if (payload.status === 'generating' || payload.status === 'injecting' || payload.status === 'downloading') {
        this.updateTicker(`${payload.status.toUpperCase()} (${payload.percent || 0}%)`, 'running');
      }
    });
  }

  /**
   * Renders the dynamic Left Column content (State A, B, C, or D).
   */
  renderQueueContent() {
    const container = this.shadow.getElementById('hudQueueContent');
    const summaryText = this.shadow.getElementById('hudQueueSummaryText');
    if (!container) return;

    const count = this.queueItems.length;
    const estSec = count * 45;
    const estMins = Math.floor(estSec / 60);
    const estRemainder = estSec % 60;
    const estText = estMins > 0 ? `${estMins}m ${estRemainder}s` : `${estSec}s`;

    if (summaryText) {
      summaryText.textContent = `${count} prompt${count === 1 ? '' : 's'} queued | Est: ~${count === 0 ? '0s' : estText}`;
    }

    if (count === 0) {
      // State A: Empty State Dropzone
      container.innerHTML = renderEmptyDropzone();
      this.bindEmptyDropzoneEvents();
      this.updateSelectionUI();
      return;
    }

    // State B, C, D: Render Rows
    container.innerHTML = this.queueItems.map((it, idx) => {
      const rowMode = (this.paramMode === 'single' && it.mode) ? it.mode : this.activeMode;
      return renderQueueRow(it, idx, rowMode, this.isSortMode);
    }).join('');
    this.bindRowEvents();
    this.updateSelectionUI();
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
  }

  /**
   * Binds inputs, media pickers, and deletion for active queue rows.
   */
  bindRowEvents() {
    const container = this.shadow.getElementById('hudQueueContent');
    if (!container) return;

    // 1. Textarea prompt changes
    container.querySelectorAll('.row-prompt-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = Number(e.target.dataset.idx);
        if (this.queueItems[idx]) {
          this.queueItems[idx].prompt = e.target.value;
        }
      });
    });

    // 2. Row selection checkbox changes
    container.querySelectorAll('.row-select-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const idx = Number(e.target.dataset.idx);
        if (this.queueItems[idx]) {
          this.queueItems[idx].selected = e.target.checked;
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
        if (e.target.closest('.row-remove-thumb-btn')) return;
        if (fileInp) fileInp.click();
      });

      if (fileInp) {
        fileInp.addEventListener('change', async (e) => {
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
            console.error('[FlowHUDHost] Failed to save image to FlowImageDB', err);
          }
        });
      }

      slot.addEventListener('dragover', (e) => e.preventDefault());
      slot.addEventListener('drop', async (e) => {
        e.preventDefault();
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
          console.error('[FlowHUDHost] Failed to save dropped image to FlowImageDB', err);
        }
      });
    });

    // Remove thumbnail
    container.querySelectorAll('.row-remove-thumb-btn[data-slot="single"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
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
          if (e.target.closest('.row-remove-thumb-btn')) return;
          if (fileInp) fileInp.click();
        });

        if (fileInp) {
          fileInp.addEventListener('change', async (e) => {
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
              console.error('[FlowHUDHost] Failed to save frame to FlowImageDB', err);
            }
          });
        }

        slot.addEventListener('dragover', (e) => e.preventDefault());
        slot.addEventListener('drop', async (e) => {
          e.preventDefault();
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
            console.error('[FlowHUDHost] Failed to save dropped frame to FlowImageDB', err);
          }
        });
      });

      // Remove frame
      container.querySelectorAll(`.row-remove-thumb-btn[data-slot="${slotType}"]`).forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
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
      model: isVideo ? 'Omni 1.1 Flash' : 'Nano Banana Pro',
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

      for (const line of lines) {
        this.queueItems.push({
          id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          prompt: line,
          status: 'pending'
        });
      }
      this.renderQueueContent();
      await this.saveCurrentQueue();
    } catch (err) {
      console.warn('[FlowHUDHost] Clipboard read permission denied or failed', err);
    }
  }

  /**
   * Handles multi-file ingestion from dropzone or file input.
   */
  async handleBulkFiles(files) {
    if (!files || files.length === 0) return;

    for (const file of files) {
      const name = file.name.toLowerCase();
      if (name.endsWith('.txt') || name.endsWith('.csv')) {
        await this.importFile(file);
      } else if (file.type.startsWith('image/')) {
        const fileName = file.name;
        try {
          const imageId = await flowImageDB.saveImage(file, fileName);
          this.readFileAsDataUrl(file, (dataUrl) => {
            this.queueItems.push({
              id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
              prompt: fileName.replace(/\.[^/.]+$/, ''),
              status: 'pending',
              ingredients: [{ imageId, dataUrl, name: fileName }]
            });
            this.renderQueueContent();
            this.saveCurrentQueue().catch(() => {});
          });
        } catch (err) {
          console.error('[FlowHUDHost] Failed to save bulk image to FlowImageDB', err);
        }
      }
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
        model: (this.paramMode === 'single' && it.model)
          ? it.model
          : (cfg.model || (isVideo ? 'Omni 1.1 Flash' : 'Nano Banana Pro')),
        aspectRatio: (this.paramMode === 'single' && it.aspectRatio)
          ? it.aspectRatio
          : (cfg.aspectRatio || '16:9'),
        duration: (this.paramMode === 'single' && it.duration)
          ? it.duration
          : (cfg.duration || '6s'),
        outputs: isVideo ? 1 : (
          (this.paramMode === 'single' && (it.outputs || it.outputCount))
            ? (it.outputs || it.outputCount)
            : (cfg.outputCount || 1)
        ),
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
   * and single-mode parameter sidebar.
   */
  updateSelectionUI() {
    const totalCount = this.queueItems.length;
    const selectedCount = this.queueItems.filter(it => it.selected).length;

    // 1. Select All Checkbox State & Indeterminate
    const chkSelectAll = this.shadow.getElementById('chkSelectAllQueue');
    if (chkSelectAll) {
      chkSelectAll.checked = totalCount > 0 && selectedCount === totalCount;
      chkSelectAll.indeterminate = selectedCount > 0 && selectedCount < totalCount;
    }

    // 2. Bulk Delete Button Visibility
    const btnBulkDelete = this.shadow.getElementById('btnBulkDeleteQueue');
    if (btnBulkDelete) {
      btnBulkDelete.style.display = selectedCount > 0 ? 'inline-flex' : 'none';
    }

    // 3. Sidebar Parameters vs Placeholder
    this.updateSidebarParamModeUI();
  }

  /**
   * Updates sidebar visibility and controls based on paramMode ('batch' vs 'single')
   * and current selection.
   */
  updateSidebarParamModeUI() {
    const placeholder = this.shadow.getElementById('sidebarSinglePlaceholder');
    const controls = this.shadow.getElementById('sidebarControls');
    if (!placeholder || !controls) return;

    if (this.paramMode === 'batch') {
      placeholder.style.display = 'none';
      controls.style.display = '';
    } else {
      // Single Mode
      const selectedCount = this.queueItems.filter(it => it.selected).length;
      if (selectedCount === 0) {
        placeholder.style.display = 'flex';
        controls.style.display = 'none';
      } else {
        placeholder.style.display = 'none';
        controls.style.display = '';

        const firstSelected = this.queueItems.find(it => it.selected);
        if (firstSelected) {
          this.syncSidebarControlsToItem(firstSelected);
        }
      }
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
    if (selMode && selMode.value !== mode) {
      selMode.value = mode;
      CustomSelect.refresh(selMode);
      this.syncModeUI(mode);
    }

    // 2. Model
    const isVideo = mode !== 'text-to-image' && mode !== 'edit-image';
    const defaultModel = isVideo ? 'Omni 1.1 Flash' : 'Nano Banana Pro';
    const model = item.model || defaultModel;
    const selModel = this.shadow.getElementById('selModelFamily');
    if (selModel && selModel.value !== model) {
      selModel.value = model;
      CustomSelect.refresh(selModel);
      this.syncModelUI(model);
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
   * Synchronizes right sidebar options when Generation Mode changes.
   */
  syncModeUI(mode) {
    const isVideo = mode !== 'text-to-image' && mode !== 'edit-image';

    const grpMultiplier = this.shadow.getElementById('grpMultiplier');
    if (grpMultiplier) grpMultiplier.style.display = isVideo ? 'none' : 'flex';

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
        selModel.value = 'Omni 1.1 Flash';
        saveConfig({ model: 'Omni 1.1 Flash' }).catch(() => {});
      } else if (!isVideo && !selModel.value.includes('Banana')) {
        selModel.value = 'Nano Banana Pro';
        saveConfig({ model: 'Nano Banana Pro' }).catch(() => {});
      } else if (mode === 'image-to-video' && selModel.value === 'Veo 3.1 - Quality') {
        selModel.value = 'Omni 1.1 Flash';
        saveConfig({ model: 'Omni 1.1 Flash' }).catch(() => {});
      }
      CustomSelect.refresh(selModel);
    }

    // Duration is strictly for Omni 1.1 Flash in video mode
    this.syncModelUI(selModel?.value || (isVideo ? 'Omni 1.1 Flash' : 'Nano Banana Pro'));

    const selRes = this.shadow.getElementById('selResolution');
    if (selRes) {
      selRes.value = isVideo ? '1080p' : '2K';
      CustomSelect.refresh(selRes);
    }
  }

  /**
   * Synchronizes duration visibility when Model changes (strictly Omni 1.1 Flash only).
   */
  syncModelUI(model) {
    const isVideo = this.activeMode !== 'text-to-image' && this.activeMode !== 'edit-image';
    const isOmni = model === 'Omni 1.1 Flash';
    const grpDuration = this.shadow.getElementById('grpDuration');
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
  }

  setupSegmentGroup(groupId, onChange) {
    const group = this.shadow.getElementById(groupId);
    if (!group) return;

    const buttons = group.querySelectorAll('.rj-segment-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (btn.classList.contains('active')) return;
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (typeof onChange === 'function') {
          onChange(btn.dataset.val);
        }
      });
    });
  }

  async syncQueueFromStorage() {
    this.queueItems = await getQueue();
    this.renderQueueContent();
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
        this.updateTicker('Running', 'running');
      } else if (queueManager.getState() !== QUEUE_STATES.RUNNING) {
        btnStart.classList.remove('rj-btn-danger', 'rj-btn-stop');
        btnStart.classList.add('rj-btn-accent');
        btnStart.innerHTML = `${ICONS.PLAY} <span id="btnStartQueueText">Start</span>`;
        btnStart.title = 'Start batch generation';
        btnStart.disabled = false;
        this.updateTicker('Idle', 'idle');
      }
    }
  }
}

export const flowHUDHost = new FlowHUDHost();

