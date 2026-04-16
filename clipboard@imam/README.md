# `clipboard@imam` — Clipboard History

Top-bar **clipboard history** for **plain text**: search, category filters, optional **JSON persistence**, and optional **AES-256-GCM** encryption (via Web Crypto in GJS). Clipboard capture stays **event-driven** (`Meta.Selection` + `St.Clipboard`).

## Features

- **Search** (debounced) and **category** filter (text / URL / code / other) with simple heuristics.
- **Structured entries** (id, text, category, timestamps, optional **pin**) in [`store/historyStore.js`](store/historyStore.js). **Pinned** items appear first and are **sorted A–Z** by full text; unpinned items follow, newest activity first.
- **Pin/unpin:** each row has a **star** control on the right (`non-starred-symbolic` / `starred-symbolic`). Click the star to pin or unpin; click the rest of the row to **copy**. A short hint is shown above the list.
- **Persistence** to `~/.local/share/clipboard-extension/history.json` (toggle: “Save to disk”).
- **Encryption** of the on-disk file (toggle: “Encrypt file”) using [`services/securityService.js`](services/securityService.js) (PBKDF2 + AES-GCM). If decryption fails, the UI shows a **locked** state and allows **retry** with a passphrase—nothing sensitive is logged.
- **Never** logs clipboard contents.

## Install

Copy this directory to `~/.local/share/gnome-shell/extensions/clipboard@imam/`, enable `clipboard@imam`, then reload GNOME Shell. See the [repository README](../README.md) for generic steps.

### Checking your GNOME Shell version

From a terminal:

```bash
gnome-shell --version
```

Or:

```bash
echo $XDG_SESSION_TYPE
journalctl -b /usr/bin/gnome-shell -o cat | head -1
```

When the extension loads, it logs a line like `extension enabled — GNOME Shell 46.x` (see [Debugging](#debugging)).

## Data on disk

| File | Purpose |
|------|---------|
| `~/.local/share/clipboard-extension/config.json` | `{ "version": 1, "persist": true, "encrypt": false }` |
| `~/.local/share/clipboard-extension/history.json` | History blob (plaintext or encrypted wrapper) |

### Plaintext `history.json` (example)

```json
{
  "version": 1,
  "encrypted": false,
  "entries": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "text": "https://example.com",
      "category": "url",
      "createdAt": 1710000000000,
      "pinned": false
    }
  ]
}
```

### Encrypted `history.json` (example shape)

The file is JSON; ciphertext is base64 with salt/IV from PBKDF2/AES-GCM:

```json
{
  "version": 1,
  "encrypted": true,
  "salt": "BASE64_SALT",
  "iv": "BASE64_IV",
  "data": "BASE64_CIPHERTEXT"
}
```

The decrypted UTF-8 payload parses as:

```json
{ "version": 1, "entries": [ /* same entry objects as plaintext */ ] }
```

## Testing persistence

1. Enable **Save to disk: On**, copy a few snippets, wait a few seconds (debounced save).
2. Confirm the directory exists:

   `~/.local/share/clipboard-extension/`

3. Open `history.json` and verify `entries` (when **Encrypt** is off).
4. Reload GNOME Shell; entries should reload from disk.

## Testing encryption / failure

1. Turn **Encrypt file: On**, set the **Encryption passphrase** field, ensure **Save to disk** is on; trigger a save (copy new text or wait for debounce).
2. Confirm `history.json` shows `"encrypted": true` and no plaintext `entries` array.
3. **Wrong passphrase:** change one character in `data` or `salt` in `history.json`, reload Shell → expect **locked** UI, empty list, **no crash**.
4. Enter the correct passphrase in **Unlock** / **Encryption passphrase** and use **Unlock encrypted history** or fix the file, then reload.

For automated/dev-only testing you can set `DEV_FALLBACK_PASSPHRASE` in [`utils/constants.js`](utils/constants.js) (keep empty in real use).

## Structure

| Path | Role |
|------|------|
| `extension.js` | Wires security, storage, store, clipboard service, indicator. |
| `metadata.json` | UUID, stylesheet, Shell versions. |
| [`panel/`](panel/README.md) | Indicator, dropdown (search, filters, toggles). |
| [`services/`](services/README.md) | Clipboard, storage, search, security. |
| [`store/`](store/README.md) | In-memory history. |
| [`utils/`](utils/README.md) | Constants, category heuristics, formatting. |

## Checking `crypto.subtle` (Web Crypto)

The extension logs once at startup whether AES encryption is possible:

```bash
journalctl -f /usr/bin/gnome-shell | grep --line-buffered 'crypto.subtle'
```

You should see either `crypto.subtle: yes` or `crypto.subtle: no`. If it is **no**, the menu shows **Encrypt file: unavailable** and only plaintext persistence works.

**Outside GNOME Shell**, you can probe the same SpiderMonkey/GJS stack (may differ from the Shell process):

```bash
gjs -e 'print(!!(globalThis.crypto && globalThis.crypto.subtle))'
```

A line printing `true` or `false` indicates whether `subtle` exists in that interpreter (Shell may still differ slightly).

## Debugging

Only operational messages use the `[clipboard@imam]` prefix—never clipboard body text:

```bash
journalctl -f /usr/bin/gnome-shell | grep --line-buffered 'clipboard@imam'
```

## Privacy

Entries over **10KB** UTF-8 are ignored at ingest; see [`utils/constants.js`](utils/constants.js) and [`utils/format.js`](utils/format.js).
