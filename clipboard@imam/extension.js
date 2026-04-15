/**
 * Clipboard History — wires HistoryStore, ClipboardService, and panel UI.
 */

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

import { ClipboardIndicator } from './panel/indicator.js';
import { ClipboardService } from './services/clipboardService.js';
import { HistoryStore } from './store/historyStore.js';

export default class ClipboardManagerExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        /** @type {HistoryStore | null} */
        this._store = null;
        /** @type {ClipboardService | null} */
        this._clipboard = null;
        /** @type {ClipboardIndicator | null} */
        this._indicator = null;
    }

    enable() {
        this._store = new HistoryStore();
        this._clipboard = new ClipboardService(this._store);
        this._clipboard.start();

        this._indicator = new ClipboardIndicator(this._store, this._clipboard);
        this._indicator.enable();

        log('[clipboard@imam] extension enabled — watch journal for monitoring line');
    }

    disable() {
        if (this._indicator) {
            this._indicator.disable();
            this._indicator = null;
        }

        if (this._clipboard) {
            this._clipboard.stop();
            this._clipboard = null;
        }

        this._store = null;
    }
}
