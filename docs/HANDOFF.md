# Agent Handoff Guide — RJ V-Flow Auto

> **Purpose**: Essential operational context, in-flight state, platform gotchas, and immediate instructions for incoming AI agents resuming work.

---

## 1. Immediate Operational State
- **Current Milestone**: Post-Phase 4 Maintenance & Engine Hardening
- **Active Branch**: `task/fix-image-generation-trigger`
- **Latest Commits**:
  - `fix(engine): add simulateHumanClick telemetry and isolate ingredient tiles in watcher`
  - `fix(dom): eliminate simulateClick double-click regression and resolve suffix has-text selector`
  - `fix(engine): resolve image mode prompt submission, simulateClick coordinates, and model fast-path`
- **Working Tree**: Clean, `FlowDOM.js`, `FlowPromptService.js`, and `FlowWatcherService.js` hardened, reCAPTCHA Enterprise pointer telemetry satisfied, watcher ingredient false-positives eliminated, verified via `npm run build`, production bundle in `dist/LOAD THIS FOLDER/` updated and verified.

---

## 2. Active In-Flight Context

Phase 1 (Cleanup & Governance Foundation) was successfully completed and merged into `dev` (`7838930`).
Phase 2 (Core Automation Engine & Services) was successfully completed across all 5 sub-phases and merged into `dev` (`c14ca68`).
Phase 3 (Dual-Mode UI Implementation & End-to-End Hardening) was successfully completed across Commits 1 through 19 and Sessions 34 through 39, merged into `dev` (`7b0f1d9`), and pushed to `origin/dev`.
Phase 4 (Production Packaging Pipeline & Release) is now **[COMPLETE]**:
1. **Sub-phase 4.1 Production Bundler, AST Obfuscation & Packaging Pipeline Complete (`6d6374c`)**:
   - **Production Packaging Pipeline (`package.json`, `obfuscator.config.js`, `build.js`)**: Mirrored the production bundling architecture from `RJ_AIO_Metadata`. Added `esbuild`, `fs-extra`, and `javascript-obfuscator` dependencies with `"build": "node build.js"` script.
   - **Standalone ES Module Bundling**: Bundled entry points (`service_worker.js`, `popup.js`, `content_loader.js`, `content_main.js`) with `esbuild` directly into `dist/LOAD THIS FOLDER/`. `content_main.js` completely inlines and resolves all 18 internal dependencies (`src/core/`, `src/services/`, `src/overlay/`) into a single 218.7kb production bundle.
   - **AST Obfuscation**: Applied `javascript-obfuscator` with MV3-safe options (`disableConsoleOutput: false`, `debugProtection: false`, `renameGlobals: false`, `selfDefending: false`, `stringArrayEncoding: ['base64']`, `controlFlowFlattening: true`) across all 4 bundled JS files in `LOAD THIS FOLDER/`. Verified all obfuscated files pass `node --check` with 0 syntax errors.
   - **Distribution Asset Copying**: Copied `manifest.json`, `popup/popup.html`, `popup/popup.css`, `overlay/overlay.css`, `styles/`, and `assets/` into `dist/LOAD THIS FOLDER/`. Copied `README.md`, `LICENSE`, `CHANGELOG.md`, `SC.url`, and `SUPPORT ME.url` into `dist/` root.
   - **Release Archives**: Generated `releases/RJ_V-Flow_Auto-v3.0.0.zip` (0.79 MB) and mirror alias `releases/v3.0.0.zip` using PowerShell `Compress-Archive`.
   - **Local Tooling Hygiene**: Hardened `.gitignore` to exclude `package.json`, `package-lock.json`, `build.js`, `obfuscator.config.js`, `dist/`, `releases/`, and `node_modules/` from git tracking, matching the `RJ_AIO_Metadata` repository baseline.
2. **Sub-phase 4.2 Factual Documentation Overhaul Complete**:
   - Overhauled `README.md`, `docs/ARCHITECTURE.md`, `CHANGELOG.md`, `docs/DECISIONS.md` (ADR-001 through ADR-013), `docs/CURRENT_STATE.md`, `docs/HANDOFF.md`, and `docs/ROADMAP.md` to 100% reflect the factual codebase.
   - Purged all `(Next-Gen v3.0)` suffixes across all documentation files.
   - Synchronized version tags to `3.0.0` release.

---

## 3. Actionable Next Steps for Incoming Agent

1. **Release Milestone Finalization**:
   - Target branch: `task/packaging-and-release` (active).
   - Merge `task/packaging-and-release` into `dev` via `git merge --no-ff`.
   - Subsequently merge `dev` into `main` and push to remote origin upon explicit human user instruction.

---

## 4. Critical Gotchas & Architectural Traps

- **Zero English-Label Dependency**: Never query elements using localized English `aria-label` text (e.g. `[aria-label="Start generation"]`, `[aria-label="Tile grid settings"]`). Always use Material Symbols ligatures (`settings_2`, `more_vert`, `download`, `arrow_forward`, `swap_horiz`, `cancel`, `dashboard`, `left_panel_close`), custom tags (`flow-*`), or internal CSS classes (`.settings-trigger-button`, `.agent-mode-chip`, `.generate-icon-button`).
- **Zero-CDP Mandate**: Never introduce `chrome.debugger` or CDP synthetic events. All text injection must use `document.execCommand('insertText')` + native `InputEvent` dispatch on `flow-rich-text-editor.prompt-input div.ProseMirror`.
- **Transient Blank Phase Trap**: Google Flow has a 300ms–2000ms blank transition phase between progress bar removal and media element attachment. Never classify a tile as failed simply because `!isRendering && !isSuccess`; only classify as failed if `isCardGenerationFailed()` returns true or the 10-second grace timer expires.
- **Permanent Progress Bar Container Gotcha**: `<flow-video-tile>` always has an element with class `.hover-overlay-has-progress-bar` in the DOM as its hover container even when idle or finished! NEVER use `.hover-overlay-has-progress-bar` as an indicator of an active progress bar; check `.progress-bar`, `div.progress-bar-fill`, or `<flow-pending-tile>`.
- **In-Card Failure Detection**: Google Flow does not display toasts for content moderation blocks or quota limits. Asset tiles remain permanently blurred with warning badges. Card success must be validated via `isCardGenerationSuccess(card)`.
- **Image Tile Tag Differences**: Video tiles use `img.thumbnail` while image generation tiles (`flow-image-tile`) use `img.image`. `CARD_MEDIA` selector must include both.
- **Virtual Scroll Multi-Row Batch Spanning**: When Google Flow runs in Grid Size S, multi-output generations (x3 or x4) span across multiple `div.tile-row` wrappers. Never assume index 0 contains the entire batch; always use `FlowWatcherService.getBatchTileElements()` to collect all cards up to `expectedCount`.
- **Uploaded Ingredient Tile Filtering**: User-uploaded images/videos appear in the gallery as tiles with filename extensions and no `redo` hotbar action. Always filter via `isIngredientTile()` so raw reference assets are never counted as generated outputs.
- **IndexedDB Binary Storage**: High-resolution image references must never be written to `chrome.storage.local` as Base64. Always route binaries through `FlowImageDB.saveImage()` and strip Base64 via `FlowStorage.sanitizeQueueForStorage()`.
- **Clean Mount Protocol**: When modifying HUD layout templates, keep native `<select>` elements styled with `display: none;` inline to prevent FOUC / white border flash before `CustomSelect.initAll()` attaches.
- **reCAPTCHA Enterprise 0-Credit Telemetry Trap**: Nano Banana family models (Image mode) consume 0 credits and trigger strict client-side reCAPTCHA Enterprise risk score evaluation (`Lm("IMAGE_GENERATION")`), unlike paid Veo 3.1 video models. Naive `(0, 0)` clicks with 0ms hold duration fail bot scoring and are silently ignored by Google Flow. Always use `simulateHumanClick(btn, { holdMs: 90, microMoves: true })` which emits approach micro-movements, randomized non-zero target coordinates, and natural 60-120ms physical hold duration.
- **Ingredient Gallery Boundary Trap**: Local uploads in Edit-Image mode mount temporary pending tiles in the gallery. `FlowWatcherService.getTopTileCard()` and `waitForNewBatchSpawn()` must strictly filter out any tile matching `isIngredientTile()`, otherwise the watcher latches onto the ingredient upload tile and loops until timeout.
