# Current Project State — RJ V-Flow Auto

*Last Updated: 2026-09-22*<br>
*Active Branch: `task/fix-image-generation-trigger`*<br>
*Current Milestone: Post-Phase 4 Maintenance & Engine Hardening*

---

## 1. Current Phase Progress

- **Phase 1 — Cleanup & Governance Foundation**: [COMPLETE] (Legacy branch isolated and pushed to remote origin, gitignore hardened, root zip archives and legacy version folders purged, complete governance documentation suite established, root AGENTS.md, DESIGN.md, README.md, CHANGELOG.md, LICENSE, branding icons, and clean src/manifest.json scaffold established; merged into dev `7838930`)
- **Phase 2 — Core Automation Engine & Services**: [COMPLETE] (FlowDOM.js, FlowStorage.js, FlowSettingsService.js, FlowIngredientService.js, FlowPromptService.js, FlowWatcherService.js, FlowDownloadService.js, and QueueManager.js fully implemented, tested, and verified; merged into dev `c14ca68`)
- **Phase 3 — Dual-Mode UI Implementation & End-to-End Hardening**: [COMPLETE] (Two-column Studio HUD in Shadow DOM, drag physics, dark precision styling, dual row badges, multi-select checkboxes, sort mode drag-and-drop reordering, single vs batch parameter bindings, IndexedDB binary storage engine, multi-row batch tile collection across virtual scroll rows for multi-output downloads, prompt validation, granular monotonic progress counter, complete form controls disabling during batch execution with read-only parameter inspection on row clicks, dynamic QUEUED status badges, animated SVG border glow on running rows, Clean Mount Protocol eliminating FOUC, Graceful Stop engine with QUEUE_STATES.STOPPING, uploaded ingredient filtering, high-contrast disabled form controls, dynamic Support Dev button, default Size S grid view, left project navigation sidebar auto-collapse, and agent mode logging polish; merged into dev `7b0f1d9`)
- **Phase 4 — Production Packaging Pipeline & Release**: [COMPLETE] (Sub-phase 4.1 complete: production packaging pipeline with `package.json`, `obfuscator.config.js`, and `build.js` mirroring RJ AIO Metadata architecture, distribution shortcuts `SC.url` and `SUPPORT ME.url`, standalone ES modules bundling with `esbuild`, AST obfuscation with `javascript-obfuscator`, and automated distribution archive creation `releases/RJ_V-Flow_Auto-v3.0.0.zip` and `releases/v3.0.0.zip`; Sub-phase 4.2 complete: factual documentation overhaul across `docs/ARCHITECTURE.md`, `README.md`, `CHANGELOG.md`, `docs/DECISIONS.md`, `docs/CURRENT_STATE.md`, `docs/HANDOFF.md`, and `docs/ROADMAP.md`)
- **Post-Release Hardening — Image Mode Submission, Humanized Telemetry & Ingredient Tile Filtering**: [COMPLETE] (Resolved image generation submission drop via humanized pointer telemetry `simulateHumanClick` featuring trajectory micro-movements, realistic coordinate jitter, and 60-120ms physical hold duration to satisfy reCAPTCHA Enterprise risk evaluation on 0-credit Nano Banana models; resolved Edit-Image 180s timeout loop by enforcing ingredient tile exclusion in `getTopTileCard()` and `waitForNewBatchSpawn()`; eliminated simulateClick double-click regression on toggle popovers; enabled ProseMirror Enter keydown fallback with range collapse; and enforced exact model string matching to prevent Nano Banana 2 vs Nano Banana 2 Lite collision)
- **Engine Hardening — Option C MAIN-World reCAPTCHA Hook & Unified Native Trigger Pipeline**: [COMPLETE] (Permanently bypassed synthetic DOM button click dropping on 0-credit Nano Banana image models by establishing a unified `simulateHumanClick(btn)` DOM click pipeline across both Image and Video modes; pre-arms fresh reCAPTCHA Enterprise tokens in the MAIN world via `flow_bridge.js` right before dispatching native clicks; hooks `grecaptcha.enterprise.execute` to serve pre-minted tokens to Angular on demand with detached-turn on-demand fallback; verified 100% successful video generation on Veo 3.1; harmonized all console logs across `flow_bridge.js`, `content_main.js`, and `LoggerService.js` under the unified `[RJ V-Flow Auto]` prefix and design tokens)

---

## 2. Branches Matrix

| Branch | Status | Purpose |
| :--- | :--- | :--- |
| `main` | Production | Stable production releases only |
| `dev` | Integration | Active development integration branch (pushed to `origin/dev`) |
| `legacy` | Remote Archived | Permanent archive of legacy v2.x codebase and history |
| `task/cleanup-and-governance` | Merged | Phase 1: Cleanup & Governance Foundation (Merged into dev `7838930`) |
| `task/core-automation-engine` | Merged | Phase 2: Core Automation Engine & Services (Merged into dev `c14ca68`) |
| `task/dual-mode-ui` | Merged | Phase 3: Dual-Mode UI Implementation & End-to-End Hardening (Merged into dev `7b0f1d9`) |
| `task/packaging-and-release` | Merged | Phase 4: Production Packaging Pipeline & Release (Merged into dev) |
| `task/fix-image-generation-trigger` | Active | Engine Hardening: Option C MAIN-world reCAPTCHA Enterprise & batchexecute RPC bridge |

---

## 3. Platform & Target Model Matrix

| Model Family | Media Type | Generation Feature | Sub-Mode | Duration Support | Implementation Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Omni 1.1 Flash** | Video | Text-to-Video, Image-to-Video, Video-to-Video, Frames | Ingredients / Frames | 4s, 6s, 8s, 10s | [COMPLETE] |
| **Veo 3.1 - Fast** | Video | Text-to-Video, Image-to-Video, Frames | Ingredients / Frames | N/A (Preset) | [COMPLETE] |
| **Veo 3.1 - Lite** | Video | Text-to-Video, Image-to-Video, Frames | Ingredients / Frames | N/A (Preset) | [COMPLETE] |
| **Veo 3.1 - Quality** | Video | Text-to-Video, Frames (No I2V) | Frames Only | N/A (Preset) | [COMPLETE] |
| **Nano Banana Pro** | Image | Text-to-Image, Edit Image | Ingredients | N/A | [COMPLETE] |
| **Nano Banana 2** | Image | Text-to-Image, Edit Image | Ingredients | N/A | [COMPLETE] |
| **Nano Banana 2 Lite** | Image | Text-to-Image, Edit Image | Ingredients | N/A | [COMPLETE] |

---

## 4. What Exists

- **Git & Safety Infrastructure:**
  - `legacy` branch isolated and pushed to remote origin (`origin/legacy`).
  - `dev` branch merged through Phase 3 and pushed to remote origin (`origin/dev`).
  - `.gitignore` hardened for build outputs, dependencies, archives, and scratch tools.
- **Repository Hygiene:**
  - All legacy zip archives (`v2.1.3.zip` – `v2.1.6.zip`) purged.
  - All legacy snapshot folders (`v2.1.2/` – `v2.1.6/`), `bootstrap/`, `panel/`, and `scripts/` purged.
  - Outdated root build tooling purged and replaced with modern automated pipeline.
  - Obsolete `docs/SESION_ANALYSIS.md` purged.
- **Root Project Foundation:**
  - `AGENTS.md` — Mandatory agent instructions, Zero-CDP mandate, and reading order.
  - `DESIGN.md` — Raycast Dark Precision design system tokens and icon policies.
  - `README.md` — Project overview, architecture flowchart, features, setup guide, and build instructions.
  - `CHANGELOG.md` — Keep a Changelog / SemVer history documenting v3.0 release.
  - `LICENSE` — MIT License (2026 Riiicil).
  - `icons/` — Optimized branding icons (`icon16.png`, `icon48.png`, `icon128.png`, `logo_rj.png`).
- **Core Automation Engine (`src/core/`):**
  - `src/core/FlowDOM.js` — Language-resilient DOM engine with ligature queries, pseudo `:has-text` support, MutationObserver waiters, 4-state lifecycle validators (`isCardGenerationSuccess`, `isCardGenerationFailed`), uploaded ingredient filtering (`isIngredientTile`), and centralized `sleep(ms)` pacing utility.
  - `src/core/FlowImageDB.js` — IndexedDB binary storage engine (`vflowImageDB`, store `images`) storing raw Blob/File binaries locally under unique UUIDs, bypassing Chrome's 5MB `chrome.storage.local` quota limit.
  - `src/core/FlowStorage.js` — Persistent storage engine with schema version 3, debounced persistence, queue CRUD operations, `sanitizeQueueForStorage` quota protection, and reactive change listeners.
  - `src/core/QueueManager.js` — Master batch automation orchestrator state machine (`IDLE`, `RUNNING`, `STOPPING`, `STOPPED`) coordinating one-time header setup, left navigation sidebar auto-collapse, conditional Batch vs Single parameter orchestration, direct IndexedDB binary ingestion, pure text prompt hygiene, item-specific resolution downloads with 1000ms pacing, Graceful Stop handling, and granular sub-stage progress telemetry.
- **Specialized Automation Services (`src/services/`):**
  - `src/services/LoggerService.js` — Unified colorized console logging engine with `[RJ V-Flow Auto]` prefix and standard logging methods.
  - `src/services/FlowSettingsService.js` — Prompt settings popover automation, model family selector, aspect ratio, duration, output multipliers, creative agent mode suppression with audit logging, `ensureSidebarCollapsed()`, `setupHeaderGridAndClearPrompt()` header automation, sequential pacing delays, and `applySettings(itemParams)` row parameter support.
  - `src/services/FlowIngredientService.js` — Reference media clipboard ingestion, upload consent auto-agreement, sequential frame slot injection, and ingredient chip clearing.
  - `src/services/FlowPromptService.js` — Zero-CDP ProseMirror text injection, prompt clearing, generate button readiness trigger, intelligent image vs video execution routing (MAIN-world RPC bridge for image mode, native DOM click for video mode), and sequential 350ms pre-submit / 600ms post-generate pacing delays.
  - `src/services/FlowBridgeClient.js` — Dual-channel content-script client communicating with MAIN execution world across DOM boundary via CustomEvent and `window.postMessage` for reliable image RPC invocation and reCAPTCHA Enterprise minting.
  - `src/services/FlowWatcherService.js` — Virtual-scroll safe multi-row batch monitoring, progress polling, 4-state lifecycle failure detection with 10s transient blank grace timer (ADR-006/008/010), pending state detection (`flow-pending-tile`), and asset metadata extraction.
  - `src/services/FlowDownloadService.js` — Automated card context menu upscaled downloads (`more_vert` -> `download` -> `1080p`/`4K`/`2K`), direct download fallback, `scrollIntoView` multi-row positioning, locked resolution tier fallback, Escape key dismissal fallback, and strict 800ms - 1000ms sequential download pacing.
- **Design System Tokens (`src/styles/`):**
  - `src/styles/variables.css` — Raycast Dark Precision design tokens (canvas `#07080a`, surface `#0d0d0d`, elevated `#101111`, card `#121212`, input `#18191a`, hairline `#242728`, accent cyan `#079183`, accent green `#59d499`, accent yellow `#ffc533`, accent red `#ff6161`) pierced through `:root, :host`.
  - `src/styles/components.css` — Raycast Dark Precision component styling (cards, status badges, platform warnings, field groups, inputs, buttons with `line-height: 1`, block icon glyphs, custom selects, segmented groups) ported from RJ AIO Metadata.
- **Minimalist Toolbar Popup Launcher (`src/popup/`):**
  - `src/popup/popup.html` — Ultra-minimal popup layout (320px): brand header, State 1 Disconnected vs State 2 Connected.
  - `src/popup/popup.css` — Compact 320px styling adhering strictly to Raycast Dark Precision design tokens.
  - `src/popup/popup.js` — Lightweight tab URL inspector toggling State 1 vs State 2 and handling direct page open.
- **In-Page Studio Overlay HUD (`src/overlay/`):**
  - `src/overlay/CustomSelect.js` — Pure JavaScript custom dropdown select component adapted for Shadow DOM encapsulation with container boundary detection and smart upward `.dropup` flipping.
  - `src/overlay/FlowHUDTemplates.js` — Modular SVG icons with explicit sizing, Studio HUD wireframe layout templates, queue toolbar (`#chkSelectAllQueue`, `selParamMode`, `#btnBulkDeleteQueue`, `#btnToggleSortMode`, `#btnAddQueueRow`), row items with multi-select checkboxes, drag handles, dual row badges, animated SVG border glow, and restored `#btnQuickPasteClipboard` in empty dropzone.
  - `src/overlay/overlay.css` — Isolated Shadow DOM styles for two-column studio HUD (820x520px), window controls, universal SVG icon visibility, elevated footer (`#101111`), custom `.rj-checkbox` styles, sort mode drag indicators, disabled interactive states (`.row-prompt-input:read-only`, `.row-media-slot.is-disabled`, `.rj-segment-btn:disabled`), animated border glow loop (`@keyframes rj-glow-loop`), and clean mount transition suppression (`.is-mounting`).
  - `src/overlay/FlowHUDHost.js` — Open Shadow DOM host mounting `#flow-auto-hud-root`, fluid drag physics, boundary clamping, Clean Mount Protocol, row-based queue management, sort mode drag-and-drop reordering, universal click-to-swap media slots, strict model partitioning, single reactive Start/Stop toggle button, monotonic cumulative progress tracking, execution form control locking with read-only row inspection, and QueueManager execution wiring.
- **Content & Background Workers (`src/content/`, `src/background/`):**
  - `src/content/content_loader.js` — Manifest V3 content script ES module dynamic bootstrap loader injecting both MAIN-world `flow_bridge.js` script tag and isolated module `content_main.js`.
  - `src/content/flow_bridge.js` — Zero-CDP MAIN execution world bridge accessing `window.grecaptcha.enterprise`, reading `WIZ_global_data.SNlM0e` CSRF token, and directly dispatching batchexecute RPC `ogiZ0b` for image generation.
  - `src/content/content_main.js` — Primary ES module content script entrypoint on `flow.google.com` initializing overlay and runtime message routing.
  - `src/background/service_worker.js` — Clean Manifest V3 background service worker with lifecycle event listener.
- **Production Packaging & Release Pipeline:**
  - `package.json` — Node configuration with `esbuild`, `fs-extra`, `javascript-obfuscator`, and `"build": "node build.js"` script (local tooling, gitignored per RJ AIO Metadata baseline).
  - `obfuscator.config.js` — Production obfuscation settings configured for MV3 (local tooling, gitignored per RJ AIO Metadata baseline).
  - `build.js` — Automated production packaging pipeline (local tooling, gitignored per RJ AIO Metadata baseline).
  - `SC.url` & `SUPPORT ME.url` — Support and distribution shortcut URLs copied from RJ AIO Metadata baseline (tracked in git).
  - `dist/LOAD THIS FOLDER/` — Turnkey unpacked extension directory with bundled and obfuscated scripts.
  - `releases/RJ_V-Flow_Auto-v3.0.0.zip` (0.79 MB) & `releases/v3.0.0.zip` — Production distribution release packages.

---

## 5. What Does NOT Exist Yet

- All core milestones for **RJ V-Flow Auto v3.0** are **100% COMPLETE**.
- Subsequent efforts will encompass ongoing maintenance, community feedback, and potential adaptations to future Google Flow platform changes.

---

## 6. Testing & Build Verification Status

- `src/manifest.json` verified valid Manifest V3 JSON.
- `package.json` verified valid JSON and dependencies installed (`esbuild`, `fs-extra`, `javascript-obfuscator`).
- `build.js` and `obfuscator.config.js` verified syntax-valid via `node --check`.
- `npm run build` executed successfully:
  - Bundled 4 standalone ES modules into `dist/LOAD THIS FOLDER/` (218.7kb main content script resolving all 18 internal modules).
  - Obfuscated 4 target JS files with zero syntax errors (`node --check` passed).
  - Copied static assets (`styles/`, `assets/`, `overlay/overlay.css`, `popup/`) and distribution URLs (`SC.url`, `SUPPORT ME.url`) into `dist/`.
  - Generated release zip package `releases/RJ_V-Flow_Auto-v3.0.0.zip` (0.79 MB) and mirror alias `releases/v3.0.0.zip`.
- All 18 JS modules across `src/` verified passing `node --check` (0 errors).
- Strict Zero Native Emoji Policy verified across all documentation and files.
- Working tree active on branch `task/packaging-and-release`.

---

## 7. Immediate Next Step

- Milestone v3.0 is **[COMPLETE]**.
- Merge `task/packaging-and-release` into `dev` via `git merge --no-ff`, and subsequently merge `dev` into `main` upon user instruction.
