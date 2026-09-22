/**
 * service_worker.js — Manifest V3 Background Service Worker
 * 
 * Lifecycle listener for RJ V-Flow Auto extension events.
 */

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[RJ V-Flow Auto] Extension installed/updated:', details.reason);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.action === 'DOWNLOAD_URL') {
    const { url, filename } = message;
    if (url) {
      chrome.downloads.download({
        url,
        filename: filename || 'download.jpg',
        conflictAction: 'uniquify'
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ success: true, downloadId });
        }
      });
      return true; // Keep channel open for async response
    }
  }
});
