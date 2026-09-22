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

import { logger } from './LoggerService.js';

export class FlowDownloadService {
  /**
   * Opens the card's 'More options' context menu (ligature: more_vert).
   */
  async openCardMoreMenu(tileElement, timeout = 4000) {
    if (!tileElement) {
      throw new Error('[FlowDownloadService] Tile element required to open more menu');
    }

    if (tileElement.scrollIntoView) {
      tileElement.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }

    // Find more options button inside card hotbar
    let moreBtn = queryButtonByIcon(LIGATURES.MORE_OPTIONS, tileElement) ||
      query('flow-hotbar-container div.hotbar-inner > button:nth-of-type(3)', tileElement);

    if (!moreBtn) {
      tileElement.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      await sleep(200);
      moreBtn = queryButtonByIcon(LIGATURES.MORE_OPTIONS, tileElement) ||
        query('flow-hotbar-container div.hotbar-inner > button:nth-of-type(3)', tileElement);
    }

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
    await sleep(350);

    // Check if resolution sub-items appear in any open menu panel
    try {
      await waitForElement(`div.mat-mdc-menu-content flow-menu-item button`, { timeout: 2000 });
      
      const menuItems = Array.from(document.querySelectorAll('div.mat-mdc-menu-content flow-menu-item'));
      if (menuItems.length > 0) {
        const parsedOptions = [];

        for (const item of menuItems) {
          const btn = item.querySelector('button[role="menuitem"]') || item.querySelector('button');
          if (!btn) continue;

          const labelEl = item.querySelector('span.label');
          const labelText = labelEl ? labelEl.textContent.trim() : (btn.textContent || '').trim();
          const captionEl = item.querySelector('span.caption');
          const captionText = captionEl ? captionEl.textContent.trim() : '';

          const isDisabled = btn.disabled || 
            btn.getAttribute('disabled') === 'true' || 
            btn.getAttribute('aria-disabled') === 'true' ||
            btn.classList.contains('mat-mdc-menu-item-disabled');
          const hasUpgradeAction = Boolean(item.querySelector('.flow-menu-item-actions, a[href*="upgrade"], a[href*="explore-plan"]'));
          const isLocked = isDisabled || hasUpgradeAction;

          parsedOptions.push({
            item,
            btn,
            label: labelText,
            caption: captionText,
            isLocked
          });
        }

        const availableOptions = parsedOptions.filter(o => !o.isLocked);
        let chosenOption = null;

        if (availableOptions.length > 0) {
          const normTarget = String(targetResolution).toLowerCase();

          if (normTarget === 'max') {
            chosenOption = availableOptions[availableOptions.length - 1];
          } else {
            chosenOption = availableOptions.find(o => {
              const l = o.label.toLowerCase();
              return l === normTarget || l.includes(normTarget);
            });

            // If requested resolution (e.g. 4K) is locked or not found, fall back to highest available enabled option
            if (!chosenOption) {
              const fallback = availableOptions[availableOptions.length - 1];
              logger.warn(`[FlowDownloadService] Requested resolution '${targetResolution}' is locked or unavailable. Falling back to highest available enabled: ${fallback.label}`);
              chosenOption = fallback;
            }
          }
        } else if (parsedOptions.length > 0) {
          chosenOption = parsedOptions[0];
        }

        if (chosenOption && chosenOption.btn) {
          simulateClick(chosenOption.btn);
          await sleep(500);
        }
      }
    } catch (e) {
      // Direct download was triggered on single click without submenu
    }

    // Wait for context menu to dismiss
    await waitForElementGone(SELECTORS.MENU_PANEL, { timeout: 2000 }).catch(() => {});
    if (query(SELECTORS.MENU_PANEL)) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
      await sleep(150);
    }
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
   * Downloads a media URL via background service worker chrome.downloads with direct anchor fallback.
   */
  async downloadUrl(url, filename = 'download.jpg') {
    if (!url) return false;

    // Sanitize filename and guarantee proper extension (.jpg / .png / .mp4)
    let safeFilename = String(filename || 'rj_flow_media.jpg').replace(/[\\/:*?"<>|]/g, '_');
    if (!/\.(jpg|jpeg|png|mp4|webm)$/i.test(safeFilename)) {
      safeFilename += url.includes('video') ? '.mp4' : '.jpg';
    }

    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        const res = await new Promise((resolve) => {
          chrome.runtime.sendMessage({ action: 'DOWNLOAD_URL', url, filename: safeFilename }, (response) => {
            if (chrome.runtime.lastError) {
              resolve({ success: false, error: chrome.runtime.lastError.message });
            } else {
              resolve(response || { success: true });
            }
          });
        });
        if (res && res.success) {
          return true;
        }
      }
    } catch (_) {}

    return this.triggerDirectDownload(url, safeFilename);
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
      logger.warn('[FlowDownloadService] Context menu download failed, attempting direct fallback', err);

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
  async downloadBatchTiles(tiles, { targetResolution = '1080p', delayBetweenMs = 1000, onProgress = null } = {}) {
    if (!Array.isArray(tiles) || tiles.length === 0) return 0;

    // Enforce strict 800ms - 1000ms pacing delay between downloads
    const pacingMs = Math.max(delayBetweenMs, 800);

    let downloaded = 0;
    for (let i = 0; i < tiles.length; i++) {
      const tileObj = tiles[i];
      const element = tileObj.element || tileObj;

      if (typeof onProgress === 'function') {
        try {
          onProgress(i + 1, tiles.length);
        } catch (_) {}
      }

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
