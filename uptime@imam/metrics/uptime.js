/**
 * Uptime from /proc/uptime — data only, no formatting.
 */

import Gio from 'gi://Gio';

export const UPTIME_PROC_PATH = '/proc/uptime';

const _decoder = new TextDecoder();

/**
 * @returns {number | null} whole seconds since boot
 */
export function readUptimeSeconds() {
    try {
        const file = Gio.File.new_for_path(UPTIME_PROC_PATH);
        const [ok, contents] = file.load_contents(null);
        if (!ok || !contents || contents.length === 0)
            return null;

        const text = _decoder.decode(contents);
        const first = text.trim().split(/\s+/)[0];
        if (!first)
            return null;

        const seconds = Number.parseFloat(first);
        if (!Number.isFinite(seconds) || seconds < 0)
            return null;

        return Math.floor(seconds);
    } catch {
        return null;
    }
}
