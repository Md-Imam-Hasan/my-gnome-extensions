# `panel/` — System Monitor UI

Top-bar integration for **System Monitor** (`uptime@imam`).

## Files

- **`indicator.js`** — `PanelMenu.Button` with compact status text; subscribes to `MetricsService` for snapshots and updates the label (including warning styling when CPU/RAM exceed thresholds).
- **`dropdown.js`** — Popup menu content: uptime, CPU, memory, disk, and network rows; includes a manual refresh action.

## Notes

- Uses `resource:///org/gnome/shell/ui/main.js` to add the indicator to the status area.
- Formatting for the compact line and dropdown labels comes from [`../utils/format.js`](../utils/format.js).
