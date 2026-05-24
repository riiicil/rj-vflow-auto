# Architecture — RJ V-Flow Auto

## Extension Type

Chrome Extension, Manifest V3. No build step required for development — load unpacked from repo root.  
A separate obfuscated build exists (`build.js` → `dist/`) for distribution only.

## File Structure

```
manifest.json               Entry point, permissions, host declarations, content script config
scripts/
  background.js             Service worker — message routing, downloads, CDP handler
  content.js                Content script injected into Flow page (~1800 lines)
  floating-controls.css     Floating UI styles (injected with content script)
panel/
  sidepanel.html            Side panel HTML
  sidepanel.js              Side panel logic (~895 lines)
  sidepanel.css             Side panel styles
icons/                      Extension icons
bootstrap/                  Vendored Bootstrap CSS/JS (used in side panel)
docs/                       Documentation
```

## Communication Flow

```
[sidepanel.js]  (chrome.sidePanel)
  ↕ chrome.runtime.sendMessage
[background.js]  (service worker)
  ↕ chrome.tabs.sendMessage  ↔  chrome.debugger (CDP)
[content.js]  (injected into Flow tab)
  ↕ DOM / Chrome DevTools Protocol
[Google Labs Flow page]
```

## Key Permissions

| Permission | Purpose |
|---|---|
| `storage` | Persist panel settings and image queue |
| `tabs` | Find and target the Flow tab |
| `activeTab` | Access the active Flow tab |
| `scripting` | Reserved for future use |
| `sidePanel` | Open the side panel UI |
| `downloads` | Trigger file downloads |
| `clipboardWrite` | Reserved |
| `debugger` | **CDP access** — produce `isTrusted: true` events in the Flow page |

## Automation Pipeline (content.js)

```
runAutomation(payload)
  └── configureSettings()         Set mode / ratio / outputs / model via UI clicks
  └── runTextPromptLoop()         text-image and text-video modes
        └── snapshotTileIds()     Record existing tiles before generation
        └── setPromptText(text)   Insert prompt into Slate editor via CDP
        └── triggerGenerate()     Click Generate button via CDP
        └── waitForGenerationComplete()  Poll tile DOM for opacity/blur changes
        └── downloadNewResults()  Open context menu → Download via DOM interaction
        └── setPromptText("")     Clear editor via CDP
  └── runImgToVidLoop()           img-to-vid and edit-image modes
        └── (similar flow, uses asset upload instead of text prompt)
```

## CDP Integration (the critical piece)

Google Labs Flow uses **Slate.js** (React-based rich text editor). Slate validates `event.isTrusted` on input and mouse events. Standard JavaScript `dispatchEvent()` always produces `isTrusted: false` and is silently ignored by Slate.

**Solution:** `chrome.debugger` API → Chrome DevTools Protocol → events generated at browser engine level → `isTrusted: true`.

### CDP Actions (background.js `cdp:action` handler)

| Action | CDP Commands | Effect |
|---|---|---|
| `insertText` | `mousePressed/Released` (focus) → `keyDown/Up` Ctrl+A → `Input.insertText` | Replaces Slate editor content, updates React state |
| `click` | `mouseMoved` → `mousePressed` → `mouseReleased` | Trusted click on Generate button |
| `pressEnter` | `mousePressed/Released` (focus) → `keyDown/Up` Enter | Keyboard submit via Slate editor |

### Flow per CDP action call

```
content.js: calculate element rect → send {type:'cdp:action', action, x, y, text}
background.js: chrome.debugger.attach() → cdpSend() commands → chrome.debugger.detach()
content.js: receive {ok: true} response → continue automation
```

## Tile Status Detection

New tiles are identified by comparing `data-tile-id` attributes before and after generation.

Tile completion is detected by reading the CSS layer `style` attribute:
- `--blur-amount: 80` + `opacity: 0` → **generating**
- `--blur-amount: 0` + `opacity: 1` + `img[src]` or `video[src]` present → **complete**
- `warning` icon present → **failed**

**Double-confirmation** is applied: if "complete" is detected, one additional poll confirms it's not a transient "Queued" state where tiles briefly flash complete before reverting.

## Generate Button Detection (scoring)

`findGenerateButton()` scores all `<button>` elements and returns the highest-scoring one:

| Criterion | Score |
|---|---|
| Icon contains `arrow_forward` | +50 |
| Located near Slate editor | +20 |
| Not inside a dropdown/menu | prerequisite |
| Not `aria-haspopup="menu"` | prerequisite |
| Button size in expected range | +10 |
| Text content match | +30 |

Typical score for the correct button: **110**.

## State Management

- All automation state lives in `background.js` (`automationState` object)
- Panel settings persisted via `chrome.storage.local` (STORAGE_KEY, IMAGE_STORAGE_KEY)
- State changes broadcast to side panel via `flow:state-changed` message
- Side panel polls nothing — it is purely event-driven via `chrome.runtime.onMessage`
