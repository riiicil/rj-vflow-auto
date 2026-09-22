/**
 * FlowBridgeClient.js — Content-Script Client for MAIN-World Flow Bridge
 * 
 * Bridges the isolated extension content script and the page's MAIN execution world.
 * Dispatches RPC and captcha minting requests across the DOM boundary via CustomEvent.
 * 
 * Adheres to AGENTS.md (Zero-CDP Protocol, Zero Native Emoji).
 */

import { logger } from './LoggerService.js';

class FlowBridgeClient {
  constructor() {
    this._reqCounter = 0;
    this._initialized = false;
    this._ensureInjected();
  }

  /**
   * Ensures the MAIN world flow_bridge.js script tag is injected into the DOM.
   */
  _ensureInjected() {
    if (typeof document === 'undefined') return;

    const existing = document.querySelector('script[data-rj-flow-bridge]');
    if (existing) {
      this._initialized = true;
      return;
    }

    try {
      const script = document.createElement('script');
      script.setAttribute('data-rj-flow-bridge', 'true');
      script.src = chrome.runtime.getURL('content/flow_bridge.js');
      script.async = false;
      (document.head || document.documentElement).appendChild(script);
      this._initialized = true;
      logger.info('[FlowBridgeClient] Injected flow_bridge.js into page document.');
    } catch (err) {
      logger.error('[FlowBridgeClient] Failed to inject flow_bridge.js:', err);
    }
  }

  /**
   * Dispatches an RPC action to the MAIN world bridge and awaits response.
   */
  async request(action, payload = {}, timeoutMs = 45000) {
    this._ensureInjected();

    const requestId = `rj_req_${Date.now()}_${++this._reqCounter}`;

    return new Promise((resolve, reject) => {
      let timeoutId;

      const onResponse = (detail) => {
        if (!detail || detail.requestId !== requestId) return;

        window.removeEventListener('RJ_FLOW_RPC_RESPONSE', customEventHandler);
        window.removeEventListener('message', messageHandler);
        clearTimeout(timeoutId);

        if (detail.success) {
          resolve(detail.result);
        } else {
          reject(new Error(detail.error || '[FlowBridgeClient] RPC execution failed'));
        }
      };

      const customEventHandler = (evt) => onResponse(evt.detail);
      const messageHandler = (evt) => {
        if (evt.data && evt.data.type === 'RJ_FLOW_RPC_RESPONSE') {
          onResponse(evt.data.detail);
        }
      };

      window.addEventListener('RJ_FLOW_RPC_RESPONSE', customEventHandler);
      window.addEventListener('message', messageHandler);

      timeoutId = setTimeout(() => {
        window.removeEventListener('RJ_FLOW_RPC_RESPONSE', customEventHandler);
        window.removeEventListener('message', messageHandler);
        reject(new Error(`[FlowBridgeClient] RPC request ${action} timed out (${timeoutMs}ms)`));
      }, timeoutMs);

      // Dispatch via both CustomEvent and postMessage for maximum environment compatibility
      try {
        window.dispatchEvent(new CustomEvent('RJ_FLOW_RPC_REQUEST', {
          detail: { requestId, action, payload }
        }));
      } catch (_) {}

      try {
        window.postMessage({
          type: 'RJ_FLOW_RPC_REQUEST',
          detail: { requestId, action, payload }
        }, '*');
      } catch (_) {}
    });
  }

  /**
   * Triggers an Image Generation RPC (ogiZ0b) with reCAPTCHA Enterprise token minted in MAIN world.
   */
  async generateImage(params) {
    logger.info('[FlowBridgeClient] Dispatching GENERATE_IMAGE via MAIN world bridge:', {
      model: params.model,
      aspectRatio: params.aspectRatio,
      count: params.count
    });

    return await this.request('GENERATE_IMAGE', params);
  }

  /**
   * Triggers generation directly in the MAIN world with a pre-minted clean reCAPTCHA token.
   * Feeds Angular's native UI code with a genuine token and initiates generation with full DOM UI sync.
   */
  async triggerGenerateWithCaptcha() {
    logger.info('[FlowBridgeClient] Dispatching TRIGGER_GENERATE_WITH_CAPTCHA via MAIN world bridge');
    return await this.request('TRIGGER_GENERATE_WITH_CAPTCHA', {});
  }

  /**
   * Pre-arms the MAIN-world bridge with a fresh reCAPTCHA Enterprise token for the given action.
   * When Angular's native generation click executes, the hook instantly supplies this clean token.
   */
  async armCaptchaToken(pageAction = 'IMAGE_GENERATION') {
    logger.info(`[FlowBridgeClient] Pre-arming reCAPTCHA Enterprise token for action: ${pageAction}`);
    return await this.request('ARM_CAPTCHA', { pageAction });
  }

  /**
   * Mints a reCAPTCHA Enterprise token in the MAIN world for a given action.
   */
  async mintCaptcha(pageAction = 'IMAGE_GENERATION') {
    const res = await this.request('MINT_CAPTCHA', { pageAction });
    return res?.token;
  }

  /**
   * Invokes FlowService.UpsampleImage (SPrCad) in the MAIN world to upscale an image to 2K/4K.
   */
  async upscaleImage(params) {
    logger.info(`[FlowBridgeClient] Dispatching UPSCALE_IMAGE via MAIN world bridge for ${params.mediaId} (${params.resolution || '2K'})`);
    return await this.request('UPSCALE_IMAGE', params, 60000);
  }

  /**
   * Fetches authentic image binary in MAIN world with active session cookies and returns Base64 Data URL.
   */
  async fetchImageDataUrl(params) {
    logger.info(`[FlowBridgeClient] Dispatching FETCH_IMAGE_DATA via MAIN world bridge for ${params.mediaId || params.url}`);
    return await this.request('FETCH_IMAGE_DATA', params, 30000);
  }
}

export const flowBridgeClient = new FlowBridgeClient();
