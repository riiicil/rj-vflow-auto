# Architectural Decision Records (ADR) — RJ V-Flow Auto (Next-Gen v3.0)

## Index
- [ADR-001: Manifest V3 & Vanilla ES Modules Architecture](#adr-001-manifest-v3--vanilla-es-modules-architecture)
- [ADR-002: Dual-Mode UI Strategy: Minimalist Toolbar Popup + Draggable In-Page Studio HUD](#adr-002-dual-mode-ui-strategy-minimalist-toolbar-popup--draggable-in-page-studio-hud)
- [ADR-003: Shadow DOM Encapsulation for Total CSS Isolation](#adr-003-shadow-dom-encapsulation-for-total-css-isolation)
- [ADR-004: Zero-CDP Protocol & Native ProseMirror Paragraph Event Injection](#adr-004-zero-cdp-protocol--native-prosemirror-paragraph-event-injection)
- [ADR-005: Multi-Language Resilience via Material Symbols Ligatures & Custom Angular Tags](#adr-005-multi-language-resilience-via-material-symbols-ligatures--custom-angular-tags)
- [ADR-006: In-Card Generation Failure Detection (Zero Toast Dependency)](#adr-006-in-card-generation-failure-detection-zero-toast-dependency)
- [ADR-007: Raycast Dark Precision Design System & Strict Zero Native Emoji Policy](#adr-007-raycast-dark-precision-design-system--strict-zero-native-emoji-policy)
- [ADR-008: Virtual Scroll Safe Top-Batch Gallery Monitoring](#adr-008-virtual-scroll-safe-top-batch-gallery-monitoring)

---

## ADR-001: Manifest V3 & Vanilla ES Modules Architecture
- **Status**: `ACCEPTED`
- **Date**: 2026-09-17
- **Context**: Chromium extensions must comply with Manifest V3 standards. Heavy frontend frameworks (React, Vue) and mandatory build/bundle steps create maintenance overhead and impede real-time debugging directly in developer tools.
- **Decision**: Build the extension core using native Chromium Manifest V3 and pure Vanilla JavaScript (ES6 Modules) in `src/`. A build bundler (`esbuild`) will only be utilized for production obfuscated distribution in Phase 5.
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
- **Decision**: Enforce a **Zero English-Label Dependency Policy**. All DOM selectors must rely exclusively on **Material Symbols ligature text** (`settings_2`, `more_vert`, `download`, `arrow_forward`, `swap_horiz`, `cancel`), custom Angular tags (`<flow-*>`), and internal CSS classes.
- **Consequences**:
  - **Positive**: 100% resilient across all localized Google Flow interface languages and automatic translation sessions.
  - **Negative**: Selectors require strict adherence to the language-resilient selector map.

---

## ADR-006: In-Card Generation Failure Detection (Zero Toast Dependency)
- **Status**: `ACCEPTED`
- **Date**: 2026-09-17
- **Context**: Google Flow does not present standard toast popups for generation failures caused by content moderation filters, server load, or account limits. Failed generations remain permanently blurred tiles with warning badges.
- **Decision**: Implement direct card inspection via `isCardGenerationSuccess(card)`:
  - Check absence of loading skeleton (`flow-tile-loading`).
  - Validate presence of rendered media elements (`video[src]`, `img[src]`).
  - Verify absence of moderation error badges (`mat-icon:has-text("warning")`).
- **Consequences**:
  - **Positive**: Prevents the automation engine from hanging indefinitely or falsely reporting success on blocked generations.
  - **Negative**: Requires periodic polling of card state transitions during active processing.

---

## ADR-007: Raycast Dark Precision Design System & Strict Zero Native Emoji Policy
- **Status**: `ACCEPTED`
- **Date**: 2026-09-17
- **Context**: Native OS emoji characters (such as status circles, rockets, lightbulbs, or checkmarks) render inconsistently across operating systems and diminish professional visual presentation.
- **Decision**: Adopt the **Raycast Dark Precision Design System** (`DESIGN.md`) across all extension interfaces. Enforce a **Strict Zero Native Emoji Policy**:
  - UI components use inline Lucide / Phosphor SVG icons.
  - Documentation and commit logs use plain-text bracketed badges (`[COMPLETE]`, `[IN_PROGRESS]`, `[PLANNED]`, `[BLOCKED]`).
- **Consequences**:
  - **Positive**: Cohesive, state-of-the-art dark theme aesthetics with predictable multi-platform rendering.
  - **Negative**: SVG icons must be explicitly packaged and imported.

---

## ADR-008: Virtual Scroll Safe Top-Batch Gallery Monitoring
- **Status**: `ACCEPTED`
- **Date**: 2026-09-17
- **Context**: Google Flow's gallery container (`flow-grid-tile-container`) uses Angular CDK Virtual Scroll. As more tiles are generated and the user scrolls, older tiles are unmounted from the DOM to conserve browser memory.
- **Decision**: The watcher engine strictly monitors index 0 (`flow-grid-tile-container > :first-child`) for newly triggered generations, capturing metadata and URLs immediately upon completion before subsequent batches push them down.
- **Consequences**:
  - **Positive**: Immune to virtual scroll unmounting glitches.
  - **Negative**: Historic tile retrieval cannot rely on DOM queries and must rely on internal storage session records.
