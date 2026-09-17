/**
 * FlowHUDHost.js — Shadow DOM Host & Floating Draggable Pill Engine
 * 
 * Manages open Shadow DOM encapsulation (#flow-auto-hud-root),
 * fluid drag physics with boundary clamping, position persistence,
 * and minimize/restore transitions.
 * 
 * Adheres strictly to ADR-002, ADR-003, and ADR-007.
 */

import { getConfig, saveConfig, onChanged } from '../core/FlowStorage.js';

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

    // 2. Create Host & Open Shadow Root (ADR-003)
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

    // 4. Build HUD markup
    this.buildMarkup();

    // 5. Setup Drag Physics & Listeners
    this.setupDragPhysics();
    this.setupControls();

    // 6. Apply initial clamped position
    this.applyPosition(this.currentLeft, this.currentTop);

    // 7. Subscribe to storage updates for live ticker
    onChanged(cfg => this.handleStorageUpdate(cfg));
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
          <!-- Placeholder: Sub-phase 3.3 will inject Two-Column Studio Layout here -->
          <div class="hud-placeholder-content">
            <p>Studio Queue & Parameters Workspace</p>
            <span style="font-size: 11px; color: var(--rj-text-ash);">Phase 3 Sub-phase 3.2 Host Active</span>
          </div>
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
      // Ignore if clicking a button
      if (e.target.closest('button')) return;

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

      // Persist position (debounced)
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
    const rect = activeEl ? activeEl.getBoundingClientRect() : { width: 720, height: 480 };

    const width = rect.width || (this.isMinimized ? 160 : 720);
    const height = rect.height || (this.isMinimized ? 34 : 480);

    const maxX = Math.max(12, window.innerWidth - width - 12);
    const maxY = Math.max(12, window.innerHeight - height - 12);

    this.currentLeft = Math.max(12, Math.min(maxX, x));
    this.currentTop = Math.max(12, Math.min(maxY, y));

    this.container.style.left = `${this.currentLeft}px`;
    this.container.style.top = `${this.currentTop}px`;
  }

  /**
   * Sets up minimize, restore, and close buttons.
   */
  setupControls() {
    const btnMin = this.shadow.getElementById('btnMinimizeHud');
    if (btnMin) {
      btnMin.addEventListener('click', () => this.minimize());
    }

    const btnRestore = this.shadow.getElementById('btnRestoreHud');
    if (btnRestore) {
      btnRestore.addEventListener('click', () => this.restore());
    }

    const btnClose = this.shadow.getElementById('btnCloseHud');
    if (btnClose) {
      btnClose.addEventListener('click', () => this.hide());
    }
  }

  /**
   * Minimizes the HUD to the compact floating pill.
   */
  minimize() {
    this.isMinimized = true;
    this.container.classList.add('is-minimized');
    this.applyPosition(this.currentLeft, this.currentTop);

    saveConfig({
      settings: { overlayMinimized: true }
    }).catch(() => {});
  }

  /**
   * Restores the full Studio window.
   */
  restore() {
    this.isMinimized = false;
    this.container.classList.remove('is-minimized');
    this.applyPosition(this.currentLeft, this.currentTop);

    saveConfig({
      settings: { overlayMinimized: false }
    }).catch(() => {});
  }

  /**
   * Toggles HUD visibility between visible and hidden.
   */
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

  /**
   * Updates floating pill live status ticker.
   */
  updateTicker(text, statusType = 'idle') {
    if (this.tickerEl) {
      this.tickerEl.textContent = text;
    }

    if (this.statusDot) {
      this.statusDot.className = 'pill-status-dot';
      if (statusType === 'running') {
        this.statusDot.classList.add('dot-running');
      } else if (statusType === 'paused') {
        this.statusDot.classList.add('dot-paused');
      } else {
        this.statusDot.classList.add('dot-idle');
      }
    }
  }

  /**
   * Synchronizes ticker when storage updates.
   */
  handleStorageUpdate(cfg) {
    if (!cfg) return;

    const isRunning = cfg.activeBatch && cfg.activeBatch.isRunning;
    const isPaused = cfg.activeBatch && cfg.activeBatch.isPaused;

    if (isPaused) {
      this.updateTicker('Paused', 'paused');
    } else if (isRunning) {
      const activeIdx = cfg.activeBatch.completedCount || 0;
      const total = cfg.activeBatch.totalCount || 1;
      this.updateTicker(`Running #${activeIdx + 1}/${total}`, 'running');
    } else {
      this.updateTicker('Idle', 'idle');
    }
  }
}

export const flowHUDHost = new FlowHUDHost();
