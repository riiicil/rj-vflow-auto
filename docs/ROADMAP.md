# Roadmap — RJ V-Flow Auto

> Priority order reflects user value vs implementation complexity.

## Phase 0 — Docs & Repository Governance ✅

- [x] `AGENTS.md` — agent orientation file
- [x] `docs/ARCHITECTURE.md` — system design
- [x] `docs/CURRENT_STATE.md` — working state snapshot
- [x] `docs/HANDOFF.md` — session continuity
- [x] `docs/ROADMAP.md` — this file
- [x] `docs/session-analysis.md` — full debug session log
- [x] Git repository initialized and pushed

## Phase 1 — Stability & Verification ✅

Verify all modes work correctly after the CDP migration:

- [x] `text-image` mode: multi-prompt, all models, all ratios
- [x] `text-video` mode: multi-prompt, all models, landscape/portrait
- [x] `img-to-vid` mode: single and multi-image asset queue
- [x] `edit-image` mode: asset + prompt
- [x] Multi-output (`outputs > 1`) for image mode
- [x] Download quality selectors for all modes
- [x] Stop button mid-run for all modes

## Phase 2 — UX Improvements (Potential)

- [ ] **Progress indicator in side panel** — show which prompt is currently running (e.g. "Prompt 2/5 — Generating...")
- [ ] **Retry on generation failure** — if a prompt fails (API error), retry once before skipping
- [ ] **Prompt validation** — warn user if a prompt line exceeds known Flow character limits
- [ ] **Duplicate prompt detection** — warn if same prompt appears multiple times in the list
- [ ] **Configurable delay** — allow user to set custom delay between prompts

## Phase 3 — Feature Additions (Potential)

- [ ] **Batch mode with schedule** — run a batch at a specific time or with a delay between sets
- [ ] **Project selector** — allow user to choose which Flow project to run automation on
- [ ] **Export download manifest** — save a CSV/JSON of downloaded files + their prompts
- [ ] **Auto-switch account** — detect when account quota is hit and notify user

## Phase 4 — Build & Distribution

- [ ] **`.gitignore` verification** — ensure `dist/`, `node_modules/`, `*.zip` are excluded
- [ ] **Build pipeline review** — verify `build.js` obfuscation works correctly with CDP code
- [ ] **Release packaging** — versioned zip for distribution

## Non-Goals

- ❌ Automated account login / OAuth — too risky and against ToS
- ❌ Concurrent multi-tab generation — Flow is single-project per tab
- ❌ Modify generated images/videos — out of scope for this tool
