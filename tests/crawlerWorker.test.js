'use strict';

const CrawlerWorker = require('../lib/CrawlerWorker');
const expect = require('chai').expect;

let maxConcurrent;
let rateLimit;
let priorityRange;
let defaultPriority;

describe('CrawlerWorker test', () => {
  it('simple op', done => {
    const case1 = () => {
      new CrawlerWorker();
    };
    expect(case1).to.throw('Cannot destructure property');

    const case2 = () => {
      new CrawlerWorker({ maxConcurrent, rateLimit, priorityRange, defaultPriority });
    };
    expect(case2).to.throw('maxConcurrent and rateLimit must be numbers');

    const case3 = () => {
      new CrawlerWorker({ maxConcurrent: 1, rateLimit, priorityRange, defaultPriority });
    };
    expect(case3).to.throw('maxConcurrent and rateLimit must be numbers');

    const case4 = () => {
      new CrawlerWorker({ maxConcurrent, rateLimit: 1, priorityRange, defaultPriority });
    };
    expect(case4).to.throw('maxConcurrent and rateLimit must be numbers');

    const case5 = () => {
      new CrawlerWorker({ maxConcurrent: 1, rateLimit: 1, priorityRange: '', defaultPriority });
    };
    expect(case5).to.not.throw();

    const case11 = () => {
      new CrawlerWorker({ maxConcurrent: 0, rateLimit: 0, priorityRange: '', defaultPriority });
    };
    expect(case11).to.throw('maxConcurrent and rateLimit must be numbers');

    const case6 = () => {
      new CrawlerWorker({ maxConcurrent: 1, rateLimit: 1, priorityRange: 'x', defaultPriority });
    };
    expect(case6).to.throw('defaultPriority must be a number');

    const case7 = () => {
      new CrawlerWorker({ maxConcurrent: 1, rateLimit: 1, priorityRange: 'x', defaultPriority: 1 });
    };
    expect(case7).to.not.throw();

    const case8 = () => {
      const worker = new CrawlerWorker({
        maxConcurrent: 1,
        rateLimit: 1,
        priorityRange: 'x',
        defaultPriority: 1
      });
      worker.setRateLimit();
    };
    expect(case8).to.throw('rateLimit must be a number');

    const case9 = () => {
      const worker = new CrawlerWorker({
        maxConcurrent: 1,
        rateLimit: 1,
        priorityRange: 'x',
        defaultPriority: 1
      });
      worker.setRateLimit('x');
    };
    expect(case9).to.throw('rateLimit must be a number');

    const case10 = () => {
      const worker = new CrawlerWorker({
        maxConcurrent: 1,
        rateLimit: 1,
        priorityRange: 'x',
        defaultPriority: 1
      });
      worker.setRateLimit(2);
    };
    expect(case10).to.not.throw();

    const case12 = () => {
      const worker = new CrawlerWorker({
        maxConcurrent: 1,
        rateLimit: 1,
        priorityRange: 'x',
        defaultPriority: 1
      });
      worker.setRateLimit(-2);
    };
    expect(case12).to.not.throw();

    const case13 = () => {
      new CrawlerWorker({ maxConcurrent: 1, rateLimit: 1, priorityRange: 5, defaultPriority: 10 });
    };
    expect(case13).to.not.throw();

    const case14 = () => {
      const worker = new CrawlerWorker({
        maxConcurrent: 1,
        rateLimit: 1,
        priorityRange: 5,
        defaultPriority: 10
      });
      worker.submit('x', () => {});
      worker.submit(10, () => {});
    };
    expect(case14).to.not.throw();

    done();
  });
});
