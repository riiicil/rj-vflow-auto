/**
 * service_worker.js — Manifest V3 Background Service Worker
 * 
 * Lifecycle listener for RJ V-Flow Auto extension events.
 */

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[RJ V-Flow Auto] Extension installed/updated:', details.reason);
});
