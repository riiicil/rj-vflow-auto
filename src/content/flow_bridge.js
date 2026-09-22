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
  const RPC_UPSCALE_IMAGE = 'SPrCad';
  const RPC_MEDIA = 'as29s';
  const RPC_UPLOAD_IMAGE = 'maseQ';

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
   * Extracts all generated image CDN URLs and media IDs from batchexecute response.
   * Recursively unpacks inner JSON payloads and uses global regex /g sweep
   * to guarantee capturing all variant images (x1, x2, x3, x4).
   */
  function parseImagesFromBatchResponse(text) {
    const images = [];
    const seen = new Set();

    if (!text || typeof text !== 'string') return images;

    function addImageCandidate(rawUrl, candidateMediaId) {
      if (!rawUrl && !candidateMediaId) return;
      let cleanUrl = String(rawUrl || '').replace(/\\"/g, '').replace(/\\\//g, '/').trim();
      let mediaId = candidateMediaId;

      if (!mediaId && cleanUrl.includes('/image/')) {
        const idMatch = cleanUrl.match(/\/image\/([a-zA-Z0-9_-]{36}|[a-zA-Z0-9_-]+)/);
        if (idMatch) mediaId = idMatch[1];
      }

      if (mediaId && !seen.has(mediaId)) {
        seen.add(mediaId);
        if (cleanUrl && !cleanUrl.startsWith('http')) {
          cleanUrl = `https://flow-content.google${cleanUrl.startsWith('/') ? '' : '/'}${cleanUrl}`;
        }
        images.push({
          mediaId,
          url: cleanUrl || `https://flow-content.google/image/${mediaId}`
        });
      }
    }

    // 1. Structured batchexecute chunk walk with recursive JSON unpacking
    try {
      const body = text.startsWith(")]}'") ? text.slice(text.indexOf('\n') + 1) : text;
      let index = 0;
      while (index < body.length) {
        const start = body.indexOf('[', index);
        if (start === -1) break;

        const nextNewline = body.indexOf('\n', start);
        const candidateSlice = nextNewline !== -1 ? body.slice(start, nextNewline).trim() : body.slice(start).trim();

        try {
          const parsed = JSON.parse(candidateSlice);
          index = start + Math.max(1, candidateSlice.length);

          if (Array.isArray(parsed)) {
            for (const entry of parsed) {
              if (Array.isArray(entry) && entry[0] === 'wrb.fr' && entry[1] === RPC_GEN_IMAGE) {
                const payloadRaw = entry[2];
                let payloadObj = null;
                try {
                  payloadObj = typeof payloadRaw === 'string' ? JSON.parse(payloadRaw) : payloadRaw;
                } catch (_) {}

                if (payloadObj) {
                  function deepWalk(node) {
                    if (!node) return;
                    if (typeof node === 'string') {
                      if (node.includes('/image/')) {
                        addImageCandidate(node);
                      }
                    } else if (Array.isArray(node)) {
                      for (const item of node) deepWalk(item);
                    } else if (typeof node === 'object') {
                      for (const val of Object.values(node)) deepWalk(val);
                    }
                  }
                  deepWalk(payloadObj);
                }
              }
            }
          }
        } catch (_) {
          index = start + 1;
        }
      }
    } catch (walkErr) {
      logger.warn('Structured chunk walk notice:', walkErr);
    }

    // 2. Global Regex sweep across the entire response text with /g flag to find any remaining variants
    const globalRegex = /(?:https?:\\?\/\\?\/[a-zA-Z0-9_.-]*flow-content\.google)?\\?\/image\\?\/([a-zA-Z0-9_-]{36}|[a-zA-Z0-9_-]+)(?:[^"'\s,\}\]]*)/g;
    let m;
    while ((m = globalRegex.exec(text)) !== null) {
      const mediaId = m[1];
      const matchedUrl = m[0];
      addImageCandidate(matchedUrl, mediaId);
    }

    return images;
  }

  /**
   * Executes FlowService.UpsampleImage (RPC SPrCad) to upscale a media asset to 2K or 4K.
   * Returns a self-contained data:image/jpeg;base64,... URL directly from Google's response.
   */
  async function handleUpscaleImage(params) {
    const { mediaId, resolution = '2K', projectId = getProjectId() } = params || {};
    if (!mediaId) {
      throw new Error('[FlowBridge] mediaId is required for image upscale');
    }

    const code = (String(resolution).toUpperCase() === '4K') ? 2 : 1;
    logger.info(`Requesting ${resolution} upscale for image: ${mediaId} (RPC SPrCad, code: ${code})...`);

    let captchaToken = null;
    try {
      captchaToken = await mintCaptcha('IMAGE_GENERATION');
    } catch (_) {}

    const contextEnvelope = [
      null,
      SURFACE_ID,
      null,
      null,
      null,
      projectId || null,
      null,
      null,
      null,
      null,
      captchaToken ? [captchaToken, 1] : null
    ];

    const innerPayload = [
      mediaId,
      code,
      contextEnvelope
    ];

    const responseText = await executeBatchRpc(RPC_UPSCALE_IMAGE, innerPayload);

    let base64 = null;
    let rpcError = null;

    const marker = '"SPrCad"';
    const markerIdx = responseText.indexOf(marker);

    if (markerIdx !== -1) {
      const afterMarker = responseText.slice(markerIdx + marker.length);
      const commaIdx = afterMarker.indexOf(',');
      if (commaIdx !== -1) {
        const payloadSection = afterMarker.slice(commaIdx + 1).trimStart();
        if (payloadSection.startsWith('null')) {
          rpcError = `${resolution} upscale returned null payload (tier may be locked or quota exceeded on this account)`;
        } else if (payloadSection.startsWith('"')) {
          let strEnd = -1;
          for (let i = 1; i < payloadSection.length; i++) {
            if (payloadSection[i] === '"' && payloadSection[i - 1] !== '\\') {
              strEnd = i;
              break;
            }
          }
          if (strEnd !== -1) {
            try {
              const rawJsonStr = JSON.parse(payloadSection.slice(0, strEnd + 1));
              const inner = typeof rawJsonStr === 'string' ? JSON.parse(rawJsonStr) : rawJsonStr;
              if (Array.isArray(inner) && inner.length > 1 && typeof inner[1] === 'string' && inner[1].length > 100) {
                base64 = inner[1];
              }
            } catch (err) {
              logger.warn('Failed parsing inner SPrCad string payload:', err);
            }
          }
        }
      }
    }

    if (!base64 && !rpcError) {
      const b64Match = responseText.match(/"([A-Za-z0-9+/=]{1000,})"/);
      if (b64Match) {
        base64 = b64Match[1];
      }
    }

    if (rpcError) {
      throw new Error(`[FlowBridge] ${rpcError}`);
    }

    if (!base64) {
      throw new Error(`[FlowBridge] SPrCad upscale response carried no encoded image for mediaId: ${mediaId}`);
    }

    const mime = 'image/jpeg';
    const dataUrl = `data:${mime};base64,${base64}`;
    logger.success(`Upscaled image ${mediaId} to ${resolution} successfully (${Math.round(base64.length / 1024)} KB)`);

    return {
      success: true,
      mediaId,
      resolution,
      dataUrl
    };
  }

  /**
   * Fetches the authentic image binary in the MAIN world.
   * Converts the binary to a self-contained Base64 Data URL.
   * Uses mode: 'cors' without credentials: 'include' to respect wildcard '*' CORS headers.
   */
  async function handleFetchImageDataUrl(params) {
    const { url, mediaId } = params || {};
    let targetUrl = url;

    if (!targetUrl && mediaId) {
      targetUrl = `https://flow-content.google/image/${mediaId}`;
    }

    if (!targetUrl) {
      throw new Error('[FlowBridge] URL or mediaId required to fetch image data');
    }

    logger.info(`Fetching image binary for ${mediaId || targetUrl}...`);

    let blob = null;
    try {
      const res = await fetch(targetUrl, {
        mode: 'cors',
        headers: { 'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8' }
      });
      if (res.ok) {
        blob = await res.blob();
      }
    } catch (fetchErr) {
      logger.warn('Direct fetch notice:', fetchErr);
    }

    if (!blob || blob.type.includes('xml') || blob.size < 500) {
      if (mediaId) {
        try {
          logger.info(`Querying as29s RPC for signed CDN URL of ${mediaId}...`);
          const as29sResp = await executeBatchRpc(RPC_MEDIA, [mediaId]);
          const matchCdn = as29sResp.match(/https?:\/\/[a-zA-Z0-9_.-]*(?:googleusercontent|flow-content)[^\s"'\\]+/);
          if (matchCdn) {
            const cdnUrl = matchCdn[0].replace(/\\"/g, '').replace(/\\\//g, '/');
            logger.info(`Resolved CDN URL via as29s: ${cdnUrl.slice(0, 60)}...`);
            const cdnRes = await fetch(cdnUrl, { mode: 'cors' });
            if (cdnRes.ok) {
              const cdnBlob = await cdnRes.blob();
              if (cdnBlob.size > 500 && !cdnBlob.type.includes('xml')) {
                blob = cdnBlob;
              }
            }
          }
        } catch (asErr) {
          logger.warn('as29s resolution notice:', asErr);
        }
      }
    }

    if (!blob || blob.size < 500 || blob.type.includes('xml')) {
      throw new Error(`Failed to retrieve authentic image data for ${mediaId || targetUrl}`);
    }

    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    return {
      success: true,
      mediaId,
      dataUrl,
      sizeBytes: blob.size,
      mimeType: blob.type
    };
  }

  /**
   * Uploads reference image binary via RPC maseQ (FlowService.UploadImage) in the MAIN world.
   * Enables 100% background reference ingestion for Edit-Image mode without touching page DOM.
   */
  async function handleUploadImage(params) {
    const { base64, mimeType = 'image/jpeg', fileName = 'upload.jpg', projectId = getProjectId() } = params || {};
    if (!base64) {
      throw new Error('[FlowBridge] Base64 image data required for upload');
    }
    if (!projectId) {
      throw new Error('[FlowBridge] ProjectId required for reference upload');
    }

    logger.info(`Uploading reference image (${Math.round(base64.length / 1024)} KB) via maseQ RPC...`);

    const cleanB64 = base64.includes(',') ? base64.split(',')[1] : base64;
    const captchaToken = await mintCaptcha('IMAGE_GENERATION');

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

    const innerPayload = [
      contextEnvelope,
      cleanB64,
      mimeType,
      1,
      null,
      null,
      null,
      null,
      fileName,
      null,
      clientUuid(),
      clientUuid()
    ];

    const responseText = await executeBatchRpc(RPC_UPLOAD_IMAGE, innerPayload);

    let mediaId = null;
    try {
      const match = responseText.match(/\["wrb\.fr","maseQ","(\[\[[\s\S]*?\]\])"/);
      if (match) {
        const inner = JSON.parse(JSON.parse(`"${match[1]}"`));
        if (Array.isArray(inner) && Array.isArray(inner[0]) && inner[0][0]) {
          mediaId = inner[0][0];
        }
      }
    } catch (_) {}

    if (!mediaId) {
      const uuidMatch = responseText.match(/\[\\?"([0-9a-fA-F-]{36})\\?"/);
      if (uuidMatch) {
        mediaId = uuidMatch[1];
      }
    }

    if (!mediaId) {
      throw new Error('[FlowBridge] Failed to extract mediaId from maseQ upload response');
    }

    logger.success(`Reference image uploaded successfully, mediaId: ${mediaId}`);
    return {
      success: true,
      mediaId
    };
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

    // Auto-clear UI prompt box if needed
    clearPromptUI();

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
      } else if (action === 'UPSCALE_IMAGE') {
        result = await handleUpscaleImage(payload || {});
      } else if (action === 'FETCH_IMAGE_DATA') {
        result = await handleFetchImageDataUrl(payload || {});
      } else if (action === 'UPLOAD_IMAGE') {
        result = await handleUploadImage(payload || {});
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
