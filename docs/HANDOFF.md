# Agent Handoff Guide — RJ V-Flow Auto (Next-Gen v3.0)

> **Purpose**: Essential operational context, in-flight state, platform gotchas, and immediate instructions for incoming AI agents resuming work.

---

## 1. Immediate Operational State

- **Current Milestone**: Phase 3 (Dual-Mode UI Implementation) — [COMPLETE]
- **Active Branch**: `task/dual-mode-ui`
- **Latest Commit**: Pending Sub-phase 3.4 commit (`feat(overlay): connect reactive storage synchronization and automation controls`)
- **Working Tree**: Active working branch (Phase 3 complete)
- **Build / Test State**: Verified healthy, all 14 JS modules (`content_loader.js`, `FlowHUDHost.js`, `QueueManager.js`, `content_main.js`, `service_worker.js`, `popup.js`, etc.) passing syntax validation (`node --check`), all design tokens and popup/overlay files verified

---

## 2. Active In-Flight Context

Phase 1 (Cleanup & Governance Foundation) was successfully completed and merged into `dev` (`7838930`).
Phase 2 (Core Automation Engine & Services) was successfully completed across all 5 sub-phases and merged into `dev` (`c14ca68`).
Phase 3 (Dual-Mode UI Implementation) is now complete:
1. **Sub-phase 3.1 Complete (`ce3a4cb`)**:
   - `src/styles/variables.css`: Defined Raycast Dark Precision design tokens (canvas `#07080a`, surface `#0d0d0d`, elevated `#101111`, card `#121212`, input `#18191a`, hairline border `#242728`, accent cyan `#57c1ff`, accent green `#59d499`, accent yellow `#ffc533`, accent red `#ff6161`, and shadows).
   - `src/popup/popup.html`: Minimalist toolbar popup markup featuring brand header (`logo_rj.png`, version badge `v3.0.0`), live connection status card, action controls (`Open Studio HUD` / `Open Google Flow`), and 3-column storage telemetry bar (`Engine`, `Pending`, `Done`).
   - `src/popup/popup.css`: Compact 320px styling with Raycast Dark aesthetics, glowing status dots, and subtle borders.
   - `src/popup/popup.js`: Inspects active tab URL (`https://flow.google.com/*`), reactive storage telemetry via `FlowStorage.onChanged()`, and safe content script message dispatch (`TOGGLE_HUD`).
2. **Sub-phase 3.2 Complete (`7750ffe`)**:
   - `src/overlay/overlay.css`: Encapsulated Raycast Dark styles for Studio HUD window (720x480px, #07080a canvas, #242728 hairline border, 12px radius) and Floating Pill (34px height, grip handle dots, live ticker, status indicator, restore button).
   - `src/overlay/FlowHUDHost.js`: Open Shadow DOM host mounting `#flow-auto-hud-root`, fluid draggable physics with viewport boundary clamping, position persistence in `FlowStorage`, minimize/restore transitions, and reactive live status ticker.
   - `src/content/content_main.js`: Content script entrypoint on `flow.google.com` initializing overlay and runtime message routing.
   - `src/background/service_worker.js`: Manifest V3 background service worker with lifecycle event listener.
3. **Sub-phase 3.3 & 3.4 Complete (`f808156`, `bbd613a`)**:
   - Implemented Shadow DOM HUD host, dynamic module loader (`content_loader.js`), and QueueManager automation controls.
4. **Blueprint Realignment & RJ AIO Metadata Parity Complete**:
   - `src/styles/variables.css`: Realigned `--rj-accent-cyan` to signature `#079183` and `--rj-accent-cyan-soft` to `rgba(7, 145, 131, 0.18)`.
   - `src/styles/components.css`: Ported complete Raycast Dark Precision component suite (form controls, inputs, buttons, segmented groups, active/inactive disabled states) from RJ AIO Metadata.
   - `src/overlay/CustomSelect.js`: Implemented Shadow DOM adapted accessible custom dropdown select component with smart viewport placement.
   - `src/overlay/FlowHUDTemplates.js`: Realigned layout 100% to `bahan/vflow-note.md` wireframe (lines 429-631) featuring Left Column Queue Builder (State A empty dropzone, State B text prompt rows, State C 1-ingredient rows with image thumbnail slot, State D 2-frames rows), Right Column Parameters Sidebar with CustomSelect, shared footer (`Save Queue`, `Start`, `Stop`), and floating draggable pill.
   - `src/overlay/overlay.css`: Complete styling for two-column studio HUD (820x520px), media dropzone slots, auto-resizing prompt inputs, and action buttons.
   - `src/overlay/FlowHUDHost.js`: Injected stylesheets, row-based queue management, drag-and-drop ingestion, CSV/TXT import, clipboard paste, CustomSelect enhancement, and QueueManager reactive execution.

---

## 3. Actionable Next Steps for Incoming Agent

1. **Merge `task/dual-mode-ui` into `dev`**:
   - `git checkout dev && git merge --no-ff task/dual-mode-ui`
2. **Phase 4 (End-to-End Integration & Multi-Language Stress Testing)**:
   - Create task branch `task/e2e-integration-testing`.
   - Implement Phase 4 Sub-phase 4.1 (`Text-to-Image & Text-to-Video Batch Validation`).

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
| 14 | 2026-09-17 | `task/dual-mode-ui` | Pending | Realign Studio HUD with vflow-note wireframe and RJ AIO Metadata design system | Merge task/dual-mode-ui to dev & begin Phase 4 |
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
