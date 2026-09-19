# Agent Handoff Guide — RJ V-Flow Auto (Next-Gen v3.0)

> **Purpose**: Essential operational context, in-flight state, platform gotchas, and immediate instructions for incoming AI agents resuming work.

---

## 1. Immediate Operational State

- **Current Milestone**: Phase 3 (Dual-Mode UI Implementation & Realignment) — [IN_PROGRESS]
- **Active Branch**: `task/dual-mode-ui`
- **Latest Commit**: `e3e2adc` (`fix(watcher): resolve false generation failure with 4-state lifecycle and update resilient selectors`)
- **Working Tree**: Clean (all modules verified syntax-valid)
- **Build / Test State**: Verified healthy, all 15 JS modules (`LoggerService.js`, `FlowDOM.js`, `FlowStorage.js`, `FlowWatcherService.js`, `QueueManager.js`, `CustomSelect.js`, `FlowHUDHost.js`, `FlowHUDTemplates.js`, `content_loader.js`, `content_main.js`, `service_worker.js`, `popup.js`, etc.) passing syntax validation (`node --check`), 4-state lifecycle verified

---

## 2. Active In-Flight Context

Phase 1 (Cleanup & Governance Foundation) was successfully completed and merged into `dev` (`7838930`).
Phase 2 (Core Automation Engine & Services) was successfully completed across all 5 sub-phases and merged into `dev` (`c14ca68`).
Phase 3 (Dual-Mode UI Implementation) active progress:
1. **Sub-phase 3.1 & 3.2 Complete (`ce3a4cb`, `7750ffe`)**: Design tokens, minimalist popup, Shadow DOM HUD host, and draggable floating pill.
2. **Sub-phase 3.3 & 3.4 Complete (`f808156`, `bbd613a`)**: Two-column studio layout, QueueManager controls, and reactive telemetry.
3. **Session 14–16 Blueprint Realignment Complete (`06f1cbd`, `768870f`, `83c66a4`)**: Exact blueprint popup, unified start/stop button, and high-contrast styling.
4. **Commit 1 Complete (Session 17)**:
   - `src/core/FlowDOM.js`: Added master resilient selectors (`SETTINGS_2_BUTTON`, `GRID_LAYOUT_TOGGLE`, `GRID_SIZE_M_TOGGLE`, `CLEAR_PROMPT_SWITCH`, `ERROR_TILE`) and ligatures (`WARNING`, `DELETE`, `DASHBOARD`). Enhanced `query()` and `queryAll()` with safe `:has-text("...")` pseudo-selector resolution. Implemented `isCardGenerationFailed()` identifying genuine failure elements (`<flow-error-tile>`, `warning` ligature, `.error-tile`, `.failed`, `.blurred-error`).
   - `src/services/FlowWatcherService.js`: Implemented the 4-State Lifecycle protocol (`PENDING_RENDERING`, `BLANK_TRANSITION`, `DEFINITIVE_SUCCESS`, `DEFINITIVE_FAILURE`). Fixed false generation failure bug by introducing a 10-second grace timer for the transient blank phase between progress bar disappearance and media element attachment.

---

## 3. Actionable Next Steps for Incoming Agent

1. **Commit 2: Automation Services Pacing & Header Grid Setup**:
   - In `src/services/FlowSettingsService.js`: Implement `setupHeaderGridAndClearPrompt()` automating `settings_2` popover, Grid mode, Size M, and clear-prompt switch verification.
   - Add sequential interaction pacing delays (`await sleep(ms)`) in `FlowSettingsService.js`, `FlowPromptService.js`, and `FlowActionService.js`.
2. **Commit 3 through Commit 7**:
   - Follow prioritized roadmap in `bahan/new note vflow.md:L900-L1111`.

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
| 17 | 2026-09-19 | `task/dual-mode-ui` | `e3e2adc` | Resolve false generation failure with 4-state lifecycle and update resilient selectors | Commit 2: Automation Services Pacing & Header Grid Setup |
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
