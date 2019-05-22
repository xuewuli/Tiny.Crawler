'use strict';

const PriorityQueue = require('./PriorityQueue');

class CrawlerWorker {
  constructor(maxConcurrent, rateLimit, priorityRange, defaultPriority) {
    if (!maxConcurrent || isNaN(maxConcurrent) || isNaN(rateLimit)) {
      throw 'maxConcurrent and rateLimit must be numbers';
    }

    priorityRange = priorityRange || 1;
    priorityRange = parseInt(priorityRange);

    defaultPriority = defaultPriority ? defaultPriority : Math.floor(priorityRange / 2);
    if (isNaN(defaultPriority)) {
      throw 'defaultPriority must be a number';
    }
    defaultPriority = defaultPriority >= priorityRange ? priorityRange - 1 : defaultPriority;
    defaultPriority = parseInt(defaultPriority);

    this.rateLimit = parseInt(rateLimit);
    this.maxConcurrent = this.rateLimit ? 1 : parseInt(maxConcurrent);
    this._pendingTasks = new PriorityQueue(priorityRange);
    this._priorityRange = priorityRange;
    this._defaultPriority = defaultPriority;
    this._scheduledTime = Date.now();
    this._tasksRunning = 0;
  }

  setRateLimit(rateLimit) {
    if (isNaN(rateLimit)) {
      throw 'rateLimit must be a number';
    }
    this.rateLimit = parseInt(rateLimit);
    if (this.rateLimit > 0) {
      this.maxConcurrent = 1;
    }
  }

  submit(priority, task) {
    priority = Number.isInteger(priority) ? priority : this._defaultPriority;
    priority = priority >= this._priorityRange ? this._priorityRange - 1 : priority;

    this._pendingTasks.enqueue(task, priority);

    this._workLoop();
  }

  _workLoop() {
    if (this._tasksRunning >= this.maxConcurrent || this._pendingTasks.count() <= 0) {
      return;
    }

    const now = Date.now();

    const wait = Math.max(this._scheduledTime - now, 0);
    this._scheduledTime = now + wait + this.rateLimit;

    ++this._tasksRunning;
    const done = () => {
      --this._tasksRunning;
      this._workLoop();
    };

    const next = this._pendingTasks.dequeue();
    setTimeout(() => {
      next(done);
    }, wait);
  }
}

module.exports = CrawlerWorker;
