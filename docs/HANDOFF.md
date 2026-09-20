# Agent Handoff Guide — RJ V-Flow Auto (Next-Gen v3.0)

> **Purpose**: Essential operational context, in-flight state, platform gotchas, and immediate instructions for incoming AI agents resuming work.

---

## 1. Immediate Operational State
- **Current Milestone**: Phase 3 (Dual-Mode UI Implementation) — [COMPLETE]
- **Active Branch**: `task/dual-mode-ui`
- **Latest Commit**: Pending (`feat(hud): always visible row status badge parameter badges and video output multiplier support`)
- **Working Tree**: Clean (all modules verified syntax-valid)
- **Build / Test State**: Verified healthy, all 18 JS modules passing syntax validation (`node --check`), dual row badges (live params badge + always-visible status badge with pre-run READY vs NOT READY states) verified, percentage progress stripped from badges, and video output multiplier x1-x4 support unhidden across HUD and QueueManager.

---

## 2. Active In-Flight Context

Phase 1 (Cleanup & Governance Foundation) was successfully completed and merged into `dev` (`7838930`).
Phase 2 (Core Automation Engine & Services) was successfully completed across all 5 sub-phases and merged into `dev` (`c14ca68`).
Phase 3 (Dual-Mode UI Implementation) active progress:
1. **Sub-phase 3.1 & 3.2 Complete (`ce3a4cb`, `7750ffe`)**: Design tokens, minimalist popup, Shadow DOM HUD host, and draggable floating pill.
2. **Sub-phase 3.3 & 3.4 Complete (`f808156`, `bbd613a`)**: Two-column studio layout, QueueManager controls, and reactive telemetry.
3. **Session 14–16 Blueprint Realignment Complete (`06f1cbd`, `768870f`, `83c66a4`)**: Exact blueprint popup, unified start/stop button, and high-contrast styling.
4. **Commit 1 Complete (Session 17, `3dbba27`)**:
   - `src/core/FlowDOM.js`: Added master resilient selectors (`SETTINGS_2_BUTTON`, `GRID_LAYOUT_TOGGLE`, `GRID_SIZE_M_TOGGLE`, `CLEAR_PROMPT_SWITCH`, `ERROR_TILE`) and ligatures (`WARNING`, `DELETE`, `DASHBOARD`). Enhanced `query()` and `queryAll()` with safe `:has-text("...")` pseudo-selector resolution. Implemented `isCardGenerationFailed()` identifying genuine failure elements (`<flow-error-tile>`, `warning` ligature, `.error-tile`, `.failed`, `.blurred-error`).
   - `src/services/FlowWatcherService.js`: Implemented the 4-State Lifecycle protocol (`PENDING_RENDERING`, `BLANK_TRANSITION`, `DEFINITIVE_SUCCESS`, `DEFINITIVE_FAILURE`). Fixed false generation failure bug by introducing a 10-second grace timer for the transient blank phase between progress bar disappearance and media element attachment.
5. **Commit 2 Complete (Session 18, `28c8428`)**:
   - `src/services/FlowSettingsService.js`: Implemented `setupHeaderGridAndClearPrompt()` automating `settings_2` popover, Grid mode, Size M, and clear-prompt switch verification with dedicated pacing delays. Added sequential pacing pauses across `applySettings()` (mode, model, aspect ratio, duration, output multiplier, popover open/close). Supported row-specific parameters directly via `applySettings(itemParams)`.
   - `src/services/FlowPromptService.js`: Added 350ms pre-submit settle delay and 600ms post-generate pacing delay.
   - `src/services/FlowDownloadService.js` & `src/services/FlowActionService.js`: Enforced strict 800ms - 1000ms delay between batch tile downloads. Added `FlowActionService.js` alias re-export.
   - `src/core/FlowDOM.js`: Exported centralized `sleep(ms)` asynchronous pacing utility.
6. **Commit 3 Complete (Session 19, `6cde988`)**:
   - `src/styles/components.css`: Refactored `.rj-segment-btn.active` to use `color: #14b8a6;` and aligned `.rj-platform-link:hover`. Enforced `line-height: 1;` on `.rj-btn` and child spans, `display: block;` on button SVGs, and adjusted `.rj-segment-btn` padding to `0 10px; height: 28px; line-height: 1;` for exact vertical font dead-centering.
   - `src/overlay/overlay.css`: Standardized toolbar icon hover strokes to `var(--rj-accent-cyan, #079183)`. Standardized `#btnSaveQueue` and `#btnStartQueue` in HUD footer to identical geometry (`height: 30px; min-width: 78px; box-sizing: border-box; border-radius: var(--rj-radius-sm, 6px);`).
   - `src/overlay/CustomSelect.js`: Evaluated available space against `.hud-sidebar-scroll` or `.hud-window` container, triggering upward `.dropup` when `spaceBelow < 170px`, eliminating menu clipping at the bottom of the Studio HUD sidebar.
7. **Commit 4 Complete (Session 20, `d608e5e`)**:
   - `src/core/FlowImageDB.js`: Implemented native IndexedDB storage engine (`vflowImageDB`, store `images`) with `saveImage()`, `getImage()`, `getImageBlob()`, `deleteImage()`, `clearImages()`, and `cleanupUnreferenced()`. Stores high-resolution image binaries locally under unique UUIDs, immune to Chrome's 5MB `chrome.storage.local` quota.
   - `src/core/FlowStorage.js`: Added `sanitizeQueueForStorage()` to strip heavy Base64 data URLs when `imageId` is present, protecting extension storage integrity.
   - `src/overlay/FlowHUDHost.js`: Fixed Chromium asynchronous event nullification bug (`TypeError: Cannot read properties of null (reading 'files')`) by capturing `file` and `fileName` synchronously in change/drop handlers. Persisted images to `flowImageDB`, implemented database deletion cleanup on row/thumbnail removal, and hydrated previews on `init()` using `URL.createObjectURL`.
   - `src/core/QueueManager.js`: Resolved raw `Blob`/`File` binaries directly from `flowImageDB.getImage(imageId)` during `processItem()`.
   - `src/overlay/FlowHUDTemplates.js`: Handled frame slot objects `{ imageId, dataUrl }` safely in `renderQueueRow`.

8. **Commit 5 Complete (Session 21, `e66a385`)**:
   - `src/overlay/FlowHUDTemplates.js`: Purged Close (`x`) button from window header controls, keeping only Minimize (`—`). Redesigned queue toolbar with Select All checkbox (`#chkSelectAllQueue`), `Set params:` parameter mode custom select (`Batch` vs `Single`), conditional bulk delete trash button (`#btnBulkDeleteQueue`, default `display: none`), sort mode toggle button (`#btnToggleSortMode`), and primary `+ Add Row` button (`#btnAddQueueRow`). Purged `Paste`, `Import CSV`, file input, and `Clear All`. Updated empty dropzone copy to *"Drop images or prompt TXT here"*. Redesigned queue row items: replaced row numbers with `.row-select-handle` (`.row-select-checkbox` and `.row-drag-handle`), completely removed individual row delete buttons. Added `#sidebarSinglePlaceholder` in `.hud-col-right` for Single mode empty row selection.
   - `src/overlay/overlay.css`: Implemented Raycast Dark Precision `.rj-checkbox` (15x15px, `#079183` accent check/indeterminate mark), styled toolbar param mode dropdown (`height: 26px`), bulk trash button, sort mode active state (`#14b8a6` color and soft cyan background), row select handle, grab/dragging visual states, and single mode sidebar placeholder.
9. **Commit 6 Complete (Session 22, `a4430e2`)**:
   - `src/overlay/FlowHUDHost.js`: Wired multi-select bulk delete (`#chkSelectAllQueue`, `.row-select-checkbox`, `#btnBulkDeleteQueue`) with automatic `FlowImageDB` cascading image binary deletion. Implemented sort mode HTML5 drag-and-drop reordering with `#btnToggleSortMode`, `.is-sorting` states, and precision array splicing. Wired `Set params:` parameter mode switching between `Batch` (global controls) and `Single` mode (hiding sidebar controls when 0 rows checked to show `#sidebarSinglePlaceholder`, and synchronizing controls specifically to selected row objects). Purged obsolete toolbar paste, CSV import, quick paste, and individual row delete listeners.
   - `src/overlay/FlowHUDTemplates.js`: Purged dead `#btnQuickPasteClipboard` button from `renderEmptyDropzone()`.
   - `src/core/FlowStorage.js`: Added `paramMode: 'batch'` default to `DEFAULT_CONFIG` and `migrateSchema`.
10. **Commit 7 Complete (Session 23, `be187e7`)**:
    - `src/core/QueueManager.js`: Executed `setupHeaderGridAndClearPrompt()` and `ensureAgentModeOff()` strictly **once** at the beginning of `QueueManager.runLoop()`. Orchestrated parameter branching: in `Batch` mode, `applySettings(batchConfig)` runs once before the loop and prompt settings popover is skipped during item iterations; in `Single` mode, each item's specific configuration is read and applied on every loop cycle. Added pure text ingredient clearing to prevent cross-prompt contamination, and item-specific resolution downloads passing `item.resolution || cfg.targetResolution || defaultRes` to `downloadBatchTiles()`.
11. **Session 24 Fix Complete (Commit 8, `HEAD`)**:
    - `src/core/FlowDOM.js`: Refactored `CLEAR_PROMPT_SWITCH` to eliminate generic switch fallback. Implemented `getTileMediaSource(tileElement)` prioritizing `<video>` element blob sources over empty thumbnail image placeholders. Enhanced `isCardGenerationSuccess(tileElement)` with visible progress bar evaluation and definitive media verification.
    - `src/services/FlowSettingsService.js`: Refactored `findClearPromptSwitch()` with text matching, `ink_eraser` ligature matching, and positional 4th-switch targeting to eliminate accidental "Sound on hover" activation. Completely removed fast-path bypass (`isSettingsMatching()`) from `applySettings()` to unconditionally inspect and apply settings inside the popover. Enhanced `selectMediaMode()` with resilient Image/Video button queries and auto-aligned mode with target model family (`IMAGE_MODELS` -> `TEXT_TO_IMAGE`, `VIDEO_MODELS` -> `TEXT_TO_VIDEO`) to prevent model lookup failures like "Nano Banana Pro not found in menu".
    - `src/services/FlowWatcherService.js`: Integrated `getTileMediaSource()`, prioritized definitive success evaluation, added progress bar visibility checks, and supported flat tiles in Grid view to resolve the 180s generation timeout issue.
12. **Session 25 Fix Complete (Commit 9, `HEAD`)**:
    - `src/services/FlowWatcherService.js` & `src/core/QueueManager.js`: Parsed live generation percentage from `<div class="loading-percentage">XX%</div>` inside `<flow-pending-tile>`. Refactored `getBatchTileElements()` to isolate primary card tiles and avoid counting nested `<flow-pending-tile>` children as separate tiles. Computed batch aggregate percentage averaging across all tiles when output count > 1 (`Math.min(100, Math.round(sumTilePercent / total))`).
    - `src/services/FlowIngredientService.js`: Eliminated unwanted popover menu triggers by removing synthetic clicks on `button.empty-chip` / add triggers. Ingested references via native paste/drop events and verified upload completion via `<flow-soupy-overlay>` removal, `aria-busy === 'false'`, and valid `img.chip-image` URL before generation.
    - `src/services/FlowDownloadService.js`: Refactored resolution selection to match against `span.label` (`1080p`, `4K`, `720p`, etc.) ignoring captions. Implemented locked option detection and fallback to the highest available enabled resolution (e.g. 1080p for video, 2K for image) on free accounts. Enabled sequential batch downloading across all successful output tiles with 1000ms pacing and HUD progress updates (`DOWNLOADING (1/4)`).
    - `src/overlay/FlowHUDHost.js`, `src/overlay/FlowHUDTemplates.js`, `src/overlay/overlay.css`: Added container click and textarea focus row activation for Single Mode with `.row-active` cyan accent styling. Elevated dark mode contrast tokens (canvas `#0c0e12`, surface `#12151b`, elevated `#161920`, card `#1a1e26`, border `#262c36`, body `#e3e6ec`) and increased typography sizes (textarea 13.5px, badges 10px, labels 12px).
13. **Session 26 Fix Complete (Commit 10, `f9a649d`)**:
    - `src/styles/variables.css` & `src/overlay/overlay.css`: Fixed `.rj-checkbox` geometry with 16x16px sizing, `--rj-radius-sm: 4px`, and SVG viewBox 16x16 with `stroke-width: 2`, achieving subpixel dead-centering on all monitor DPI scalings.
    - `src/overlay/FlowHUDHost.js`: Implemented complete desktop selection engine supporting normal click (exclusive single select), direct checkbox click (individual toggle), `Shift + Click` (range selection), `Ctrl / Cmd + Click` (multi-select toggle), and Select All checkbox sync. Added conditional disabling of the Sort button when rows are selected (`disabled = true`, `is-disabled`, `pointer-events: none; opacity: 0.35;`). Routed all unchecking through `this.updateSelectionUI()`.
    - `src/overlay/CustomSelect.js`: Implemented `_isOptionVisible()` and fallback logic inside `_buildOptions()` so when switching generation modes, if the currently selected option belongs to a hidden optgroup, the dropdown automatically falls back to the first visible option and resets `selectedIndex`, preventing hidden models/resolutions from displaying on the trigger button.
    - `src/overlay/FlowHUDTemplates.js`: Updated resolution option labeling to exact specifications: Video (`720p (Original size)`, `1080p (Upscaled)`, `4k (Upscaled)`) and Image (`1k (Original size)`, `2k (Upscaled)`, `4k (Upscaled)`). Suppressed `.row-error-hint` in queue rows so error details stay strictly in the console log. Added `#sidebarModeBanner`.
    - `src/overlay/FlowHUDHost.js`: Added dynamic header indicator `#sidebarModeBanner` ("BATCH PARAMETERS — Applies to all X rows" vs "SINGLE PARAMETERS — Item #X / MULTI-SELECTION (X items)") with prompt text clamped to max 38 characters followed by `...` to keep sidebar layout clean.
    - Unified Logging: Replaced all raw `console.warn` and `console.error` calls across `src/` with `logger.warn` and `logger.error`.
14. **Session 27 Fix Complete (Commit 11, `78c55e2`)**:
    - `src/overlay/FlowHUDHost.js`: Refactored row container click behavior. When 0 rows are checked, clicking any row container focuses/activates that row (`activeRowIdx = idx`, applying `.row-active` cyan accent) without checking its checkbox across both Batch and Single modes, allowing seamless parameter inspection in Single mode (`ROW #X`) without unintended selections. When 1 or more rows are already checked (`selectedCount > 0`), clicking another row container automatically checks that row too (`it.selected = true`), allowing swift multi-selection without precision-clicking the checkbox. Checkbox direct click (`change` event with `e.stopPropagation()`) independently toggles individual row selection.
    - `src/overlay/FlowHUDHost.js`: Fixed bulk delete trash button visibility bug. Refactored `updateSelectionUI()` to strictly set `#btnBulkDeleteQueue.style.display = selectedCount > 0 ? 'inline-flex' : 'none'`, ensuring the trash button is strictly hidden whenever 0 rows are checked in both Single and Batch modes.
    - `src/overlay/FlowHUDTemplates.js` & `src/overlay/overlay.css`: Increased default prompt textarea rows to `rows="2"`, expanded `.row-prompt-input` min-height to `54px` (max-height `130px`) with `13px` font size, `1.45` line-height, and `7px 9px` padding to comfortably display 2 to 3 lines of prompt text simultaneously by default. Added `margin-top: 6px;` to `.row-select-handle` for dead-center vertical alignment with the first line of the expanded textarea.
16. **Session 29 Fix Complete (Commit 13, `9ffec65`)**:
    - `src/overlay/FlowHUDHost.js`: Refactored `handleBulkFiles()` to isolate image files, resolve the empty dropzone bug where images were ingested into `ingredients` while mode was `frames-to-video`, and implement smart mode detection: 1 image switches to `image-to-video` (or `edit-image`), 2 images switch to `frames-to-video` (creating 1 row with Start and End frames), and >2 images switch to `image-to-video` (or `edit-image`) creating N rows. Dropped images initialize with clean empty prompt (`prompt: ''`), completely eliminating filename auto-fill into textarea.
    - `src/overlay/FlowHUDHost.js`: Implemented smart queue conversion on mode change (`convertQueueBetweenModes()`): switching to `frames-to-video` pairs single-ingredient rows 2-by-2 into Start & End frames (halving row count); switching from `frames-to-video` to single-image modes unpairs them into individual rows.
    - `src/overlay/FlowHUDHost.js` & `src/overlay/overlay.css`: Implemented universal ingredient click-to-swap in Sort Mode (`isSortMode = true`). Clicking media slots suppresses native file picker dialogs across all modes (`f2v`, `i2v`, `ei`). First click marks slot with cyan pulsing glow (`.swap-source`); second click on another slot swaps media payloads between rows. Dynamic tooltips added in `renderQueueRow`.
    - `src/overlay/FlowHUDHost.js` & `src/overlay/overlay.css`: Implemented mandatory prompt validation for Start button (`updateStartButtonState()`). Disables Start button (`opacity: 0.42`, `cursor: not-allowed`) if any row has an empty prompt, and updates state in real-time on textarea `input`. Added 500ms debounced auto-save on prompt input.
    - `src/overlay/overlay.css`: Changed `.row-status-badge` to `align-self: flex-end;`, positioning badges flush to the bottom-right of the prompt textarea.
17. **Session 30 Fix Complete (Commit 14, `HEAD`)**:
    - `src/core/FlowStorage.js`: Realigned model defaults: Image modes (`text-to-image`, `edit-image`) default to `Nano Banana 2` (was Nano Banana Pro), Video modes (`text-to-video`, `image-to-video`, `frames-to-video`) default to `Veo 3.1 - Lite` (was Omni 1.1 Flash). Added and exported `getDefaultModelForMode(mode)` and `normalizeModelForMode(mode, currentModel)` to enforce strict model-to-mode compatibility.
    - `src/overlay/FlowHUDTemplates.js`: Updated `#selModelFamily` dropdown template to select `Veo 3.1 - Lite` by default in Video Models optgroup and `Nano Banana 2` by default in Image Models optgroup.
    - `src/services/FlowSettingsService.js`: Fixed critical popover mode mutation bug in `applySettings()`. Replaced aggressive auto-align logic that forced `edit-image` to `text-to-video` whenever a video model was supplied. Now uses `normalizeModelForMode(target.mode, target.model)` to strictly retain the user's chosen media mode and normalize the model to an image model (`Nano Banana 2`).
    - `src/services/FlowIngredientService.js` & `src/core/QueueManager.js`: Fixed Frame-to-Video (`frames-to-video`) injection failure. Abandoned targeting non-input DOM frame triggers; now dispatches native clipboard paste events directly into Google Flow's `ProseMirror` editor sequentially. 1st paste injection mounts Start Frame (`expectedChipCount = 1`), 2nd paste injection mounts End Frame (`expectedChipCount = 2`). Added 500ms inter-injection settling delays to prevent Angular race conditions.
    - `src/overlay/FlowHUDHost.js`: Realigned model resolution across `addQueueRow`, `handleBulkFiles`, `selMode` change handler, `convertQueueBetweenModes`, `syncSidebarControlsToItem`, and `syncModeUI`. Fixed missing preview hydration bug in `syncQueueFromStorage()` by adding `await this.hydrateQueuePreviews()` so queue row thumbnails never vanish when the queue transitions to idle or stopped.
15. **Commit 15 Complete (Session 31, `HEAD`)**:
    - `src/overlay/FlowHUDTemplates.js`: Added `getRowStatusInfo(item, mode)` and `formatRowParamsBadge(params)`. Updated `renderQueueRow` to render dual row badges wrapped in `.row-badges-group` (parameters badge on left, status badge on right). Unhid `#grpMultiplier` by removing `display: none` and image-only hint, restoring output count multiplier (`x1`, `x2`, `x3`, `x4`) for video modes.
    - `src/overlay/overlay.css`: Added `.row-badges-group` and `.row-params-badge` capsule styles. Expanded `.row-status-badge` with dedicated color stages (`.status-not-ready` warning amber `#ffab3d`, `.status-ready` cyan `#57c1ff`, `.status-injecting` purple `#c084fc`, `.status-generating` teal `#14b8a6`, `.status-downloading`/`.status-completed` green `#59d499`, `.status-failed` red `#ff6161`).
    - `src/overlay/FlowHUDHost.js`: Implemented `getEffectiveRowParams(item)`, `updateRowBadges(rowIdx)`, and `updateAllRowBadges()`. Wired dynamic badge updates on textarea input, parameter sidebar segment changes, and mode switches. Removed percentage progress strings from badge text in `queueManager.onProgress` (`INJECTING`, `GENERATING`, `DOWNLOADING`). Unlocked output multipliers for video in `syncModeUI()` and `saveCurrentQueue()`. Refactored `updateStartButtonState()` to validate row readiness via `getRowStatusInfo()`.
    - `src/core/QueueManager.js`: Removed `isVideo ? 1 :` restriction in `runLoop()` batch settings and `processItem()` single settings, allowing video generations to run with user-configured output counts.

---

## 3. Actionable Next Steps for Incoming Agent

1. **Phase 4: End-to-End Integration & Multi-Language Stress Testing**:
   - Target branch: `task/e2e-integration-testing` (branched from `dev` after merging `task/dual-mode-ui`).
   - Sub-phase 4.1: Text-to-Image & Text-to-Video batch validation across Omni 1.1 Flash and Veo 3.1 models.
   - Sub-phase 4.2: Image-to-Video & Frames-to-Video multi-asset injection.
   - Sub-phase 4.3: In-card failure recovery and moderation error handling validation.
   - Sub-phase 4.4: Multi-language locale verification on non-English interfaces (ID, ES, JA, DE, FR).

---

## 4. Critical Gotchas & Architectural Traps

- **Zero English-Label Dependency**: Never query elements using localized English `aria-label` text (e.g. `[aria-label="Start generation"]`, `[aria-label="Tile grid settings"]`). Always use Material Symbols ligatures (`settings_2`, `more_vert`, `download`, `arrow_forward`, `swap_horiz`, `cancel`, `dashboard`), custom tags (`flow-*`), or internal CSS classes (`.settings-trigger-button`, `.agent-mode-chip`, `.generate-icon-button`).
- **Zero-CDP Mandate**: Never introduce `chrome.debugger` or CDP synthetic events. All text injection must use `document.execCommand('insertText')` + native `InputEvent` dispatch on `flow-rich-text-editor.prompt-input div.ProseMirror`.
- **Transient Blank Phase Trap**: Google Flow has a 300ms–2000ms blank transition phase between progress bar removal and media element attachment. Never classify a tile as failed simply because `!isRendering && !isSuccess`; only classify as failed if `isCardGenerationFailed()` returns true or the 10-second grace timer expires.
- **Permanent Progress Bar Container Gotcha**: `<flow-video-tile>` always has an element with class `.hover-overlay-has-progress-bar` in the DOM as its hover container even when idle or finished! NEVER use `.hover-overlay-has-progress-bar` as an indicator of an active progress bar; check `.progress-bar`, `div.progress-bar-fill`, or `<flow-pending-tile>`.
- **In-Card Failure Detection**: Google Flow does not display toasts for content moderation blocks or quota limits. Asset tiles remain permanently blurred with warning badges. Card success must be validated via `isCardGenerationSuccess(card)`.
- **Image Tile Tag Differences**: Video tiles use `img.thumbnail` while image generation tiles (`flow-image-tile`) use `img.image`. `CARD_MEDIA` selector must include both.
- **Virtual Scroll Safety**: Angular CDK unmounts older cards. Always monitor the newest batch at top index 0 (`flow-grid-tile-container > :first-child`).
- **Shadow DOM Style Scope Trap**: CSS custom properties declared exclusively on `:root` do not pierce open Shadow DOM boundaries. Always declare tokens on `:root, :host`.

---

## 5. Recent Session Handoff Log

| Session | Date | Branch | Commit | Summary | Next Focus |
| :---: | :---: | :--- | :--- | :--- | :--- |
| 31 | 2026-09-20 | `task/dual-mode-ui` | Pending | Dual row badges (live params + always-visible status with READY vs NOT READY), stripped progress percentages, and video output multiplier | Phase 4: E2E Integration & Stress Testing |
| 30 | 2026-09-20 | `task/dual-mode-ui` | `8273579` | Model defaults realignment (Nano Banana 2 / Veo 3.1 - Lite), strict mode normalization, sequential 2x F2V paste injection, and thumbnail hydration | Row status and parameter badges |
| 29 | 2026-09-20 | `task/dual-mode-ui` | `9ffec65` | Smart image drop, ingredient click-to-swap in sort mode, start button prompt validation, right-aligned status badge, and prompt auto-save | Model defaults and F2V injection hardening |
| 28 | 2026-09-20 | `task/dual-mode-ui` | `b4e223b` | Container focus toggle, multi-select transition, and uncheck focus clearing | Smart image drop & sort mode swap |
| 27 | 2026-09-20 | `task/dual-mode-ui` | `8860cd8` | Row container selection, conditional bulk delete trash button, and prompt textarea expansion | Selection focus refinement |
| 26 | 2026-09-20 | `task/dual-mode-ui` | `f9a649d` | Checkbox geometry centering, keyboard selection, custom select optgroup fallback, and logger consolidation | Row container selection & trash button |
| 25 | 2026-09-20 | `task/dual-mode-ui` | `435928d` | Live percentage parsing, multi-tile aggregate calculation, upload verification, and resolution matching | Checkbox geometry and selection engine |
| 24 | 2026-09-20 | `task/dual-mode-ui` | `8c6bb8a` | Header switch isolation, unconditional popover inspection, and video/image media resolver | Watcher live percentage & multi-tile downloads |
| 23 | 2026-09-19 | `task/dual-mode-ui` | `be187e7` | Implement conditional batch vs single parameter orchestration and header setup (Commit 7) | Phase 4: E2E Integration & Stress Testing |
| 22 | 2026-09-19 | `task/dual-mode-ui` | `a4430e2` | Wire multi-select bulk delete, sort reordering, and single param mode bindings | Commit 7: QueueManager Orchestration & Execution Branching |
| 21 | 2026-09-19 | `task/dual-mode-ui` | `e66a385` | Redesign queue toolbar, row items with multi-select, sort controls, and sidebar placeholder | Commit 6: HUD Event Orchestration & Interactive Handlers |
| 20 | 2026-09-19 | `task/dual-mode-ui` | `f965737` | Implement FlowImageDB via indexedDB and fix asynchronous file upload crash | Commit 5: Studio HUD Templates & Row Redesign |
| 19 | 2026-09-19 | `task/dual-mode-ui` | `6cde988` | Standardize accent tokens, vertical centering, button sizes, and dropdown clipping | Commit 4: IndexedDB Storage & Image Upload Crash Fix |
| 18 | 2026-09-19 | `task/dual-mode-ui` | `28c8428` | Implement header grid setup and sequential interaction pacing delays | Commit 3: UI Tokens, Vertical Centering & Dropdown Clipping |
| 17 | 2026-09-19 | `task/dual-mode-ui` | `3dbba27` | Resolve false generation failure with 4-state lifecycle and update resilient selectors | Commit 2: Automation Services Pacing & Header Grid Setup |
| 16 | 2026-09-17 | `task/dual-mode-ui` | `83c66a4` | Enforce exact blueprint popup, unify start-stop button, and fix icon visibility | Commit 1: Core Engine Selectors & Watcher False Failure Fix |
| 15 | 2026-09-17 | `task/dual-mode-ui` | `768870f` | Align popup and overlay HUD with blueprint, add LoggerService, fix in-card generation detection | Enforce blueprint feedback |
| 14 | 2026-09-17 | `task/dual-mode-ui` | `06f1cbd` | Realign Studio HUD with vflow-note wireframe and RJ AIO Metadata design system | Align popup with blueprint |
| 13 | 2026-09-17 | `task/dual-mode-ui` | `bbd613a` | Connect reactive storage synchronization and automation controls (Phase 3 Complete) | Realign Studio HUD layout to vflow-note wireframe |

| 12 | 2026-09-17 | `task/dual-mode-ui` | `f808156` | Build dynamic two-column studio HUD and template generators (Sub-phase 3.3 Complete) | Phase 3 Sub-phase 3.4: Reactive Storage Synchronization & Automation Controls |
| 11 | 2026-09-17 | `task/dual-mode-ui` | `7750ffe` | Implement Shadow DOM HUD host and draggable floating pill (Sub-phase 3.2 Complete) | Phase 3 Sub-phase 3.3: Two-Column Studio Layout & Queue Builder |
| 10 | 2026-09-17 | `task/dual-mode-ui` | `ce3a4cb` | Implement minimalist toolbar popup launcher and connection detector (Sub-phase 3.1 Complete) | Phase 3 Sub-phase 3.2: Shadow DOM Studio HUD Host & Draggable Floating Pill |
| 09 | 2026-09-17 | `task/core-automation-engine` | `e0d33fa` | Implement FlowDownloadService and QueueManager orchestrator (Phase 2 Complete, merged dev `c14ca68`) | Phase 3 Sub-phase 3.1: Minimalist Toolbar Popup Launcher |
| 08 | 2026-09-17 | `task/core-automation-engine` | `e6335d3` | Implement FlowWatcherService for top-batch monitoring and failure detection (Sub-phase 2.4 Complete) | Phase 2 Sub-phase 2.5: FlowDownloadService & QueueManager |
| 07 | 2026-09-17 | `task/core-automation-engine` | `270cee5` | Implement FlowIngredientService and FlowPromptService (Sub-phase 2.3 Complete) | Phase 2 Sub-phase 2.4: FlowWatcherService |
| 06 | 2026-09-17 | `task/core-automation-engine` | `42698d8` | Implement FlowSettingsService for model, ratio, and agent suppression (Sub-phase 2.2 Complete) | Phase 2 Sub-phase 2.3: FlowIngredientService & FlowPromptService |
| 05 | 2026-09-17 | `task/core-automation-engine` | `7251251` | Implement FlowDOM selector engine and FlowStorage service (Sub-phase 2.1 Complete) | Phase 2 Sub-phase 2.2: FlowSettingsService |
| 04 | 2026-09-17 | `task/cleanup-and-governance` | `eff9539` | Author root AGENTS.md, DESIGN.md, clean manifest, and src scaffold (Phase 1 Complete) | Merge to dev & start Phase 2 Sub-phase 2.1 |
| 03 | 2026-09-17 | `task/cleanup-and-governance` | `e980390` | Establish complete governance docs suite and port GOOGLE_FLOW_DOM reference | Sub-phase 1.4: Author AGENTS.md, DESIGN.md, clean manifest, and src scaffold |
| 02 | 2026-09-17 | `task/cleanup-and-governance` | `4c07274` | Purge root zip archives, legacy version folders, and obsolete UI scripts | Sub-phase 1.3: Mirror and author full governance docs suite |
| 01 | 2026-09-17 | `task/cleanup-and-governance` | `8f3e5d1` | Isolate and push legacy branch, harden gitignore, initialize docs suite | Sub-phase 1.2: Purge root zips and legacy folders |
