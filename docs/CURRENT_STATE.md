# Current State — RJ V-Flow Auto

> Snapshot after CDP session lifecycle refactor (2026-06-02).

## Version

**2.1.5** (branch: `task/anti-bot-evasion`, pending merge to dev)

## What Works ✅

| Feature | Status |
|---|---|
| Text-to-image generation | ✅ Working |
| Text-to-video generation | ✅ Working |
| Multi-prompt batch (text modes) | ✅ Working |
| Image-to-video mode | ✅ Working (not re-tested post CDP) |
| Edit-image mode | ✅ Working (not re-tested post CDP) |
| Prompt insertion via CDP | ✅ Working — `isTrusted: true` |
| Generate button click via CDP | ✅ Working — `isTrusted: true` |
| Queued tile false-positive prevention | ✅ Fixed with double-confirm |
| Auto-download after generation | ✅ Working |
| Settings configuration (mode/ratio/outputs/model) | ✅ Working |
| Clear editor after each prompt | ✅ Working via CDP |
| Stop automation mid-run | ✅ Working |

## Critical Technical Detail

The extension relies on **Chrome DevTools Protocol (CDP)** via `chrome.debugger` to interact with the Google Labs Flow page. This is required because:

- The Flow editor is built on **Slate.js** (React) which validates `event.isTrusted`
- All events from standard `dispatchEvent()` have `isTrusted: false` → silently ignored by Slate
- CDP events are generated at browser engine level → `isTrusted: true` → accepted by Slate

**Without CDP, the extension cannot insert text or click Generate.**

## Known Behaviors (Not Bugs)

| Behavior | Explanation |
|---|---|
| Chrome shows `"RJ V-Flow Auto started debugging this browser"` banner | Expected — required by Chrome when `chrome.debugger` is attached. Suppressable with `--silent-debugger-extension-api` Chrome flag. |
| Queued videos briefly flash "complete" then revert | Flow's queue system. Handled by double-confirm logic. |
| `400 Bad Request` from `batchGenerateImages` | Server-side content policy rejection. Not an extension bug. Recorded as `failedCount`. |

## Supported Models (as of v2.1.3)

**Image modes** (`text-image`, `edit-image`):
- 🍌 Nano Banana Pro
- 🍌 Nano Banana 2
- Imagen 4

**Video modes** (`text-video`, `img-to-vid`):
- Veo 3.1 - Lite
- Veo 3.1 - Fast
- Veo 3.1 - Quality (text-video only)

## Supported Download Qualities

| Mode | Options |
|---|---|
| Image | Auto (max), 1K Original, 2K Upscaled, 4K Upscaled |
| Video | Auto (max), 270p GIF, 720p Original, 1080p Upscaled, 4K Upscaled |

## Branch Structure

- `main` — current working state (this snapshot)

## Completed Work (This Session)

- **Phase 0**: Docs governance ✅ (2026-05-24)
- **CDP integration**: `chrome.debugger` handler in background.js ✅
- **setPromptText rewrite**: CDP `insertText` as primary strategy ✅
- **triggerGenerate rewrite**: CDP `click` as primary strategy ✅
- **Queued tile fix**: Double-confirmation in `waitForGenerationComplete` ✅
- **Log cleanup**: `Tile layer changed` logs only on state change ✅
- **Git repo init**: First push to `https://github.com/riiicil/rj-vflow-auto.git` ✅
- **rrweb analysis** (2026-06-02): Root cause of 403/unusual detection identified — CDP per-action attach interrupts reCAPTCHA token refresh ✅
- **CDP attach-once refactor** (2026-06-02): CDP session attached once per run, detached in finally — allows reCAPTCHA to refresh between generate calls ✅
- **CDP-based Slate Editor Sync** (2026-06-03): Resolved prompt duplication/leakage by dynamically constructing document selection and clearing/inserting directly in Slate's model via CDP for all extension modes. ✅
