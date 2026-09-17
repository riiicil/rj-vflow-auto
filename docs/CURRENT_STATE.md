# Current Project State — RJ V-Flow Auto Extension

*Last Updated: 2026-09-17*<br>
*Active Branch: `task/cleanup-and-governance`*<br>
*Current Milestone: Phase 1 (Cleanup & Governance Foundation) — Sub-phase 1.2 Complete*

---

## 1. Current Phase Progress

- **Phase 1 — Cleanup & Governance Foundation**: [IN_PROGRESS] (Sub-phase 1.1 complete: legacy branch isolated and pushed, gitignore hardened; Sub-phase 1.2 complete: root zip archives, legacy version folders, and obsolete UI scripts purged)
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
| `task/cleanup-and-governance` | Active | Phase 1: Cleanup & Governance Foundation |

---

## 3. Platform & Target Model Matrix

| Model Family | Media Type | Generation Feature | Sub-Mode | Duration Support | Implementation Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Omni 1.1 Flash** | Video | Text-to-Video, Image-to-Video, Video-to-Video, Frames | Ingredients / Frames | 4s, 6s, 8s, 10s | [PLANNED] |
| **Veo 3.1 - Fast** | Video | Text-to-Video, Image-to-Video, Frames | Ingredients / Frames | N/A (Preset) | [PLANNED] |
| **Veo 3.1 - Lite** | Video | Text-to-Video, Image-to-Video, Frames | Ingredients / Frames | N/A (Preset) | [PLANNED] |
| **Veo 3.1 - Quality** | Video | Text-to-Video, Frames (No I2V) | Frames Only | N/A (Preset) | [PLANNED] |
| **Nano Banana Pro** | Image | Text-to-Image, Edit Image | Ingredients | N/A | [PLANNED] |
| **Nano Banana 2** | Image | Text-to-Image, Edit Image | Ingredients | N/A | [PLANNED] |
| **Nano Banana 2 Lite** | Image | Text-to-Image, Edit Image | Ingredients | N/A | [PLANNED] |

---

## 4. What Exists

- **Git & Safety Infrastructure:**
  - `legacy` branch isolated and pushed to remote origin.
  - `.gitignore` hardened for build outputs, dependencies, archives, and scratch tools.
- **Repository Hygiene:**
  - All legacy zip archives (`v2.1.3.zip` – `v2.1.6.zip`) purged.
  - All legacy snapshot folders (`v2.1.2/` – `v2.1.6/`), `bootstrap/`, `panel/`, and `scripts/` purged.
  - Outdated root build tooling (`build.js`, `obfuscator.config.js`, `package.json`, `package-lock.json`) purged.
- **Governance & Documentation Suite (`docs/`):**
  - `docs/CURRENT_STATE.md` — Living project dashboard and inventory.
  - `docs/HANDOFF.md` — Operational continuity briefing and trap register.
  - `docs/agent-logs/2026-09-17.md` — Granular daily audit trail (Session Entries 1 & 2).
- **Engineering Baseline:**
  - `bahan/vflow-note.md` — Master technical specification with language-resilient selector map.
  - `C:\Users\admin\Desktop\handoff - vflow.md` — Project context and handoff briefing.

---

## 5. What Does NOT Exist Yet

- **Sub-phase 1.3:** Full governance docs suite (`DOCS_STYLE.md`, `ARCHITECTURE.md`, `GIT_POLICY.md`, `ROADMAP.md`, `DECISIONS.md`, and ported `docs/references/GOOGLE_FLOW_DOM.md`) not yet generated.
- **Sub-phase 1.4:** Root `AGENTS.md`, `DESIGN.md`, clean `src/manifest.json`, and `src/` modular scaffold not yet authored.
- **Phase 2–5:** Automation engine services, Dual-Mode UI HUD, and production packaging pipeline.

---

## 6. Testing & Build Verification Status

- Working tree verified free of legacy clutter.
- All deletions staged cleanly in git (`D panel/...`, `D scripts/...`).
- Zero Native Emoji Policy strictly verified across all documentation.

---

## 7. Immediate Next Step

- Proceed to **Sub-phase 1.3**: Establish complete documentation suite in `docs/` mirroring RJ AIO Metadata (`DOCS_STYLE.md`, `ARCHITECTURE.md`, `GIT_POLICY.md`, `ROADMAP.md`, `DECISIONS.md`) and port selector specification to `docs/references/GOOGLE_FLOW_DOM.md`.
