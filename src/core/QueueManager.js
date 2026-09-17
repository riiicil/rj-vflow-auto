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
        console.error('[QueueManager] Unexpected loop failure', err);
        this.setState(QUEUE_STATES.IDLE);
      });
    }
  }

  /**
   * Pauses queue execution after active batch finishes.
   */
  async pause() {
    if (this.state !== QUEUE_STATES.RUNNING) return;

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

    this.setState(QUEUE_STATES.RUNNING);
    await saveConfig({
      activeBatch: { isRunning: true, isPaused: false }
    });

    if (!this.isLoopActive) {
      this.runLoop().catch(err => {
        console.error('[QueueManager] Resume loop error', err);
        this.setState(QUEUE_STATES.IDLE);
      });
    }
  }

  /**
   * Stops queue execution immediately.
   */
  async stop() {
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
      while (this.state === QUEUE_STATES.RUNNING) {
        const queue = await getQueue();
        const nextItem = queue.find(it => it.status === QUEUE_STATUS.PENDING);

        if (!nextItem) {
          // No more pending items, transition to IDLE
          this.setState(QUEUE_STATES.IDLE);
          await saveConfig({
            activeBatch: { isRunning: false, isPaused: false, activeItemId: null }
          });
          break;
        }

        this.activeItemId = nextItem.id;
        await saveConfig({
          activeBatch: { activeItemId: nextItem.id }
        });

        await this.processItem(nextItem);

        // Cooldown between prompts
        const cfg = await getConfig();
        const cooldownMs = (cfg.settings && cfg.settings.cooldownMs) || 2500;
        if (this.state === QUEUE_STATES.RUNNING && cooldownMs > 0) {
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
  async processItem(item) {
    const itemId = item.id;

    try {
      // 1. Stage: INJECTING — Apply settings & parameters
      await updateQueueItem(itemId, { status: QUEUE_STATUS.INJECTING, error: null });
      this.notifyProgress({ itemId, status: QUEUE_STATUS.INJECTING, percent: 10 });

      await flowSettingsService.applySettings({
        mode: item.mode,
        model: item.model,
        aspectRatio: item.aspectRatio,
        duration: item.duration,
        outputCount: item.outputs || 1
      });

      // 2. Prepare Reference Ingredients / Frames
      if (item.ingredients && item.ingredients.length > 0) {
        await flowIngredientService.clearIngredients();
        for (const ing of item.ingredients) {
          await flowIngredientService.injectMediaToFlow(ing.dataUrl || ing, ing.name || 'ingredient.png');
        }
      } else if (item.frames && (item.frames.start || item.frames.end)) {
        await flowIngredientService.clearIngredients();
        if (item.frames.start) {
          await flowIngredientService.setFrameSlot('start', item.frames.start);
        }
        if (item.frames.end) {
          await flowIngredientService.setFrameSlot('end', item.frames.end);
        }
      }

      // 3. Capture baseline top batch before submission
      const previousTopBatch = flowWatcherService.getTopBatchContainer();

      // 4. Submit prompt via native ProseMirror injection
      await flowPromptService.submitPrompt(item.prompt);

      // 5. Stage: GENERATING — Watch batch resolution
      await updateQueueItem(itemId, { status: QUEUE_STATUS.GENERATING });
      this.notifyProgress({ itemId, status: QUEUE_STATUS.GENERATING, percent: 25 });

      const watchResult = await flowWatcherService.waitForGeneration(
        previousTopBatch,
        item.outputs || 1,
        (progress) => {
          this.notifyProgress({
            itemId,
            status: QUEUE_STATUS.GENERATING,
            percent: 25 + Math.round((progress.percent || 0) * 0.5),
            progress
          });
        },
        180000
      );

      // 6. Stage: DOWNLOADING — Handle asset downloads
      const cfg = await getConfig();
      const shouldDownload = item.autoDownload !== undefined ? item.autoDownload : cfg.autoDownload;

      if (watchResult.success && shouldDownload && watchResult.tiles && watchResult.tiles.length > 0) {
        await updateQueueItem(itemId, { status: QUEUE_STATUS.DOWNLOADING });
        this.notifyProgress({ itemId, status: QUEUE_STATUS.DOWNLOADING, percent: 85 });

        const targetRes = item.resolution || (item.mode.includes('image') ? cfg.imageResolution : cfg.videoResolution);
        await flowDownloadService.downloadBatchTiles(watchResult.tiles, {
          targetResolution: targetRes,
          delayBetweenMs: 800
        });
      }

      // 7. Stage: COMPLETED or FAILED
      if (watchResult.success) {
        await updateQueueItem(itemId, {
          status: QUEUE_STATUS.COMPLETED,
          completedAt: Date.now()
        });
        this.notifyProgress({ itemId, status: QUEUE_STATUS.COMPLETED, percent: 100 });
      } else {
        throw new Error('[QueueManager] Generation tiles failed or were moderation-blocked');
      }

    } catch (err) {
      console.error(`[QueueManager] Item ${itemId} failed:`, err);
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
