# `panel/` — Clipboard History UI

## Files

- **`indicator.js`** — `PanelMenu.Button` with `edit-paste-symbolic`, switches to `channel-secure-symbolic` when storage reports a **locked** (decrypt failure) state.
- **`dropdown.js`** — Search entry (debounced), category submenu, hint line; history rows are **PopupImageMenuItem** with a **star button** to pin/unpin and row activate to copy; optional search **bold** match; **Unlock** block; **Save to disk** / **Encrypt** toggles; **encryption passphrase** field; **Clear history**.

## Notes

- Filtering uses [`../services/searchService.js`](../services/searchService.js); persistence toggles call only [`../services/storageService.js`](../services/storageService.js).
