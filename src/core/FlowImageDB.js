/**
 * FlowImageDB.js — IndexedDB Binary Storage Engine for RJ V-Flow Auto
 * 
 * Manages local persistence of high-resolution reference images, start/end frames,
 * and media ingredients using native IndexedDB ('vflowImageDB').
 * 
 * Prevents exceeding Chrome's strict 5MB chrome.storage.local quota limit
 * by storing raw File/Blob binaries in IndexedDB and linking them to queue
 * items via unique UUID references.
 * 
 * Ported and refined from legacy v2.x proven architecture (origin/legacy:panel/sidepanel.js).
 */

import { logger } from '../services/LoggerService.js';

const DB_NAME = 'vflowImageDB';
const DB_VERSION = 1;
const STORE_NAME = 'images';

export class FlowImageDB {
  constructor() {
    this.dbPromise = null;
  }

  /**
   * Opens or returns the cached IndexedDB database connection.
   * @returns {Promise<IDBDatabase>}
   */
  async openDB() {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        return reject(new Error('[FlowImageDB] IndexedDB is not available in this environment'));
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = (e) => {
        const db = e.target.result;
        // Reset cached promise on sudden abnormal closure
        db.onclose = () => {
          this.dbPromise = null;
        };
        resolve(db);
      };

      request.onerror = (e) => {
        this.dbPromise = null;
        reject(e.target.error || new Error('[FlowImageDB] Failed to open IndexedDB'));
      };
    });

    return this.dbPromise;
  }

  /**
   * Generates a unique image reference UUID.
   * @returns {string}
   */
  generateId() {
    return `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Saves an image Blob or File to IndexedDB under a unique UUID.
   * @param {Blob|File|string} blobOrFile - Raw image binary or data URL string
   * @param {string} [name='image.png'] - Original filename
   * @param {string} [customId] - Optional predefined UUID
   * @returns {Promise<string>} The generated or assigned image UUID
   */
  async saveImage(blobOrFile, name = 'image.png', customId = null) {
    let blob = blobOrFile;

    // Convert data URL to Blob if necessary
    if (typeof blobOrFile === 'string' && blobOrFile.startsWith('data:')) {
      blob = this.dataUrlToBlob(blobOrFile);
    }

    if (!blob || !(blob instanceof Blob)) {
      throw new Error('[FlowImageDB] Invalid image payload: expected Blob or File instance');
    }

    const id = customId || this.generateId();
    const fileName = name || (blob instanceof File ? blob.name : 'image.png');

    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        const record = {
          id,
          file: blob,
          blob,
          name: fileName,
          size: blob.size,
          type: blob.type || 'image/png',
          createdAt: Date.now()
        };

        store.put(record);

        tx.oncomplete = () => resolve(id);
        tx.onerror = (e) => reject(tx.error || e.target.error);
        tx.onabort = () => reject(new Error('[FlowImageDB] Transaction aborted'));
      });
    } catch (err) {
      logger.error('[FlowImageDB] saveImage failed:', err);
      throw err;
    }
  }

  /**
   * Retrieves an image record by its unique UUID.
   * @param {string} id - The image UUID
   * @returns {Promise<{id: string, file: Blob|File, blob: Blob|File, name: string, size: number, type: string, createdAt: number}|null>}
   */
  async getImage(id) {
    if (!id) return null;

    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => {
          resolve(request.result || null);
        };

        request.onerror = (e) => reject(request.error || e.target.error);
      });
    } catch (err) {
      logger.warn('[FlowImageDB] getImage error:', err);
      return null;
    }
  }

  /**
   * Retrieves the raw Blob / File binary by image UUID.
   * @param {string} id - The image UUID
   * @returns {Promise<Blob|File|null>}
   */
  async getImageBlob(id) {
    const record = await this.getImage(id);
    return record?.file || record?.blob || null;
  }

  /**
   * Deletes an image record from IndexedDB by UUID.
   * @param {string} id - The image UUID
   * @returns {Promise<boolean>}
   */
  async deleteImage(id) {
    if (!id) return false;

    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(id);

        tx.oncomplete = () => resolve(true);
        tx.onerror = (e) => reject(tx.error || e.target.error);
      });
    } catch (err) {
      logger.warn('[FlowImageDB] deleteImage error:', err);
      return false;
    }
  }

  /**
   * Clears all stored images from IndexedDB.
   * @returns {Promise<boolean>}
   */
  async clearImages() {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.clear();

        tx.oncomplete = () => resolve(true);
        tx.onerror = (e) => reject(tx.error || e.target.error);
      });
    } catch (err) {
      logger.warn('[FlowImageDB] clearImages error:', err);
      return false;
    }
  }

  /**
   * Retrieves all stored image UUIDs.
   * @returns {Promise<string[]>}
   */
  async getAllImageIds() {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAllKeys();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = (e) => reject(request.error || e.target.error);
      });
    } catch (err) {
      logger.warn('[FlowImageDB] getAllImageIds error:', err);
      return [];
    }
  }

  /**
   * Removes unreferenced image files from IndexedDB to maintain database hygiene.
   * @param {string[]|Set<string>} activeIds - List of active UUIDs currently referenced in queue
   * @returns {Promise<number>} Number of orphaned images removed
   */
  async cleanupUnreferenced(activeIds) {
    try {
      const activeSet = activeIds instanceof Set ? activeIds : new Set(activeIds || []);
      const allKeys = await this.getAllImageIds();
      let purgedCount = 0;

      for (const key of allKeys) {
        if (!activeSet.has(key)) {
          await this.deleteImage(key);
          purgedCount++;
        }
      }

      return purgedCount;
    } catch (err) {
      logger.warn('[FlowImageDB] cleanupUnreferenced error:', err);
      return 0;
    }
  }

  /**
   * Converts a Base64 data URL to a binary Blob.
   * @private
   */
  dataUrlToBlob(dataUrl) {
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
      return null;
    }

    const parts = dataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const binaryStr = atob(parts[1]);
    const len = binaryStr.length;
    const u8arr = new Uint8Array(len);

    for (let i = 0; i < len; i++) {
      u8arr[i] = binaryStr.charCodeAt(i);
    }

    return new Blob([u8arr], { type: mime });
  }
}

export const flowImageDB = new FlowImageDB();
