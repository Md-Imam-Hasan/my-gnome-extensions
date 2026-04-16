/**
 * Network byte counters from /proc/net/dev (sum of non-loopback interfaces).
 */

import Gio from 'gi://Gio';

export const NET_DEV_PROC_PATH = '/proc/net/dev';

const _decoder = new TextDecoder();

/**
 * @typedef {{ rxBytes: number, txBytes: number } | null} NetTotals
 */

/**
 * Sum RX/TX bytes for all interfaces except `lo`.
 * @returns {NetTotals}
 */
export function readNetByteTotals() {
    try {
        const file = Gio.File.new_for_path(NET_DEV_PROC_PATH);
        const [ok, contents] = file.load_contents(null);
        if (!ok || !contents?.length)
            return null;

        const lines = _decoder.decode(contents).split('\n');
        let rxSum = 0;
        let txSum = 0;

        for (let i = 2; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line)
                continue;

            const colon = line.indexOf(':');
            if (colon < 0)
                continue;

            const iface = line.slice(0, colon).trim();
            if (iface === 'lo')
                continue;

            const rest = line.slice(colon + 1).trim().split(/\s+/);
            if (rest.length < 9)
                continue;

            const rx = Number.parseInt(rest[0], 10);
            const tx = Number.parseInt(rest[8], 10);
            if (Number.isFinite(rx))
                rxSum += rx;
            if (Number.isFinite(tx))
                txSum += tx;
        }

        return { rxBytes: rxSum, txBytes: txSum };
    } catch {
        return null;
    }
}
