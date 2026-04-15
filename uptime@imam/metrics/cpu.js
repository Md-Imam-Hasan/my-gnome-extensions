/**
 * CPU jiffies from /proc/stat (aggregate cpu line). Delta math lives in MetricsService.
 */

import Gio from 'gi://Gio';

export const STAT_PROC_PATH = '/proc/stat';

const _decoder = new TextDecoder();

/**
 * @typedef {{ total: number, idle: number }} CpuJiffies
 */

/**
 * Parse first `cpu` line: idle includes iowait per common utilization practice.
 * @param {string} content full /proc/stat text
 * @returns {CpuJiffies | null}
 */
export function parseCpuAggregate(content) {
    const line = content.split('\n')[0];
    if (!line || !line.startsWith('cpu '))
        return null;

    const parts = line.trim().split(/\s+/);
    if (parts.length < 5)
        return null;

    let total = 0;
    for (let i = 1; i < parts.length; i++) {
        const v = Number.parseInt(parts[i], 10);
        if (Number.isFinite(v))
            total += v;
    }

    const idle = Number.parseInt(parts[4], 10) || 0;
    const iowait = Number.parseInt(parts[5], 10) || 0;

    if (!Number.isFinite(total) || total <= 0)
        return null;

    return { total, idle: idle + iowait };
}

/**
 * @returns {CpuJiffies | null}
 */
export function readCpuJiffies() {
    try {
        const file = Gio.File.new_for_path(STAT_PROC_PATH);
        const [ok, contents] = file.load_contents(null);
        if (!ok || !contents?.length)
            return null;
        return parseCpuAggregate(_decoder.decode(contents));
    } catch {
        return null;
    }
}
