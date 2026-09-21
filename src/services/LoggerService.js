/**
 * LoggerService.js — Centralized Logging Engine for RJ V-Flow Auto
 *
 * Provides unified, beautifully colorized console logging with consistent styling,
 * brand color tokens, and extensible log sinks across automation services and UI components.
 * Strictly compliant with Zero Native Emoji policy.
 * Ported & harmonized with RJ AIO Metadata.
 */

export class LoggerService {
  /**
   * @param {string} [prefix='[RJ V-Flow Auto]'] - Default log namespace prefix.
   */
  constructor(prefix = '[RJ V-Flow Auto]') {
    this.prefix = prefix;
    this.enabled = true;
    this.colors = {
      brand: '#57c1ff',    // Cyan accent
      step: '#079183',     // Emerald teal action
      success: '#59d499',  // Precision green
      warn: '#e5a93c',     // Amber warning
      error: '#ff5555',    // Coral error
      dim: '#8a99a8'       // Muted gray
    };
  }

  /**
   * Sets whether console output is active.
   * @param {boolean} isEnabled
   */
  setEnabled(isEnabled) {
    this.enabled = Boolean(isEnabled);
  }

  /**
   * Logs an announcement or banner with bold brand styling.
   * @param {string} message - Banner text.
   * @param {...any} args - Additional arguments.
   */
  banner(message, ...args) {
    if (!this.enabled) return;
    console.log(
      `%c${this.prefix} ${message}`,
      `color: ${this.colors.brand}; font-weight: bold;`,
      ...args
    );
  }

  /**
   * Logs a queue item loop progress header.
   * Format: [RJ V-Flow Auto] --- Processing prompt X of Y ---
   *
   * @param {number|string} current - 1-indexed item number or ID.
   * @param {number} [total] - Total item count.
   * @param {string} [promptSnippet] - Truncated prompt text.
   */
  item(current, total, promptSnippet = '') {
    if (!this.enabled) return;
    const snippetText = promptSnippet ? ` ("${promptSnippet.slice(0, 40)}${promptSnippet.length > 40 ? '...' : ''}")` : '';
    if (typeof total === 'number' && !isNaN(total)) {
      console.log(
        `%c${this.prefix} --- Processing prompt %d of %d%s ---`,
        `color: ${this.colors.brand}; font-weight: bold;`,
        current,
        total,
        snippetText
      );
    } else {
      console.log(
        `%c${this.prefix} --- Processing prompt %s%s ---`,
        `color: ${this.colors.brand}; font-weight: bold;`,
        String(current),
        snippetText
      );
    }
  }

  /**
   * Logs a specific automation or DOM interaction step.
   * Format: [RJ V-Flow Auto] Setting <action>: <details>
   *
   * @param {string} action - Field or action name (e.g. 'model', 'aspectRatio', 'prompt', 'injectMedia').
   * @param {string|number} [details=''] - Detailed parameter or value.
   */
  step(action, details = '') {
    if (!this.enabled) return;
    if (details !== undefined && details !== null && details !== '') {
      console.log(
        `%c${this.prefix} Setting ${action}: %s`,
        `color: ${this.colors.step};`,
        String(details)
      );
    } else {
      console.log(
        `%c${this.prefix} Setting ${action}`,
        `color: ${this.colors.step};`
      );
    }
  }

  /**
   * General info log with custom message.
   * @param {string} message - Message text.
   * @param {...any} args - Additional arguments passed to console.log.
   */
  info(message, ...args) {
    if (!this.enabled) return;
    console.log(
      `%c${this.prefix} ${message}`,
      `color: ${this.colors.brand};`,
      ...args
    );
  }

  /**
   * Success notification log.
   * @param {string} message - Message text.
   * @param {...any} args - Additional arguments passed to console.log.
   */
  success(message, ...args) {
    if (!this.enabled) return;
    console.log(
      `%c${this.prefix} ${message}`,
      `color: ${this.colors.success}; font-weight: bold;`,
      ...args
    );
  }

  /**
   * Warning notification log.
   * @param {string} message - Warning message.
   * @param {...any} args - Additional arguments passed to console.warn.
   */
  warn(message, ...args) {
    if (!this.enabled) return;
    console.warn(
      `%c${this.prefix} ${message}`,
      `color: ${this.colors.warn}; font-weight: bold;`,
      ...args
    );
  }

  /**
   * Error notification log.
   * @param {string} message - Error message.
   * @param {...any} args - Additional arguments passed to console.error.
   */
  error(message, ...args) {
    if (!this.enabled) return;
    console.error(
      `%c${this.prefix} ${message}`,
      `color: ${this.colors.error}; font-weight: bold;`,
      ...args
    );
  }
}

export const logger = new LoggerService();
