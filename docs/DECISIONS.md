# Architectural Decision Records (ADR) — RJ V-Flow Auto

## Index
- [ADR-001: Manifest V3 & Vanilla ES Modules Architecture](#adr-001-manifest-v3--vanilla-es-modules-architecture)
- [ADR-002: Dual-Mode UI Strategy: Minimalist Toolbar Popup + Draggable In-Page Studio HUD](#adr-002-dual-mode-ui-strategy-minimalist-toolbar-popup--draggable-in-page-studio-hud)
- [ADR-003: Shadow DOM Encapsulation for Total CSS Isolation](#adr-003-shadow-dom-encapsulation-for-total-css-isolation)
- [ADR-004: Zero-CDP Protocol & Native ProseMirror Paragraph Event Injection](#adr-004-zero-cdp-protocol--native-prosemirror-paragraph-event-injection)
- [ADR-005: Multi-Language Resilience via Material Symbols Ligatures & Custom Angular Tags](#adr-005-multi-language-resilience-via-material-symbols-ligatures--custom-angular-tags)
- [ADR-006: In-Card Generation Failure Detection (Zero Toast Dependency)](#adr-006-in-card-generation-failure-detection-zero-toast-dependency)
- [ADR-007: Raycast Dark Precision Design System & Strict Zero Native Emoji Policy](#adr-007-raycast-dark-precision-design-system--strict-zero-native-emoji-policy)
- [ADR-008: Virtual Scroll Safe Top-Batch Gallery Monitoring](#adr-008-virtual-scroll-safe-top-batch-gallery-monitoring)
- [ADR-009: IndexedDB Binary Storage Engine (`FlowImageDB`) for Media Ingestion](#adr-009-indexeddb-binary-storage-engine-flowimagedb-for-media-ingestion)
- [ADR-010: Multi-Row Virtual Scroll Batch Collection (`FlowWatcherService`)](#adr-010-multi-row-virtual-scroll-batch-collection-flowwatcherservice)
- [ADR-011: Clean Mount Protocol for FOUC & Transition Suppression (`FlowHUDHost`)](#adr-011-clean-mount-protocol-for-fouc--transition-suppression-flowhudhost)
- [ADR-012: Graceful Stop Execution Engine (`QueueManager`)](#adr-012-graceful-stop-execution-engine-queuemanager)
- [ADR-013: Production Packaging & AST Obfuscation Architecture (`build.js`)](#adr-013-production-packaging--ast-obfuscation-architecture-buildjs)

---

## ADR-001: Manifest V3 & Vanilla ES Modules Architecture
- **Status**: `ACCEPTED`
- **Date**: 2026-09-17
- **Context**: Chromium extensions must comply with Manifest V3 standards. Heavy frontend frameworks (React, Vue) and mandatory build/bundle steps create maintenance overhead and impede real-time debugging directly in developer tools.
- **Decision**: Build the extension core using native Chromium Manifest V3 and pure Vanilla JavaScript (ES6 Modules) in `src/`. A build bundler (`esbuild`) will only be utilized for production obfuscated distribution in Phase 4.
- **Consequences**:
  - **Positive**: Immediate "Load unpacked" capability without compilation, zero dev overhead, direct sourceless debugging, minimal memory consumption.
  - **Negative**: Requires strict discipline regarding browser-native module import paths.

---

## ADR-002: Dual-Mode UI Strategy: Minimalist Toolbar Popup + Draggable In-Page Studio HUD
- **Status**: `ACCEPTED`
- **Date**: 2026-09-17
- **Context**: Chrome extension popups close instantly whenever focus shifts to the webpage canvas. Standard Chrome side panels take up fixed screen width, restricting viewing room on complex creative canvases.
- **Decision**: Implement a **Dual-Mode UI Architecture**:
  1. *Minimalist Toolbar Popup* (`src/popup/`): Serves as a lightweight connection inspector and quick toggle launcher.
  2. *In-Page Studio Overlay HUD* (`src/overlay/`): Injected directly into Google Flow tabs as an interactive, draggable two-column studio workspace with a collapsible floating pill.
- **Consequences**:
  - **Positive**: Fluid workflow for creators; users can queue prompts, configure parameters, and observe live canvas rendering simultaneously.
  - **Negative**: Requires careful draggable physics and window boundary clamping.

---

## ADR-003: Shadow DOM Encapsulation for Total CSS Isolation
- **Status**: `ACCEPTED`
- **Date**: 2026-09-17
- **Context**: Google Flow is styled using extensive Angular Material and global Google web stylesheets. Injecting raw HTML/CSS into the host DOM risks severe stylesheet collisions in both directions.
- **Decision**: Mount the Studio Overlay HUD inside an open-mode **Shadow DOM** (`#flow-auto-hud-root`).
- **Consequences**:
  - **Positive**: Complete bidirectional style encapsulation. Google Flow stylesheets cannot alter extension UI tokens, and extension CSS cannot distort the Google Flow interface.
  - **Negative**: Internal styling must be injected into the shadow root, and event handling crossing shadow boundaries requires checking `composedPath()`.

---

## ADR-004: Zero-CDP Protocol & Native ProseMirror Paragraph Event Injection
- **Status**: `ACCEPTED`
- **Date**: 2026-09-17
- **Context**: Legacy v2.x attached Chrome DevTools Protocol (`chrome.debugger`) to simulate trusted browser events. This caused persistent debugging banners, triggered anti-bot heuristics, and introduced connection race conditions.
- **Decision**: Completely eliminate `chrome.debugger` in favor of native browser event stream injection tailored specifically to Google Flow's ProseMirror editor (`document.execCommand('insertText')` followed by native `InputEvent` dispatch).
- **Consequences**:
  - **Positive**: Zero security/debugging banners, zero anti-bot flags, robust execution immune to debugger detachment.
  - **Negative**: Requires precise DOM element targeting on the active ProseMirror instance.

---

## ADR-005: Multi-Language Resilience via Material Symbols Ligatures & Custom Angular Tags
- **Status**: `ACCEPTED`
- **Date**: 2026-09-17
- **Context**: Querying elements using localized English `aria-label` text or button strings (e.g. `:has-text("Start generation")`, `:has-text("Download")`) fails whenever a user operates Google Flow in non-English languages (Indonesian, Spanish, Japanese, etc.).
- **Decision**: Enforce a **Zero English-Label Dependency Policy**. All DOM selectors must rely exclusively on **Material Symbols ligature text** (`settings_2`, `more_vert`, `download`, `arrow_forward`, `swap_horiz`, `cancel`, `dashboard`, `left_panel_close`), custom Angular tags (`<flow-*>`), and internal CSS classes.
- **Consequences**:
  - **Positive**: 100% resilient across all localized Google Flow interface languages and automatic translation sessions.
  - **Negative**: Selectors require strict adherence to the language-resilient selector map.

---

## ADR-006: In-Card Generation Failure Detection (Zero Toast Dependency)
- **Status**: `ACCEPTED`
- **Date**: 2026-09-17
- **Context**: Google Flow does not present standard toast popups for generation failures caused by content moderation filters, server load, or account limits. Failed generations remain permanently blurred tiles with warning badges.
- **Decision**: Implement direct card inspection via `isCardGenerationSuccess(card)`:
  - Check absence of loading skeleton (`flow-tile-loading`, `flow-pending-tile`, `.progress-bar`).
  - Validate presence of rendered media elements (`video[src]`, `img[src]`) or completed hotbars/footers.
  - Verify absence of moderation error badges (`mat-icon:has-text("warning")`, `<flow-error-tile>`, `.error-tile`).
- **Consequences**:
  - **Positive**: Prevents the automation engine from hanging indefinitely or falsely reporting success on blocked generations.
  - **Negative**: Requires periodic polling of card state transitions during active processing.

---

## ADR-007: Raycast Dark Precision Design System & Strict Zero Native Emoji Policy
- **Status**: `ACCEPTED`
- **Date**: 2026-09-17
- **Context**: Native OS emoji characters render inconsistently across operating systems and diminish professional visual presentation.
- **Decision**: Adopt the **Raycast Dark Precision Design System** across all extension interfaces. Enforce a **Strict Zero Native Emoji Policy**:
  - UI components use inline Lucide / Phosphor SVG icons.
  - Documentation and commit logs use plain-text bracketed badges (`[COMPLETE]`, `[IN_PROGRESS]`, `[PLANNED]`, `[BLOCKED]`).
- **Consequences**:
  - **Positive**: Cohesive, state-of-the-art dark theme aesthetics with predictable multi-platform rendering.
  - **Negative**: SVG icons must be explicitly packaged and imported.

---

## ADR-008: Virtual Scroll Safe Top-Batch Gallery Monitoring
- **Status**: `ACCEPTED`
- **Date**: 2026-09-17
- **Context**: Google Flow's gallery container uses Angular CDK Virtual Scroll. As more tiles are generated and the user scrolls, older tiles are unmounted from the DOM to conserve browser memory.
- **Decision**: The watcher engine monitors the top generation batch by snapshotting baseline top tiles prior to submission and monitoring new nodes prepended to the top of the gallery.
- **Consequences**:
  - **Positive**: Immune to virtual scroll unmounting glitches.
  - **Negative**: Historic tile retrieval cannot rely on DOM queries and must rely on internal storage session records.

---

## ADR-009: IndexedDB Binary Storage Engine (`FlowImageDB`) for Media Ingestion
- **Status**: `ACCEPTED`
- **Date**: 2026-09-20
- **Context**: Storing high-resolution reference images (Image-to-Video) and start/end frames (Frame-to-Video) as Base64 strings in `chrome.storage.local` quickly violates Chrome's strict 5MB quota limit.
- **Decision**: Implement a dedicated browser IndexedDB engine (`vflowImageDB`, store `images`) in `FlowImageDB.js`. Raw `Blob` and `File` binaries are stored under unique UUID keys. `FlowStorage.sanitizeQueueForStorage()` strips Base64 payloads before persisting queue items, and `hydrateQueuePreviews()` generates in-memory object URLs on startup.
- **Consequences**:
  - **Positive**: Complete elimination of extension storage quota errors; supports arbitrarily large image references; lightning-fast thumbnail rendering.
  - **Negative**: Requires asynchronous binary lookups when preparing media for paste injection.

---

## ADR-010: Multi-Row Virtual Scroll Batch Collection (`FlowWatcherService`)
- **Status**: `ACCEPTED`
- **Date**: 2026-09-21
- **Context**: In Google Flow's Grid view Size S, multi-output generations (such as landscape 16:9 x3 or x4) span across multiple `div.tile-row` containers. Restricting watcher inspection to `tile-row:first-child` clipped the collection, causing cards in subsequent rows to be ignored and skipped during downloading.
- **Decision**: Implement `FlowWatcherService.getBatchTileElements(expectedCount, previousTopTile, promptText)` to traverse across all virtual scroll rows from top to bottom, stopping when reaching `previousTopTile` or `expectedCount`. User-uploaded ingredients are filtered via `isIngredientTile()`.
- **Consequences**:
  - **Positive**: 100% complete download coverage for all generated outputs regardless of aspect ratio, output count, or row wrapping.
  - **Negative**: Traversal must gracefully handle transient row insertions and virtual scroll re-rendering.

---

## ADR-011: Clean Mount Protocol for FOUC & Transition Suppression (`FlowHUDHost`)
- **Status**: `ACCEPTED`
- **Date**: 2026-09-21
- **Context**: When injecting Shadow DOM stylesheets asynchronously, Chromium paints unstyled native elements (e.g. `<select>` and inputs) with default browser white borders, and then triggers `transition: all 0.18s` animations when Raycast styles attach, creating an unsightly visual glitch on page refresh.
- **Decision**: Implement the Clean Mount Protocol:
  1. Add inline `style="display: none;"` on native selects in HTML templates.
  2. Gate HUD mounting behind `Promise.all` waiting for all stylesheets with a 150ms timeout.
  3. Apply `#flow-hud-container.is-mounting` (`opacity: 0 !important; transition: none !important;`) and remove it via `requestAnimationFrame` once initial setup is complete.
- **Consequences**:
  - **Positive**: Perfectly seamless, professional HUD initialization on page load with zero flashing or border glitches.
  - **Negative**: Initial mount waits up to 150ms for stylesheet readiness.

---

## ADR-012: Graceful Stop Execution Engine (`QueueManager`)
- **Status**: `ACCEPTED`
- **Date**: 2026-09-21
- **Context**: Immediately terminating queue execution while a generation or upscale download is actively running in Google Flow leaves orphan assets, loses downloaded files, and desynchronizes queue state.
- **Decision**: Introduce `QUEUE_STATES.STOPPING`. When the user requests a stop, if an item is actively generating or downloading, the engine switches to the stopping state (red accent, spinner, disabled button), allows the active item to complete generation and asset download to completion, and then halts the queue cleanly without initiating subsequent items.
- **Consequences**:
  - **Positive**: Zero wasted credits or lost downloads; clean, predictable state machine lifecycle.
  - **Negative**: User must wait for active item generation to finish, or use force-stop if necessary.

---

## ADR-013: Production Packaging & AST Obfuscation Architecture (`build.js`)
- **Status**: `ACCEPTED`
- **Date**: 2026-09-22
- **Context**: Production distribution of Chrome Manifest V3 extensions requires optimized loading performance, modular code protection, and clean installation packaging for non-technical users.
- **Decision**: Mirror the production bundling architecture of `RJ_AIO_Metadata`:
  1. Use `esbuild` to bundle all 18 internal ES modules into standalone entry point scripts inside `dist/LOAD THIS FOLDER/`.
  2. Apply AST obfuscation via `javascript-obfuscator` configured for MV3 runtime compatibility.
  3. Copy distribution metadata, static assets, and shortcut links (`SC.url`, `SUPPORT ME.url`).
  4. Automatically create clean distribution zip archives (`releases/RJ_V-Flow_Auto-v3.0.0.zip` and `releases/v3.0.0.zip`).
- **Consequences**:
  - **Positive**: Single standalone 218.7kb production script; secure AST obfuscation; turnkey "Load unpacked" directory (`dist/LOAD THIS FOLDER/`); automated zip generation.
  - **Negative**: Requires running `npm run build` prior to producing distribution packages.
