# `uptime@imam` — System Monitor

Compact **uptime**, **CPU**, and **RAM** in the top panel, with a dropdown that shows richer metrics (memory, disk, network).

## Features

- Top-bar summary refreshed on a schedule (see `services/scheduler.js`).
- Dropdown built with `PanelMenu` / `PopupMenu` (`panel/`).
- Metrics collected in `metrics/` and aggregated in `services/metricsService.js`.

## Install

Copy this directory to `~/.local/share/gnome-shell/extensions/uptime@imam/`, enable `uptime@imam`, then reload GNOME Shell. See the [repository README](../README.md) for generic steps.

## Structure

| Path | Role |
|------|------|
| `extension.js` | Extension entry: wires services, scheduler, and indicator. |
| `metadata.json` | UUID, name, supported Shell versions. |
| [`panel/`](panel/README.md) | Top-bar button and dropdown UI. |
| [`services/`](services/README.md) | Metrics service and refresh scheduler. |
| [`metrics/`](metrics/README.md) | Per-metric readers (CPU, memory, disk, etc.). |
| [`utils/`](utils/README.md) | Formatting helpers for labels. |

## Debugging

Use `journalctl -f /usr/bin/gnome-shell` and watch for messages tagged with `uptime@imam` where logging is used.
