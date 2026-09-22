/**
 * FlowPromptService.js — ProseMirror Prompt Injection & Submission Engine
 * 
 * Manages 100% Zero-CDP text insertion into Google Flow's ProseMirror editor,
 * prompt clearing, generate button readiness polling, and trigger dispatch.
 * 
 * Adheres strictly to docs/references/GOOGLE_FLOW_DOM.md, ADR-004, and ADR-005.
 */

import {
  SELECTORS,
  LIGATURES,
  query,
  queryButtonByIcon,
  waitForElement,
  waitForCondition,
  simulateClick,
  simulateHumanClick,
  simulateEnter,
  sleep
} from '../core/FlowDOM.js';
import { logger } from './LoggerService.js';
import { flowBridgeClient } from './FlowBridgeClient.js';

export class FlowPromptService {
  /**
   * Retrieves the active ProseMirror contenteditable editor DOM node.
   */
  getEditorNode() {
    return query(SELECTORS.PROSEMIRROR_EDITOR);
  }

  /**
   * Returns current trimmed text content from the ProseMirror editor.
   */
  getPromptText() {
    const editor = this.getEditorNode();
    return editor ? (editor.textContent || '').trim() : '';
  }

  /**
   * Resets and clears the ProseMirror editor to an empty paragraph state.
   */
  clearPrompt() {
    const editor = this.getEditorNode();
    if (!editor) {
      throw new Error('[FlowPromptService] ProseMirror editor not found for clearing');
    }

    editor.focus();

    const win = editor.ownerDocument?.defaultView || (typeof window !== 'undefined' ? window : null);

    // Select existing contents via Selection API
    const sel = win?.getSelection?.();
    if (sel && editor.ownerDocument?.createRange) {
      try {
        const range = editor.ownerDocument.createRange();
        range.selectNodeContents(editor);
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (_) {}
    }

    // Select all and delete via execCommand
    document.execCommand('selectAll', false, null);
    document.execCommand('delete', false, null);

    // Fallback: reset inner HTML if any lingering text remains
    if ((editor.textContent || '').trim() !== '') {
      editor.innerHTML = '<p><br class="ProseMirror-trailingBreak"></p>';
    }

    // Dispatch native input event
    if (win && typeof win.InputEvent === 'function') {
      editor.dispatchEvent(new win.InputEvent('input', {
        bubbles: true,
        composed: true,
        inputType: 'deleteContentBackward'
      }));
    } else {
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    }

    return true;
  }

  /**
   * Injects prompt text natively into Google Flow's ProseMirror editor (Zero-CDP).
   */
  setPrompt(promptText) {
    if (typeof promptText !== 'string') {
      promptText = String(promptText || '');
    }

    const editor = this.getEditorNode();
    if (!editor) {
      throw new Error('[FlowPromptService] ProseMirror editor node not found in DOM');
    }

    editor.focus();

    const win = editor.ownerDocument?.defaultView || (typeof window !== 'undefined' ? window : null);

    // Select existing contents via Selection API
    const sel = win?.getSelection?.();
    if (sel && editor.ownerDocument?.createRange) {
      try {
        const range = editor.ownerDocument.createRange();
        range.selectNodeContents(editor);
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (_) {}
    }
    document.execCommand('selectAll', false, null);

    // Dispatch beforeinput event with insertText
    if (win && typeof win.InputEvent === 'function') {
      try {
        editor.dispatchEvent(new win.InputEvent('beforeinput', {
          bubbles: true,
          cancelable: true,
          composed: true,
          inputType: 'insertText',
          data: promptText
        }));
      } catch (_) {}
    }

    // Select all and insert text using native execCommand
    document.execCommand('insertText', false, promptText);

    // Dispatch input event to notify Angular change detection and ProseMirror document state
    if (win && typeof win.InputEvent === 'function') {
      editor.dispatchEvent(new win.InputEvent('input', {
        bubbles: true,
        composed: true,
        inputType: 'insertText',
        data: promptText
      }));
    } else {
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Fallback: direct textContent assignment with input dispatch if execCommand did not register
    const currentText = this.getPromptText();
    if (currentText !== promptText.trim()) {
      editor.innerHTML = `<p>${promptText}</p>`;
      if (win && typeof win.InputEvent === 'function') {
        editor.dispatchEvent(new win.InputEvent('input', {
          bubbles: true,
          composed: true,
          inputType: 'insertText',
          data: promptText
        }));
      } else {
        editor.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }

    return true;
  }

  /**
   * Evaluates whether the generate button is currently enabled and ready.
   */
  isGenerateButtonReady() {
    const btn = query(SELECTORS.GENERATE_BUTTON) || queryButtonByIcon(LIGATURES.GENERATE);
    if (!btn) return false;

    // Must not be disabled via attribute or class
    if (btn.hasAttribute('disabled')) return false;
    if (btn.classList.contains('mat-mdc-button-disabled')) return false;

    return true;
  }

  /**
   * Waits until the generate button becomes enabled and clickable.
   */
  async waitForGenerateButtonReady(timeout = 5000) {
    return await waitForCondition(() => this.isGenerateButtonReady(), {
      timeout,
      interval: 150
    });
  }

  /**
   * Triggers generation by executing native pointer click directly on the generate button,
   * with multi-tier fallback to ProseMirror Enter keydown and host wrapper click.
   */
  async triggerGenerate() {
    const ready = await this.waitForGenerateButtonReady(5000).catch(() => false);
    if (!ready) {
      throw new Error('[FlowPromptService] Generate button was not ready within timeout');
    }

    const btn = query(SELECTORS.GENERATE_BUTTON) || queryButtonByIcon(LIGATURES.GENERATE);
    if (!btn) {
      throw new Error('[FlowPromptService] Generate button not found');
    }

    const editor = this.getEditorNode();

    // Blur editor to commit ProseMirror transaction state
    if (editor && typeof editor.blur === 'function') {
      try { editor.blur(); } catch (_) {}
    }
    if (typeof btn.focus === 'function') {
      try { btn.focus(); } catch (_) {}
    }

    // 1. Primary trigger: simulateHumanClick directly on the <button> element
    await simulateHumanClick(btn, { holdMs: 110, microMoves: true });
    await sleep(350);

    // 2. Fallback check: if the button is still enabled, Flow did not consume the click
    if (this.isGenerateButtonReady()) {
      logger.warn('[FlowPromptService] Primary generate click not consumed, attempting target icon click');
      const icon = btn.querySelector('mat-icon') || btn;
      await simulateHumanClick(icon, { holdMs: 90, microMoves: true });
      await sleep(350);

      if (this.isGenerateButtonReady()) {
        logger.warn('[FlowPromptService] Icon click not consumed, attempting native button.click() fallback');
        try { btn.click(); } catch (_) {}
        await sleep(350);

        if (this.isGenerateButtonReady()) {
          logger.warn('[FlowPromptService] Click fallback not consumed, attempting ProseMirror Enter fallback');
          if (editor) {
            editor.focus();
            simulateEnter(editor);
            await sleep(350);
          }

          if (this.isGenerateButtonReady()) {
            logger.warn('[FlowPromptService] Enter trigger not consumed, attempting host flow-generate-icon-button click');
            const hostEl = btn.closest('flow-generate-icon-button') || btn;
            await simulateHumanClick(hostEl, { holdMs: 90, microMoves: false });
          }
        }
      }
    }

    // Pacing delay: allows Google Flow canvas to initiate generation request
    await sleep(400);
    return true;
  }

  /**
   * High-level orchestrator: Clears prior text, visibly injects prompt into ProseMirror,
   * pre-arms clean reCAPTCHA Enterprise tokens for free image generation modes,
   * and routes execution natively through the unified DOM trigger pipeline.
   */
  async submitPrompt(promptText, {
    clearBefore = true,
    timeout = 5000,
    mode = null,
    model = null,
    aspectRatio = '16:9',
    count = 1,
    seed = null,
    refMediaIds = [],
    baseMediaId = null
  } = {}) {
    if (clearBefore) {
      this.clearPrompt();
    }

    // 1. Visibly inject prompt into ProseMirror so user sees active prompt in the box
    this.setPrompt(promptText);

    // 2. Strict branching: Image modes (text-to-image, edit-image, or Nano Banana models)
    // IMPORTANT: image-to-video and frames are VIDEO modes and must NEVER be treated as image!
    const isImage = mode === 'text-to-image' || mode === 'edit-image' ||
      (!mode && model && (model.includes('Banana') || model.includes('NARWHAL') || model.includes('GEM_PIX_2') || model.includes('HARBOR_SEAL')));

    // Wait for generate button readiness before dispatching trigger
    await this.waitForGenerateButtonReady(timeout).catch(() => {});
    await sleep(350);

    if (isImage) {
      logger.info(`[FlowPromptService] Image mode detected (${mode || model}) — pre-arming clean reCAPTCHA Enterprise token`);
      try {
        await flowBridgeClient.armCaptchaToken('IMAGE_GENERATION');
      } catch (bridgeErr) {
        logger.warn('[FlowPromptService] Bridge captcha arming warning (proceeding with native click):', bridgeErr);
      }
    }

    // 3. For all modes (Image, Video, Edit, Frames): dispatch native DOM click pipeline
    return await this.triggerGenerate();
  }
}

export const flowPromptService = new FlowPromptService();
