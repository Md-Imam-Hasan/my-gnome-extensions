/**
 * Text truncation, normalization, and size limits for clipboard content.
 */

import { MAX_CLIPBOARD_BYTES as _MAX_BYTES } from './constants.js';

/** Maximum UTF-8 byte length accepted from the clipboard (10 KiB). */
export const MAX_CLIPBOARD_BYTES = _MAX_BYTES;

/** Preview length for menu rows (characters). */
export const PREVIEW_MAX_CHARS = 96;

const _encoder = new TextEncoder();

/**
 * @param {string} text
 * @returns {number}
 */
export function utf8ByteLength(text) {
    return _encoder.encode(text).length;
}

/**
 * @param {string} text
 * @returns {boolean}
 */
export function isWithinByteLimit(text) {
    return utf8ByteLength(text) <= MAX_CLIPBOARD_BYTES;
}

/**
 * Collapses excessive blank lines and trims outer whitespace for storage.
 * @param {string} text
 * @returns {string}
 */
export function normalizeClipboardText(text) {
    let t = text.replace(/\r\n/g, '\n').trim();
    t = t.replace(/\n{3,}/g, '\n\n');
    return t;
}

/**
 * Single-line friendly preview for menu labels.
 * @param {string} text
 * @param {number} [maxLen]
 * @returns {string}
 */
export function truncateForPreview(text, maxLen = PREVIEW_MAX_CHARS) {
    if (!text)
        return '';

    const single = text.replace(/\s+/g, ' ').trim();
    if (single.length <= maxLen)
        return single;

    return `${single.slice(0, Math.max(0, maxLen - 1))}…`;
}
