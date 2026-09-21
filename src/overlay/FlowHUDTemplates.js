/**
 * FlowHUDTemplates.js — Pure SVG Icons & HTML Template Generators
 * 
 * Implements the master wireframe from bahan/vflow-note.md (lines 429-631)
 * with complete design system parity to RJ AIO Metadata (Raycast Dark Precision).
 * 
 * Strict Zero Native Emoji Policy (ADR-007).
 */

export const ICONS = {
  PLAY: `<svg class="rj-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`,
  STOP: `<svg class="rj-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"></rect></svg>`,
  PLUS: `<svg class="rj-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
  TRASH: `<svg class="rj-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
  UPLOAD: `<svg class="rj-icon-lg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>`,
  IMAGE: `<svg class="rj-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`,
  CLIPBOARD: `<svg class="rj-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>`,
  EXPAND: `<svg class="rj-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>`,
  MINIMIZE: `<svg class="rj-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
  CLOSE: `<svg class="rj-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
  SWAP: `<svg class="rj-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="8 21 3 21 3 16"></polyline><line x1="3" y1="21" x2="20" y2="4"></line></svg>`,
  SAVE: `<svg class="rj-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>`,
  SORT: `<svg class="rj-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 16 4 4 4-4"></path><path d="M7 20V4"></path><path d="m21 8-4-4-4 4"></path><path d="M17 4v16"></path></svg>`,
  GRIP_VERTICAL: `<svg class="rj-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg>`,
  SLIDERS: `<svg class="rj-icon-lg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>`,
  LAYERS: `<svg class="rj-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>`,
  TARGET: `<svg class="rj-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>`,
  PROMPT: `<svg class="rj-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>`,
  SPINNER: `<svg class="rj-icon rj-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>`,
  COFFEE: `<svg class="rj-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>`,
  COIN: `<svg class="rj-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"></circle><path d="M18.09 10.37A6 6 0 1 1 10.34 18"></path><path d="M7 6h1v4"></path></svg>`,
  CARD: `<svg class="rj-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="12" x="2" y="6" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path></svg>`,
  PIZZA: `<svg class="rj-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 11h.01"></path><path d="M11 15h.01"></path><path d="M16 16h.01"></path><path d="m2 2 20 7-9 13Z"></path><path d="M16 11a4 4 0 0 1-4 4"></path></svg>`,
  HEART: `<svg class="rj-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>`
};

export const DONATION_URL = 'https://s.id/rjsupport';

export const DONATION_VARIANTS = [
  { label: 'Send a coffee', icon: ICONS.COFFEE, title: 'Send a coffee to support development' },
  { label: 'Donate a coin', icon: ICONS.COIN, title: 'Donate a coin to support development' },
  { label: 'Support dev', icon: ICONS.CARD, title: 'Support extension development' },
  { label: 'Gift a pizza', icon: ICONS.PIZZA, title: 'Gift a pizza to support development' },
  { label: 'Sponsor dev', icon: ICONS.HEART, title: 'Sponsor the development of RJ V-Flow Auto' }
];

/**
 * Generates the full Two-Column Studio Layout markup.
 * Aligned with bahan/vflow-note.md & new note vflow.md (Commit 5).
 */
export function renderStudioLayout() {
  const logoUrl = chrome.runtime.getURL('assets/logo/logo_rj.png');

  return `
    <div class="hud-window">
      <!-- Window Header Bar -->
      <header class="hud-header">
        <div class="hud-brand" id="hudDragHandle">
          <img src="${logoUrl}" alt="RJ" class="hud-brand-logo">
          <span class="hud-title">V-Flow</span>
        </div>
        <div class="hud-window-controls">
          <button class="rj-hud-btn-icon" id="btnMinimizeHud" title="Minimize to Floating Pill" type="button" aria-label="Minimize">
            ${ICONS.MINIMIZE}
          </button>
        </div>
      </header>

      <!-- Two-Column Body -->
      <div class="hud-body">
        <!-- LEFT COLUMN: Dynamic Queue Builder & Media Editor -->
        <div class="hud-col-left">
          <!-- Top Action Toolbar -->
          <div class="hud-queue-toolbar">
            <div class="toolbar-left">
              <input type="checkbox" class="rj-checkbox" id="chkSelectAllQueue" title="Select all">
              <div class="toolbar-param-mode">
                <span class="toolbar-label">Set params:</span>
                <select class="rj-select rj-select-sm" id="selParamMode" style="display: none;">
                  <option value="batch" selected>Batch</option>
                  <option value="single">Single</option>
                </select>
              </div>
            </div>
            <div class="toolbar-right">
              <button class="rj-btn-icon rj-btn-danger" id="btnBulkDeleteQueue" type="button" title="Delete selected rows" style="display: none;">
                ${ICONS.TRASH}
              </button>
              <button class="rj-btn rj-btn-secondary rj-btn-sm is-disabled" id="btnToggleSortMode" type="button" title="Add at least one row to enable sort mode" disabled>
                ${ICONS.SORT}
                <span>Sort</span>
              </button>
              <button class="rj-btn rj-btn-secondary rj-btn-sm" id="btnAddQueueRow" type="button" title="Add new row">
                ${ICONS.PLUS}
                <span>Add Row</span>
              </button>
            </div>
          </div>

          <!-- Rows Container (Renders State A, B, C, or D) -->
          <div class="hud-queue-content" id="hudQueueContent">
            <!-- Dynamic rows or State A will be injected here -->
          </div>
        </div>

        <!-- RIGHT COLUMN: Setting Parameters Sidebar -->
        <div class="hud-col-right">
          <!-- Single Mode Empty Selection Placeholder -->
          <div class="sidebar-single-placeholder" id="sidebarSinglePlaceholder" style="display: none;">
            <span class="sidebar-placeholder-icon">${ICONS.SLIDERS}</span>
            <span class="sidebar-placeholder-title">Select row(s) to configure parameters</span>
            <span class="sidebar-placeholder-sub">Parameters configured here will apply to the selected row(s).</span>
          </div>

          <!-- Parameter Controls Scroll Container -->
          <div class="hud-sidebar-scroll" id="sidebarControls">
            <!-- Sidebar Mode Indicator Banner -->
            <div class="sidebar-mode-banner" id="sidebarModeBanner">
              <div class="sidebar-banner-top">
                <div class="sidebar-banner-left">
                  <span class="sidebar-banner-icon" id="sidebarBannerIcon">${ICONS.LAYERS}</span>
                  <span class="sidebar-banner-title" id="sidebarBannerTitle">Batch Settings</span>
                </div>
                <span class="sidebar-banner-badge" id="sidebarBannerBadge">GLOBAL</span>
              </div>
              <div class="sidebar-banner-desc" id="sidebarBannerDesc">Synced across all rows</div>
            </div>

            <!-- Parameter 1: Generation Mode -->
            <div class="rj-field-group">
              <label class="rj-field-label" for="selGenerationMode">
                <span>Generation Mode</span>
              </label>
              <select class="rj-select" id="selGenerationMode" style="display: none;">
                <option value="text-to-video" selected>Text to Video</option>
                <option value="text-to-image">Text to Image</option>
                <option value="image-to-video">Image to Video</option>
                <option value="frames-to-video">Frame to Video</option>
                <option value="edit-image">Edit Image</option>
              </select>
            </div>

            <!-- Parameter 2: Target Model -->
            <div class="rj-field-group">
              <label class="rj-field-label" for="selModelFamily">
                <span>Model Selector</span>
              </label>
              <select class="rj-select" id="selModelFamily" style="display: none;">
                <optgroup label="Video Models" id="grpVideoModels">
                  <option value="Veo 3.1 - Lite" selected>Veo 3.1 - Lite</option>
                  <option value="Veo 3.1 - Fast">Veo 3.1 - Fast</option>
                  <option value="Veo 3.1 - Quality">Veo 3.1 - Quality</option>
                  <option value="Omni 1.1 Flash">Omni 1.1 Flash</option>
                </optgroup>
                <optgroup label="Image Models" id="grpImageModels" style="display: none;">
                  <option value="Nano Banana 2" selected>Nano Banana 2</option>
                  <option value="Nano Banana Pro">Nano Banana Pro</option>
                  <option value="Nano Banana 2 Lite">Nano Banana 2 Lite</option>
                </optgroup>
              </select>
            </div>

            <!-- Parameter 3: Video Duration (Omni 1.1 Flash only) -->
            <div class="rj-field-group" id="grpDuration">
              <label class="rj-field-label">
                <span>Duration</span>
                <span class="rj-field-hint">Omni only</span>
              </label>
              <div class="rj-segment-group" id="segDuration">
                <button class="rj-segment-btn" type="button" data-val="4s">4s</button>
                <button class="rj-segment-btn active" type="button" data-val="6s">6s</button>
                <button class="rj-segment-btn" type="button" data-val="8s">8s</button>
                <button class="rj-segment-btn" type="button" data-val="10s">10s</button>
              </div>
            </div>

            <!-- Parameter 4: Aspect Ratio -->
            <div class="rj-field-group" id="grpAspectRatio">
              <label class="rj-field-label">
                <span>Aspect Ratio</span>
              </label>
              <div class="rj-segment-group" id="segAspectRatio">
                <button class="rj-segment-btn active" type="button" data-val="16:9">16:9</button>
                <button class="rj-segment-btn" type="button" data-val="9:16">9:16</button>
                <button class="rj-segment-btn ratio-img-only" type="button" data-val="4:3" style="display: none;">4:3</button>
                <button class="rj-segment-btn ratio-img-only" type="button" data-val="1:1" style="display: none;">1:1</button>
              </div>
            </div>

            <!-- Parameter 5: Output Multiplier -->
            <div class="rj-field-group" id="grpMultiplier">
              <label class="rj-field-label">
                <span>Outputs</span>
              </label>
              <div class="rj-segment-group" id="segOutputs">
                <button class="rj-segment-btn active" type="button" data-val="1">x1</button>
                <button class="rj-segment-btn" type="button" data-val="2">x2</button>
                <button class="rj-segment-btn" type="button" data-val="3">x3</button>
                <button class="rj-segment-btn" type="button" data-val="4">x4</button>
              </div>
            </div>

            <!-- Parameter 6: Target Resolution -->
            <div class="rj-field-group">
              <label class="rj-field-label" for="selResolution">
                <span>Target Resolution</span>
              </label>
              <select class="rj-select" id="selResolution" style="display: none;">
                <optgroup label="Video Resolutions" id="grpVideoRes">
                  <option value="720p">720p (Original size)</option>
                  <option value="1080p" selected>1080p (Upscaled)</option>
                  <option value="4K">4k (Upscaled)</option>
                </optgroup>
                <optgroup label="Image Resolutions" id="grpImageRes" style="display: none;">
                  <option value="1K">1k (Original size)</option>
                  <option value="2K" selected>2k (Upscaled)</option>
                  <option value="4K">4k (Upscaled)</option>
                </optgroup>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Shared Footer Action Bar -->
      <footer class="hud-footer">
        <div class="hud-footer-left">
          <span class="hud-stats-badge is-idle" id="hudQueueSummaryText"><span class="dot-idle"></span> <span>Idle</span></span>
        </div>
        <div class="hud-footer-right">
          <button class="rj-btn rj-btn-secondary rj-btn-sm rj-btn-support" id="btnSupportDev" type="button" title="Send a coffee to support development">
            <span class="support-btn-content" id="supportDevContent">
              <span id="supportDevIcon">${ICONS.COFFEE}</span>
              <span id="supportDevText">Send a coffee</span>
            </span>
          </button>
          <button class="rj-btn rj-btn-accent rj-btn-sm" id="btnStartQueue" type="button" title="Start batch generation">
            ${ICONS.PLAY}
            <span id="btnStartQueueText">Start</span>
          </button>
        </div>
      </footer>
    </div>

    <!-- Collapsed Floating Draggable Pill (Running State) -->
    <div class="hud-pill" id="flowHudPill">
      <div class="pill-drag-area">
        <img src="${logoUrl}" alt="RJ" class="pill-logo">
        <span class="pill-status-dot dot-idle" id="pillStatusDot"></span>
        <span class="pill-ticker" id="pillTickerText">Idle</span>
      </div>
      <button class="rj-btn-icon pill-expand-btn" id="btnExpandHud" type="button" title="Expand to Studio HUD">
        ${ICONS.EXPAND}
      </button>
    </div>
  `;
}

/**
 * State A: Renders the Empty / Idle dropzone with quick action buttons.
 */
export function renderEmptyDropzone() {
  return `
    <div class="hud-empty-state">
      <div class="hud-empty-dropzone" id="hudEmptyDropzone">
        <input type="file" id="fileEmptyDropzone" accept="image/*,video/*,.csv,.txt" multiple style="display: none;">
        <span class="empty-icon">${ICONS.UPLOAD}</span>
        <span class="empty-title">Upload / Drag File</span>
        <span class="empty-sub">Drop images or prompt TXT here</span>
        <span class="empty-hint">or click to select file</span>
      </div>
      <div class="hud-empty-quick-actions">
        <span class="quick-label">Quick Actions:</span>
        <div class="quick-buttons">
          <button class="rj-btn rj-btn-secondary rj-btn-sm" id="btnQuickAddEmptyRow" type="button">
            ${ICONS.PLUS}
            <span>Add Empty Row</span>
          </button>
          <button class="rj-btn rj-btn-secondary rj-btn-sm" id="btnQuickPasteClipboard" type="button" title="Paste prompt lines from clipboard">
            ${ICONS.CLIPBOARD}
            <span>Paste from Clipboard</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Resolves current row status label and CSS class.
 * Pre-run rows dynamically evaluate to READY or NOT READY.
 */
export function getRowStatusInfo(item, mode = 'text-to-video', isRunning = false) {
  const rawStatus = (item?.status || 'pending').toLowerCase();

  if (rawStatus === 'completed') {
    return { label: 'COMPLETED', statusClass: 'status-completed' };
  }
  if (rawStatus === 'failed') {
    return { label: 'FAILED', statusClass: 'status-failed' };
  }
  if (rawStatus === 'injecting') {
    return { label: 'INJECTING', statusClass: 'status-injecting' };
  }
  if (rawStatus === 'generating') {
    return { label: 'GENERATING', statusClass: 'status-generating' };
  }
  if (rawStatus === 'downloading') {
    return { label: 'DOWNLOADING', statusClass: 'status-downloading' };
  }

  // Pre-run / Pending state: check completeness of prompt and required media
  const hasPrompt = Boolean(item?.prompt && item.prompt.trim().length > 0);
  let isMediaReady = true;

  if (mode === 'image-to-video' || mode === 'edit-image') {
    const imgSrc = (item?.ingredients && item.ingredients[0]?.dataUrl) ||
      (typeof item?.ingredients?.[0] === 'string' ? item.ingredients[0] : null) ||
      item?.ingredientImage || item?.media || item?.mediaUrl;
    isMediaReady = Boolean(imgSrc);
  } else if (mode === 'frames-to-video') {
    const startSrc = (typeof item?.frames?.start === 'object' ? item.frames?.start?.dataUrl : item?.frames?.start) || item?.startFrame;
    const endSrc = (typeof item?.frames?.end === 'object' ? item.frames?.end?.dataUrl : item?.frames?.end) || item?.endFrame;
    isMediaReady = Boolean(startSrc && endSrc);
  }

  if (hasPrompt && isMediaReady) {
    if (isRunning || rawStatus === 'queued') {
      return { label: 'QUEUED', statusClass: 'status-queued' };
    }
    return { label: 'READY', statusClass: 'status-ready' };
  }
  return { label: 'NOT READY', statusClass: 'status-not-ready' };
}

/**
 * Formats row parameters into a compact badge:
 * [generation mode · model selector · duration (only if omni) · ar · output · reso]
 */
export function formatRowParamsBadge(params) {
  if (!params) return '';
  const mode = params.mode || 'text-to-video';
  const isVideo = mode !== 'text-to-image' && mode !== 'edit-image';

  // 1. Generation Mode Abbreviation
  let modeAbbr = 'T2V';
  if (mode === 'image-to-video') modeAbbr = 'I2V';
  else if (mode === 'frames-to-video') modeAbbr = 'F2V';
  else if (mode === 'text-to-image' || mode === 'image') modeAbbr = 'T2I';
  else if (mode === 'edit-image') modeAbbr = 'EI';

  // 2. Model Selector
  let modelStr = params.model || (isVideo ? 'Veo 3.1 Lite' : 'Nano Banana 2');
  if (modelStr === 'Veo 3.1 - Fast') modelStr = 'Veo 3.1 Fast';
  else if (modelStr === 'Veo 3.1 - Lite') modelStr = 'Veo 3.1 Lite';
  else if (modelStr === 'Veo 3.1 - Quality') modelStr = 'Veo 3.1 Quality';
  else if (modelStr === 'Nano Banana 2 Lite' || modelStr === 'Nano Banana Lite') modelStr = 'Nano Banana Lite';
  else modelStr = modelStr.replace(' - ', ' ').trim();

  // 3. Duration (only if Omni)
  const isOmni = modelStr.toLowerCase().includes('omni');
  const durationStr = isOmni ? (params.duration || '6s') : null;

  // 4. Aspect Ratio
  const arStr = params.aspectRatio || '16:9';

  // 5. Output Multiplier
  const outCount = params.outputs || params.outputCount || 1;
  const outStr = `x${outCount}`;

  // 6. Resolution
  let resStr = params.resolution || (isVideo ? '1080p' : '2K');
  const lowerRes = resStr.toLowerCase();
  if (lowerRes === '720p') resStr = '720p';
  else if (lowerRes === '1080p') resStr = '1080p';
  else if (lowerRes === '1k') resStr = '1K';
  else if (lowerRes === '2k') resStr = '2K';
  else if (lowerRes === '4k') resStr = '4K';

  const tokens = [modeAbbr, modelStr];
  if (durationStr) {
    tokens.push(durationStr);
  }
  tokens.push(arStr, outStr, resStr);

  return tokens.join(' · ');
}

/**
 * State B, C, D: Renders an individual Queue Row based on generation mode.
 * Redesigned with row-select checkbox, sort drag handle, dual badges (params + status).
 */
export function renderQueueRow(item, index, mode = 'text-to-video', isSortMode = false, params = null, isRunning = false) {
  const isIngredientMode = mode === 'image-to-video' || mode === 'edit-image';
  const isFramesMode = mode === 'frames-to-video';
  const isChecked = Boolean(item.selected);

  let mediaSlotHtml = '';

  if (isIngredientMode) {
    const singleImg = (item.ingredients && item.ingredients[0]?.dataUrl) ||
      (typeof item.ingredients?.[0] === 'string' ? item.ingredients[0] : null) ||
      item.ingredientImage || item.media || item.mediaUrl;
    const singleTitle = (item.ingredients && item.ingredients[0]?.name) || 'Ingredient Image';

    mediaSlotHtml = `
      <div class="row-media-slot ${singleImg ? 'has-media' : ''}" data-idx="${index}" data-slot="single" title="${singleTitle}">
        <input type="file" class="row-file-input" accept="image/*" style="display: none;">
        ${singleImg ? `
          <img src="${singleImg}" class="row-thumb-img" alt="Thumb">
          <button class="row-remove-thumb-btn" type="button" title="Remove image" data-idx="${index}" data-slot="single">${ICONS.CLOSE}</button>
        ` : `
          <div class="row-slot-placeholder">
            ${ICONS.IMAGE}
            <span class="slot-text">Image</span>
          </div>
        `}
      </div>
    `;
  } else if (isFramesMode) {
    const startSrc = (typeof item.frames?.start === 'object' ? item.frames?.start?.dataUrl : item.frames?.start) || item.startFrame;
    const startTitle = item.frames?.start?.name || 'Start Frame';
    const endSrc = (typeof item.frames?.end === 'object' ? item.frames?.end?.dataUrl : item.frames?.end) || item.endFrame;
    const endTitle = item.frames?.end?.name || 'End Frame';

    mediaSlotHtml = `
      <div class="row-frames-wrapper">
        <!-- Start Frame -->
        <div class="row-media-slot ${startSrc ? 'has-media' : ''}" data-idx="${index}" data-slot="start" title="${startTitle}">
          <input type="file" class="row-file-input" accept="image/*" style="display: none;">
          ${startSrc ? `
            <img src="${startSrc}" class="row-thumb-img" alt="Start">
            <button class="row-remove-thumb-btn" type="button" title="Remove frame" data-idx="${index}" data-slot="start">${ICONS.CLOSE}</button>
          ` : `
            <div class="row-slot-placeholder">
              <span class="slot-text">Start</span>
            </div>
          `}
        </div>

        <!-- Swap -->
        <button class="row-swap-frames-btn" type="button" data-idx="${index}" title="Swap Start & End Frames" style="${isSortMode ? 'display: none;' : ''}">
          ${ICONS.SWAP}
        </button>

        <!-- End Frame -->
        <div class="row-media-slot ${endSrc ? 'has-media' : ''}" data-idx="${index}" data-slot="end" title="${endTitle}">
          <input type="file" class="row-file-input" accept="image/*" style="display: none;">
          ${endSrc ? `
            <img src="${endSrc}" class="row-thumb-img" alt="End">
            <button class="row-remove-thumb-btn" type="button" title="Remove frame" data-idx="${index}" data-slot="end">${ICONS.CLOSE}</button>
          ` : `
            <div class="row-slot-placeholder">
              <span class="slot-text">End</span>
            </div>
          `}
        </div>
      </div>
    `;
  }

  const promptPlaceholder = isIngredientMode
    ? 'Enter motion / action prompt for this image...'
    : isFramesMode
      ? 'Enter transition / interpolation prompt...'
      : 'Enter prompt text here...';

  const statusInfo = getRowStatusInfo(item, mode, isRunning);
  const isVideo = mode !== 'text-to-image' && mode !== 'edit-image';
  const effectiveParams = params || {
    mode,
    model: item.model || (isVideo ? 'Veo 3.1 - Lite' : 'Nano Banana 2'),
    aspectRatio: item.aspectRatio || '16:9',
    duration: item.duration || '6s',
    outputs: item.outputs || item.outputCount || 1,
    resolution: item.resolution || (isVideo ? '1080p' : '2K')
  };
  const paramsBadgeText = formatRowParamsBadge(effectiveParams);

  const activeStatusClass = item.status && item.status !== 'pending' ? `status-${item.status}` : '';

  return `
    <div class="hud-queue-row ${activeStatusClass} ${isChecked ? 'row-active' : ''} ${isSortMode ? 'is-sorting' : ''}" data-id="${item.id}" data-idx="${index}" ${isSortMode ? 'draggable="true"' : ''}>
      <div class="row-border-glow" aria-hidden="true">
        <svg class="border-glow-svg" aria-hidden="true">
          <rect class="glow-outline glow-blur" width="100%" height="100%" fill="none" pathLength="100" stroke-width="3.5" stroke-dasharray="60 40" rx="8" ry="8"></rect>
          <rect class="glow-outline glow-sharp" width="100%" height="100%" fill="none" pathLength="100" stroke-width="1.5" stroke-dasharray="60 40" rx="8" ry="8"></rect>
        </svg>
      </div>
      <div class="row-select-handle">
        <input type="checkbox" class="rj-checkbox row-select-checkbox" data-idx="${index}" ${isChecked ? 'checked' : ''} title="Select row" style="${isSortMode ? 'display: none;' : ''}">
        <span class="row-drag-handle" title="Drag to reorder" style="${isSortMode ? 'display: inline-flex;' : 'display: none;'}">${ICONS.GRIP_VERTICAL}</span>
      </div>
      ${mediaSlotHtml}
      <div class="row-input-wrapper">
        <textarea class="row-prompt-input" data-idx="${index}" rows="2" placeholder="${promptPlaceholder}">${item.prompt || ''}</textarea>
        <div class="row-badges-group">
          <span class="row-params-badge" data-idx="${index}">${paramsBadgeText}</span>
          <span class="row-status-badge ${statusInfo.statusClass}" data-idx="${index}">${statusInfo.label}</span>
        </div>
      </div>
    </div>
  `;
}

