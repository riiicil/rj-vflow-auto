# DOCS_STYLE.md — Documentation Standards & Templates
**Standardization Guide for All Project Documentation in `docs/`**

> **Purpose**: This document establishes rigid structure templates and formatting rules for all documentation across the **RJ V-Flow Auto** repository. Every AI agent and human contributor must adhere to these exact templates to maintain consistency, clarity, and operational continuity across development sessions.

---

## 1. General Formatting Rules

1. **Language**: All formal documentation in `docs/` must be authored in **English**.
2. **Strict Zero Native Emoji Policy**:
   - Native emoji characters (e.g. status circles, rocket, checkmarks, warning triangles, folder icons, coffee, etc.) are **strictly prohibited** in all documentation, UI code, commit messages, and logs.
   - Use plain text bracketed badges instead: `[COMPLETE]`, `[IN_PROGRESS]`, `[PLANNED]`, `[BLOCKED]`, `[YES]`, `[NO]`.
3. **Chronological Ordering**:
   - In `docs/agent-logs/YYYY-MM-DD.md`, **newest entries must always be placed at the top** (`newest at top, oldest at bottom`).
4. **Alert Blocks**: Use GitHub markdown alerts (`> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]`) for emphasis. Never nest alerts.
5. **File Links**: Always use markdown link syntax with relative repo paths or file basenames (e.g., [`docs/CURRENT_STATE.md`](file:///c:/Users/admin/Desktop/git/RJ_V-Flow_Auto/docs/CURRENT_STATE.md) or [`docs/references/GOOGLE_FLOW_DOM.md`](file:///c:/Users/admin/Desktop/git/RJ_V-Flow_Auto/docs/references/GOOGLE_FLOW_DOM.md)).

---

## 2. Standard Template: `docs/agent-logs/YYYY-MM-DD.md`

`agent-logs/` serves as the granular audit trail (the flight recorder). Every daily log file must follow this exact structure:

```markdown
# Agent Log — YYYY-MM-DD

---

<!-- NEW ENTRIES GO HERE — newest at top, oldest at bottom -->

## Session Entry <N> — <Concise Title of Work>

**Time:** ~HH:MM WIB (or ISO 8601 string)  
**Branch:** `task/<branch-name>`  
**Commit:** `<commit-hash>` `<commit-message>`  
**Product code changed:** YES | NO  
**Pushed:** YES | NO  

### What Was Done
- **<Component or Area 1> (<file/path>):**
  - <Specific technical detail of what was built or changed>
  - <Rationale or key implementation logic>
- **<Component or Area 2> (<file/path>):**
  - <Specific technical detail>
- **Verification:**
  - <Commands executed, tests passed, manual checks verified>

---
```

---

## 3. Standard Template: `docs/HANDOFF.md`

`HANDOFF.md` serves as the operational continuity briefing (the baton pass). It must allow an incoming agent to immediately resume work without reading full historical conversation memory.

> [!IMPORTANT]
> `HANDOFF.md` is **NOT** a dump of all past commit descriptions. It is a living, high-signal operational briefing.

```markdown
# Agent Handoff Guide — RJ V-Flow Auto

> **Purpose**: Essential operational context, in-flight state, platform gotchas, and immediate instructions for incoming AI agents resuming work.

---

## 1. Immediate Operational State

- **Current Milestone**: Phase X (<Phase Name>)
- **Active Branch**: `task/<branch-name>`
- **Latest Commit**: `<commit-hash>` `<commit-message>`
- **Working Tree**: Clean | Changes in progress
- **Build / Test State**: Verified healthy | Failing

---

## 2. Active In-Flight Context

<1-2 paragraphs detailing exactly what was completed in the latest session, what state the system is currently in, and any pending decisions or ongoing threads.>

---

## 3. Actionable Next Steps for Incoming Agent

1. **Step 1 (<Component/Scope>)**: <Precise first action the next agent must execute>
2. **Step 2 (<Component/Scope>)**: <Subsequent action>
3. **Step 3 (<Verification>)**: <Verification step to validate completion>

---

## 4. Critical Gotchas & Architectural Traps

<List of hard-learned discoveries, DOM quirks, browser limits, and traps that the incoming agent must avoid.>
- **Trap 1**: <Description and required workaround>
- **Trap 2**: <Description and required workaround>

---

## 5. How to Run & Verify Locally

1. Open Chromium browser (Chrome / Edge / Brave).
2. Go to `chrome://extensions/` and enable Developer mode.
3. Click "Load unpacked" and select `src/`.
4. Navigate to `https://flow.google.com/`.

---

## 6. Recent Session Handoff Log

| Session | Date | Branch | Commit | Summary | Next Focus |
| :---: | :---: | :--- | :--- | :--- | :--- |
| 02 | YYYY-MM-DD | `task/...` | `<hash>` | <Brief summary> | <Target of next session> |
| 01 | YYYY-MM-DD | `task/...` | `<hash>` | <Brief summary> | <Target of next session> |
```

---

## 4. Standard Template: `docs/CURRENT_STATE.md`

`CURRENT_STATE.md` serves as the architectural inventory dashboard:

```markdown
# Current Project State — RJ V-Flow Auto Extension

*Last Updated: YYYY-MM-DD*  
*Active Branch: `task/<branch-name>`*  
*Current Milestone: Phase X (<Phase Name>)*

---

## 1. Current Phase Progress

- **Phase 1 — Cleanup & Governance Foundation**: [IN_PROGRESS]
- **Phase 2 — Core Automation Engine & Services**: [PLANNED]
- **Phase 3 — Dual-Mode UI Implementation**: [PLANNED]
- **Phase 4 — End-to-End Integration & Multi-Language Stress Testing**: [PLANNED]
- **Phase 5 — Production Packaging Pipeline & Release**: [PLANNED]

---

## 2. Branches Matrix

| Branch | Status | Purpose |
| :--- | :--- | :--- |
| `main` | Production | Stable production releases only |
| `dev` | Integration | Active development integration branch |
| `legacy` | Remote Archived | Permanent archive of legacy v2.x codebase and history |
| `task/<branch>` | Active | <Scope of current feature branch> |

---

## 3. Platform & Target Model Matrix

| Model Family | Media Type | Generation Feature | Sub-Mode | Duration Support | Implementation Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| ... | ... | ... | ... | ... | [STATUS] |

---

## 4. What Exists

- <Complete inventory of created files and modules>

---

## 5. What Does NOT Exist Yet

- <List of planned components yet to be built>

---

## 6. Testing & Build Verification Status

- <Test suite results, syntax checks, manifest validations>

---

## 7. Immediate Next Step

- <Single clear next operational task>
```

---

## 5. Standard Template: `docs/DECISIONS.md`

Architectural Decision Records (ADRs) must follow standard ADR format:

```markdown
# Architectural Decision Records (ADR) — RJ V-Flow Auto

## Index
- [ADR-001: Manifest V3 & Vanilla ES Modules Architecture](#adr-001-manifest-v3--vanilla-es-modules-architecture)
...

---

## ADR-001: <Title>
- **Status**: ACCEPTED | PROPOSED | SUPERSEDED
- **Date**: YYYY-MM-DD
- **Context**: <Problem statement and technical constraints>
- **Decision**: <What was decided and chosen strategy>
- **Consequences**:
  - **Positive**: <Benefits and capabilities gained>
  - **Negative / Trade-offs**: <Known limitations or maintenance requirements>
```

---

## 6. Document Update Checklist (Mandatory per Commit)

Before staging and finalizing any git commit, verify:
- [ ] Has `docs/CURRENT_STATE.md` been updated with new file inventory, branch status, and milestone?
- [ ] Has `docs/HANDOFF.md` been updated with latest in-flight context, platform gotchas, and next steps?
- [ ] Has `docs/agent-logs/YYYY-MM-DD.md` received a new session entry placed at the very top?
- [ ] For release commits, have `CHANGELOG.md` and `src/manifest.json` versions been synchronized?
- [ ] Are all headings, badges, tables, and notes strictly free of native emoji characters?

---

## 7. Standard Template: `CHANGELOG.md`

`CHANGELOG.md` must follow the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format and adhere to [Semantic Versioning](https://semver.org/spec/v2.0.0.html):

```markdown
# Changelog — RJ V-Flow Auto Extension

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
-

### Changed
-

### Fixed
-

## [X.Y.Z] - YYYY-MM-DD

### Added
- **Feature Name**: Detailed explanation of the new feature, user benefits, and affected components.
- **Service Name**: Description of new internal service or protocol.

### Changed
- **Component Area**: Specific changes made to existing behaviors, styling, or architecture.

### Fixed
- **Bug Title / Scoped Area**: Root cause explanation, how the bug was diagnosed, and exact fix implemented.
```
