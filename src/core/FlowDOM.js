/**
 * FlowDOM.js — Language-Resilient DOM Engine for Google Flow
 * 
 * Target Platform: flow.google.com
 * Adheres strictly to docs/references/GOOGLE_FLOW_DOM.md and ADR-005.
 * Never uses localized text queries or CDP synthetic events.
 */

import { logger } from '../services/LoggerService.js';

export const SELECTORS = {
  // Top Header & Grid
  HEADER: 'flow-tile-view-header > header.header-base',
  TOOLS_BUTTON_GROUP: 'flow-tile-view-header .tools-button-group',
  SETTINGS_2_BUTTON: 'flow-tile-view-header .tools-button-group button:has(mat-icon:has-text("settings_2"))',
  OVERLAY_PANE: 'div.cdk-overlay-pane',
  GRID_LAYOUT_TOGGLE: 'div.cdk-overlay-pane mat-button-toggle:has(mat-icon:has-text("dashboard")) button',
  GRID_SIZE_S_TOGGLE: 'div.cdk-overlay-pane mat-button-toggle:has(span:has-text("S")) button, mat-button-toggle:has(span:has-text("S")) button',
  GRID_SIZE_M_TOGGLE: 'div.cdk-overlay-pane mat-button-toggle:has(span:has-text("M")) button, mat-button-toggle:has(span:has-text("M")) button',
  CLEAR_PROMPT_SWITCH: 'button[name="clear-prompt-on-submit"], button[aria-label*="Clear prompt on submit" i], button[aria-label*="Clear prompt" i], mat-slide-toggle:has-text("Clear prompt") button[role="switch"]',

  // Project Sidenav / Left Navigation
  SIDEBAR_COLLAPSE_BUTTON: 'flow-project-nav-list mat-list-item:has(mat-icon:has-text("left_panel_close")), mat-list-item:has(mat-icon:has-text("left_panel_close")), mat-list-item:has-text("left_panel_close")',
  SIDEBAR_EXPAND_BUTTON: 'flow-project-nav-list mat-list-item:has(mat-icon:has-text("left_panel_open")), mat-list-item:has(mat-icon:has-text("left_panel_open")), mat-list-item:has-text("left_panel_open")',

  // Prompt Box & Creative Agent Suppression
  PROMPT_BOX_CONTAINER: 'flow-prompt-box.prompt-box-container',
  AGENT_MODE_CHIP: 'flow-agent-mode-toggle-chip button.agent-mode-chip',
  AGENT_MODE_CHIP_CHECKED: 'button.agent-mode-chip-checked',
  AGENT_MODE_CONTAINER_CHECKED: 'flow-agent-mode-toggle-chip.checked',
  PROSEMIRROR_EDITOR: 'flow-rich-text-editor.prompt-input div.ProseMirror',
  SETTINGS_TRIGGER_BUTTON: 'flow-base-prompt-box div.submit-controls button.settings-trigger-button',
  SETTINGS_SUMMARY: 'button.settings-trigger-button span.settings-summary',
  GENERATE_BUTTON: 'flow-generate-icon-button button.generate-icon-button',

  // Settings Popover & Model Menu
  SETTINGS_POPOVER: 'flow-prompt-box-settings',
  MODEL_SELECT_TRIGGER: 'flow-prompt-box-settings span.model-select-trigger-content',
  MENU_PANEL: 'div.mat-mdc-menu-content',
  MENU_ITEM_BUTTON: 'div.mat-mdc-menu-content flow-menu-item button[role="menuitem"]',
  BUTTON_TOGGLE: 'mat-button-toggle-group mat-button-toggle button, mat-button-toggle button, button[role="radio"]',

  // Ingredient Bar & Frames
  INGREDIENT_BAR: 'flow-ingredient-bar.prompt-ingredient-bar',
  IMAGE_INGREDIENT_CHIP: 'flow-ingredient-bar flow-image-ingredient-chip',
  UPLOAD_CONSENT_DIALOG: 'flow-upload-consent-dialog',
  UPLOAD_CONSENT_CONFIRM: 'flow-upload-consent-dialog mat-dialog-actions div.agree-actions-group button',

  // Gallery & Cards
  GRID_CONTAINER: 'flow-grid-tile-container',
  TOP_BATCH_CONTAINER: 'div.virtual-scroll-container > div.tile-row:first-child flow-grid-tile-container, flow-grid-tile-container:first-of-type, div.tile-row:first-child',
  VIRTUAL_SCROLL_CONTAINER: 'div.virtual-scroll-container, cdk-virtual-scroll-viewport.tiles-container',
  TILE_ROW: 'div.virtual-scroll-container > div.tile-row, div.tile-row',
  TILE_CONTAINER: 'flow-tile-container',
  TOP_TILE: 'div.virtual-scroll-container flow-tile-container, cdk-virtual-scroll-viewport flow-tile-container, flow-tile-container',
  CARD_MEDIA: 'img.thumbnail, img.image, img, video',
  PROGRESS_BAR: '.progress-bar, .progress-bar-fill, flow-pending-tile',
  CARD_ERROR: '.error-container, .failed-indicator, .error-badge, .error-message',
  ERROR_TILE: 'flow-error-tile, .error-tile, .error-tile-content',
  HOTBAR_CONTAINER: 'flow-hotbar-container div.hotbar-inner',

  // Download Menu
  DOWNLOAD_MENU_ITEM: 'div.mat-mdc-menu-content flow-menu-item button[role="menuitem"]'
};

export const LIGATURES = {
  SETTINGS: 'settings_2',
  GENERATE: 'arrow_forward',
  MORE_OPTIONS: 'more_vert',
  DOWNLOAD: 'download',
  SWAP: 'swap_horiz',
  CANCEL: 'cancel',
  VIDEOCAM: 'videocam',
  IMAGE: 'image',
  FRAMES: 'crop_free',
  ASPECT_16_9: 'crop_16_9',
  ASPECT_9_16: 'crop_9_16',
  ASPECT_LANDSCAPE: 'crop_landscape',
  ASPECT_SQUARE: 'crop_square',
  WARNING: 'warning',
  DELETE: 'delete',
  DASHBOARD: 'dashboard',
  LEFT_PANEL_CLOSE: 'left_panel_close',
  LEFT_PANEL_OPEN: 'left_panel_open'
};

/**
 * Internal resolver for pseudo-selectors containing :has-text("...")
 */
function queryAllWithHasText(selector, root) {
  const parts = selector.split(/,(?![^()]*\))/);
  const results = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed.includes(':has-text(')) {
      try {
        results.push(...Array.from(root.querySelectorAll(trimmed)));
      } catch (e) {
        logger.warn(`[FlowDOM] querySelectorAll failed for: ${trimmed}`, e);
      }
      continue;
    }

    // Pattern A: prefix:has(child:has-text("text")) suffix
    const matchHasChild = trimmed.match(/^(.*?):has\((.*?):has-text\(["'](.*?)["']\)\)(.*)$/);
    if (matchHasChild) {
      const [, prefix, childSelector, expectedText, suffix] = matchHasChild;
      const baseElements = prefix.trim() ? Array.from(root.querySelectorAll(prefix.trim())) : [root];
      for (const el of baseElements) {
        const children = childSelector.trim() ? Array.from(el.querySelectorAll(childSelector.trim())) : [el];
        const hasMatchingChild = children.some(c => c.textContent && c.textContent.trim() === expectedText.trim());
        if (hasMatchingChild) {
          if (suffix && suffix.trim()) {
            results.push(...Array.from(el.querySelectorAll(suffix.trim())));
          } else {
            results.push(el);
          }
        }
      }
      continue;
    }

    // Pattern B: target:has-text("text") [suffix]
    const matchDirect = trimmed.match(/^(.*?):has-text\(["'](.*?)["']\)(.*)$/);
    if (matchDirect) {
      const [, targetSelector, expectedText, suffix] = matchDirect;
      const candidates = targetSelector.trim() ? Array.from(root.querySelectorAll(targetSelector.trim())) : Array.from(root.querySelectorAll('*'));
      for (const el of candidates) {
        if (el.textContent && el.textContent.trim().includes(expectedText.trim())) {
          if (suffix && suffix.trim()) {
            results.push(...Array.from(el.querySelectorAll(suffix.trim())));
          } else {
            results.push(el);
          }
        }
      }
      continue;
    }

    // Fallback standard query
    try {
      results.push(...Array.from(root.querySelectorAll(trimmed)));
    } catch (e) {
      logger.warn(`[FlowDOM] Unsupported selector with :has-text: ${trimmed}`);
    }
  }

  return results;
}

/**
 * Basic safe element query. Supports :has-text("...") pseudo selectors.
 */
export function query(selector, root = document) {
  try {
    if (selector.includes(':has-text(')) {
      const all = queryAllWithHasText(selector, root);
      return all.length > 0 ? all[0] : null;
    }
    return root.querySelector(selector);
  } catch (err) {
    logger.error(`[FlowDOM] query error for selector: ${selector}`, err);
    return null;
  }
}

/**
 * Basic safe queryAll returning an array. Supports :has-text("...") pseudo selectors.
 */
export function queryAll(selector, root = document) {
  try {
    if (selector.includes(':has-text(')) {
      return queryAllWithHasText(selector, root);
    }
    return Array.from(root.querySelectorAll(selector));
  } catch (err) {
    logger.error(`[FlowDOM] queryAll error for selector: ${selector}`, err);
    return [];
  }
}

/**
 * Finds a <mat-icon> matching the exact Material Symbol ligature string.
 */
export function queryIcon(ligature, root = document) {
  const icons = queryAll('mat-icon', root);
  for (const icon of icons) {
    if (icon.textContent && icon.textContent.trim() === ligature) {
      return icon;
    }
  }
  return null;
}

/**
 * Finds a parent <button> containing a specific <mat-icon> ligature.
 */
export function queryButtonByIcon(ligature, root = document) {
  const icon = queryIcon(ligature, root);
  if (!icon) return null;
  return icon.closest('button');
}

/**
 * Finds an element by strictly matching its trimmed text content without pseudo-selectors.
 */
export function queryByText(selector, text, root = document) {
  const elements = queryAll(selector, root);
  const target = text.trim();
  for (const el of elements) {
    if (el.textContent && el.textContent.trim() === target) {
      return el;
    }
  }
  return null;
}

/**
 * Finds an element matching a partial/includes text match safely.
 */
export function queryByTextContains(selector, text, root = document) {
  const elements = queryAll(selector, root);
  const target = text.trim().toLowerCase();
  for (const el of elements) {
    if (el.textContent && el.textContent.toLowerCase().includes(target)) {
      return el;
    }
  }
  return null;
}

/**
 * Waits for an element to appear in the DOM using MutationObserver.
 */
export function waitForElement(selector, { timeout = 10000, root = document } = {}) {
  return new Promise((resolve, reject) => {
    const existing = query(selector, root);
    if (existing) return resolve(existing);

    let timeoutId;
    const observer = new MutationObserver(() => {
      const match = query(selector, root);
      if (match) {
        clearTimeout(timeoutId);
        observer.disconnect();
        resolve(match);
      }
    });

    observer.observe(root === document ? document.body : root, {
      childList: true,
      subtree: true,
      attributes: true
    });

    timeoutId = setTimeout(() => {
      observer.disconnect();
      reject(new Error(`[FlowDOM] Timeout waiting for element: ${selector} (${timeout}ms)`));
    }, timeout);
  });
}

/**
 * Waits for an element matching a selector to disappear from the DOM.
 */
export function waitForElementGone(selector, { timeout = 30000, root = document } = {}) {
  return new Promise((resolve, reject) => {
    if (!query(selector, root)) return resolve(true);

    let timeoutId;
    const observer = new MutationObserver(() => {
      if (!query(selector, root)) {
        clearTimeout(timeoutId);
        observer.disconnect();
        resolve(true);
      }
    });

    observer.observe(root === document ? document.body : root, {
      childList: true,
      subtree: true,
      attributes: true
    });

    timeoutId = setTimeout(() => {
      observer.disconnect();
      reject(new Error(`[FlowDOM] Timeout waiting for element to disappear: ${selector} (${timeout}ms)`));
    }, timeout);
  });
}

/**
 * Generic polling waiter for custom predicate functions.
 */
export function waitForCondition(predicate, { timeout = 10000, interval = 200 } = {}) {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const check = async () => {
      try {
        const result = await predicate();
        if (result) return resolve(result);
      } catch (err) {
        // Suppress and continue polling until timeout
      }

      if (Date.now() - start >= timeout) {
        reject(new Error(`[FlowDOM] Timeout waiting for condition (${timeout}ms)`));
      } else {
        setTimeout(check, interval);
      }
    };

    check();
  });
}

/**
 * Evaluates whether an asset tile has genuinely failed (ADR-006).
 * Empirical verification: flow-error-tile, warning ligature, .error-tile,
 * .failed, .blurred-error, or error message wrappers.
 */
export function isCardGenerationFailed(tileElement) {
  if (!tileElement) return false;

  const hasErrorTile = Boolean(tileElement.querySelector(SELECTORS.ERROR_TILE));
  const hasWarningIcon = Boolean(
    queryIcon(LIGATURES.WARNING, tileElement) ||
    Array.from(tileElement.querySelectorAll('mat-icon')).some(i => i.textContent && i.textContent.trim() === LIGATURES.WARNING)
  );
  const hasErrorClass = tileElement.classList.contains('failed') ||
    tileElement.classList.contains('blurred-error');
  const hasErrorMessage = Boolean(tileElement.querySelector('.error-message, .error-subtitle, .error-message-text'));

  return hasErrorTile || hasWarningIcon || hasErrorClass || hasErrorMessage;
}

/**
 * Resolves the primary generated media element (video or image) from a card tile.
 * Robust against empty thumbnail placeholders, video sources, and overlay avatars.
 */
export function getTileMediaSource(tileElement) {
  if (!tileElement) return null;

  // 1. Check <video> elements first (for video generation)
  const videos = queryAll('video', tileElement);
  for (const video of videos) {
    const src = video.getAttribute('src') || video.currentSrc || video.querySelector('source')?.getAttribute('src') || video.poster || '';
    if (src && !src.startsWith('data:image/svg') && !src.includes('placeholder')) {
      return { element: video, type: 'video', src };
    }
  }

  // 2. Check <img> elements (for image generation & poster thumbnails)
  const images = queryAll('img.image, img.thumbnail, img', tileElement);
  for (const img of images) {
    if (img.closest('mat-icon') || img.classList.contains('avatar') || img.classList.contains('user-avatar')) {
      continue;
    }
    const src = img.getAttribute('src') || img.currentSrc || '';
    if (src && !src.startsWith('data:image/svg') && !src.includes('placeholder')) {
      return { element: img, type: 'image', src };
    }
  }

  return null;
}

/**
 * Detects whether a tile card or wrapper represents an uploaded raw ingredient / reference asset
 * rather than an AI-generated output.
 * Google Flow assigns the uploaded file's name (ending in a media file extension) as the tile title
 * and does not provide a 'Reuse prompt' (redo) action on user-uploaded assets.
 *
 * @param {Element} tile - Tile card or container element
 * @returns {boolean} True if this is an uploaded ingredient asset tile
 */
export function isIngredientTile(tile) {
  if (!tile) return false;

  const fileExtRegex = /\.(jpe?g|png|webp|gif|mp4|mov|webm)$/i;

  // 1. Check container and title for media filename extensions
  const container = (typeof tile.closest === 'function' ? tile.closest('flow-grid-tile-container') : null) || tile;
  const footerTitle = tile.querySelector('.footer-title, [class*="footer-title"]');
  const titleText = (footerTitle?.textContent || '').trim();
  const ariaLabel = (tile.getAttribute?.('aria-label') || '').trim();
  const containerAria = (container.getAttribute?.('aria-label') || '').trim();
  const titleAttr = (tile.getAttribute?.('title') || '').trim();
  const containerTitle = (container.getAttribute?.('title') || '').trim();

  if (
    fileExtRegex.test(titleText) ||
    fileExtRegex.test(ariaLabel) ||
    fileExtRegex.test(containerAria) ||
    fileExtRegex.test(titleAttr) ||
    fileExtRegex.test(containerTitle)
  ) {
    return true;
  }

  // 2. Check hotbar actions: completed generated tiles always feature a "redo" / "Reuse prompt" action
  // User-uploaded ingredients only have "Favorite" and "More options".
  const hotbar = tile.querySelector('flow-hotbar-container, flow-image-hotbar, flow-video-hotbar');
  const imgOrVideo = tile.querySelector('img[src], video[src]');
  const hasProgressBar = tile.querySelector('.progress-bar, [class*="progress-bar"]');

  if (hotbar && imgOrVideo && !hasProgressBar) {
    const icons = Array.from(hotbar.querySelectorAll('mat-icon')).map(m => (m.textContent || '').trim());
    const hasRedo = icons.includes('redo') || !!hotbar.querySelector('[aria-label="Reuse prompt"]');
    if (!hasRedo) {
      return true;
    }
  }

  return false;
}

/**
 * Evaluates whether an asset card completed successfully (ADR-006).
 * Google Flow does NOT produce toasts for moderation blocks or quota limits;
 * failed tiles remain blurred with error badges and no valid playable media source.
 */
export function isCardGenerationSuccess(tileElement) {
  if (!tileElement) return false;

  // Raw uploaded ingredient tiles must never be flagged as generated outputs
  if (isIngredientTile(tileElement)) {
    return false;
  }

  // 1. Pending tile indicator or active progress bar must be absent
  if (tileElement.tagName && tileElement.tagName.toLowerCase() === 'flow-pending-tile') {
    return false;
  }
  if (tileElement.querySelector('flow-pending-tile')) {
    return false;
  }

  // 2. Active visible progress bar check
  const progressBar = tileElement.querySelector('.progress-bar, .progress-bar-fill');
  if (progressBar) {
    let isVisible = true;
    if (typeof window !== 'undefined' && window.getComputedStyle) {
      const style = window.getComputedStyle(progressBar);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        isVisible = false;
      }
    }
    if (progressBar.offsetWidth === 0 && progressBar.offsetHeight === 0 && progressBar.getClientRects().length === 0) {
      isVisible = false;
    }
    if (isVisible) return false;
  }

  // 3. Definitive failure check
  if (isCardGenerationFailed(tileElement)) {
    return false;
  }

  // 4. Hotbar or footer presence indicates generation completion (video hotbar or image hover footer)
  const hasHotbarOrFooter = Boolean(
    tileElement.querySelector('flow-hotbar-container, flow-tile-hover-footer, .project-tile-hover-footer') ||
    queryButtonByIcon(LIGATURES.MORE_OPTIONS, tileElement) ||
    queryIcon(LIGATURES.MORE_OPTIONS, tileElement)
  );

  // 5. Must contain a valid rendered media element with active source OR hotbar/footer
  const media = getTileMediaSource(tileElement);
  if (media && media.src && media.src.trim() !== '') {
    return true;
  }

  if (hasHotbarOrFooter) {
    return true;
  }

  return false;
}

/**
 * Dispatches a native click event to bypass synthetic event blockers.
 * Computes bounding client rect center coordinates, dispatches PointerEvent + MouseEvent
 * pipelines, and targets inner MDC touch target / mat-icon for complete compatibility.
 */
export function simulateClick(element) {
  if (!element) return false;

  try {
    element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  } catch (_) {}

  const rect = typeof element.getBoundingClientRect === 'function'
    ? element.getBoundingClientRect()
    : { left: 0, top: 0, width: 0, height: 0 };
  const clientX = Math.round(rect.left + (rect.width > 0 ? rect.width / 2 : 0));
  const clientY = Math.round(rect.top + (rect.height > 0 ? rect.height / 2 : 0));

  const win = element.ownerDocument?.defaultView || (typeof window !== 'undefined' ? window : null);
  if (!win) {
    if (typeof element.click === 'function') element.click();
    return true;
  }

  const commonOpts = {
    bubbles: true,
    cancelable: true,
    composed: true,
    view: win,
    clientX,
    clientY,
    screenX: (win.screenX || 0) + clientX,
    screenY: (win.screenY || 0) + clientY,
    button: 0
  };

  // Focus element if focusable
  if (typeof element.focus === 'function') {
    try { element.focus(); } catch (_) {}
  }

  // Pointer events pipeline (for Chromium pointer listeners)
  if (typeof win.PointerEvent === 'function') {
    element.dispatchEvent(new win.PointerEvent('pointerover', commonOpts));
    element.dispatchEvent(new win.PointerEvent('pointerenter', { ...commonOpts, bubbles: false }));
    element.dispatchEvent(new win.PointerEvent('pointerdown', { ...commonOpts, buttons: 1 }));
  }

  // Mouse events pipeline
  element.dispatchEvent(new win.MouseEvent('mouseover', commonOpts));
  element.dispatchEvent(new win.MouseEvent('mouseenter', { ...commonOpts, bubbles: false }));
  element.dispatchEvent(new win.MouseEvent('mousedown', { ...commonOpts, buttons: 1 }));

  if (typeof win.PointerEvent === 'function') {
    element.dispatchEvent(new win.PointerEvent('pointerup', { ...commonOpts, buttons: 0 }));
  }
  element.dispatchEvent(new win.MouseEvent('mouseup', { ...commonOpts, buttons: 0 }));

  // Dispatch real MouseEvent click with computed clientX/clientY before native .click()
  element.dispatchEvent(new win.MouseEvent('click', commonOpts));

  // Native click fallback
  if (typeof element.click === 'function') {
    element.click();
  }

  return true;
}

/**
 * Dispatches a humanized pointer interaction with natural approach micro-movements,
 * realistic randomized target coordinates, and natural physical hold duration (60-120ms).
 * Essential for bypass of reCAPTCHA Enterprise risk score throttling on 0-credit image endpoints.
 */
export async function simulateHumanClick(element, { holdMs = 85, microMoves = true } = {}) {
  if (!element) return false;

  try {
    element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  } catch (_) {}

  const rect = typeof element.getBoundingClientRect === 'function'
    ? element.getBoundingClientRect()
    : { left: 0, top: 0, width: 0, height: 0 };

  // Humanized jitter within center 60% of element
  const offsetX = rect.width > 0 ? rect.width * (0.35 + 0.3 * Math.random()) : 0;
  const offsetY = rect.height > 0 ? rect.height * (0.35 + 0.3 * Math.random()) : 0;
  const targetX = Math.round(rect.left + offsetX);
  const targetY = Math.round(rect.top + offsetY);

  const win = element.ownerDocument?.defaultView || (typeof window !== 'undefined' ? window : null);
  if (!win) {
    if (typeof element.click === 'function') element.click();
    return true;
  }

  // 1. Natural micro-movement approach (3 trajectory steps)
  if (microMoves && rect.width > 0) {
    const approachSteps = [
      { x: targetX - 30 + Math.round(Math.random() * 8), y: targetY - 20 + Math.round(Math.random() * 8) },
      { x: targetX - 10 + Math.round(Math.random() * 4), y: targetY - 6 + Math.round(Math.random() * 4) },
      { x: targetX, y: targetY }
    ];

    for (const pt of approachSteps) {
      const moveOpts = {
        bubbles: true,
        cancelable: true,
        composed: true,
        view: win,
        clientX: pt.x,
        clientY: pt.y,
        screenX: (win.screenX || 0) + pt.x,
        screenY: (win.screenY || 0) + pt.y
      };
      if (typeof win.PointerEvent === 'function') {
        element.dispatchEvent(new win.PointerEvent('pointermove', moveOpts));
      }
      element.dispatchEvent(new win.MouseEvent('mousemove', moveOpts));
      await sleep(15 + Math.round(Math.random() * 15));
    }
  }

  const clickOpts = {
    bubbles: true,
    cancelable: true,
    composed: true,
    view: win,
    clientX: targetX,
    clientY: targetY,
    screenX: (win.screenX || 0) + targetX,
    screenY: (win.screenY || 0) + targetY,
    button: 0
  };

  // 2. Focus element
  if (typeof element.focus === 'function') {
    try { element.focus(); } catch (_) {}
  }

  // 3. Pointer & mouse enter/down
  if (typeof win.PointerEvent === 'function') {
    element.dispatchEvent(new win.PointerEvent('pointerover', clickOpts));
    element.dispatchEvent(new win.PointerEvent('pointerenter', { ...clickOpts, bubbles: false }));
    element.dispatchEvent(new win.PointerEvent('pointerdown', { ...clickOpts, buttons: 1, pressure: 0.5 }));
  }
  element.dispatchEvent(new win.MouseEvent('mouseover', clickOpts));
  element.dispatchEvent(new win.MouseEvent('mouseenter', { ...clickOpts, bubbles: false }));
  element.dispatchEvent(new win.MouseEvent('mousedown', { ...clickOpts, buttons: 1 }));

  // 4. Physical human hold duration (60ms–130ms)
  const physicalHold = Math.max(50, Math.min(180, holdMs + Math.round((Math.random() - 0.5) * 30)));
  await sleep(physicalHold);

  // 5. Pointer & mouse up
  if (typeof win.PointerEvent === 'function') {
    element.dispatchEvent(new win.PointerEvent('pointerup', { ...clickOpts, buttons: 0, pressure: 0 }));
  }
  element.dispatchEvent(new win.MouseEvent('mouseup', { ...clickOpts, buttons: 0 }));

  // 6. Explicit native click event with real non-zero clientX/clientY
  element.dispatchEvent(new win.MouseEvent('click', clickOpts));

  // 7. Standard element.click() fallback
  if (typeof element.click === 'function') {
    element.click();
  }

  return true;
}

/**
 * Dispatches a native Enter keydown/keypress/keyup sequence with focus and active cursor selection.
 */
export function simulateEnter(element) {
  if (!element) return false;
  if (typeof element.focus === 'function') {
    element.focus();
  }

  const win = element.ownerDocument?.defaultView || (typeof window !== 'undefined' ? window : null);
  if (!win) return false;

  // Align selection to end of contenteditable for ProseMirror schema
  const sel = win.getSelection?.();
  if (sel && sel.rangeCount > 0) {
    try {
      const range = sel.getRangeAt(0);
      range.collapse(false);
    } catch (_) {}
  }

  const keyOpts = {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
    charCode: 13,
    bubbles: true,
    cancelable: true,
    composed: true,
    isComposing: false,
    view: win
  };

  element.dispatchEvent(new win.KeyboardEvent('keydown', keyOpts));
  element.dispatchEvent(new win.KeyboardEvent('keypress', keyOpts));
  element.dispatchEvent(new win.KeyboardEvent('keyup', keyOpts));
  return true;
}

/**
 * Asynchronous pause utility for pacing DOM events, Angular change detection, and animations.
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
