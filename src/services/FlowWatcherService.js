/**
 * FlowWatcherService.js — Grid Gallery Watcher & Generation Lifecycle Engine
 * 
 * Manages virtual-scroll safe monitoring of top generation batches (ADR-008),
 * progress tracking, in-card failure detection (ADR-006), and asset extraction.
 * 
 * Adheres strictly to docs/references/GOOGLE_FLOW_DOM.md, ADR-006, and ADR-008.
 */

import {
  SELECTORS,
  query,
  queryAll,
  waitForCondition,
  isCardGenerationSuccess,
  isCardGenerationFailed,
  getTileMediaSource
} from '../core/FlowDOM.js';
import { logger } from './LoggerService.js';

export class FlowWatcherService {
  constructor() {
    this.blankTransitionTimers = new WeakMap();
  }

  /**
   * Retrieves the top-most (newest) batch container in the grid gallery.
   * Angular CDK Virtual Scroll unmounts older batches upon scrolling,
   * so monitoring is strictly bound to index 0 (:first-child).
   */
  getTopBatchContainer() {
    // 1. Direct flow-tile-container at top index 0 (batch or grid mode container)
    const directBatch = query(SELECTORS.TOP_BATCH_CONTAINER) ||
      query('flow-grid-tile-container flow-tile-container:first-of-type') ||
      query(`${SELECTORS.GRID_CONTAINER} > flow-tile-container:first-child`) ||
      query(`${SELECTORS.GRID_CONTAINER} > :first-child`);
    if (directBatch) return directBatch;

    // 2. Direct top tile fallback (if flat tiles inside grid view)
    const topTile = query('flow-grid-tile-container flow-video-tile, flow-grid-tile-container flow-image-tile, flow-grid-tile-container flow-pending-tile');
    if (topTile) {
      return topTile.closest('flow-tile-container') || topTile;
    }

    return null;
  }

  /**
   * Returns all tile elements within a given batch container.
   */
  getBatchTileElements(batchContainer, expectedCount = null) {
    if (!batchContainer) return [];
    if (batchContainer.matches && batchContainer.matches('flow-video-tile, flow-image-tile')) {
      return [batchContainer];
    }
    // Query primary card tiles
    let tiles = queryAll('flow-video-tile, flow-image-tile', batchContainer);
    // If no video or image tiles mounted yet, check for pending tiles that are top-level
    if (tiles.length === 0) {
      tiles = queryAll('flow-pending-tile', batchContainer);
    }
    // Filter out any child tile whose ancestor is already included in tiles
    tiles = tiles.filter(t => !tiles.some(parent => parent !== t && parent.contains(t)));

    if (expectedCount && tiles.length > expectedCount && batchContainer.tagName && batchContainer.tagName.toLowerCase() === 'flow-grid-tile-container') {
      return tiles.slice(0, expectedCount);
    }
    return tiles;
  }

  /**
   * Evaluates the lifecycle state of a single tile card using the 4-State Protocol:
   * 1. DEFINITIVE_SUCCESS: isCardGenerationSuccess === true.
   * 2. DEFINITIVE_FAILURE: isCardGenerationFailed === true.
   * 3. PENDING_RENDERING: progress bar, pending tile, or percent text active.
   * 4. BLANK_TRANSITION: rendering finished, no media src yet, no error tile (10s grace period).
   */
  getTileStatus(tileElement) {
    if (!tileElement) {
      return { status: 'unknown', isRendering: false, isSuccess: false, isFailed: true };
    }

    // 1. Definitive Success and Definitive Failure checked first
    const isSuccess = isCardGenerationSuccess(tileElement);
    const hasDefinitiveFailure = isCardGenerationFailed(tileElement);

    // Extract live percentage from DOM if rendered (e.g. <div class="loading-percentage">53%</div>)
    let livePercent = 0;
    const percentEl = tileElement.querySelector('.loading-percentage') ||
      Array.from(tileElement.querySelectorAll('div, span')).find(el => /^\d+%$/.test((el.textContent || '').trim()));
    if (percentEl) {
      const match = (percentEl.textContent || '').trim().match(/(\d+)%/);
      if (match) {
        livePercent = parseInt(match[1], 10);
      }
    }

    let mediaType = 'unknown';
    let mediaSrc = '';

    const media = getTileMediaSource(tileElement);
    if (media) {
      mediaType = media.type;
      mediaSrc = media.src;
    }

    // Definitive Success
    if (isSuccess) {
      this.blankTransitionTimers.delete(tileElement);
      return {
        element: tileElement,
        status: 'success',
        isRendering: false,
        isSuccess: true,
        isFailed: false,
        percent: 100,
        mediaType,
        mediaSrc
      };
    }

    // Definitive Failure
    if (hasDefinitiveFailure) {
      this.blankTransitionTimers.delete(tileElement);
      return {
        element: tileElement,
        status: 'failed',
        isRendering: false,
        isSuccess: false,
        isFailed: true,
        percent: 0,
        mediaType,
        mediaSrc
      };
    }

    // 2. Active Rendering indicators: pending tile, visible progress bar, or percentage ticker
    const isPending = (tileElement.tagName && tileElement.tagName.toLowerCase() === 'flow-pending-tile') ||
      Boolean(tileElement.querySelector('flow-pending-tile'));

    const progressBar = tileElement.querySelector('.progress-bar, .progress-bar-fill, .hover-overlay-has-progress-bar');
    let isProgressActive = false;
    if (progressBar) {
      let isVisible = true;
      if (typeof window !== 'undefined' && window.getComputedStyle) {
        const style = window.getComputedStyle(progressBar);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
          isVisible = false;
        }
      }
      if (progressBar.offsetWidth === 0 && progressBar.offsetHeight === 0 && progressBar.getClientRects().length === 0) {
        isVisible = false;
      }
      isProgressActive = isVisible;
    }

    const hasPercentText = livePercent > 0 || Array.from(tileElement.querySelectorAll('div, span')).some(
      el => /^\d+%$/.test((el.textContent || '').trim())
    );
    const isRendering = isPending || isProgressActive || hasPercentText;

    if (isRendering) {
      this.blankTransitionTimers.delete(tileElement);
      return {
        element: tileElement,
        status: 'rendering',
        isRendering: true,
        isSuccess: false,
        isFailed: false,
        percent: livePercent,
        mediaType,
        mediaSrc
      };
    }

    // 3. Transient Blank Transition Phase (!isRendering && !isSuccess && !hasDefinitiveFailure)
    // Between progress bar vanishing and media mounting (300ms–2000ms, with 10s grace timeout)
    const now = Date.now();
    let transitionStart = this.blankTransitionTimers.get(tileElement);
    if (!transitionStart) {
      transitionStart = now;
      this.blankTransitionTimers.set(tileElement, transitionStart);
    }

    const elapsed = now - transitionStart;
    if (elapsed > 10000) {
      // 10s grace timeout exceeded without media mounting -> definitive failure
      this.blankTransitionTimers.delete(tileElement);
      return {
        element: tileElement,
        status: 'failed',
        isRendering: false,
        isSuccess: false,
        isFailed: true,
        percent: 0,
        mediaType,
        mediaSrc
      };
    }

    // Within grace period: classify as rendering to prevent false failure abort
    return {
      element: tileElement,
      status: 'rendering',
      isRendering: true,
      isTransitioning: true,
      isSuccess: false,
      isFailed: false,
      percent: livePercent,
      mediaType,
      mediaSrc
    };
  }

  /**
   * Waits for a newly initiated generation batch to spawn at the top of the grid.
   */
  async waitForNewBatchSpawn(previousTopBatch = null, timeout = 15000) {
    return await waitForCondition(() => {
      const currentTop = this.getTopBatchContainer();
      if (!currentTop) return false;

      // If we had no previous batch, any top batch is valid
      if (!previousTopBatch) return currentTop;

      // Return when the top batch is a distinct DOM node
      if (currentTop !== previousTopBatch) {
        return currentTop;
      }

      // Or if the batch container has an active pending tile or progress bar
      const tiles = this.getBatchTileElements(currentTop);
      const isAnyRendering = tiles.some(t => {
        const st = this.getTileStatus(t);
        return st.isRendering;
      });
      if (isAnyRendering) {
        return currentTop;
      }

      return false;
    }, { timeout, interval: 300 });
  }

  /**
   * Watches an active batch container until all child tiles complete or fail.
   */
  async watchBatchProgress(batchContainer, onProgress = null, { timeout = 180000, pollInterval = 1000, expectedCount = 1 } = {}) {
    if (!batchContainer) {
      throw new Error('[FlowWatcherService] Invalid batch container provided to watchBatchProgress');
    }

    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const timer = setInterval(() => {
        // Guard against timeout
        if (Date.now() - startTime >= timeout) {
          clearInterval(timer);
          return reject(new Error(`[FlowWatcherService] Generation batch timed out after ${timeout}ms`));
        }

        // Verify container is still connected to DOM
        if (!batchContainer.isConnected) {
          clearInterval(timer);
          return reject(new Error('[FlowWatcherService] Active batch container disconnected from DOM'));
        }

        const tiles = this.getBatchTileElements(batchContainer, expectedCount);
        if (tiles.length === 0) {
          // Still initializing tiles inside container
          return;
        }

        let completedCount = 0;
        let failedCount = 0;
        let renderingCount = 0;
        let sumTilePercent = 0;
        const tileStatuses = [];

        for (const tile of tiles) {
          const st = this.getTileStatus(tile);
          tileStatuses.push(st);

          if (st.isSuccess) {
            completedCount++;
            sumTilePercent += 100;
          } else if (st.isFailed) {
            failedCount++;
            sumTilePercent += 100;
          } else {
            renderingCount++;
            sumTilePercent += (st.percent || 0);
          }
        }

        const total = tiles.length;
        const isDone = (completedCount + failedCount) === total;
        // Real-time aggregate percentage calculated across all tiles in the batch
        const estimatedPercent = total > 0 ? Math.min(100, Math.round(sumTilePercent / total)) : 0;

        if (typeof onProgress === 'function') {
          try {
            onProgress({
              total,
              completed: completedCount,
              failed: failedCount,
              rendering: renderingCount,
              percent: estimatedPercent,
              isDone,
              tiles: tileStatuses
            });
          } catch (e) {
            console.error('[FlowWatcherService] Progress callback error', e);
          }
        }

        if (isDone) {
          clearInterval(timer);
          if (completedCount > 0) {
            logger.success(`Batch generated successfully (${completedCount}/${total} tiles ready)`);
          } else {
            logger.warn(`Batch completed with 0 successful tiles (${failedCount} failed)`);
          }
          resolve({
            success: completedCount > 0,
            batchContainer,
            total,
            completed: completedCount,
            failed: failedCount,
            tiles: tileStatuses
          });
        }
      }, pollInterval);
    });
  }

  /**
   * High-level orchestrator: captures prior state, awaits new batch container spawn,
   * and tracks lifecycle until full completion.
   */
  async waitForGeneration(previousTopBatch = null, expectedCount = 1, onProgress = null, timeout = 180000) {
    logger.step('watcher', 'Awaiting new generation batch in gallery...');
    // 1. Wait for Google Flow to mount the new batch container at top index 0
    const newBatch = await this.waitForNewBatchSpawn(previousTopBatch, 15000);
    logger.step('watcher', 'New batch detected, monitoring generation progress...');

    // 2. Poll until all tiles in the batch resolve (success or failure)
    const result = await this.watchBatchProgress(newBatch, onProgress, { timeout, expectedCount });

    return result;
  }
}

export const flowWatcherService = new FlowWatcherService();
