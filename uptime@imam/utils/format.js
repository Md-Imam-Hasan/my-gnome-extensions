/**
 * Centralized display formatting for the extension (UI imports this; metrics do not).
 */

/**
 * @param {number | null | undefined} totalSeconds
 * @returns {{ days: number, hours: number, minutes: number }}
 */
export function formatUptimeParts(totalSeconds) {
    if (totalSeconds === null || totalSeconds === undefined)
        return { days: 0, hours: 0, minutes: 0 };
    const s = Math.max(0, Math.floor(totalSeconds));
    const days = Math.floor(s / 86400);
    const hours = Math.floor((s % 86400) / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    return { days, hours, minutes };
}

/**
 * @param {number | null | undefined} totalSeconds
 * @returns {string | null}
 */
export function formatUptimeLabel(totalSeconds) {
    if (totalSeconds === null || totalSeconds === undefined)
        return null;
    const { days, hours, minutes } = formatUptimeParts(totalSeconds);
    return `${days}d ${hours}h ${minutes}m`;
}

/**
 * Compact uptime for top bar: "2d 3h" (omit minutes if days > 0 to save space).
 * @param {number | null} sec
 * @returns {string}
 */
export function formatUptimeCompact(sec) {
    if (sec === null || sec === undefined)
        return 'N/A';
    const { days, hours, minutes } = formatUptimeParts(sec);
    if (days > 0)
        return `${days}d ${hours}h`;
    if (hours > 0)
        return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

/**
 * @param {number} n
 * @param {number} [maxFrac]
 */
export function formatPercent(n, maxFrac = 0) {
    if (!Number.isFinite(n))
        return 'N/A';
    const f = maxFrac > 0 ? n.toFixed(maxFrac) : Math.round(n).toString();
    return `${f}%`;
}

/**
 * Human-readable byte size (base 1024).
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0)
        return 'N/A';
    const u = ['B', 'KB', 'MB', 'GB', 'TB'];
    let v = bytes;
    let i = 0;
    while (v >= 1024 && i < u.length - 1) {
        v /= 1024;
        i++;
    }
    const digits = i === 0 ? 0 : v < 10 ? 1 : v < 100 ? 1 : 0;
    return `${v.toFixed(digits)} ${u[i]}`;
}

/**
 * Bytes per second → KB/s, MB/s, etc.
 * @param {number} bps
 * @returns {string}
 */
export function formatSpeed(bps) {
    if (!Number.isFinite(bps) || bps < 0)
        return 'N/A';
    if (bps < 1024)
        return `${bps.toFixed(0)} B/s`;
    const kb = bps / 1024;
    if (kb < 1024)
        return `${kb < 10 ? kb.toFixed(1) : kb.toFixed(0)} KB/s`;
    const mb = kb / 1024;
    if (mb < 1024)
        return `${mb < 10 ? mb.toFixed(1) : mb.toFixed(0)} MB/s`;
    const gb = mb / 1024;
    return `${gb.toFixed(1)} GB/s`;
}

/**
 * Top-bar summary: "2d 3h | CPU 12% | RAM 48%"
 * @param {{ uptimeSec: * , cpuPercent: * , memPercent: * }} s
 * @returns {string}
 */
export function formatCompactIndicator(s) {
    const u = formatUptimeCompact(s.uptimeSec);
    const cpu = s.cpuPercent === null || s.cpuPercent === undefined
        ? 'N/A'
        : `${Math.round(s.cpuPercent)}%`;
    const ram = s.memPercent === null || s.memPercent === undefined
        ? 'N/A'
        : `${Math.round(s.memPercent)}%`;
    return `${u} | CPU ${cpu} | RAM ${ram}`;
}
