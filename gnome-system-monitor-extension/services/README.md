# `services/` — System Monitor core

Orchestration layer for **System Monitor** (`system-monitor@muhammad-imam-hasan.com`).

## Files

- **`metricsService.js`** — Loads metric modules from `metrics/`, builds a snapshot object, and notifies listeners when data changes. Central place for “what we expose to the UI.”
- **`scheduler.js`** — Drives periodic refresh of metrics on a GLib timer so the panel updates without blocking the main thread unnecessarily.

## Notes

- The indicator and dropdown depend on the snapshot shape from `MetricsService`; keep that API stable when adding metrics.
