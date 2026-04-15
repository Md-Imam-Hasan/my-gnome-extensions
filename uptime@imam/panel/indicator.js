/**
 * Top-bar PanelMenu.Button: compact summary + dropdown (see dropdown.js).
 */

import Clutter from 'gi://Clutter';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

import { MetricsService } from '../services/metricsService.js';
import { SystemMonitorDropdown } from './dropdown.js';
import * as Format from '../utils/format.js';

const STATUS_ROLE = 'system-monitor-indicator';
const CPU_WARN_PCT = 85;
const MEM_WARN_PCT = 90;

export class SystemMonitorIndicator {
    /**
     * @param {MetricsService} metricsService
     */
    constructor(metricsService) {
        this._service = metricsService;
        this._button = null;
        this._box = null;
        this._label = null;
        /** @type {SystemMonitorDropdown | null} */
        this._dropdown = null;
        /** @type {(() => void) | null} */
        this._unsub = null;
        this._lastCompact = '';
    }

    enable() {
        this._button = new PanelMenu.Button(0.0, 'System Monitor', false);

        this._box = new St.BoxLayout({
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._label = new St.Label({
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'system-status-label',
        });
        this._box.add_child(this._label);
        this._button.add_child(this._box);

        this._dropdown = new SystemMonitorDropdown(this._button.menu, this._service);

        Main.panel.addToStatusArea(STATUS_ROLE, this._button, 0, 'right');

        this._unsub = this._service.addListener(s => this._onSnapshot(s));
        this._service.forceRefresh();
    }

    /**
     * @param {import('../services/metricsService.js').MetricsSnapshot} s
     */
    _onSnapshot(s) {
        try {
            if (this._dropdown)
                this._dropdown.update(s);

            const t = Format.formatCompactIndicator(s);
            if (t !== this._lastCompact) {
                this._lastCompact = t;
                this._label.set_text(t);
            }

            this._label.remove_style_class_name('warning');
            if (s.cpuPercent !== null && s.cpuPercent > CPU_WARN_PCT)
                this._label.add_style_class_name('warning');
            else if (s.memPercent !== null && s.memPercent > MEM_WARN_PCT)
                this._label.add_style_class_name('warning');
        } catch (e) {
            console.error('[uptime@imam] indicator update', e);
        }
    }

    disable() {
        if (this._unsub) {
            this._unsub();
            this._unsub = null;
        }

        if (this._button) {
            this._button.destroy();
            this._button = null;
        }

        this._box = null;
        this._label = null;
        this._dropdown = null;
        this._lastCompact = '';
    }
}
