/**
 * FlowIngredientService.js — Media Asset & Reference Ingestion Service
 * 
 * Manages Image-to-Video (I2V) ingredients, Frame-to-Video (F2V) start/end frame slots,
 * native clipboard paste injection, and upload consent dialog auto-confirmation.
 * 
 * Adheres strictly to docs/references/GOOGLE_FLOW_DOM.md and ADR-004 / ADR-005.
 */

import {
  SELECTORS,
  LIGATURES,
  query,
  queryAll,
  queryIcon,
  queryButtonByIcon,
  waitForElement,
  waitForElementGone,
  waitForCondition,
  simulateClick
} from '../core/FlowDOM.js';

/**
 * Converts a data URL (Base64) to a native binary Blob.
 */
export function dataUrlToBlob(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  if (!dataUrl.startsWith('data:')) {
    throw new Error('[FlowIngredientService] Invalid data URL string');
  }

  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const binaryStr = atob(parts[1]);
  const len = binaryStr.length;
  const u8arr = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    u8arr[i] = binaryStr.charCodeAt(i);
  }

  return new Blob([u8arr], { type: mime });
}

export class FlowIngredientService {
  /**
   * Dispatches a native clipboard paste event into the ProseMirror editor.
   * Google Flow's internal paste handler detects the image/video File and automatically
   * routes it into the active ingredient slot or media card.
   */
  async injectMediaToFlow(fileBlobOrDataUrl, fileName = 'ingredient.png', mimeType = 'image/png') {
    let blob = fileBlobOrDataUrl;
    if (typeof fileBlobOrDataUrl === 'string' && fileBlobOrDataUrl.startsWith('data:')) {
      blob = dataUrlToBlob(fileBlobOrDataUrl);
      if (blob && blob.type) mimeType = blob.type;
    }

    if (!(blob instanceof Blob)) {
      throw new Error('[FlowIngredientService] Provided file is not a valid Blob or data URL');
    }

    const editor = query(SELECTORS.PROSEMIRROR_EDITOR);
    if (!editor) {
      throw new Error('[FlowIngredientService] ProseMirror editor not found for media injection');
    }

    editor.focus();

    const file = new File([blob], fileName, { type: mimeType });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    const pasteEvent = new ClipboardEvent('paste', {
      clipboardData: dataTransfer,
      bubbles: true,
      cancelable: true
    });

    editor.dispatchEvent(pasteEvent);

    // Auto-handle any upload consent dialog that may appear
    await this.handleUploadConsentDialog(4000).catch(() => {});

    // Wait until upload processing completes
    await this.waitForIngredientUploadComplete(15000);
    return true;
  }

  /**
   * Auto-confirms Google Flow's Upload Consent Dialog if displayed.
   */
  async handleUploadConsentDialog(timeout = 3000) {
    try {
      const dialog = await waitForElement(SELECTORS.UPLOAD_CONSENT_DIALOG, { timeout });
      if (dialog) {
        const confirmBtn = query(SELECTORS.UPLOAD_CONSENT_CONFIRM, dialog);
        if (confirmBtn) {
          simulateClick(confirmBtn);
          await waitForElementGone(SELECTORS.UPLOAD_CONSENT_DIALOG, { timeout: 2000 }).catch(() => {});
          return true;
        }
      }
    } catch (e) {
      // Dialog did not appear within timeout, normal scenario
    }
    return false;
  }

  /**
   * Retrieves all currently active ingredient chip elements in the prompt box.
   */
  getIngredientChips() {
    return queryAll(SELECTORS.IMAGE_INGREDIENT_CHIP);
  }

  /**
   * Removes all active ingredient chips from the prompt box.
   */
  async clearIngredients() {
    const chips = this.getIngredientChips();
    if (chips.length === 0) return true;

    for (const chip of chips) {
      // Look for remove icon button with ligature 'cancel'
      const cancelIcon = queryIcon(LIGATURES.CANCEL, chip);
      if (cancelIcon) {
        const btn = cancelIcon.closest('button') || cancelIcon.closest('div.hover-icon-overlay') || cancelIcon;
        simulateClick(btn);
      }
    }

    await waitForCondition(() => this.getIngredientChips().length === 0, { timeout: 3000 }).catch(() => {});
    return true;
  }

  /**
   * Sets a Frame-to-Video slot (Start or End frame).
   */
  async setFrameSlot(slotType = 'start', blobOrDataUrl, fileName = 'frame.png') {
    const selector = slotType === 'start' ? SELECTORS.FRAME_TRIGGER_START : SELECTORS.FRAME_TRIGGER_END;
    const triggerBtn = query(selector);

    if (triggerBtn) {
      simulateClick(triggerBtn);
    }

    return await this.injectMediaToFlow(blobOrDataUrl, fileName);
  }

  /**
   * Swaps start and end frames via the swap button.
   */
  swapFrames() {
    const swapBtn = queryButtonByIcon(LIGATURES.SWAP);
    if (!swapBtn) {
      console.warn('[FlowIngredientService] Swap frames button not found');
      return false;
    }
    return simulateClick(swapBtn);
  }

  /**
   * Waits for an uploaded ingredient to complete processing.
   */
  async waitForIngredientUploadComplete(timeout = 15000) {
    return await waitForCondition(() => {
      const chips = this.getIngredientChips();
      if (chips.length === 0) return false;

      // Check if any chip still has a progress indicator
      for (const chip of chips) {
        if (chip.querySelector('.progress-bar, [class*="loading"], [class*="progress"]')) {
          return false;
        }
      }
      return true;
    }, { timeout, interval: 300 });
  }
}

export const flowIngredientService = new FlowIngredientService();
