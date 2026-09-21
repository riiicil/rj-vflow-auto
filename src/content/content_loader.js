/**
 * content_loader.js — Manifest V3 Content Script Module Bootstrap
 * 
 * Target Platform: flow.google.com
 * Injects the primary ES module content script (content_main.js)
 * into Chromium's isolated world using dynamic import().
 * 
 * Adheres to ADR-001 (Vanilla ES Modules).
 */

(async function bootstrapContentScript() {
  try {
    const scriptUrl = chrome.runtime.getURL('content/content_main.js');
    await import(scriptUrl);
  } catch (err) {
    console.error('[RJ V-Flow Auto] Failed to bootstrap content script module:', err);
  }
})();
