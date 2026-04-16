/**
 * Central orchestrator: reads metrics modules, owns delta state, exposes snapshot + listeners.
 * UI must not read /proc; only this service does.
 */

import GLib from "gi://GLib";

import * as Cpu from "../metrics/cpu.js";
import * as Disk from "../metrics/disk.js";
import * as Mem from "../metrics/memory.js";
import * as Net from "../metrics/network.js";
import * as Uptime from "../metrics/uptime.js";

/**
 * @typedef {Object} MetricsSnapshot
 * @property {number | null} uptimeSec
 * @property {number | null} cpuPercent
 * @property {number | null} memUsedBytes
 * @property {number | null} memTotalBytes
 * @property {number | null} memPercent
 * @property {string | null} diskPath
 * @property {number | null} diskUsePercent
 * @property {number | null} diskTotalBytes
 * @property {number | null} diskFreeBytes
 * @property {number | null} netRxBps
 * @property {number | null} netTxBps
 */

export class MetricsService {
  constructor() {
    /** @type {MetricsSnapshot} */
    this._snapshot = {
      uptimeSec: null,
      cpuPercent: null,
      memUsedBytes: null,
      memTotalBytes: null,
      memPercent: null,
      diskPath: "/",
      diskUsePercent: null,
      diskTotalBytes: null,
      diskFreeBytes: null,
      netRxBps: null,
      netTxBps: null,
    };

    /** @type {{ total: number, idle: number } | null} */
    this._cpuPrev = null;

    /** @type {{ rx: number, tx: number, t: number } | null} */
    this._netPrev = null;

    /** @type {Set<(s: MetricsSnapshot) => void>} */
    this._listeners = new Set();
  }

  /**
   * @param {(s: MetricsSnapshot) => void} fn
   * @returns {() => void} unsubscribe
   */
  addListener(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  clearListeners() {
    this._listeners.clear();
  }

  /** @returns {MetricsSnapshot} */
  getSnapshot() {
    return { ...this._snapshot };
  }

  /** Full read (e.g. on startup / manual refresh). */
  refreshAll() {
    this._refreshUptime();
    this._refreshMemory();
    this._refreshDisk();
    this._refreshCpu();
    this._refreshNetwork();
    this._emit();
  }

  /**
   * Per-second scheduler hook: intervals encoded in `tickIndex` (1-based seconds since start).
   * @param {number} tickIndex
   */
  processTick(tickIndex) {
    this._refreshNetwork();
    if (tickIndex % 2 === 0) this._refreshCpu();
    if (tickIndex % 5 === 0) this._refreshMemory();
    if (tickIndex % 10 === 0) {
      this._refreshUptime();
      this._refreshDisk();
    }
    this._emit();
  }

  forceRefresh() {
    this.refreshAll();
  }

  _emit() {
    const snap = this.getSnapshot();
    for (const fn of this._listeners) {
      try {
        fn(snap);
      } catch (e) {
        console.error(
          "[system-monitor@muhammad-imam-hasan.com] metrics listener",
          e,
        );
      }
    }
  }

  _refreshUptime() {
    try {
      const sec = Uptime.readUptimeSeconds();
      this._snapshot.uptimeSec = sec;
    } catch {
      this._snapshot.uptimeSec = null;
    }
  }

  _refreshCpu() {
    try {
      const j = Cpu.readCpuJiffies();
      if (!j) {
        this._snapshot.cpuPercent = null;
        return;
      }
      if (this._cpuPrev) {
        const dt = j.total - this._cpuPrev.total;
        const didle = j.idle - this._cpuPrev.idle;
        if (dt > 0 && didle >= 0) {
          const p = 100 * (1 - didle / dt);
          this._snapshot.cpuPercent = Math.min(100, Math.max(0, p));
        }
      }
      this._cpuPrev = { total: j.total, idle: j.idle };
    } catch {
      this._snapshot.cpuPercent = null;
    }
  }

  _refreshMemory() {
    try {
      const m = Mem.readMemoryKb();
      if (!m) {
        this._snapshot.memUsedBytes = null;
        this._snapshot.memTotalBytes = null;
        this._snapshot.memPercent = null;
        return;
      }
      const totalB = m.totalKb * 1024;
      const availB = m.availableKb * 1024;
      const usedB = Math.max(0, totalB - availB);
      const pct = totalB > 0 ? (100 * usedB) / totalB : null;
      this._snapshot.memTotalBytes = totalB;
      this._snapshot.memUsedBytes = usedB;
      this._snapshot.memPercent =
        pct !== null ? Math.min(100, Math.max(0, pct)) : null;
    } catch {
      this._snapshot.memUsedBytes = null;
      this._snapshot.memTotalBytes = null;
      this._snapshot.memPercent = null;
    }
  }

  _refreshDisk() {
    try {
      const d = Disk.readDiskUsage(this._snapshot.diskPath ?? "/");
      if (!d) {
        this._snapshot.diskUsePercent = null;
        this._snapshot.diskTotalBytes = null;
        this._snapshot.diskFreeBytes = null;
        return;
      }
      this._snapshot.diskPath = d.path;
      this._snapshot.diskUsePercent = d.usePercent;
      this._snapshot.diskTotalBytes = d.totalBytes;
      this._snapshot.diskFreeBytes = d.freeBytes;
    } catch {
      this._snapshot.diskUsePercent = null;
      this._snapshot.diskTotalBytes = null;
      this._snapshot.diskFreeBytes = null;
    }
  }

  _refreshNetwork() {
    try {
      const now = GLib.get_monotonic_time();
      const cur = Net.readNetByteTotals();
      if (!cur) {
        this._snapshot.netRxBps = null;
        this._snapshot.netTxBps = null;
        return;
      }
      if (this._netPrev) {
        const dtSec = (now - this._netPrev.t) / 1_000_000;
        if (dtSec > 0.001) {
          let drx = cur.rxBytes - this._netPrev.rx;
          let dtx = cur.txBytes - this._netPrev.tx;
          if (drx < 0) drx = 0;
          if (dtx < 0) dtx = 0;
          this._snapshot.netRxBps = drx / dtSec;
          this._snapshot.netTxBps = dtx / dtSec;
        }
      }
      this._netPrev = { rx: cur.rxBytes, tx: cur.txBytes, t: now };
    } catch {
      this._snapshot.netRxBps = null;
      this._snapshot.netTxBps = null;
    }
  }
}
