/**
 * Clipboard integration for GNOME Shell: Meta.Selection owner-changed (compositor clipboard)
 * plus St.Clipboard for text read/write. Gdk.Clipboard does not track the real clipboard here.
 */

import Meta from "gi://Meta";
import Shell from "gi://Shell";
import St from "gi://St";

import { classifyCategory } from "../utils/category.js";
import * as Format from "../utils/format.js";

const LOG = "[clipboard-manager@muhammad-imam-hasan.com]";

export class ClipboardService {
  /**
   * @param {import('../store/historyStore.js').HistoryStore} store
   */
  constructor(store) {
    this._store = store;
    /** @type {ReturnType<St.Clipboard.get_default> | null} */
    this._stClipboard = null;
    /** @type {GObject.Object | null} Meta.Selection */
    this._selection = null;
    this._ownerChangedId = 0;
    this._stopped = false;
    /** @type {string | null} */
    this._lastProgrammaticText = null;
    this._reading = false;
    this._pendingRead = false;
  }

  start() {
    this._stopped = false;
    this._stClipboard = St.Clipboard.get_default();

    try {
      let display = null;
      try {
        display = Shell.Global.get().get_display();
      } catch {
        if (typeof global !== "undefined" && global.display)
          display = global.display;
      }
      if (!display || typeof display.get_selection !== "function") {
        log(`${LOG} could not get Meta.Display with get_selection()`);
        return;
      }
      this._selection = display.get_selection();
    } catch (e) {
      log(`${LOG} could not get Meta.Selection: ${e?.message ?? e}`);
      return;
    }

    if (!this._selection) {
      log(`${LOG} Meta.Selection is null; clipboard history disabled`);
      return;
    }

    this._ownerChangedId = this._selection.connect(
      "owner-changed",
      (_, selectionType) => {
        if (selectionType === Meta.SelectionType.SELECTION_CLIPBOARD)
          this._scheduleRead();
      },
    );

    log(
      `${LOG} monitoring clipboard (Meta.Selection owner-changed + St.Clipboard)`,
    );
  }

  _scheduleRead() {
    if (this._stopped || !this._stClipboard) return;

    if (this._reading) {
      this._pendingRead = true;
      return;
    }

    this._reading = true;
    try {
      this._stClipboard.get_text(St.ClipboardType.CLIPBOARD, (cb, text) => {
        try {
          if (this._stopped) return;

          if (text === null || text === undefined) return;

          const normalized = Format.normalizeClipboardText(text);
          if (normalized.length === 0) return;

          if (!Format.isWithinByteLimit(normalized)) return;

          if (this._lastProgrammaticText !== null) {
            if (normalized === this._lastProgrammaticText) {
              this._lastProgrammaticText = null;
              return;
            }
            this._lastProgrammaticText = null;
          }

          const cat = classifyCategory(normalized);
          this._store.addFromClipboard(normalized, cat);
        } catch (e) {
          console.error(LOG, "clipboard text handler", e);
        } finally {
          this._reading = false;
          if (!this._stopped && this._pendingRead) {
            this._pendingRead = false;
            this._scheduleRead();
          }
        }
      });
    } catch (e) {
      this._reading = false;
      console.error(LOG, "get_text", e);
    }
  }

  /**
   * @param {string} text Full text to place on the clipboard
   */
  /**
   * @param {string} text
   * @param {{ store?: import('../store/historyStore.js').HistoryStore, entryId?: string }} [opts]
   */
  copyToClipboard(text, opts) {
    if (this._stopped || !this._stClipboard) return;

    try {
      const normalized = Format.normalizeClipboardText(text);
      if (normalized.length === 0) return;

      if (!Format.isWithinByteLimit(normalized)) return;

      this._lastProgrammaticText = normalized;
      this._stClipboard.set_text(St.ClipboardType.CLIPBOARD, normalized);
      if (opts?.store && opts.entryId) opts.store.touchUsed(opts.entryId);
    } catch {
      this._lastProgrammaticText = null;
    }
  }

  stop() {
    this._stopped = true;
    this._pendingRead = false;

    if (this._selection && this._ownerChangedId) {
      try {
        this._selection.disconnect(this._ownerChangedId);
      } catch {
        /* ignore */
      }
    }

    this._ownerChangedId = 0;
    this._selection = null;
    this._stClipboard = null;
    this._lastProgrammaticText = null;
  }
}
