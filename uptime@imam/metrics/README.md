# `metrics/` — System metric readers

Small modules that read **Linux** system information (typically via `/proc` or similar) for **System Monitor** (`uptime@imam`).

## Files

| File | Purpose |
|------|---------|
| `cpu.js` | CPU utilization. |
| `memory.js` | Memory usage. |
| `disk.js` | Disk usage / space. |
| `network.js` | Network throughput or counters. |
| `uptime.js` | System uptime. |

## Notes

- These are imported by [`../services/metricsService.js`](../services/metricsService.js), which merges their outputs into one snapshot for the UI.
