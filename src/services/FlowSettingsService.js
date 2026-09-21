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

import { logger } from './LoggerService.js';

import {
  MODELS,
  MEDIA_MODES,
  ASPECT_RATIOS,
  VIDEO_DURATIONS,
  IMAGE_MODELS,
  VIDEO_MODELS,
  normalizeModelForMode
} from '../core/FlowStorage.js';

export class FlowSettingsService {
  /**
   * Checks if an Angular Material button toggle is currently checked.
   */
  isToggleChecked(button) {
    if (!button) return false;
    if (button.getAttribute('aria-pressed') === 'true') return true;
    if (button.getAttribute('aria-checked') === 'true') return true;
    if (button.classList.contains('mat-button-toggle-checked') ||
        button.classList.contains('active') ||
        button.classList.contains('selected')) return true;
    const parentToggle = button.closest('mat-button-toggle');
    if (parentToggle) {
      if (parentToggle.classList.contains('mat-button-toggle-checked')) return true;
      if (parentToggle.getAttribute('aria-checked') === 'true') return true;
      const input = parentToggle.querySelector('input[type="radio"], button');
      if (input && (input.checked || input.getAttribute('aria-pressed') === 'true' || input.getAttribute('aria-checked') === 'true')) return true;
    }
    return false;
  }

  /**
   * Specifically locates the 'Clear prompt on submit' toggle switch.
   * Strictly avoids other switches in the header popover (e.g. Sound on hover, Silent videos).
   */
  findClearPromptSwitch(pane = document) {
    // 1. Direct query by exact button name or aria-label (Flow modern MDC switch)
    let sw = query('button[name="clear-prompt-on-submit"]', pane) ||
      query('button[aria-label*="Clear prompt on submit" i]', pane) ||
      query('button[aria-label*="Clear prompt" i]', pane);
    if (sw) return sw;

    // Search in document if pane was scoped narrowly
    sw = query('button[name="clear-prompt-on-submit"]', document) ||
      query('button[aria-label*="Clear prompt on submit" i]', document) ||
      query('button[aria-label*="Clear prompt" i]', document);
    if (sw) return sw;

    // 2. Search mat-slide-toggle / mat-mdc-slide-toggle containing text "Clear prompt"
    const toggles = queryAll('mat-slide-toggle, .mat-mdc-slide-toggle', document);
    for (const toggle of toggles) {
      if (toggle.textContent && toggle.textContent.toLowerCase().includes('clear prompt')) {
        return toggle.querySelector('button[role="switch"]') || toggle.querySelector('button') || toggle;
      }
    }

    // 3. Fallback: query with SELECTORS.CLEAR_PROMPT_SWITCH
    return query(SELECTORS.CLEAR_PROMPT_SWITCH, pane) || query(SELECTORS.CLEAR_PROMPT_SWITCH, document);
  }

  /**
   * Ensures Google Flow's left project navigation sidebar is collapsed.
   * If the sidebar is currently expanded (has left_panel_close icon), collapses it.
   * If already collapsed, skips cleanly and logs state.
   */
  async ensureSidebarCollapsed() {
    const collapseEl = query(SELECTORS.SIDEBAR_COLLAPSE_BUTTON) ||
      queryIcon(LIGATURES.LEFT_PANEL_CLOSE)?.closest('mat-list-item, button, [role="button"]') ||
      queryIcon(LIGATURES.LEFT_PANEL_CLOSE);

    if (collapseEl) {
      logger.step('sidebar setup', 'Collapsing left project navigation sidebar');
      simulateClick(collapseEl);
      await sleep(350);
      logger.info('[FlowSettingsService] Left project navigation sidebar collapsed');
      return true;
    }

    logger.info('[FlowSettingsService] Left project navigation sidebar already collapsed');
    return false;
  }

  /**
   * Automates Google Flow top header settings (settings_2):
   * Enforces Grid view mode, Tile Size S, and Auto-Clear Prompt ON.
   * Executed once at the start of queue execution.
   */
  async setupHeaderGridAndClearPrompt(timeout = 5000) {
    logger.step('header setup', 'Configuring Grid mode, Size S, and Auto-Clear Prompt');

    let triggerBtn = query(SELECTORS.SETTINGS_2_BUTTON);
    if (!triggerBtn) {
      triggerBtn = queryButtonByIcon(LIGATURES.SETTINGS, query(SELECTORS.HEADER) || document);
    }

    if (!triggerBtn) {
      logger.warn('[FlowSettingsService] Header settings_2 button not found in DOM');
      return false;
    }

    // Open overlay if not already visible/expanded
    const isExpanded = triggerBtn.getAttribute('aria-expanded') === 'true';
    let overlayPane = isExpanded
      ? (query('div.cdk-overlay-pane:has(button[name="clear-prompt-on-submit"])') || query('div.cdk-overlay-pane:has(mat-icon:has-text("dashboard"))'))
      : null;

    if (!overlayPane) {
      simulateClick(triggerBtn);
      overlayPane = await waitForElement(
        'div.cdk-overlay-pane button[name="clear-prompt-on-submit"], div.cdk-overlay-pane:has(mat-icon:has-text("dashboard")), div.cdk-overlay-pane',
        { timeout }
      ).catch(() => null);
    }
    await sleep(450);

    try {
      const pane = overlayPane || document;

      // 1. Grid layout toggle (ligature: dashboard)
      const gridBtn = query(SELECTORS.GRID_LAYOUT_TOGGLE, pane) ||
        queryButtonByIcon(LIGATURES.DASHBOARD, pane) ||
        queryButtonByIcon('dashboard', document);
      if (gridBtn && !this.isToggleChecked(gridBtn)) {
        simulateClick(gridBtn);
        await sleep(300);
      }

      // 2. Tile size S toggle
      const sizeSBtn = query(SELECTORS.GRID_SIZE_S_TOGGLE, pane) ||
        query('mat-button-toggle:has(span:has-text("S")) button', document);
      if (sizeSBtn && !this.isToggleChecked(sizeSBtn)) {
        simulateClick(sizeSBtn);
        await sleep(300);
      }

      // 3. Clear prompt switch (TARGET ONLY Clear Prompt on submit, never Sound on hover!)
      const clearSwitch = this.findClearPromptSwitch(pane);
      if (clearSwitch) {
        const isChecked = clearSwitch.getAttribute('aria-checked') === 'true' ||
          Boolean(clearSwitch.closest('.mat-mdc-slide-toggle-checked, .mat-slide-toggle-checked')) ||
          clearSwitch.checked === true;
        if (!isChecked) {
          simulateClick(clearSwitch);
          await sleep(300);
          logger.info('[FlowSettingsService] Clear prompt on submit switch toggled ON');
        } else {
          logger.info('[FlowSettingsService] Clear prompt on submit switch already ON');
        }
      } else {
        logger.warn('[FlowSettingsService] Clear prompt switch not found, keeping existing setting');
      }

      return true;
    } finally {
      // 4. Dismiss popover cleanly
      if (triggerBtn && triggerBtn.getAttribute('aria-expanded') === 'true') {
        simulateClick(triggerBtn);
      } else {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
      }
      await sleep(300);
    }
  }

  /**
   * Ensures Google Flow's Creative Agent Mode is disabled.
   * Agent mode modifies prompt submission behavior and must remain off for batch jobs.
   */
  async ensureAgentModeOff() {
    const chipButton = query(SELECTORS.AGENT_MODE_CHIP);
    if (!chipButton) {
      logger.info('[FlowSettingsService] Creative Agent Mode toggle chip not found (or not present)');
      return false;
    }

    const isChecked = chipButton.classList.contains('agent-mode-chip-checked') ||
      Boolean(chipButton.closest(SELECTORS.AGENT_MODE_CONTAINER_CHECKED));

    if (isChecked) {
      logger.step('agent mode', 'Creative Agent Mode detected active - turning OFF');
      simulateClick(chipButton);
      await sleep(350);
      logger.info('[FlowSettingsService] Creative Agent Mode disabled successfully');
      return true;
    }

    logger.info('[FlowSettingsService] Creative Agent Mode is already OFF');
    return false;
  }

  /**
   * Checks whether the prompt settings popover is currently open.
   */
  isPopoverOpen() {
    const pop = query(SELECTORS.SETTINGS_POPOVER);
    if (!pop) return false;
    if (typeof window !== 'undefined' && window.getComputedStyle) {
      return window.getComputedStyle(pop).display !== 'none';
    }
    return true;
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
   * Selects a model family from the dropdown menu.
   */
  async selectModel(targetModel, popover = document) {
    if (!targetModel) return;

    let modelTrigger = query(SELECTORS.MODEL_SELECT_TRIGGER, popover) ||
      query('span.model-select-trigger-content', popover) ||
      query('flow-prompt-box-settings button[aria-haspopup="menu"]', popover) ||
      query('button:has(mat-icon:has-text("arrow_drop_down"))', popover);

    if (!modelTrigger) {
      logger.warn('[FlowSettingsService] Model select trigger not found');
      return;
    }
    // Normalized fast-path: if model is already selected in trigger label, bypass opening menu
    const currentTriggerText = (modelTrigger.textContent || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const targetNorm = targetModel.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (currentTriggerText && targetNorm && (currentTriggerText.includes(targetNorm) || targetNorm.includes(currentTriggerText))) {
      return;
    }

    // Click trigger button
    const triggerBtn = modelTrigger.closest('button') || modelTrigger;
    simulateClick(triggerBtn);
    await sleep(400);

    // Wait for dropdown menu panel to appear
    const menuPanel = await waitForElement(SELECTORS.MENU_PANEL, { timeout: 4000 }).catch(() => null);
    if (!menuPanel) {
      logger.warn('[FlowSettingsService] Menu panel did not appear after clicking model trigger');
      return;
    }

    // Find target model menu item
    const menuButtonsSelector = `${SELECTORS.MENU_ITEM_BUTTON}, button[role="menuitem"], .mat-mdc-menu-item`;
    let targetItem = queryByText(menuButtonsSelector, targetModel, menuPanel) ||
      queryByTextContains(menuButtonsSelector, targetModel, menuPanel);

    // Flexible fallback: match without punctuation/hyphens
    if (!targetItem) {
      const allItems = queryAll(menuButtonsSelector, menuPanel);
      for (const item of allItems) {
        const normItem = (item.textContent || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normItem.includes(targetNorm) || targetNorm.includes(normItem)) {
          targetItem = item;
          break;
        }
      }
    }

    if (!targetItem) {
      const allItems = queryAll(menuButtonsSelector, menuPanel);
      const available = allItems.map(i => i.textContent.trim()).filter(Boolean);
      logger.warn(`[FlowSettingsService] Available models in menu: [${available.join(', ')}]`);
      // Close menu if item not found
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
      throw new Error(`[FlowSettingsService] Target model item "${targetModel}" not found in menu (available: ${available.join(', ')})`);
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

    const isVideo = mode === MEDIA_MODES.TEXT_TO_VIDEO ||
      mode === MEDIA_MODES.IMAGE_TO_VIDEO ||
      mode === MEDIA_MODES.FRAMES_TO_VIDEO ||
      (typeof mode === 'string' && mode.includes('video'));

    const isImage = !isVideo && (
      mode === MEDIA_MODES.TEXT_TO_IMAGE ||
      mode === MEDIA_MODES.EDIT_IMAGE ||
      mode === 'text-to-image' ||
      (typeof mode === 'string' && mode.includes('image'))
    );

    if (isVideo) {
      const videoBtn = queryButtonByIcon(LIGATURES.VIDEOCAM, popover) ||
        queryButtonByIcon('videocam', popover) ||
        queryByText('mat-button-toggle button', 'Video', popover) ||
        queryByTextContains('mat-button-toggle button', 'Video', popover) ||
        query('mat-button-toggle:has(mat-icon:has-text("videocam")) button', popover) ||
        query('mat-button-toggle-group:first-of-type mat-button-toggle:nth-of-type(2) button', popover) ||
        query('mat-button-toggle-group mat-button-toggle:nth-of-type(2) button', popover);
      if (videoBtn && !this.isToggleChecked(videoBtn)) {
        simulateClick(videoBtn);
        const parentToggle = videoBtn.closest('mat-button-toggle');
        if (parentToggle && !this.isToggleChecked(videoBtn)) {
          simulateClick(parentToggle);
        }
        await sleep(400);
      }
    } else if (isImage) {
      const imageBtn = queryButtonByIcon(LIGATURES.IMAGE, popover) ||
        queryButtonByIcon('photo', popover) ||
        queryByText('mat-button-toggle button', 'Image', popover) ||
        queryByTextContains('mat-button-toggle button', 'Image', popover) ||
        query('mat-button-toggle:has(mat-icon:has-text("image")) button', popover) ||
        query('mat-button-toggle:has(mat-icon:has-text("photo")) button', popover) ||
        query('mat-button-toggle-group:first-of-type mat-button-toggle:first-of-type button', popover) ||
        query('mat-button-toggle-group mat-button-toggle:nth-of-type(1) button', popover);
      if (imageBtn && !this.isToggleChecked(imageBtn)) {
        simulateClick(imageBtn);
        const parentToggle = imageBtn.closest('mat-button-toggle');
        if (parentToggle && !this.isToggleChecked(imageBtn)) {
          simulateClick(parentToggle);
        }
        await sleep(400);
      }
    }

    // Sub-mode: Ingredients vs Frames (Video mode)
    if (mode === MEDIA_MODES.IMAGE_TO_VIDEO || subMode === 'ingredients') {
      const ingBtn = queryButtonByIcon('shopping_bag', popover) ||
        queryButtonByIcon('auto_awesome', popover) ||
        queryByText('mat-button-toggle button', 'Ingredients', popover) ||
        queryByTextContains('mat-button-toggle button', 'Ingredients', popover) ||
        query('mat-button-toggle-group:nth-of-type(2) mat-button-toggle:nth-of-type(2) button', popover);
      if (ingBtn && !this.isToggleChecked(ingBtn)) {
        simulateClick(ingBtn);
        await sleep(300);
      }
    } else if (subMode === 'frames' || mode === MEDIA_MODES.FRAMES_TO_VIDEO) {
      const framesBtn = queryButtonByIcon(LIGATURES.FRAMES, popover) ||
        queryByText('mat-button-toggle button', 'Frames', popover) ||
        queryByTextContains('mat-button-toggle button', 'Frames', popover) ||
        query('mat-button-toggle-group:nth-of-type(2) mat-button-toggle:nth-of-type(1) button', popover);
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
      targetBtn = queryByText(SELECTORS.BUTTON_TOGGLE, ratio, popover) ||
        queryByTextContains(SELECTORS.BUTTON_TOGGLE, ratio, popover);
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

    const durationBtn = queryByText(SELECTORS.BUTTON_TOGGLE, duration, popover) ||
      queryByTextContains(SELECTORS.BUTTON_TOGGLE, duration, popover);
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

    const num = Number(count) || 1;
    const token = `x${num}`;

    // Target button in popover by exact text or role="radio"
    let outputBtn = queryByText('mat-button-toggle button', token, popover) ||
      queryByText('button[role="radio"]', token, popover) ||
      queryByText(SELECTORS.BUTTON_TOGGLE, token, popover) ||
      queryByTextContains('mat-button-toggle button', token, popover);

    if (!outputBtn) {
      // Search through all mat-button-toggle elements in popover
      const allToggles = queryAll('mat-button-toggle', popover);
      for (const tog of allToggles) {
        const txt = (tog.textContent || '').trim();
        if (txt === token || txt.replace(/\s+/g, '') === token) {
          outputBtn = tog.querySelector('button') || tog;
          break;
        }
      }
    }

    if (outputBtn) {
      if (!this.isToggleChecked(outputBtn)) {
        simulateClick(outputBtn);
        await sleep(200);
        const parentToggle = outputBtn.closest('mat-button-toggle');
        if (parentToggle && !this.isToggleChecked(outputBtn)) {
          simulateClick(parentToggle);
        }
        await sleep(300);
      }
      logger.info(`[FlowSettingsService] Output multiplier set to ${token} (verified: ${this.isToggleChecked(outputBtn)})`);
    } else {
      logger.warn(`[FlowSettingsService] Output multiplier toggle for ${token} not found in popover`);
    }
  }

  /**
   * Main orchestrator: Applies all target configuration parameters.
   * Directly opens the popover, validates/applies all controls, and cleanly closes it.
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

    // Strict model normalization according to media mode:
    // Image modes (text-to-image, edit-image) strictly use image models (default: Nano Banana 2).
    // Video modes (text-to-video, image-to-video, frames-to-video) strictly use video models (default: Veo 3.1 - Lite).
    target.model = normalizeModelForMode(target.mode || MEDIA_MODES.TEXT_TO_VIDEO, target.model);

    logger.step('settings', `Configuring popover: ${target.mode || 'video'} | ${target.model || 'default'} | ratio: ${target.aspectRatio || '16:9'} | outputs: x${target.outputCount || 1}`);

    // Always open settings popover and inspect/apply controls directly
    const popover = await this.openSettingsPopover();

    try {
      // 2. Apply Media Mode (video / image) (includes 400ms pacing delay)
      if (target.mode) {
        await this.selectMediaMode(target.mode, target.subMode, popover);
      }

      // 3. Apply Model Family (includes 400ms trigger + 350ms selection pacing delay)
      if (target.model) {
        await this.selectModel(target.model, popover);
      }

      // 4. Apply Aspect Ratio (includes 300ms pacing delay)
      if (target.aspectRatio) {
        await this.selectAspectRatio(target.aspectRatio, popover);
      }

      // 5. Apply Duration (if applicable for Omni, includes 300ms pacing delay)
      if (target.duration && (!target.model || target.model === MODELS.OMNI_FLASH)) {
        await this.selectDuration(target.duration, popover);
      }

      // 6. Apply Output Multiplier (includes 300ms pacing delay)
      if (target.outputCount) {
        await this.selectOutputCount(target.outputCount, popover);
      }

      return { bypassed: false, applied: true };
    } finally {
      // 7. Always ensure popover is closed cleanly
      await this.closeSettingsPopover();
    }
  }
}

export const flowSettingsService = new FlowSettingsService();

