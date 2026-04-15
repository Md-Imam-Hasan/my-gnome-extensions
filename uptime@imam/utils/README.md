# `utils/` — System Monitor formatting

Shared string/format helpers for **System Monitor** (`uptime@imam`).

## Files

- **`format.js`** — Formats compact indicator text and dropdown labels (uptime, percentages, sizes, network rates, etc.).

## Notes

- Used by [`../panel/indicator.js`](../panel/indicator.js) and [`../panel/dropdown.js`](../panel/dropdown.js) to keep presentation logic out of metric collection code.
