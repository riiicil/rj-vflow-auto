/*

RJ V-Flow Auto
Copyright (c) 2025 Riiicil
Licensed under the MIT License. See LICENSE file for details.


â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•— â–ˆâ–ˆâ•—â–ˆâ–ˆâ•—â–ˆâ–ˆâ•— â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•—â–ˆâ–ˆâ•—â–ˆâ–ˆâ•—
â–ˆâ–ˆâ•”â•â•â–ˆâ–ˆâ•—â–ˆâ–ˆâ•‘â–ˆâ–ˆâ•‘â–ˆâ–ˆâ•‘â–ˆâ–ˆâ•”â•â•â•â•â•â–ˆâ–ˆâ•‘â–ˆâ–ˆâ•‘
â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•”â•â–ˆâ–ˆâ•‘â–ˆâ–ˆâ•‘â–ˆâ–ˆâ•‘â–ˆâ–ˆâ•‘     â–ˆâ–ˆâ•‘â–ˆâ–ˆâ•‘
â–ˆâ–ˆâ•”â•â•â–ˆâ–ˆâ•—â–ˆâ–ˆâ•‘â–ˆâ–ˆâ•‘â–ˆâ–ˆâ•‘â–ˆâ–ˆâ•‘     â–ˆâ–ˆâ•‘â–ˆâ–ˆâ•‘
â–ˆâ–ˆâ•‘  â–ˆâ–ˆâ•‘â–ˆâ–ˆâ•‘â–ˆâ–ˆâ•‘â–ˆâ–ˆâ•‘â•šâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•—â–ˆâ–ˆâ•‘â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•—
â•šâ•â•  â•šâ•â•â•šâ•â•â•šâ•â•â•šâ•â• â•šâ•â•â•â•â•â•â•šâ•â•â•šâ•â•â•â•â•â•â•

!!DON'T REMOVE THIS COMMENT!!

*/

const automationState = {
	status: "idle",
	mode: "text-image",
	stopRequested: false
};

// Tracks which tabIds currently have a CDP debugger session attached.
// Attach once per automation run, detach when done — avoids interrupting
// reCAPTCHA network calls that Flow uses to validate each generate request.
const cdpSessions = new Set();

function normalizeDownloadFilename(filename, url) {
	const fallback = String(url || "").match(/\/([^/?#]+)(?:[?#]|$)/)?.[1] || "download";
	const name = String(filename || fallback);
	const normalized = name.replace(/\.(?:jfif|jpe|jpeg)(?=$|[?#])/i, ".jpg");
	if (/^RJ_[A-Z0-9]{6}_VF\.jpg$/i.test(normalized)) return normalized;
	if (/^flow_api_image/i.test(normalized) || /^data:image\//i.test(String(url || ""))) return randomDirectImageFilename();
	return normalized;
}

function randomDirectImageFilename() {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	const values = new Uint8Array(6);
	if (crypto?.getRandomValues) {
		crypto.getRandomValues(values);
	} else {
		for (let i = 0; i < values.length; i += 1) {
			values[i] = Math.floor(Math.random() * 256);
		}
	}
	const token = Array.from(values, (value) => chars[value % chars.length]).join("");
	return `RJ_${token}_VF.jpg`;
}

const LOG_PREFIX = "[RJ V-Flow]";
const FLOW_HOSTS = ["labs.google", "veo.genaipro.vn"];
const FLOW_URL_PATTERNS = [
	"*://*.labs.google/fx/*",
	"https://labs.google/fx/*",
	"*://veo.genaipro.vn/fx/*",
	"https://veo.genaipro.vn/fx/*"
];

chrome.runtime.onInstalled.addListener(() => {
	chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).then(() => {
		console.log(LOG_PREFIX, "Side panel configured to open on action click");
	}).catch((error) => {
		console.warn(LOG_PREFIX, "Side panel behavior setup failed:", error);
	});
});

chrome.action.onClicked.addListener(async (tab) => {
	if (chrome.sidePanel?.open) {
		try {
			await chrome.sidePanel.open({ windowId: tab.windowId });
			console.log(LOG_PREFIX, "Side panel opened from action", { tabId: tab.id });
		} catch (error) {
			console.warn(LOG_PREFIX, "Unable to open side panel:", error);
		}
	}
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (!message?.type) return;

	if (message.type === "flow:status-query") {
		sendResponse({ ok: true, state: automationState });
		return true;
	}

	if (message.type === "flow:state-update") {
		Object.assign(automationState, message.payload);
		chrome.runtime.sendMessage({ type: "flow:state-changed", state: automationState });
		sendResponse({ ok: true });
		return true;
	}

	if (message.type === "flow:progress") {
		chrome.runtime.sendMessage({ type: "flow:progress", payload: message.payload });
		sendResponse({ ok: true });
		return true;
	}

	if (message.type === "flow:start") {
		if (automationState.status === "running") {
			console.log(LOG_PREFIX, "Start request rejected: already running");
			sendResponse({ ok: false, reason: "running" });
			return true;
		}

		automationState.status = "running";
		automationState.stopRequested = false;
		automationState.mode = message.payload?.mode ?? automationState.mode;
		console.log(LOG_PREFIX, "Automation flagged as running", automationState);
		chrome.runtime.sendMessage({ type: "flow:state-changed", state: automationState });

		forwardToFlowTab({ type: "flow:start", payload: message.payload }).then((sent) => {
			if (!sent) {
				automationState.status = "idle";
				automationState.stopRequested = false;
				chrome.runtime.sendMessage({ type: "flow:state-changed", state: automationState });
				console.log(LOG_PREFIX, "Start message could not be delivered to tab");
				sendResponse({ ok: false, reason: "no-tab" });
				return;
			}
			console.log(LOG_PREFIX, "Start message forwarded to tab");
			sendResponse({ ok: true });
		});
		return true;
	}

	if (message.type === "flow:download") {
		const { url, filename } = message;
		if (!url) {
			sendResponse({ ok: false, reason: "no-url" });
			return true;
		}
		const normalizedFilename = normalizeDownloadFilename(filename, url);
		console.log(LOG_PREFIX, "Download requested", { filename: normalizedFilename, url: url.substring(0, 80) });
		try {
			chrome.downloads.download({
				url,
				filename: normalizedFilename || undefined,
				saveAs: false
			}, (downloadId) => {
				if (chrome.runtime.lastError) {
					console.warn(LOG_PREFIX, "Download failed", chrome.runtime.lastError);
					sendResponse({ ok: false, reason: chrome.runtime.lastError.message });
				} else {
					console.log(LOG_PREFIX, "Download started", { downloadId, filename: normalizedFilename });
					sendResponse({ ok: true, downloadId });
				}
			});
		} catch (error) {
			console.error(LOG_PREFIX, "Download error", error);
			sendResponse({ ok: false, reason: error?.message ?? "download-error" });
		}
		return true;
	}

	if (message.type === "flow:stop") {
		if (automationState.status !== "running") {
			console.log(LOG_PREFIX, "Stop request rejected: idle");
			sendResponse({ ok: false, reason: "idle" });
			return true;
		}
		automationState.stopRequested = true;
		console.log(LOG_PREFIX, "Stop requested", automationState);
		chrome.runtime.sendMessage({ type: "flow:state-changed", state: automationState });
		forwardToFlowTab({ type: "flow:stop" }).then((sent) => {
			console.log(LOG_PREFIX, "Stop message forwarded", { sent });
			sendResponse({ ok: true });
		});
		return true;
	}

	if (message.type === 'getTabId') {
		chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			if (tabs.length > 0) {
				sendResponse({ tabId: tabs[0].id });
			} else {
				sendResponse({ tabId: 0 });
			}
		});
		return true; // Required for async sendResponse
	}

	// Attach CDP session for the current automation run.
	// Called once by content.js at the start of runAutomation — not per-action.
	if (message.type === 'cdp:attach') {
		const tabId = sender.tab?.id;
		if (!tabId) {
			sendResponse({ ok: false, reason: 'no-tab-id' });
			return true;
		}
		const debuggee = { tabId };
		(async () => {
			try {
				if (!cdpSessions.has(tabId)) {
					await chrome.debugger.attach(debuggee, '1.3');
					cdpSessions.add(tabId);
					console.log(LOG_PREFIX, 'CDP session attached', { tabId });
				}
				sendResponse({ ok: true });
			} catch (e) {
				console.warn(LOG_PREFIX, 'CDP attach failed:', e?.message);
				sendResponse({ ok: false, reason: e?.message });
			}
		})();
		return true;
	}

	// Detach CDP session after automation run completes.
	if (message.type === 'cdp:detach') {
		const tabId = sender.tab?.id;
		if (!tabId) {
			sendResponse({ ok: false, reason: 'no-tab-id' });
			return true;
		}
		const debuggee = { tabId };
		(async () => {
			try {
				if (cdpSessions.has(tabId)) {
					await chrome.debugger.detach(debuggee);
					cdpSessions.delete(tabId);
					console.log(LOG_PREFIX, 'CDP session detached', { tabId });
				}
				sendResponse({ ok: true });
			} catch (e) {
				cdpSessions.delete(tabId);
				console.warn(LOG_PREFIX, 'CDP detach warning:', e?.message);
				sendResponse({ ok: true }); // non-fatal
			}
		})();
		return true;
	}

	if (message.type === 'cdp:action') {
		const tabId = sender.tab?.id;
		if (!tabId) {
			sendResponse({ ok: false, reason: 'no-tab-id' });
			return true;
		}
		if (!cdpSessions.has(tabId)) {
			// Session not attached — caller missed cdp:attach. Fail clearly.
			console.error(LOG_PREFIX, 'cdp:action called but no session attached for tab', tabId);
			sendResponse({ ok: false, reason: 'no-cdp-session' });
			return true;
		}
		const debuggee = { tabId };
		(async () => {
			try {
				const { action } = message;

				if (action === 'insertText') {
					const { x, y, text } = message;
					// Focus editor via click
					await cdpSend(debuggee, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', buttons: 0 });
					await sleep(50);
					await cdpSend(debuggee, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1, buttons: 1 });
					await cdpSend(debuggee, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1, buttons: 0 });
					await sleep(150);

					// Use Runtime.evaluate to manipulate Slate's internal state directly.
					// CDP Input events (insertText, keyDown/char) don't include targetRanges
					// in the beforeinput event, so Slate inserts at cursor instead of
					// replacing the current selection. Calling editor.deleteFragment() +
					// editor.insertText() via the React fiber is the only reliable path.
					const safeText = JSON.stringify(text ?? '');
					const script = `(() => {
						try {
							const dom = document.querySelector('[data-slate-editor="true"]');
							if (!dom) return JSON.stringify({ ok: false, reason: "no-dom" });
							const fk = Object.keys(dom).find(k => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance'));
							if (!fk) return JSON.stringify({ ok: false, reason: "no-fiber-key" });
							let fiber = dom[fk];
							let ed = null;
							for (let i = 0; fiber && i < 400; i++, fiber = fiber.return) {
								try {
									const p = fiber.memoizedProps || fiber.pendingProps || {};
									if (p.editor && Array.isArray(p.editor.children) && typeof p.editor.onChange === 'function') {
										ed = p.editor; break;
									}
								} catch(_) {}
							}
							if (!ed) return JSON.stringify({ ok: false, reason: "no-editor" });

							// Select all content dynamically
							try {
								const getFirstTextPath = (node, path = []) => {
									if (node && typeof node.text === 'string') return path;
									if (node && node.children && node.children.length > 0) {
										return getFirstTextPath(node.children[0], [...path, 0]);
									}
									return path;
								};

								const getLastTextPath = (node, path = []) => {
									if (node && typeof node.text === 'string') return { path, node };
									if (node && node.children && node.children.length > 0) {
										const idx = node.children.length - 1;
										return getLastTextPath(node.children[idx], [...path, idx]);
									}
									return { path, node };
								};

								const startPath = getFirstTextPath(ed);
								const { path: endPath, node: endNode } = getLastTextPath(ed);
								if (startPath.length > 0 && endPath.length > 0) {
									const start = { path: startPath, offset: 0 };
									const end = { path: endPath, offset: endNode ? endNode.text.length : 0 };
									ed.selection = { anchor: start, focus: end };
								}
							} catch (selErr) {
								// if selection failed, proceed with current selection if any
							}

							if (ed.selection && typeof ed.deleteFragment === 'function') {
								ed.deleteFragment();
							}

							const t = ${safeText};
							if (t && typeof ed.insertText === 'function') {
								ed.insertText(t);
							}
							return JSON.stringify({ ok: true });
						} catch(e) { return JSON.stringify({ ok: false, reason: e.message }); }
					})()`;

					const evalResult = await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
						expression: script, returnByValue: true, awaitPromise: false
					});
					const parsed = (() => { try { return JSON.parse(evalResult?.result?.value); } catch(_) { return null; } })();
					await sleep(200);
					sendResponse(parsed ?? { ok: false, reason: 'eval-parse-fail' });

				} else if (action === 'click') {
					const { x, y } = message;
					await simulateHover(debuggee, x, y);
					await cdpSend(debuggee, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1, buttons: 1 });
					await cdpSend(debuggee, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1, buttons: 0 });
					await sleep(50);
					sendResponse({ ok: true });

				} else if (action === 'pressEnter') {
					const { x, y } = message;
					// Click element to ensure focus
					await cdpSend(debuggee, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1, buttons: 1 });
					await cdpSend(debuggee, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1, buttons: 0 });
					await sleep(100);
					await cdpSend(debuggee, 'Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
					await cdpSend(debuggee, 'Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
					sendResponse({ ok: true });

				} else if (action === 'mouseMove') {
					// Idle mouse movement during generation wait — single move, no trail
					const { x, y } = message;
					await cdpSend(debuggee, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', buttons: 0 });
					sendResponse({ ok: true });

				} else {
					sendResponse({ ok: false, reason: 'unknown-action' });
				}
			} catch (err) {
				console.error(LOG_PREFIX, 'CDP action error:', err?.message);
				sendResponse({ ok: false, reason: err?.message });
			}
			// No detach here — session stays alive until cdp:detach is called.
		})();
		return true;
	}

});

// Safety net: if Chrome detaches the debugger externally (tab closed, user
// clicked 'Stop' on the banner, etc.), clean up cdpSessions accordingly.
chrome.debugger.onDetach.addListener((source, reason) => {
	if (source?.tabId && cdpSessions.has(source.tabId)) {
		cdpSessions.delete(source.tabId);
		console.log(LOG_PREFIX, 'CDP session externally detached', { tabId: source.tabId, reason });
	}
});

async function forwardToFlowTab(message) {
	try {
		const [active] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
		if (active?.id && matchesFlowUrl(active.url)) {
			chrome.tabs.sendMessage(active.id, message);
			console.log(LOG_PREFIX, "Message sent to active tab", { tabId: active.id, type: message.type });
			return true;
		}

		const [anyFlow] = await chrome.tabs.query({ url: FLOW_URL_PATTERNS });
		if (!anyFlow?.id) {
			console.log(LOG_PREFIX, "No Labs Flow tab available for message", message.type);
			return false;
		}
		chrome.tabs.sendMessage(anyFlow.id, message);
		console.log(LOG_PREFIX, "Message sent to background tab", { tabId: anyFlow.id, type: message.type });
		return true;
	} catch (error) {
		console.warn(LOG_PREFIX, "Forwarding message failed:", error);
		return false;
	}
}

function matchesFlowUrl(url) {
	if (!url) return false;
	try {
		const parsed = new URL(url);
		const hostnameMatches = FLOW_HOSTS.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`));
		return hostnameMatches && parsed.pathname.startsWith("/fx/");
	} catch (error) {
		return false;
	}
}

function cdpSend(debuggee, method, params) {
	return new Promise((resolve, reject) => {
		chrome.debugger.sendCommand(debuggee, method, params, (result) => {
			if (chrome.runtime.lastError) {
				reject(new Error(chrome.runtime.lastError.message));
			} else {
				resolve(result);
			}
		});
	});
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// Simulates hand tremor and pause right before a click
async function simulateHover(debuggee, x, y) {
	const microMoves = Math.floor(Math.random() * 3) + 2; // 2-4 micro moves
	for (let i = 0; i < microMoves; i++) {
		const jx = Math.round(x + (Math.random() - 0.5) * 6);
		const jy = Math.round(y + (Math.random() - 0.5) * 6);
		await cdpSend(debuggee, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x: jx, y: jy, button: 'none', buttons: 0 });
		await sleep(Math.floor(Math.random() * 21) + 30); // 30-50ms
	}
	// Final settle on target
	await cdpSend(debuggee, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', buttons: 0 });
	await sleep(Math.floor(Math.random() * 71) + 80); // 80-150ms pause before click
}

