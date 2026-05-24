/*

 RJ V-Flow Auto
 Copyright (c) 2025 Riiicil
 Licensed under the MIT License. See LICENSE file for details.

 
 ██████╗ ██╗██╗██╗ ██████╗██╗██╗
 ██╔══██╗██║██║██║██╔════╝██║██║
 ██████╔╝██║██║██║██║     ██║██║
 ██╔══██╗██║██║██║██║     ██║██║
 ██║  ██║██║██║██║╚██████╗██║███████╗
 ╚═╝  ╚═╝╚═╝╚═╝╚═╝ ╚═════╝╚═╝╚══════╝

 !!DON'T REMOVE THIS COMMENT!!

*/

// Content script for RJ V Flow Auto extension

const automation = {
	running: false,
	stopRequested: false,
	state: {
		status: "idle",
		mode: "text-image",
		stopRequested: false
	},
	runPromise: null
};

const LOG_PREFIX = "[RJ V-Flow]";
const FLOW_HOSTS = ["labs.google", "veo.genaipro.vn"];
const STEP_DELAY_MS = 500;
const CONTROL_DELAY_MS = 500;
const GENERATION_POLL_MS = 3000;
const GENERATION_TIMEOUT_MS = 600000;

let tabId = null;
chrome.runtime.sendMessage({ type: 'getTabId' }, (response) => {
  if (response && response.tabId) {
    tabId = parseInt(response.tabId, 10);
    console.log('[RJ V-Flow] Tab ID received:', tabId);
  } else {
    console.error('[RJ V-Flow] Failed to get tabId');
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (!message?.type) return;

	if (message.type === "flow:start") {
		console.log(LOG_PREFIX, "Received flow:start", { payload: message.payload });
		if (automation.running) {
			sendResponse({ ok: false, reason: "running" });
			return true;
		}

		automation.runPromise = runAutomation(message.payload)
			.then(() => ({ ok: true }))
			.catch((error) => ({ ok: false, reason: error?.message ?? "failed" }))
			.finally(() => {
				automation.runPromise = null;
			});

		automation.runPromise.then(sendResponse);
		return true;
	}

	if (message.type === "flow:stop") {
		console.log(LOG_PREFIX, "Received flow:stop request");
		if (!automation.running) {
			sendResponse({ ok: false, reason: "idle" });
			return true;
		}
		automation.stopRequested = true;
		updateState({ stopRequested: true });
		sendProgress({ message: "Stop requested.", level: "warning" });
		sendResponse({ ok: true });
		return true;
	}
});

async function runAutomation(payload) {
	try {
		const mode = payload?.mode ?? "text-image";
		console.log(LOG_PREFIX, "Automation starting", { mode, prompts: payload?.prompts?.length, assets: payload?.assets?.length });
		automation.running = true;
		automation.stopRequested = false;
		updateState({ status: "running", mode, stopRequested: false });

		await ensurePageReady();

		if (mode === "img-to-vid") {
			await runImgToVidLoop(payload);
		} else if (mode === "edit-image") {
			await runEditImageLoop(payload);
		} else {
			await runTextPromptLoop(payload);
		}

		if (automation.stopRequested) {
			sendProgress({ message: "Automation stopped by user.", level: "warning" });
		} else {
			sendProgress({ message: "All tasks completed!", level: "success" });
		}
	} catch (error) {
		if (error instanceof AutomationCancelledError) {
			sendProgress({ message: "Automation cancelled.", level: "warning" });
		} else {
			console.error(LOG_PREFIX, "Automation failed", error);
			sendProgress({ message: error?.message ?? "Unexpected error.", level: "danger" });
			throw error;
		}
	} finally {
		console.log(LOG_PREFIX, "Automation finished");
		automation.running = false;
		automation.stopRequested = false;
		updateState({ status: "idle", stopRequested: false });
	}
}

async function runTextPromptLoop(payload) {
	const prompts = Array.isArray(payload?.prompts) ? payload.prompts : [];
	if (!prompts.length) throw new Error("No prompts provided.");

	const downloadQuality = payload?.downloadQuality ?? "max";
	const outputCount = payload?.outputs ?? 1;
	const mode = payload?.mode ?? "text-image";

	for (let index = 0; index < prompts.length; index += 1) {
		checkForStop();
		sendProgress({ message: `Processing prompt ${index + 1} of ${prompts.length}.`, level: "info" });

		if (index === 0) {
			await delay(1500);
			await configureTileGridSettings();
			await configureSettings(payload);
		}

		// Give editor extra time to stabilize on first prompt (after settings menu closes)
		if (index === 0) await delay(500);

		const existingTileIds = snapshotTileIds();
		console.log(LOG_PREFIX, "Tile snapshot", { existingCount: existingTileIds.size });

		await setPromptText(prompts[index] ?? "");
		await delay(STEP_DELAY_MS);

		// Verify text landed — retry once with extra delay if editor is still empty
		const editor = getSlateEditor();
		const editorTextAfter = editor ? getEditorText(editor) : "";
		if (editorTextAfter.length === 0 && (prompts[index] ?? "").length > 0) {
			console.warn(LOG_PREFIX, "setPromptText: editor still empty after first attempt, retrying...");
			await delay(800);
			await setPromptText(prompts[index] ?? "");
			await delay(STEP_DELAY_MS);
		}

		// Guard: if text still not in editor, skip this prompt
		const editorTextFinal = editor ? getEditorText(editor) : "";
		if (editorTextFinal.length === 0 && (prompts[index] ?? "").length > 0) {
			console.warn(LOG_PREFIX, "setPromptText failed after retry — skipping this prompt");
			sendProgress({ message: `Prompt ${index + 1} skipped: could not insert text into editor.`, level: "warning" });
			continue;
		}

		try {
			await waitFor(() => {
				const btn = findGenerateButtonAny();
				return (btn && !isButtonDisabled(btn)) ? btn : null;
			}, { timeout: 3000 });
		} catch (_) {
			console.warn(LOG_PREFIX, "Generate button did not enable after text input — proceeding anyway");
		}

		checkForStop();
		await triggerGenerate({ prompt: prompts[index] ?? "", payload, outputCount, promptIndex: index, totalPrompts: prompts.length, existingTileIds });
		sendProgress({ message: `Prompt ${index + 1} submitted. Waiting for generation...`, level: "info" });

		const completedTileIds = await waitForGenerationComplete(existingTileIds, outputCount);
		checkForStop();

		if (completedTileIds.length > 0) {
			sendProgress({ message: `Downloading ${completedTileIds.length} result(s) for prompt ${index + 1}...`, level: "info" });
			await downloadNewResults(completedTileIds, mode, downloadQuality);
		} else {
			sendProgress({ message: `No successful results for prompt ${index + 1}.`, level: "warning" });
		}
		checkForStop();

		sendProgress({ message: `Prompt ${index + 1} done. ${index + 1}/${prompts.length} completed.`, level: "success" });

		await setPromptText("");
		await delay(STEP_DELAY_MS);
	}
}

async function runImgToVidLoop(payload) {
	const assets = Array.isArray(payload?.assets) ? payload.assets : [];
	if (!assets.length) {
		throw new Error("No image assets provided.");
	}

	const downloadQuality = payload?.downloadQuality ?? "max";
	const outputCount = payload?.outputs ?? 1;

	for (let index = 0; index < assets.length; index += 1) {
		checkForStop();
		const asset = assets[index];
		sendProgress({ message: `Processing image ${index + 1} of ${assets.length}...`, level: "info" });

		if (index === 0) {
			await configureTileGridSettings();
			await configureSettings(payload);
		}

		await clearUploadedImage();
		await delay(STEP_DELAY_MS);

		const previousUploadSrcs = snapshotUploadSrcs();

		await pasteImageToEditor(asset.dataUrl);
		await delay(STEP_DELAY_MS);

		const uploaded = await waitForImageUpload(previousUploadSrcs);
		if (!uploaded) {
			throw new Error(`Image ${index + 1} failed to upload. Stopping automation.`);
		}
		await delay(STEP_DELAY_MS);
		checkForStop();

		await setPromptText(asset.prompt || "");
		await delay(STEP_DELAY_MS);

		const existingTileIds = snapshotTileIds();
		console.log(LOG_PREFIX, "Existing tile IDs before generate", { count: existingTileIds.size });

		checkForStop();
		await triggerGenerate();
		sendProgress({ message: `Image ${index + 1} submitted. Waiting for generation...`, level: "info" });

		const completedTileIds = await waitForGenerationComplete(existingTileIds, outputCount);
		checkForStop();

		if (completedTileIds.length > 0) {
			sendProgress({ message: `Downloading ${completedTileIds.length} result(s) for image ${index + 1}...`, level: "info" });
			await downloadNewResults(completedTileIds, "img-to-vid", downloadQuality);
		} else {
			sendProgress({ message: `No successful results for image ${index + 1}.`, level: "warning" });
		}
		checkForStop();

		sendProgress({ message: `Image ${index + 1} done. ${index + 1}/${assets.length} completed.`, level: "success" });

		await setPromptText("");
		await delay(STEP_DELAY_MS);
	}
}

async function ensurePageReady() {
	console.log(LOG_PREFIX, "Checking Labs Flow environment");
	const onSupportedHost = FLOW_HOSTS.some((host) => location.hostname === host || location.hostname.endsWith(`.${host}`));
	if (!onSupportedHost) {
		throw new Error("Open Labs Flow (supported mirror) before starting automation.");
	}

	await waitFor(() => getSlateEditor(), { timeout: 15000 });
	console.log(LOG_PREFIX, "Page ready: Slate editor detected");
}

function getSlateEditor() {
	return document.querySelector('div[data-slate-editor="true"][role="textbox"]')
		|| document.querySelector('[data-slate-editor="true"][contenteditable="true"]')
		|| document.querySelector('[data-slate-editor="true"]')
		|| document.querySelector('[role="textbox"][contenteditable="true"]');
}

async function setPromptText(text) {
	console.log(LOG_PREFIX, "setPromptText called", { textLength: (text ?? "").length, preview: (text ?? "").slice(0, 40) });
	const editor = getSlateEditor();
	if (!editor) throw new Error("Prompt editor not found.");

	const editorRect = editor.getBoundingClientRect();
	const editorX = Math.round(editorRect.left + editorRect.width / 2);
	const editorY = Math.round(editorRect.top + editorRect.height / 2);

	if (!text) {
		// For clearing: click editor, Ctrl+A, Delete via CDP
		try {
			const clearResult = await chrome.runtime.sendMessage({
				type: 'cdp:action', action: 'insertText',
				x: editorX, y: editorY, text: ''
			});
			if (clearResult?.ok) {
				console.log(LOG_PREFIX, "setPromptText: CDP clear OK");
				await delay(200);
				return;
			}
		} catch (_) {}
		// Fallback: execCommand delete
		console.log(LOG_PREFIX, "setPromptText: clearing editor (empty text)");
		simulateClick(editor);
		await delay(150);
		editor.focus();
		await delay(100);
		const selAll = window.getSelection();
		const rAll = document.createRange();
		rAll.selectNodeContents(editor);
		selAll.removeAllRanges();
		selAll.addRange(rAll);
		await delay(50);
		document.execCommand("delete", false);
		editor.dispatchEvent(new Event("input", { bubbles: true }));
		await delay(200);
		return;
	}

	// Strategy 1: CDP insertText (isTrusted: true at browser level)
	try {
		const cdpResult = await chrome.runtime.sendMessage({
			type: 'cdp:action', action: 'insertText',
			x: editorX, y: editorY, text
		});
		if (cdpResult?.ok) {
			await delay(400);
			const currentText = getEditorText(editor);
			if (currentText.toLowerCase().includes(text.toLowerCase())) {
				console.log(LOG_PREFIX, "setPromptText: CDP insertText OK", { length: currentText.length });
				return;
			}
			console.warn(LOG_PREFIX, "setPromptText: CDP sent OK but text not verified in DOM, continuing anyway", { currentText });
			return;
		}
		console.warn(LOG_PREFIX, "setPromptText: CDP insertText failed", cdpResult?.reason);
	} catch (err) {
		console.warn(LOG_PREFIX, "setPromptText: CDP error", err?.message);
	}

	// Strategy 2: execCommand (fallback)
	simulateClick(editor);
	await delay(150);
	editor.focus();
	await delay(100);

	let leaf = editor.querySelector('[data-slate-leaf="true"]');
	if (!leaf) {
		leaf = editor.querySelector('[data-slate-node="text"]') || editor;
	}
	const textNode = leaf.firstChild || leaf;

	const selection = window.getSelection();
	const range = document.createRange();

	if (textNode && textNode.nodeType === Node.TEXT_NODE) {
		range.setStart(textNode, 0);
		range.setEnd(textNode, textNode.textContent.length);
	} else if (textNode) {
		range.selectNodeContents(textNode);
	} else {
		range.selectNodeContents(editor);
	}

	selection.removeAllRanges();
	selection.addRange(range);
	await delay(100);

	try {
		document.execCommand("insertText", false, text);
		editor.dispatchEvent(new Event("input", { bubbles: true }));
		await delay(350);

		const currentText = getEditorText(editor);
		if (currentText.toLowerCase().includes(text.toLowerCase())) {
			console.log(LOG_PREFIX, "setPromptText: insertText OK", { length: currentText.length });
			return;
		}
	} catch (err) {
		console.warn(LOG_PREFIX, "setPromptText: insertText failed", err);
	}

	// Strategy 3: paste simulation
	try {
		const clipboardData = new DataTransfer();
		clipboardData.setData("text/plain", text);
		editor.dispatchEvent(new ClipboardEvent("paste", {
			bubbles: true, cancelable: true, clipboardData
		}));
		await delay(350);
		const afterPaste = getEditorText(editor);
		if (afterPaste.length > 0) {
			console.log(LOG_PREFIX, "setPromptText: paste OK", { length: afterPaste.length });
			return;
		}
	} catch (_) {}

	editor.dispatchEvent(new InputEvent("beforeinput", {
		bubbles: true, cancelable: true, inputType: "insertText", data: text
	}));
	await delay(350);
}

function getEditorText(editor) {
	if (!editor) return "";
	const stringSpans = editor.querySelectorAll('[data-slate-string="true"]');
	if (stringSpans.length) {
		return Array.from(stringSpans).map((span) => span.textContent || "").join("");
	}
	const placeholder = editor.querySelector('[data-slate-placeholder="true"]');
	if (placeholder) {
		const placeholderText = placeholder.textContent || "";
		const fullText = (editor.textContent || "").replace(placeholderText, "").trim();
		return fullText;
	}
	return (editor.textContent || "").trim();
}

async function pasteImageToEditor(dataUrl) {
	if (!dataUrl) throw new Error("No image dataUrl provided.");
	console.log(LOG_PREFIX, "Pasting image to editor", { length: dataUrl.length });

	const editor = getSlateEditor();
	if (!editor) throw new Error("Slate editor not found for image paste.");

	window.focus();
	await delay(200);
	simulateClick(editor);
	await delay(200);
	editor.focus();
	await delay(300);

	const response = await fetch(dataUrl);
	const blob = await response.blob();
	const file = new File([blob], "image.png", { type: blob.type });
	try {
		const clipboardItem = new ClipboardItem({ [blob.type]: blob });
		await navigator.clipboard.write([clipboardItem]);
		console.log(LOG_PREFIX, "Image written to clipboard via Clipboard API");
	} catch (clipErr) {
		console.warn(LOG_PREFIX, "Clipboard API write failed (non-critical)", clipErr?.message);
	}

	const dt = new DataTransfer();
	dt.items.add(file);
	const pasteEvent = new ClipboardEvent("paste", {
		bubbles: true, cancelable: true, clipboardData: dt
	});
	editor.dispatchEvent(pasteEvent);
	await delay(500);
	console.log(LOG_PREFIX, "Image paste event dispatched");
}

function snapshotUploadSrcs() {
	const imgs = document.querySelectorAll('img[src*="media.getMediaUrlRedirect"]');
	const srcs = new Set();
	for (const img of imgs) {
		srcs.add(img.src);
	}
	return srcs;
}

async function waitForImageUpload(previousSrcs = new Set()) {
	console.log(LOG_PREFIX, "Waiting for new image upload...", { previousCount: previousSrcs.size });
	try {
		await waitFor(() => {
			const imgs = document.querySelectorAll('img[src*="media.getMediaUrlRedirect"]');
			for (const img of imgs) {
				if (!previousSrcs.has(img.src) && isElementVisible(img)) {
					return true;
				}
			}
			return false;
		}, { timeout: 30000 });
		console.log(LOG_PREFIX, "New image upload detected");
		return true;
	} catch (_timeout) {
		console.warn(LOG_PREFIX, "Image upload detection timed out");
		return false;
	}
}

// --- Edit image loop (upload image + generate image per asset) ---

async function runEditImageLoop(payload) {
	const assets = Array.isArray(payload?.assets) ? payload.assets : [];
	if (!assets.length) {
		throw new Error("No image assets provided.");
	}

	const downloadQuality = payload?.downloadQuality ?? "max";
	const outputCount = payload?.outputs ?? 1;

	for (let index = 0; index < assets.length; index += 1) {
		checkForStop();
		const asset = assets[index];
		sendProgress({ message: `Processing image ${index + 1} of ${assets.length}...`, level: "info" });

		// Configure tile grid + editor settings on first asset (IMAGE mode)
		if (index === 0) {
			await configureTileGridSettings();
			await configureSettings(payload);
		}

		// Clear any previously uploaded image (optional)
		await clearUploadedImage();
		await delay(STEP_DELAY_MS);

		// Snapshot existing upload indicator srcs BEFORE pasting
		const previousUploadSrcs = snapshotUploadSrcs();

		// Paste the image into the editor
		await pasteImageToEditor(asset.dataUrl);
		await delay(STEP_DELAY_MS);

		// Wait for a NEW image to upload (ignore old ones)
		const uploaded = await waitForImageUpload(previousUploadSrcs);
		if (!uploaded) {
			throw new Error(`Image ${index + 1} failed to upload. Stopping automation.`);
		}
		await delay(STEP_DELAY_MS);
		checkForStop();

		// Set prompt text (mandatory for edit-image)
		await setPromptText(asset.prompt || "");
		await delay(STEP_DELAY_MS);

		// SNAPSHOT: collect all existing tile IDs BEFORE generating
		const existingTileIds = snapshotTileIds();
		console.log(LOG_PREFIX, "Existing tile IDs before generate", { count: existingTileIds.size });

		checkForStop();
		await triggerGenerate();
		sendProgress({ message: `Image ${index + 1} submitted. Waiting for generation...`, level: "info" });

		// Wait for generation to complete
		const completedTileIds = await waitForGenerationComplete(existingTileIds, outputCount);
		checkForStop();

		// Download results
		if (completedTileIds.length > 0) {
			sendProgress({ message: `Downloading ${completedTileIds.length} result(s) for image ${index + 1}...`, level: "info" });
			await downloadNewResults(completedTileIds, "edit-image", downloadQuality);
		} else {
			sendProgress({ message: `No successful results for image ${index + 1}.`, level: "warning" });
		}
		checkForStop();

		sendProgress({ message: `Image ${index + 1} done. ${index + 1}/${assets.length} completed.`, level: "success" });

		// Clear prompt for next iteration
		await setPromptText("");
		await delay(STEP_DELAY_MS);
	}
}

// --- Page ready detection ---
async function clearUploadedImage() {
	const uploadedImg = document.querySelector('img[src*="media.getMediaUrlRedirect"]');
	if (!uploadedImg) {
		console.log(LOG_PREFIX, "No uploaded image to clear, skipping");
		return;
	}

	const card = uploadedImg.closest('button[data-card-open]') || uploadedImg.closest('div');
	if (card) {
		const parent = card.parentElement?.parentElement || card.parentElement;
		if (parent) {
			const cancelIcons = parent.querySelectorAll('i.google-symbols');
			for (const icon of cancelIcons) {
				if (sanitizeText(icon.textContent || "") === "cancel") {
					const cancelBtn = icon.closest('div') || icon.parentElement;
					if (cancelBtn) {
						console.log(LOG_PREFIX, "Clicking cancel to remove previous image");
						simulateClick(cancelBtn);
						await delay(500);
						return;
					}
				}
			}
		}
	}

	const allButtons = document.querySelectorAll('button');
	for (const btn of allButtons) {
		const spans = btn.querySelectorAll('span');
		for (const span of spans) {
			if (/clear\s*prompt/i.test(span.textContent || "")) {
				console.log(LOG_PREFIX, "Clicking Clear prompt button to remove image");
				simulateClick(btn);
				await delay(500);
				return;
			}
		}
	}

	console.log(LOG_PREFIX, "Cancel button not found, skipping clear (old image may auto-replace)");
}

async function configureTileGridSettings() {
	// Detect the settings button via the settings_2 icon — language-agnostic
	const isGridSettingsBtn = (btn) => {
		const iconText = getIconText(btn);
		return /\bsettings_2\b/.test(iconText);
	};

	const buttons = Array.from(document.querySelectorAll('button[aria-haspopup="menu"]'));
	const targetBtn = buttons.find(isGridSettingsBtn);

	if (!targetBtn) {
		console.log(LOG_PREFIX, "Tile grid settings button not found, skipping");
		return;
	}

	simulateClick(targetBtn);
	await delay(CONTROL_DELAY_MS);

	const menu = await waitFor(() => findSettingsMenu(), { timeout: 3000 });
	if (!menu) {
		console.warn(LOG_PREFIX, "Tile grid settings menu did not appear.");
		return;
	}

	await selectTab(menu, "grid", "mode");
	await delay(CONTROL_DELAY_MS);
	await selectTab(menu, "SMALL", "gridSize");
	await delay(CONTROL_DELAY_MS);
	await closeSettingsMenu(targetBtn);
	await delay(CONTROL_DELAY_MS);
}

async function configureSettings(payload) {
	const { mode, ratio, outputs, model } = payload;
	console.log(LOG_PREFIX, "Configuring settings", { mode, ratio, outputs, model });

	let settingsTrigger = null;
	try {
		settingsTrigger = await waitFor(() => getSettingsTrigger(), { timeout: 5000, interval: 200 });
	} catch (_ignore) {
	}
	if (!settingsTrigger) {
		console.warn(LOG_PREFIX, "Settings trigger not found. Visible menu buttons:",
			Array.from(document.querySelectorAll('button[aria-haspopup="menu"]'))
				.filter(isElementVisible).slice(0, 5)
				.map((b) => ({ text: sanitizeText(b.textContent || "").slice(0, 40), icon: getIconText(b) }))
		);
		throw new Error("Settings trigger button not found.");
	}

	simulateClick(settingsTrigger);
	await delay(CONTROL_DELAY_MS);

	const menu = await waitFor(() => findSettingsMenu(), { timeout: 5000 });
	if (!menu) {
		throw new Error("Settings menu did not appear.");
	}
	await delay(300);

	const targetMode = (mode === "text-image" || mode === "edit-image") ? "IMAGE" : "VIDEO";
	await selectTab(menu, targetMode, "mode");
	await delay(CONTROL_DELAY_MS);

	const ratioMap = {
		"16:9": "LANDSCAPE",
		"4:3": "LANDSCAPE_4_3",
		"1:1": "SQUARE",
		"3:4": "PORTRAIT_3_4",
		"9:16": "PORTRAIT"
	};
	const targetRatio = ratioMap[ratio] ?? "LANDSCAPE";
	await selectTab(menu, targetRatio, "ratio");
	await delay(CONTROL_DELAY_MS);

	const targetOutput = String(outputs || 1);
	await selectTab(menu, targetOutput, "output");
	await delay(CONTROL_DELAY_MS);

	if (model) {
		await selectModel(menu, model);
		await delay(CONTROL_DELAY_MS);
	}

	if (mode === "img-to-vid") {
		console.log(LOG_PREFIX, "Selecting Ingredients tab for img-to-vid");
		await selectTab(menu, "VIDEO_REFERENCES", "mode");
		await delay(CONTROL_DELAY_MS);
	}

	await closeSettingsMenu(settingsTrigger);
	await delay(CONTROL_DELAY_MS);
	const configuredSummary = getSettingsTrigger();
	const configuredSummaryText = sanitizeText(configuredSummary?.textContent || "");
	if (targetMode === "IMAGE" && /video/i.test(configuredSummaryText)) {
		console.warn(LOG_PREFIX, "Image settings may not be committed: summary still contains Video");
	}
	if (targetMode === "VIDEO" && /banana|imagen|nano/i.test(configuredSummaryText)) {
		console.warn(LOG_PREFIX, "Video settings may not be committed: summary still contains image model text");
	}
}

function getSettingsTrigger() {
	const candidates = Array.from(document.querySelectorAll('button[aria-haspopup="menu"]'));
	let modelOnlyFallback = null;
	let cropIconFallback = null;
	let anyVisibleMenuBtn = null;

	for (const button of candidates) {
		if (!isElementVisible(button)) continue;
		const text = sanitizeText(button.textContent || "");
		const iconText = getIconText(button);
		const loweredText = text.toLowerCase();
		const loweredIcon = iconText.toLowerCase();
		const isGridSettings = /\bsettings_2\b/.test(loweredIcon);
		const hasAspectIcon = /crop_|landscape|portrait|square/.test(loweredText) || /crop_|landscape|portrait|square/.test(loweredIcon);
		const hasOutputCount = /\d+\s*x\b/i.test(text) || /x\d/.test(loweredText);
		const hasModeLabel = loweredText.includes("image") || loweredText.includes("video");
		const isCropOrOutput = hasAspectIcon || hasOutputCount || hasModeLabel;
		const hasModelText = /banana|imagen|veo|nano|lite/i.test(text);

		if (!anyVisibleMenuBtn && !isGridSettings) anyVisibleMenuBtn = button;

		if (!isGridSettings && hasAspectIcon && hasOutputCount && (hasModelText || hasModeLabel)) {
			console.log(LOG_PREFIX, "Settings trigger matched (aspect+output+mode)", { text, icon: iconText });
			return button;
		}
		if (!isGridSettings && hasModelText && isCropOrOutput) {
			console.log(LOG_PREFIX, "Settings trigger matched (model+crop)", { text, icon: iconText });
			return button;
		}
		if (!isGridSettings && hasAspectIcon && !cropIconFallback) {
			cropIconFallback = button;
		}
		if (hasModelText && !modelOnlyFallback) {
			modelOnlyFallback = button;
		}
	}

	if (modelOnlyFallback) {
		return modelOnlyFallback;
	}
	if (cropIconFallback) {
		return cropIconFallback;
	}

	// Proximity fallback: find generate button then look for sibling menu button
	const generateBtn = findGenerateButton();
	if (generateBtn) {
		const parent = generateBtn.closest('div[class*="sc-"]');
		if (parent) {
			const siblingMenuBtn = parent.querySelector('button[aria-haspopup="menu"]');
			if (siblingMenuBtn && isElementVisible(siblingMenuBtn)) {
				return siblingMenuBtn;
			}
		}
	}

	if (anyVisibleMenuBtn) {
		return anyVisibleMenuBtn;
	}

	console.warn(LOG_PREFIX, "Settings trigger: no visible menu button found");
	return null;
}
function findSettingsMenu() {
	const wrappers = Array.from(document.querySelectorAll('[data-radix-popper-content-wrapper]'));
	for (const wrapper of wrappers) {
		if (!isElementVisible(wrapper)) continue;
		const menu = wrapper.querySelector('[role="menu"][data-radix-menu-content]');
		if (menu && isElementVisible(menu)) {
			const hasTabs = menu.querySelector('button[role="tab"]');
			if (hasTabs) return menu;
		}
	}

	const fallback = document.querySelector('.DropdownMenuContent[role="menu"][data-state="open"]');
	if (fallback && isElementVisible(fallback)) return fallback;

	return null;
}

async function closeSettingsMenu(trigger) {
	if (!trigger) return;

	const isOpen = trigger.getAttribute("aria-expanded") === "true" || trigger.getAttribute("data-state") === "open";
	if (!isOpen) return;

	simulateClick(trigger);
	await delay(300);

	try {
		await waitFor(() => {
			const state = trigger.getAttribute("data-state");
			const expanded = trigger.getAttribute("aria-expanded");
			return state === "closed" || expanded === "false";
		}, { timeout: 2000 });
	} catch (_ignore) {
		document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
		await delay(200);
	}
}

async function selectTab(menu, targetValue, settingType) {
	const tabs = Array.from(menu.querySelectorAll('button[role="tab"]'));
	if (!tabs.length) {
		console.warn(LOG_PREFIX, "No tabs found for", settingType);
		return;
	}

	let targetTab = null;

	for (const tab of tabs) {
		const text = sanitizeText(tab.textContent || "");
		const ariaControls = tab.getAttribute("aria-controls") || "";

		switch (settingType) {
			case "mode":
				if (ariaControls.includes(`-content-${targetValue}`) || ariaControls.includes(`-trigger-${targetValue}`)) {
					targetTab = tab;
				} else if (targetValue === "IMAGE" && /^image$/i.test(text.replace(/\s/g, ""))) {
					targetTab = tab;
				} else if (targetValue === "VIDEO" && /^video$/i.test(text.replace(/\s/g, ""))) {
					targetTab = tab;
				}
				break;

			case "gridSize":
				if (ariaControls.includes(`-content-${targetValue}`) || ariaControls.includes(`-trigger-${targetValue}`)) {
					targetTab = tab;
				} else if (text.trim() === targetValue || text.trim() === targetValue.charAt(0)) {
					targetTab = tab;
				}
				break;

			case "ratio":
				if (ariaControls.includes(`-content-${targetValue}`)) {
					targetTab = tab;
				} else if (targetValue === "LANDSCAPE" && /landscape/i.test(text)) {
					targetTab = tab;
				} else if (targetValue === "PORTRAIT" && /portrait/i.test(text)) {
					targetTab = tab;
				}
				break;

			case "output":
				if (ariaControls.includes(`-content-${targetValue}`)) {
					targetTab = tab;
				} else if (text === `x${targetValue}`) {
					targetTab = tab;
				}
				break;
		}

		if (targetTab) break;
	}

	if (!targetTab) {
		console.warn(LOG_PREFIX, "Target tab not found", { settingType, targetValue, available: tabs.map((t) => sanitizeText(t.textContent || "")) });
		return;
	}

	if (targetTab.getAttribute("data-state") === "active" || targetTab.getAttribute("aria-selected") === "true") {
		return;
	}

	simulateClick(targetTab);
	await delay(300);

	try {
		await waitFor(() => {
			return targetTab.getAttribute("data-state") === "active" || targetTab.getAttribute("aria-selected") === "true";
		}, { timeout: 2000 });
	} catch (_ignore) {
		console.warn(LOG_PREFIX, "Tab activation not confirmed", { settingType, targetValue });
	}
}

async function selectModel(menu, modelName) {
	const modelTrigger = menu.querySelector('button.sc-a0dcecfb-1[aria-haspopup="menu"]')
		|| Array.from(menu.querySelectorAll('button[aria-haspopup="menu"]')).find((button) => button.getAttribute("role") !== "tab");

	if (!modelTrigger) {
		console.warn(LOG_PREFIX, "Model dropdown trigger not found in menu");
		return;
	}

	const currentText = sanitizeText(modelTrigger.textContent || "");
	if (currentText.toLowerCase().includes(modelName.toLowerCase())) {
		return;
	}

	simulateClick(modelTrigger);
	await delay(CONTROL_DELAY_MS);

	let modelMenu = null;
	try {
		modelMenu = await waitFor(() => {
			const wrappers = Array.from(document.querySelectorAll('[data-radix-popper-content-wrapper]'));
			for (const wrapper of wrappers) {
				if (!isElementVisible(wrapper)) continue;
				const candidate = wrapper.querySelector('[role="menu"][data-state="open"] [role="menuitem"]');
				if (candidate) {
					return wrapper.querySelector('[role="menu"][data-state="open"]');
				}
			}
			return null;
		}, { timeout: 3000 });
	} catch (_ignore) {
		console.warn(LOG_PREFIX, "Model menu did not appear");
		return;
	}

	if (!modelMenu) {
		console.warn(LOG_PREFIX, "Model menu not resolved");
		return;
	}

	await delay(200);

	const items = Array.from(modelMenu.querySelectorAll('[role="menuitem"]'));
	const lowered = modelName.toLowerCase();
	const match = items.find((item) => {
		const text = sanitizeText(item.textContent || "").toLowerCase();
		return text.includes(lowered);
	});

	if (!match) {
		console.warn(LOG_PREFIX, "Model option not found", { modelName, available: items.map((i) => sanitizeText(i.textContent || "")) });
		return;
	}

	const clickTarget = match.querySelector("button") || match;
	simulateClick(clickTarget);
	await delay(CONTROL_DELAY_MS);
}

async function triggerGenerate(options = {}) {
	const button = findGenerateButton();
	if (!button) {
		console.warn(LOG_PREFIX, "Generate button not found");
		return false;
	}
	const rect = button.getBoundingClientRect();
	const btnX = Math.round(rect.left + rect.width / 2);
	const btnY = Math.round(rect.top + rect.height / 2);

	console.log(LOG_PREFIX, "Clicking generate button", {
		ariaDisabled: button.getAttribute("aria-disabled"),
		iconText: getIconText(button).trim()
	});

	// Strategy 1: CDP click (isTrusted: true)
	try {
		const cdpResult = await chrome.runtime.sendMessage({
			type: 'cdp:action', action: 'click',
			x: btnX, y: btnY
		});
		if (cdpResult?.ok) {
			console.log(LOG_PREFIX, "triggerGenerate: CDP click sent");
			await delay(800);
			return true;
		}
		console.warn(LOG_PREFIX, "triggerGenerate: CDP click failed", cdpResult?.reason);
	} catch (err) {
		console.warn(LOG_PREFIX, "triggerGenerate: CDP click error", err?.message);
	}

	// Strategy 2: CDP pressEnter on Slate editor
	const editor = getSlateEditor();
	if (editor) {
		const editorRect = editor.getBoundingClientRect();
		const editorX = Math.round(editorRect.left + editorRect.width / 2);
		const editorY = Math.round(editorRect.top + editorRect.height / 2);
		try {
			const enterResult = await chrome.runtime.sendMessage({
				type: 'cdp:action', action: 'pressEnter',
				x: editorX, y: editorY
			});
			if (enterResult?.ok) {
				console.log(LOG_PREFIX, "triggerGenerate: CDP pressEnter sent");
				await delay(800);
				return true;
			}
		} catch (err) {
			console.warn(LOG_PREFIX, "triggerGenerate: CDP pressEnter error", err?.message);
		}
	}

	await delay(500);
	return true;
}

function findGenerateButtonAny() {
	for (const button of document.querySelectorAll("button")) {
		if (button.closest('[role="menu"], [data-radix-popper-content-wrapper]')) continue;
		if (button.getAttribute("aria-haspopup") === "menu") continue;
		const icon = getIconText(button);
		if (/\b(add|add_2|add_circle|plus)\b/.test(icon)) continue;
		if (icon.includes("arrow_forward")) return button;
	}
	return null;
}

function findGenerateButton() {
  // Strategy 1: Look for button with arrow_forward icon near the prompt editor
  const allButtons = document.querySelectorAll('button');
  const editor = getSlateEditor();
  const editorRect = editor?.getBoundingClientRect();

  let bestButton = null;
  let bestScore = 0;

  for (const button of allButtons) {
    if (isButtonDisabled(button)) continue;
    if (button.closest('[role="menu"], [data-radix-popper-content-wrapper]')) continue;
    if (button.getAttribute('aria-haspopup') === 'menu') continue;

    const rect = button.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;

    const iconText = getIconText(button);
    // Explicitly ignore upload/add media buttons (which can have "Create" text but "add_2" or "add" icon)
    if (iconText.includes('add') || iconText.includes('plus')) continue;

    const text = sanitizeText(button.textContent || '');
    let score = 0;

    // Check for arrow_forward icon
    if (iconText.includes('arrow_forward')) score += 50;
    // Check for "Buat", "Create", or "Generate" text (supports English-localized mirrors)
    if (text.includes('Buat') || text.includes('Create') || text.includes('Generate')) score += 30;
    // Proximity to editor
    if (editorRect && rect.top >= editorRect.top - 150 && rect.left >= editorRect.left) score += 20;
    // Size check (generate button is usually square-ish)
    if (rect.width > 20 && rect.height > 20 && rect.width < 80 && rect.height < 80) score += 10;

    if (score > bestScore) {
      bestScore = score;
      bestButton = button;
    }
  }

  if (bestButton && bestScore >= 50) {
    console.log('[RJ V-Flow] Found generate button with score', bestScore);
    return bestButton;
  }

  // Strategy 2: Try specific class selector as fallback
  const classButtons = document.querySelectorAll('button.sc-e8425ea6-0, button[class*="arrow_forward"], button[class*="Buat"]');
  for (const button of classButtons) {
    if (!isButtonDisabled(button) && getIconText(button).includes('arrow_forward')) {
      return button;
    }
  }

  console.warn('[RJ V-Flow] No generate button found, best score was', bestScore);
  return null;
}

function isButtonDisabled(button) {
	return Boolean(button.disabled)
		|| button.getAttribute("aria-disabled") === "true"
		|| button.getAttribute("data-disabled") === "true"
		|| button.hasAttribute("disabled");
}

function describeButtonForLog(button) {
	const rect = button.getBoundingClientRect();
	return {
		text: sanitizeText(button.textContent || "").slice(0, 80),
		iconText: getIconText(button),
		ariaLabel: button.getAttribute("aria-label"),
		ariaDisabled: button.getAttribute("aria-disabled"),
		disabled: Boolean(button.disabled),
		rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) }
	};
}

async function clickButtonElement(button) {
	scrollIntoViewIfNeeded(button);

	// Strategy 1: React fiber direct onClick — bypasses isTrusted checks
	const reactClicked = triggerReactOnClick(button);
	if (reactClicked) {
		console.log(LOG_PREFIX, "clickButtonElement: React fiber onClick triggered");
		return;
	}

	// Strategy 2: Full pointer/mouse event sequence + .click()
	const rect = button.getBoundingClientRect();
	const clientX = rect.left + rect.width / 2;
	const clientY = rect.top + rect.height / 2;
	const pointerOptions = { bubbles: true, cancelable: true, clientX, clientY, screenX: clientX, screenY: clientY, pointerType: "mouse", pointerId: 1, isPrimary: true, buttons: 1 };
	const mouseOptions = { bubbles: true, cancelable: true, clientX, clientY, screenX: clientX, screenY: clientY, button: 0, buttons: 1 };
	button.dispatchEvent(new PointerEvent("pointerover", { ...pointerOptions, buttons: 0 }));
	button.dispatchEvent(new PointerEvent("pointerenter", { ...pointerOptions, bubbles: false, buttons: 0 }));
	button.dispatchEvent(new MouseEvent("mouseover", { ...mouseOptions, buttons: 0 }));
	button.dispatchEvent(new MouseEvent("mouseenter", { ...mouseOptions, bubbles: false, buttons: 0 }));
	button.dispatchEvent(new PointerEvent("pointerdown", pointerOptions));
	button.dispatchEvent(new MouseEvent("mousedown", mouseOptions));
	button.dispatchEvent(new PointerEvent("pointerup", pointerOptions));
	button.dispatchEvent(new MouseEvent("mouseup", mouseOptions));
	button.click();
	console.log(LOG_PREFIX, "clickButtonElement: DOM event sequence dispatched");
}

function triggerReactOnClick(element) {
	try {
		const fiberKey = Object.keys(element).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
		if (!fiberKey) return false;
		let fiber = element[fiberKey];
		while (fiber) {
			const handler = fiber.memoizedProps?.onClick || fiber.pendingProps?.onClick;
			if (typeof handler === 'function') {
				const rect = element.getBoundingClientRect();
				handler({
					type: 'click', target: element, currentTarget: element,
					clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2,
					preventDefault() {}, stopPropagation() {}, nativeEvent: { isTrusted: true },
					isTrusted: true, bubbles: true, cancelable: true
				});
				return true;
			}
			fiber = fiber.return;
		}
		return false;
	} catch (err) {
		console.warn(LOG_PREFIX, "triggerReactOnClick failed", err?.message);
		return false;
	}
}

function snapshotTileIds() {
	const tiles = document.querySelectorAll('[data-tile-id]');
	const ids = new Set();
	tiles.forEach((t) => ids.add(t.getAttribute("data-tile-id")));
	return ids;
}

function getNewTiles(existingIds) {
	const allTiles = document.querySelectorAll('[data-tile-id]');
	const seen = new Set();
	const newTiles = [];

	for (const tile of allTiles) {
		const id = tile.getAttribute("data-tile-id");
		if (id && !existingIds.has(id) && !seen.has(id)) {
			seen.add(id);
			newTiles.push(tile);
		}
	}
	return newTiles;
}

function getTileStatus(tile) {
	const outerTile = getTileOuter(tile);
	const contentLayers = outerTile.querySelectorAll('[style*="--blur-amount"], [style*="opacity"]');
	let contentLayer = null;
	for (const layer of contentLayers) {
		if (layer.getAttribute("style")) {
			contentLayer = layer;
			break;
		}
	}

	if (contentLayer) {
		const style = contentLayer.getAttribute("style") || "";

		let layerOpacity = 1;
		const opacityMatch = style.match(/opacity:\s*([\d.]+)/);
		if (opacityMatch) {
			layerOpacity = Number.parseFloat(opacityMatch[1]);
		}
		let blurAmount = 0;
		const blurMatch = style.match(/--blur-amount:\s*(\d+)/);
		if (blurMatch) {
			blurAmount = Number.parseInt(blurMatch[1], 10);
		}

		const tileId = tile.getAttribute("data-tile-id");
		const prevKey = `${tileId}:opacity`;
		const prevBlurKey = `${tileId}:blur`;
		const prevOpacity = getTileStatus._stateCache?.get(prevKey);
		const prevBlur = getTileStatus._stateCache?.get(prevBlurKey);
		if (prevOpacity !== layerOpacity || prevBlur !== blurAmount) {
			if (!getTileStatus._stateCache) getTileStatus._stateCache = new Map();
			getTileStatus._stateCache.set(prevKey, layerOpacity);
			getTileStatus._stateCache.set(prevBlurKey, blurAmount);
			console.log(LOG_PREFIX, "Tile layer changed", {
				tileId,
				layerOpacity,
				blurAmount
			});
		}

		if (layerOpacity < 0.5 || blurAmount > 0) {
			return "generating";
		}

		const hasImage = contentLayer.querySelector('img[src*="media.getMediaUrlRedirect"]');
		const hasVideo = contentLayer.querySelector('video[src]');
		if (hasImage || hasVideo) {
			return "complete";
		}

		const hasWarningIcon = /\bwarning\b/.test(getIconText(contentLayer));
		if (hasWarningIcon) {
			return "failed";
		}

		return "generating";
	}

	const hasImage = outerTile.querySelector('img[src*="media.getMediaUrlRedirect"]');
	const hasVideo = outerTile.querySelector('video[src]');
	if (hasImage || hasVideo) {
		return "complete";
	}

	return "generating";
}

async function waitForGenerationComplete(existingTileIds, expectedCount) {
	console.log(LOG_PREFIX, "Waiting for generation to complete", { existingCount: existingTileIds.size, expectedCount });
	const startTime = Date.now();

	try {
		await waitFor(() => {
			const newTiles = getNewTiles(existingTileIds);
			return newTiles.length > 0;
		}, { timeout: 30000 });
	} catch (_timeout) {
		console.warn(LOG_PREFIX, "Timed out waiting for new tiles to appear");
		sendProgress({ message: "Timed out waiting for generation to start.", level: "warning" });
		return [];
	}

	console.log(LOG_PREFIX, "New tile(s) detected, monitoring progress...");

	await delay(2000);

	while (Date.now() - startTime < GENERATION_TIMEOUT_MS) {
		checkForStop();

		const newTiles = getNewTiles(existingTileIds);
		if (newTiles.length === 0) {
			await delay(GENERATION_POLL_MS);
			continue;
		}

		let allDone = true;
		let completedCount = 0;
		let failedCount = 0;
		let generatingCount = 0;

		for (const t of newTiles) {
			const status = getTileStatus(t);
			if (status === "generating") {
				allDone = false;
				generatingCount++;
			} else if (status === "complete") {
				completedCount++;
			} else if (status === "failed") {
				failedCount++;
			}
		}

		const progress = `${completedCount} ✓ | ${failedCount} X | ${generatingCount} ⴵ`;
		sendProgress({ message: `Generating: ${progress}`, level: "info" });

		if (allDone) {
			// Double-confirm to avoid false positive from "Queued" state
			// (Queued tiles briefly show opacity:1 blur:0 then revert to generating)
			await delay(GENERATION_POLL_MS);
			const confirmTiles = getNewTiles(existingTileIds);
			let confirmedAllDone = true;
			for (const t of confirmTiles) {
				if (getTileStatus(t) === "generating") {
					confirmedAllDone = false;
					break;
				}
			}
			if (!confirmedAllDone) {
				console.log(LOG_PREFIX, "Generation appeared complete but tile reverted (Queued) — continuing to monitor...");
				await delay(GENERATION_POLL_MS);
				continue;
			}

			console.log(LOG_PREFIX, "Generation complete", { completedCount, failedCount, total: newTiles.length });
			sendProgress({ message: `Generation finished: ${completedCount} success, ${failedCount} failed.`, level: completedCount > 0 ? "success" : "warning" });

			return newTiles
				.filter((t) => getTileStatus(t) === "complete")
				.map((t) => t.getAttribute("data-tile-id"));
		}

		await delay(GENERATION_POLL_MS);
	}

	console.warn(LOG_PREFIX, "Generation wait timeout reached");
	sendProgress({ message: "Generation wait timed out. Downloading available results.", level: "warning" });

	const newTiles = getNewTiles(existingTileIds);
	return newTiles
		.filter((t) => getTileStatus(t) === "complete")
		.map((t) => t.getAttribute("data-tile-id"));
}

async function downloadNewResults(completedTileIds, mode, preferredQuality) {
	console.log(LOG_PREFIX, "Starting download", { count: completedTileIds.length, mode, preferredQuality });

	let downloadCount = 0;

	for (let i = 0; i < completedTileIds.length; i++) {
		checkForStop();
		const tileId = completedTileIds[i];

		const tileEl = findTileById(tileId);
		if (!tileEl) {
			console.warn(LOG_PREFIX, "Tile element not found", { tileId });
			continue;
		}

		sendProgress({ message: `Downloading ${i + 1}/${completedTileIds.length}...`, level: "info" });

		let downloaded = false;

		try {
			downloaded = await downloadViaMoreVert(tileEl, tileId, preferredQuality);
		} catch (menuError) {
			console.warn(LOG_PREFIX, "More_vert download failed, will try direct URL", { tileId, error: menuError?.message });
		}

		if (!downloaded) {
			try {
				await downloadViaDirectUrl(tileEl, tileId, mode);
				downloaded = true;
			} catch (dlError) {
				console.error(LOG_PREFIX, "Direct URL download also failed", { tileId, error: dlError?.message });
				sendProgress({ message: `Download failed for tile ${i + 1}: ${dlError?.message}`, level: "warning" });
			}
		}

		if (downloaded) downloadCount++;
		await delay(1500);
	}

	console.log(LOG_PREFIX, "Downloads complete", { downloadCount, total: completedTileIds.length });
}

function findTileById(tileId) {
	const all = Array.from(document.querySelectorAll(`[data-tile-id="${tileId}"]`)).filter(isElementVisible);
	return all.find((tile) => tile.querySelector("img, video")) || all[0] || null;
}

function findAllOpenMenus() {
	const menus = document.querySelectorAll('[role="menu"]');
	const results = [];
	for (const menu of menus) {
		const items = menu.querySelectorAll('[role="menuitem"]');
		if (isElementVisible(menu) && items.length > 0) {
			results.push(menu);
		}
	}
	return results;
}
function isResolutionMenu(menu) {
	const items = menu.querySelectorAll('[role="menuitem"]');
	if (!items.length) return false;
	for (const item of items) {
		const text = item.textContent || "";
		if (/\d+\s*[kKpP]|gif|original|upscaled|mp4/i.test(text)) return true;
	}
	return false;
}

async function downloadViaMoreVert(tileEl, tileId, preferredQuality) {
	const outerTile = getTileOuter(tileEl);

	const hoverTarget = outerTile.querySelector('[role="button"][aria-roledescription="draggable"]')
		|| outerTile.querySelector('.sc-bf04f0d9-0')
		|| outerTile;
	simulateHover(hoverTarget);
	await delay(1200);

	const innerContent = outerTile.querySelector('[class*="sc-5923b123-0"]')
		|| outerTile.querySelector('[class*="sc-c33d76e1-0"]')
		|| outerTile.querySelector('img, video');
	if (innerContent && innerContent !== hoverTarget) {
		simulateHover(innerContent);
		await delay(800);
	}

	const moreVertBtn = findMoreVertButton(outerTile);
	if (!moreVertBtn) {
		console.warn(LOG_PREFIX, "more_vert button did not appear after hover", { tileId });
		simulateHoverOut(hoverTarget);
		return false;
	}

	simulateClick(moreVertBtn);
	await delay(1000);

	const openMenus = findAllOpenMenus();

	let resolutionMenu = openMenus.find((m) => isResolutionMenu(m));

	if (!resolutionMenu) {
		const hasSubTrigger = (m) => m.querySelector('[role="menuitem"][aria-haspopup="menu"]') !== null;

		let contextMenu = openMenus.find(hasSubTrigger);

		if (!contextMenu) {
			try {
				contextMenu = await waitFor(() => {
					const menus = findAllOpenMenus();
					return menus.find(hasSubTrigger) || null;
				}, { timeout: 3000 });
			} catch (_timeout) {
				console.warn(LOG_PREFIX, "Context menu did not appear", { tileId });
				dismissAllMenus();
				return false;
			}
		}

		if (!contextMenu) {
			console.warn(LOG_PREFIX, "Context menu not resolved", { tileId });
			dismissAllMenus();
			return false;
		}

		const downloadItem = findDownloadMenuItem(contextMenu);
		if (!downloadItem) {
			console.warn(LOG_PREFIX, "Download option not found in context menu", { tileId });
			dismissAllMenus();
			return false;
		}

		resolutionMenu = await triggerRadixSubMenu(downloadItem);

		if (!resolutionMenu) {
			console.warn(LOG_PREFIX, "Resolution sub-menu did not appear after all attempts", { tileId });
			dismissAllMenus();
			return false;
		}
	}

	if (!resolutionMenu) {
		console.warn(LOG_PREFIX, "Resolution menu not resolved", { tileId });
		dismissAllMenus();
		return false;
	}

	await selectDownloadResolution(resolutionMenu, preferredQuality);
	await delay(1500);

	dismissAllMenus();
	return true;
}

async function triggerRadixSubMenu(downloadItem) {
	const rect = downloadItem.getBoundingClientRect();
	const centerX = rect.left + rect.width / 2;
	const centerY = rect.top + rect.height / 2;

	const startY = rect.top - 20;
	const steps = 5;
	for (let i = 0; i <= steps; i++) {
		const progress = i / steps;
		const currentY = startY + (centerY - startY) * progress;
		const moveOpts = {
			bubbles: true, cancelable: true, composed: true,
			clientX: centerX, clientY: currentY,
			screenX: centerX, screenY: currentY,
			pointerType: "mouse", pointerId: 1, isPrimary: true,
			movementX: 0, movementY: i === 0 ? 0 : (centerY - startY) / steps,
			button: -1, buttons: 0
		};
		downloadItem.dispatchEvent(new PointerEvent("pointermove", moveOpts));
		downloadItem.dispatchEvent(new MouseEvent("mousemove", moveOpts));

		if (i === 0) {
			downloadItem.dispatchEvent(new PointerEvent("pointerenter", {
				...moveOpts, bubbles: false, relatedTarget: downloadItem.parentElement
			}));
			downloadItem.dispatchEvent(new PointerEvent("pointerover", {
				...moveOpts, relatedTarget: downloadItem.parentElement
			}));
			downloadItem.dispatchEvent(new MouseEvent("mouseenter", {
				...moveOpts, bubbles: false, relatedTarget: downloadItem.parentElement
			}));
			downloadItem.dispatchEvent(new MouseEvent("mouseover", {
				...moveOpts, relatedTarget: downloadItem.parentElement
			}));
		}
		await delay(50);
	}

	await delay(1000);

	let result = findResolutionMenuNow();
	if (result) {
		return result;
	}

	downloadItem.focus();
	await delay(200);
	const arrowOpts = { key: "ArrowRight", code: "ArrowRight", keyCode: 39, bubbles: true, cancelable: true };
	downloadItem.dispatchEvent(new KeyboardEvent("keydown", arrowOpts));
	await delay(100);
	downloadItem.dispatchEvent(new KeyboardEvent("keyup", arrowOpts));
	await delay(800);

	result = findResolutionMenuNow();
	if (result) {
		return result;
	}

	const overlay = downloadItem.querySelector('[data-type="button-overlay"]');
	if (overlay) {
		simulateHover(overlay);
		await delay(1000);

		result = findResolutionMenuNow();
		if (result) {
			return result;
		}
	}

	simulateClick(downloadItem);
	await delay(1000);

	result = findResolutionMenuNow();
	if (result) {
		return result;
	}

	console.warn(LOG_PREFIX, "All sub-menu trigger strategies failed");
	return null;
}

function findResolutionMenuNow() {
	const menus = findAllOpenMenus();
	return menus.find((m) => isResolutionMenu(m)) || null;
}

function dismissAllMenus() {
	document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
}

async function downloadViaDirectUrl(tileEl, tileId, mode) {
	console.log(LOG_PREFIX, "Attempting direct URL download", { tileId });

	const outerTile = getTileOuter(tileEl);
	const mediaUrl = extractMediaUrl(outerTile);
	if (!mediaUrl) {
		throw new Error("No media URL found in tile");
	}

	const fullUrl = mediaUrl.startsWith("http") ? mediaUrl : `${window.location.origin}${mediaUrl}`;

	const isVideo = mode === "text-video" || outerTile.querySelector("video") !== null;
	const ext = isVideo ? "mp4" : "png";
	const timestamp = Date.now();
	const shortId = tileId.replace("fe_id_", "").substring(0, 8);
	const filename = `flow_${isVideo ? "video" : "image"}_${shortId}_${timestamp}.${ext}`;

	console.log(LOG_PREFIX, "Downloading direct URL", { tileId, filename });

	await sendMessageAsync({ type: "flow:download", url: fullUrl, filename });
}

function findMoreVertButton(outerTile) {
	const buttons = outerTile.querySelectorAll('button');
	for (const btn of buttons) {
		if (/\bmore_vert\b/.test(getIconText(btn)) && isElementVisible(btn)) {
			return btn;
		}
	}

	const allButtons = document.querySelectorAll('button');
	for (const btn of allButtons) {
		if (/\bmore_vert\b/.test(getIconText(btn)) && isElementVisible(btn)) {
			const tileRect = outerTile.getBoundingClientRect();
			const btnRect = btn.getBoundingClientRect();
			const overlap = !(btnRect.right < tileRect.left || btnRect.left > tileRect.right ||
				btnRect.bottom < tileRect.top || btnRect.top > tileRect.bottom);
			if (overlap) return btn;
		}
	}

	return null;
}
function findDownloadMenuItem(contextMenu) {
	// Search by download icon or text FIRST — more specific.
	// "Tambahkan ke adegan" also has aria-haspopup="menu" but is NOT the download item.
	const allItems = contextMenu.querySelectorAll('[role="menuitem"]');
	for (const item of allItems) {
		const iconText = getIconText(item);
		const text = sanitizeText(item.textContent || "").toLowerCase();
		if (/\bdownload\b/.test(iconText) || /download|unduh/.test(text)) return item;
	}
	// Fallback: first item with aria-haspopup="menu" (less reliable — may be wrong item)
	console.warn(LOG_PREFIX, "findDownloadMenuItem: no download icon/text match, falling back to aria-haspopup");
	return contextMenu.querySelector('[role="menuitem"][aria-haspopup="menu"]') || null;
}

async function selectDownloadResolution(subMenu, preferredQuality) {
	const items = Array.from(subMenu.querySelectorAll('[role="menuitem"]'));
	if (!items.length) {
		console.warn(LOG_PREFIX, "No download options found");
		return;
	}

	const options = items.map((item) => {
		const text = sanitizeText(item.textContent || "");
		const isDisabled = item.getAttribute("aria-disabled") === "true";
		const hasUpgrade = item.querySelector('[data-inner-slot]') !== null;
		return { element: item, text, isLocked: isDisabled || hasUpgrade };
	});

	const enabled = options.filter((o) => !o.isLocked);
	if (!enabled.length) {
		console.warn(LOG_PREFIX, "All options locked, trying first available");
		const first = options.find((o) => o.element.getAttribute("aria-disabled") !== "true");
		if (first) {
			const target = first.element.querySelector('button') || first.element;
			simulateClick(target);
		}
		return;
	}

	let selected = null;

	if (preferredQuality === "max") {
		selected = enabled[enabled.length - 1];
	} else {
		selected = enabled.find((o) => {
			const t = o.text.toLowerCase();
			return t.includes(preferredQuality.toLowerCase());
		});
		if (!selected) {
			selected = enabled[enabled.length - 1];
		}
	}

	if (selected) {
		const target = selected.element.querySelector('button') || selected.element;
		simulateClick(target);
		await delay(500);
	}
}

/**
 * Extract the media URL from a tile element.
 */
function extractMediaUrl(outerTile) {
	const img = outerTile.querySelector('img[alt="Generated image"], img[alt="Gambar yang dihasilkan"]');
	if (img && img.src) return img.src;

	const video = outerTile.querySelector('video[src]');
	if (video && video.src) return video.src;

	const anyImg = outerTile.querySelector('img[src*="media.getMediaUrlRedirect"]');
	if (anyImg) return anyImg.src;

	return null;
}

function getTileOuter(tile) {
	const tileId = tile?.getAttribute?.("data-tile-id");
	if (!tileId) return tile;
	const candidates = Array.from(document.querySelectorAll(`[data-tile-id="${tileId}"]`)).filter(isElementVisible);
	return candidates.sort((a, b) => {
		const ar = a.getBoundingClientRect();
		const br = b.getBoundingClientRect();
		return (br.width * br.height) - (ar.width * ar.height);
	})[0] || tile;
}

/**
 * Send a message to background and await response.
 */
function sendMessageAsync(message) {
	return new Promise((resolve, reject) => {
		chrome.runtime.sendMessage(message, (response) => {
			if (chrome.runtime.lastError) {
				reject(new Error(chrome.runtime.lastError.message));
				return;
			}
			if (response?.ok) {
				resolve(response);
			} else {
				reject(new Error(response?.reason ?? "Request failed"));
			}
		});
	});
}

function simulateHover(element) {
	if (!element) return;
	scrollIntoViewIfNeeded(element);
	const rect = element.getBoundingClientRect();
	const clientX = rect.left + rect.width / 2;
	const clientY = rect.top + rect.height / 2;

	const enterOpts = {
		bubbles: false, cancelable: false,
		clientX, clientY, screenX: clientX, screenY: clientY,
		relatedTarget: document.body,
		pointerType: "mouse", isPrimary: true
	};
	const overOpts = {
		bubbles: true, cancelable: true,
		clientX, clientY, screenX: clientX, screenY: clientY,
		relatedTarget: document.body,
		pointerType: "mouse", isPrimary: true
	};

	element.dispatchEvent(new PointerEvent("pointerenter", enterOpts));
	element.dispatchEvent(new PointerEvent("pointerover", overOpts));
	element.dispatchEvent(new MouseEvent("mouseenter", { ...enterOpts, bubbles: false }));
	element.dispatchEvent(new MouseEvent("mouseover", overOpts));
	element.dispatchEvent(new PointerEvent("pointermove", { ...overOpts, movementX: 1, movementY: 1 }));
	element.dispatchEvent(new MouseEvent("mousemove", { ...overOpts, movementX: 1, movementY: 1 }));
}

function simulateHoverOut(element) {
	if (!element) return;
	const rect = element.getBoundingClientRect();
	const clientX = rect.left - 10;
	const clientY = rect.top - 10;

	element.dispatchEvent(new MouseEvent("mouseout", { bubbles: true, clientX, clientY, relatedTarget: document.body }));
	element.dispatchEvent(new MouseEvent("mouseleave", { bubbles: false, clientX, clientY, relatedTarget: document.body }));
	element.dispatchEvent(new PointerEvent("pointerout", { bubbles: true, clientX, clientY, relatedTarget: document.body, pointerType: "mouse" }));
	element.dispatchEvent(new PointerEvent("pointerleave", { bubbles: false, clientX, clientY, relatedTarget: document.body, pointerType: "mouse" }));
}

function getIconText(element) {
	return sanitizeText(Array.from(element.querySelectorAll("i, span.material-icons, span.google-symbols, .google-symbols")).map((icon) => icon.textContent || "").join(" "));
}

function sanitizeText(text) {
	return (text ?? "").replace(/\s+/g, " ").trim();
}

function isElementVisible(element) {
	if (!element || !document.body.contains(element)) {
		return false;
	}
	const rect = element.getBoundingClientRect();
	if (rect.width <= 0 || rect.height <= 0) {
		return false;
	}
	const style = window.getComputedStyle(element);
	if (!style) return false;
	const opacity = Number.parseFloat(style.opacity || "1");
	return style.display !== "none" && style.visibility !== "hidden" && opacity > 0.01;
}

function simulateClick(target) {
	if (!target) return;
	const clickable = target.querySelector('[data-type="button-overlay"]') || target;
	scrollIntoViewIfNeeded(clickable);
	const rect = clickable.getBoundingClientRect();
	const clientX = rect.left + rect.width / 2;
	const clientY = rect.top + rect.height / 2;
	const pointerOptions = { bubbles: true, cancelable: true, clientX, clientY, screenX: clientX, screenY: clientY, pointerType: "mouse", pointerId: 1, isPrimary: true, buttons: 1 };
	const mouseOptions = { bubbles: true, cancelable: true, clientX, clientY, screenX: clientX, screenY: clientY, button: 0, buttons: 1 };
	try {
		clickable.dispatchEvent(new PointerEvent("pointerdown", pointerOptions));
		clickable.dispatchEvent(new MouseEvent("mousedown", mouseOptions));
		clickable.dispatchEvent(new PointerEvent("pointerup", pointerOptions));
		clickable.dispatchEvent(new MouseEvent("mouseup", mouseOptions));
		clickable.dispatchEvent(new MouseEvent("click", mouseOptions));
	} catch (error) {
		console.warn(LOG_PREFIX, "simulateClick fallback", error?.message);
		clickable.click();
	}
}

function scrollIntoViewIfNeeded(element) {
	if (!element || typeof element.scrollIntoView !== "function") return;
	try {
		element.scrollIntoView({ block: "center", inline: "center" });
	} catch (_ignore) {
		try {
			element.scrollIntoView();
		} catch (_ignore2) {
		}
	}
}

function checkForStop() {
	if (automation.stopRequested) {
		throw new AutomationCancelledError();
	}
}

class AutomationCancelledError extends Error {
	constructor() {
		super("cancelled");
		this.name = "AutomationCancelled";
	}
}

function updateState(partial) {
	automation.state = { ...automation.state, ...partial };
	chrome.runtime.sendMessage({ type: "flow:state-update", payload: automation.state });
}

function sendProgress(payload) {
	chrome.runtime.sendMessage({ type: "flow:progress", payload });
}

function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitFor(predicate, options = {}) {
	const { timeout = 10000, interval = 200 } = options;
	const start = Date.now();

	return new Promise((resolve, reject) => {
		const tick = () => {
			try {
				const value = predicate();
				if (value) {
					resolve(value);
					return;
				}
				if (Date.now() - start >= timeout) {
					reject(new Error("waitFor timeout"));
					return;
				}
				setTimeout(tick, interval);
			} catch (error) {
				reject(error);
			}
		};
		tick();
	});
}


