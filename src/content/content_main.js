/**
 * content_main.js — Google Flow Content Script Entrypoint
 * 
 * Target Platform: flow.google.com
 * Injects and manages the isolated Studio HUD Shadow DOM overlay.
 */

import { flowHUDHost } from '../overlay/FlowHUDHost.js';
import { logger } from '../services/LoggerService.js';

(async function initFlowAuto() {
  logger.info('Content script initialized on Google Flow.');

  try {
    // 1. Mount the Shadow DOM HUD Host
    await flowHUDHost.init();

    // 2. Listen for runtime messages from Popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'TOGGLE_HUD') {
        flowHUDHost.toggle();
        sendResponse({ success: true, isVisible: flowHUDHost.isVisible });
      }
      return true;
    });
  } catch (err) {
    console.error('[RJ V-Flow Auto] Content script startup failed', err);
  }
})();
