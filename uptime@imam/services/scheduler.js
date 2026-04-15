/**
 * Single GLib timer (1s): drives MetricsService.processTick with staggered intervals.
 */

import GLib from 'gi://GLib';

import { MetricsService } from './metricsService.js';

export class Scheduler {
    /**
     * @param {MetricsService} service
     */
    constructor(service) {
        this._service = service;
        /** @type {number | null} */
        this._sourceId = null;
        this._tickIndex = 0;
    }

    start() {
        this.stop();
        this._sourceId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => {
            this._tickIndex++;
            this._service.processTick(this._tickIndex);
            return GLib.SOURCE_CONTINUE;
        });
    }

    stop() {
        if (this._sourceId !== null) {
            GLib.source_remove(this._sourceId);
            this._sourceId = null;
        }
        this._tickIndex = 0;
    }
}
