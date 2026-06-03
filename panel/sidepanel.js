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

*/


const STORAGE_KEY = "vflowPanel";
const IMAGE_STORAGE_KEY = "vflowPanelImages";

const DEFAULT_STATE = {
	mode: "text-image",
	ratio: "16:9",
	outputs: "1",
	model: "",
	downloadQuality: "max",
	downloadMode: "fast",
	promptSource: "manual",
	promptText: "",
	imagePromptText: ""
};

const MODEL_OPTIONS = [
	{ value: "🍌 Nano Banana Pro", label: "🍌 NB Pro", modes: ["text-image", "edit-image"] },
	{ value: "🍌 Nano Banana 2", label: "🍌 NB 2", modes: ["text-image", "edit-image"] },
	{ value: "Imagen 4", label: "Imagen 4", modes: ["text-image", "edit-image"] },
	{ value: "Veo 3.1 - Lite", label: "Veo 3.1 - L", modes: ["text-video", "img-to-vid"] },
	{ value: "Veo 3.1 - Fast", label: "Veo 3.1 - F", modes: ["text-video", "img-to-vid"] },
	{ value: "Veo 3.1 - Quality", label: "Veo 3.1 - Q", modes: ["text-video"] },
	{ value: "Omni Flash", label: "Omni Flash", modes: ["text-video", "img-to-vid"] }
];

const RATIO_OPTIONS = {
	image: [
		{ value: "16:9", label: "16:9" },
		{ value: "4:3", label: "4:3" },
		{ value: "1:1", label: "1:1" },
		{ value: "3:4", label: "3:4" },
		{ value: "9:16", label: "9:16" }
	],
	video: [
		{ value: "16:9", label: "Landscape" },
		{ value: "9:16", label: "Portrait" }
	]
};

const DOWNLOAD_OPTIONS = {
	"text-image": [
		{ value: "max", label: "Auto" },
		{ value: "1K", label: "1K Original" },
		{ value: "2K", label: "2K Upscaled" },
		{ value: "4K", label: "4K Upscaled" }
	],
	"edit-image": [
		{ value: "max", label: "Auto" },
		{ value: "1K", label: "1K Original" },
		{ value: "2K", label: "2K Upscaled" },
		{ value: "4K", label: "4K Upscaled" }
	],
	"text-video": [
		{ value: "max", label: "Auto" },
		{ value: "270p", label: "270p GIF" },
		{ value: "720p", label: "720p Original" },
		{ value: "1080p", label: "1080p Upscaled" },
		{ value: "4K", label: "4K Upscaled" }
	],
	"img-to-vid": [
		{ value: "max", label: "Auto" },
		{ value: "270p", label: "270p GIF" },
		{ value: "720p", label: "720p Original" },
		{ value: "1080p", label: "1080p Upscaled" },
		{ value: "4K", label: "4K Upscaled" }
	]
};

const panelState = { ...DEFAULT_STATE };
const imageQueue = [];

const elements = {
	modeSelect: document.getElementById("modeSelect"),
	ratioSelect: document.getElementById("ratioSelect"),
	outputSelect: document.getElementById("outputSelect"),
	modelSelect: document.getElementById("modelSelect"),
	modelGroup: document.getElementById("modelGroup"),
	downloadSelect: document.getElementById("downloadSelect"),
	downloadGroup: document.getElementById("downloadGroup"),
	downloadModeSelect: document.getElementById("downloadModeSelect"),
	promptSourceSelect: document.getElementById("promptSourceSelect"),
	promptSourceGroup: document.getElementById("promptSourceGroup"),
	promptSection: document.getElementById("textPromptSection"),
	promptDropzone: document.getElementById("promptDropzone"),
	promptTextarea: document.getElementById("promptTextarea"),
	promptBrowseBtn: document.getElementById("promptBrowseBtn"),
	promptFileInput: document.getElementById("promptFileInput"),
	assetPromptSection: document.getElementById("assetPromptSection"),
	imagePromptDropzone: document.getElementById("imagePromptDropzone"),
	imagePromptTextarea: document.getElementById("imagePromptTextarea"),
	imagePromptBrowseBtn: document.getElementById("imagePromptBrowseBtn"),
	imagePromptFileInput: document.getElementById("imagePromptFileInput"),
	imageSection: document.getElementById("imageAssetSection"),
	imageDropzone: document.getElementById("imageDropzone"),
	imageBrowseBtn: document.getElementById("imageBrowseBtn"),
	imageFileInput: document.getElementById("imageFileInput"),
	imageList: document.getElementById("imageList"),
	imageListActions: document.getElementById("imageListActions"),
	clearAssetsBtn: document.getElementById("clearAssetsBtn"),
	assetStatusMessage: document.getElementById("assetStatusMessage"),
	startButton: document.getElementById("startButton"),
	stopButton: document.getElementById("stopButton"),
	statusMessage: document.getElementById("statusMessage")
};

let automationStatus = {
	status: "idle",
	stopRequested: false,
	mode: panelState.mode
};

let statusClearTimer = null;
let imageControlsDisabled = false;

init();

async function init() {
	await restorePanelState();
	applyStateToUI();
	attachEventListeners();
	refreshModeSections();
	requestAutomationState();
	chrome.runtime.onMessage.addListener(handleRuntimeMessage);
}

function restorePanelState() {
	return new Promise((resolve) => {
		chrome.storage.local.get([STORAGE_KEY, IMAGE_STORAGE_KEY], async (data) => {
			const stored = data?.[STORAGE_KEY];
			if (stored) {
				Object.assign(panelState, DEFAULT_STATE, stored);
				const allowedModes = new Set(["text-image", "text-video", "img-to-vid", "edit-image"]);
				if (!allowedModes.has(panelState.mode)) {
					panelState.mode = "text-image";
				}
			}
			await restoreImageQueue(data?.[IMAGE_STORAGE_KEY] || []);
			resolve();
		});
	});
}

function savePanelState() {
	const { mode, ratio, outputs, model, downloadQuality, downloadMode, promptSource, promptText, imagePromptText } = panelState;
	chrome.storage.local.set({
		[STORAGE_KEY]: { mode, ratio, outputs, model, downloadQuality, downloadMode, promptSource, promptText, imagePromptText }
	});
}

function applyStateToUI() {
	elements.modeSelect.value = panelState.mode;
	refreshRatioOptions();
	elements.outputSelect.value = panelState.outputs;
	refreshModelOptions();
	refreshDownloadOptions();
	elements.downloadModeSelect.value = panelState.downloadMode;
	if (elements.promptSourceSelect) {
		elements.promptSourceSelect.value = panelState.promptSource;
	}
	elements.promptTextarea.value = panelState.promptText;
	if (elements.imagePromptTextarea) {
		elements.imagePromptTextarea.value = panelState.imagePromptText;
	}
	syncPromptOverlay();
	syncImagePromptOverlay();
	refreshImageList();
}

function attachEventListeners() {
	elements.modeSelect.addEventListener("change", () => {
		panelState.mode = elements.modeSelect.value;
		refreshRatioOptions();
		refreshModelOptions({ notify: true });
		refreshDownloadOptions();
		refreshModeSections();
		savePanelState();
	});

	elements.ratioSelect.addEventListener("change", () => {
		panelState.ratio = elements.ratioSelect.value;
		savePanelState();
	});

	elements.outputSelect.addEventListener("change", () => {
		panelState.outputs = elements.outputSelect.value;
		savePanelState();
	});

	elements.modelSelect.addEventListener("change", () => {
		panelState.model = elements.modelSelect.value;
		savePanelState();
	});

	elements.downloadSelect.addEventListener("change", () => {
		panelState.downloadQuality = elements.downloadSelect.value;
		savePanelState();
	});

	elements.downloadModeSelect.addEventListener("change", () => {
		panelState.downloadMode = elements.downloadModeSelect.value;
		savePanelState();
	});

	if (elements.promptSourceSelect) {
		elements.promptSourceSelect.addEventListener("change", () => {
			panelState.promptSource = elements.promptSourceSelect.value;
			refreshDisabledState();
			savePanelState();
		});
	}

	elements.promptTextarea.addEventListener("input", () => {
		panelState.promptText = elements.promptTextarea.value;
		syncPromptOverlay();
		savePanelState();
	});

	elements.promptBrowseBtn.addEventListener("click", () => {
		if (isUIBusy()) return;
		elements.promptFileInput.value = "";
		elements.promptFileInput.click();
	});

	elements.promptFileInput.addEventListener("change", async () => {
		const file = elements.promptFileInput.files?.[0];
		if (!file) return;
		const text = await file.text();
		elements.promptTextarea.value = text.trimEnd();
		panelState.promptText = elements.promptTextarea.value;
		syncPromptOverlay();
		savePanelState();
		showStatus(`Loaded ${countLines(panelState.promptText)} prompt line(s).`, "success");
	});

	if (elements.imagePromptTextarea) {
		elements.imagePromptTextarea.addEventListener("input", () => {
			panelState.imagePromptText = elements.imagePromptTextarea.value;
			syncImagePromptOverlay();
			applyPromptLinesToImages();
			refreshImageList();
			savePanelState();
			persistImageQueue();
		});
	}

	if (elements.imagePromptBrowseBtn) {
		elements.imagePromptBrowseBtn.addEventListener("click", () => {
			if (isUIBusy()) return;
			elements.imagePromptFileInput.value = "";
			elements.imagePromptFileInput.click();
		});
	}

	if (elements.imagePromptFileInput) {
		elements.imagePromptFileInput.addEventListener("change", async () => {
			const file = elements.imagePromptFileInput.files?.[0];
			if (!file) return;
			const text = await file.text();
			elements.imagePromptTextarea.value = text.trimEnd();
			panelState.imagePromptText = elements.imagePromptTextarea.value;
			syncImagePromptOverlay();
			applyPromptLinesToImages();
			refreshImageList();
			savePanelState();
			showAssetStatus(`Loaded ${countLines(panelState.imagePromptText)} asset prompt line(s).`, "success");
			persistImageQueue();
		});
	}

	if (elements.imageBrowseBtn) {
		elements.imageBrowseBtn.addEventListener("click", () => {
			if (isUIBusy()) return;
			elements.imageFileInput.value = "";
			elements.imageFileInput.click();
		});
	}

	if (elements.imageFileInput) {
		elements.imageFileInput.addEventListener("change", async () => {
			if (!elements.imageFileInput.files?.length) return;
			await addImages(Array.from(elements.imageFileInput.files));
		});
	}

	if (elements.imageDropzone) {
		elements.imageDropzone.addEventListener("dragover", (event) => {
			if (isUIBusy()) return;
			event.preventDefault();
			elements.imageDropzone.classList.add("drag-over");
		});

		elements.imageDropzone.addEventListener("dragleave", () => {
			elements.imageDropzone.classList.remove("drag-over");
		});

		elements.imageDropzone.addEventListener("drop", async (event) => {
			if (isUIBusy()) return;
			event.preventDefault();
			elements.imageDropzone.classList.remove("drag-over");
			const files = Array.from(event.dataTransfer.files || []).filter((f) => f.type.startsWith("image/"));
			if (files.length) {
				await addImages(files);
			}
		});

		elements.imageDropzone.addEventListener("click", (event) => {
			if (isUIBusy()) return;
			if (event.target.closest("button")) return;
			elements.imageFileInput.value = "";
			elements.imageFileInput.click();
		});
	}

	if (elements.clearAssetsBtn) {
		elements.clearAssetsBtn.addEventListener("click", () => {
			if (isUIBusy()) return;
			clearAllImages();
		});
	}

	elements.startButton.addEventListener("click", () => {
		if (isUIBusy()) return;
		startAutomation();
	});

	elements.stopButton.addEventListener("click", () => {
		if (automationStatus.status !== "running") return;
		requestStop();
	});
}

function refreshModeSections() {
	const mode = panelState.mode;
	const isTextMode = mode === "text-image" || mode === "text-video";
	const isAssetMode = mode === "img-to-vid" || mode === "edit-image";

	if (isAssetMode && panelState.promptSource !== "manual") {
		panelState.promptSource = "manual";
		if (elements.promptSourceSelect) {
			elements.promptSourceSelect.value = "manual";
		}
		savePanelState();
	}

	elements.promptSection.classList.toggle("d-none", !isTextMode);

	if (elements.assetPromptSection) {
		elements.assetPromptSection.classList.toggle("d-none", !isAssetMode);
	}
	if (elements.imageSection) {
		elements.imageSection.classList.toggle("d-none", !isAssetMode);
	}

	refreshDisabledState();
	syncPromptOverlay();
	syncImagePromptOverlay();
}


function syncPromptOverlay() {
	const hasValue = elements.promptTextarea.value.trim().length > 0;
	elements.promptDropzone.classList.toggle("has-value", hasValue);
}

function syncImagePromptOverlay() {
	if (!elements.imagePromptDropzone) return;
	const hasValue = elements.imagePromptTextarea.value.trim().length > 0;
	elements.imagePromptDropzone.classList.toggle("has-value", hasValue);
}

function refreshRatioOptions() {
	const mode = panelState.mode;
	const isVideoMode = mode === "text-video" || mode === "img-to-vid";
	const options = isVideoMode ? RATIO_OPTIONS.video : RATIO_OPTIONS.image;

	const previous = panelState.ratio;
	elements.ratioSelect.innerHTML = "";
	options.forEach((opt) => {
		const node = document.createElement("option");
		node.value = opt.value;
		node.textContent = opt.label;
		elements.ratioSelect.append(node);
	});

	const stillValid = options.some((opt) => opt.value === previous);
	if (stillValid && previous) {
		elements.ratioSelect.value = previous;
	} else {
		panelState.ratio = "16:9";
		elements.ratioSelect.value = "16:9";
	}
}

function refreshModelOptions({ notify = false } = {}) {
	const mode = panelState.mode;
	const allowed = MODEL_OPTIONS.filter((opt) => opt.modes.includes(mode));

	const previous = panelState.model;
	elements.modelSelect.innerHTML = "";
	allowed.forEach((opt) => {
		const node = document.createElement("option");
		node.value = opt.value;
		node.textContent = opt.label;
		elements.modelSelect.append(node);
	});

	const stillAllowed = allowed.some((opt) => opt.value === previous);
	if (stillAllowed && previous) {
		elements.modelSelect.value = previous;
		return;
	}

	panelState.model = allowed[0]?.value ?? "";
	elements.modelSelect.value = panelState.model;
	if (notify && panelState.model) {
		showStatus(`Model adjusted to ${panelState.model}`, "info");
	}
}

function refreshDownloadOptions() {
	const mode = panelState.mode;
	const options = DOWNLOAD_OPTIONS[mode] || DOWNLOAD_OPTIONS["text-image"];

	const previous = panelState.downloadQuality;
	elements.downloadSelect.innerHTML = "";
	options.forEach((opt) => {
		const node = document.createElement("option");
		node.value = opt.value;
		node.textContent = opt.label;
		elements.downloadSelect.append(node);
	});

	const stillValid = options.some((opt) => opt.value === previous);
	if (stillValid && previous) {
		elements.downloadSelect.value = previous;
		return;
	}

	panelState.downloadQuality = "max";
	elements.downloadSelect.value = "max";
}

function refreshDisabledState() {
	const running = automationStatus.status === "running";
	const stopPending = automationStatus.stopRequested;

	const isTextMode = panelState.mode === "text-image" || panelState.mode === "text-video";
	const isAssetMode = panelState.mode === "img-to-vid" || panelState.mode === "edit-image";
	const isRandom = panelState.promptSource === "random";

	elements.modeSelect.disabled = running;
	elements.ratioSelect.disabled = running;
	elements.outputSelect.disabled = running;
	elements.modelSelect.disabled = running;
	elements.downloadSelect.disabled = running;
	elements.downloadModeSelect.disabled = running;
	if (elements.promptSourceSelect && elements.promptSourceGroup) {
		const disabled = running || !isTextMode;
		elements.promptSourceSelect.disabled = disabled;
		elements.promptSourceGroup.style.opacity = disabled ? "0.4" : "1";
		elements.promptSourceGroup.style.filter = disabled ? "grayscale(100%)" : "none";
	}

	elements.promptTextarea.disabled = running || !isTextMode || isRandom;
	elements.promptBrowseBtn.disabled = running || !isTextMode || isRandom;
	elements.promptFileInput.disabled = running || isRandom;

	if (elements.imagePromptTextarea) {
		elements.imagePromptTextarea.disabled = running || !isAssetMode;
	}
	if (elements.imagePromptBrowseBtn) {
		elements.imagePromptBrowseBtn.disabled = running || !isAssetMode;
	}
	if (elements.imagePromptFileInput) {
		elements.imagePromptFileInput.disabled = running;
	}
	if (elements.imageBrowseBtn) {
		elements.imageBrowseBtn.disabled = running || !isAssetMode;
	}
	if (elements.imageFileInput) {
		elements.imageFileInput.disabled = running || !isAssetMode;
	}

	elements.startButton.disabled = running;
	elements.stopButton.disabled = !running || stopPending;

	elements.promptDropzone.classList.toggle("disabled", running || !isTextMode || isRandom);

	if (elements.imageDropzone) {
		elements.imageDropzone.classList.toggle("disabled", running || !isAssetMode);
	}
	if (elements.imagePromptDropzone) {
		elements.imagePromptDropzone.classList.toggle("disabled", running || !isAssetMode);
	}

	imageControlsDisabled = running || !isAssetMode;
	updateImageListInteractivity();
}

async function addImages(files) {
	const filtered = files.filter((f) => f.type.startsWith("image/"));
	if (!filtered.length) return;
	const prepared = [];
	for (const file of filtered) {
		try {
			const dataUrl = await fileToDataUrl(file);
			const thumbnailUrl = await createThumbnail(dataUrl);
			prepared.push({ file, dataUrl, thumbnailUrl });
		} catch (error) {
			console.warn("Failed to convert image", error);
		}
	}
	prepared.forEach(({ file, dataUrl, thumbnailUrl }) => {
		const id = crypto.randomUUID
			? crypto.randomUUID()
			: `img-${Date.now()}-${Math.random().toString(16).slice(2)}`;
		imageQueue.push({
			id, file,
			name: file.name,
			size: file.size,
			type: file.type,
			dataUrl,
			thumbnailUrl: thumbnailUrl || dataUrl,
			previewUrl: thumbnailUrl || dataUrl,
			hasFullImage: true,
			prompt: ""
		});
		saveImageFile(id, file); // Async store raw file to IndexedDB
	});
	applyPromptLinesToImages();
	refreshImageList();
	syncImagePromptOverlay();
	persistImageQueue();
	if (prepared.length) {
		showAssetStatus(`Added ${prepared.length} image(s).`, "success");
	}
}

function removeImage(id) {
	const index = imageQueue.findIndex((item) => item.id === id);
	if (index === -1) return;
	revokePreviewUrl(imageQueue[index]);
	imageQueue.splice(index, 1);
	applyPromptLinesToImages();
	refreshImageList();
	syncImagePromptOverlay();
	updateImagePromptTextareaFromQueue();
	persistImageQueue();
	deleteImageFile(id); // Async delete from IndexedDB
}

function clearAllImages() {
	if (!imageQueue.length) return;
	imageQueue.forEach(revokePreviewUrl);
	imageQueue.length = 0;
	refreshImageList();
	syncImagePromptOverlay();
	updateImagePromptTextareaFromQueue();
	persistImageQueue();
	clearAllImageFiles(); // Async clear IndexedDB
	showAssetStatus("Cleared image assets.", "warning");
}

function applyPromptLinesToImages() {
	const lines = splitLines(panelState.imagePromptText);
	imageQueue.forEach((item, index) => {
		item.prompt = lines[index] ?? "";
	});
}

function updateImagePromptTextareaFromQueue() {
	const combined = imageQueue.map((item) => item.prompt || "").join("\n").trimEnd();
	if (panelState.imagePromptText === combined) return;
	panelState.imagePromptText = combined;
	if (elements.imagePromptTextarea) {
		elements.imagePromptTextarea.value = combined;
	}
	syncImagePromptOverlay();
	savePanelState();
	persistImageQueue();
}

function refreshImageList() {
	if (!elements.imageList) return;
	elements.imageList.innerHTML = "";
	const hasImages = imageQueue.length > 0;
	elements.imageList.classList.toggle("d-none", !hasImages);
	if (elements.imageListActions) {
		elements.imageListActions.classList.toggle("d-none", !hasImages);
	}
	if (!hasImages) {
		updateImageListInteractivity();
		return;
	}

	elements.imageList.classList.remove("d-none");

	imageQueue.forEach((item, index) => {
		const entry = document.createElement("div");
		entry.className = "image-entry";
		entry.dataset.id = item.id;

		const thumb = document.createElement("img");
		thumb.className = "image-thumb";
		thumb.src = item.previewUrl || item.dataUrl || "";
		thumb.alt = item.name;

		const body = document.createElement("div");
		body.className = "flex-grow-1";

		const header = document.createElement("div");
		header.className = "image-entry-header";

		const title = document.createElement("span");
		title.className = "text-uppercase small text-muted";
		title.textContent = `Image ${index + 1}`;

		const removeBtn = document.createElement("button");
		removeBtn.type = "button";
		removeBtn.className = "btn btn-sm btn-outline-light btn-remove-image";
		removeBtn.textContent = "×";
		removeBtn.addEventListener("click", () => removeImage(item.id));

		header.append(title, removeBtn);

		const promptTextarea = document.createElement("textarea");
		promptTextarea.className = "form-control form-control-sm";
		promptTextarea.rows = 2;
		promptTextarea.placeholder = "Your prompt";
		promptTextarea.value = item.prompt;
		promptTextarea.addEventListener("input", () => {
			item.prompt = promptTextarea.value;
			updateImagePromptTextareaFromQueue();
		});

		body.append(header, promptTextarea);
		entry.append(thumb, body);
		elements.imageList.append(entry);
	});

	updateImageListInteractivity();
}

function updateImageListInteractivity() {
	if (!elements.imageList) return;
	const disableList = imageControlsDisabled || !imageQueue.length;
	elements.imageList.classList.toggle("disabled", disableList);
	elements.imageList.querySelectorAll("textarea").forEach((ta) => {
		ta.disabled = imageControlsDisabled;
	});
	elements.imageList.querySelectorAll(".btn-remove-image").forEach((btn) => {
		btn.disabled = imageControlsDisabled;
	});
	if (elements.clearAssetsBtn) {
		elements.clearAssetsBtn.disabled = imageControlsDisabled || !imageQueue.length;
	}
}

async function restoreImageQueue(serialized = []) {
	imageQueue.length = 0;
	for (const entry of serialized) {
		if (!entry || !entry.thumbnailUrl) continue;
		
		// Attempt to load raw file from IndexedDB
		const file = await getImageFile(entry.id);
		
		imageQueue.push({
			id: entry.id || (crypto.randomUUID ? crypto.randomUUID() : `img-${Date.now()}-${Math.random().toString(16).slice(2)}`),
			name: entry.name || "Image",
			size: entry.size ?? 0,
			type: entry.type || "image/png",
			prompt: entry.prompt || "",
			dataUrl: null,
			thumbnailUrl: entry.thumbnailUrl,
			previewUrl: entry.thumbnailUrl,
			hasFullImage: !!file,
			file: file || null
		});
	}
}

function serializeImageQueue() {
	return imageQueue
		.filter((item) => item?.thumbnailUrl)
		.map((item) => ({
			id: item.id,
			name: item.name,
			size: item.size,
			type: item.type,
			prompt: item.prompt || "",
			thumbnailUrl: item.thumbnailUrl
		}));
}

function persistImageQueue() {
	try {
		chrome.storage.local.set({ [IMAGE_STORAGE_KEY]: serializeImageQueue() }, () => {
			if (chrome.runtime.lastError) {
				console.warn("Image queue persistence failed:", chrome.runtime.lastError.message);
			}
		});
	} catch (err) {
		console.warn("Image queue persistence error:", err);
	}
}

function revokePreviewUrl(item) {
	if (item?.previewUrl && item.previewUrl.startsWith("blob:")) {
		try { URL.revokeObjectURL(item.previewUrl); } catch (_ignore) { }
	}
}

async function getImageDataUrl(item) {
	if (!item) return null;
	if (item.dataUrl) return item.dataUrl;
	if (item.file) {
		try {
			const dataUrl = await fileToDataUrl(item.file);
			item.dataUrl = dataUrl;
			item.previewUrl = dataUrl;
			return dataUrl;
		} catch (error) {
			console.warn("Failed to load image data", error);
		}
	}
	return null;
}

function fileToDataUrl(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result);
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(file);
	});
}

function createThumbnail(dataUrl, maxSize = 200) {
	return new Promise((resolve) => {
		const img = new Image();
		img.onload = () => {
			const canvas = document.createElement("canvas");
			let { width, height } = img;
			if (width > maxSize || height > maxSize) {
				const ratio = Math.min(maxSize / width, maxSize / height);
				width = Math.round(width * ratio);
				height = Math.round(height * ratio);
			}
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext("2d");
			ctx.drawImage(img, 0, 0, width, height);
			resolve(canvas.toDataURL("image/jpeg", 0.6));
		};
		img.onerror = () => resolve(null);
		img.src = dataUrl;
	});
}

function countLines(text) {
	if (!text.trim()) return 0;
	return text.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
}

function splitLines(text) {
	if (!text) return [];
	return text.split(/\r?\n/);
}

function isUIBusy() {
	return automationStatus.status === "running";
}

function showStatus(message, variant = "info") {
	clearTimeout(statusClearTimer);
	elements.statusMessage.textContent = message ?? "";
	elements.statusMessage.classList.remove("text-success", "text-warning", "text-danger");
	if (variant === "success") elements.statusMessage.classList.add("text-success");
	if (variant === "warning") elements.statusMessage.classList.add("text-warning");
	if (variant === "danger") elements.statusMessage.classList.add("text-danger");

	if (message && variant === "success") {
		statusClearTimer = setTimeout(() => {
			elements.statusMessage.textContent = "";
			elements.statusMessage.classList.remove("text-success");
			statusClearTimer = null;
		}, 5000);
	}
}

function showAssetStatus(message, variant = "info") {
	if (!elements.assetStatusMessage) return;
	elements.assetStatusMessage.textContent = message ?? "";
	elements.assetStatusMessage.classList.remove("text-success", "text-warning", "text-danger");
	if (variant === "success") elements.assetStatusMessage.classList.add("text-success");
	if (variant === "warning") elements.assetStatusMessage.classList.add("text-warning");
	if (variant === "danger") elements.assetStatusMessage.classList.add("text-danger");
}

async function startAutomation() {
	const payload = await buildPayload();
	if (!payload) return;
	const response = await sendMessage({ type: "flow:start", payload });
	if (!response?.ok) {
		showStatus(response?.reason ? `Unable to start: ${response.reason}` : "Unable to start automation.", "danger");
	} else {
		showStatus("Automation started.", "success");
	}
}

async function requestStop() {
	const response = await sendMessage({ type: "flow:stop" });
	if (!response?.ok) {
		showStatus(response?.reason ? `Unable to stop: ${response.reason}` : "Unable to stop automation.", "danger");
	} else {
	showStatus("Stop requested.", "warning");
	}
}

async function buildPayload() {
	const { mode, ratio, outputs, model, downloadQuality, downloadMode, promptSource, promptText } = panelState;

	if (mode === "text-image" || mode === "text-video") {
		const isRandom = promptSource === "random";
		const prompts = isRandom ? [] : sanitizePromptList(promptText);
		if (!isRandom && !prompts.length) {
			showStatus("Please provide at least one prompt.", "warning");
			return null;
		}
		return {
			mode, ratio,
			outputs: Number.parseInt(outputs, 10) || 1,
			model, downloadQuality, downloadMode, promptSource, prompts
		};
	}

	if (mode === "img-to-vid" || mode === "edit-image") {
		if (!imageQueue.length) {
			showStatus("Add at least one image asset.", "warning");
			return null;
		}
		const missingFull = imageQueue.filter((item) => !item.hasFullImage);
		if (missingFull.length) {
			showStatus(`${missingFull.length} image(s) need to be re-added (panel was reloaded).`, "warning");
			return null;
		}
		const missingPrompt = imageQueue
			.map((item, i) => (!item.prompt || !item.prompt.trim()) ? (i + 1) : null)
			.filter(Boolean);
		if (missingPrompt.length) {
			showStatus(`Image ${missingPrompt.join(", ")} missing prompt(s).`, "warning");
			return null;
		}
		const assets = await convertImageQueue(imageQueue);
		if (!assets.length) {
			showStatus("Unable to prepare image assets.", "danger");
			return null;
		}
		return {
			mode, ratio,
			outputs: Number.parseInt(outputs, 10) || 1,
			model, downloadQuality, downloadMode, assets
		};
	}

	showStatus("Unsupported mode.", "danger");
	return null;
}

function sanitizePromptList(text) {
	return text
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
}

async function convertImageQueue(list) {
	const results = [];
	for (const item of list) {
		try {
			const dataUrl = await getImageDataUrl(item);
			if (!dataUrl) continue;
			results.push({ dataUrl, name: item.name, prompt: item.prompt });
		} catch (error) {
			console.warn("Failed to convert image", error);
		}
	}
	return results;
}

function sendMessage(message) {
	return new Promise((resolve) => {
		chrome.runtime.sendMessage(message, (response) => {
			if (chrome.runtime.lastError) {
				console.warn("Panel message error", chrome.runtime.lastError);
				resolve(null);
				return;
			}
			resolve(response);
		});
	});
}

async function requestAutomationState() {
	const response = await sendMessage({ type: "flow:status-query" });
	if (response?.ok && response.state) {
		automationStatus = { ...automationStatus, ...response.state };
		refreshDisabledState();
	}
}

function handleRuntimeMessage(message) {
	if (!message?.type) return;

	if (message.type === "flow:state-changed") {
		automationStatus = { ...automationStatus, ...message.state };
		refreshDisabledState();
		return;
	}

	if (message.type === "flow:progress") {
		const payload = message.payload;
		if (!payload) return;
		showStatus(payload.message ?? "", payload.level ?? "info");
	}
}

// --- IndexedDB Storage Helper for raw image files ---
const DB_NAME = "vflowImageDB";
const DB_VERSION = 1;
const STORE_NAME = "images";

function openDB() {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.onupgradeneeded = (e) => {
			const db = e.target.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME, { keyPath: "id" });
			}
		};
		request.onsuccess = (e) => resolve(e.target.result);
		request.onerror = (e) => reject(e.target.error);
	});
}

async function saveImageFile(id, file) {
	try {
		const db = await openDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, "readwrite");
			const store = tx.objectStore(STORE_NAME);
			store.put({ id, file });
			tx.oncomplete = () => resolve(true);
			tx.onerror = (e) => reject(tx.error || e.target.error);
		});
	} catch (err) {
		console.warn("IndexedDB save error:", err);
		return false;
	}
}

async function getImageFile(id) {
	try {
		const db = await openDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, "readonly");
			const store = tx.objectStore(STORE_NAME);
			const request = store.get(id);
			request.onsuccess = () => resolve(request.result?.file || null);
			request.onerror = (e) => reject(request.error || e.target.error);
		});
	} catch (err) {
		console.warn("IndexedDB read error:", err);
		return null;
	}
}

async function deleteImageFile(id) {
	try {
		const db = await openDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, "readwrite");
			const store = tx.objectStore(STORE_NAME);
			store.delete(id);
			tx.oncomplete = () => resolve(true);
			tx.onerror = (e) => reject(tx.error || e.target.error);
		});
	} catch (err) {
		console.warn("IndexedDB delete error:", err);
		return false;
	}
}

async function clearAllImageFiles() {
	try {
		const db = await openDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, "readwrite");
			const store = tx.objectStore(STORE_NAME);
			store.clear();
			tx.oncomplete = () => resolve(true);
			tx.onerror = (e) => reject(tx.error || e.target.error);
		});
	} catch (err) {
		console.warn("IndexedDB clear error:", err);
		return false;
	}
}