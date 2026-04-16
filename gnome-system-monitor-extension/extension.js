/**
 * System Monitor — wires MetricsService, Scheduler, and panel UI. No /proc access here.
 */

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

import { SystemMonitorIndicator } from './panel/indicator.js';
import { MetricsService } from './services/metricsService.js';
import { Scheduler } from './services/scheduler.js';

export default class UptimeMonitorExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        /** @type {MetricsService | null} */
        this._metrics = null;
        /** @type {Scheduler | null} */
        this._scheduler = null;
        /** @type {SystemMonitorIndicator | null} */
        this._indicator = null;
    }

    enable() {
        this._metrics = new MetricsService();
        this._indicator = new SystemMonitorIndicator(this._metrics);
        this._indicator.enable();

        this._scheduler = new Scheduler(this._metrics);
        this._scheduler.start();
    }

    disable() {
        if (this._scheduler) {
            this._scheduler.stop();
            this._scheduler = null;
        }

        if (this._indicator) {
            this._indicator.disable();
            this._indicator = null;
        }

        if (this._metrics) {
            this._metrics.clearListeners();
            this._metrics = null;
        }
    }
}
