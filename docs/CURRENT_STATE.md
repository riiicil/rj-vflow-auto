# Current Project State — RJ V-Flow Auto Extension

*Last Updated: 2026-09-17*<br>
*Active Branch: `task/core-automation-engine`*<br>
*Current Milestone: Phase 2 (Core Automation Engine & Services) — [IN_PROGRESS]*

---

## 1. Current Phase Progress

- **Phase 1 — Cleanup & Governance Foundation**: [COMPLETE] (Sub-phase 1.1 complete: legacy branch isolated and pushed, gitignore hardened; Sub-phase 1.2 complete: root zip archives, legacy version folders, and obsolete UI scripts purged; Sub-phase 1.3 complete: complete governance documentation suite established and GOOGLE_FLOW_DOM reference ported; Sub-phase 1.4 complete: root AGENTS.md, DESIGN.md, README.md, CHANGELOG.md, LICENSE, branding icons, and clean src/manifest.json scaffold established)
- **Phase 2 — Core Automation Engine & Services**: [IN_PROGRESS] (Sub-phase 2.1 complete: FlowDOM.js query library and FlowStorage.js persistence engine implemented; Sub-phase 2.2 complete: FlowSettingsService.js implemented; Sub-phase 2.3 pending)
- **Phase 3 — Dual-Mode UI Implementation**: [PLANNED]
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
| `task/core-automation-engine` | Active | Phase 2: Core Automation Engine & Services (Active working branch) |

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
- **Specialized Automation Services (`src/services/`):**
  - `src/services/FlowSettingsService.js` — Prompt settings popover automation, model family selector, aspect ratio, duration, output multipliers, and creative agent mode suppression.
- **Modular Extension Scaffold (`src/`):**
  - `src/manifest.json` — Clean Chromium Manifest V3 without `chrome.debugger` permissions.
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
  - `docs/agent-logs/2026-09-17.md` — Granular daily audit trail (Session Entries 1 through 6).
- **Engineering Baseline:**
  - `bahan/vflow-note.md` — Master technical specification with language-resilient selector map.
  - `C:\Users\admin\Desktop\handoff - vflow.md` — Project context and handoff briefing.

---

## 5. What Does NOT Exist Yet

- **Phase 2 — Core Automation Engine & Services:**
  - `src/services/FlowIngredientService.js` & `src/services/FlowPromptService.js` (Sub-phase 2.3).
  - `src/services/FlowWatcherService.js` (Sub-phase 2.4).
  - `src/services/FlowDownloadService.js` & `src/core/QueueManager.js` (Sub-phase 2.5).
- **Phase 3–5:** Dual-Mode UI HUD, E2E stress testing, and production packaging pipeline.

---

## 6. Testing & Build Verification Status

- `src/manifest.json` verified valid Manifest V3 JSON.
- `src/core/FlowDOM.js` verified valid syntax via `node --check`.
- `src/core/FlowStorage.js` verified valid syntax via `node --check`.
- `src/services/FlowSettingsService.js` verified valid syntax via `node --check`.
- `icons/` and `src/assets/icons/` verified with 4 branding assets each.
- Strict Zero Native Emoji Policy verified across all documentation and files.
- Working tree active on branch `task/core-automation-engine`.

---

## 7. Immediate Next Step

- Proceed to **Phase 2 Sub-phase 2.3**: Implement `src/services/FlowIngredientService.js` and `src/services/FlowPromptService.js` for native ProseMirror paragraph injection and asset clipboard ingestion.
