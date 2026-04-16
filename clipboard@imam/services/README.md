# `services/` — Clipboard extension backends

## Files

| File | Role |
|------|------|
| [`clipboardService.js`](clipboardService.js) | `Meta.Selection` `owner-changed`, `St.Clipboard` read/write, classification via [`../utils/category.js`](../utils/category.js), pushes structured entries to the store. |
| [`storageService.js`](storageService.js) | `~/.local/share/clipboard-extension/` JSON load/save, debounced writes, optional encryption envelope, corrupted-file handling, `config.json` for persist/encrypt flags. |
| [`searchService.js`](searchService.js) | Case-insensitive substring search + category filter + display sort (pinned/recency). Optional safe Pango markup for match highlighting. |
| [`securityService.js`](securityService.js) | PBKDF2 + AES-256-GCM via `crypto.subtle` when available; passphrase in memory; locked state on decrypt failure. |

## Notes

- Clipboard text must never be logged from these modules.
- UI and storage are separated: dropdown talks to `StorageService` / `SecurityService`, not raw `Gio` for history content.
