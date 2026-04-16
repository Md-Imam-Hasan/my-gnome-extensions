# `utils/` — Clipboard helpers

| File | Role |
|------|------|
| [`constants.js`](constants.js) | `MAX_HISTORY_ITEMS`, `MAX_CLIPBOARD_BYTES`, debounce timings, storage filenames, `DEV_FALLBACK_PASSPHRASE`, PBKDF2 iteration count. |
| [`category.js`](category.js) | Fast `text` / `url` / `code` / `other` heuristics. |
| [`format.js`](format.js) | Normalization, byte limits, single-line previews (reuses byte cap from `constants.js`). |
