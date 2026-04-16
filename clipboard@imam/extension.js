/**
 * Clipboard History — wires store, security, storage, clipboard service, and panel UI.
 */

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

import { ClipboardIndicator } from './panel/indicator.js';
import { ClipboardService } from './services/clipboardService.js';
import { SecurityService } from './services/securityService.js';
import { StorageService } from './services/storageService.js';
import { HistoryStore } from './store/historyStore.js';

export default class ClipboardManagerExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        /** @type {HistoryStore | null} */
        this._store = null;
        /** @type {SecurityService | null} */
        this._security = null;
        /** @type {StorageService | null} */
        this._storage = null;
        /** @type {ClipboardService | null} */
        this._clipboard = null;
        /** @type {ClipboardIndicator | null} */
        this._indicator = null;
        /** @type {(() => void) | null} */
        this._lockUnsub = null;
    }

    enable() {
        this._security = new SecurityService();
        this._store = new HistoryStore();
        this._storage = new StorageService(this._store, this._security);
        this._storage.bootstrap();
        this._storage.attachStoreListener();

        this._clipboard = new ClipboardService(this._store);
        this._clipboard.start();

        this._indicator = new ClipboardIndicator(
            this._store,
            this._clipboard,
            this._storage,
            this._security,
        );
        this._indicator.enable();

        this._lockUnsub = this._storage.subscribeLock(locked => {
            if (this._indicator)
                this._indicator.setLocked(locked);
        });

        import('resource:///org/gnome/shell/misc/config.js')
            .then(Config => {
                log(`[clipboard@imam] extension enabled — GNOME Shell ${Config.PACKAGE_VERSION ?? '?'}`);
            })
            .catch(() => {
                log('[clipboard@imam] extension enabled (shell version unavailable)');
            });
    }

    disable() {
        if (this._lockUnsub) {
            this._lockUnsub();
            this._lockUnsub = null;
        }

        if (this._indicator) {
            this._indicator.disable();
            this._indicator = null;
        }

        if (this._clipboard) {
            this._clipboard.stop();
            this._clipboard = null;
        }

        if (this._storage) {
            this._storage.flush();
            this._storage.destroy();
            this._storage = null;
        }

        this._security = null;
        this._store = null;
    }
}
