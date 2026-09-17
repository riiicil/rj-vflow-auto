/**
 * popup.js — Minimalist Toolbar Popup Logic & Connection Inspector
 * 
 * Inspects active tab platform URL and manages Studio HUD launching.
 * Adheres to Raycast Dark Precision design standards (ADR-002) and RJ AIO Metadata pattern.
 */

import { getConfig, getQueue, onChanged } from '../core/FlowStorage.js';

document.addEventListener('DOMContentLoaded', async () => {
  const btnLaunchOverlay = document.getElementById('btnLaunchOverlay');
  const platformStatusBadge = document.getElementById('platformStatusBadge');
  const statusIcon = document.getElementById('statusIcon');
  const statusText = document.getElementById('statusText');
  const platformWarningBanner = document.getElementById('platformWarningBanner');
  const platformConnectedBanner = document.getElementById('platformConnectedBanner');
  const btnNavigatePlatform = document.getElementById('btnNavigatePlatform');
  const btnToggleHud = document.getElementById('btnToggleHud');
  const btnOpenFlow = document.getElementById('btnOpenFlow');
  const telemetryEngine = document.getElementById('telemetryEngine');
  const telemetryPending = document.getElementById('telemetryPending');
  const telemetryDone = document.getElementById('telemetryDone');

  let activeTab = null;

  // 1. Update Telemetry from FlowStorage
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
        const pendingCount = queue.filter(
          it => it.status === 'pending' || it.status === 'injecting' || it.status === 'generating'
        ).length;
        telemetryPending.textContent = String(pendingCount);
      }

      if (telemetryDone) {
        const completedCount = queue.filter(it => it.status === 'completed').length;
        telemetryDone.textContent = String(completedCount);
      }
    } catch (e) {
      console.error('[RJ V-Flow Auto] [Popup] Failed to refresh telemetry', e);
    }
  }

  // 2. Inspect Active Browser Tab
  async function inspectActiveTab() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs || tabs.length === 0) {
        setDisconnectedUI();
        return;
      }

      activeTab = tabs[0];
      const url = activeTab.url || '';

      if (url.startsWith('https://flow.google.com/')) {
        setConnectedUI();
      } else {
        setDisconnectedUI();
      }
    } catch (err) {
      console.error('[RJ V-Flow Auto] [Popup] Tab query failed', err);
      setDisconnectedUI();
    }
  }

  function setConnectedUI() {
    if (platformStatusBadge) {
      platformStatusBadge.className = 'rj-status-badge rj-status-matched';
    }
    if (statusText) {
      statusText.textContent = 'Connected';
    }
    if (statusIcon) {
      statusIcon.innerHTML = '<polyline points="20 6 9 17 4 12"></polyline>';
    }

    if (platformWarningBanner) platformWarningBanner.style.display = 'none';
    if (platformConnectedBanner) platformConnectedBanner.style.display = 'flex';

    if (btnLaunchOverlay) btnLaunchOverlay.disabled = false;
    if (btnToggleHud) {
      btnToggleHud.disabled = false;
      btnToggleHud.style.display = 'inline-flex';
    }
    if (btnOpenFlow) btnOpenFlow.style.display = 'none';
  }

  function setDisconnectedUI() {
    if (platformStatusBadge) {
      platformStatusBadge.className = 'rj-status-badge rj-status-unmatched';
    }
    if (statusText) {
      statusText.textContent = 'Not Detected';
    }
    if (statusIcon) {
      statusIcon.innerHTML = '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>';
    }

    if (platformWarningBanner) platformWarningBanner.style.display = 'flex';
    if (platformConnectedBanner) platformConnectedBanner.style.display = 'none';

    if (btnLaunchOverlay) btnLaunchOverlay.disabled = true;
    if (btnToggleHud) {
      btnToggleHud.disabled = true;
      btnToggleHud.style.display = 'none';
    }
    if (btnOpenFlow) btnOpenFlow.style.display = 'inline-flex';
  }

  // 3. HUD Toggle Handler
  async function triggerToggleHUD() {
    if (!activeTab || !activeTab.id) return;

    try {
      await chrome.tabs.sendMessage(activeTab.id, { type: 'TOGGLE_HUD' });
      window.close();
    } catch (err) {
      console.warn('[RJ V-Flow Auto] [Popup] Content script not responding, attempting injection', err);
      try {
        await chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          files: ['content/content_loader.js']
        });
        setTimeout(async () => {
          try {
            await chrome.tabs.sendMessage(activeTab.id, { type: 'TOGGLE_HUD' });
          } catch (retryErr) {
            console.error('[RJ V-Flow Auto] [Popup] Retry toggle HUD failed', retryErr);
          }
          window.close();
        }, 250);
      } catch (injectErr) {
        console.error('[RJ V-Flow Auto] [Popup] Script injection failed', injectErr);
      }
    }
  }

  // 4. Open Google Flow Page Handler
  function navigateToFlow() {
    chrome.tabs.create({ url: 'https://flow.google.com/' });
    window.close();
  }

  // 5. Setup Listeners
  if (btnLaunchOverlay) {
    btnLaunchOverlay.addEventListener('click', triggerToggleHUD);
  }

  if (btnToggleHud) {
    btnToggleHud.addEventListener('click', triggerToggleHUD);
  }

  if (btnOpenFlow) {
    btnOpenFlow.addEventListener('click', navigateToFlow);
  }

  if (btnNavigatePlatform) {
    btnNavigatePlatform.addEventListener('click', (e) => {
      e.preventDefault();
      navigateToFlow();
    });
  }

  // 6. Initial Run & Reactive Telemetry Listener
  await inspectActiveTab();
  await refreshTelemetry();

  onChanged(() => {
    refreshTelemetry();
  });
});
