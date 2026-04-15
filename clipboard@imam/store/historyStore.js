/**
 * In-memory clipboard history with bounded size and subscriber notifications.
 */

export const MAX_HISTORY_ITEMS = 20;

export class HistoryStore {
    constructor() {
        /** @type {string[]} Newest-first */
        this._items = [];
        /** @type {Set<(items: string[]) => void>} */
        this._listeners = new Set();
    }

    /**
     * @returns {string[]} Newest-first copy
     */
    getItems() {
        return this._items.slice();
    }

    /**
     * @param {string} text Normalized non-empty text within size limits
     */
    push(text) {
        if (this._items.length > 0 && this._items[0] === text)
            return;

        this._items.unshift(text);
        while (this._items.length > MAX_HISTORY_ITEMS)
            this._items.pop();

        this._notify();
    }

    clear() {
        if (this._items.length === 0)
            return;
        this._items = [];
        this._notify();
    }

    /**
     * @param {(items: string[]) => void} fn
     * @returns {() => void} Unsubscribe
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
                console.error('[clipboard@imam] history listener', e);
            }
        }
    }
}
