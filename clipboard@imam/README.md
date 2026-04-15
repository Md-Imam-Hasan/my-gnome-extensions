# `clipboard@imam` — Clipboard History

Top-bar **clipboard history** for **plain text**: shows recent copies, lets you select an entry to copy it again. History is **in memory only** (not written to disk in v1).

## Features

- **Event-driven** clipboard tracking via `Meta.Selection` `owner-changed` and `St.Clipboard` (not polling).
- Bounded history (`store/historyStore.js`), size and duplicate filtering in the service layer.
- Icon-only panel button; dropdown lists previews and a **Clear history** action.

## Install

Copy this directory to `~/.local/share/gnome-shell/extensions/clipboard@imam/`, enable `clipboard@imam`, then reload GNOME Shell. See the [repository README](../README.md) for generic steps.

## Structure

| Path | Role |
|------|------|
| `extension.js` | Wires store, clipboard service, and indicator. |
| `metadata.json` | UUID, stylesheet reference, Shell versions. |
| `stylesheet.css` | Optional width/spacing for menu rows. |
| [`panel/`](panel/README.md) | Indicator and dropdown UI. |
| [`services/`](services/README.md) | Clipboard read/write and selection listener. |
| [`store/`](store/README.md) | In-memory history list and subscribers. |
| [`utils/`](utils/README.md) | Truncation, normalization, byte limits. |

## Debugging

Startup lines are logged with the prefix `[clipboard@imam]`. Follow the shell journal:

```bash
journalctl -f /usr/bin/gnome-shell | grep --line-buffered 'clipboard@imam'
```

## Privacy

Large payloads and empty strings are ignored; see `utils/format.js` and `services/clipboardService.js` for limits and normalization.
