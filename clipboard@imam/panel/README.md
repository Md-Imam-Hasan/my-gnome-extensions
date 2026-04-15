# `panel/` — Clipboard History UI

Top-bar and menu for **Clipboard History** (`clipboard@imam`).

## Files

- **`indicator.js`** — `PanelMenu.Button` with a paste icon only; registers in the status area and owns the dropdown.
- **`dropdown.js`** — Menu sections: scrollable history (`PopupMenuSection`), empty-state row, and **Clear history**. Rows call `ClipboardService.copyToClipboard()` only; no direct Gdk/St clipboard use outside the service.

## Notes

- Subscribes to `HistoryStore` to rebuild history rows when the store changes.
- Preview text uses [`../utils/format.js`](../utils/format.js).
