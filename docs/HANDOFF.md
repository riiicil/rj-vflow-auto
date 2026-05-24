# Handoff Notes — RJ V-Flow Auto

> Updated: 2026-05-24. For next agent session continuity.

## What Was Just Done

1. **CDP integration** — Added `chrome.debugger` handler in `background.js` with three actions: `insertText`, `click`, `pressEnter`. This was the core fix for the generate button not working.
2. **`setPromptText` rewrite** — CDP `insertText` (click editor → Ctrl+A → `Input.insertText`) is now primary. `execCommand` and paste simulation are fallbacks.
3. **`triggerGenerate` rewrite** — CDP `click` is now primary. CDP `pressEnter` is fallback. All DOM-based `dispatchEvent()` simulation removed.
4. **Queued tile false-positive fix** — `waitForGenerationComplete` now double-confirms completion before declaring done.
5. **Log cleanup** — `getTileStatus` now uses `_stateCache` to suppress repeated identical tile layer logs.
6. **Documentation init** — `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/CURRENT_STATE.md`, `docs/HANDOFF.md`, `docs/ROADMAP.md`, `docs/session-analysis.md`.
7. **Git repo init** — First push to `https://github.com/riiicil/rj-vflow-auto.git`.

## Key Context for Next Agent

### Why CDP is required
- Flow uses Slate.js which checks `event.isTrusted`
- `dispatchEvent()` from content scripts always produces `isTrusted: false`
- CDP events from `chrome.debugger` are `isTrusted: true` at the browser level
- **Do not attempt to revert to DOM-based event simulation — it does not work**

### File to understand first
- `scripts/content.js` — main automation logic (~1800 lines)
  - `setPromptText()` — CDP text insertion
  - `triggerGenerate()` — CDP button click
  - `waitForGenerationComplete()` — tile polling with double-confirm
  - `getTileStatus()` — reads `--blur-amount` and `opacity` from style
  - `findGenerateButton()` — scoring-based button detection (target score: 110)
  - `configureSettings()` — settings modal interaction
  - `downloadNewResults()` — context menu download flow

### The CDP debugger banner
Chrome shows `"RJ V-Flow Auto started debugging this browser"` during each generate action. This is a Chrome security feature that **cannot be suppressed from within extension code**. To hide it, the user must launch Chrome with `--silent-debugger-extension-api`.

## Open Issues / Potential Work

| Issue | Priority | Notes |
|---|---|---|
| `img-to-vid` and `edit-image` modes not re-tested after CDP changes | Medium | Asset upload flow is separate from text prompt flow — should work but verify |
| Multi-output (`outputs > 1`) not extensively tested post-CDP | Medium | Tile detection logic handles multiple new tiles, but verify |
| Settings trigger sometimes matches twice (log shows 2x `Settings trigger matched`) | Low | Cosmetic — settings are still applied correctly |
| Model names may drift if Flow updates their UI labels | Medium | Model matching is text-based — if Flow renames models, `configureSettings` will fail |
| Download quality selector for video (`findDownloadMenuItem`) | Low | Was reported as potentially picking wrong menu item in early testing; appeared resolved but monitor |
| Chrome debugger banner on every generate | Low | UX annoyance. Only solvable via Chrome flag or enterprise policy outside extension. |

## Testing Checklist for Next Session

Before any changes, verify:
- [ ] `text-image` mode: 2+ prompts, auto-download works
- [ ] `text-video` mode: 1+ prompt, generation detected, download works
- [ ] Settings switch between modes (e.g. image → video → image) works
- [ ] Stop button mid-run works cleanly
- [ ] CDP banner appears and disappears correctly during generate
