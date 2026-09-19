/**
 * FlowStorage.js — Persistent Storage & State Engine for RJ V-Flow Auto
 * 
 * Manages configuration, queue state, execution telemetry, and reactive event subscriptions.
 * Wraps chrome.storage.local with schema validation, debounced persistence, and auto-healing.
 */

export const STORAGE_KEY = 'rj_vflow_config_v3';

export const SCHEMA_VERSION = 3;

export const MEDIA_MODES = {
  TEXT_TO_VIDEO: 'text-to-video',
  TEXT_TO_IMAGE: 'text-to-image',
  IMAGE_TO_VIDEO: 'image-to-video',
  FRAMES_TO_VIDEO: 'frames-to-video',
  EDIT_IMAGE: 'edit-image'
};

export const VIDEO_MODELS = [
  'Omni 1.1 Flash',
  'Veo 3.1 - Fast',
  'Veo 3.1 - Lite',
  'Veo 3.1 - Quality'
];

export const IMAGE_MODELS = [
  'Nano Banana Pro',
  'Nano Banana 2',
  'Nano Banana 2 Lite'
];

export const MODELS = {
  OMNI_FLASH: 'Omni 1.1 Flash',
  VEO_FAST: 'Veo 3.1 - Fast',
  VEO_LITE: 'Veo 3.1 - Lite',
  VEO_QUALITY: 'Veo 3.1 - Quality',
  NANO_BANANA_PRO: 'Nano Banana Pro',
  NANO_BANANA_2: 'Nano Banana 2',
  NANO_BANANA_2_LITE: 'Nano Banana 2 Lite'
};

export const ASPECT_RATIOS = ['16:9', '9:16', '4:3', '1:1'];

export const VIDEO_DURATIONS = ['4s', '6s', '8s', '10s'];

export const VIDEO_RESOLUTIONS = ['720p', '1080p'];

export const IMAGE_RESOLUTIONS = ['1K', '2K', '4K'];

export const QUEUE_STATUS = {
  PENDING: 'pending',
  INJECTING: 'injecting',
  GENERATING: 'generating',
  DOWNLOADING: 'downloading',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

export const DEFAULT_CONFIG = {
  schemaVersion: SCHEMA_VERSION,
  mode: MEDIA_MODES.TEXT_TO_VIDEO,
  model: MODELS.OMNI_FLASH,
  aspectRatio: '16:9',
  duration: '6s',
  outputCount: 1,
  autoDownload: true,
  videoResolution: '1080p',
  imageResolution: '2K',
  settings: {
    cooldownMs: 2500,
    maxRetries: 3,
    autoConsentAgree: true,
    ensureAgentOff: true,
    overlayPosition: { x: 24, y: 24 },
    overlayMinimized: false
  },
  queue: [],
  activeBatch: {
    isRunning: false,
    isPaused: false,
    activeItemId: null,
    startedAt: null,
    totalCount: 0,
    completedCount: 0,
    failedCount: 0
  }
};

let cachedConfig = null;
let saveDebounceTimer = null;
const changeListeners = new Set();

/**
 * Deep clone utility.
 */
function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Migrates old or missing schema structures to Schema Version 3.
 */
function migrateSchema(raw) {
  if (!raw || typeof raw !== 'object') {
    return clone(DEFAULT_CONFIG);
  }

  const migrated = Object.assign(clone(DEFAULT_CONFIG), raw);
  migrated.schemaVersion = SCHEMA_VERSION;

  // Ensure nested structures are not undefined
  migrated.settings = Object.assign(clone(DEFAULT_CONFIG.settings), raw.settings || {});
  migrated.activeBatch = Object.assign(clone(DEFAULT_CONFIG.activeBatch), raw.activeBatch || {});
  if (!Array.isArray(migrated.queue)) {
    migrated.queue = [];
  }

  return migrated;
}

/**
 * Retrieves the stored configuration from chrome.storage.local.
 */
export async function getConfig() {
  if (cachedConfig) {
    return clone(cachedConfig);
  }

  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (res) => {
      const stored = res[STORAGE_KEY];
      cachedConfig = migrateSchema(stored);
      resolve(clone(cachedConfig));
    });
  });
}

/**
 * Sanitizes queue items for chrome.storage.local persistence.
 * Strips heavy dataUrl Base64 payloads if imageId reference is present,
 * safeguarding against the 5MB extension storage quota limit.
 */
export function sanitizeQueueForStorage(queue) {
  if (!Array.isArray(queue)) return [];

  return queue.map(item => {
    const cleanItem = { ...item };

    if (Array.isArray(cleanItem.ingredients)) {
      cleanItem.ingredients = cleanItem.ingredients.map(ing => {
        if (ing && typeof ing === 'object' && ing.imageId) {
          const { dataUrl, ...rest } = ing;
          return rest;
        }
        return ing;
      });
    }

    if (cleanItem.frames && typeof cleanItem.frames === 'object') {
      const cleanFrames = { ...cleanItem.frames };
      for (const slot of ['start', 'end']) {
        const frame = cleanFrames[slot];
        if (frame && typeof frame === 'object' && frame.imageId) {
          const { dataUrl, ...rest } = frame;
          cleanFrames[slot] = rest;
        }
      }
      cleanItem.frames = cleanFrames;
    }

    return cleanItem;
  });
}

/**
 * Persists updates to chrome.storage.local with 50ms debouncing.
 */
export function saveConfig(updates) {
  return new Promise((resolve, reject) => {
    if (!cachedConfig) {
      cachedConfig = clone(DEFAULT_CONFIG);
    }

    // Merge updates into cachedConfig
    if (updates.queue && Array.isArray(updates.queue)) {
      updates.queue = sanitizeQueueForStorage(updates.queue);
    }

    Object.assign(cachedConfig, updates);
    if (updates.settings) {
      cachedConfig.settings = Object.assign(cachedConfig.settings || {}, updates.settings);
    }
    if (updates.activeBatch) {
      cachedConfig.activeBatch = Object.assign(cachedConfig.activeBatch || {}, updates.activeBatch);
    }

    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = setTimeout(() => {
      const dataToSave = clone(cachedConfig);
      chrome.storage.local.set({ [STORAGE_KEY]: dataToSave }, () => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }
        resolve(dataToSave);
      });
    }, 50);
  });
}

/**
 * Resets configuration back to defaults.
 */
export async function resetConfig() {
  cachedConfig = clone(DEFAULT_CONFIG);
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [STORAGE_KEY]: cachedConfig }, () => {
      if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
      resolve(clone(cachedConfig));
    });
  });
}

/**
 * Returns current queue items.
 */
export async function getQueue() {
  const cfg = await getConfig();
  return cfg.queue || [];
}

/**
 * Overwrites current queue with new array of items.
 */
export async function saveQueue(queue) {
  const sanitized = sanitizeQueueForStorage(Array.isArray(queue) ? queue : []);
  return saveConfig({ queue: sanitized });
}

/**
 * Adds a single item to the queue.
 */
export async function enqueueItem(item) {
  const queue = await getQueue();
  const newItem = Object.assign({
    id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    prompt: '',
    mode: MEDIA_MODES.TEXT_TO_VIDEO,
    model: MODELS.OMNI_FLASH,
    aspectRatio: '16:9',
    duration: '6s',
    outputs: 1,
    resolution: '1080p',
    ingredients: [],
    frames: { start: null, end: null },
    status: QUEUE_STATUS.PENDING,
    error: null,
    createdAt: Date.now(),
    completedAt: null
  }, item);

  queue.push(newItem);
  await saveQueue(queue);
  return newItem;
}

/**
 * Adds multiple items to the queue in one operation.
 */
export async function enqueueBatch(items) {
  const queue = await getQueue();
  const created = items.map((item, idx) => Object.assign({
    id: `q_${Date.now() + idx}_${Math.random().toString(36).substring(2, 7)}`,
    prompt: '',
    mode: MEDIA_MODES.TEXT_TO_VIDEO,
    model: MODELS.OMNI_FLASH,
    aspectRatio: '16:9',
    duration: '6s',
    outputs: 1,
    resolution: '1080p',
    ingredients: [],
    frames: { start: null, end: null },
    status: QUEUE_STATUS.PENDING,
    error: null,
    createdAt: Date.now() + idx,
    completedAt: null
  }, item));

  queue.push(...created);
  await saveQueue(queue);
  return created;
}

/**
 * Updates specific properties of a queue item.
 */
export async function updateQueueItem(itemId, partialUpdate) {
  const queue = await getQueue();
  const index = queue.findIndex(it => it.id === itemId);
  if (index === -1) return null;

  queue[index] = Object.assign(queue[index], partialUpdate);
  await saveQueue(queue);
  return queue[index];
}

/**
 * Removes a specific item from the queue by ID.
 */
export async function removeQueueItem(itemId) {
  const queue = await getQueue();
  const filtered = queue.filter(it => it.id !== itemId);
  await saveQueue(filtered);
  return filtered;
}

/**
 * Clears completed and failed items from the queue.
 */
export async function clearCompletedQueue() {
  const queue = await getQueue();
  const pendingOnly = queue.filter(it => it.status !== QUEUE_STATUS.COMPLETED && it.status !== QUEUE_STATUS.FAILED);
  await saveQueue(pendingOnly);
  return pendingOnly;
}

/**
 * Clears entire queue.
 */
export async function clearAllQueue() {
  return saveQueue([]);
}

/**
 * Registers a callback for reactive changes.
 */
export function onChanged(callback) {
  if (typeof callback === 'function') {
    changeListeners.add(callback);
  }
}

/**
 * Removes a previously registered change callback.
 */
export function removeOnChanged(callback) {
  changeListeners.delete(callback);
}

// Internal chrome.storage listener to keep cachedConfig synchronized
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes[STORAGE_KEY]) {
      const newValue = changes[STORAGE_KEY].newValue;
      cachedConfig = migrateSchema(newValue);
      for (const listener of changeListeners) {
        try {
          listener(clone(cachedConfig));
        } catch (e) {
          console.error('[FlowStorage] Listener error', e);
        }
      }
    }
  });
}
