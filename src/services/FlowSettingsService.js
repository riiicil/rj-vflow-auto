/**
 * FlowSettingsService.js — Prompt Settings & Creative Agent Automation
 * 
 * Manages Google Flow prompt parameters popover, model selection,
 * aspect ratios, durations, output counts, and creative agent mode suppression.
 * 
 * Adheres strictly to docs/references/GOOGLE_FLOW_DOM.md and ADR-005.
 */

import {
  SELECTORS,
  LIGATURES,
  query,
  queryAll,
  queryIcon,
  queryButtonByIcon,
  queryByText,
  queryByTextContains,
  waitForElement,
  waitForElementGone,
  simulateClick,
  simulateEnter,
  sleep
} from '../core/FlowDOM.js';

import {
  MODELS,
  MEDIA_MODES,
  ASPECT_RATIOS,
  VIDEO_DURATIONS
} from '../core/FlowStorage.js';

import { logger } from './LoggerService.js';

export class FlowSettingsService {
  /**
   * Checks if an Angular Material button toggle is currently checked.
   */
  isToggleChecked(button) {
    if (!button) return false;
    if (button.getAttribute('aria-pressed') === 'true') return true;
    const parentToggle = button.closest('mat-button-toggle');
    return parentToggle ? parentToggle.classList.contains('mat-button-toggle-checked') : false;
  }

  /**
   * Automates Google Flow top header settings (settings_2):
   * Enforces Grid view mode, Tile Size M, and Auto-Clear Prompt ON.
   * Executed once at the start of queue execution.
   */
  async setupHeaderGridAndClearPrompt(timeout = 5000) {
    logger.step('header setup', 'Configuring Grid mode, Size M, and Auto-Clear Prompt');

    let triggerBtn = query(SELECTORS.SETTINGS_2_BUTTON);
    if (!triggerBtn) {
      triggerBtn = queryButtonByIcon(LIGATURES.SETTINGS, query(SELECTORS.HEADER) || document);
    }

    if (!triggerBtn) {
      logger.warn('[FlowSettingsService] Header settings_2 button not found in DOM');
      return false;
    }

    // Open overlay if not already visible
    let overlayPane = query(SELECTORS.OVERLAY_PANE);
    if (!overlayPane) {
      simulateClick(triggerBtn);
      overlayPane = await waitForElement(SELECTORS.OVERLAY_PANE, { timeout }).catch(() => null);
    }
    await sleep(450);

    try {
      const pane = overlayPane || document;

      // 1. Grid layout toggle (ligature: dashboard)
      const gridBtn = query(SELECTORS.GRID_LAYOUT_TOGGLE, pane) ||
        queryButtonByIcon(LIGATURES.DASHBOARD, pane);
      if (gridBtn && !this.isToggleChecked(gridBtn)) {
        simulateClick(gridBtn);
        await sleep(300);
      }

      // 2. Tile size M toggle
      const sizeMBtn = query(SELECTORS.GRID_SIZE_M_TOGGLE, pane);
      if (sizeMBtn && !this.isToggleChecked(sizeMBtn)) {
        simulateClick(sizeMBtn);
        await sleep(300);
      }

      // 3. Clear prompt switch
      const clearSwitch = query(SELECTORS.CLEAR_PROMPT_SWITCH, pane);
      if (clearSwitch && clearSwitch.getAttribute('aria-checked') !== 'true') {
        simulateClick(clearSwitch);
        await sleep(300);
      }

      return true;
    } finally {
      // 4. Dismiss popover
      if (triggerBtn) {
        simulateClick(triggerBtn);
      }
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
      await waitForElementGone(SELECTORS.OVERLAY_PANE, { timeout: 2000 }).catch(() => {});
      await sleep(400);
    }
  }

  /**
   * Ensures Google Flow's Creative Agent Mode is disabled.
   * Agent mode modifies prompt submission behavior and must remain off for batch jobs.
   */
  async ensureAgentModeOff() {
    const chipButton = query(SELECTORS.AGENT_MODE_CHIP);
    if (!chipButton) return false;

    const isChecked = chipButton.classList.contains('agent-mode-chip-checked') ||
      Boolean(chipButton.closest(SELECTORS.AGENT_MODE_CONTAINER_CHECKED));

    if (isChecked) {
      simulateClick(chipButton);
      await sleep(350);
      return true;
    }
    return false;
  }

  /**
   * Checks whether the prompt settings popover is currently open.
   */
  isPopoverOpen() {
    return Boolean(query(SELECTORS.SETTINGS_POPOVER));
  }

  /**
   * Opens the prompt settings popover and waits for it to render.
   */
  async openSettingsPopover(timeout = 5000) {
    if (this.isPopoverOpen()) {
      return query(SELECTORS.SETTINGS_POPOVER);
    }

    const triggerBtn = query(SELECTORS.SETTINGS_TRIGGER_BUTTON);
    if (!triggerBtn) {
      throw new Error('[FlowSettingsService] Settings trigger button not found in DOM');
    }

    simulateClick(triggerBtn);
    const popover = await waitForElement(SELECTORS.SETTINGS_POPOVER, { timeout });
    await sleep(450);
    return popover;
  }

  /**
   * Closes the prompt settings popover if open.
   */
  async closeSettingsPopover(timeout = 3000) {
    if (!this.isPopoverOpen()) return true;

    await sleep(250);

    // Trigger button toggles popover or Escape closes overlay
    const triggerBtn = query(SELECTORS.SETTINGS_TRIGGER_BUTTON);
    if (triggerBtn) {
      simulateClick(triggerBtn);
    } else {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
    }

    try {
      await waitForElementGone(SELECTORS.SETTINGS_POPOVER, { timeout });
      await sleep(400);
      return true;
    } catch (e) {
      // Fallback: send Escape key to document
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
      await sleep(400);
      return !this.isPopoverOpen();
    }
  }

  /**
   * Reads current active settings summary from trigger button label.
   */
  getSettingsSummaryText() {
    const summarySpan = query(SELECTORS.SETTINGS_SUMMARY);
    return summarySpan ? (summarySpan.textContent || '').trim() : '';
  }

  /**
   * Evaluates if requested settings already match current UI state (Fast-Path).
   */
  isSettingsMatching(targetSettings = {}) {
    const { model, aspectRatio, outputCount, outputs } = targetSettings;
    const finalOutputs = outputCount || outputs;
    const summaryText = this.getSettingsSummaryText();

    // Check aspect ratio ligature in summary
    if (aspectRatio) {
      const ratioLigatureMap = {
        '16:9': LIGATURES.ASPECT_16_9,
        '9:16': LIGATURES.ASPECT_9_16,
        '4:3': LIGATURES.ASPECT_LANDSCAPE,
        '1:1': LIGATURES.ASPECT_SQUARE
      };
      const expectedLigature = ratioLigatureMap[aspectRatio];
      if (expectedLigature && !summaryText.includes(expectedLigature)) {
        return false;
      }
    }

    // Check output count multiplier in summary (e.g. 'x1', 'x2')
    if (finalOutputs && !summaryText.includes(`x${finalOutputs}`)) {
      return false;
    }

    // Check model display if popover is open or visible
    if (model) {
      const modelDisplay = query(SELECTORS.MODEL_SELECT_TRIGGER);
      if (modelDisplay && modelDisplay.textContent.trim() !== model) {
        return false;
      }
    }

    return true;
  }

  /**
   * Selects a model family from the dropdown menu.
   */
  async selectModel(targetModel, popover = document) {
    if (!targetModel) return;

    const modelTrigger = query(SELECTORS.MODEL_SELECT_TRIGGER, popover);
    if (!modelTrigger) {
      console.warn('[FlowSettingsService] Model select trigger not found');
      return;
    }

    // If model is already selected, bypass
    if (modelTrigger.textContent && modelTrigger.textContent.trim() === targetModel) {
      return;
    }

    // Click trigger button
    const triggerBtn = modelTrigger.closest('button');
    if (!triggerBtn) return;
    simulateClick(triggerBtn);
    await sleep(350);

    // Wait for dropdown menu panel to appear
    const menuPanel = await waitForElement(SELECTORS.MENU_PANEL, { timeout: 4000 });

    // Find target model menu item
    const targetItem = queryByText(SELECTORS.MENU_ITEM_BUTTON, targetModel, menuPanel) ||
      queryByTextContains(SELECTORS.MENU_ITEM_BUTTON, targetModel, menuPanel);

    if (!targetItem) {
      // Close menu if item not found
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
      throw new Error(`[FlowSettingsService] Target model item "${targetModel}" not found in menu`);
    }

    simulateClick(targetItem);
    await sleep(350);
    await waitForElementGone(SELECTORS.MENU_PANEL, { timeout: 3000 }).catch(() => {});
  }

  /**
   * Toggles media mode (video / image) and sub-mode (frames / ingredients).
   */
  async selectMediaMode(mode, subMode = null, popover = document) {
    if (!mode) return;

    if (mode === MEDIA_MODES.TEXT_TO_VIDEO || mode === MEDIA_MODES.IMAGE_TO_VIDEO || mode === MEDIA_MODES.FRAMES_TO_VIDEO) {
      const videoBtn = queryButtonByIcon(LIGATURES.VIDEOCAM, popover);
      if (videoBtn && !this.isToggleChecked(videoBtn)) {
        simulateClick(videoBtn);
        await sleep(300);
      }
    } else if (mode === MEDIA_MODES.TEXT_TO_IMAGE || mode === 'text-to-image') {
      const imageBtn = queryButtonByIcon(LIGATURES.IMAGE, popover);
      if (imageBtn && !this.isToggleChecked(imageBtn)) {
        simulateClick(imageBtn);
        await sleep(300);
      }
    }

    // Sub-mode: Frames toggle
    if (subMode === 'frames' || mode === MEDIA_MODES.FRAMES_TO_VIDEO) {
      const framesBtn = queryButtonByIcon(LIGATURES.FRAMES, popover);
      if (framesBtn && !this.isToggleChecked(framesBtn)) {
        simulateClick(framesBtn);
        await sleep(300);
      }
    }
  }

  /**
   * Sets target aspect ratio using Material Symbol ligatures or tokens.
   */
  async selectAspectRatio(ratio, popover = document) {
    if (!ratio) return;

    const ratioLigatureMap = {
      '16:9': LIGATURES.ASPECT_16_9,
      '9:16': LIGATURES.ASPECT_9_16,
      '4:3': LIGATURES.ASPECT_LANDSCAPE,
      '1:1': LIGATURES.ASPECT_SQUARE
    };

    const ligature = ratioLigatureMap[ratio];
    let targetBtn = null;

    if (ligature) {
      targetBtn = queryButtonByIcon(ligature, popover);
    }

    // Fallback: search by text token
    if (!targetBtn) {
      targetBtn = queryByText(SELECTORS.BUTTON_TOGGLE, ratio, popover);
    }

    if (targetBtn && !this.isToggleChecked(targetBtn)) {
      simulateClick(targetBtn);
      await sleep(300);
    }
  }

  /**
   * Sets video duration (Omni 1.1 Flash only).
   */
  async selectDuration(duration, popover = document) {
    if (!duration) return;

    const durationBtn = queryByText(SELECTORS.BUTTON_TOGGLE, duration, popover);
    if (durationBtn && !this.isToggleChecked(durationBtn)) {
      simulateClick(durationBtn);
      await sleep(300);
    }
  }

  /**
   * Sets output multiplier count (e.g. x1, x2, x3, x4).
   */
  async selectOutputCount(count, popover = document) {
    if (!count) return;

    const token = `x${count}`;
    const outputBtn = queryByText(SELECTORS.BUTTON_TOGGLE, token, popover);
    if (outputBtn && !this.isToggleChecked(outputBtn)) {
      simulateClick(outputBtn);
      await sleep(300);
    }
  }

  /**
   * Main orchestrator: Applies all target configuration parameters.
   * Leverages fast-path bypass whenever active settings already match.
   * Allows passing row-specific parameter objects directly: applySettings(itemParams).
   */
  async applySettings(config = {}) {
    // 1. Always enforce Creative Agent Mode is disabled
    await this.ensureAgentModeOff();

    // Normalize config (supports both global config and itemParams format)
    const target = {
      mode: config.mode,
      subMode: config.subMode || (config.mode === MEDIA_MODES.FRAMES_TO_VIDEO ? 'frames' : null),
      model: config.model,
      aspectRatio: config.aspectRatio,
      duration: config.duration,
      outputCount: config.outputCount || config.outputs
    };

    // 2. Check Fast-Path: if already matching, skip opening popover
    if (this.isSettingsMatching(target)) {
      return { bypassed: true, applied: false };
    }

    // 3. Open settings popover (includes 450ms pacing delay)
    const popover = await this.openSettingsPopover();

    try {
      // 4. Apply Media Mode (includes 300ms pacing delay)
      if (target.mode) {
        await this.selectMediaMode(target.mode, target.subMode, popover);
      }

      // 5. Apply Model Family (includes 350ms trigger + 350ms selection pacing delay)
      if (target.model) {
        await this.selectModel(target.model, popover);
      }

      // 6. Apply Aspect Ratio (includes 300ms pacing delay)
      if (target.aspectRatio) {
        await this.selectAspectRatio(target.aspectRatio, popover);
      }

      // 7. Apply Duration (if applicable for Omni, includes 300ms pacing delay)
      if (target.duration && target.model === MODELS.OMNI_FLASH) {
        await this.selectDuration(target.duration, popover);
      }

      // 8. Apply Output Multiplier (includes 300ms pacing delay)
      if (target.outputCount) {
        await this.selectOutputCount(target.outputCount, popover);
      }

      return { bypassed: false, applied: true };
    } finally {
      // 9. Always ensure popover is closed cleanly (includes 250ms settle + 400ms close pacing delay)
      await this.closeSettingsPopover();
    }
  }
}

export const flowSettingsService = new FlowSettingsService();

