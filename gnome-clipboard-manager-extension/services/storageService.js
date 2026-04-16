/**
 * JSON persistence + debounced save. Never logs clipboard text.
 */

import GLib from "gi://GLib";
import Gio from "gi://Gio";

import { isValidCategory } from "../utils/category.js";
import * as C from "../utils/constants.js";

const LOG = "[clipboard-manager@muhammad-imam-hasan.com]";

/**
 * @param {import('../store/historyStore.js').HistoryStore} store
 * @param {import('./securityService.js').SecurityService} security
 */
export class StorageService {
  constructor(store, security) {
    this._store = store;
    this._security = security;

    const home = GLib.get_home_dir();
    this._dirPath = GLib.build_filenamev([
      home,
      ".local",
      "share",
      C.STORAGE_FOLDER_NAME,
    ]);
    this._historyPath = GLib.build_filenamev([
      this._dirPath,
      C.HISTORY_FILENAME,
    ]);
    this._configPath = GLib.build_filenamev([this._dirPath, C.CONFIG_FILENAME]);

    /** @type {Gio.File | null} */
    this._historyFile = null;
    /** @type {Gio.File | null} */
    this._configFile = null;

    /** @type {{ persist: boolean, encrypt: boolean, version: number }} */
    this._config = { version: 1, persist: true, encrypt: false };

    this._saveTimeoutId = 0;
    /** @type {(() => void) | null} */
    this._unsub = null;

    /** @type {(() => void) | null} */
    this._lockListeners = new Set();
  }

  /**
   * Subscribe to lock state changes (locked after bad decrypt).
   * @param {(locked: boolean) => void} fn
   * @returns {() => void}
   */
  subscribeLock(fn) {
    this._lockListeners.add(fn);
    return () => this._lockListeners.delete(fn);
  }

  _emitLock() {
    const locked = this._security.locked;
    for (const fn of this._lockListeners) {
      try {
        fn(locked);
      } catch (e) {
        console.error(LOG, "lock listener", e);
      }
    }
  }

  /**
   * @returns {boolean}
   */
  isLocked() {
    return this._security.locked;
  }

  /**
   * @returns {{ persist: boolean, encrypt: boolean }}
   */
  getConfig() {
    return { persist: this._config.persist, encrypt: this._config.encrypt };
  }

  /**
   * @param {boolean} persist
   * @param {boolean} encrypt
   */
  setConfig(persist, encrypt) {
    this._config.persist = persist;
    this._config.encrypt = encrypt;
    this._writeConfigFile();
    if (persist) this.scheduleSave();
  }

  /**
   * Ensure directory, load config + history (sync read at startup).
   */
  bootstrap() {
    this._historyFile = Gio.File.new_for_path(this._historyPath);
    this._configFile = Gio.File.new_for_path(this._configPath);

    try {
      GLib.mkdir_with_parents(this._dirPath, 0o700);
    } catch (e) {
      log(`${LOG} could not create storage directory`);
    }

    this._readConfigFile();
    this._loadHistorySync();
  }

  /**
   * Call after store is ready — subscribe to changes for autosave.
   */
  attachStoreListener() {
    if (this._unsub) return;
    this._unsub = this._store.subscribe(() => {
      if (this._config.persist) this.scheduleSave();
    });
  }

  _readConfigFile() {
    try {
      if (!this._configFile.query_exists(null)) return;
      const [, contents] = this._configFile.load_contents(null);
      const txt = new TextDecoder().decode(contents);
      const o = JSON.parse(txt);
      if (typeof o.persist === "boolean") this._config.persist = o.persist;
      if (typeof o.encrypt === "boolean") this._config.encrypt = o.encrypt;
    } catch {
      /* keep defaults */
    }
  }

  _writeConfigFile() {
    if (!this._configFile) return;
    try {
      const bytes = new TextEncoder().encode(
        JSON.stringify({
          version: 1,
          persist: this._config.persist,
          encrypt: this._config.encrypt,
        }),
      );
      this._configFile.replace_contents(
        bytes,
        null,
        false,
        Gio.FileCreateFlags.REPLACE_DESTINATION | Gio.FileCreateFlags.PRIVATE,
        null,
      );
    } catch (e) {
      log(`${LOG} config write failed`);
    }
  }

  _loadHistorySync() {
    if (!this._historyFile || !this._historyFile.query_exists(null)) return;

    let contents;
    try {
      [, contents] = this._historyFile.load_contents(null);
    } catch {
      log(`${LOG} history read failed`);
      return;
    }

    let txt;
    try {
      txt = new TextDecoder().decode(contents);
    } catch {
      log(`${LOG} history decode failed`);
      return;
    }

    let root;
    try {
      root = JSON.parse(txt);
    } catch {
      log(`${LOG} history JSON parse failed — starting empty`);
      return;
    }

    if (root.encrypted === true) {
      if (!this._security.encryptionAvailable) {
        this._security.setLocked(true, "no crypto");
        this._emitLock();
        return;
      }
      this._security.setLocked(true, "unlock-required");
      this._emitLock();
      this._decryptAndApplyAsync(root);
      return;
    }

    this._applyEntriesFromRoot(root);
  }

  /**
   * @param {object} root
   */
  _applyEntriesFromRoot(root) {
    const raw = root.entries;
    if (!Array.isArray(raw)) return;

    const entries = [];
    for (const e of raw) {
      if (!e || typeof e.text !== "string") continue;
      const cat = isValidCategory(e.category) ? e.category : "text";
      entries.push({
        id: String(e.id ?? GLib.uuid_string_random()),
        text: e.text,
        category: cat,
        createdAt: typeof e.createdAt === "number" ? e.createdAt : Date.now(),
        pinned: !!e.pinned,
        lastUsedAt: typeof e.lastUsedAt === "number" ? e.lastUsedAt : undefined,
      });
    }
    this._store.replaceEntries(entries);
    this._security.clearLocked();
    this._emitLock();
  }

  /**
   * @param {object} root
   */
  _decryptAndApplyAsync(root) {
    if (!root.salt || !root.iv || !root.data) {
      this._security.setLocked(true, "bad envelope");
      this._emitLock();
      return;
    }

    this._security
      .decryptPayload({
        salt: root.salt,
        iv: root.iv,
        data: root.data,
      })
      .then((innerTxt) => {
        let inner;
        try {
          inner = JSON.parse(innerTxt);
        } catch {
          this._security.setLocked(true, "inner parse");
          this._emitLock();
          return;
        }
        if (!inner || !Array.isArray(inner.entries)) {
          this._security.setLocked(true, "inner shape");
          this._emitLock();
          return;
        }
        const wrapped = {
          version: 1,
          encrypted: false,
          entries: inner.entries,
        };
        this._applyEntriesFromRoot(wrapped);
      })
      .catch(() => {
        this._security.setLocked(true, "decrypt");
        this._emitLock();
      });
  }

  /**
   * Retry decrypt after user sets passphrase (same file on disk).
   */
  retryLoadEncrypted() {
    this._security.clearLocked();
    this._loadHistorySync();
  }

  scheduleSave() {
    if (!this._config.persist) return;

    if (this._saveTimeoutId) GLib.source_remove(this._saveTimeoutId);

    this._saveTimeoutId = GLib.timeout_add(
      GLib.PRIORITY_DEFAULT,
      C.SAVE_DEBOUNCE_MS,
      () => {
        this._saveTimeoutId = 0;
        this._saveNow().catch(() => {
          log(`${LOG} save failed`);
        });
        return GLib.SOURCE_REMOVE;
      },
    );
  }

  /**
   * @returns {Promise<void>}
   */
  async _saveNow() {
    if (!this._config.persist || !this._historyFile) return;

    const items = this._store.getItems();
    const innerObj = { version: 1, entries: items };
    const innerJson = JSON.stringify(innerObj);

    try {
      if (this._config.encrypt && this._security.encryptionAvailable) {
        const pass =
          this._security.getPassphrase() ||
          (C.DEV_FALLBACK_PASSPHRASE.length > 0
            ? C.DEV_FALLBACK_PASSPHRASE
            : null);
        if (!pass) {
          log(`${LOG} encrypt enabled but no passphrase — skipping save`);
          return;
        }
        this._security.setPassphrase(pass);
        const env = await this._security.encryptPayload(innerJson);
        const outer = {
          version: 1,
          encrypted: true,
          salt: env.salt,
          iv: env.iv,
          data: env.data,
        };
        this._writeHistoryBytes(
          new TextEncoder().encode(JSON.stringify(outer)),
        );
      } else {
        const plain = {
          version: 1,
          encrypted: false,
          entries: items,
        };
        this._writeHistoryBytes(
          new TextEncoder().encode(JSON.stringify(plain)),
        );
      }
    } catch {
      log(`${LOG} persist encode failed`);
    }
  }

  /**
   * @param {Uint8Array} bytes
   */
  _writeHistoryBytes(bytes) {
    if (!this._historyFile) return;
    /** @type {Uint8Array} */
    const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    this._historyFile.replace_contents(
      u8,
      null,
      false,
      Gio.FileCreateFlags.REPLACE_DESTINATION | Gio.FileCreateFlags.PRIVATE,
      null,
    );
  }

  /**
   * Best-effort immediate save (extension disable).
   */
  flush() {
    if (this._saveTimeoutId) {
      GLib.source_remove(this._saveTimeoutId);
      this._saveTimeoutId = 0;
    }
    if (!this._config.persist) return;
    this._saveNow().catch(() => {});
  }

  destroy() {
    if (this._saveTimeoutId) {
      GLib.source_remove(this._saveTimeoutId);
      this._saveTimeoutId = 0;
    }
    if (this._unsub) {
      this._unsub();
      this._unsub = null;
    }
    this._lockListeners.clear();
  }
}
