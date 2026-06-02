# Handoff Notes — RJ V-Flow Auto

> Updated: 2026-06-02. For next agent session continuity.

## What Was Just Done

1. **CDP integration** — Added `chrome.debugger` handler in `background.js` with three actions: `insertText`, `click`, `pressEnter`. This was the core fix for the generate button not working.
2. **`setPromptText` rewrite** — CDP `insertText` (click editor → Ctrl+A → `Input.insertText`) is now primary. `execCommand` and paste simulation are fallbacks.
3. **`triggerGenerate` rewrite** — CDP `click` is now primary. CDP `pressEnter` is fallback. All DOM-based `dispatchEvent()` simulation removed.
4. **Queued tile false-positive fix** — `waitForGenerationComplete` now double-confirms completion before declaring done.
5. **Log cleanup** — `getTileStatus` now uses `_stateCache` to suppress repeated identical tile layer logs.
6. **Documentation init** — `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/CURRENT_STATE.md`, `docs/HANDOFF.md`, `docs/ROADMAP.md`, `docs/session-analysis.md`.
7. **Git repo init** — First push to `https://github.com/riiicil/rj-vflow-auto.git`.

### Session 2026-06-02 (branch: task/anti-bot-evasion)

8. **rrweb session analysis** — Compared manual vs extension sessions using rrweb recorder + custom analyzer scripts (in `scripts/dev-tools/`, gitignored). Root cause of 403 identified.
9. **CDP session lifecycle refactor** — Changed CDP attach/detach from per-action to once-per-run:
   - `background.js`: Added `cdp:attach` and `cdp:detach` message handlers. Added `cdpSessions` Set to track active sessions. Added `chrome.debugger.onDetach` safety listener. Removed per-action attach/detach from `cdp:action` handler.
   - `content.js`: `runAutomation()` now sends `cdp:attach` at start (text-image mode only) and `cdp:detach` in finally block.

## Key Context for Next Agent

### Why CDP is required
- Flow uses Slate.js which checks `event.isTrusted`
- `dispatchEvent()` from content scripts always produces `isTrusted: false`
- CDP events from `chrome.debugger` are `isTrusted: true` at the browser level
- **Do not attempt to revert to DOM-based event simulation — it does not work**

### Why CDP attach-once (the 2026-06-02 change)
- Flow uses **reCAPTCHA Enterprise** (invisible) to validate every `batchGenerateImages` request
- reCAPTCHA fires a background network request (`/recaptcha/enterprise/clr`) to refresh its token between generate calls
- When CDP was attached/detached per-action, Chrome's debugger mode was interrupting these reCAPTCHA requests (status 0 = blocked) — causing token expiry → 403 on subsequent generates
- Evidence: rrweb recordings showed 8× 403 in extension session vs 0 in manual session; all 403s occurred after reCAPTCHA tokens expired (~3 successful batches in, ~80s into session)
- Fix: attach CDP once at automation start, detach at end — reCAPTCHA requests can complete normally between CDP actions

### File to understand first
- `scripts/content.js` — main automation logic (~1960 lines)
  - `runAutomation()` — CDP attach/detach lifecycle lives here
  - `setPromptText()` — CDP text insertion
  - `triggerGenerate()` — CDP button click
  - `waitForGenerationComplete()` — tile polling with double-confirm
  - `getTileStatus()` — reads `--blur-amount` and `opacity` from style
  - `findGenerateButton()` — scoring-based button detection (target score: 110)
  - `configureSettings()` — settings modal interaction
  - `downloadNewResults()` — context menu download flow

### The CDP debugger banner
Chrome shows `"RJ V-Flow Auto started debugging this browser"` during each generate action. With the attach-once change, the banner now **stays visible for the entire automation run** (not just per-action). This is expected and cannot be suppressed from extension code. To hide it, launch Chrome with `--silent-debugger-extension-api`.

## Open Issues / Potential Work

| Issue | Priority | Notes |
|---|---|---|\
| 403 fix not yet re-tested | High | Implement done, needs live test to confirm reCAPTCHA can refresh properly |
| `img-to-vid` and `edit-image` modes not re-tested after CDP changes | Medium | Asset upload flow is separate from text prompt flow — should work but verify |
| Multi-output (`outputs > 1`) not extensively tested post-CDP | Medium | Tile detection logic handles multiple new tiles, but verify |
| Settings trigger sometimes matches twice (log shows 2x `Settings trigger matched`) | Low | Cosmetic — settings are still applied correctly |
| Model names may drift if Flow updates their UI labels | Medium | Model matching is text-based — if Flow renames models, `configureSettings` will fail |
| Download quality selector for video (`findDownloadMenuItem`) | Low | Was reported as potentially picking wrong menu item in early testing; appeared resolved but monitor |
| Chrome debugger banner now stays visible entire run | Low | Expected side-effect of attach-once. Only solvable via Chrome flag outside extension. |

## Testing Checklist for Next Session

Before any changes, verify:
- [ ] `text-image` mode: 5+ prompts, no 403 after batch 3 (this is the regression test for the fix)
- [ ] `text-image` mode: auto-download works for all results
- [ ] `text-video` mode: 1+ prompt, generation detected, download works
- [ ] Settings switch between modes (e.g. image → video → image) works
- [ ] Stop button mid-run detaches CDP cleanly (check service worker console)
- [ ] Tab close during run: verify `cdpSessions` is cleaned up via `onDetach` listener
