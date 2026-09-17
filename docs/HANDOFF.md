# Agent Handoff Guide — RJ V-Flow Auto (Next-Gen v3.0)

> **Purpose**: Essential operational context, in-flight state, platform gotchas, and immediate instructions for incoming AI agents resuming work.

---

## 1. Immediate Operational State

- **Current Milestone**: Phase 2 (Core Automation Engine & Services) — [IN_PROGRESS]
- **Active Branch**: `task/core-automation-engine`
- **Latest Commit**: Pending Sub-phase 2.3 commit (`feat(services): implement FlowIngredientService and FlowPromptService`)
- **Working Tree**: Active working branch in progress
- **Build / Test State**: Verified healthy, all 5 core engine and service modules passing syntax validation (`node --check`)

---

## 2. Active In-Flight Context

Phase 1 (Cleanup & Governance Foundation) was successfully completed and merged into `dev` (`7838930`).
Phase 2 (Core Automation Engine & Services) is progressing:
1. **Sub-phase 2.1 Complete (`7251251`)**: `FlowDOM.js` (language-resilient selector engine, ligature queries, and `isCardGenerationSuccess` validator) and `FlowStorage.js` (Schema v3 persistence, 50ms debounced auto-save, and queue CRUD helpers).
2. **Sub-phase 2.2 Complete (`42698d8`)**: `FlowSettingsService.js` (settings popover automation, fast-path bypass, model selection, duration/multiplier/aspect-ratio toggles, and mandatory agent mode suppression).
3. **Sub-phase 2.3 Complete**: `src/services/FlowIngredientService.js` (native clipboard paste ingestion, upload consent auto-agreement, frame slot triggers, ingredient clearing) and `src/services/FlowPromptService.js` (100% Zero-CDP ProseMirror paragraph injection, prompt clearing, and generate button trigger).

---

## 3. Actionable Next Steps for Incoming Agent

1. **Sub-phase 2.4 Execution**:
   - Implement `src/services/FlowWatcherService.js`: Monitor top-batch index 0 (`flow-grid-tile-container > :first-child`), track generation progress, and validate in-card generation health via `isCardGenerationSuccess(card)` without toast dependencies.
2. **Sub-phase 2.5 Preparation**:
   - `FlowDownloadService.js` (resolution menu trigger, format options, browser download dispatch).
   - `QueueManager.js` (state machine orchestrating batch processing, retry policies, and cooldown periods).

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
| 07 | 2026-09-17 | `task/core-automation-engine` | Pending | Implement FlowIngredientService and FlowPromptService (Sub-phase 2.3 Complete) | Phase 2 Sub-phase 2.4: FlowWatcherService |
| 06 | 2026-09-17 | `task/core-automation-engine` | `42698d8` | Implement FlowSettingsService for model, ratio, and agent suppression (Sub-phase 2.2 Complete) | Phase 2 Sub-phase 2.3: FlowIngredientService & FlowPromptService |
| 05 | 2026-09-17 | `task/core-automation-engine` | `7251251` | Implement FlowDOM selector engine and FlowStorage service (Sub-phase 2.1 Complete) | Phase 2 Sub-phase 2.2: FlowSettingsService |
| 04 | 2026-09-17 | `task/cleanup-and-governance` | `eff9539` | Author root AGENTS.md, DESIGN.md, clean manifest, and src scaffold (Phase 1 Complete) | Merge to dev & start Phase 2 Sub-phase 2.1 |
| 03 | 2026-09-17 | `task/cleanup-and-governance` | `e980390` | Establish complete governance docs suite and port GOOGLE_FLOW_DOM reference | Sub-phase 1.4: Author AGENTS.md, DESIGN.md, clean manifest, and src scaffold |
| 02 | 2026-09-17 | `task/cleanup-and-governance` | `4c07274` | Purge root zip archives, legacy version folders, and obsolete UI scripts | Sub-phase 1.3: Mirror and author full governance docs suite |
| 01 | 2026-09-17 | `task/cleanup-and-governance` | `8f3e5d1` | Isolate and push legacy branch, harden gitignore, initialize docs suite | Sub-phase 1.2: Purge root zips and legacy folders |
