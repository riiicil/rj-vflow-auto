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
  isCardGenerationSuccess
} from '../core/FlowDOM.js';

export class FlowWatcherService {
  /**
   * Retrieves the top-most (newest) batch container in the grid gallery.
   * Angular CDK Virtual Scroll unmounts older batches upon scrolling,
   * so monitoring is strictly bound to index 0 (:first-child).
   */
  getTopBatchContainer() {
    return query(SELECTORS.TOP_BATCH_CONTAINER) ||
      query(`${SELECTORS.GRID_CONTAINER} > :first-child`);
  }

  /**
   * Returns all tile elements within a given batch container.
   */
  getBatchTileElements(batchContainer) {
    if (!batchContainer) return [];
    return queryAll('flow-video-tile, flow-image-tile', batchContainer);
  }

  /**
   * Evaluates the lifecycle state of a single tile card.
   */
  getTileStatus(tileElement) {
    if (!tileElement) {
      return { status: 'unknown', isRendering: false, isSuccess: false, isFailed: true };
    }

    const isRendering = Boolean(tileElement.querySelector(SELECTORS.PROGRESS_BAR));
    const isSuccess = isCardGenerationSuccess(tileElement);

    const hasErrorBadge = Boolean(tileElement.querySelector(SELECTORS.CARD_ERROR));
    const hasErrorClass = tileElement.classList.contains('failed') ||
      tileElement.classList.contains('blurred-error');
    const isFailed = !isRendering && (hasErrorBadge || hasErrorClass || !isSuccess);

    let mediaType = 'unknown';
    let mediaSrc = '';

    const mediaEl = tileElement.querySelector(SELECTORS.CARD_MEDIA);
    if (mediaEl) {
      mediaType = mediaEl.tagName.toLowerCase() === 'video' ? 'video' : 'image';
      mediaSrc = mediaEl.getAttribute('src') || mediaEl.currentSrc || '';
    }

    let status = 'rendering';
    if (isSuccess) {
      status = 'success';
    } else if (isFailed) {
      status = 'failed';
    }

    return {
      element: tileElement,
      status,
      isRendering,
      isSuccess,
      isFailed,
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

      return false;
    }, { timeout, interval: 300 });
  }

  /**
   * Watches an active batch container until all child tiles complete or fail.
   */
  async watchBatchProgress(batchContainer, onProgress = null, { timeout = 180000, pollInterval = 1000 } = {}) {
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

        const tiles = this.getBatchTileElements(batchContainer);
        if (tiles.length === 0) {
          // Still initializing tiles inside container
          return;
        }

        let completedCount = 0;
        let failedCount = 0;
        let renderingCount = 0;
        const tileStatuses = [];

        for (const tile of tiles) {
          const st = this.getTileStatus(tile);
          tileStatuses.push(st);

          if (st.isSuccess) {
            completedCount++;
          } else if (st.isFailed) {
            failedCount++;
          } else {
            renderingCount++;
          }
        }

        const total = tiles.length;
        const isDone = (completedCount + failedCount) === total;
        const estimatedPercent = Math.min(100, Math.round(((completedCount + failedCount) / total) * 100));

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
    // 1. Wait for Google Flow to mount the new batch container at top index 0
    const newBatch = await this.waitForNewBatchSpawn(previousTopBatch, 15000);

    // 2. Poll until all tiles in the batch resolve (success or failure)
    const result = await this.watchBatchProgress(newBatch, onProgress, { timeout });

    return result;
  }
}

export const flowWatcherService = new FlowWatcherService();
