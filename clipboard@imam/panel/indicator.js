/**
 * Top-bar PanelMenu.Button: clipboard icon and dropdown (see dropdown.js).
 */

import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

import { ClipboardService } from '../services/clipboardService.js';
import { SecurityService } from '../services/securityService.js';
import { StorageService } from '../services/storageService.js';
import { HistoryStore } from '../store/historyStore.js';
import { ClipboardDropdown } from './dropdown.js';

const STATUS_ROLE = 'clipboard-history-indicator';

export class ClipboardIndicator {
    /**
     * @param {HistoryStore} store
     * @param {ClipboardService} clipboardService
     * @param {StorageService} storageService
     * @param {SecurityService} securityService
     */
    constructor(store, clipboardService, storageService, securityService) {
        this._store = store;
        this._clipboard = clipboardService;
        this._storage = storageService;
        this._security = securityService;
        /** @type {PanelMenu.Button | null} */
        this._button = null;
        /** @type {St.Icon | null} */
        this._icon = null;
        /** @type {ClipboardDropdown | null} */
        this._dropdown = null;
        this._locked = false;
    }

    enable() {
        this._button = new PanelMenu.Button(0.0, 'Clipboard history', false);

        this._icon = new St.Icon({
            icon_name: 'edit-paste-symbolic',
            style_class: 'system-status-icon',
        });
        this._button.add_child(this._icon);

        this._dropdown = new ClipboardDropdown(
            this._button.menu,
            this._store,
            this._clipboard,
            this._storage,
            this._security,
        );

        this.setLocked(this._storage.isLocked());

        Main.panel.addToStatusArea(STATUS_ROLE, this._button, 0, 'right');
    }

    /**
     * @param {boolean} locked
     */
    setLocked(locked) {
        this._locked = locked;
        if (!this._icon)
            return;
        this._icon.icon_name = locked
            ? 'channel-secure-symbolic'
            : 'edit-paste-symbolic';
    }

    disable() {
        if (this._dropdown) {
            this._dropdown.destroy();
            this._dropdown = null;
        }

        if (this._button) {
            this._button.destroy();
            this._button = null;
        }

        this._icon = null;
    }
}
