# Changelog — RJ V-Flow Auto Extension

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Phase 1 (Cleanup & Governance Foundation)**:
  - Isolated and pushed legacy v2.x codebase to remote `legacy` branch.
  - Hardened repository `.gitignore` for build outputs, release archives, and scratch directories.
  - Established formal governance documentation suite in `docs/` (`DOCS_STYLE.md`, `ARCHITECTURE.md`, `GIT_POLICY.md`, `CURRENT_STATE.md`, `HANDOFF.md`, `ROADMAP.md`, `DECISIONS.md`).
  - Ported language-resilient Google Flow DOM specification to `docs/references/GOOGLE_FLOW_DOM.md`.
  - Authored root `AGENTS.md`, `DESIGN.md` (Raycast Dark Precision tokens), `README.md`, and MIT `LICENSE`.
  - Upgraded extension icons with optimized branding assets from RJ AIO Metadata.
  - Established clean Chromium Manifest V3 (`src/manifest.json`) without `chrome.debugger` permissions and modular `src/` directory scaffolding.

### Changed
- **Architecture Transformation (v2.x -> v3.0)**:
  - Purged obsolete CDP (`chrome.debugger`) injection in favor of 100% native ProseMirror paragraph injection.
  - Purged obsolete React Fiber, Slate, and Radix UI assumptions.
  - Purged deprecated Imagen references; transitioned entirely to Veo 3.1, Omni 1.1 Flash, and Nano Banana 2 models.
  - Deprecated legacy sidepanel (`panel/`) in favor of In-Page Studio Overlay HUD in Shadow DOM.

### Removed
- Purged legacy release archives (`v2.1.3.zip` – `v2.1.6.zip`) and snapshot folders (`v2.1.2/` – `v2.1.6/`).
- Purged obsolete `bootstrap/`, `panel/`, `scripts/`, `build.js`, `obfuscator.config.js`, and `docs/SESION_ANALYSIS.md`.

---

## [2.1.6] - 2026-06-03

### Added
- Pure random prompt generator option in sidepanel.
- Dynamic prompt source select layout.

### Fixed
- Upscale download completion toast race condition.
