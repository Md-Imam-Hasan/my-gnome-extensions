/**
 * Top-bar PanelMenu.Button: clipboard icon and dropdown (see dropdown.js).
 */

import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

import { ClipboardService } from '../services/clipboardService.js';
import { HistoryStore } from '../store/historyStore.js';
import { ClipboardDropdown } from './dropdown.js';

const STATUS_ROLE = 'clipboard-history-indicator';

export class ClipboardIndicator {
    /**
     * @param {HistoryStore} store
     * @param {ClipboardService} clipboardService
     */
    constructor(store, clipboardService) {
        this._store = store;
        this._clipboard = clipboardService;
        /** @type {PanelMenu.Button | null} */
        this._button = null;
        /** @type {ClipboardDropdown | null} */
        this._dropdown = null;
    }

    enable() {
        this._button = new PanelMenu.Button(0.0, 'Clipboard history', false);

        const icon = new St.Icon({
            icon_name: 'edit-paste-symbolic',
            style_class: 'system-status-icon',
        });
        this._button.add_child(icon);

        this._dropdown = new ClipboardDropdown(this._button.menu, this._store, this._clipboard);

        Main.panel.addToStatusArea(STATUS_ROLE, this._button, 0, 'right');
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
    }
}
