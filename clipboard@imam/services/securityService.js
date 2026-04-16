/**
 * AES-256-GCM encryption helpers via Web Crypto (crypto.subtle). No clipboard logging.
 */

import * as C from '../utils/constants.js';

const LOG = '[clipboard@imam]';

function uint8ToBase64(u8) {
    let s = '';
    for (let i = 0; i < u8.length; i++)
        s += String.fromCharCode(u8[i]);
    return btoa(s);
}

function base64ToUint8(b64) {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++)
        out[i] = bin.charCodeAt(i);
    return out;
}

const SALT_BYTES = 16;
const IV_BYTES = 12;
const KEY_BITS = 256;

export class SecurityService {
    constructor() {
        /** @type {string | null} User passphrase in memory only */
        this._passphrase = null;
        /** @type {boolean} */
        this.encryptionAvailable = false;
        /** @type {boolean} Load/decrypt failed; history unavailable until unlock */
        this.locked = false;
        /** @type {string | null} */
        this._lockError = null;

        this._detectCrypto();
    }

    _detectCrypto() {
        try {
            const c = globalThis.crypto;
            this.encryptionAvailable = !!(c && c.subtle && typeof c.subtle.importKey === 'function');
        } catch {
            this.encryptionAvailable = false;
        }
        log(`${LOG} crypto.subtle: ${this.encryptionAvailable ? 'yes' : 'no'} (journalctl to verify)`);
        if (!this.encryptionAvailable)
            log(`${LOG} Web Crypto unavailable — encryption disabled`);
    }

    /**
     * @param {string | null} pass
     */
    setPassphrase(pass) {
        this._passphrase = pass && pass.length > 0 ? pass : null;
    }

    /**
     * @returns {string | null}
     */
    getPassphrase() {
        return this._passphrase;
    }

    /**
     * Resolve passphrase: explicit UI, then dev constant (empty = none).
     * @returns {string|null}
     */
    _effectivePassphrase() {
        if (this._passphrase && this._passphrase.length > 0)
            return this._passphrase;
        if (C.DEV_FALLBACK_PASSPHRASE && C.DEV_FALLBACK_PASSPHRASE.length > 0)
            return C.DEV_FALLBACK_PASSPHRASE;
        return null;
    }

    /**
     * @param {string} plainText UTF-8 JSON string
     * @returns {Promise<object>} Envelope { salt, iv, data } base64 fields
     */
    async encryptPayload(plainText) {
        if (!this.encryptionAvailable)
            throw new Error('encryption unavailable');

        const pass = this._effectivePassphrase();
        if (!pass)
            throw new Error('no passphrase');

        const enc = new TextEncoder();
        const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
        const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));

        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            enc.encode(pass),
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey'],
        );

        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt,
                iterations: C.PBKDF2_ITERATIONS,
                hash: 'SHA-256',
            },
            keyMaterial,
            { name: 'AES-GCM', length: KEY_BITS },
            false,
            ['encrypt'],
        );

        const cipher = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            enc.encode(plainText),
        );

        return {
            salt: uint8ToBase64(salt),
            iv: uint8ToBase64(iv),
            data: uint8ToBase64(new Uint8Array(cipher)),
        };
    }

    /**
     * @param {{ salt: string, iv: string, data: string }} envelope Base64 fields
     * @returns {Promise<string>} UTF-8 plaintext
     */
    async decryptPayload(envelope) {
        if (!this.encryptionAvailable)
            throw new Error('encryption unavailable');

        const pass = this._effectivePassphrase();
        if (!pass)
            throw new Error('no passphrase');

        const salt = base64ToUint8(envelope.salt);
        const iv = base64ToUint8(envelope.iv);
        const data = base64ToUint8(envelope.data);

        const enc = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            enc.encode(pass),
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey'],
        );

        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt,
                iterations: C.PBKDF2_ITERATIONS,
                hash: 'SHA-256',
            },
            keyMaterial,
            { name: 'AES-GCM', length: KEY_BITS },
            false,
            ['decrypt'],
        );

        const plainBuf = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            data,
        );

        return new TextDecoder().decode(plainBuf);
    }

    /**
     * @param {boolean} failed
     * @param {string} [reason] Never include secrets or clipboard
     */
    setLocked(failed, reason) {
        this.locked = failed;
        this._lockError = reason ?? null;
        if (failed)
            log(`${LOG} storage locked (${reason ?? 'decrypt failed'})`);
    }

    clearLocked() {
        this.locked = false;
        this._lockError = null;
    }
}
