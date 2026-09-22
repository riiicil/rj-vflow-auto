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
 * - Unified logging consistent with LoggerService.
 * 
 * Adheres to AGENTS.md (Zero-CDP Protocol, Zero Native Emoji).
 */

(function initRJFlowBridge() {
  if (window.__RJ_FLOW_BRIDGE_READY__) {
    return;
  }

  // Unified logger matching LoggerService brand tokens
  const logger = {
    prefix: '[RJ V-Flow Auto]',
    colors: {
      brand: '#57c1ff',
      step: '#079183',
      success: '#59d499',
      warn: '#e5a93c',
      error: '#ff5555'
    },
    info(msg, ...args) {
      console.log(`%c${this.prefix} [FlowBridge] ${msg}`, `color: ${this.colors.brand};`, ...args);
    },
    success(msg, ...args) {
      console.log(`%c${this.prefix} [FlowBridge] ${msg}`, `color: ${this.colors.success}; font-weight: bold;`, ...args);
    },
    warn(msg, ...args) {
      console.warn(`%c${this.prefix} [FlowBridge] ${msg}`, `color: ${this.colors.warn}; font-weight: bold;`, ...args);
    },
    error(msg, ...args) {
      console.error(`%c${this.prefix} [FlowBridge] ${msg}`, `color: ${this.colors.error}; font-weight: bold;`, ...args);
    }
  };

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
        const action = options?.action;
        if (action === 'IMAGE_GENERATION' || action === 'VIDEO_GENERATION') {
          logger.info(`reCAPTCHA execution requested for action: ${action}`);
        }

        // 1. Supply pre-minted clean token if armed
        if (preMintedToken && (action === 'IMAGE_GENERATION' || !action)) {
          logger.success('Supplying pre-minted clean reCAPTCHA Enterprise token to Google Flow!');
          const token = preMintedToken;
          preMintedToken = null;
          return token;
        }

        // 2. On-demand clean turn token minting for IMAGE_GENERATION if not pre-armed
        if (action === 'IMAGE_GENERATION' || !action) {
          logger.info('Minting on-demand clean reCAPTCHA Enterprise token in detached turn...');
          await new Promise(r => setTimeout(r, 20));
          try {
            const token = await originalGrecaptchaExecute.call(window.grecaptcha.enterprise, siteKey, options);
            logger.success('Supplied on-demand reCAPTCHA Enterprise token to Google Flow!');
            return token;
          } catch (err) {
            logger.warn('On-demand token minting warning (falling back):', err);
          }
        }

        return originalGrecaptchaExecute.apply(this, arguments);
      };
      window.grecaptcha.enterprise.__rj_hooked__ = true;
      logger.info('Successfully hooked grecaptcha.enterprise.execute in MAIN world.');
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
          return reject(new Error('reCAPTCHA Enterprise not ready within timeout'));
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
      throw new Error('Missing WIZ_global_data.SNlM0e (CSRF token)');
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
        'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'x-same-domain': '1'
      },
      body: `f.req=${encodeURIComponent(freqStr)}&at=${encodeURIComponent(at)}&`
    });

    if (!response.ok) {
      throw new Error(`Batch RPC HTTP ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();
    return text;
  }

  /**
   * Extracts generated image CDN URLs and media IDs from batchexecute response.
   */
  function parseImagesFromBatchResponse(text) {
    const images = [];
    const seen = new Set();

    if (!text || typeof text !== 'string') return images;

    function checkString(str) {
      if (typeof str !== 'string') return;
      if (str.includes('/image/')) {
        const match = str.match(/(?:https?:\/\/[^\s"'\\]+)?\/image\/([a-zA-Z0-9_-]+)[^\s"'\\]*/);
        if (match) {
          const mediaId = match[1];
          let fullUrl = match[0];
          if (!fullUrl.startsWith('http')) {
            fullUrl = `https://flow-content.google${fullUrl}`;
          }
          if (!seen.has(mediaId)) {
            seen.add(mediaId);
            images.push({ mediaId, url: fullUrl });
          }
        }
      }
    }

    function walk(node) {
      if (!node) return;
      if (typeof node === 'string') {
        checkString(node);
      } else if (Array.isArray(node)) {
        for (const item of node) walk(item);
      } else if (typeof node === 'object') {
        for (const val of Object.values(node)) walk(val);
      }
    }

    // 1. Structured chunk walk
    try {
      const body = text.startsWith(")]}'") ? text.slice(text.indexOf('\n') + 1) : text;
      const lines = body.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('[')) {
          try {
            const parsed = JSON.parse(trimmed);
            walk(parsed);
          } catch (_) {}
        }
      }
    } catch (_) {}

    // 2. Global regex scan fallback
    if (images.length === 0) {
      const regex = /https?:\/\/[a-zA-Z0-9_.-]*flow-content\.google\/image\/([a-zA-Z0-9_-]+)[^\s"'\\]*/g;
      let m;
      while ((m = regex.exec(text)) !== null) {
        const mediaId = m[1];
        if (!seen.has(mediaId)) {
          seen.add(mediaId);
          images.push({ mediaId, url: m[0] });
        }
      }
    }

    return images;
  }

  /**
   * Prepend synthetic tile cards to Google Flow's gallery DOM for immediate visual display.
   */
  function mountSyntheticGalleryTiles(images, prompt) {
    try {
      const container = document.querySelector('div.virtual-scroll-container, cdk-virtual-scroll-viewport .cdk-virtual-scroll-content-wrapper, cdk-virtual-scroll-viewport');
      if (!container) return;

      const row = document.createElement('div');
      row.className = 'tile-row rj-synthetic-batch';
      row.style.cssText = 'padding: 8px 0; margin-bottom: 12px; display: flex; flex-wrap: wrap; gap: 12px; z-index: 5; position: relative; width: 100%;';

      images.forEach((img) => {
        const card = document.createElement('div');
        card.className = 'flow-tile-container rj-synthetic-card';
        card.style.cssText = 'position: relative; border-radius: 12px; overflow: hidden; border: 1px solid #242728; background: #0d0d0d; width: 280px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);';
        card.innerHTML = `
          <div style="position: relative; width: 100%; aspect-ratio: 16/9; background: #141517; display: flex; align-items: center; justify-content: center; overflow: hidden;">
            <img class="thumbnail" src="${img.url}" alt="${prompt || 'Generated image'}" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
          </div>
          <div style="padding: 8px 12px; font-size: 11px; color: #8f969c; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #1a1c1e;">
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px;" title="${prompt}">${prompt || 'Image'}</span>
            <span style="color: #57c1ff; font-weight: 600; font-size: 10px;">READY</span>
          </div>
        `;
        row.appendChild(card);
      });

      container.insertBefore(row, container.firstChild);
      logger.success(`Mounted ${images.length} generated image tile(s) into gallery DOM`);
    } catch (err) {
      logger.warn('Synthetic card mount notice (non-fatal):', err);
    }
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
      throw new Error('Prompt cannot be empty');
    }
    if (!projectId) {
      throw new Error('Could not determine Flow projectId from URL');
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

    logger.info('Minting reCAPTCHA token for IMAGE_GENERATION...');
    const captchaToken = await mintCaptcha('IMAGE_GENERATION');
    if (!captchaToken) {
      throw new Error('Failed to mint reCAPTCHA token for IMAGE_GENERATION');
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

    logger.info(`Executing ogiZ0b RPC in MAIN world for model: ${wireModel} (count: ${safeCount})`);
    const responseText = await executeBatchRpc(RPC_GEN_IMAGE, innerPayload);

    // Parse generated images from response
    const images = parseImagesFromBatchResponse(responseText);
    logger.info(`Parsed ${images.length} image(s) from ogiZ0b response`);

    // Auto-clear UI prompt box so the user sees the prompt was submitted cleanly
    clearPromptUI();

    // Mount synthetic gallery tiles for visual feedback
    if (images.length > 0) {
      mountSyntheticGalleryTiles(images, prompt.trim());
    }

    return {
      success: true,
      rpcid: RPC_GEN_IMAGE,
      model: wireModel,
      count: safeCount,
      images,
      responseSummary: responseText.slice(0, 300)
    };
  }

  async function handleTriggerGenerateWithCaptcha(params = {}) {
    logger.info('Preparing clean reCAPTCHA token for generate trigger...');
    hookGrecaptcha();

    // 1. Mint token in clean microtask context (no synthetic click on stack)
    let token = null;
    try {
      token = await mintCaptcha('IMAGE_GENERATION');
      preMintedToken = token;
      logger.info(`Pre-minted clean reCAPTCHA token: ${token ? token.slice(0, 20) + '...' : 'null'}`);
    } catch (err) {
      logger.warn('Token pre-minting error (proceeding to click):', err);
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
      throw new Error('Generate button not found in page DOM');
    }

    const rect = btn.getBoundingClientRect();
    const clientX = Math.round(rect.left + rect.width / 2);
    const clientY = Math.round(rect.top + rect.height / 2);

    const commonOpts = {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
      clientX,
      clientY,
      screenX: (window.screenX || 0) + clientX,
      screenY: (window.screenY || 0) + clientY,
      button: 0
    };

    logger.info(`Dispatching native trigger on button at (${clientX}, ${clientY})`);

    try { btn.focus(); } catch (_) {}
    if (typeof PointerEvent === 'function') {
      btn.dispatchEvent(new PointerEvent('pointerover', commonOpts));
      btn.dispatchEvent(new PointerEvent('pointerenter', { ...commonOpts, bubbles: false }));
      btn.dispatchEvent(new PointerEvent('pointerdown', { ...commonOpts, buttons: 1, pressure: 0.5 }));
    }
    btn.dispatchEvent(new MouseEvent('mouseover', commonOpts));
    btn.dispatchEvent(new MouseEvent('mouseenter', { ...commonOpts, bubbles: false }));
    btn.dispatchEvent(new MouseEvent('mousedown', { ...commonOpts, buttons: 1 }));

    await new Promise(r => setTimeout(r, 90));

    if (typeof PointerEvent === 'function') {
      btn.dispatchEvent(new PointerEvent('pointerup', { ...commonOpts, buttons: 0, pressure: 0 }));
    }
    btn.dispatchEvent(new MouseEvent('mouseup', { ...commonOpts, buttons: 0 }));
    btn.dispatchEvent(new MouseEvent('click', commonOpts));

    // 4. Secondary fallback: check if button is still enabled after 350ms
    await new Promise(r => setTimeout(r, 350));
    const isStillReady = !btn.hasAttribute('disabled') && !btn.classList.contains('mat-mdc-button-disabled');
    if (isStillReady) {
      logger.warn('Generate button still enabled, attempting native button.click() fallback');
      try { btn.click(); } catch (_) {}
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
      if (action === 'ARM_CAPTCHA') {
        const token = await mintCaptcha(payload?.pageAction || 'IMAGE_GENERATION');
        preMintedToken = token;
        logger.info(`Clean reCAPTCHA token armed (${token ? token.slice(0, 20) + '...' : 'null'})`);
        result = { armed: Boolean(token) };
      } else if (action === 'TRIGGER_GENERATE_WITH_CAPTCHA') {
        result = await handleTriggerGenerateWithCaptcha(payload || {});
      } else if (action === 'GENERATE_IMAGE') {
        result = await handleGenerateImage(payload || {});
      } else if (action === 'MINT_CAPTCHA') {
        const token = await mintCaptcha(payload?.pageAction || 'IMAGE_GENERATION');
        result = { token };
      } else {
        throw new Error(`Unsupported action: ${action}`);
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
  logger.info('Flow MAIN-world bridge loaded and ready.');
})();
