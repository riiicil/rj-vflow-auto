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
  GRID_SIZE_M_TOGGLE: 'div.cdk-overlay-pane mat-button-toggle:has(span:has-text("M")) button',
  CLEAR_PROMPT_SWITCH: 'button[name="clear-prompt-on-submit"], button[aria-label*="Clear prompt on submit" i], button[aria-label*="Clear prompt" i], mat-slide-toggle:has-text("Clear prompt") button[role="switch"]',

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
  FRAME_TRIGGER_START: 'flow-ingredient-bar div.frame-trigger:nth-of-type(1) button.empty-chip',
  FRAME_TRIGGER_END: 'flow-ingredient-bar div.frame-trigger:nth-of-type(2) button.empty-chip',
  IMAGE_INGREDIENT_CHIP: 'flow-ingredient-bar flow-image-ingredient-chip',
  UPLOAD_CONSENT_DIALOG: 'flow-upload-consent-dialog',
  UPLOAD_CONSENT_CONFIRM: 'flow-upload-consent-dialog mat-dialog-actions div.agree-actions-group button',

  // Gallery & Cards
  GRID_CONTAINER: 'flow-grid-tile-container',
  TOP_BATCH_CONTAINER: 'div.virtual-scroll-container > div.tile-row:first-child flow-grid-tile-container, flow-grid-tile-container:first-of-type, div.tile-row:first-child',
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
  DASHBOARD: 'dashboard'
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

    // Pattern B: target:has-text("text")
    const matchDirect = trimmed.match(/^(.*?):has-text\(["'](.*?)["']\)$/);
    if (matchDirect) {
      const [, targetSelector, expectedText] = matchDirect;
      const candidates = targetSelector.trim() ? Array.from(root.querySelectorAll(targetSelector.trim())) : Array.from(root.querySelectorAll('*'));
      for (const el of candidates) {
        if (el.textContent && el.textContent.trim() === expectedText.trim()) {
          results.push(el);
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
 * Evaluates whether an asset card completed successfully (ADR-006).
 * Google Flow does NOT produce toasts for moderation blocks or quota limits;
 * failed tiles remain blurred with error badges and no valid playable media source.
 */
export function isCardGenerationSuccess(tileElement) {
  if (!tileElement) return false;

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

  // 4. Hotbar presence indicates generation completion
  const hasHotbar = Boolean(
    tileElement.querySelector('flow-hotbar-container') ||
    queryButtonByIcon(LIGATURES.MORE_OPTIONS, tileElement) ||
    queryIcon(LIGATURES.MORE_OPTIONS, tileElement)
  );

  // 5. Must contain a valid rendered media element with active source OR hotbar
  const media = getTileMediaSource(tileElement);
  if (media && media.src && media.src.trim() !== '') {
    return true;
  }

  if (hasHotbar) {
    return true;
  }

  return false;
}

/**
 * Dispatches a native click event to bypass synthetic event blockers.
 */
export function simulateClick(element) {
  if (!element) return false;
  element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
  element.click();
  return true;
}

/**
 * Dispatches a native Enter keydown/keyup sequence.
 */
export function simulateEnter(element) {
  if (!element) return false;
  element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
  element.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
  return true;
}

/**
 * Asynchronous pause utility for pacing DOM events, Angular change detection, and animations.
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
