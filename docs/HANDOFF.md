# Agent Handoff Guide — RJ V-Flow Auto (Next-Gen v3.0)

> **Purpose**: Essential operational context, in-flight state, platform gotchas, and immediate instructions for incoming AI agents resuming work.

---

## 1. Immediate Operational State

- **Current Milestone**: Phase 2 (Core Automation Engine & Services) — [COMPLETE] / Ready for Phase 3
- **Active Branch**: `task/core-automation-engine`
- **Latest Commit**: Pending Sub-phase 2.5 commit (`feat(core): implement FlowDownloadService and QueueManager orchestrator`)
- **Working Tree**: Active working branch (Phase 2 complete)
- **Build / Test State**: Verified healthy, all 8 core engine and service modules passing syntax validation (`node --check`)

---

## 2. Active In-Flight Context

Phase 1 (Cleanup & Governance Foundation) was successfully completed and merged into `dev` (`7838930`).
Phase 2 (Core Automation Engine & Services) is 100% complete across all 5 sub-phases:
1. **Sub-phase 2.1 Complete (`7251251`)**: `FlowDOM.js` (language-resilient selector engine, ligature queries, and `isCardGenerationSuccess` validator) and `FlowStorage.js` (Schema v3 persistence, 50ms debounced auto-save, and queue CRUD helpers).
2. **Sub-phase 2.2 Complete (`42698d8`)**: `FlowSettingsService.js` (settings popover automation, fast-path bypass, model selection, duration/multiplier/aspect-ratio toggles, and mandatory agent mode suppression).
3. **Sub-phase 2.3 Complete (`270cee5`)**: `FlowIngredientService.js` (native clipboard paste ingestion, upload consent auto-agreement, frame slot triggers, ingredient clearing) and `FlowPromptService.js` (100% Zero-CDP ProseMirror paragraph injection, prompt clearing, and generate button trigger).
4. **Sub-phase 2.4 Complete (`e6335d3`)**: `src/services/FlowWatcherService.js` (ADR-008 virtual scroll top-batch containment, batch progress tracking, and ADR-006 in-card failure detection).
5. **Sub-phase 2.5 Complete**: `src/services/FlowDownloadService.js` (card context menu upscaled downloads `more_vert` -> `download` -> `1080p`/`4K` and direct fallback) and `src/core/QueueManager.js` (master batch automation orchestrator state machine `IDLE` -> `RUNNING` -> `PAUSED` -> `STOPPED`).

---

## 3. Actionable Next Steps for Incoming Agent

1. **Merge Phase 2 to Dev Branch (When Authorized)**:
   - Synchronize and merge `task/core-automation-engine` into `dev` via `git checkout dev && git merge --no-ff task/core-automation-engine`.
2. **Initiate Phase 3 (Dual-Mode UI Implementation)**:
   - Branch from updated `dev` to `task/dual-mode-ui`.
   - **Sub-phase 3.1**: Implement Minimalist Toolbar Popup Launcher (`src/popup/popup.html`, `popup.css`, `popup.js`) with active connection status indicator, open-studio action, and quick stats.
   - **Sub-phase 3.2**: Implement Shadow DOM Studio Overlay HUD host (`#flow-auto-hud-root`), draggable floating pill, and windowing mechanics.

---

## 4. Critical Gotchas & Architectural Traps

- **Zero English-Label Dependency**: Never query elements using localized English `aria-label` text (e.g. `[aria-label="Start generation"]`, `[aria-label="Tile grid settings"]`). Always use Material Symbols ligatures (`settings_2`, `more_vert`, `download`, `arrow_forward`, `swap_horiz`, `cancel`), custom tags (`flow-*`), or internal CSS classes (`.settings-trigger-button`, `.agent-mode-chip`, `.generate-icon-button`).
- **Zero-CDP Mandate**: Never introduce `chrome.debugger` or CDP synthetic events. All text injection must use `document.execCommand('insertText')` + native `InputEvent` dispatch on `flow-rich-text-editor.prompt-input div.ProseMirror`.
- **In-Card Failure Detection**: Google Flow does not display toasts for content moderation blocks or quota limits. Asset tiles remain permanently blurred with warning badges. Card success must be validated via `isCardGenerationSuccess(card)`.
- **Virtual Scroll Safety**: Angular CDK unmounts older cards. Always monitor the newest batch at top index 0 (`flow-grid-tile-container > :first-child`).

---

## 5. Recent Session Handoff Log

| Session | Date | Branch | Commit | Summary | Next Focus |
| :---: | :---: | :--- | :--- | :--- | :--- |
| 09 | 2026-09-17 | `task/core-automation-engine` | Pending | Implement FlowDownloadService and QueueManager orchestrator (Phase 2 Complete) | Phase 3 Sub-phase 3.1: Minimalist Toolbar Popup Launcher |
| 08 | 2026-09-17 | `task/core-automation-engine` | `e6335d3` | Implement FlowWatcherService for top-batch monitoring and failure detection (Sub-phase 2.4 Complete) | Phase 2 Sub-phase 2.5: FlowDownloadService & QueueManager |
| 07 | 2026-09-17 | `task/core-automation-engine` | `270cee5` | Implement FlowIngredientService and FlowPromptService (Sub-phase 2.3 Complete) | Phase 2 Sub-phase 2.4: FlowWatcherService |
| 06 | 2026-09-17 | `task/core-automation-engine` | `42698d8` | Implement FlowSettingsService for model, ratio, and agent suppression (Sub-phase 2.2 Complete) | Phase 2 Sub-phase 2.3: FlowIngredientService & FlowPromptService |
| 05 | 2026-09-17 | `task/core-automation-engine` | `7251251` | Implement FlowDOM selector engine and FlowStorage service (Sub-phase 2.1 Complete) | Phase 2 Sub-phase 2.2: FlowSettingsService |
| 04 | 2026-09-17 | `task/cleanup-and-governance` | `eff9539` | Author root AGENTS.md, DESIGN.md, clean manifest, and src scaffold (Phase 1 Complete) | Merge to dev & start Phase 2 Sub-phase 2.1 |
| 03 | 2026-09-17 | `task/cleanup-and-governance` | `e980390` | Establish complete governance docs suite and port GOOGLE_FLOW_DOM reference | Sub-phase 1.4: Author AGENTS.md, DESIGN.md, clean manifest, and src scaffold |
| 02 | 2026-09-17 | `task/cleanup-and-governance` | `4c07274` | Purge root zip archives, legacy version folders, and obsolete UI scripts | Sub-phase 1.3: Mirror and author full governance docs suite |
| 01 | 2026-09-17 | `task/cleanup-and-governance` | `8f3e5d1` | Isolate and push legacy branch, harden gitignore, initialize docs suite | Sub-phase 1.2: Purge root zips and legacy folders |
