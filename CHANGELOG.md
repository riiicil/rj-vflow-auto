# Changelog — RJ V-Flow Auto Extension

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2026-09-22

### Added
- **Phase 1 (Cleanup & Governance Foundation)**:
  - Isolated and pushed legacy v2.x codebase to remote `legacy` branch.
  - Hardened repository `.gitignore` for build outputs, release archives, and scratch directories.
  - Established formal governance documentation suite in `docs/` (`DOCS_STYLE.md`, `ARCHITECTURE.md`, `GIT_POLICY.md`, `CURRENT_STATE.md`, `HANDOFF.md`, `ROADMAP.md`, `DECISIONS.md`).
  - Ported language-resilient Google Flow DOM specification to `docs/references/GOOGLE_FLOW_DOM.md`.
  - Authored root `AGENTS.md`, `DESIGN.md` (Raycast Dark Precision tokens), `README.md`, and MIT `LICENSE`.
  - Upgraded extension icons with optimized branding assets from RJ AIO Metadata (`icon16.png`, `icon48.png`, `icon128.png`, `logo_rj.png`).
  - Established clean Chromium Manifest V3 (`src/manifest.json`) without `chrome.debugger` permissions and modular `src/` directory scaffolding.
- **Phase 2 (Core Automation Engine & Services)**:
  - Language-resilient DOM engine (`src/core/FlowDOM.js`) querying Google Material Symbols ligatures (`settings_2`, `more_vert`, `download`, `arrow_forward`, `swap_horiz`, `cancel`, `dashboard`, `left_panel_close`), custom Angular tags (`<flow-*>`), and internal CSS classes.
  - Zero-CDP ProseMirror injection engine (`src/services/FlowPromptService.js`) using `document.execCommand('insertText')` + native `InputEvent` dispatch with 350ms pre-submit and 600ms post-trigger settle delays.
  - Settings automation service (`src/services/FlowSettingsService.js`) supporting mode switching, model families, aspect ratios, durations, output counts, and Creative Agent mode suppression with audit logging.
  - Media asset ingestion service (`src/services/FlowIngredientService.js`) for Image-to-Video and Edit Image via native clipboard paste, and sequential Frame-to-Video interpolation injection.
  - Generation lifecycle watcher (`src/services/FlowWatcherService.js`) implementing the 4-State Lifecycle protocol (`PENDING_RENDERING`, `BLANK_TRANSITION`, `DEFINITIVE_SUCCESS`, `DEFINITIVE_FAILURE`) and in-card failure detection (`isCardGenerationSuccess`, `isCardGenerationFailed`).
  - Context menu download automation service (`src/services/FlowDownloadService.js`) selecting upscaled resolutions (`1080p`, `4K`, `2K`) with locked option fallback and direct download fallback.
  - Master automation orchestrator (`src/core/QueueManager.js`) coordinating queue execution, one-time page setup, conditional Batch vs Single parameter application, and granular progress telemetry.
- **Phase 3 (Dual-Mode Studio UI & End-to-End Hardening)**:
  - Minimalist toolbar popup (`src/popup/`) with real-time Google Flow connection inspection (State 1 Disconnected vs State 2 Connected) and instant launch.
  - In-Page Studio Overlay HUD (`src/overlay/`) encapsulated in open-mode Shadow DOM (`#flow-auto-hud-root`) with fluid drag physics and position memory.
  - Collapsible floating status pill (`#flowHudPill`) with real-time ticker synchronization (`Idle`, `X queued`, `Processing X/Y (Z%)`).
  - Two-column studio workspace with queue toolbar (multi-select checkbox, parameter mode select, bulk delete, sort mode toggle, add row), dynamic dropzone, and parameter sidebar.
  - IndexedDB binary storage engine (`src/core/FlowImageDB.js`) storing high-resolution image binaries locally under unique UUIDs, bypassing Chrome's 5MB `chrome.storage.local` quota limit.
  - Storage quota sanitization (`FlowStorage.sanitizeQueueForStorage`) stripping Base64 data URLs before saving to `chrome.storage.local`.
  - Clean Mount Protocol eliminating initial white border flashes (FOUC) on page refresh via pre-hidden native selects, stylesheet loading gate (`Promise.all` with 150ms timeout), and `.is-mounting` transition suppression.
  - Graceful Stop Engine (`QUEUE_STATES.STOPPING`) allowing the active generation and download to complete before halting the queue cleanly.
  - Sort Mode with HTML5 drag-and-drop row reordering, universal slot click-to-swap, and safety locking (Start button disabled in Sort Mode; Sort button disabled when queue is empty or rows are selected).
  - Virtual Scroll Multi-Row Batch Collection (`FlowWatcherService.getBatchTileElements`) collecting outputs across rows for landscape 16:9 x3 and x4 batches.
  - User-uploaded ingredient tile filtering (`FlowDOM.isIngredientTile`) strictly excluding raw uploaded files from being misidentified as generated outputs.
  - Dual row badges wrapped in `.row-badges-group`: Parameters badge (`[T2V · Veo 3.1 Lite · 16:9 · x1 · 1080p]`) + Status badge (`READY`, `NOT READY`, `QUEUED`, `INJECTING`, `GENERATING`, `DOWNLOADING`, `COMPLETED`, `FAILED`).
  - Hardware-accelerated animated SVG border glow loop (`.row-border-glow`, `@keyframes rj-glow-loop`) on active generating rows.
  - Comprehensive execution form controls locking (`setFormControlsDisabled`) while preserving click-to-inspect read-only parameter viewing.
  - One-time page setup automatically collapsing the left navigation panel (`ensureSidebarCollapsed`), setting Grid layout (`dashboard`), Tile Size S, and enabling Auto-Clear Prompt.
  - Dynamic Support Dev button with 116px fixed width, 6-second rotating ticker, smooth CSS fade/expand transitions, and Lucide SVG icons.
- **Phase 4 (Production Packaging Pipeline & Release)**:
  - Production build pipeline (`build.js`) powered by `esbuild` and `javascript-obfuscator`, mirroring RJ AIO Metadata architecture.
  - Standalone ES module bundling inlining all 18 internal dependencies into a single 218.7kb production script (`dist/LOAD THIS FOLDER/content/content_main.js`).
  - AST obfuscation with Manifest V3-safe settings (Base64 string arrays, control flow flattening).
  - Ready-to-load distribution directory `dist/LOAD THIS FOLDER/` for end-user installation.
  - Automated release archive creation: `releases/RJ_V-Flow_Auto-v3.0.0.zip` (0.79 MB) and `releases/v3.0.0.zip`.
  - Included project distribution shortcuts `SC.url` (`github.com/riiicil`) and `SUPPORT ME.url` (`s.id/rjsupport`).

### Changed
- **Architecture Transformation (v2.x -> v3.0)**:
  - Purged obsolete CDP (`chrome.debugger`) injection in favor of 100% native ProseMirror paragraph injection.
  - Purged obsolete React Fiber, Slate, and Radix UI assumptions; replaced with Google Angular Custom Elements and Angular Material/CDK integration.
  - Transitioned model suite to modern vision models: **Veo 3.1** (`Lite`, `Fast`, `Quality`), **Omni 1.1 Flash**, and **Nano Banana** family (`2`, `Pro`, `2 Lite`).
  - Replaced legacy sidepanel with In-Page Studio Overlay HUD in Shadow DOM.
  - Model defaults realigned: Image modes default to `Nano Banana 2`, Video modes default to `Veo 3.1 - Lite`.
  - Standardized prompt textarea height to 50px matching media slots, and standardized sidebar vertical spacing to 12px.
  - Output count multipliers (`x1`–`x4`) enabled for both video and image modes.

### Fixed
- Transient blank rendering phase timeout resolved via 10-second grace timer in `FlowWatcherService.js`.
- Multi-output landscape 16:9 download clipping fixed via virtual scroll multi-row tile collection.
- Frame-to-Video injection failure resolved via sequential ProseMirror clipboard paste injection with 500ms settle delays.
- Edit Image prompt matching timeout resolved by transitioning from fragile card title string matching to pure DOM boundary tracking (`previousTopTile` and `expectedCount`).
- Free tier account resolution locking resolved with automatic fallback to highest available enabled resolution.
- Dropped image filename auto-fill in textarea prevented by initializing dropped rows with clean empty prompt strings (`prompt: ''`).
- Disappearing thumbnails on queue reset resolved by preview hydration via `URL.createObjectURL` from `FlowImageDB`.

### Removed
- Purged legacy v2.x release archives (`v2.1.3.zip` – `v2.1.6.zip`) and snapshot folders (`v2.1.2/` – `v2.1.6/`).
- Purged obsolete `bootstrap/`, `panel/`, `scripts/`, and `docs/SESION_ANALYSIS.md`.
- Purged pause states (`isPaused`, `QUEUE_STATES.PAUSED`, `pause()`, `resume()`) in favor of Graceful Stop.
- Purged dead code methods: `enqueueItem`, `enqueueBatch`, `removeQueueItem`, `clearCompletedQueue`, `clearAllQueue`, `removeOnChanged`, `swapFrames`, `getSettingsSummaryText`, `getTopBatchContainer`, `activateSingleRow`, and `selectSingleRow`.
- Purged individual row delete buttons in favor of multi-select bulk delete.
- Purged Close (`x`) button in window header in favor of Minimize (`—`).
- Purged redundant file alias `src/services/FlowActionService.js`.

---

## [2.1.6] - 2026-06-03

### Added
- Pure random prompt generator option in sidepanel.
- Dynamic prompt source select layout.

### Fixed
- Upscale download completion toast race condition.
