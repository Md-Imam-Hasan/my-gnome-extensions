/**
 * Disk usage via Gio filesystem attributes (no shell).
 */

import Gio from 'gi://Gio';

/**
 * @typedef {{ path: string, usePercent: number, totalBytes: number, freeBytes: number } | null} DiskUsage
 */

/**
 * @param {string} [mountPath] default '/'
 * @returns {DiskUsage}
 */
export function readDiskUsage(mountPath = '/') {
    try {
        const f = Gio.File.new_for_path(mountPath);
        const attrs = [
            Gio.FILE_ATTRIBUTE_FILESYSTEM_SIZE,
            Gio.FILE_ATTRIBUTE_FILESYSTEM_FREE,
        ].join(',');
        const info = f.query_filesystem_info(attrs, null);
        const total = info.get_attribute_uint64(Gio.FILE_ATTRIBUTE_FILESYSTEM_SIZE);
        const free = info.get_attribute_uint64(Gio.FILE_ATTRIBUTE_FILESYSTEM_FREE);

        const totalN = Number(total);
        const freeN = Number(free);

        if (!Number.isFinite(totalN) || totalN <= 0 || !Number.isFinite(freeN))
            return null;

        const used = totalN - freeN;
        const usePercent = (100 * used) / totalN;

        return {
            path: mountPath,
            usePercent: Math.min(100, Math.max(0, usePercent)),
            totalBytes: totalN,
            freeBytes: Math.min(freeN, totalN),
        };
    } catch {
        return null;
    }
}
