# AGENTS.md — RJ V-Flow Auto

> **Read this file first before any work on this repository.**

## Project Identity

- **Application**: RJ V-Flow Auto — Chrome Extension for automated image and video generation on Google Labs Flow
- **Type**: Browser Extension (Chrome, Manifest V3)
- **Language**: JavaScript (plain, no bundler/transpiler for development; optional obfuscated build for distribution)
- **Version**: 2.1.3
- **License**: MIT
- **Target Site**: `https://labs.google/fx/tools/flow/*` and `https://veo.genaipro.vn/fx/*`

## Repository Structure

```
manifest.json           Extension entry point, permissions, host declarations
scripts/
  background.js         Service worker — message routing, download manager, CDP handler
  content.js            Content script — all automation logic injected into Flow page
  floating-controls.css Content script floating UI styles
panel/
  sidepanel.html        Side panel UI
  sidepanel.js          Side panel logic — settings, prompt queue, start/stop
  sidepanel.css         Side panel styles
icons/                  Extension icons (16, 48, 128px)
bootstrap/              Vendored Bootstrap CSS/JS
docs/                   Architecture, current state, handoff, roadmap
build.js                Obfuscation build script (distribution only)
```

## Required Reading Order

Before making any changes, read these files in order:

1. `AGENTS.md` (this file)
2. `docs/CURRENT_STATE.md` — where the project stands right now
3. `docs/ARCHITECTURE.md` — how the extension works end-to-end
4. `docs/HANDOFF.md` — session continuity and known issues
5. `docs/ROADMAP.md` — planned features and improvements

## Branch Rules

- **Never** commit directly to `main`.
- Feature work goes on `dev` or a task branch: `git switch -c task/<name> dev`
- Branch naming: `task/fix-video-download`, `task/img-to-vid-mode`, `task/refactor-settings`, etc.

## Commit Rules

- Use conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `style:`
- Subject line: `<type>(<scope>): <description>` — max 72 characters
- Body explains WHY, not WHAT. Or simple bullet points.

## Hard Safety Rules

1. **Never** commit `dist/`, `*.zip`, `v*/` version snapshot folders.
2. **Never** commit `node_modules/`.
3. **Never** commit `build.js`, `obfuscator.config.js`, `package.json`, `package-lock.json` (build tooling only).
4. **Do not push** unless explicitly instructed by the human user.
5. **Do not merge** to `main` unless explicitly instructed by the human user.

## Testing the Extension

After any change to source files (no build needed for testing):

1. Open Chrome → `chrome://extensions`
2. Enable Developer Mode
3. Click "Load unpacked" → select the **repo root** (not `dist/`)
4. Navigate to `https://labs.google/fx/tools/flow/project/<any-project-id>`
5. Open the side panel and verify it loads without errors
6. Check DevTools → Console for `[RJ V-Flow]` log lines
7. Check background service worker console at `chrome://extensions` → service worker "inspect"

> **Important:** The extension uses `chrome.debugger` (CDP) to simulate trusted browser events. Chrome will show a `"RJ V-Flow Auto started debugging this browser"` banner during generation — this is expected and normal.

## CDP / Debugger Architecture Note

The extension uses `chrome.debugger` API to produce `isTrusted: true` events for interacting with the Slate.js editor on the Flow page. This is the **only reliable method** — standard `dispatchEvent()` calls produce `isTrusted: false` which Slate ignores. See `docs/ARCHITECTURE.md` for full explanation.

## Scope Discipline

Implement **only** what the current task specifies. Do not add extra features or fixes outside scope. If you notice something worth fixing, note it in `docs/HANDOFF.md`.

## Code Comment Policy

- Comments explain WHY, not WHAT. Or simple bullet points.
- No debug artifacts or commented-out code in production.
- No redundant comments that restate what the code does.

---

For detailed documentation, see the `docs/` folder.
