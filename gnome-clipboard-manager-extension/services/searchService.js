/**
 * Full-text and category filtering over history entries (no I/O).
 */

/** @typedef {import('../store/historyStore.js').HistoryEntry} HistoryEntry */
/** @typedef {import('../utils/category.js').EntryCategory} EntryCategory */

/** @typedef {'all'|EntryCategory} CategoryFilter */

/**
 * Sort: pinned first (alphabetically by text), then unpinned by lastUsedAt/createdAt descending.
 * @param {HistoryEntry[]} entries
 * @returns {HistoryEntry[]}
 */
export function sortForDisplay(entries) {
    const pinned = entries.filter(e => e.pinned).sort((a, b) =>
        a.text.localeCompare(b.text, undefined, { sensitivity: 'base' }),
    );
    const unpinned = entries.filter(e => !e.pinned).sort((a, b) => {
        const at = a.lastUsedAt ?? a.createdAt;
        const bt = b.lastUsedAt ?? b.createdAt;
        return bt - at;
    });
    return [...pinned, ...unpinned];
}

/**
 * @param {HistoryEntry[]} entries
 * @param {{ query?: string, category?: CategoryFilter }} opts
 * @returns {HistoryEntry[]}
 */
export function filterEntries(entries, opts) {
    const query = (opts.query ?? '').trim().toLowerCase();
    const category = opts.category ?? 'all';

    let list = sortForDisplay(entries);

    if (category !== 'all')
        list = list.filter(e => e.category === category);

    if (!query)
        return list;

    return list.filter(e => e.text.toLowerCase().includes(query));
}

/**
 * Escape text for Pango markup (no raw <>&).
 * @param {string} s
 * @returns {string}
 */
export function escapeMarkup(s) {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Pango markup for truncated preview with first case-insensitive match in bold.
 * @param {string} singleLinePreview Already length-limited single-line text
 * @param {string} query
 * @returns {string|null} null if no match to highlight
 */
export function buildMatchMarkup(singleLinePreview, query) {
    const q = query.trim();
    if (!q)
        return null;
    const p = singleLinePreview;
    const i = p.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0)
        return null;
    const a = escapeMarkup(p.slice(0, i));
    const mid = escapeMarkup(p.slice(i, i + q.length));
    const b = escapeMarkup(p.slice(i + q.length));
    return `${a}<b>${mid}</b>${b}`;
}
