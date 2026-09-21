# Google Flow — Precision DOM Selector Map & Architectural Specification

> **Status**: Master Technical Reference & Institutional Knowledge Baseline  
> **Target Platform**: Google Flow (`flow.google.com`)  
> **Runtime Environment**: Chromium Manifest V3 (`src/`)  
> **Design Policy**: 100% Multi-Language Resilient (Strict Zero English-Label Dependency & Zero Native Emoji)  
> **Empirical Basis**: Reverse-engineered from in-page execution captures on Google Flow  

---

## 1. Native Page Architecture & Zero-CDP Protocol

Google Flow runs on a modern, decoupled web application stack. All legacy extension assumptions (React Fiber `__reactFiber$`, Slate `data-slate-editor`, and Chrome DevTools Protocol injection via `chrome.debugger`) are completely obsolete and eliminated.

| Architectural Layer | Real Google Flow Implementation | Extension Integration Strategy |
| :--- | :--- | :--- |
| **Component Model** | **Google Angular Custom Elements** (`<flow-*>`) | Target native custom tags and hierarchical component scopes directly. |
| **UI Framework** | **Angular Material & CDK** (`<mat-*>`, `cdk-*`) | Interact via native click events, Material toggle groups, and CDK overlay containers. |
| **Rich Text Editor** | **ProseMirror Engine** (`flow-rich-text-editor div.ProseMirror`) | Inject text natively via `document.execCommand('insertText')` + native `InputEvent` dispatch. Zero CDP required. |
| **Iconography** | **Google Material Symbols** (Ligature font) | **CRITICAL MULTI-LANGUAGE KEY**: Material Symbols use ligature strings (`settings_2`, `arrow_forward`, `more_vert`, `download`, `swap_horiz`, `cancel`, `dashboard`, `left_panel_close`). These ligature strings are internal font glyph identifiers and are **never translated by browser locales or Google Translate**. |
| **Gallery Viewport** | **Angular CDK Virtual Scroll** (`cdk-virtual-scroll-viewport`) | Monitor newest generation batch across all virtual scroll rows until reaching baseline top tile or expected count. |
| **Execution Trigger** | Native Button `.click()` / `KeyboardEvent('Enter')` | 100% native DOM event dispatching. Safe from Google anti-bot suspicious flags. |

---

## 2. Multi-Language Resilient DOM Selector Map

> [!IMPORTANT]
> **Zero English-Label Policy**: Never query elements using localized English `aria-label` text (e.g. `[aria-label="Start generation"]`, `[aria-label="Tile grid settings"]`) or localized button text (e.g. `:has-text("Grid")`, `:has-text("Download")`). When a user runs Google Flow in Indonesian, Spanish, Japanese, or French, these labels change.  
> The selectors below rely exclusively on **Material Symbol Ligatures**, **Custom Angular Tags**, **Internal CSS Classes**, and **DOM Hierarchy**, making them **100% resilient across all languages**.

---

### A. Top Header & Tile Grid Setup (`flow-tile-view-header`)

```
flow-tile-view-header > header.header-base.header-desktop
```

#### 1. Tile Grid Settings Button
- **Language-Resilient Selector**:
  ```css
  flow-tile-view-header .tools-button-group button:has(mat-icon:has-text("settings_2"))
  ```
  *Alternative structural path:* `flow-tile-view-header .tools-button-group > button:nth-of-type(3)`
- **Why it is resilient**: The icon text `"settings_2"` is a Material font ligature; it remains `"settings_2"` regardless of the user's interface language.

#### 2. Grid Settings Popover Controls (`.cdk-overlay-pane`)
When the grid settings button is clicked, an Angular CDK overlay opens:
- **Layout Mode Toggle (Grid)**:
  ```css
  div.cdk-overlay-pane mat-button-toggle-group mat-button-toggle:nth-of-type(1) button
  ```
  *(Grid is always the first toggle option at index 0).*
- **Tile Thumbnail Size (Medium / M)**:
  ```css
  div.cdk-overlay-pane mat-button-toggle-group mat-button-toggle:has(span:has-text("M")) button
  ```
  *(Size identifiers S, M, L are standard single-letter tokens).*
- **Clear Prompt on Submit Toggle Switch**:
  ```css
  div.cdk-overlay-pane mat-slide-toggle button[role="switch"]
  ```
  *Verification:* Check `aria-checked="true"`. If `false`, invoke `.click()`.

---

### B. Prompt Box, Editor, & Generation Controls (`flow-base-prompt-box`)

```
flow-prompt-box.prompt-box-container
 └── flow-prompt-box-instruction-card-wrapper
      └── div.wrapper-container
           └── div.prompt-box-content
                └── flow-base-prompt-box
```

#### 1. Creative Agent Mode Toggle Chip (Suppression Required)
Google Flow's built-in creative assistant modifies prompt submission behavior and must always be disabled for direct batch generation.
- **Resilient Selector**:
  ```css
  flow-agent-mode-toggle-chip button.agent-mode-chip
  ```
- **Active State Detection**:
  - Container has class `flow-agent-mode-toggle-chip.checked` or button has `button.agent-mode-chip-checked`.
- **Enforcement Logic**:
  ```javascript
  function ensureAgentModeOff() {
    const btn = document.querySelector('flow-agent-mode-toggle-chip button.agent-mode-chip');
    if (btn && btn.classList.contains('agent-mode-chip-checked')) {
      btn.click();
    }
  }
  ```

#### 2. ProseMirror Text Editor Input
- **Host Component**: `flow-rich-text-editor.prompt-input`
- **Editable Contenteditable Node**:
  ```css
  flow-rich-text-editor.prompt-input div.ProseMirror
  ```
- **Native Text Injection Routine (Zero-CDP)**:
  ```javascript
  function setFlowPrompt(promptText) {
    const editor = document.querySelector('flow-rich-text-editor.prompt-input div.ProseMirror');
    if (!editor) throw new Error('ProseMirror editor node not found');
    editor.focus();
    editor.innerHTML = '<p><br class="ProseMirror-trailingBreak"></p>';
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, promptText);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  }
  ```

#### 3. Settings Trigger Button & Summary Label
- **Button Selector (Class-Scoped, Zero Text Dependency)**:
  ```css
  flow-base-prompt-box div.submit-controls button.settings-trigger-button
  ```
- **Active Settings Summary Span**:
  ```css
  button.settings-trigger-button span.settings-summary
  ```
- **Fast-Path Bypass Strategy**: Read `settings-summary.textContent`. If it already contains the target parameters (e.g. `crop_16_9` and `x2`), skip opening the settings popover entirely.

#### 4. Generate Button (`arrow_forward`)
- **Resilient Selector**:
  ```css
  flow-generate-icon-button button.generate-icon-button
  ```
  *Or ligature-scoped:* `flow-generate-icon-button button:has(mat-icon:has-text("arrow_forward"))`
- **Readiness Check**: The button has class `mat-mdc-button-disabled` or attribute `disabled=""` when prompt is empty or invalid. Wait until `disabled` is absent.
- **Execution**:
  ```javascript
  const btn = document.querySelector('flow-generate-icon-button button.generate-icon-button');
  if (btn && !btn.hasAttribute('disabled')) {
    btn.click();
  }
  ```

---

### C. Prompt Settings Popover (`flow-prompt-box-settings`)

Opened by clicking `button.settings-trigger-button`:

#### 1. Model Family Dropdown
- **Dropdown Trigger**:
  ```css
  flow-prompt-box-settings div.settings-content button:has(span.model-select-trigger-content)
  ```
- **Active Model Display**:
  ```css
  flow-prompt-box-settings span.model-select-trigger-content
  ```
- **Menu Items Panel** (`div.mat-mdc-menu-content`):
  ```css
  div.mat-mdc-menu-content flow-menu-item button[role="menuitem"]
  ```
- **Active Models Matching (Model Names are Global Proper Nouns)**:
  - Video: `"Omni 1.1 Flash"`, `"Veo 3.1 - Lite"`, `"Veo 3.1 - Fast"`, `"Veo 3.1 - Quality"`
  - Image: `"Nano Banana Pro"`, `"Nano Banana 2"`, `"Nano Banana 2 Lite"`

#### 2. Mode & Media Toggles (Using Ligatures & Universal Tokens)
- **Video Mode**: `mat-button-toggle:has(mat-icon:has-text("videocam")) button`
- **Image Mode**: `mat-button-toggle:has(mat-icon:has-text("image")) button`
- **Frames Sub-Mode**: `mat-button-toggle:has(mat-icon:has-text("crop_free")) button`
- **Ingredients Sub-Mode**: `mat-button-toggle-group mat-button-toggle:nth-of-type(2) button`
- **Video Duration (Omni Only)**:
  - Toggles containing pure numbers + `"s"`: `:has-text("4s")`, `:has-text("6s")`, `:has-text("8s")`, `:has-text("10s")`.
- **Output Multiplier**:
  - Pure multiplier tokens: `:has-text("x1")`, `:has-text("x2")`, `:has-text("x3")`, `:has-text("x4")`.
- **Aspect Ratio**:
  - By Material ligature: `:has(mat-icon:has-text("crop_16_9"))`, `:has(mat-icon:has-text("crop_9_16"))`, `:has(mat-icon:has-text("crop_landscape"))`, `:has(mat-icon:has-text("crop_square"))`.
  - By ratio string: `"16:9"`, `"9:16"`, `"4:3"`, `"1:1"`.

---

### D. Ingredient Bar, Media Ingestion, & Frames Interpolation

```
div.prompt-top-row.has-ingredient-bar > flow-ingredient-bar.prompt-ingredient-bar
```

#### 1. Frame Slot Triggers (Frame-to-Video)
- **Start Frame Empty Trigger**:
  ```css
  flow-ingredient-bar div.frame-trigger:nth-of-type(1) button.empty-chip
  ```
- **End Frame Empty Trigger**:
  ```css
  flow-ingredient-bar div.frame-trigger:nth-of-type(2) button.empty-chip
  ```
- **Swap Frames Button (Ligature `swap_horiz`)**:
  ```css
  flow-ingredient-bar button:has(mat-icon:has-text("swap_horiz"))
  ```
- **Populated Frame Chip**:
  ```css
  flow-ingredient-bar div.frame-trigger flow-image-ingredient-chip
  ```
- **Remove Frame / Ingredient Chip (Ligature `cancel`)**:
  ```css
  flow-ingredient-bar flow-image-ingredient-chip div.hover-icon-overlay mat-icon:has-text("cancel")
  ```

#### 2. Media Clipboard Paste Injection
Injecting images/videos directly into the ProseMirror editor natively triggers Google Flow's internal asset upload handler:
```javascript
function injectMediaToFlow(fileBlob, fileName = "ingredient.png", mimeType = "image/png") {
  const editor = document.querySelector('flow-rich-text-editor.prompt-input div.ProseMirror');
  editor.focus();

  const file = new File([fileBlob], fileName, { type: mimeType });
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);

  const pasteEvent = new ClipboardEvent('paste', {
    clipboardData: dataTransfer,
    bubbles: true,
    cancelable: true
  });
  editor.dispatchEvent(pasteEvent);
}
```

#### 3. Upload Consent Dialog Auto-Handler
- **Consent Dialog Root**: `flow-upload-consent-dialog`
- **Confirm Button**:
  ```css
  flow-upload-consent-dialog mat-dialog-actions div.agree-actions-group button
  ```

---

### E. Gallery Asset Cards & Generation Lifecycle (`flow-tile-container`)

```
flow-grid-tile-container
 └── flow-tile-container:first-child (Top / Newest Batch)
      └── div.container
           ├── flow-video-tile (or flow-image-tile)
           │    ├── img.thumbnail / video
           │    ├── div.progress-bar (Rendering)
           │    └── div.hotbar-container
           │         └── flow-hotbar-container
```

#### 1. In-Card Generation Success & Failure Validator (Zero Toast Dependency)
> [!CAUTION]
> Moderation blocks and daily quota limits **do not appear as toasts**. Google Flow creates an error card in the gallery displaying `<flow-error-tile>` and a Material Symbol ligature `warning`.
> Additionally, there is a **transient blank phase (300ms–2000ms)** between the progress bar vanishing and the media thumbnail mounting. Systems must never classify a blank state without an error tile as failed.

```javascript
/**
 * Evaluates whether an asset tile has genuinely failed.
 * Empirical verification: flow-error-tile, warning ligature, .error-tile.
 */
function isCardGenerationFailed(tileElement) {
  if (!tileElement) return false;
  const hasErrorTile = Boolean(tileElement.querySelector('flow-error-tile, .error-tile, .error-tile-content'));
  const hasWarningIcon = Boolean(
    tileElement.querySelector('mat-icon:has-text("warning")') ||
    Array.from(tileElement.querySelectorAll('mat-icon')).some(i => i.textContent.trim() === 'warning')
  );
  const hasErrorClass = tileElement.classList.contains('failed') || tileElement.classList.contains('blurred-error');
  const hasErrorMessage = Boolean(tileElement.querySelector('.error-message, .error-subtitle, .error-message-text'));
  return hasErrorTile || hasWarningIcon || hasErrorClass || hasErrorMessage;
}

/**
 * Evaluates whether an asset tile has completed successfully.
 */
function isCardGenerationSuccess(tileElement) {
  if (!tileElement) return false;

  // 1. Ensure progress bar / pending tile is completely gone
  if (tileElement.querySelector('flow-pending-tile, .progress-bar, .hover-overlay-has-progress-bar')) {
    return false;
  }

  // 2. Definitive failure check
  if (isCardGenerationFailed(tileElement)) {
    return false;
  }

  // 3. Verify valid, non-empty, non-placeholder media source exists
  const media = tileElement.querySelector('img.thumbnail, img.image, video');
  if (!media) return false;
  const src = media.getAttribute('src') || media.currentSrc || '';
  if (!src || src.trim() === '' || src.startsWith('data:image/svg') || src.includes('placeholder')) {
    return false;
  }

  return true;
}
```

#### 2. Card Hotbar More Options Trigger (`more_vert`)
- **Resilient Selector**:
  ```css
  flow-hotbar-container div.hotbar-inner button:has(mat-icon:has-text("more_vert"))
  ```
  *(Or third button in hotbar: `flow-hotbar-container div.hotbar-inner > button:nth-of-type(3)`).*

---

### F. Download Context Menu & Resolution Submenus (`div.mat-mdc-menu-content`)

When `more_vert` is clicked on a completed asset card:

#### 1. Main Download Menu Item (Ligature `download`)
- **Resilient Selector**:
  ```css
  div.mat-mdc-menu-content flow-menu-item button[role="menuitem"]:has(mat-icon:has-text("download"))
  ```
  *Why resilient:* Even in Indonesian ("Unduh"), Spanish ("Descargar"), or French ("Télécharger"), the `<mat-icon>` ligature text is always `"download"`.

#### 2. Resolution Submenu Items (Universal Technical Tokens)
- **Video Resolutions**:
  - `720p`: `div.mat-mdc-menu-content flow-menu-item button:has-text("720p")`
  - `1080p`: `div.mat-mdc-menu-content flow-menu-item button:has-text("1080p")`
- **Image Resolutions**:
  - `1K`: `div.mat-mdc-menu-content flow-menu-item button:has-text("1K")`
  - `2K`: `div.mat-mdc-menu-content flow-menu-item button:has-text("2K")`
  - `4K`: `div.mat-mdc-menu-content flow-menu-item button:has-text("4K")`
