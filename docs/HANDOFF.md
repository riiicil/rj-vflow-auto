# Agent Handoff Guide — RJ V-Flow Auto (Next-Gen v3.0)

> **Purpose**: Essential operational context, in-flight state, platform gotchas, and immediate instructions for incoming AI agents resuming work.

---

## 1. Immediate Operational State

- **Current Milestone**: Phase 1 (Cleanup & Governance Foundation) — Sub-phase 1.1 Complete
- **Active Branch**: `task/cleanup-and-governance`
- **Latest Commit**: Pending Sub-phase 1.1 commit (`chore(git): isolate and push legacy branch and harden gitignore`)
- **Working Tree**: Clean
- **Build / Test State**: Healthy, governance foundation active

---

## 2. Active In-Flight Context

Sub-phase 1.1 has established the foundational git safety boundaries and tracking documents:
1. The entire historical legacy codebase (v2.x) has been preserved in the `legacy` branch and pushed to remote origin.
2. The working directory is now on task branch `task/cleanup-and-governance`.
3. `.gitignore` has been hardened to prevent build files, zip archives, dependencies, and scratch logs from polluting git.
4. Living governance files (`CURRENT_STATE.md`, `HANDOFF.md`, and `agent-logs/2026-09-17.md`) have been instantiated following RJ AIO Metadata standards.

---

## 3. Actionable Next Steps for Incoming Agent

1. **Sub-phase 1.2 Execution**:
   - Delete all redundant root zip archives: `v2.1.3.zip`, `v2.1.4.zip`, `v2.1.5.zip`, `v2.1.6.zip`.
   - Delete all obsolete version snapshot folders: `v2.1.2/`, `v2.1.3/`, `v2.1.4/`, `v2.1.5/`, `v2.1.6/`.
   - Delete obsolete legacy implementation folders: `bootstrap/`, `panel/`, and `scripts/`.
   - Update `docs/CURRENT_STATE.md`, `docs/HANDOFF.md`, and add Session Entry 2 to `docs/agent-logs/2026-09-17.md`.
   - Commit as `chore(cleanup): purge root zip archives, legacy version folders, and obsolete UI scripts`.
2. **Sub-phase 1.3 Execution**:
   - Mirror and instantiate full governance docs suite from RJ AIO Metadata (`DOCS_STYLE.md`, `ARCHITECTURE.md`, `GIT_POLICY.md`, `ROADMAP.md`, `DECISIONS.md`).
   - Port selector specification to `docs/references/GOOGLE_FLOW_DOM.md`.
3. **Sub-phase 1.4 Execution**:
   - Author root `AGENTS.md` and `DESIGN.md`.
   - Author clean `src/manifest.json` and establish `src/` modular scaffold.

---

## 4. Critical Gotchas & Architectural Traps

- **Zero English-Label Dependency**: Never use English text in DOM selectors (e.g. `[aria-label="Start generation"]` or `:has-text("Download")`). Always use Material Symbols ligatures (`settings_2`, `more_vert`, `download`, `arrow_forward`, `swap_horiz`, `cancel`), custom tags (`flow-*`), or internal CSS classes (`.settings-trigger-button`, `.agent-mode-chip`, `.generate-icon-button`).
- **Zero-CDP Mandate**: Never introduce `chrome.debugger` or CDP synthetic events. All text injection must use `execCommand('insertText')` + native `input` event on `flow-rich-text-editor.prompt-input div.ProseMirror`.
- **In-Card Failure Detection**: Google Flow does not display toasts for content moderation blocks or quota limits. Asset tiles remain permanently blurred with warning badges. Card success must be validated via `isCardGenerationSuccess(card)`.
- **Virtual Scroll Safety**: Angular CDK unmounts older cards. Always monitor the newest batch at top index 0 (`flow-grid-tile-container > :first-child`).

---

## 5. Recent Session Handoff Log

| Session | Date | Branch | Commit | Summary | Next Focus |
| :---: | :---: | :--- | :--- | :--- | :--- |
| 01 | 2026-09-17 | `task/cleanup-and-governance` | Pending | Isolate and push legacy branch, harden gitignore, initialize docs suite | Sub-phase 1.2: Purge root zips and legacy folders |
