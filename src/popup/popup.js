/**
 * popup.js — Minimalist Toolbar Popup Logic
 * Strictly implements blueprint State 1 and State 2 from bahan/vflow-note.md.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const stateConnected = document.getElementById('stateConnected');
  const stateDisconnected = document.getElementById('stateDisconnected');
  const btnOpenFlow = document.getElementById('btnOpenFlow');

  async function inspectTab() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = (tabs && tabs[0] && tabs[0].url) || '';

      if (url.startsWith('https://flow.google.com/')) {
        if (stateConnected) stateConnected.style.display = 'block';
        if (stateDisconnected) stateDisconnected.style.display = 'none';
      } else {
        if (stateConnected) stateConnected.style.display = 'none';
        if (stateDisconnected) stateDisconnected.style.display = 'block';
      }
    } catch (err) {
      console.warn('[RJ V-Flow Auto] [Popup] Tab inspect failed', err);
      if (stateConnected) stateConnected.style.display = 'none';
      if (stateDisconnected) stateDisconnected.style.display = 'block';
    }
  }

  if (btnOpenFlow) {
    btnOpenFlow.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://flow.google.com/' });
      window.close();
    });
  }

  await inspectTab();
});
