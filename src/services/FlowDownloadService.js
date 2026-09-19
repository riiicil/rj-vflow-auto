/**
 * FlowDownloadService.js — Automated Media Asset Download Service
 * 
 * Manages card hotbar context menu automation (more_vert -> download -> resolution)
 * and direct browser download fallback.
 * 
 * Adheres strictly to docs/references/GOOGLE_FLOW_DOM.md, ADR-005, and ADR-006.
 */

import {
  SELECTORS,
  LIGATURES,
  query,
  queryAll,
  queryIcon,
  queryButtonByIcon,
  queryByText,
  waitForElement,
  waitForElementGone,
  simulateClick,
  sleep
} from '../core/FlowDOM.js';

export class FlowDownloadService {
  /**
   * Opens the card's 'More options' context menu (ligature: more_vert).
   */
  async openCardMoreMenu(tileElement, timeout = 4000) {
    if (!tileElement) {
      throw new Error('[FlowDownloadService] Tile element required to open more menu');
    }

    // Find more options button inside card hotbar
    const moreBtn = queryButtonByIcon(LIGATURES.MORE_OPTIONS, tileElement) ||
      query('flow-hotbar-container div.hotbar-inner > button:nth-of-type(3)', tileElement);

    if (!moreBtn) {
      throw new Error('[FlowDownloadService] More options button not found in card hotbar');
    }

    simulateClick(moreBtn);
    return await waitForElement(SELECTORS.MENU_PANEL, { timeout });
  }

  /**
   * Finds and triggers download menu item and resolution sub-option.
   */
  async triggerMenuDownload(menuPanel, targetResolution = '1080p') {
    if (!menuPanel) {
      throw new Error('[FlowDownloadService] Menu panel required for download trigger');
    }

    // Find the Download menu item via font ligature 'download'
    const downloadIcon = queryIcon(LIGATURES.DOWNLOAD, menuPanel);
    let downloadBtn = downloadIcon ? downloadIcon.closest('button') : null;

    if (!downloadBtn) {
      downloadBtn = query(SELECTORS.DOWNLOAD_MENU_ITEM, menuPanel);
    }

    if (!downloadBtn) {
      // Close menu before throwing
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
      throw new Error('[FlowDownloadService] Download menu item not found in context menu');
    }

    simulateClick(downloadBtn);
    await sleep(300);

    // Check if resolution sub-items appear
    try {
      const resolutionBtn = await waitForElement(`div.mat-mdc-menu-content flow-menu-item button`, { timeout: 1500 });
      if (resolutionBtn) {
        // Look for matching resolution button (e.g. '1080p', '4K', '720p', '2K')
        const allMenuPanels = queryAll(SELECTORS.MENU_PANEL);
        let targetResBtn = null;

        for (const panel of allMenuPanels) {
          targetResBtn = queryByText('flow-menu-item button', targetResolution, panel);
          if (targetResBtn) break;
        }

        if (targetResBtn) {
          simulateClick(targetResBtn);
        } else {
          // Fallback: click first resolution item available
          simulateClick(resolutionBtn);
        }
      }
    } catch (e) {
      // Direct download was triggered on single click without submenu
    }

    // Wait for context menu to dismiss
    await waitForElementGone(SELECTORS.MENU_PANEL, { timeout: 2000 }).catch(() => {});
    await sleep(250);
    return true;
  }

  /**
   * Direct anchor download fallback for blobs or media URLs.
   */
  triggerDirectDownload(mediaSrc, filename = 'download') {
    if (!mediaSrc) return false;

    const anchor = document.createElement('a');
    anchor.href = mediaSrc;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(() => {
      if (anchor.parentNode) {
        anchor.parentNode.removeChild(anchor);
      }
    }, 1000);
    return true;
  }

  /**
   * Downloads a single tile, trying context menu upscaling first with fallback.
   */
  async downloadTile(tileElement, { targetResolution = '1080p', filename = 'generation' } = {}) {
    if (!tileElement) return false;

    try {
      const menuPanel = await this.openCardMoreMenu(tileElement, 4000);
      await this.triggerMenuDownload(menuPanel, targetResolution);
      return true;
    } catch (err) {
      console.warn('[FlowDownloadService] Context menu download failed, attempting direct fallback', err);

      // Extract media source for fallback download
      const media = tileElement.querySelector(SELECTORS.CARD_MEDIA);
      const src = media ? (media.getAttribute('src') || media.currentSrc) : null;
      if (src) {
        const ext = media.tagName.toLowerCase() === 'video' ? 'mp4' : 'png';
        return this.triggerDirectDownload(src, `${filename}.${ext}`);
      }
      return false;
    }
  }

  /**
   * Downloads all successful tiles in a batch sequentially with safe pacing delay (800ms - 1000ms).
   */
  async downloadBatchTiles(tiles, { targetResolution = '1080p', delayBetweenMs = 1000 } = {}) {
    if (!Array.isArray(tiles) || tiles.length === 0) return 0;

    // Enforce strict 800ms - 1000ms pacing delay between downloads
    const pacingMs = Math.max(delayBetweenMs, 800);

    let downloaded = 0;
    for (let i = 0; i < tiles.length; i++) {
      const tileObj = tiles[i];
      const element = tileObj.element || tileObj;

      const success = await this.downloadTile(element, {
        targetResolution,
        filename: `batch_tile_${Date.now()}_${i + 1}`
      });

      if (success) downloaded++;

      if (i < tiles.length - 1 && pacingMs > 0) {
        await sleep(pacingMs);
      }
    }

    return downloaded;
  }
}

export const flowDownloadService = new FlowDownloadService();
