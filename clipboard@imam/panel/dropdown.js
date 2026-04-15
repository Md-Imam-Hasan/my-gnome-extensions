/**
 * History list in the panel menu: store-driven rows and re-copy via ClipboardService.
 */

import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import * as Format from '../utils/format.js';

export class ClipboardDropdown {
    /**
     * @param {import('gi://St').Widget} menu
     * @param {import('../store/historyStore.js').HistoryStore} store
     * @param {import('../services/clipboardService.js').ClipboardService} clipboardService
     */
    constructor(menu, store, clipboardService) {
        this._menu = menu;
        this._store = store;
        this._clipboard = clipboardService;

        /** @type {PopupMenu.PopupMenuSection | null} */
        this._historySection = null;
        /** @type {PopupMenu.PopupMenuItem | null} */
        this._clearItem = null;
        /** @type {(() => void) | null} */
        this._unsub = null;

        this._build();
        this._unsub = this._store.subscribe(items => {
            this._renderHistory(items);
        });
        this._renderHistory(this._store.getItems());
    }

    _build() {
        const M = PopupMenu;

        this._historySection = new M.PopupMenuSection();

        this._menu.addMenuItem(new M.PopupSeparatorMenuItem());
        this._menu.addMenuItem(this._historySection);

        this._clearItem = new M.PopupMenuItem('Clear history');
        this._clearItem.connect('activate', () => {
            try {
                this._store.clear();
            } catch (e) {
                console.error('[clipboard@imam] clear history', e);
            }
        });
        this._menu.addMenuItem(this._clearItem);
    }

    /**
     * @param {string[]} items Newest-first
     */
    _renderHistory(items) {
        if (!this._historySection)
            return;

        try {
            this._historySection.removeAll();

            if (items.length === 0) {
                const empty = new PopupMenu.PopupMenuItem('No clipboard history yet', {
                    reactive: false,
                    can_focus: false,
                });
                empty.add_style_class_name('clipboard-history-empty');
                this._historySection.addMenuItem(empty);
            } else {
                const M = PopupMenu;
                for (const text of items) {
                    const preview = Format.truncateForPreview(text);
                    const row = new M.PopupMenuItem(preview);
                    row.add_style_class_name('clipboard-history-row');
                    row.connect('activate', () => {
                        try {
                            this._clipboard.copyToClipboard(text);
                        } catch (e) {
                            console.error('[clipboard@imam] re-copy', e);
                        }
                    });
                    this._historySection.addMenuItem(row);
                }
            }

            if (this._clearItem)
                this._clearItem.setSensitive(items.length > 0);
        } catch (e) {
            console.error('[clipboard@imam] render history', e);
        }
    }

    destroy() {
        if (this._unsub) {
            this._unsub();
            this._unsub = null;
        }

        this._historySection = null;
        this._clearItem = null;
    }
}
