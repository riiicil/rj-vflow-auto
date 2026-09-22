/**
 * flow_bridge.js — MAIN World Bridge for Google Flow
 * 
 * Target Platform: flow.google.com
 * Context: Runs in the page's MAIN execution world (world: 'MAIN')
 * 
 * Capabilities:
 * - Direct access to window.grecaptcha.enterprise to mint fresh reCAPTCHA tokens.
 * - Direct access to window.WIZ_global_data (CSRF token SNlM0e, session FdrFJe, build bl).
 * - Direct execution of Flow's batchexecute RPCs (ogiZ0b for image generation).
 * - Complete elimination of synthetic DOM click failures and reCAPTCHA bot score drops.
 * 
 * Adheres to AGENTS.md (Zero-CDP Protocol, Zero Native Emoji).
 */

(function initRJFlowBridge() {
  if (window.__RJ_FLOW_BRIDGE_READY__) {
    return;
  }

  const SITE_KEY = '6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV';
  const SURFACE_ID = 22;
  const RPC_GEN_IMAGE = 'ogiZ0b';

  const ASPECT_MAP = {
    '1:1': 1,
    '9:16': 2,
    '16:9': 3,
    '3:4': 4,
    '4:3': 5,
    'IMAGE_ASPECT_RATIO_SQUARE': 1,
    'IMAGE_ASPECT_RATIO_PORTRAIT': 2,
    'IMAGE_ASPECT_RATIO_LANDSCAPE': 3,
    'IMAGE_ASPECT_RATIO_PORTRAIT_THREE_FOUR': 4,
    'IMAGE_ASPECT_RATIO_LANDSCAPE_FOUR_THREE': 5
  };

  const MODEL_MAP = {
    'Nano Banana Pro': 'GEM_PIX_2',
    'Nano Banana 2': 'NARWHAL',
    'Nano Banana 2 Lite': 'HARBOR_SEAL',
    'Nano Banana Lite': 'HARBOR_SEAL',
    'NANO_BANANA_PRO': 'GEM_PIX_2',
    'NANO_BANANA_2': 'NARWHAL',
    'NANO_BANANA_2_LITE': 'HARBOR_SEAL',
    'NANO_BANANA_LITE': 'HARBOR_SEAL',
    'GEM_PIX_2': 'GEM_PIX_2',
    'NARWHAL': 'NARWHAL',
    'HARBOR_SEAL': 'HARBOR_SEAL'
  };

  function clientUuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID().toUpperCase();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    }).toUpperCase();
  }

  let originalGrecaptchaExecute = null;
  let preMintedToken = null;

  function hookGrecaptcha() {
    if (window.grecaptcha?.enterprise?.execute) {
      if (window.grecaptcha.enterprise.__rj_hooked__) return true;

      originalGrecaptchaExecute = window.grecaptcha.enterprise.execute;
      window.grecaptcha.enterprise.execute = async function (siteKey, options) {
        console.log('[RJ FlowBridge] grecaptcha.enterprise.execute intercepted:', siteKey, options);
        if (preMintedToken && (options?.action === 'IMAGE_GENERATION' || !options?.action)) {
          console.log('[RJ FlowBridge] Supplying pre-minted clean reCAPTCHA token to Google Flow!');
          const token = preMintedToken;
          preMintedToken = null;
          return token;
        }
        return originalGrecaptchaExecute.apply(this, arguments);
      };
      window.grecaptcha.enterprise.__rj_hooked__ = true;
      console.log('[RJ FlowBridge] Successfully hooked grecaptcha.enterprise.execute');
      return true;
    }
    return false;
  }

  // Continuously ensure hook is attached as early as possible
  const hookPoll = setInterval(() => {
    if (hookGrecaptcha()) {
      clearInterval(hookPoll);
    }
  }, 150);

  function waitForGrecaptcha(timeout = 25000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        if (window.grecaptcha?.enterprise?.execute) {
          hookGrecaptcha();
          return resolve(window.grecaptcha.enterprise);
        }
        if (Date.now() - start > timeout) {
          return reject(new Error('[RJ FlowBridge] reCAPTCHA Enterprise not ready within timeout'));
        }
        setTimeout(check, 150);
      };
      check();
    });
  }

  let captchaLock = Promise.resolve();

  async function mintCaptcha(pageAction) {
    const prior = captchaLock.catch(() => {});
    let unlock;
    captchaLock = new Promise(res => { unlock = res; });
    await prior;

    try {
      await waitForGrecaptcha();
      hookGrecaptcha();
      const execFn = originalGrecaptchaExecute || window.grecaptcha.enterprise.execute;
      return await execFn.call(window.grecaptcha.enterprise, SITE_KEY, {
        action: pageAction
      });
    } finally {
      unlock();
    }
  }

  function getWizData() {
    const wiz = globalThis.WIZ_global_data || window.WIZ_global_data || {};
    const at = wiz.SNlM0e;
    const sid = wiz.FdrFJe;
    const bl = wiz.cfb2h;
    if (!at) {
      throw new Error('[RJ FlowBridge] Missing WIZ_global_data.SNlM0e (CSRF token)');
    }
    return { at, sid: sid || '', bl: bl || '' };
  }

  function getProjectId() {
    const match = location.pathname.match(/\/project\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }

  function getActiveIngredientMediaIds() {
    const chips = document.querySelectorAll('flow-image-ingredient-chip, flow-ingredient-bar .chip-container, .ingredient-chip');
    const ids = [];
    chips.forEach(chip => {
      const img = chip.querySelector('img');
      const src = img?.getAttribute('src') || '';
      const match = src.match(/\/image\/([a-zA-Z0-9_-]+)/);
      if (match) {
        ids.push(match[1]);
      }
    });
    return ids;
  }

  function clearPromptUI() {
    try {
      const clearBtn = document.querySelector('button.clear-button, button[aria-label="Clear prompt"]');
      if (clearBtn) {
        clearBtn.click();
      }
    } catch (_) {}
  }

  async function executeBatchRpc(rpcid, innerPayload) {
    const { at, sid, bl } = getWizData();
    const reqid = Math.floor(Math.random() * 900000) + 100000;
    const sourcePath = location.pathname || '/';
    const hl = (document.documentElement.lang || navigator.language || 'en').split('-')[0];

    const url =
      `/_/AiSandboxAngularFrontend/data/batchexecute?rpcids=${encodeURIComponent(rpcid)}` +
      `&source-path=${encodeURIComponent(sourcePath)}` +
      `&bl=${encodeURIComponent(bl)}&f.sid=${encodeURIComponent(sid)}` +
      `&hl=${encodeURIComponent(hl)}&_reqid=${reqid}&rt=c`;

    const freqStr = JSON.stringify([[[rpcid, JSON.stringify(innerPayload), null, 'generic']]]);

    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'content-type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body: `f.req=${encodeURIComponent(freqStr)}&at=${encodeURIComponent(at)}&`
    });

    if (!response.ok) {
      throw new Error(`[RJ FlowBridge] Batch RPC HTTP ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();
    return text;
  }

  async function handleGenerateImage(params) {
    const {
      prompt,
      projectId = getProjectId(),
      model = 'Nano Banana 2',
      aspectRatio = '16:9',
      count = 1,
      seed = null,
      refMediaIds = [],
      baseMediaId = null
    } = params;

    if (!prompt || !prompt.trim()) {
      throw new Error('[RJ FlowBridge] Prompt cannot be empty');
    }
    if (!projectId) {
      throw new Error('[RJ FlowBridge] Could not determine Flow projectId from URL');
    }

    const wireModel = MODEL_MAP[model] || 'NARWHAL';
    const wireAspect = ASPECT_MAP[aspectRatio] || 3; // default 16:9
    const safeCount = Math.max(1, Math.min(4, Number(count) || 1));

    // Resolve base media ID from active chips if edit-image mode
    let effectiveBaseId = baseMediaId;
    let effectiveRefIds = [...(refMediaIds || [])];

    if (!effectiveBaseId) {
      const activeIds = getActiveIngredientMediaIds();
      if (activeIds.length > 0) {
        effectiveBaseId = activeIds[0];
        if (activeIds.length > 1) {
          effectiveRefIds.push(...activeIds.slice(1));
        }
      }
    }

    console.log('[RJ FlowBridge] Minting reCAPTCHA token for IMAGE_GENERATION...');
    const captchaToken = await mintCaptcha('IMAGE_GENERATION');
    if (!captchaToken) {
      throw new Error('[RJ FlowBridge] Failed to mint reCAPTCHA token for IMAGE_GENERATION');
    }

    const contextEnvelope = [
      null,
      SURFACE_ID,
      null,
      null,
      null,
      projectId,
      null,
      null,
      null,
      null,
      [captchaToken, 1]
    ];

    const baseSeed = (typeof seed === 'number' && seed > 0) ? seed : Math.floor(Math.random() * 1e9);
    const items = [];

    for (let index = 0; index < safeCount; index++) {
      const imageInputs = [];
      if (effectiveBaseId) {
        imageInputs.push([effectiveBaseId, null, null, null, 2]); // BASE_IMAGE input type 2
      }
      if (Array.isArray(effectiveRefIds)) {
        for (const mid of effectiveRefIds) {
          if (mid && mid !== effectiveBaseId) {
            imageInputs.push([mid, null, null, null, 1]); // REFERENCE input type 1
          }
        }
      }

      items.push([
        null,
        null,
        imageInputs.length > 0 ? imageInputs : null,
        baseSeed + index * 9973,
        wireAspect,
        wireModel,
        null,
        contextEnvelope,
        [[[prompt.trim()]]],
        null,
        null,
        null,
        clientUuid(),
        clientUuid()
      ]);
    }

    const innerPayload = [
      null,
      items,
      1,
      contextEnvelope,
      [clientUuid()]
    ];

    console.log('[RJ FlowBridge] Executing ogiZ0b RPC in MAIN world for model:', wireModel);
    const responseText = await executeBatchRpc(RPC_GEN_IMAGE, innerPayload);

    // Auto-clear UI prompt box so the user sees the prompt was submitted cleanly
    clearPromptUI();

    return {
      success: true,
      rpcid: RPC_GEN_IMAGE,
      model: wireModel,
      count: safeCount,
      responseSummary: responseText.slice(0, 300)
    };
  }

  async function handleTriggerGenerateWithCaptcha(params = {}) {
    console.log('[RJ FlowBridge] Preparing clean reCAPTCHA token for generate trigger...');
    hookGrecaptcha();

    // 1. Mint token in clean microtask context (no synthetic click on stack)
    let token = null;
    try {
      token = await mintCaptcha('IMAGE_GENERATION');
      console.log('[RJ FlowBridge] Pre-minted clean reCAPTCHA token:', token ? (token.slice(0, 20) + '...') : 'null');
      preMintedToken = token;
    } catch (err) {
      console.warn('[RJ FlowBridge] Token pre-minting error (proceeding to click):', err);
    }

    // 2. Populate any hidden reCAPTCHA response textareas
    if (token) {
      const textareas = document.querySelectorAll('textarea[name="g-recaptcha-response"], textarea.g-recaptcha-response');
      textareas.forEach(ta => {
        try {
          ta.value = token;
          ta.dispatchEvent(new Event('input', { bubbles: true }));
          ta.dispatchEvent(new Event('change', { bubbles: true }));
        } catch (_) {}
      });
    }

    // 3. Locate the generate button in Google Flow DOM
    const btn = document.querySelector('flow-generate-icon-button button') ||
                document.querySelector('button.generate-icon-button') ||
                document.querySelector('button[aria-label="Start generation"]');

    if (!btn) {
      throw new Error('[RJ FlowBridge] Generate button not found in page DOM');
    }

    const icon = btn.querySelector('mat-icon') || btn;
    const rect = icon.getBoundingClientRect();
    const clientX = rect.left + rect.width / 2;
    const clientY = rect.top + rect.height / 2;

    const commonOpts = {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
      clientX,
      clientY
    };

    console.log('[RJ FlowBridge] Dispatching native trigger in MAIN world at', clientX, clientY);

    btn.focus();
    if (typeof PointerEvent === 'function') {
      icon.dispatchEvent(new PointerEvent('pointerdown', { ...commonOpts, buttons: 1, pressure: 0.5 }));
    }
    icon.dispatchEvent(new MouseEvent('mousedown', { ...commonOpts, buttons: 1 }));

    await new Promise(r => setTimeout(r, 60));

    if (typeof PointerEvent === 'function') {
      icon.dispatchEvent(new PointerEvent('pointerup', { ...commonOpts, buttons: 0, pressure: 0 }));
    }
    icon.dispatchEvent(new MouseEvent('mouseup', { ...commonOpts, buttons: 0 }));

    btn.click();

    // 4. Secondary fallback: check if button is still enabled after 350ms
    await new Promise(r => setTimeout(r, 350));
    const isStillReady = !btn.hasAttribute('disabled') && !btn.classList.contains('mat-mdc-button-disabled');
    if (isStillReady) {
      console.log('[RJ FlowBridge] Generate button still enabled, dispatching ProseMirror Enter fallback in MAIN world');
      const editor = document.querySelector('.ProseMirror[contenteditable="true"]');
      if (editor) {
        editor.focus();
        editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
        editor.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
      }
    }

    return {
      success: true,
      tokenSupplied: Boolean(token)
    };
  }

  // ─── Dual-Channel Event & PostMessage Dispatcher ──────────────────────────
  const handledRequestIds = new Set();

  async function handleBridgeRequest(detail) {
    const { requestId, action, payload } = detail || {};
    if (!requestId || !action) return;

    // Prevent duplicate processing from dual-channel dispatch
    if (handledRequestIds.has(requestId)) return;
    handledRequestIds.add(requestId);
    setTimeout(() => handledRequestIds.delete(requestId), 60000);

    try {
      let result;
      if (action === 'TRIGGER_GENERATE_WITH_CAPTCHA') {
        result = await handleTriggerGenerateWithCaptcha(payload || {});
      } else if (action === 'GENERATE_IMAGE') {
        result = await handleGenerateImage(payload || {});
      } else if (action === 'MINT_CAPTCHA') {
        const token = await mintCaptcha(payload?.pageAction || 'IMAGE_GENERATION');
        result = { token };
      } else {
        throw new Error(`[RJ FlowBridge] Unsupported action: ${action}`);
      }

      const responseDetail = { requestId, success: true, result };
      window.dispatchEvent(new CustomEvent('RJ_FLOW_RPC_RESPONSE', { detail: responseDetail }));
      window.postMessage({ type: 'RJ_FLOW_RPC_RESPONSE', detail: responseDetail }, '*');
    } catch (err) {
      const errorDetail = {
        requestId,
        success: false,
        error: err?.message || String(err)
      };
      window.dispatchEvent(new CustomEvent('RJ_FLOW_RPC_RESPONSE', { detail: errorDetail }));
      window.postMessage({ type: 'RJ_FLOW_RPC_RESPONSE', detail: errorDetail }, '*');
    }
  }

  window.addEventListener('RJ_FLOW_RPC_REQUEST', (evt) => {
    handleBridgeRequest(evt.detail);
  });

  window.addEventListener('message', (evt) => {
    if (evt.data && evt.data.type === 'RJ_FLOW_RPC_REQUEST') {
      handleBridgeRequest(evt.data.detail);
    }
  });

  window.__RJ_FLOW_BRIDGE_READY__ = true;
  console.log('[RJ V-Flow Auto] Flow MAIN-world bridge loaded and ready.');
})();
