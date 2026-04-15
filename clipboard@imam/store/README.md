# `store/` — Clipboard History state

In-memory state for **Clipboard History** (`clipboard@imam`).

## Files

- **`historyStore.js`** — Holds a newest-first list of strings, enforces a maximum length, skips consecutive duplicates, and notifies subscribers on change. Exposes **`clear()`** for the UI.

## Notes

- No persistence on disk in v1; restarting GNOME Shell clears history.
