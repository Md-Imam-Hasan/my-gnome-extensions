/**
 * Clipboard menu: search, category filter, persistence toggles, history list.
 */

import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import St from 'gi://St';

import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import * as C from '../utils/constants.js';
import * as Format from '../utils/format.js';
import { ClipboardService } from '../services/clipboardService.js';
import { SecurityService } from '../services/securityService.js';
import { StorageService } from '../services/storageService.js';
import * as Search from '../services/searchService.js';

/** @typedef {import('../store/historyStore.js').HistoryEntry} HistoryEntry */
/** @typedef {import('../services/searchService.js').CategoryFilter} CategoryFilter */

const CATEGORY_LABEL = {
    all: 'All',
    text: 'Text',
    url: 'URL',
    code: 'Code',
    other: 'Other',
};

const CATEGORY_ICON = {
    text: 'text-x-generic-symbolic',
    url: 'web-browser-symbolic',
    code: 'text-x-script-symbolic',
    other: 'dialog-question-symbolic',
};

export class ClipboardDropdown {
    /**
     * @param {import('gi://St').Widget} menu
     * @param {import('../store/historyStore.js').HistoryStore} store
     * @param {ClipboardService} clipboardService
     * @param {StorageService} storageService
     * @param {SecurityService} securityService
     */
    constructor(menu, store, clipboardService, storageService, securityService) {
        this._menu = menu;
        this._store = store;
        this._clipboard = clipboardService;
        this._storage = storageService;
        this._security = securityService;

        /** @type {PopupMenu.PopupMenuSection | null} */
        this._lockSection = null;
        /** @type {St.Entry | null} */
        this._passEntry = null;

        /** @type {St.Entry | null} */
        this._searchEntry = null;
        this._searchDebounceId = 0;
        /** @type {string} */
        this._query = '';
        /** @type {CategoryFilter} */
        this._category = 'all';

        /** @type {PopupMenu.PopupSubMenuMenuItem | null} */
        this._catSub = null;

        /** @type {PopupMenu.PopupMenuSection | null} */
        this._historySection = null;
        /** @type {PopupMenu.PopupMenuItem | null} */
        this._clearItem = null;
        /** @type {PopupMenu.PopupMenuItem | null} */
        this._persistItem = null;
        /** @type {PopupMenu.PopupMenuItem | null} */
        this._encryptItem = null;
        /** @type {St.Entry | null} */
        this._encPassEntry = null;
        /** @type {PopupMenu.PopupBaseMenuItem | PopupMenu.PopupMenuItem | null} */
        this._encPassRow = null;

        /** @type {(() => void) | null} */
        this._unsub = null;

        /** @type {string | null} If next activate is for this entry id, skip copy (pin control) */
        this._suppressCopyForEntryId = null;

        this._build();
        this._unsub = this._store.subscribe(() => {
            this._syncToggleLabels();
            this._renderFiltered();
        });
        this._renderFiltered();
    }

    _build() {
        const M = PopupMenu;

        this._lockSection = new M.PopupMenuSection();
        this._menu.addMenuItem(this._lockSection);

        this._passEntry = new St.Entry({
            style_class: 'clipboard-pass-entry',
            hint_text: 'Passphrase to unlock',
            can_focus: true,
        });
        const passRow = this._makeEntryRow(this._passEntry);
        this._lockSection.addMenuItem(passRow);

        const unlock = new M.PopupMenuItem('Unlock encrypted history');
        unlock.connect('activate', () => {
            const t = this._passEntry?.get_text?.() ?? '';
            this._security.setPassphrase(t);
            this._storage.retryLoadEncrypted();
        });
        this._lockSection.addMenuItem(unlock);

        this._menu.addMenuItem(new M.PopupSeparatorMenuItem());

        this._searchEntry = new St.Entry({
            style_class: 'clipboard-search-entry',
            hint_text: 'Search clipboard…',
            can_focus: true,
            track_hover: false,
        });
        this._searchEntry.clutter_text.set_single_line_mode(true);
        const searchRow = this._makeEntryRow(this._searchEntry);
        this._searchEntry.connect('notify::text', () => {
            if (this._searchDebounceId)
                GLib.source_remove(this._searchDebounceId);
            this._searchDebounceId = GLib.timeout_add(
                GLib.PRIORITY_DEFAULT,
                C.SEARCH_DEBOUNCE_MS,
                () => {
                    this._searchDebounceId = 0;
                    this._query = this._searchEntry?.get_text?.() ?? '';
                    this._renderFiltered();
                    return GLib.SOURCE_REMOVE;
                },
            );
        });
        this._menu.addMenuItem(searchRow);

        this._catSub = new M.PopupSubMenuMenuItem('Category');
        for (const key of ['all', 'text', 'url', 'code', 'other']) {
            const it = new M.PopupMenuItem(CATEGORY_LABEL[/** @type {keyof typeof CATEGORY_LABEL} */ (key)]);
            it.connect('activate', () => {
                this._category = /** @type {CategoryFilter} */ (key);
                this._catSub?.label.set_text(`Category: ${CATEGORY_LABEL[/** @type {keyof typeof CATEGORY_LABEL} */ (key)]}`);
                this._renderFiltered();
            });
            this._catSub.menu.addMenuItem(it);
        }
        this._menu.addMenuItem(this._catSub);

        this._menu.addMenuItem(new M.PopupSeparatorMenuItem());

        const hint = new M.PopupMenuItem(
            'Star = pin · Click row = copy',
            { reactive: false, can_focus: false },
        );
        hint.add_style_class_name('clipboard-history-hint');
        this._menu.addMenuItem(hint);

        this._historySection = new M.PopupMenuSection();
        this._menu.addMenuItem(this._historySection);

        const cfg = this._storage.getConfig();
        this._persistItem = new M.PopupMenuItem('');
        this._persistItem.connect('activate', () => {
            const c = this._storage.getConfig();
            this._storage.setConfig(!c.persist, c.encrypt);
            this._syncToggleLabels();
        });
        this._menu.addMenuItem(this._persistItem);

        this._encryptItem = new M.PopupMenuItem('');
        this._encryptItem.connect('activate', () => {
            if (!this._security.encryptionAvailable)
                return;
            const c = this._storage.getConfig();
            this._storage.setConfig(c.persist, !c.encrypt);
            this._syncToggleLabels();
        });
        this._menu.addMenuItem(this._encryptItem);

        this._encPassEntry = new St.Entry({
            style_class: 'clipboard-pass-entry',
            hint_text: 'Encryption passphrase (when encrypt is on)',
            can_focus: true,
        });
        this._encPassRow = this._makeEntryRow(this._encPassEntry);
        this._encPassEntry.connect('notify::text', () => {
            const t = this._encPassEntry?.get_text?.() ?? '';
            if (t.length > 0)
                this._security.setPassphrase(t);
            this._storage.scheduleSave();
        });
        this._menu.addMenuItem(this._encPassRow);

        this._syncToggleLabels();

        this._clearItem = new M.PopupMenuItem('Clear history');
        this._clearItem.connect('activate', () => {
            try {
                this._store.clear();
                this._storage.flush();
            } catch (e) {
                console.error('[clipboard@imam] clear history', e);
            }
        });
        this._menu.addMenuItem(this._clearItem);

        this._syncLockVisibility();
    }

    /**
     * @param {St.Entry} entry
     */
    _makeEntryRow(entry) {
        const M = PopupMenu;
        const Base = M.PopupBaseMenuItem;
        if (Base) {
            const row = new Base({ reactive: false, can_focus: true });
            entry.set_x_expand(true);
            row.actor.add_child(entry);
            return row;
        }
        const row = new M.PopupMenuItem('');
        row.label.hide();
        entry.set_x_expand(true);
        row.actor.add_child(entry);
        return row;
    }

    _syncToggleLabels() {
        const c = this._storage.getConfig();
        if (this._persistItem) {
            this._persistItem.label.set_text(
                c.persist ? 'Save to disk: On' : 'Save to disk: Off',
            );
        }
        if (this._encryptItem) {
            const on = c.encrypt && this._security.encryptionAvailable;
            this._encryptItem.label.set_text(
                this._security.encryptionAvailable
                    ? `Encrypt file: ${c.encrypt ? 'On' : 'Off'}`
                    : 'Encrypt file: unavailable',
            );
            this._encryptItem.setSensitive(this._security.encryptionAvailable);
        }
        if (this._encPassRow) {
            this._encPassRow.actor.visible =
                !!c.encrypt && this._security.encryptionAvailable && !this._storage.isLocked();
        }
    }

    /**
     * PopupBaseMenuItem uses Clutter.ClickAction on the whole row; pin clicks must not run copy.
     * @param {Clutter.Event | null | undefined} event
     * @param {St.Button} pinBtn
     * @returns {boolean}
     */
    _eventTargetsPinButton(event, pinBtn) {
        if (!event)
            return false;
        let src = event.get_source?.();
        while (src) {
            if (src === pinBtn)
                return true;
            src = src.get_parent?.() ?? null;
        }
        return false;
    }

    _syncLockVisibility() {
        const locked = this._storage.isLocked();
        if (this._lockSection) {
            this._lockSection.actor.visible = locked;
        }
        if (this._searchEntry?.get_parent())
            this._searchEntry.reactive = !locked;
    }

    _renderFiltered() {
        this._syncLockVisibility();

        if (!this._historySection)
            return;

        try {
            this._historySection.removeAll();

            if (this._storage.isLocked()) {
                const msg = new PopupMenu.PopupMenuItem('History locked — enter passphrase and Unlock', {
                    reactive: false,
                    can_focus: false,
                });
                this._historySection.addMenuItem(msg);
                if (this._clearItem)
                    this._clearItem.setSensitive(false);
                return;
            }

            const all = this._store.getItems();
            const filtered = Search.filterEntries(all, {
                query: this._query,
                category: this._category,
            });

            if (filtered.length === 0) {
                const empty = new PopupMenu.PopupMenuItem(
                    this._query.trim() ? 'No matches' : 'No clipboard history yet',
                    { reactive: false, can_focus: false },
                );
                empty.add_style_class_name('clipboard-history-empty');
                this._historySection.addMenuItem(empty);
            } else {
                const M = PopupMenu;
                for (const entry of filtered) {
                    const previewRaw = Format.truncateForPreview(entry.text);
                    const markup = Search.buildMatchMarkup(previewRaw, this._query);
                    const iconName = CATEGORY_ICON[entry.category] ?? CATEGORY_ICON.other;
                    const row = new M.PopupImageMenuItem('', iconName);
                    row.label.clutter_text.set_use_markup(true);
                    if (markup)
                        row.label.clutter_text.set_markup(markup);
                    else
                        row.label.set_text(previewRaw);

                    const pinBtn = new St.Button({
                        style_class: 'clipboard-pin-button',
                        can_focus: true,
                        track_hover: true,
                        child: new St.Icon({
                            icon_name: entry.pinned
                                ? 'starred-symbolic'
                                : 'non-starred-symbolic',
                            icon_size: 16,
                        }),
                        y_align: Clutter.ActorAlign.CENTER,
                    });
                    pinBtn.connect('button-press-event', () => {
                        this._suppressCopyForEntryId = entry.id;
                        const eid = entry.id;
                        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 200, () => {
                            if (this._suppressCopyForEntryId === eid)
                                this._suppressCopyForEntryId = null;
                            return GLib.SOURCE_REMOVE;
                        });
                        return Clutter.EVENT_PROPAGATE;
                    });
                    pinBtn.connect('clicked', () => {
                        try {
                            this._store.setPinned(entry.id, !entry.pinned);
                        } catch (e) {
                            console.error('[clipboard@imam] pin toggle', e);
                        }
                    });
                    row.add_child(pinBtn);

                    row.connect('activate', (menuItem, event) => {
                        if (this._suppressCopyForEntryId === entry.id) {
                            this._suppressCopyForEntryId = null;
                            return;
                        }
                        if (this._eventTargetsPinButton(event, pinBtn))
                            return;
                        try {
                            this._clipboard.copyToClipboard(entry.text, {
                                store: this._store,
                                entryId: entry.id,
                            });
                        } catch (e) {
                            console.error('[clipboard@imam] re-copy', e);
                        }
                    });
                    row.add_style_class_name('clipboard-history-row');
                    this._historySection.addMenuItem(row);
                }
            }

            if (this._clearItem)
                this._clearItem.setSensitive(all.length > 0);
        } catch (e) {
            console.error('[clipboard@imam] render history', e);
        }
    }

    destroy() {
        if (this._searchDebounceId) {
            GLib.source_remove(this._searchDebounceId);
            this._searchDebounceId = 0;
        }

        if (this._unsub) {
            this._unsub();
            this._unsub = null;
        }

        this._lockSection = null;
        this._passEntry = null;
        this._searchEntry = null;
        this._historySection = null;
        this._clearItem = null;
        this._persistItem = null;
        this._encryptItem = null;
        this._catSub = null;
        this._encPassEntry = null;
        this._encPassRow = null;
    }
}
