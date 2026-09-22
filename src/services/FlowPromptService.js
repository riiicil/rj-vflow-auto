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
  simulateEnter,
  sleep
} from '../core/FlowDOM.js';
import { logger } from './LoggerService.js';

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
   * Triggers generation by executing native click on the generate button,
   * with multi-tier fallback to ProseMirror Enter keydown and inner icon click
   * if the primary click was swallowed by Angular change detection.
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

    // 1. Primary trigger: simulateClick on generate button
    simulateClick(btn);
    await sleep(250);

    // 2. Fallback check: if the button is still enabled, Flow did not consume the click
    if (this.isGenerateButtonReady()) {
      logger.warn('[FlowPromptService] Primary generate click not consumed, attempting ProseMirror Enter fallback');
      // Secondary fallback: ProseMirror native Enter submission
      if (editor) {
        simulateEnter(editor);
        await sleep(250);
      }

      // Tertiary fallback: click directly on inner mat-icon or touch-target
      if (this.isGenerateButtonReady()) {
        logger.warn('[FlowPromptService] Enter trigger not consumed, attempting inner mat-icon direct click');
        const innerTarget = btn.querySelector('.mat-mdc-button-touch-target') || btn.querySelector('mat-icon');
        if (innerTarget) {
          simulateClick(innerTarget);
        }
      }
    }

    // Pacing delay: allows Google Flow canvas to initiate generation request
    await sleep(400);
    return true;
  }

  /**
   * High-level orchestrator: Clears prior text, sets target prompt,
   * waits for button readiness, and triggers generation.
   */
  async submitPrompt(promptText, { clearBefore = true, timeout = 5000 } = {}) {
    if (clearBefore) {
      this.clearPrompt();
    }

    this.setPrompt(promptText);
    await this.waitForGenerateButtonReady(timeout);

    // Pacing delay: ensures InputEvent has settled before triggering Generate
    await sleep(350);

    return await this.triggerGenerate();
  }
}

export const flowPromptService = new FlowPromptService();
