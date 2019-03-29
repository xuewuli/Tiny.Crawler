'use strict';

class PriorityQueue {
  constructor(size) {
    size = Math.max(+size | 0, 1);
    const slots = [];
    for (let i = 0; i < size; ++i) {
      slots.push([]);
    }
    this.slots = slots;
    this.counter = 0;
  }

  count() {
    return this.counter;
  }

  enqueue(obj, priority) {
    priority = (priority && +priority | 0) || 0;

    const size = this.slots.length;
    if (priority < 0 || priority >= size) {
      priority = size - 1;
    }

    this.slots[priority].push(obj);

    ++this.counter;
  }

  dequeue() {
    const slots = this.slots;
    for (let i = 0, n = slots.length; i < n; ++i) {
      const slot = slots[i];
      if (slot.length > 0) {
        --this.counter;
        return slot.shift();
      }
    }

    return null;
  }
}

module.exports = PriorityQueue;
