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

    // Reset inner HTML to clean empty paragraph structure
    editor.innerHTML = '<p><br class="ProseMirror-trailingBreak"></p>';

    // Select all and delete via execCommand to keep ProseMirror internal state aligned
    document.execCommand('selectAll', false, null);
    document.execCommand('delete', false, null);

    // Dispatch native input event
    editor.dispatchEvent(new Event('input', { bubbles: true }));
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

    // Prepare clean paragraph node
    editor.innerHTML = '<p><br class="ProseMirror-trailingBreak"></p>';

    // Select all and insert text using native execCommand
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, promptText);

    // Dispatch input event to notify Angular change detection and ProseMirror document state
    editor.dispatchEvent(new Event('input', { bubbles: true }));

    // Verify injected text matches
    const currentText = this.getPromptText();
    if (currentText !== promptText.trim()) {
      // Fallback: direct textContent assignment with input dispatch if execCommand did not register
      editor.innerHTML = `<p>${promptText}</p>`;
      editor.dispatchEvent(new Event('input', { bubbles: true }));
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
   * Triggers generation by executing native click on the generate button.
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

    simulateClick(btn);
    // Pacing delay: allows Google Flow canvas to initiate generation request
    await sleep(600);
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
