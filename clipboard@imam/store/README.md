# `store/` — Clipboard history state

## Files

- **`historyStore.js`** — Newest-first **structured entries** (`id`, `text`, `category`, `createdAt`, optional `pinned`, `lastUsedAt`), max length from [`../utils/constants.js`](../utils/constants.js), consecutive duplicate suppression, `replaceEntries` for load, `subscribe` for UI and autosave.

## Notes

- Plaintext never appears in logs from this module.
