/**
 * QueueManager.js — Master Batch Automation Orchestrator
 * 
 * State machine managing automated prompt execution lifecycle:
 * IDLE -> RUNNING -> PAUSED -> STOPPED.
 * 
 * Orchestrates settings configuration, media ingestion, prompt submission,
 * generation monitoring, and asset downloading across all Phase 2 services.
 */

import {
  getConfig,
  saveConfig,
  getQueue,
  updateQueueItem,
  QUEUE_STATUS
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
  PAUSED: 'paused',
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
      try { cb(state); } catch (e) { console.error('[QueueManager] State listener error', e); }
    }
  }

  notifyProgress(payload) {
    for (const cb of this.progressListeners) {
      try { cb(payload); } catch (e) { console.error('[QueueManager] Progress listener error', e); }
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
        isPaused: false,
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
   * Pauses queue execution after active batch finishes.
   */
  async pause() {
    if (this.state !== QUEUE_STATES.RUNNING) return;

    logger.info('Queue automation paused');
    this.setState(QUEUE_STATES.PAUSED);
    await saveConfig({
      activeBatch: { isRunning: true, isPaused: true }
    });
  }

  /**
   * Resumes queue execution from paused state.
   */
  async resume() {
    if (this.state !== QUEUE_STATES.PAUSED) return;

    logger.info('Queue automation resumed');
    this.setState(QUEUE_STATES.RUNNING);
    await saveConfig({
      activeBatch: { isRunning: true, isPaused: false }
    });

    if (!this.isLoopActive) {
      this.runLoop().catch(err => {
        logger.error('Resume loop error', err);
        this.setState(QUEUE_STATES.IDLE);
      });
    }
  }

  /**
   * Stops queue execution immediately.
   */
  async stop() {
    logger.warn('Queue automation stopped by user');
    this.setState(QUEUE_STATES.STOPPED);
    this.activeItemId = null;
    await saveConfig({
      activeBatch: {
        isRunning: false,
        isPaused: false,
        activeItemId: null
      }
    });
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
          activeBatch: { isRunning: false, isPaused: false, activeItemId: null }
        });
        return;
      }

      const cfg = await getConfig();
      const paramMode = cfg.paramMode || 'batch';
      logger.info(`QueueManager loop initiated with ${pendingItems.length} pending item(s) in [${paramMode.toUpperCase()}] mode`);

      // 1. One-Time Page Setup Execution: Grid layout, size M, auto-clear prompt, and agent mode suppression
      logger.step('header setup', 'Executing one-time page setup (grid layout, size M, auto-clear prompt)');
      try {
        await flowSettingsService.setupHeaderGridAndClearPrompt();
        await flowSettingsService.ensureAgentModeOff();
      } catch (setupErr) {
        logger.warn('[QueueManager] One-time header setup warning', setupErr);
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
          outputCount: isVideo ? 1 : (cfg.outputCount || 1)
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
            activeBatch: { isRunning: false, isPaused: false, activeItemId: null }
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

        // Cooldown between prompts
        const cooldownMs = (currentCfg.settings && currentCfg.settings.cooldownMs) || 2500;
        if (this.state === QUEUE_STATES.RUNNING && cooldownMs > 0) {
          logger.step('cooldown', `${cooldownMs}ms`);
          await new Promise(r => setTimeout(r, cooldownMs));
        }
      }
    } finally {
      this.isLoopActive = false;
      this.activeItemId = null;
    }
  }

  /**
   * Executes the complete generation lifecycle for an individual queue item.
   */
  async processItem(item, paramMode = 'batch') {
    const itemId = item.id;

    try {
      // 1. Stage: INJECTING — Apply settings & parameters
      await updateQueueItem(itemId, { status: QUEUE_STATUS.INJECTING, error: null });
      this.notifyProgress({ itemId, status: QUEUE_STATUS.INJECTING, percent: 10 });

      // Parameter Branching:
      // If Single mode: read nextItem configuration and call applySettings(nextItem) on every iteration
      // If Batch mode: skip opening prompt settings popover; reuse pre-configured settings
      if (paramMode === 'single') {
        const cfg = await getConfig();
        const mode = item.mode || cfg.mode || 'text-to-video';
        const isVideo = mode !== 'text-to-image' && mode !== 'edit-image';
        const model = item.model || cfg.model || (isVideo ? 'Omni 1.1 Flash' : 'Nano Banana Pro');
        const aspectRatio = item.aspectRatio || cfg.aspectRatio || '16:9';
        const duration = item.duration || cfg.duration || '6s';
        const outputCount = isVideo ? 1 : (item.outputs || item.outputCount || cfg.outputCount || 1);

        logger.step('parameters (single)', `${mode} | ${model} | ratio: ${aspectRatio}`);
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
      } else if (item.frames && (item.frames.start || item.frames.end)) {
        logger.step('frames', 'Injecting start & end frames');
        await flowIngredientService.clearIngredients();
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
          await flowIngredientService.setFrameSlot('start', startPayload, startName);
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
          await flowIngredientService.setFrameSlot('end', endPayload, endName);
        }
      } else {
        // Pure text prompt: ensure no residual chips remain
        await flowIngredientService.clearIngredients();
      }

      // 3. Capture baseline top batch before submission
      const previousTopBatch = flowWatcherService.getTopBatchContainer();

      // 4. Submit prompt via native ProseMirror injection
      logger.step('prompt injection', item.prompt);
      await flowPromptService.submitPrompt(item.prompt);

      // 5. Stage: GENERATING — Watch batch resolution
      await updateQueueItem(itemId, { status: QUEUE_STATUS.GENERATING });
      this.notifyProgress({ itemId, status: QUEUE_STATUS.GENERATING, percent: 1 });

      const watchResult = await flowWatcherService.waitForGeneration(
        previousTopBatch,
        item.outputs || item.outputCount || 1,
        (progress) => {
          this.notifyProgress({
            itemId,
            status: QUEUE_STATUS.GENERATING,
            percent: Math.max(1, Math.min(99, progress.percent || 1)),
            progress
          });
        },
        180000
      );

      // 6. Stage: DOWNLOADING — Handle asset downloads
      const cfg = await getConfig();
      const shouldDownload = item.autoDownload !== undefined ? item.autoDownload : cfg.autoDownload;

      if (watchResult.success && shouldDownload && watchResult.tiles && watchResult.tiles.length > 0) {
        const successfulTiles = watchResult.tiles.filter(t => t.isSuccess);
        if (successfulTiles.length > 0) {
          await updateQueueItem(itemId, { status: QUEUE_STATUS.DOWNLOADING });
          this.notifyProgress({
            itemId,
            status: QUEUE_STATUS.DOWNLOADING,
            percent: 90,
            downloadProgress: { current: 1, total: successfulTiles.length }
          });

          const isImage = (item.mode && item.mode.includes('image')) || (cfg.mode && cfg.mode.includes('image'));
          const defaultRes = isImage ? (cfg.imageResolution || '2K') : (cfg.videoResolution || '1080p');
          const targetRes = item.resolution || cfg.targetResolution || defaultRes;
          logger.step('download', `Downloading ${successfulTiles.length} asset(s) at ${targetRes}`);
          await flowDownloadService.downloadBatchTiles(successfulTiles, {
            targetResolution: targetRes,
            delayBetweenMs: 1000,
            onProgress: (current, total) => {
              const dlPercent = Math.min(99, Math.round(90 + (current / total) * 9));
              this.notifyProgress({
                itemId,
                status: QUEUE_STATUS.DOWNLOADING,
                percent: dlPercent,
                downloadProgress: { current, total }
              });
            }
          });
        }
      }

      // 7. Stage: COMPLETED or FAILED
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
