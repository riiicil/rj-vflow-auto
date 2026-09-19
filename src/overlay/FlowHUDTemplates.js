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
  FILE: `<svg class="rj-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`,
  SAVE: `<svg class="rj-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>`
};

/**
 * Generates the full Two-Column Studio Layout markup.
 * Exactly matches bahan/vflow-note.md wireframe (lines 489-631).
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
          <button class="rj-hud-btn-icon rj-close" id="btnCloseHud" title="Close Studio" type="button" aria-label="Close">
            ${ICONS.CLOSE}
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
              <button class="rj-btn rj-btn-secondary rj-btn-sm" id="btnAddQueueRow" type="button" title="Add new row">
                ${ICONS.PLUS}
                <span>Add Row</span>
              </button>
              <button class="rj-btn rj-btn-secondary rj-btn-sm" id="btnPasteClipboard" type="button" title="Paste prompts from clipboard">
                ${ICONS.CLIPBOARD}
                <span>Paste</span>
              </button>
              <button class="rj-btn rj-btn-secondary rj-btn-sm" id="btnImportFile" type="button" title="Import TXT or CSV">
                ${ICONS.FILE}
                <span>Import CSV</span>
              </button>
              <input type="file" id="fileImportQueue" accept=".csv,.txt" style="display: none;">
            </div>
            <div class="toolbar-right">
              <button class="rj-btn rj-btn-secondary rj-btn-sm hud-btn-clear" id="btnClearAllQueue" type="button" title="Clear all queue items">
                ${ICONS.TRASH}
                <span>Clear All</span>
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
          <div class="hud-sidebar-scroll">
            <!-- Parameter 1: Generation Mode -->
            <div class="rj-field-group">
              <label class="rj-field-label" for="selGenerationMode">
                <span>Generation Mode</span>
              </label>
              <select class="rj-select" id="selGenerationMode">
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
              <select class="rj-select" id="selModelFamily">
                <optgroup label="Video Models" id="grpVideoModels">
                  <option value="Omni 1.1 Flash" selected>Omni 1.1 Flash</option>
                  <option value="Veo 3.1 - Fast">Veo 3.1 - Fast</option>
                  <option value="Veo 3.1 - Lite">Veo 3.1 - Lite</option>
                  <option value="Veo 3.1 - Quality">Veo 3.1 - Quality</option>
                </optgroup>
                <optgroup label="Image Models" id="grpImageModels" style="display: none;">
                  <option value="Nano Banana Pro">Nano Banana Pro</option>
                  <option value="Nano Banana 2">Nano Banana 2</option>
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

            <!-- Parameter 5: Output Multiplier (Image Mode only) -->
            <div class="rj-field-group" id="grpMultiplier" style="display: none;">
              <label class="rj-field-label">
                <span>Outputs</span>
                <span class="rj-field-hint">Image mode</span>
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
              <select class="rj-select" id="selResolution">
                <optgroup label="Video Resolutions" id="grpVideoRes">
                  <option value="4K">4K (Upscaled)</option>
                  <option value="1080p" selected>1080p (FHD)</option>
                  <option value="720p">720p (HD)</option>
                </optgroup>
                <optgroup label="Image Resolutions" id="grpImageRes" style="display: none;">
                  <option value="4K">4K (Max)</option>
                  <option value="2K" selected>2K (QHD)</option>
                  <option value="1K">1K (Standard)</option>
                </optgroup>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Shared Footer Action Bar -->
      <footer class="hud-footer">
        <div class="hud-footer-left">
          <span class="hud-stats-badge" id="hudQueueSummaryText">0 prompts queued | Est: ~0s</span>
        </div>
        <div class="hud-footer-right">
          <button class="rj-btn rj-btn-secondary rj-btn-sm" id="btnSaveQueue" type="button" title="Save current queue & parameters draft">
            ${ICONS.SAVE}
            <span>Save</span>
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
        <span class="empty-sub">Drop images, CSV, or prompt TXT here</span>
        <span class="empty-hint">or click to select file</span>
      </div>
      <div class="hud-empty-quick-actions">
        <span class="quick-label">Quick Actions:</span>
        <div class="quick-buttons">
          <button class="rj-btn rj-btn-secondary rj-btn-sm" id="btnQuickAddEmptyRow" type="button">
            ${ICONS.PLUS}
            <span>Add Empty Row</span>
          </button>
          <button class="rj-btn rj-btn-secondary rj-btn-sm" id="btnQuickPasteClipboard" type="button">
            ${ICONS.CLIPBOARD}
            <span>Paste from Clipboard</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * State B, C, D: Renders an individual Queue Row based on generation mode.
 */
export function renderQueueRow(item, index, mode = 'text-to-video') {
  const num = index + 1;
  const status = item.status || 'pending';
  const statusClass = `status-${status}`;
  const isIngredientMode = mode === 'image-to-video' || mode === 'edit-image';
  const isFramesMode = mode === 'frames-to-video';

  let mediaSlotHtml = '';

  if (isIngredientMode) {
    const imgSrc = (item.ingredients && item.ingredients[0]?.dataUrl) || (typeof item.ingredients?.[0] === 'string' ? item.ingredients[0] : null);
    mediaSlotHtml = `
      <div class="row-media-slot ${imgSrc ? 'has-media' : ''}" data-idx="${index}" data-slot="single" title="Drop or click to select image">
        <input type="file" class="row-file-input" accept="image/*" style="display: none;">
        ${imgSrc ? `
          <img src="${imgSrc}" class="row-thumb-img" alt="Ref">
          <button class="row-remove-thumb-btn" type="button" title="Remove image" data-idx="${index}" data-slot="single">${ICONS.CLOSE}</button>
        ` : `
          <div class="row-slot-placeholder">
            <span class="slot-icon">${ICONS.IMAGE}</span>
            <span class="slot-text">+ Drop</span>
          </div>
        `}
      </div>
    `;
  } else if (isFramesMode) {
    const startSrc = (typeof item.frames?.start === 'object' ? item.frames?.start?.dataUrl : item.frames?.start) || null;
    const endSrc = (typeof item.frames?.end === 'object' ? item.frames?.end?.dataUrl : item.frames?.end) || null;
    mediaSlotHtml = `
      <div class="row-frames-group">
        <!-- Start Frame -->
        <div class="row-media-slot ${startSrc ? 'has-media' : ''}" data-idx="${index}" data-slot="start" title="Start Frame">
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
        <button class="row-swap-frames-btn" type="button" data-idx="${index}" title="Swap Start & End Frames">
          ${ICONS.SWAP}
        </button>

        <!-- End Frame -->
        <div class="row-media-slot ${endSrc ? 'has-media' : ''}" data-idx="${index}" data-slot="end" title="End Frame">
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

  return `
    <div class="hud-queue-row ${statusClass}" data-id="${item.id}" data-idx="${index}">
      <span class="row-num">#${num}</span>
      ${mediaSlotHtml}
      <div class="row-input-wrapper">
        <textarea class="row-prompt-input" data-idx="${index}" rows="1" placeholder="${promptPlaceholder}">${item.prompt || ''}</textarea>
        ${status !== 'pending' ? `<span class="row-status-badge ${statusClass}">${status.toUpperCase()}</span>` : ''}
        ${item.error ? `<div class="row-error-hint">${item.error}</div>` : ''}
      </div>
      <button class="rj-btn-icon rj-btn-danger row-delete-btn" data-idx="${index}" type="button" title="Delete row">
        ${ICONS.TRASH}
      </button>
    </div>
  `;
}
