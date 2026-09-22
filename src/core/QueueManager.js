/**
 * QueueManager.js — Master Batch Automation Orchestrator
 * 
 * State machine managing automated prompt execution lifecycle:
 * IDLE -> RUNNING -> STOPPED.
 * 
 * Orchestrates settings configuration, media ingestion, prompt submission,
 * generation monitoring, and asset downloading across all Phase 2 services.
 */

import {
  getConfig,
  saveConfig,
  getQueue,
  updateQueueItem,
  QUEUE_STATUS,
  normalizeModelForMode
} from './FlowStorage.js';

import { flowSettingsService } from '../services/FlowSettingsService.js';
import { flowIngredientService } from '../services/FlowIngredientService.js';
import { flowPromptService } from '../services/FlowPromptService.js';
import { flowWatcherService } from '../services/FlowWatcherService.js';
import { flowDownloadService } from '../services/FlowDownloadService.js';
import { logger } from '../services/LoggerService.js';
import { flowImageDB } from './FlowImageDB.js';

export const QUEUE_STATES = {
  IDLE: 'idle',
  RUNNING: 'running',
  STOPPING: 'stopping',
  STOPPED: 'stopped'
};

export class QueueManager {
  constructor() {
    this.state = QUEUE_STATES.IDLE;
    this.activeItemId = null;
    this.stateListeners = new Set();
    this.progressListeners = new Set();
    this.isLoopActive = false;
  }

  /**
   * Returns current state machine status.
   */
  getState() {
    return this.state;
  }

  /**
   * Sets internal state and notifies subscribers.
   */
  setState(newState) {
    if (this.state === newState) return;
    this.state = newState;
    this.notifyStateChange(newState);
  }

  /**
   * Registers callback for state changes.
   */
  onStateChange(callback) {
    if (typeof callback === 'function') {
      this.stateListeners.add(callback);
    }
  }

  /**
   * Removes state change callback.
   */
  removeStateChange(callback) {
    this.stateListeners.delete(callback);
  }

  /**
   * Registers callback for item progress updates.
   */
  onProgress(callback) {
    if (typeof callback === 'function') {
      this.progressListeners.add(callback);
    }
  }

  /**
   * Removes item progress callback.
   */
  removeProgress(callback) {
    this.progressListeners.delete(callback);
  }

  notifyStateChange(state) {
    for (const cb of this.stateListeners) {
      try { cb(state); } catch (e) { logger.error('[QueueManager] State listener error', e); }
    }
  }

  notifyProgress(payload) {
    for (const cb of this.progressListeners) {
      try { cb(payload); } catch (e) { logger.error('[QueueManager] Progress listener error', e); }
    }
  }

  /**
   * Starts or resumes queue processing.
   */
  async start() {
    if (this.state === QUEUE_STATES.RUNNING) return;

    logger.banner('Queue automation batch started');
    this.setState(QUEUE_STATES.RUNNING);
    await saveConfig({
      activeBatch: {
        isRunning: true,
        startedAt: Date.now()
      }
    });

    if (!this.isLoopActive) {
      this.runLoop().catch(err => {
        logger.error('Unexpected loop failure', err);
        this.setState(QUEUE_STATES.IDLE);
      });
    }
  }

  /**
   * Requests automation stop. Defaults to graceful stop if an item is actively processing,
   * allowing the current generation and asset download to complete before halting.
   * @param {boolean} [force=false]
   */
  async stop(force = false) {
    if (this.state !== QUEUE_STATES.RUNNING && this.state !== QUEUE_STATES.STOPPING) {
      this.setState(QUEUE_STATES.STOPPED);
      return;
    }

    if (this.state === QUEUE_STATES.STOPPING && !force) {
      return; // Already in graceful stopping process; ignore repeated clicks
    }

    if (force || !this.activeItemId) {
      logger.warn('Queue automation stopped immediately');
      this.setState(QUEUE_STATES.STOPPED);
      this.activeItemId = null;
      await saveConfig({
        activeBatch: {
          isRunning: false,
          activeItemId: null
        }
      });
      return;
    }

    // Graceful Stop: allow currently active item to finish generation and download
    logger.banner('Graceful stop requested: completing active item before stopping...');
    this.setState(QUEUE_STATES.STOPPING);
  }

  /**
   * Primary automation execution loop.
   */
  async runLoop() {
    this.isLoopActive = true;

    try {
      const queue = await getQueue();
      const pendingItems = queue.filter(it => it.status === QUEUE_STATUS.PENDING);

      if (!pendingItems || pendingItems.length === 0) {
        logger.info('No pending queue items found. Automation idle.');
        this.setState(QUEUE_STATES.IDLE);
        await saveConfig({
          activeBatch: { isRunning: false, activeItemId: null }
        });
        return;
      }

      const cfg = await getConfig();
      const paramMode = cfg.paramMode || 'batch';
      logger.info(`QueueManager loop initiated with ${pendingItems.length} pending item(s) in [${paramMode.toUpperCase()}] mode`);

      // 1. One-Time Page Setup Execution: Sidebar collapse, Grid layout, size S, auto-clear prompt, and agent mode suppression
      logger.step('one-time setup', 'Executing one-time page setup (collapse sidebar, grid layout, size S, auto-clear prompt)');
      try {
        await flowSettingsService.ensureSidebarCollapsed();
        await flowSettingsService.setupHeaderGridAndClearPrompt();
        await flowSettingsService.ensureAgentModeOff();
      } catch (setupErr) {
        logger.warn('[QueueManager] One-time page setup warning', setupErr);
      }

      // 2. Parameter Branching Orchestration:
      // If paramMode === 'batch': call applySettings(batchConfig) once before loop
      if (paramMode === 'batch') {
        const isVideo = cfg.mode !== 'text-to-image' && cfg.mode !== 'edit-image';
        logger.step('batch settings', `${cfg.mode || 'text-to-video'} | ${cfg.model || 'default'} | ratio: ${cfg.aspectRatio || '16:9'}`);
        await flowSettingsService.applySettings({
          mode: cfg.mode,
          model: cfg.model,
          aspectRatio: cfg.aspectRatio,
          duration: cfg.duration,
          outputCount: cfg.outputCount || 1
        });
      }

      while (this.state === QUEUE_STATES.RUNNING) {
        const currentQueue = await getQueue();
        const currentPending = currentQueue.filter(it => it.status === QUEUE_STATUS.PENDING);
        const nextItem = currentPending[0];

        if (!nextItem) {
          logger.success('All queue items processed. Automation idle.');
          // No more pending items, transition to IDLE
          this.setState(QUEUE_STATES.IDLE);
          await saveConfig({
            activeBatch: { isRunning: false, activeItemId: null }
          });
          break;
        }

        const totalItems = currentQueue.length;
        const currentIdx = currentQueue.findIndex(it => it.id === nextItem.id) + 1;
        logger.item(currentIdx, totalItems, nextItem.prompt);

        this.activeItemId = nextItem.id;
        await saveConfig({
          activeBatch: { activeItemId: nextItem.id }
        });

        // Pass active paramMode to processItem
        const currentCfg = await getConfig();
        const activeParamMode = currentCfg.paramMode || paramMode;
        await this.processItem(nextItem, activeParamMode);

        // Check if user requested graceful stop during processItem
        if (this.state === QUEUE_STATES.STOPPING || this.state === QUEUE_STATES.STOPPED) {
          logger.banner('Active item finished. Queue automation gracefully stopped.');
          this.setState(QUEUE_STATES.STOPPED);
          await saveConfig({
            activeBatch: { isRunning: false, activeItemId: null }
          });
          break;
        }

        // Cooldown between prompts
        const cooldownMs = (currentCfg.settings && currentCfg.settings.cooldownMs) || 2500;
        if (this.state === QUEUE_STATES.RUNNING && cooldownMs > 0) {
          logger.step('cooldown', `${cooldownMs}ms`);
          await new Promise(r => setTimeout(r, cooldownMs));
        }

        // Check again after cooldown
        if (this.state !== QUEUE_STATES.RUNNING) {
          if (this.state === QUEUE_STATES.STOPPING) {
            this.setState(QUEUE_STATES.STOPPED);
            await saveConfig({
              activeBatch: { isRunning: false, activeItemId: null }
            });
          }
          break;
        }
      }
    } finally {
      this.isLoopActive = false;
      this.activeItemId = null;
      if (this.state === QUEUE_STATES.STOPPING) {
        this.setState(QUEUE_STATES.STOPPED);
      }
    }
  }

  /**
   * Executes the complete generation lifecycle for an individual queue item.
   */
  async processItem(item, paramMode = 'batch') {
    const itemId = item.id;

    try {
      const cfg = await getConfig();

      // 1. Stage: INJECTING — Apply settings & parameters
      await updateQueueItem(itemId, { status: QUEUE_STATUS.INJECTING, error: null });
      this.notifyProgress({ itemId, status: QUEUE_STATUS.INJECTING, step: 'init', percent: 2 });

      const mode = item.mode || cfg.mode || 'text-to-video';
      const isVideo = mode !== 'text-to-image' && mode !== 'edit-image';
      const rawModel = item.model || cfg.model || (isVideo ? 'Veo 3.1 - Lite' : 'Nano Banana 2');
      const model = normalizeModelForMode(mode, rawModel);
      const aspectRatio = item.aspectRatio || cfg.aspectRatio || '16:9';
      const duration = item.duration || cfg.duration || '6s';
      const outputCount = Number(item.outputs || item.outputCount || cfg.outputCount || 1);

      // Parameter Branching:
      // If Single mode: read nextItem configuration and call applySettings(nextItem) on every iteration
      // If Batch mode: skip opening prompt settings popover; reuse pre-configured settings
      if (paramMode === 'single') {
        logger.step('parameters (single)', `${mode} | ${model} | ratio: ${aspectRatio} | outputs: x${outputCount}`);
        this.notifyProgress({ itemId, status: QUEUE_STATUS.INJECTING, step: 'parameters', percent: 5 });
        await flowSettingsService.applySettings({
          mode,
          model,
          aspectRatio,
          duration,
          outputCount
        });
      } else {
        logger.step('parameters (batch)', 'Batch mode active: utilizing pre-configured settings (skipping settings popover)');
      }

      // 2. Prepare Reference Ingredients / Frames
      if (item.ingredients && item.ingredients.length > 0) {
        logger.step('ingredients', `${item.ingredients.length} media file(s)`);
        this.notifyProgress({ itemId, status: QUEUE_STATUS.INJECTING, step: 'ingredients', percent: 8 });
        await flowIngredientService.clearIngredients();
        for (const ing of item.ingredients) {
          let mediaPayload = (ing && typeof ing === 'object' ? (ing.dataUrl || ing) : ing);
          let mediaName = (ing && typeof ing === 'object' ? ing.name : 'ingredient.png') || 'ingredient.png';
          if (ing && ing.imageId) {
            const dbRecord = await flowImageDB.getImage(ing.imageId);
            if (dbRecord && (dbRecord.blob || dbRecord.file)) {
              mediaPayload = dbRecord.blob || dbRecord.file;
              mediaName = dbRecord.name || mediaName;
            }
          }
          await flowIngredientService.injectMediaToFlow(mediaPayload, mediaName);
        }
        await new Promise(r => setTimeout(r, 600));
        this.notifyProgress({ itemId, status: QUEUE_STATUS.INJECTING, step: 'ingredients_ready', percent: 11 });
      } else if (item.frames && (item.frames.start || item.frames.end)) {
        logger.step('frames', 'Injecting start & end frames');
        this.notifyProgress({ itemId, status: QUEUE_STATUS.INJECTING, step: 'frames', percent: 8 });
        await flowIngredientService.clearIngredients();
        await new Promise(r => setTimeout(r, 400));

        let currentChipTarget = 0;
        if (item.frames.start) {
          let startPayload = (typeof item.frames.start === 'object' ? item.frames.start.dataUrl : item.frames.start) || item.frames.start;
          let startName = item.frames.start?.name || 'start_frame.png';
          if (item.frames.start?.imageId) {
            const dbRecord = await flowImageDB.getImage(item.frames.start.imageId);
            if (dbRecord && (dbRecord.blob || dbRecord.file)) {
              startPayload = dbRecord.blob || dbRecord.file;
              startName = dbRecord.name || startName;
            }
          }
          currentChipTarget++;
          await flowIngredientService.setFrameSlot('start', startPayload, startName, currentChipTarget);
          await new Promise(r => setTimeout(r, 500));
        }
        if (item.frames.end) {
          let endPayload = (typeof item.frames.end === 'object' ? item.frames.end.dataUrl : item.frames.end) || item.frames.end;
          let endName = item.frames.end?.name || 'end_frame.png';
          if (item.frames.end?.imageId) {
            const dbRecord = await flowImageDB.getImage(item.frames.end.imageId);
            if (dbRecord && (dbRecord.blob || dbRecord.file)) {
              endPayload = dbRecord.blob || dbRecord.file;
              endName = dbRecord.name || endName;
            }
          }
          currentChipTarget++;
          await flowIngredientService.setFrameSlot('end', endPayload, endName, currentChipTarget);
          await new Promise(r => setTimeout(r, 500));
        }
        await new Promise(r => setTimeout(r, 600));
        this.notifyProgress({ itemId, status: QUEUE_STATUS.INJECTING, step: 'frames_ready', percent: 11 });
      } else {
        // Pure text prompt: ensure no residual chips remain
        await flowIngredientService.clearIngredients();
      }

      // 3. Settling pause & capture baseline top tile before submission
      await new Promise(r => setTimeout(r, 450));
      const previousTopTile = flowWatcherService.getTopTileCard();

      // 4. Submit prompt via native ProseMirror injection / MAIN bridge
      logger.step('prompt injection', item.prompt);
      this.notifyProgress({ itemId, status: QUEUE_STATUS.INJECTING, step: 'prompt', percent: 13 });
      const submitResult = await flowPromptService.submitPrompt(item.prompt, {
        mode,
        model,
        aspectRatio,
        count: outputCount,
        seed: item.seed,
        refMediaIds: item.refMediaIds,
        baseMediaId: item.baseMediaId
      });
      this.notifyProgress({ itemId, status: QUEUE_STATUS.INJECTING, step: 'submitted', percent: 15 });

      const shouldDownload = item.autoDownload !== undefined ? item.autoDownload : cfg.autoDownload;

      if (submitResult?.isBridge) {
        // IMAGE GENERATION via Option C MAIN-world batch RPC
        await updateQueueItem(itemId, { status: QUEUE_STATUS.GENERATING });
        this.notifyProgress({ itemId, status: QUEUE_STATUS.GENERATING, step: 'resolving', percent: 50 });
        await new Promise(r => setTimeout(r, 400));
        this.notifyProgress({ itemId, status: QUEUE_STATUS.GENERATING, step: 'ready', percent: 85 });

        const images = submitResult.images || [];
        if (images.length === 0) {
          throw new Error('[QueueManager] Image generation returned no media (possible moderation or quota limit)');
        }

        logger.success(`[QueueManager] Option C bridge generated ${images.length} image(s) successfully!`);

        // Stage: DOWNLOADING
        if (shouldDownload && images.length > 0) {
          await updateQueueItem(itemId, { status: QUEUE_STATUS.DOWNLOADING });
          this.notifyProgress({
            itemId,
            status: QUEUE_STATUS.DOWNLOADING,
            percent: 85,
            downloadProgress: { current: 0, total: images.length }
          });

          const defaultRes = cfg.imageResolution || '2K';
          const targetRes = item.resolution || cfg.targetResolution || defaultRes;
          logger.step('download', `Downloading ${images.length} image(s) at ${targetRes}`);

          for (let i = 0; i < images.length; i++) {
            const img = images[i];
            const safePrompt = (item.prompt || 'image').slice(0, 30).replace(/[^a-zA-Z0-9_-]/g, '_');
            const filename = `rj_flow_${safePrompt}_${img.mediaId || Date.now()}_${i + 1}.jpg`;

            await flowDownloadService.downloadUrl(img.url, filename);

            const dlPercent = Math.min(99, Math.round(85 + ((i + 1) / images.length) * 14));
            this.notifyProgress({
              itemId,
              status: QUEUE_STATUS.DOWNLOADING,
              percent: dlPercent,
              downloadProgress: { current: i + 1, total: images.length }
            });

            if (i < images.length - 1) {
              await new Promise(r => setTimeout(r, 1000));
            }
          }
        }

        // Stage: COMPLETED
        await updateQueueItem(itemId, {
          status: QUEUE_STATUS.COMPLETED,
          completedAt: Date.now()
        });
        this.notifyProgress({ itemId, status: QUEUE_STATUS.COMPLETED, percent: 100 });
        logger.success(`Item ${itemId} generated & processed successfully!`);

      } else {
        // VIDEO GENERATION via native DOM trigger & FlowWatcherService
        await updateQueueItem(itemId, { status: QUEUE_STATUS.GENERATING });
        this.notifyProgress({ itemId, status: QUEUE_STATUS.GENERATING, step: 'spawning', percent: 18 });
        const expectedOutputCount = Number(item.outputs || item.outputCount || cfg.outputCount || 1);
        const watchResult = await flowWatcherService.waitForGeneration(
          previousTopTile,
          expectedOutputCount,
          (progress) => {
            const live = progress.percent || 0;
            const mappedPercent = Math.max(18, Math.min(85, Math.round(15 + (live / 100) * 70)));
            this.notifyProgress({
              itemId,
              status: QUEUE_STATUS.GENERATING,
              percent: mappedPercent,
              livePercent: live,
              progress
            });
          },
          180000,
          item.prompt
        );

        // Stage: DOWNLOADING for Video
        if (watchResult.success && shouldDownload && watchResult.tiles && watchResult.tiles.length > 0) {
          const successfulTiles = watchResult.tiles.filter(t => t.isSuccess);
          if (successfulTiles.length > 0) {
            await updateQueueItem(itemId, { status: QUEUE_STATUS.DOWNLOADING });
            this.notifyProgress({
              itemId,
              status: QUEUE_STATUS.DOWNLOADING,
              percent: 85,
              downloadProgress: { current: 0, total: successfulTiles.length }
            });

            const defaultRes = cfg.videoResolution || '1080p';
            const targetRes = item.resolution || cfg.targetResolution || defaultRes;
            logger.step('download', `Downloading ${successfulTiles.length} asset(s) at ${targetRes}`);
            await flowDownloadService.downloadBatchTiles(successfulTiles, {
              targetResolution: targetRes,
              delayBetweenMs: 1000,
              onProgress: (current, total) => {
                const dlRowPercent = Math.min(99, Math.round(85 + (current / total) * 14));
                this.notifyProgress({
                  itemId,
                  status: QUEUE_STATUS.DOWNLOADING,
                  percent: dlRowPercent,
                  downloadProgress: { current, total }
                });
              }
            });
          }
        }

        // Stage: COMPLETED or FAILED
        if (watchResult.success) {
          logger.success(`Item ${itemId} generated & processed successfully!`);
          await updateQueueItem(itemId, {
            status: QUEUE_STATUS.COMPLETED,
            completedAt: Date.now()
          });
          this.notifyProgress({ itemId, status: QUEUE_STATUS.COMPLETED, percent: 100 });
        } else {
          throw new Error('[QueueManager] Generation tiles failed or were moderation-blocked');
        }
      }

    } catch (err) {
      logger.error(`Item ${itemId} failed: ${err.message || String(err)}`);
      await updateQueueItem(itemId, {
        status: QUEUE_STATUS.FAILED,
        error: err.message || String(err),
        completedAt: Date.now()
      });
      this.notifyProgress({ itemId, status: QUEUE_STATUS.FAILED, percent: 100, error: err.message });
    }
  }
}

export const queueManager = new QueueManager();
