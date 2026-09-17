# Agent Handoff Guide — RJ V-Flow Auto (Next-Gen v3.0)

> **Purpose**: Essential operational context, in-flight state, platform gotchas, and immediate instructions for incoming AI agents resuming work.

---

## 1. Immediate Operational State

- **Current Milestone**: Phase 1 (Cleanup & Governance Foundation) — [COMPLETE] / Ready for Phase 2
- **Active Branch**: `task/cleanup-and-governance`
- **Latest Commit**: Pending Sub-phase 1.4 commit (`chore(foundation): author root AGENTS.md, DESIGN.md tokens, and clean MV3 manifest`)
- **Working Tree**: Clean
- **Build / Test State**: Verified healthy, clean Manifest V3 ready, zero legacy clutter

---

## 2. Active In-Flight Context

Phase 1 (Cleanup & Governance Foundation) is now **100% complete**:
1. All legacy v2.x code and commit history is permanently preserved on remote `origin/legacy`.
2. All root zip archives, legacy version folders, and obsolete UI/CDP scripts have been purged.
3. The complete documentation suite adhering to `DOCS_STYLE.md` is active in `docs/`.
4. Permanent institutional knowledge of Google Flow's DOM selectors is ported to `docs/references/GOOGLE_FLOW_DOM.md`.
5. Root project foundation files (`AGENTS.md`, `DESIGN.md`, `README.md`, `CHANGELOG.md`, `LICENSE`, `icons/`) are established.
6. A clean, zero-CDP Manifest V3 has been established at `src/manifest.json` with modular directory scaffolding under `src/`.

---

## 3. Actionable Next Steps for Incoming Agent

1. **Phase 1 Merge to `dev`** (Pending Human User Instruction):
   - When instructed by human user:
     ```bash
     git checkout dev
     git merge --no-ff task/cleanup-and-governance
     ```
2. **Phase 2 (Core Automation Engine & Services) Initialization**:
   - Create task branch:
     ```bash
     git checkout -b task/core-automation-engine dev
     ```
   - **Sub-phase 2.1 Execution**:
     - Implement `src/core/FlowDOM.js`: Centralized language-resilient selector query engine (Material Symbols ligatures, Angular custom tags, internal CSS classes).
     - Implement `src/core/FlowStorage.js`: Storage engine (`chrome.storage.local`) with debounced auto-save, schema versioning, and auto-healing.
     - Update `docs/CURRENT_STATE.md`, `docs/HANDOFF.md`, and add Session Entry 5 to `docs/agent-logs/2026-09-17.md`.
     - Commit as `feat(core): implement FlowDOM selector engine and FlowStorage service`.

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
| 04 | 2026-09-17 | `task/cleanup-and-governance` | Pending | Author root AGENTS.md, DESIGN.md, clean manifest, and src scaffold (Phase 1 Complete) | Phase 2 Sub-phase 2.1: FlowDOM & FlowStorage |
| 03 | 2026-09-17 | `task/cleanup-and-governance` | `e980390` | Establish complete governance docs suite and port GOOGLE_FLOW_DOM reference | Sub-phase 1.4: Author AGENTS.md, DESIGN.md, clean manifest, and src scaffold |
| 02 | 2026-09-17 | `task/cleanup-and-governance` | `4c07274` | Purge root zip archives, legacy version folders, and obsolete UI scripts | Sub-phase 1.3: Mirror and author full governance docs suite |
| 01 | 2026-09-17 | `task/cleanup-and-governance` | `8f3e5d1` | Isolate and push legacy branch, harden gitignore, initialize docs suite | Sub-phase 1.2: Purge root zips and legacy folders |
