/**
 * popup.js — Minimalist Toolbar Popup Logic & Connection Inspector
 * 
 * Inspects active tab platform URL and manages Studio HUD launching.
 * Adheres to Raycast Dark Precision design standards (ADR-002).
 */

import { getConfig, getQueue, onChanged } from '../core/FlowStorage.js';

document.addEventListener('DOMContentLoaded', async () => {
  const statusCard = document.getElementById('statusCard');
  const statusLabel = document.getElementById('statusLabel');
  const statusDesc = document.getElementById('statusDescription');
  const btnToggleHud = document.getElementById('btnToggleHud');
  const btnOpenFlow = document.getElementById('btnOpenFlow');
  const telemetryEngine = document.getElementById('telemetryEngine');
  const telemetryPending = document.getElementById('telemetryPending');
  const telemetryDone = document.getElementById('telemetryDone');

  let activeTab = null;

  // 1. Update Telemetry from Storage
  async function refreshTelemetry() {
    try {
      const cfg = await getConfig();
      const queue = await getQueue();

      if (telemetryEngine) {
        const isRunning = cfg.activeBatch && cfg.activeBatch.isRunning;
        const isPaused = cfg.activeBatch && cfg.activeBatch.isPaused;
        if (isPaused) {
          telemetryEngine.textContent = 'Paused';
          telemetryEngine.style.color = 'var(--rj-accent-yellow)';
        } else if (isRunning) {
          telemetryEngine.textContent = 'Running';
          telemetryEngine.style.color = 'var(--rj-accent-green)';
        } else {
          telemetryEngine.textContent = 'Idle';
          telemetryEngine.style.color = 'var(--rj-text-muted)';
        }
      }

      if (telemetryPending) {
        const pendingCount = queue.filter(it => it.status === 'pending' || it.status === 'injecting' || it.status === 'generating').length;
        telemetryPending.textContent = String(pendingCount);
      }

      if (telemetryDone) {
        const completedCount = queue.filter(it => it.status === 'completed').length;
        telemetryDone.textContent = String(completedCount);
      }
    } catch (e) {
      console.error('[Popup] Failed to refresh telemetry', e);
    }
  }

  // 2. Inspect Active Browser Tab
  async function inspectActiveTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) {
      setDisconnectedUI('No active tab detected.');
      return;
    }

    activeTab = tabs[0];
    const url = activeTab.url || '';

    if (url.startsWith('https://flow.google.com/')) {
      setConnectedUI();
    } else {
      setDisconnectedUI('Active tab is not Google Flow.');
    }
  }

  function setConnectedUI() {
    statusCard.className = 'status-card status-connected';
    statusLabel.textContent = 'Google Flow Connected';
    statusDesc.textContent = 'Studio HUD is ready to automate on this tab.';

    btnToggleHud.disabled = false;
    btnToggleHud.style.display = 'flex';
    btnOpenFlow.style.display = 'none';
  }

  function setDisconnectedUI(reason) {
    statusCard.className = 'status-card status-disconnected';
    statusLabel.textContent = 'Not on Google Flow';
    statusDesc.textContent = reason || 'Navigate to flow.google.com to launch Studio HUD.';

    btnToggleHud.disabled = true;
    btnToggleHud.style.display = 'none';
    btnOpenFlow.style.display = 'flex';
  }

  // 3. Setup Button Event Handlers
  if (btnToggleHud) {
    btnToggleHud.addEventListener('click', async () => {
      if (!activeTab || !activeTab.id) return;

      try {
        await chrome.tabs.sendMessage(activeTab.id, { type: 'TOGGLE_HUD' });
        window.close();
      } catch (err) {
        console.warn('[Popup] Content script not responding, attempting injection', err);
        // If content script was not injected, inject content_main.js
        try {
          await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            files: ['content/content_loader.js']
          });
          setTimeout(async () => {
            await chrome.tabs.sendMessage(activeTab.id, { type: 'TOGGLE_HUD' });
            window.close();
          }, 200);
        } catch (injectErr) {
          console.error('[Popup] Script injection failed', injectErr);
        }
      }
    });
  }

  if (btnOpenFlow) {
    btnOpenFlow.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://flow.google.com/' });
      window.close();
    });
  }

  // 4. Initial Run & Reactive Listener
  await inspectActiveTab();
  await refreshTelemetry();

  onChanged(() => {
    refreshTelemetry();
  });
});
