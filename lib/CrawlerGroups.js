'use strict';

const CrawlerWorker = require('./CrawlerWorker');

class CrawlerGroups {
  constructor(maxConcurrent, rateLimit, priorityRange, defaultPriority) {
    this.maxConcurrent = maxConcurrent;
    this.rateLimit = rateLimit;
    this.priorityRange = priorityRange;
    this.defaultPriority = defaultPriority;

    this._workers = {};
  }

  group(key) {
    if (key == null) {
      key = '';
    }

    let worker = this._workers[key];
    if (!worker) {
      worker = this._workers[key] = new CrawlerWorker(
        this.maxConcurrent,
        this.rateLimit,
        this.priorityRange,
        this.defaultPriority
      );
    }

    return worker;
  }

  deleteGroup(key) {
    if (key == null) {
      key = '';
    }

    return delete this._workers[key];
  }

  groups() {
    return Object.keys(this._workers);
  }

  startAutoCleanup() {
    this.stopAutoCleanup();
    let base;
    return typeof (base = this.interval = setInterval(
      (() => {
        return () => {
          const time = Date.now();
          const workers = this._workers;
          const groups = Object.keys(workers);
          const results = [];
          for (let i = 0, n = groups.length; i < n; ++i) {
            const key = groups[i];
            if (workers[key]._scheduledTime + 1000 * 60 * 5 < time) {
              results.push(this.deleteGroup(key));
            } else {
              results.push(void 0);
            }
          }
          return results;
        };
      })(this),
      1000 * 30
    )).unref === 'function'
      ? base.unref()
      : void 0;
  }

  stopAutoCleanup() {
    return clearInterval(this.interval);
  }

  get empty() {
    return this._pendingTasks() <= 0;
  }

  get pendingTasks() {
    return this._pendingTasks();
  }

  get status() {
    return this._status();
  }

  _pendingTasks() {
    const groups = this.groups();
    const workers = this._workers;

    let count = 0;
    for (let i = 0, n = groups.length; i < n; ++i) {
      const worker = workers[groups[i]];
      count += worker._pendingTasks.count();
      count += worker._tasksRunning;
    }

    return count;
  }

  _status() {
    const groups = this.groups();
    const workers = this._workers;

    const status = [];
    for (let i = 0, n = groups.length; i < n; ++i) {
      const key = groups[i];
      const worker = workers[key];
      status.push(
        [
          'group: ' + key,
          'running: ' + worker._tasksRunning,
          'pending: ' + worker._pendingTasks.count()
        ].join()
      );
    }

    return status.join(';');
  }
}

module.exports = CrawlerGroups;
