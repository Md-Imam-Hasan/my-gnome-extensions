/**
 * Central limits and timing for clipboard extension.
 */

/** Max history entries kept in memory and on disk */
export const MAX_HISTORY_ITEMS = 500;

/** Re-export for format layer (byte cap on clipboard ingest) */
export const MAX_CLIPBOARD_BYTES = 10 * 1024;

/** Debounce search field (ms) */
export const SEARCH_DEBOUNCE_MS = 220;

/** Debounce writes to disk after store changes (ms) */
export const SAVE_DEBOUNCE_MS = 400;

/** Data directory under ~/.local/share */
export const STORAGE_FOLDER_NAME = 'clipboard-extension';

export const HISTORY_FILENAME = 'history.json';
export const CONFIG_FILENAME = 'config.json';

/**
 * Development-only: if non-empty, used when no passphrase was set via UI (never commit real secrets).
 * @type {string}
 */
export const DEV_FALLBACK_PASSPHRASE = '';

/** PBKDF2 iterations for key derivation (Web Crypto) */
export const PBKDF2_ITERATIONS = 120000;
