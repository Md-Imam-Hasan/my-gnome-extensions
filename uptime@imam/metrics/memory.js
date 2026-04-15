/**
 * Memory from /proc/meminfo — values in kB as in the file.
 */

import Gio from 'gi://Gio';

export const MEMINFO_PROC_PATH = '/proc/meminfo';

const _decoder = new TextDecoder();

/**
 * @typedef {{ totalKb: number, availableKb: number } | null} MemoryInfoKb
 */

/**
 * Prefer MemAvailable; fallback MemFree + Buffers + Cached when MemAvailable missing.
 * @returns {{ totalKb: number, availableKb: number } | null}
 */
export function readMemoryKb() {
    try {
        const file = Gio.File.new_for_path(MEMINFO_PROC_PATH);
        const [ok, contents] = file.load_contents(null);
        if (!ok || !contents?.length)
            return null;

        const text = _decoder.decode(contents);
        let totalKb = null;
        let memAvailable = null;
        let memFree = null;
        let buffers = null;
        let cached = null;

        for (const line of text.split('\n')) {
            if (line.startsWith('MemTotal:'))
                totalKb = _readKbLine(line);
            else if (line.startsWith('MemAvailable:'))
                memAvailable = _readKbLine(line);
            else if (line.startsWith('MemFree:'))
                memFree = _readKbLine(line);
            else if (line.startsWith('Buffers:'))
                buffers = _readKbLine(line);
            else if (line.startsWith('Cached:') && !line.startsWith('SwapCached:'))
                cached = _readKbLine(line);
        }

        if (totalKb === null || totalKb <= 0)
            return null;

        let availableKb = memAvailable;
        if (availableKb === null || !Number.isFinite(availableKb)) {
            const f = memFree ?? 0;
            const b = buffers ?? 0;
            const c = cached ?? 0;
            availableKb = f + b + c;
        }

        if (!Number.isFinite(availableKb) || availableKb < 0)
            availableKb = 0;
        if (availableKb > totalKb)
            availableKb = totalKb;

        return { totalKb, availableKb };
    } catch {
        return null;
    }
}

/**
 * @param {string} line
 * @returns {number | null}
 */
function _readKbLine(line) {
    const m = line.match(/:\s*(\d+)\s*kB/i);
    if (!m)
        return null;
    const v = Number.parseInt(m[1], 10);
    return Number.isFinite(v) ? v : null;
}
