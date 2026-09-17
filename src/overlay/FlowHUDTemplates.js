/**
 * FlowHUDTemplates.js — Pure SVG Icons & HTML Template Generators
 * 
 * Provides modular HTML templates for the Two-Column Studio Layout,
 * Left Column Queue Builder (States A, B, C, D), and Right Column Parameters Sidebar.
 * 
 * Adheres strictly to Raycast Dark Precision (DESIGN.md, ADR-007).
 */

export const ICONS = {
  PLAY: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`,
  STOP: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"></rect></svg>`,
  PLUS: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
  TRASH: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
  UPLOAD: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>`,
  IMAGE: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`,
  VIDEO: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`,
  LAYERS: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>`,
  CHECK: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
  ALERT: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
  SWAP: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="8 21 3 21 3 16"></polyline><line x1="3" y1="21" x2="20" y2="4"></line></svg>`
};

/**
 * Generates the full Two-Column Studio Layout markup.
 */
export function renderStudioLayout() {
  return `
    <div class="hud-two-col">
      <!-- LEFT COLUMN: Workspace & Queue Builder -->
      <div class="hud-col-left">
        <!-- Top Mode Tabs -->
        <div class="hud-nav-tabs">
          <button class="hud-nav-tab active" data-tab="text-batch">
            <span class="hud-tab-icon">${ICONS.LAYERS}</span>
            <span>Text Batch</span>
          </button>
          <button class="hud-nav-tab" data-tab="i2v">
            <span class="hud-tab-icon">${ICONS.IMAGE}</span>
            <span>Image-to-Video</span>
          </button>
          <button class="hud-nav-tab" data-tab="f2v">
            <span class="hud-tab-icon">${ICONS.VIDEO}</span>
            <span>Frames-to-Video</span>
          </button>
          <button class="hud-nav-tab" data-tab="queue-list">
            <span class="hud-tab-icon">${ICONS.CHECK}</span>
            <span>Queue List (<span id="hudQueueCountBadge">0</span>)</span>
          </button>
        </div>

        <!-- Dynamic Workspace Content -->
        <div class="hud-workspace-content">
          <!-- View 1: Text Batch (State A/B) -->
          <div class="hud-tab-pane active" id="paneTextBatch">
            <div class="hud-input-group">
              <label class="hud-label">
                <span>Batch Prompts (1 per line)</span>
                <span class="hud-hint">Lines will be queued as separate tasks</span>
              </label>
              <textarea class="hud-textarea" id="txtBatchPrompts" placeholder="Enter one prompt per line...&#10;A futuristic cyberpunk city in rain&#10;A majestic snow leopard on mountain peak" rows="7"></textarea>
            </div>
            <div class="hud-actions-row">
              <button class="hud-btn hud-btn-secondary" id="btnClearTextBatch">Clear</button>
              <button class="hud-btn hud-btn-primary" id="btnAddTextBatch">
                <span class="hud-btn-icon">${ICONS.PLUS}</span>
                <span>Add to Queue</span>
              </button>
            </div>
          </div>

          <!-- View 2: Image-to-Video (State C) -->
          <div class="hud-tab-pane" id="paneI2V">
            <div class="hud-dropzone-row">
              <div class="hud-dropzone" id="dropzoneI2V">
                <input type="file" id="fileI2V" accept="image/*,video/*" style="display: none;">
                <div class="dropzone-empty" id="dropzoneI2VEmpty">
                  <span class="dropzone-icon">${ICONS.UPLOAD}</span>
                  <span class="dropzone-text">Drop Reference Image or Click to Browse</span>
                  <span class="dropzone-sub">Supports PNG, JPG, MP4</span>
                </div>
                <div class="dropzone-preview" id="dropzoneI2VPreview" style="display: none;">
                  <img id="imgI2VPreview" class="preview-media" alt="Reference">
                  <button class="dropzone-remove-btn" id="btnRemoveI2V" title="Remove Media">${ICONS.TRASH}</button>
                </div>
              </div>
            </div>
            <div class="hud-input-group" style="margin-top: 8px;">
              <label class="hud-label">Motion / Action Prompt</label>
              <textarea class="hud-textarea" id="txtI2VPrompt" placeholder="Describe the desired movement or camera animation..." rows="3"></textarea>
            </div>
            <div class="hud-actions-row">
              <button class="hud-btn hud-btn-primary" id="btnAddI2V">
                <span class="hud-btn-icon">${ICONS.PLUS}</span>
                <span>Add I2V to Queue</span>
              </button>
            </div>
          </div>

          <!-- View 3: Frames-to-Video (State D) -->
          <div class="hud-tab-pane" id="paneF2V">
            <div class="hud-frames-grid">
              <!-- Start Frame -->
              <div class="hud-dropzone" id="dropzoneF2VStart">
                <input type="file" id="fileF2VStart" accept="image/*" style="display: none;">
                <div class="dropzone-empty" id="dropzoneF2VStartEmpty">
                  <span class="dropzone-icon">${ICONS.IMAGE}</span>
                  <span class="dropzone-text">Start Frame</span>
                </div>
                <div class="dropzone-preview" id="dropzoneF2VStartPreview" style="display: none;">
                  <img id="imgF2VStartPreview" class="preview-media" alt="Start Frame">
                  <button class="dropzone-remove-btn" id="btnRemoveF2VStart">${ICONS.TRASH}</button>
                </div>
              </div>

              <!-- Swap Button -->
              <button class="hud-icon-btn hud-swap-btn" id="btnSwapF2V" title="Swap Start and End Frames">
                ${ICONS.SWAP}
              </button>

              <!-- End Frame -->
              <div class="hud-dropzone" id="dropzoneF2VEnd">
                <input type="file" id="fileF2VEnd" accept="image/*" style="display: none;">
                <div class="dropzone-empty" id="dropzoneF2VEndEmpty">
                  <span class="dropzone-icon">${ICONS.IMAGE}</span>
                  <span class="dropzone-text">End Frame</span>
                </div>
                <div class="dropzone-preview" id="dropzoneF2VEndPreview" style="display: none;">
                  <img id="imgF2VEndPreview" class="preview-media" alt="End Frame">
                  <button class="dropzone-remove-btn" id="btnRemoveF2VEnd">${ICONS.TRASH}</button>
                </div>
              </div>
            </div>
            <div class="hud-input-group" style="margin-top: 8px;">
              <label class="hud-label">Interpolation Prompt</label>
              <textarea class="hud-textarea" id="txtF2VPrompt" placeholder="Describe the transition between start and end frames..." rows="3"></textarea>
            </div>
            <div class="hud-actions-row">
              <button class="hud-btn hud-btn-primary" id="btnAddF2V">
                <span class="hud-btn-icon">${ICONS.PLUS}</span>
                <span>Add F2V to Queue</span>
              </button>
            </div>
          </div>

          <!-- View 4: Queue List View -->
          <div class="hud-tab-pane" id="paneQueueList">
            <div class="hud-queue-header">
              <span class="queue-title">Active Queue Items</span>
              <div class="queue-header-actions">
                <button class="hud-btn-text" id="btnClearCompletedQueue">Clear Done</button>
                <button class="hud-btn-text hud-btn-danger" id="btnClearAllQueue">Clear All</button>
              </div>
            </div>
            <div class="hud-queue-cards-list" id="hudQueueListContainer">
              <div class="queue-empty-msg">No items in queue. Add prompts above!</div>
            </div>
          </div>
        </div>

        <!-- Left Column Footer -->
        <div class="hud-left-footer">
          <span class="footer-stat" id="hudQueueSummaryText">Queue: 0 items</span>
        </div>
      </div>

      <!-- RIGHT COLUMN: Parameters Sidebar -->
      <div class="hud-col-right">
        <div class="hud-sidebar-scroll">
          <!-- Media Mode -->
          <div class="hud-param-group">
            <label class="hud-param-label">Media Mode</label>
            <div class="hud-segment-group" id="segMediaMode">
              <button class="hud-segment-btn active" data-val="text-to-video">
                <span class="seg-icon">${ICONS.VIDEO}</span>
                <span>Video</span>
              </button>
              <button class="hud-segment-btn" data-val="text-to-image">
                <span class="seg-icon">${ICONS.IMAGE}</span>
                <span>Image</span>
              </button>
            </div>
          </div>

          <!-- Target Model -->
          <div class="hud-param-group">
            <label class="hud-param-label">Model Family</label>
            <select class="hud-select" id="selModelFamily">
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

          <!-- Duration (Omni only) -->
          <div class="hud-param-group" id="grpDuration">
            <label class="hud-param-label">Duration (Omni)</label>
            <div class="hud-segment-group hud-segment-4" id="segDuration">
              <button class="hud-segment-btn" data-val="4s">4s</button>
              <button class="hud-segment-btn active" data-val="6s">6s</button>
              <button class="hud-segment-btn" data-val="8s">8s</button>
              <button class="hud-segment-btn" data-val="10s">10s</button>
            </div>
          </div>

          <!-- Aspect Ratio (Video: 16:9 & 9:16 only; Image: 16:9, 9:16, 4:3, 1:1) -->
          <div class="hud-param-group">
            <label class="hud-param-label">Aspect Ratio</label>
            <div class="hud-segment-group" id="segAspectRatio">
              <button class="hud-segment-btn active" data-val="16:9">16:9</button>
              <button class="hud-segment-btn" data-val="9:16">9:16</button>
              <button class="hud-segment-btn ratio-img-only" data-val="4:3" style="display: none;">4:3</button>
              <button class="hud-segment-btn ratio-img-only" data-val="1:1" style="display: none;">1:1</button>
            </div>
          </div>

          <!-- Output Multiplier (Image Mode only) -->
          <div class="hud-param-group" id="grpMultiplier" style="display: none;">
            <label class="hud-param-label">Outputs</label>
            <div class="hud-segment-group hud-segment-4" id="segOutputs">
              <button class="hud-segment-btn active" data-val="1">x1</button>
              <button class="hud-segment-btn" data-val="2">x2</button>
              <button class="hud-segment-btn" data-val="3">x3</button>
              <button class="hud-segment-btn" data-val="4">x4</button>
            </div>
          </div>

          <!-- Download Resolution -->
          <div class="hud-param-group">
            <label class="hud-param-label">Download Resolution</label>
            <select class="hud-select" id="selResolution">
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

        <!-- Execution Action Controls Footer (Start & Stop) -->
        <div class="hud-sidebar-footer">
          <button class="hud-btn hud-btn-start" id="btnStartQueue">
            <span class="hud-btn-icon">${ICONS.PLAY}</span>
            <span>Start Batch</span>
          </button>
          <button class="hud-btn hud-btn-danger" id="btnStopQueue" disabled>
            <span class="hud-btn-icon">${ICONS.STOP}</span>
            <span>Stop Batch</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Renders a single queue item card in the queue list view.
 */
export function renderQueueItem(item) {
  const statusClass = `status-${item.status || 'pending'}`;
  const promptSnippet = (item.prompt || '').substring(0, 70) + ((item.prompt || '').length > 70 ? '...' : '');

  return `
    <div class="hud-queue-card ${statusClass}" data-id="${item.id}">
      <div class="queue-card-top">
        <span class="queue-item-badge ${statusClass}">${(item.status || 'pending').toUpperCase()}</span>
        <span class="queue-item-meta">${item.model || ''} | ${item.aspectRatio || ''}</span>
        <button class="queue-card-remove-btn" data-id="${item.id}" title="Remove Item">${ICONS.TRASH}</button>
      </div>
      <div class="queue-card-prompt">${promptSnippet || 'No prompt specified'}</div>
      ${item.error ? `<div class="queue-card-error">${item.error}</div>` : ''}
    </div>
  `;
}
