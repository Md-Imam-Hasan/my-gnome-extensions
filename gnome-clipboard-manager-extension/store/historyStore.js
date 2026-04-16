/**
 * In-memory clipboard history: structured entries, bounded size, subscribers.
 */

import GLib from "gi://GLib";

import * as C from "../utils/constants.js";

/** @typedef {import('../utils/category.js').EntryCategory} EntryCategory */

/**
 * @typedef {Object} HistoryEntry
 * @property {string} id
 * @property {string} text
 * @property {EntryCategory} category
 * @property {number} createdAt
 * @property {boolean} [pinned]
 * @property {number} [lastUsedAt]
 */

export class HistoryStore {
  constructor() {
    /** @type {HistoryEntry[]} Newest-first for raw push order; use sorted view for display */
    this._items = [];
    /** @type {Set<(items: HistoryEntry[]) => void>} */
    this._listeners = new Set();
  }

  /**
   * @returns {HistoryEntry[]} Defensive copy
   */
  getItems() {
    return this._items.map((e) => ({ ...e }));
  }

  /**
   * Replace all entries (e.g. after load). Does not notify if unchanged reference equality skipped — always notify.
   * @param {HistoryEntry[]} entries
   */
  replaceEntries(entries) {
    this._items = entries
      .filter((e) => e && typeof e.text === "string" && e.id)
      .map((e) => ({
        id: String(e.id),
        text: e.text,
        category: e.category ?? "text",
        createdAt: typeof e.createdAt === "number" ? e.createdAt : Date.now(),
        pinned: !!e.pinned,
        lastUsedAt: typeof e.lastUsedAt === "number" ? e.lastUsedAt : undefined,
      }));
    this._trim();
    this._notify();
  }

  /**
   * @param {string} text Normalized non-empty text
   * @param {EntryCategory} category
   */
  addFromClipboard(text, category) {
    if (this._items.length > 0 && this._items[0].text === text) return;

    const entry = {
      id: GLib.uuid_string_random(),
      text,
      category,
      createdAt: Date.now(),
      pinned: false,
      lastUsedAt: undefined,
    };
    this._items.unshift(entry);
    this._trim();
    this._notify();
  }

  /**
   * @param {string} id
   */
  touchUsed(id) {
    const i = this._items.findIndex((e) => e.id === id);
    if (i < 0) return;
    this._items[i] = {
      ...this._items[i],
      lastUsedAt: Date.now(),
    };
    this._notify();
  }

  /**
   * @param {string} id
   * @param {boolean} pinned
   */
  setPinned(id, pinned) {
    const i = this._items.findIndex((e) => e.id === id);
    if (i < 0) return;
    this._items[i] = { ...this._items[i], pinned };
    this._notify();
  }

  clear() {
    if (this._items.length === 0) return;
    this._items = [];
    this._notify();
  }

  /**
   * @param {string} id
   */
  removeById(id) {
    const next = this._items.filter((e) => e.id !== id);
    if (next.length === this._items.length) return;
    this._items = next;
    this._notify();
  }

  _trim() {
    while (this._items.length > C.MAX_HISTORY_ITEMS) {
      let victim = -1;
      for (let i = this._items.length - 1; i >= 0; i--) {
        if (!this._items[i].pinned) {
          victim = i;
          break;
        }
      }
      if (victim < 0) {
        this._items.pop();
      } else {
        this._items.splice(victim, 1);
      }
    }
  }

  /**
   * @param {(items: HistoryEntry[]) => void} fn
   * @returns {() => void}
   */
  subscribe(fn) {
    this._listeners.add(fn);
    return () => {
      this._listeners.delete(fn);
    };
  }

  _notify() {
    const snapshot = this.getItems();
    for (const fn of this._listeners) {
      try {
        fn(snapshot);
      } catch (e) {
        console.error(
          "[clipboard-manager@muhammad-imam-hasan.com] history listener",
          e,
        );
      }
    }
  }
}
