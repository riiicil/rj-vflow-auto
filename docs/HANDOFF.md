# Agent Handoff Guide — RJ V-Flow Auto (Next-Gen v3.0)

> **Purpose**: Essential operational context, in-flight state, platform gotchas, and immediate instructions for incoming AI agents resuming work.

---

## 1. Immediate Operational State

- **Current Milestone**: Phase 3 (Dual-Mode UI Implementation) — [IN_PROGRESS]
- **Active Branch**: `task/dual-mode-ui`
- **Latest Commit**: Pending Sub-phase 3.2 commit (`feat(overlay): implement Shadow DOM HUD host and draggable floating pill`)
- **Working Tree**: Active working branch (Sub-phase 3.2 complete)
- **Build / Test State**: Verified healthy, `FlowHUDHost.js`, `content_main.js`, `service_worker.js`, and `popup.js` passing syntax validation (`node --check`), all design tokens and popup/overlay files verified

---

## 2. Active In-Flight Context

Phase 1 (Cleanup & Governance Foundation) was successfully completed and merged into `dev` (`7838930`).
Phase 2 (Core Automation Engine & Services) was successfully completed across all 5 sub-phases and merged into `dev` (`c14ca68`).
Phase 3 (Dual-Mode UI Implementation) is now in flight:
1. **Sub-phase 3.1 Complete (`ce3a4cb`)**:
   - `src/styles/variables.css`: Defined Raycast Dark Precision design tokens (canvas `#07080a`, surface `#0d0d0d`, elevated `#101111`, card `#121212`, input `#18191a`, hairline border `#242728`, accent cyan `#57c1ff`, accent green `#59d499`, accent yellow `#ffc533`, accent red `#ff6161`, and shadows).
   - `src/popup/popup.html`: Minimalist toolbar popup markup featuring brand header (`logo_rj.png`, version badge `v3.0.0`), live connection status card, action controls (`Open Studio HUD` / `Open Google Flow`), and 3-column storage telemetry bar (`Engine`, `Pending`, `Done`).
   - `src/popup/popup.css`: Compact 320px styling with Raycast Dark aesthetics, glowing status dots, and subtle borders.
   - `src/popup/popup.js`: Inspects active tab URL (`https://flow.google.com/*`), reactive storage telemetry via `FlowStorage.onChanged()`, and safe content script message dispatch (`TOGGLE_HUD`).
2. **Sub-phase 3.2 Complete**:
   - `src/overlay/overlay.css`: Encapsulated Raycast Dark styles for Studio HUD window (720x480px, #07080a canvas, #242728 hairline border, 12px radius) and Floating Pill (34px height, grip handle dots, live ticker, status indicator, restore button).
   - `src/overlay/FlowHUDHost.js`: Open Shadow DOM host mounting `#flow-auto-hud-root`, fluid draggable physics with viewport boundary clamping, position persistence in `FlowStorage`, minimize/restore transitions, and reactive live status ticker.
   - `src/content/content_main.js`: Content script entrypoint on `flow.google.com` initializing overlay and runtime message routing.
   - `src/background/service_worker.js`: Manifest V3 background service worker with lifecycle event listener.

---

## 3. Actionable Next Steps for Incoming Agent

1. **Phase 3 Sub-phase 3.3 (Two-Column Studio Layout & Queue Builder)**:
   - Implement dynamic Left Column (States A, B, C, D queue builder) inside `src/overlay/FlowStudioHUD.js`.
   - Implement Right Column (collapsible parameters sidebar: model family, aspect ratio, duration, resolution, auto-download, speed settings).
2. **Phase 3 Sub-phase 3.4 (Reactive Storage Synchronization & Automation Controls)**:
   - Wire `QueueManager` controls (Start, Pause, Resume, Stop) to HUD interface buttons with real-time status ticker.

---

## 4. Critical Gotchas & Architectural Traps

- **Zero English-Label Dependency**: Never query elements using localized English `aria-label` text (e.g. `[aria-label="Start generation"]`, `[aria-label="Tile grid settings"]`). Always use Material Symbols ligatures (`settings_2`, `more_vert`, `download`, `arrow_forward`, `swap_horiz`, `cancel`), custom tags (`flow-*`), or internal CSS classes (`.settings-trigger-button`, `.agent-mode-chip`, `.generate-icon-button`).
- **Zero-CDP Mandate**: Never introduce `chrome.debugger` or CDP synthetic events. All text injection must use `document.execCommand('insertText')` + native `InputEvent` dispatch on `flow-rich-text-editor.prompt-input div.ProseMirror`.
- **In-Card Failure Detection**: Google Flow does not display toasts for content moderation blocks or quota limits. Asset tiles remain permanently blurred with warning badges. Card success must be validated via `isCardGenerationSuccess(card)`.
- **Virtual Scroll Safety**: Angular CDK unmounts older cards. Always monitor the newest batch at top index 0 (`flow-grid-tile-container > :first-child`).
- **Shadow DOM Isolation (ADR-003)**: Overlay HUD components MUST render inside open Shadow DOM `#flow-auto-hud-root` to guarantee zero CSS bleed into or out of Google Flow's Angular Material stylesheet.

---

## 5. Recent Session Handoff Log

| Session | Date | Branch | Commit | Summary | Next Focus |
| :---: | :---: | :--- | :--- | :--- | :--- |
| 11 | 2026-09-17 | `task/dual-mode-ui` | Pending | Implement Shadow DOM HUD host and draggable floating pill (Sub-phase 3.2 Complete) | Phase 3 Sub-phase 3.3: Two-Column Studio Layout & Queue Builder |
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
