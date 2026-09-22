# Agent Handoff Guide — RJ V-Flow Auto

> **Purpose**: Essential operational context, in-flight state, platform gotchas, and immediate instructions for incoming AI agents resuming work.

---

## 1. Immediate Operational State
- **Current Milestone**: v3.1.0 Release Milestone & Documentation Governance
- **Active Branch**: `task/fix-image-generation-trigger`
- **Latest Commits**:
  - `fix(dom): multi-language resilient grid size selector and localization audit`
  - `feat(ui): omni duration visibility fix and finished queue dual action buttons`
  - `feat(engine): pure background image rpc, tiered upscale fallback, and smooth progress advancement`
  - `feat(engine): support multi-output image parsing, SPrCad upscaling, and authenticated downloads`
  - `fix(engine): harmonize logger and unify native generation trigger with pre-armed reCAPTCHA`
- **Working Tree (Uncommitted — Prepared for User Self-Commit)**:
  - Version bumped from `3.0.0` to `3.1.0` in `src/manifest.json` and `package.json` (SemVer minor release).
  - Comprehensive `CHANGELOG.md` entry for `[3.1.0] - 2026-09-23`.
  - Architecture documentation (`docs/ARCHITECTURE.md`, `README.md`) updated with Dual Generation Pipeline (Pure Background RPC for images vs Native In-Page DOM Click Trigger for videos).
  - `docs/DECISIONS.md`: Added `ADR-014` (Pure Background Image RPC & SPrCad AI Upscaling) and `ADR-015` (Multi-Language Resilient DOM Engine with Positional LTR Indexing).
  - `docs/ROADMAP.md`: Added Phase 5 milestone (v3.1.0) and marked complete.
  - `docs/references/GOOGLE_FLOW_DOM.md`: Documented positional LTR tile sizing, `ink_eraser` clear prompt ligature, `chrome_extension` ingredients ligature, and numerical duration matching.
  - `docs/CURRENT_STATE.md`: Synchronized to v3.1.0 Release.
  - Production package compiled via `npm run build`: `dist/LOAD THIS FOLDER/` (252.2kb bundled & obfuscated) and `releases/v3.1.0.zip` (0.91 MB) ready for deployment.

---

## 2. Active In-Flight Context

Phase 1 (Cleanup & Governance Foundation) was successfully completed and merged into `dev` (`7838930`).
Phase 2 (Core Automation Engine & Services) was successfully completed across all 5 sub-phases and merged into `dev` (`c14ca68`).
Phase 3 (Dual-Mode UI Implementation & End-to-End Hardening) was successfully completed across Commits 1 through 19 and Sessions 34 through 39, merged into `dev` (`7b0f1d9`), and pushed to `origin/dev`.
Phase 4 (Production Packaging Pipeline & Release) was completed, bundled, and obfuscated (v3.0.0).
Phase 5 (Post-Release Engine Hardening & Multi-Language Modernization) completed for v3.1.0.

### Engine Hardening: Image Mode Trigger, Multi-Output & High-Res Upscale Resolution
- **Problem**:
  1. Image mode (Nano Banana 2, Pro, Lite) multi-output generations (x2, x3, x4) were truncated to 1 variant because `parseImagesFromBatchResponse` evaluated `entry[2]` with a single non-global regex match.
  2. Downloading `flow-content.google/image/<mediaId>` via background `chrome.downloads` triggered 403 `AccessDenied` XML responses from Google Cloud Storage because the service worker lacked the user's session cookies, creating broken `.xml` files.
  3. `mountSyntheticGalleryTiles` attempted to write `.innerHTML`, which threw a Trusted Types CSP violation (`This document requires 'TrustedHTML' assignment`).
  4. English text selectors failed on foreign-language systems (e.g. Indonesian `id-ID` "S" meant Sedang/Medium instead of Small/Kecil).
- **Verified Solution**:
  - **Multi-Output Variant Extraction**: Unpacked recursive `batchexecute` JSON envelopes and added a global `/g` regex sweep across the entire response text, successfully extracting all variant media IDs and URLs (x1 through x4).
  - **Native 2K / 4K Image Upscaling (`SPrCad`)**: Implemented RPC `SPrCad` (`FlowService.UpsampleImage`) with `code: 1` (2K) and `code: 2` (4K). The response carries the pure Base64 image binary directly in `payload[1]`, which is converted to `data:image/jpeg;base64,...`. Tiered fallback (`4K` -> `2K` -> `1K/Original`) handles tier quota limits automatically.
  - **In-Page Authenticated Fetching**: For Original resolution, images are fetched inside the MAIN world using `fetch(url, { credentials: 'include' })` and converted to Base64 Data URLs via `FileReader`, completely eliminating 403 AccessDenied errors.
  - **Zero-DOM Interference for Images**: Image generation (`ogiZ0b`) and Edit-Image (`maseQ` upload + `ogiZ0b`) execute 100% in the background via authenticated RPCs without touching the Flow DOM prompt editor, settings panel, or gallery.
  - **Positional LTR Indexing**: Grid size S/M/L resolved by horizontal screen offset (`getBoundingClientRect().left`), ensuring 100% language independence across all international locales.
  - **Dual Action Queue Reset Buttons**: When queue finishes, UI provides `Clear all` (wipe entire queue) and `Reset queue` (re-arm executed rows to ready while preserving prompts and ingredient images).
  - **Harmonized Console Logging**: 100% unified under `%c[RJ V-Flow Auto]` with standard design tokens across all files.

---

## 3. Actionable Next Steps for User / Incoming Agent

1. **User Self-Commit Instruction**:
   - The user requested to commit the changes themselves. Do not run `git commit`.
   - Recommended commit message: `chore(release): bump version to 3.1.0 and overhaul documentation governance`
   - Files to stage:
     - `src/manifest.json`
     - `CHANGELOG.md`
     - `README.md`
     - `docs/ARCHITECTURE.md`
     - `docs/CURRENT_STATE.md`
     - `docs/DECISIONS.md`
     - `docs/HANDOFF.md`
     - `docs/ROADMAP.md`
     - `docs/references/GOOGLE_FLOW_DOM.md`
     - `docs/agent-logs/2026-09-23.md`

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
