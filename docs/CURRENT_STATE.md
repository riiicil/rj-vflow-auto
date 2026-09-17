# Current Project State — RJ V-Flow Auto Extension

*Last Updated: 2026-09-17*<br>
*Active Branch: `task/dual-mode-ui`*<br>
*Current Milestone: Phase 3 (Dual-Mode UI Implementation) — [IN_PROGRESS]*

---

## 1. Current Phase Progress

- **Phase 1 — Cleanup & Governance Foundation**: [COMPLETE] (Sub-phase 1.1 complete: legacy branch isolated and pushed, gitignore hardened; Sub-phase 1.2 complete: root zip archives, legacy version folders, and obsolete UI scripts purged; Sub-phase 1.3 complete: complete governance documentation suite established and GOOGLE_FLOW_DOM reference ported; Sub-phase 1.4 complete: root AGENTS.md, DESIGN.md, README.md, CHANGELOG.md, LICENSE, branding icons, and clean src/manifest.json scaffold established)
- **Phase 2 — Core Automation Engine & Services**: [COMPLETE] (Sub-phases 2.1 through 2.5 complete: FlowDOM.js, FlowStorage.js, FlowSettingsService.js, FlowIngredientService.js, FlowPromptService.js, FlowWatcherService.js, FlowDownloadService.js, and QueueManager.js fully implemented and verified; merged into dev `c14ca68`)
- **Phase 3 — Dual-Mode UI Implementation**: [COMPLETE] (Sub-phases 3.1 through 3.4 complete: `variables.css`, `popup/`, `overlay.css`, `FlowHUDHost.js`, `FlowHUDTemplates.js`, `content_loader.js`, `content_main.js`, and `service_worker.js` fully active; QueueManager execution wired with live progress telemetry)
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
| `task/dual-mode-ui` | Active | Phase 3: Dual-Mode UI Implementation (Active working branch, Phase 3 complete) |

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
  - `src/core/FlowDOM.js` — Language-resilient DOM engine with ligature queries, MutationObserver waiters, and in-card validator (`isCardGenerationSuccess`).
  - `src/core/FlowStorage.js` — Persistent storage engine with schema version 3, debounced persistence, queue CRUD operations, and reactive change listeners.
  - `src/core/QueueManager.js` — Master batch automation orchestrator state machine (`IDLE`, `RUNNING`, `PAUSED`, `STOPPED`) coordinating full generation lifecycle across Phase 2 services.
- **Specialized Automation Services (`src/services/`):**
  - `src/services/FlowSettingsService.js` — Prompt settings popover automation, model family selector, aspect ratio, duration, output multipliers, and creative agent mode suppression.
  - `src/services/FlowIngredientService.js` — Reference media clipboard ingestion, upload consent auto-agreement, frame slot triggers, and ingredient chip clearing.
  - `src/services/FlowPromptService.js` — Zero-CDP ProseMirror text injection, prompt clearing, and generate button trigger.
  - `src/services/FlowWatcherService.js` — Virtual-scroll safe top-batch monitoring, progress polling, in-card failure detection (ADR-006/008), and asset metadata extraction.
  - `src/services/FlowDownloadService.js` — Automated card context menu upscaled downloads (`more_vert` -> `download` -> `1080p`/`4K`) and direct download fallback.
- **Design System Tokens (`src/styles/`):**
  - `src/styles/variables.css` — Raycast Dark Precision design tokens (canvas `#07080a`, surface `#0d0d0d`, hairline `#242728`, accent cyan `#079183`, accent green `#59d499`, accent yellow `#ffc533`, accent red `#ff6161`).
  - `src/styles/components.css` — Raycast Dark Precision component styling (field groups, inputs, buttons, custom selects, segmented groups, active/inactive states) ported from RJ AIO Metadata.
- **Minimalist Toolbar Popup Launcher (`src/popup/`):**
  - `src/popup/popup.html` — Minimalist popup layout with brand header, connection status card, action buttons, and telemetry bar.
  - `src/popup/popup.css` — Compact 320px styling adhering to Raycast Dark Precision design tokens.
  - `src/popup/popup.js` — Live tab URL inspector, Google Flow connection detector, reactive storage telemetry, and Studio HUD toggle launcher with `content_loader.js` fallback injection.
- **In-Page Studio Overlay HUD (`src/overlay/`):**
  - `src/overlay/CustomSelect.js` — Pure JavaScript custom dropdown select component adapted for Shadow DOM encapsulation.
  - `src/overlay/FlowHUDTemplates.js` — Modular SVG icons and Studio HUD wireframe layout templates (State A empty dropzone, State B text rows, State C 1-ingredient rows, State D 2-frames rows, parameters sidebar, shared footer, floating pill) aligned 100% with `bahan/vflow-note.md`.
  - `src/overlay/overlay.css` — Isolated Shadow DOM styles for two-column studio HUD (820x520px) and collapsible floating pill (36px).
  - `src/overlay/FlowHUDHost.js` — Open Shadow DOM host mounting `#flow-auto-hud-root`, fluid drag physics, boundary clamping, row-based queue management, CustomSelect enhancement, and QueueManager reactive execution wiring (`Start Batch`, `Stop Batch`), live card progress updating, and stale batch state recovery.
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
- **Engineering Baseline:**
  - `bahan/vflow-note.md` — Master technical specification with language-resilient selector map.
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
- All 8 core automation engine and service modules verified syntax-valid (0 errors).
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
- `icons/` and `src/assets/icons/` verified with 4 branding assets each.
- Strict Zero Native Emoji Policy verified across all documentation and files.
- Working tree active on branch `task/dual-mode-ui`.

---

## 7. Immediate Next Step

- Prepare merge of `task/dual-mode-ui` into `dev`, then proceed to **Phase 4 (End-to-End Integration & Multi-Language Stress Testing)**.

