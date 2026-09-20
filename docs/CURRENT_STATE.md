# Current Project State — RJ V-Flow Auto Extension

*Last Updated: 2026-09-20*<br>
*Active Branch: `task/dual-mode-ui`*<br>
*Current Milestone: Phase 3 (Dual-Mode UI Implementation) — [COMPLETE]*

---

## 1. Current Phase Progress

- **Phase 1 — Cleanup & Governance Foundation**: [COMPLETE] (Sub-phase 1.1 complete: legacy branch isolated and pushed, gitignore hardened; Sub-phase 1.2 complete: root zip archives, legacy version folders, and obsolete UI scripts purged; Sub-phase 1.3 complete: complete governance documentation suite established and GOOGLE_FLOW_DOM reference ported; Sub-phase 1.4 complete: root AGENTS.md, DESIGN.md, README.md, CHANGELOG.md, LICENSE, branding icons, and clean src/manifest.json scaffold established)
- **Phase 2 — Core Automation Engine & Services**: [COMPLETE] (Sub-phases 2.1 through 2.5 complete: FlowDOM.js, FlowStorage.js, FlowSettingsService.js, FlowIngredientService.js, FlowPromptService.js, FlowWatcherService.js, FlowDownloadService.js, and QueueManager.js fully implemented and verified; merged into dev `c14ca68`)
- **Phase 3 — Dual-Mode UI Implementation**: [COMPLETE] (Sub-phases 3.1 through 3.4 complete; Commit 1 complete: 4-state lifecycle and resilient selectors; Commit 2 complete: header grid setup, sequential interaction pacing delays, and itemParams support; Commit 3 complete: UI tokens standardization, vertical font centering, button sizes equalization, and dropdown boundary clipping; Commit 4 complete: FlowImageDB IndexedDB binary storage engine, storage sanitization, and synchronous file upload crash fix; Commit 5 complete: Studio HUD queue toolbar redesign, multi-select checkboxes, sort controls, and single mode sidebar placeholder; Commit 6 complete: HUD event orchestration, multi-select bulk delete with IndexedDB cascade, sort mode HTML5 drag-and-drop reordering, and Single vs Batch parameter bindings; Commit 7 complete: conditional batch vs single parameter orchestration, one-time header setup, and item-specific resolution downloads; Commit 8 complete: header switch isolation, unconditional popover inspection, model-mode auto-alignment, and video/image media resolver; Commit 9 complete: live percentage parsing, multi-tile aggregate calculation, ingredient upload verification, resolution label matching, download lock fallback, single row selection UX, and high-contrast styling; Commit 10 complete: checkbox 16px geometry dead-centering, keyboard selection engine [Shift/Ctrl], sort button disabling, CustomSelect hidden optgroup auto-fallback, resolution labels alignment, sidebar header indicator banner with prompt clamping, queue error hint suppression, and unified logger consolidation; Commit 11 complete: container selection multi-select joining, strict conditional bulk delete trash button hiding, and prompt textarea default 2-3 lines height expansion; Commit 12 complete: single container focus toggle, multi-selection transition, uncheck focus clearing, and active-row bulk deletion; Commit 13 complete: smart image drop mode detection [1 img -> i2v/ei, 2 imgs -> f2v, >2 imgs -> i2v/ei], empty prompt hygiene, mode pairing/unpairing conversion, universal ingredient click-to-swap across rows in sort mode, mandatory prompt validation for start button, right-aligned row status badge, and debounced prompt auto-save; Commit 14 complete: model defaults realignment [Nano Banana 2 for image modes, Veo 3.1 - Lite for video modes], strict mode-model normalization preventing model/mode crossover, popover mode mutation fix in applySettings, sequential 2x frame paste ingestion into ProseMirror editor with expectedChipCount pacing, and thumbnail hydration on queue idle/stop synchronization; Commit 15 complete: dual row badges implementation [real-time params badge e.g. T2V · Veo 3.1 Fast · 16:9 · x3 · 720p and always-visible status badge with dynamic pre-run READY vs NOT READY states, percentage progress stripped from injecting/generating/downloading badges, and video output multiplier x1-x4 support unhidden across HUD and QueueManager]; Commit 16 complete: live aspect ratio and outputs badge synchronization across single and batch parameter changes, row checkbox and drag handle vertical centering [align-self: center], and dynamic footer queue summary with idle prompt icon and running progress spinner [Processing x/x (y%)]; Commit 17 complete: multi-output multiplier watcher batch container fix [flow-grid-tile-container wrapping all output flow-tile-container items, expectedCount wait condition], clear prompt switch detection hardening [button[name="clear-prompt-on-submit"] and aria-expanded check], and footer queue summary progress accumulation across row stages preventing per-card percentage resets; Commit 18 complete: restored missing duration declaration in QueueManager processItem single mode parameter block, eliminating duration ReferenceError crash; Commit 19 complete: multi-row batch tile collection across virtual scroll rows for multi-output downloads, eliminating partial download bug where landscape 16:9 x3 and x4 runs only downloaded cards from the first row, added scrollIntoView on cards during download, and added post-download context menu Escape dismissal fallback)
- **Phase 4 — End-to-End Integration & Multi-Language Stress Testing**: [PLANNED]
- **Phase 5 — Production Packaging Pipeline & Release**: [PLANNED]

---

## 2. Branches Matrix

| Branch | Status | Purpose |
| :--- | :--- | :--- |
| `main` | Production | Stable production releases only |
| `dev` | Integration | Active development integration branch |
| `legacy` | Remote Archived | Permanent archive of legacy v2.x codebase and history |
| `task/cleanup-and-governance` | Merged | Phase 1: Cleanup & Governance Foundation (Merged into dev `7838930`) |
| `task/core-automation-engine` | Merged | Phase 2: Core Automation Engine & Services (Merged into dev `c14ca68`) |
| `task/dual-mode-ui` | Active | Phase 3: Dual-Mode UI Implementation (Active working branch) |

---

## 3. Platform & Target Model Matrix

| Model Family | Media Type | Generation Feature | Sub-Mode | Duration Support | Implementation Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Omni 1.1 Flash** | Video | Text-to-Video, Image-to-Video, Video-to-Video, Frames | Ingredients / Frames | 4s, 6s, 8s, 10s | [PLANNED] |
| **Veo 3.1 - Fast** | Video | Text-to-Video, Image-to-Video, Frames | Ingredients / Frames | N/A (Preset) | [PLANNED] |
| **Veo 3.1 - Lite** | Video | Text-to-Video, Image-to-Video, Frames | Ingredients / Frames | N/A (Preset) | [PLANNED] |
| **Veo 3.1 - Quality** | Video | Text-to-Video, Frames (No I2V) | Frames Only | N/A (Preset) | [PLANNED] |
| **Nano Banana Pro** | Image | Text-to-Image, Edit Image | Ingredients | N/A | [PLANNED] |
| **Nano Banana 2** | Image | Text-to-Image, Edit Image | Ingredients | N/A | [PLANNED] |
| **Nano Banana 2 Lite** | Image | Text-to-Image, Edit Image | Ingredients | N/A | [PLANNED] |

---

## 4. What Exists

- **Git & Safety Infrastructure:**
  - `legacy` branch isolated and pushed to remote origin (`origin/legacy`).
  - `.gitignore` hardened for build outputs, dependencies, archives, and scratch tools.
- **Repository Hygiene:**
  - All legacy zip archives (`v2.1.3.zip` – `v2.1.6.zip`) purged.
  - All legacy snapshot folders (`v2.1.2/` – `v2.1.6/`), `bootstrap/`, `panel/`, and `scripts/` purged.
  - Outdated root build tooling (`build.js`, `obfuscator.config.js`, `package.json`, `package-lock.json`) purged.
  - Obsolete `docs/SESION_ANALYSIS.md` purged.
- **Root Project Foundation:**
  - `AGENTS.md` — Mandatory agent instructions, Zero-CDP mandate, and reading order.
  - `DESIGN.md` — Raycast Dark Precision design system tokens and icon policies.
  - `README.md` — Project overview, architecture flowchart, features, and setup guide.
  - `CHANGELOG.md` — Keep a Changelog / SemVer history documenting v3.0 refactoring.
  - `LICENSE` — MIT License (2026 Riiicil).
  - `icons/` — Optimized branding icons (`icon16.png`, `icon48.png`, `icon128.png`, `logo_rj.png`).
- **Core Automation Engine (`src/core/`):**
  - `src/core/FlowDOM.js` — Language-resilient DOM engine with ligature queries, pseudo `:has-text` support, MutationObserver waiters, 4-state lifecycle validators (`isCardGenerationSuccess`, `isCardGenerationFailed`), and centralized `sleep(ms)` pacing utility.
  - `src/core/FlowImageDB.js` — IndexedDB binary storage engine (`vflowImageDB`, store `images`) storing raw Blob/File binaries locally under unique UUIDs, bypassing Chrome's 5MB `chrome.storage.local` quota limit.
  - `src/core/FlowStorage.js` — Persistent storage engine with schema version 3, debounced persistence, queue CRUD operations, `sanitizeQueueForStorage` quota protection, and reactive change listeners.
  - `src/core/QueueManager.js` — Master batch automation orchestrator state machine (`IDLE`, `RUNNING`, `PAUSED`, `STOPPED`) coordinating one-time header setup, conditional Batch vs Single parameter orchestration, direct IndexedDB binary ingestion, pure text prompt hygiene, and item-specific resolution downloads with 1000ms pacing.
- **Specialized Automation Services (`src/services/`):**
  - `src/services/LoggerService.js` — Unified colorized console logging engine with `[RJ V-Flow Auto]` prefix and methods (`banner`, `item`, `step`, `info`, `success`, `warn`, `error`) matching RJ AIO Metadata standard.
  - `src/services/FlowSettingsService.js` — Prompt settings popover automation, model family selector, aspect ratio, duration, output multipliers, creative agent mode suppression, `setupHeaderGridAndClearPrompt()` header automation, sequential pacing delays, and `applySettings(itemParams)` row parameter support.
  - `src/services/FlowIngredientService.js` — Reference media clipboard ingestion, upload consent auto-agreement, frame slot triggers, and ingredient chip clearing.
  - `src/services/FlowPromptService.js` — Zero-CDP ProseMirror text injection, prompt clearing, generate button readiness trigger, and sequential 350ms pre-submit / 600ms post-generate pacing delays.
  - `src/services/FlowWatcherService.js` — Virtual-scroll safe top-batch monitoring, progress polling, 4-state lifecycle failure detection with 10s transient blank grace timer (ADR-006/008), pending state detection (`flow-pending-tile`), and asset metadata extraction.
  - `src/services/FlowDownloadService.js` — Automated card context menu upscaled downloads (`more_vert` -> `download` -> `1080p`/`4K`), direct download fallback, and strict 800ms - 1000ms sequential download pacing.
  - `src/services/FlowActionService.js` — Service alias re-exporting `FlowDownloadService` / `flowDownloadService`.
- **Design System Tokens (`src/styles/`):**
  - `src/styles/variables.css` — Raycast Dark Precision design tokens (canvas `#07080a`, surface `#0d0d0d`, elevated `#101111`, card `#121212`, input `#18191a`, hairline `#242728`, accent cyan `#079183`, accent green `#59d499`, accent yellow `#ffc533`, accent red `#ff6161`) pierced through `:root, :host`.
  - `src/styles/components.css` — Raycast Dark Precision component styling (cards, status badges, platform warnings, field groups, inputs, buttons with `line-height: 1`, block icon glyphs, custom selects, segmented groups with `0 10px` padding and active `#14b8a6` color) ported from RJ AIO Metadata.
- **Minimalist Toolbar Popup Launcher (`src/popup/`):**
  - `src/popup/popup.html` — Ultra-minimal popup layout (320px) matching blueprint lines 451-476: brand header (`logo_rj.png`, `V-Flow`, `v3.0.0`), State 1 (Warning icon + `Google Flow Not Detected` + open link) vs State 2 (Check icon + `Connected to Google Flow` + ready description). Zero extraneous controls or telemetry clutter.
  - `src/popup/popup.css` — Compact 320px styling adhering strictly to Raycast Dark Precision design tokens.
  - `src/popup/popup.js` — Lightweight tab URL inspector toggling State 1 vs State 2 and handling direct page open.
- **In-Page Studio Overlay HUD (`src/overlay/`):**
  - `src/overlay/CustomSelect.js` — Pure JavaScript custom dropdown select component adapted for Shadow DOM encapsulation with container boundary detection (`.hud-sidebar-scroll` / `.hud-window`) and smart upward `.dropup` flipping.
  - `src/overlay/FlowHUDTemplates.js` — Modular SVG icons with explicit sizing, Studio HUD wireframe layout templates aligned with `new note vflow.md`, redesigned queue toolbar (`#chkSelectAllQueue`, `selParamMode`, `#btnBulkDeleteQueue`, `#btnToggleSortMode`, `#btnAddQueueRow`), row items with multi-select checkboxes and drag handles, and `#sidebarSinglePlaceholder` single mode container.
  - `src/overlay/overlay.css` — Isolated Shadow DOM styles for two-column studio HUD (820x520px), window controls, universal SVG icon visibility, elevated footer (`#101111`), custom `.rj-checkbox` styles, sort mode drag indicators, and single mode placeholder.
  - `src/overlay/FlowHUDHost.js` — Open Shadow DOM host mounting `#flow-auto-hud-root`, fluid drag physics, boundary clamping, row-based queue management, glitch-free segmented buttons, strict model partitioning (Video vs Image), single reactive Start/Stop toggle button, and QueueManager execution wiring.
- **Content & Background Workers (`src/content/`, `src/background/`):**
  - `src/content/content_loader.js` — Manifest V3 content script ES module dynamic bootstrap loader.
  - `src/content/content_main.js` — Primary ES module content script entrypoint on `flow.google.com` initializing overlay and runtime message routing.
  - `src/background/service_worker.js` — Clean Manifest V3 background service worker with lifecycle event listener.
- **Modular Extension Scaffold (`src/`):**
  - `src/manifest.json` — Clean Chromium Manifest V3 with `content_loader.js` entrypoint, `content/*` web-accessible resource, and zero CDP requirements.
  - `src/assets/icons/` — Bundled extension icons.
  - Scaffolded modular directories: `src/background/`, `src/content/`, `src/core/`, `src/services/`, `src/overlay/`, `src/popup/`, `src/styles/`.
- **Governance & Documentation Suite (`docs/`):**
  - `docs/DOCS_STYLE.md` — Mandatory formatting standards, templates, and per-commit checklist.
  - `docs/ARCHITECTURE.md` — Complete MV3 architecture, Zero-CDP protocol, and Mermaid system diagram.
  - `docs/GIT_POLICY.md` — Branch hierarchy, conventional commit conventions, non-fast-forward merge rules.
  - `docs/ROADMAP.md` — Master 5-phase engineering roadmap with atomic sub-phase breakdown.
  - `docs/DECISIONS.md` — Architectural Decision Records (ADR-001 through ADR-008).
  - `docs/references/GOOGLE_FLOW_DOM.md` — Ported language-resilient selector specification and native event routines.
  - `docs/CURRENT_STATE.md` — Living project dashboard and inventory (this file).
  - `docs/HANDOFF.md` — Operational continuity briefing and trap register.
  - `docs/agent-logs/2026-09-17.md` — Granular daily audit trail (Session Entries 1 through 12).
  - `docs/agent-logs/2026-09-19.md` — Granular daily audit trail (Session Entries 1 through 7).
- **Engineering Baseline:**
  - `bahan/vflow-note.md` — Master technical specification with language-resilient selector map.
  - `bahan/new note vflow.md` — Architectural defect analysis, UI redesign, and 7-commit execution roadmap.
  - `C:\Users\admin\Desktop\handoff - vflow.md` — Project context and handoff briefing.

---

## 5. What Does NOT Exist Yet

- **Phase 4 — End-to-End Integration & Multi-Language Stress Testing:**
  - Comprehensive automated batch test harnesses, moderation error recovery, and non-English locale verification.
- **Phase 5 — Production Packaging Pipeline & Release:**
  - AST obfuscation bundler (`esbuild` + `javascript-obfuscator`), zip packaging, and store deployment artifacts.

---

## 6. Testing & Build Verification Status

- `src/manifest.json` verified valid Manifest V3 JSON.
- `src/core/FlowDOM.js` verified valid syntax via `node --check`.
- `src/core/FlowStorage.js` verified valid syntax via `node --check`.
- `src/core/QueueManager.js` verified valid syntax via `node --check`.
- `src/services/FlowSettingsService.js` verified valid syntax via `node --check`.
- `src/services/FlowIngredientService.js` verified valid syntax via `node --check`.
- `src/services/FlowPromptService.js` verified valid syntax via `node --check`.
- `src/services/FlowWatcherService.js` verified valid syntax via `node --check`.
- `src/services/FlowDownloadService.js` verified valid syntax via `node --check`.
- `src/services/FlowActionService.js` verified valid syntax via `node --check`.
- `src/services/LoggerService.js` verified valid syntax via `node --check`.
- All 10 core automation engine and service modules verified syntax-valid (0 errors).
- `src/styles/variables.css` and `src/styles/components.css` verified valid CSS tokens.
- `src/popup/popup.html` and `src/popup/popup.css` verified.
- `src/popup/popup.js` verified valid syntax via `node --check`.
- `src/overlay/CustomSelect.js` verified valid syntax via `node --check`.
- `src/overlay/overlay.css` verified valid CSS tokens.
- `src/overlay/FlowHUDTemplates.js` verified valid syntax via `node --check`.
- `src/overlay/FlowHUDHost.js` verified valid syntax via `node --check`.
- `src/content/content_loader.js` verified valid syntax via `node --check`.
- `src/content/content_main.js` verified valid syntax via `node --check`.
- `src/background/service_worker.js` verified valid syntax via `node --check`.
- All 18 JS modules across `src/` verified passing `node --check` (0 errors).
- `icons/` and `src/assets/icons/` verified with 4 branding assets each.
- Strict Zero Native Emoji Policy verified across all documentation and files.
- UI tokens standardization, vertical font centering, button sizes equalization, and dropdown boundary clipping verified syntax-valid.
- Redesigned queue toolbar templates, multi-select checkboxes, sort mode handles, and single mode placeholder verified syntax-valid.
- Multi-select bulk delete, HTML5 drag-and-drop sort reordering, and Single vs Batch parameter mode bindings verified syntax-valid and functionally tested.
- Conditional Batch vs Single parameter orchestration, one-time header setup, item-specific resolution downloads, and pure text ingredient hygiene verified syntax-valid and functionally tested via comprehensive automated test suite.
- Dual row badges (live params badge + always-visible status badge with pre-run READY vs NOT READY states), stripped progress percentages, and video output multiplier x1-x4 support verified syntax-valid and functionally tested via automated test suite.
- Live aspect ratio and outputs badge synchronization across single and batch parameter changes, row handle vertical centering, and footer queue summary with idle prompt icon and running progress spinner verified syntax-valid and functionally tested.
- Multi-row batch tile collection across virtual scroll rows for multi-output downloads, scrollIntoView card context menu invocation, and post-download Escape dismissal safety verified syntax-valid and functionally tested via simulation.
- Working tree active on branch `task/dual-mode-ui`.

---

## 7. Immediate Next Step

- Phase 3 is [COMPLETE]. Proceed with **Phase 4: End-to-End Integration & Multi-Language Stress Testing** on `flow.google.com` (Sub-phase 4.1: Text-to-Image & Text-to-Video Batch Validation).

