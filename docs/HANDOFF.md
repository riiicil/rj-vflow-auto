# Agent Handoff Guide — RJ V-Flow Auto (Next-Gen v3.0)

> **Purpose**: Essential operational context, in-flight state, platform gotchas, and immediate instructions for incoming AI agents resuming work.

---

## 1. Immediate Operational State

- **Current Milestone**: Phase 3 (Dual-Mode UI Implementation & Realignment) — [COMPLETE]
- **Active Branch**: `task/dual-mode-ui`
- **Latest Commit**: Pending Session 15 commit (`feat(ui): align popup and overlay HUD with blueprint, add logger, and fix generation detection`)
- **Working Tree**: Active working branch (Phase 3 complete & verified)
- **Build / Test State**: Verified healthy, all 15 JS modules (`LoggerService.js`, `FlowDOM.js`, `FlowStorage.js`, `FlowWatcherService.js`, `QueueManager.js`, `CustomSelect.js`, `FlowHUDHost.js`, `FlowHUDTemplates.js`, `content_loader.js`, `content_main.js`, `service_worker.js`, `popup.js`, etc.) passing syntax validation (`node --check`), all design tokens and popup/overlay files verified

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
4. **Blueprint Realignment, Logger Engine, & DOM Fix Complete (Session 15)**:
   - `src/services/LoggerService.js`: Created unified, colorized console logger matching RJ AIO Metadata (`[RJ V-Flow Auto]` prefix).
   - `src/core/FlowDOM.js` & `src/services/FlowWatcherService.js`: Fixed false generation failure bug caused by `.hover-overlay-has-progress-bar` misidentification; added `flow-pending-tile` and `img.image` support.
   - `src/core/FlowStorage.js` & `src/overlay/FlowHUDHost.js`: Partitioned AI models strictly by mode (Video = Veo & Omni; Image = Nano Banana; Duration = Omni Flash only).
   - `src/overlay/CustomSelect.js`: Added smart filtering for hidden options and hidden optgroups (`style.display === 'none'`).
   - `src/overlay/FlowHUDTemplates.js` & `src/overlay/overlay.css`: Header updated to `V-Flow` (removed `Studio` chip), window controls styled (`.rj-hud-btn-icon`), elevated footer background (`#101111`).
   - `src/popup/`: 380px layout with brand header, quick `Open HUD` action, State 1 (Unmatched warning) vs State 2 (Matched status), and 3-box telemetry grid.

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
- **Permanent Progress Bar Container Gotcha**: `<flow-video-tile>` always has an element with class `.hover-overlay-has-progress-bar` in the DOM as its hover container even when idle or finished! NEVER use `.hover-overlay-has-progress-bar` as an indicator of an active progress bar; check `.progress-bar`, `div.progress-bar-fill`, or `<flow-pending-tile>`.
- **In-Card Failure Detection**: Google Flow does not display toasts for content moderation blocks or quota limits. Asset tiles remain permanently blurred with warning badges. Card success must be validated via `isCardGenerationSuccess(card)`.
- **Image Tile Tag Differences**: Video tiles use `img.thumbnail` while image generation tiles (`flow-image-tile`) use `img.image`. `CARD_MEDIA` selector must include both.
- **Virtual Scroll Safety**: Angular CDK unmounts older cards. Always monitor the newest batch at top index 0 (`flow-grid-tile-container > :first-child`).
- **Shadow DOM Style Scope Trap**: CSS custom properties declared exclusively on `:root` do not pierce open Shadow DOM boundaries. Always declare tokens on `:root, :host`.

---

## 5. Recent Session Handoff Log

| Session | Date | Branch | Commit | Summary | Next Focus |
| :---: | :---: | :--- | :--- | :--- | :--- |
| 16 | 2026-09-17 | `task/dual-mode-ui` | Pending | Enforce exact blueprint popup, unify start-stop button, and fix icon visibility | Merge task/dual-mode-ui to dev & begin Phase 4 |
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
