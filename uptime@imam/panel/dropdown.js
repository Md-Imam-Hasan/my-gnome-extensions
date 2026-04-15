/**
 * Dropdown panel: menu items created once; text updated from MetricsSnapshot.
 */

import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import * as Format from '../utils/format.js';

export class SystemMonitorDropdown {
    /**
     * @param {import('gi://St').Widget} menu
     * @param {{ getSnapshot: () => import('../services/metricsService.js').MetricsSnapshot, forceRefresh: () => void }} metricsService
     */
    constructor(menu, metricsService) {
        this._menu = menu;
        this._metricsService = metricsService;

        /** @type {PopupMenu.PopupImageMenuItem[]} */
        this._rows = [];

        this._build();
    }

    _build() {
        const M = PopupMenu;

        this._uptimeItem = new M.PopupImageMenuItem('', 'preferences-system-time-symbolic', {
            reactive: false,
            can_focus: false,
        });
        this._cpuItem = new M.PopupImageMenuItem('', 'utilities-system-monitor-symbolic', {
            reactive: false,
            can_focus: false,
        });
        this._memItem = new M.PopupImageMenuItem('', 'drive-harddisk-solid-state-symbolic', {
            reactive: false,
            can_focus: false,
        });
        this._diskItem = new M.PopupImageMenuItem('', 'drive-harddisk-symbolic', {
            reactive: false,
            can_focus: false,
        });
        this._netDownItem = new M.PopupImageMenuItem('', 'network-receive-symbolic', {
            reactive: false,
            can_focus: false,
        });
        this._netUpItem = new M.PopupImageMenuItem('', 'network-transmit-symbolic', {
            reactive: false,
            can_focus: false,
        });

        this._menu.addMenuItem(new M.PopupSeparatorMenuItem());
        this._menu.addMenuItem(this._uptimeItem);
        this._menu.addMenuItem(this._cpuItem);
        this._menu.addMenuItem(this._memItem);
        this._menu.addMenuItem(this._diskItem);
        this._menu.addMenuItem(this._netDownItem);
        this._menu.addMenuItem(this._netUpItem);

        this._menu.addMenuItem(new M.PopupSeparatorMenuItem());

        this._refreshItem = new M.PopupMenuItem('Refresh now');
        this._refreshItem.connect('activate', () => {
            try {
                this._metricsService.forceRefresh();
            } catch (e) {
                console.error('[Uptime@imam] refresh', e);
            }
        });
        this._menu.addMenuItem(this._refreshItem);
    }

    /**
     * @param {import('../services/metricsService.js').MetricsSnapshot} s
     */
    update(s) {
        const up = Format.formatUptimeLabel(s.uptimeSec);
        this._setRow(this._uptimeItem, 'Uptime', up === null ? 'N/A' : up);

        const cpu = s.cpuPercent;
        this._setRow(
            this._cpuItem,
            'CPU',
            cpu === null || cpu === undefined ? 'N/A' : Format.formatPercent(cpu, 1)
        );

        const memPct = s.memPercent;
        const memDetail =
            s.memUsedBytes !== null && s.memTotalBytes !== null
                ? `${Format.formatBytes(s.memUsedBytes)} / ${Format.formatBytes(s.memTotalBytes)}`
                : 'N/A';
        const memLine =
            memPct === null || memPct === undefined
                ? memDetail
                : `${Format.formatPercent(memPct, 1)} (${memDetail})`;
        this._setRow(this._memItem, 'Memory', memLine);

        const diskPct = s.diskUsePercent;
        const diskLine =
            diskPct === null || diskPct === undefined
                ? 'N/A'
                : `${Format.formatPercent(diskPct, 1)} (${s.diskPath ?? '/'})`;
        this._setRow(this._diskItem, 'Disk', diskLine);

        this._setRow(
            this._netDownItem,
            'Download',
            s.netRxBps === null || s.netRxBps === undefined ? 'N/A' : Format.formatSpeed(s.netRxBps)
        );
        this._setRow(
            this._netUpItem,
            'Upload',
            s.netTxBps === null || s.netTxBps === undefined ? 'N/A' : Format.formatSpeed(s.netTxBps)
        );
    }

    /**
     * @param {PopupMenu.PopupImageMenuItem} item
     * @param {string} title
     * @param {string} value
     */
    _setRow(item, title, value) {
        const t = `${title}: ${value}`;
        const cur = item.label.get_text ? item.label.get_text() : item.label.text;
        if (cur === t)
            return;
        item.label.set_text(t);
    }
}
