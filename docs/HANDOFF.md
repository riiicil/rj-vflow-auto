# Agent Handoff Guide — RJ V-Flow Auto (Next-Gen v3.0)

> **Purpose**: Essential operational context, in-flight state, platform gotchas, and immediate instructions for incoming AI agents resuming work.

---

## 1. Immediate Operational State

- **Current Milestone**: Phase 1 (Cleanup & Governance Foundation) — Sub-phase 1.3 Complete
- **Active Branch**: `task/cleanup-and-governance`
- **Latest Commit**: Pending Sub-phase 1.3 commit (`docs(governance): establish complete documentation suite adhering to DOCS_STYLE and port GOOGLE_FLOW_DOM`)
- **Working Tree**: Clean
- **Build / Test State**: Healthy, governance foundation active and institutional knowledge ported

---

## 2. Active In-Flight Context

Sub-phase 1.3 has established the complete documentation and governance foundation:
1. Complete governance documentation suite modeled after `RJ_AIO_Metadata` standards has been instantiated in `docs/`:
   - `docs/DOCS_STYLE.md` (Formatting standards, templates, per-commit checklist).
   - `docs/ARCHITECTURE.md` (MV3 lifecycle, Zero-CDP protocol, Mermaid system graph, Shadow DOM HUD).
   - `docs/GIT_POLICY.md` (Branch hierarchy `main <- dev <- task/*`, conventional commits, merge rules).
   - `docs/ROADMAP.md` (Master 5-phase refactoring roadmap with atomic sub-phase breakdown).
   - `docs/DECISIONS.md` (Architectural Decision Records ADR-001 through ADR-008).
2. The complete language-resilient selector map and native execution routines from `bahan/vflow-note.md` have been ported to `docs/references/GOOGLE_FLOW_DOM.md`.
3. The repository is ready for Sub-phase 1.4 foundation scaffolding (`AGENTS.md`, `DESIGN.md`, clean `src/manifest.json`, and `src/` directory scaffold).

---

## 3. Actionable Next Steps for Incoming Agent

1. **Sub-phase 1.4 Execution**:
   - Author root `AGENTS.md` and `DESIGN.md` (Raycast Dark Precision tokens, Phosphor/Lucide SVG icon system, strict zero native emoji).
   - Author clean `src/manifest.json` with permissions (`storage`, `downloads`, `activeTab`, `scripting`), host permissions (`*://flow.google.com/*`), zero `debugger` permission, and sidepanel purged.
   - Establish `src/` modular directory scaffold (`src/background/`, `src/content/`, `src/engine/`, `src/services/`, `src/overlay/`, `src/popup/`, `src/styles/`, `src/icons/`).
   - Move or synchronize `icons/` into `src/icons/`.
   - Update `docs/CURRENT_STATE.md`, `docs/HANDOFF.md`, and add Session Entry 4 to `docs/agent-logs/2026-09-17.md`.
   - Commit as `chore(foundation): author root AGENTS.md, DESIGN.md tokens, clean MV3 manifest, and src scaffold`.
2. **Phase 2 Preparation**:
   - Following Sub-phase 1.4 completion and merge to `dev`, prepare `task/core-automation-engine` for Phase 2 implementation.

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
| 03 | 2026-09-17 | `task/cleanup-and-governance` | Pending | Establish complete governance docs suite and port GOOGLE_FLOW_DOM reference | Sub-phase 1.4: Author AGENTS.md, DESIGN.md, clean manifest, and src scaffold |
| 02 | 2026-09-17 | `task/cleanup-and-governance` | `4c07274` | Purge root zip archives, legacy version folders, and obsolete UI scripts | Sub-phase 1.3: Mirror and author full governance docs suite |
| 01 | 2026-09-17 | `task/cleanup-and-governance` | `8f3e5d1` | Isolate and push legacy branch, harden gitignore, initialize docs suite | Sub-phase 1.2: Purge root zips and legacy folders |
