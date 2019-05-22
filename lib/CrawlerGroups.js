'use strict';

const CrawlerWorker = require('./CrawlerWorker');

class CrawlerGroups {
  constructor({ maxConnections, rateLimit, priorityRange, priority }) {
    this.maxConcurrent = maxConnections;
    this.rateLimit = rateLimit;
    this.priorityRange = priorityRange;
    this.defaultPriority = priority;

    this._workers = {};
  }

  group(key) {
    let worker = this._workers[key];
    if (!worker) {
      worker = this._workers[key] = new CrawlerWorker(this);
    }

    return worker;
  }

  deleteGroup(key) {
    return delete this._workers[key];
  }

  groups() {
    return Object.keys(this._workers);
  }

  get empty() {
    return this._pendingTasks() <= 0;
  }

  get pendingTasks() {
    return this._pendingTasks();
  }

  status() {
    const groups = this.groups();
    const workers = this._workers;

    const status = [];
    for (let i = 0, n = groups.length; i < n; ++i) {
      const key = groups[i];
      const worker = workers[key];
      status.push(
        `group: ${key},running: ${worker._tasksRunning},pending: ${worker._pendingTasks.count()}`
      );
    }

    return status.join(';');
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
}

module.exports = CrawlerGroups;
