# `services/` — Clipboard History integration

Clipboard pipeline for **Clipboard History** (`clipboard@imam`).

## Files

- **`clipboardService.js`** — Subscribes to **`Meta.Selection` `owner-changed`** (clipboard selection), reads text with **`St.Clipboard`**, applies filters (size, empty, normalization), pushes to [`../store/historyStore.js`](../store/historyStore.js), and exposes **`copyToClipboard()`** for the UI. Handles “ignore next read” after programmatic **`set_text`** so re-copy does not duplicate history entries.

## Notes

- This is the **only** module that should talk to the Shell clipboard APIs for this extension.
- `Gdk.Clipboard` is not used here; the compositor clipboard is exposed through Meta + St in GNOME Shell.
