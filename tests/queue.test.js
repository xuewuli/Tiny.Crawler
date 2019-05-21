'use strict';

const PriorityQueue = require('../lib/PriorityQueue');
const expect = require('chai').expect;

describe('PriorityQueue test', () => {
  it('simple op', done => {
    const queue = new PriorityQueue(3);
    for (let i = 0; i < 100; i++) {
      queue.enqueue(i, i % 4);
    }

    expect(queue.count()).to.equal(100);
    for (let i = 0; i < 25; i++) {
      const o = queue.dequeue();
      expect(o).be.equal(i * 4);
    }

    expect(queue.count()).to.equal(75);

    for (let i = 0; i < 25; i++) {
      const o = queue.dequeue();
      expect(o).be.equal(i * 4 + 1);
    }

    expect(queue.count()).to.equal(50);

    for (let i = 0; i < 25; i++) {
      const o1 = queue.dequeue();
      expect(o1).be.equal(i * 4 + 2);
      const o2 = queue.dequeue();
      expect(o2).be.equal(o1 + 1);
    }

    expect(queue.count()).to.equal(0);

    for (let i = 0; i < 25; i++) {
      const o = queue.dequeue();
      expect(o).be.equal(null);
    }

    done();
  });
});
