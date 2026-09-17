# Agent Handoff Guide — RJ V-Flow Auto (Next-Gen v3.0)

> **Purpose**: Essential operational context, in-flight state, platform gotchas, and immediate instructions for incoming AI agents resuming work.

---

## 1. Immediate Operational State

- **Current Milestone**: Phase 1 (Cleanup & Governance Foundation) — Sub-phase 1.2 Complete
- **Active Branch**: `task/cleanup-and-governance`
- **Latest Commit**: Pending Sub-phase 1.2 commit (`chore(cleanup): purge root zip archives, legacy version folders, and obsolete UI scripts`)
- **Working Tree**: Clean
- **Build / Test State**: Healthy, legacy clutter purged

---

## 2. Active In-Flight Context

Sub-phase 1.2 has successfully completed the repository purging:
1. All redundant zip archives (`v2.1.3.zip` – `v2.1.6.zip`) and version folders (`v2.1.2/` – `v2.1.6/`) have been removed.
2. The obsolete `bootstrap/`, `panel/`, and `scripts/` directories have been purged.
3. Outdated root build scripts and package configurations have been removed to prevent legacy tooling conflicts.
4. The repository is now clean and ready for Sub-phase 1.3 governance documentation instantiation.

---

## 3. Actionable Next Steps for Incoming Agent

1. **Sub-phase 1.3 Execution**:
   - Mirror and instantiate full governance docs suite from `C:\Users\admin\Desktop\git\RJ_AIO_Metadata`:
     - `docs/DOCS_STYLE.md` (English documentation formatting rules and templates).
     - `docs/ARCHITECTURE.md` (MV3 lifecycle, component map, data flow diagrams, zero-CDP mechanics).
     - `docs/GIT_POLICY.md` (Branching model `dev <- task/*`, conventional commit rules, non-fast-forward merge).
     - `docs/ROADMAP.md` (Granular 5-phase roadmap with atomic sub-phase commits).
     - `docs/DECISIONS.md` (ADR-001 through ADR-007 establishing zero-CDP, Shadow DOM HUD, language-resilient selectors).
   - Port language-resilient selector specification from `bahan/vflow-note.md` into `docs/references/GOOGLE_FLOW_DOM.md`.
   - Update `docs/CURRENT_STATE.md`, `docs/HANDOFF.md`, and add Session Entry 3 to `docs/agent-logs/2026-09-17.md`.
   - Commit as `docs(governance): establish complete documentation suite adhering to DOCS_STYLE and port GOOGLE_FLOW_DOM`.
2. **Sub-phase 1.4 Execution**:
   - Author root `AGENTS.md` and `DESIGN.md`.
   - Author clean `src/manifest.json` and establish `src/` modular scaffold.

---

## 4. Critical Gotchas & Architectural Traps

- **Zero English-Label Dependency**: Never query elements using localized English `aria-label` text (e.g. `[aria-label="Start generation"]`, `[aria-label="Tile grid settings"]`). Always use Material Symbols ligatures (`settings_2`, `more_vert`, `download`, `arrow_forward`, `swap_horiz`, `cancel`), custom tags (`flow-*`), or internal CSS classes (`.settings-trigger-button`, `.agent-mode-chip`, `.generate-icon-button`).
- **Zero-CDP Mandate**: Never introduce `chrome.debugger` or CDP synthetic events. All text injection must use `execCommand('insertText')` + native `input` event on `flow-rich-text-editor.prompt-input div.ProseMirror`.
- **In-Card Failure Detection**: Google Flow does not display toasts for content moderation blocks or quota limits. Asset tiles remain permanently blurred with warning badges. Card success must be validated via `isCardGenerationSuccess(card)`.
- **Virtual Scroll Safety**: Angular CDK unmounts older cards. Always monitor the newest batch at top index 0 (`flow-grid-tile-container > :first-child`).

---

## 5. Recent Session Handoff Log

| Session | Date | Branch | Commit | Summary | Next Focus |
| :---: | :---: | :--- | :--- | :--- | :--- |
| 02 | 2026-09-17 | `task/cleanup-and-governance` | Pending | Purge root zip archives, legacy version folders, and obsolete UI scripts | Sub-phase 1.3: Mirror and author full governance docs suite |
| 01 | 2026-09-17 | `task/cleanup-and-governance` | `8f3e5d1` | Isolate and push legacy branch, harden gitignore, initialize docs suite | Sub-phase 1.2: Purge root zips and legacy folders |
