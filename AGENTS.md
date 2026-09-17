# AGENTS.md — RJ V-Flow Auto (Next-Gen v3.0)

> **Mandatory first-read for every AI agent working on this project.**  
> Read this file completely before taking any action or modifying code.

---

## 1. Project Identity

**RJ V-Flow Auto** is an automated Chromium browser extension (Manifest V3) specifically engineered for **Google Flow (`flow.google.com`)**. It automates batch AI video and image generation across Google's modern vision models (**Veo 3.1 family**, **Omni 1.1 Flash**, and **Nano Banana 2 family**), featuring queue-based prompt injection, frame interpolation, image-to-video reference ingestion, in-card failure detection, and automated downloads.

- **Runtime Target**: Manifest V3 (Chrome, Brave, Edge, Chromium)
- **Source Root**: `src/` (Loaded via `chrome://extensions` -> *Load unpacked*)
- **UI Architecture**: Dual-Mode UI (Minimalist Toolbar Popup + In-Page Studio Overlay HUD in Shadow DOM)
- **Design System**: Raycast Dark Precision (`#07080a` canvas, `#0d0d0d` surface, `#242728` hairline, `#57c1ff` accent cyan, `#59d499` success, `#ff6161` alert)
- **Icon Policy**: STRICT ZERO NATIVE EMOJI. Use Phosphor or Lucide SVG icons only.
- **Target Platform**: Google Flow (`https://flow.google.com/*`)

---

## 2. Required Reading Order

Before doing any work, read these files strictly in this order:

1. `AGENTS.md` (this file)
2. `docs/DOCS_STYLE.md` (Enforces uniform document structure & templates)
3. `docs/ARCHITECTURE.md` (MV3 lifecycle, component map, data flow diagrams)
4. `docs/GIT_POLICY.md` (Branching model, conventional commits, PR rules)
5. `docs/CURRENT_STATE.md` (Active tasks, progress status, build state)
6. `docs/HANDOFF.md` (Session handoff notes, platform quirks & gotchas)
7. `docs/ROADMAP.md` (Phase milestones and execution roadmap)
8. `docs/references/GOOGLE_FLOW_DOM.md` (Precision DOM selector specification)

---

## 3. Core Technical Standards

### A. Zero-CDP Protocol (Hard Safety Rule)
- **NEVER** use `chrome.debugger` or Chrome DevTools Protocol. Google Flow runs on Google Angular + Angular Material/CDK + ProseMirror. All automation executes purely via native DOM events:
  - ProseMirror text injection via `execCommand('insertText')` + native `input` event.
  - Native button `.click()` and `KeyboardEvent('Enter')`.

### B. Multi-Language Resilient DOM Selectors
- **Never query elements using English text strings** (e.g. `[aria-label="Start generation"]`, `:has-text("Download")`).
- Target elements using **Material Symbols Ligatures** (`settings_2`, `more_vert`, `download`, `arrow_forward`, `swap_horiz`, `cancel`), **custom Angular tags** (`<flow-*>`), or **internal CSS classes** (`.settings-trigger-button`, `.agent-mode-chip`, `.generate-icon-button`). Ligatures are internal font glyph names and are never translated.

### C. In-Card Failure Detection
- Google Flow does NOT display moderation blocks or quota limits as toasts. Cards remain blurred with warning badges and no valid `src`/`blob:`. All tiles must be validated via `isCardGenerationSuccess(card)`.

### D. Icon Policy & Design Compliance
- **Native emoji are STRICTLY FORBIDDEN** in UI elements, buttons, titles, documentation, and commit messages. Use Lucide / Phosphor SVG components.
- Follow `DESIGN.md` for all styling tokens.

---

## 4. Branch & Git Rules

- **Branch Hierarchy**: `main` (stable releases) <- `dev` (integration) <- `task/<kebab-case-description>` (feature branches without phase prefixes).
- **Never commit directly to `main` or `dev`**.
- **Conventional Commits**: `<type>(<scope>): <description>` (e.g. `feat(services): implement FlowPromptService`).
- **Merge Strategy**: Always use `git merge --no-ff`.
- **Do not push to remote** or merge into `dev`/`main` without explicit human instruction.

---

## 5. Documentation Workflow (Mandatory Per Commit)

For every task/commit:
1. Complete implementation in `src/`.
2. Update `docs/CURRENT_STATE.md`, `docs/HANDOFF.md`, and add an entry to `docs/agent-logs/YYYY-MM-DD.md` (*newest on top*).
3. Include doc updates in the exact same commit as the code changes.
