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
   * Retrieves the top-most tile card currently in the gallery.
   */
  getTopTileCard() {
    return query(SELECTORS.TOP_TILE) ||
      query('div.virtual-scroll-container flow-tile-container') ||
      query('flow-tile-container') ||
      query('flow-video-tile, flow-image-tile, flow-pending-tile');
  }

  /**
   * Ensures the gallery viewport is at scroll top 0 so the newest items are mounted.
   */
  ensureScrolledToTop() {
    const viewport = query('cdk-virtual-scroll-viewport, .tiles-container');
    if (viewport && viewport.scrollTop > 0) {
      viewport.scrollTop = 0;
    }
  }

  /**
   * Returns all tile elements belonging to the active generation batch across
   * all virtual scroll rows (supporting multi-row layouts for landscape 16:9 x3/x4).
   *
   * Traverses all flow-tile-container elements in document order from the top
   * until encountering previousTopTile, or reaching expectedCount.
   *
   * @param {number|Element} firstArg - Expected count or legacy container element
   * @param {Element|number} secondArg - Baseline top tile element or expected count
   * @param {string} thirdArg - Active prompt text for secondary boundary verification
   * @returns {Element[]} Array of tile card elements
   */
  getBatchTileElements(firstArg = 1, secondArg = null, thirdArg = '') {
    let expectedCount = 1;
    let previousTopTile = null;
    let promptText = '';

    if (firstArg instanceof Element || (firstArg && typeof firstArg === 'object' && firstArg.nodeType === 1)) {
      // Legacy call pattern: (batchContainer, expectedCount)
      expectedCount = Number(secondArg) || 1;
      previousTopTile = null;
    } else {
      // New multi-row call pattern: (expectedCount, previousTopTile, promptText)
      expectedCount = Number(firstArg) || 1;
      previousTopTile = secondArg;
      promptText = thirdArg || '';
    }

    const targetCount = Number(expectedCount) || 1;
    const tileWrappers = queryAll(SELECTORS.TOP_TILE);

    if (tileWrappers.length === 0) {
      const rawCards = queryAll('flow-video-tile, flow-image-tile, flow-pending-tile, flow-error-tile');
      return rawCards.slice(0, targetCount);
    }

    const normPrompt = promptText ? promptText.trim().toLowerCase() : '';
    const result = [];

    for (const tw of tileWrappers) {
      // 1. Boundary: reached the tile that was at the top before submission
      if (previousTopTile && (tw === previousTopTile || tw.contains(previousTopTile) || previousTopTile.contains(tw))) {
        break;
      }

      // 2. Secondary boundary: if card has a distinct aria-label from older generation
      if (normPrompt) {
        const gridContainer = tw.closest('flow-grid-tile-container');
        const tileLabel = gridContainer ? (gridContainer.getAttribute('aria-label') || '').trim().toLowerCase() : '';
        if (tileLabel && !tileLabel.includes(normPrompt) && !normPrompt.includes(tileLabel)) {
          break;
        }
      }

      // 3. Resolve underlying card element inside wrapper
      const card = tw.querySelector('flow-video-tile, flow-image-tile, flow-pending-tile, flow-error-tile') || tw;
      result.push(card);

      // 4. Boundary: collected target number of cards
      if (result.length >= targetCount) {
        break;
      }
    }

    return result;
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
   * Compares against the baseline top tile element captured before prompt submission.
   */
  async waitForNewBatchSpawn(previousTopTile = null, timeout = 15000) {
    return await waitForCondition(() => {
      const currentTop = this.getTopTileCard();
      if (!currentTop) return false;

      // If we had no previous top tile, any top tile indicates the gallery is active
      if (!previousTopTile) return currentTop;

      // Return when top tile is a new DOM node prepended at top of gallery
      if (currentTop !== previousTopTile && !previousTopTile.contains(currentTop)) {
        return currentTop;
      }

      // Or if the top tile has transitioned into active rendering or pending state
      const st = this.getTileStatus(currentTop);
      if (st.isRendering) {
        return currentTop;
      }

      return false;
    }, { timeout, interval: 300 });
  }

  /**
   * Watches active generation tiles across all virtual scroll rows until all complete or fail.
   * Supports both modern options object and legacy container-based signature.
   */
  async watchBatchProgress(optionsOrContainer, onProgress = null, legacyOptions = {}) {
    let expectedCount = 1;
    let previousTopTile = null;
    let promptText = '';
    let timeout = 180000;
    let pollInterval = 1000;
    let progressCb = onProgress;

    if (optionsOrContainer && !(optionsOrContainer instanceof Element) && !(optionsOrContainer.nodeType === 1)) {
      expectedCount = Number(optionsOrContainer.expectedCount) || 1;
      previousTopTile = optionsOrContainer.previousTopTile || null;
      promptText = optionsOrContainer.promptText || '';
      timeout = optionsOrContainer.timeout || 180000;
      pollInterval = optionsOrContainer.pollInterval || 1000;
      if (optionsOrContainer.onProgress) progressCb = optionsOrContainer.onProgress;
    } else {
      expectedCount = Number(legacyOptions.expectedCount) || 1;
      timeout = legacyOptions.timeout || 180000;
      pollInterval = legacyOptions.pollInterval || 1000;
      previousTopTile = optionsOrContainer;
    }

    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const timer = setInterval(() => {
        // Guard against timeout
        if (Date.now() - startTime >= timeout) {
          clearInterval(timer);
          return reject(new Error(`[FlowWatcherService] Generation batch timed out after ${timeout}ms`));
        }

        const tiles = this.getBatchTileElements(expectedCount, previousTopTile, promptText);
        if (tiles.length === 0) {
          // Still mounting initial tiles in DOM
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
        const targetCount = expectedCount || 1;
        // Batch is only done when:
        // 1. All discovered tiles are finished (completed or failed)
        // 2. AND we have received at least targetCount tiles (or 35s safety grace elapsed if platform dropped an output)
        const hasExpectedTiles = total >= targetCount || (Date.now() - startTime >= 35000);
        const isDone = hasExpectedTiles && total > 0 && (completedCount + failedCount) === total;
        // Real-time aggregate percentage calculated across all tiles in the batch
        const estimatedPercent = total > 0 ? Math.min(100, Math.round(sumTilePercent / total)) : 0;

        if (typeof progressCb === 'function') {
          try {
            progressCb({
              total,
              completed: completedCount,
              failed: failedCount,
              rendering: renderingCount,
              percent: estimatedPercent,
              isDone,
              tiles: tileStatuses
            });
          } catch (e) {
            logger.error('[FlowWatcherService] Progress callback error', e);
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
            batchContainer: tiles[0] || null,
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
   * High-level orchestrator: captures prior state, awaits new tiles spawn at gallery top,
   * and monitors lifecycle across multi-row virtual scroll rows until completion.
   */
  async waitForGeneration(previousTopTile = null, expectedCount = 1, onProgress = null, timeout = 180000, promptText = '') {
    logger.step('watcher', 'Awaiting new generation batch in gallery...');

    // 1. Ensure viewport is scrolled to top so index 0 tiles are active in DOM
    this.ensureScrolledToTop();

    // 2. Wait for Google Flow to mount new tiles at top of gallery
    await this.waitForNewBatchSpawn(previousTopTile, 15000);
    logger.step('watcher', 'New batch detected, monitoring generation progress...');

    // 3. Poll multi-row batch progress until all expected tiles complete or fail
    const result = await this.watchBatchProgress({
      expectedCount,
      previousTopTile,
      promptText,
      onProgress,
      timeout
    });

    return result;
  }
}

export const flowWatcherService = new FlowWatcherService();
