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
    // 1. Inject MAIN-world bridge script for direct reCAPTCHA and RPC execution
    const bridge = document.createElement('script');
    bridge.setAttribute('data-rj-flow-bridge', 'true');
    bridge.src = chrome.runtime.getURL('content/flow_bridge.js');
    bridge.async = false;
    (document.head || document.documentElement).appendChild(bridge);

    // 2. Bootstrap primary isolated content script module
    const scriptUrl = chrome.runtime.getURL('content/content_main.js');
    await import(scriptUrl);
  } catch (err) {
    console.error('[RJ V-Flow Auto] Failed to bootstrap content script module:', err);
  }
})();
