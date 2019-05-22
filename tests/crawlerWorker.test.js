'use strict';

const CrawlerWorker = require('../lib/CrawlerWorker');
const expect = require('chai').expect;

describe('CrawlerWorker test', () => {
  it('simple op', done => {
    const case1 = () => {
      new CrawlerWorker();
    };
    expect(case1).to.throw('maxConcurrent and rateLimit must be numbers');

    const case2 = () => {
      new CrawlerWorker(1);
    };
    expect(case2).to.throw('maxConcurrent and rateLimit must be numbers');
    const case3 = () => {
      new CrawlerWorker(null, 1);
    };
    expect(case3).to.throw('maxConcurrent and rateLimit must be numbers');

    const case4 = () => {
      new CrawlerWorker('null', 1);
    };
    expect(case4).to.throw('maxConcurrent and rateLimit must be numbers');

    const case5 = () => {
      new CrawlerWorker(1, 1, '');
    };
    expect(case5).to.not.throw();

    const case11 = () => {
      new CrawlerWorker(0, 0, '');
    };
    expect(case11).to.throw('maxConcurrent and rateLimit must be numbers');

    const case6 = () => {
      new CrawlerWorker(1, 1, 'x');
    };
    expect(case6).to.throw('defaultPriority must be a number');

    const case7 = () => {
      new CrawlerWorker(1, 1, 'x', 1);
    };
    expect(case7).to.not.throw();

    const case8 = () => {
      const worker = new CrawlerWorker(1, 1);
      worker.setRateLimit();
    };
    expect(case8).to.throw('rateLimit must be a number');

    const case9 = () => {
      const worker = new CrawlerWorker(1, 1);
      worker.setRateLimit('x');
    };
    expect(case9).to.throw('rateLimit must be a number');

    const case10 = () => {
      const worker = new CrawlerWorker(1, 1);
      worker.setRateLimit(2);
    };
    expect(case10).to.not.throw();

    const case12 = () => {
      const worker = new CrawlerWorker(1, 1);
      worker.setRateLimit(-2);
    };
    expect(case12).to.not.throw();

    const case13 = () => {
      new CrawlerWorker(1, 1, 5, 10);
    };
    expect(case13).to.not.throw();

    const case14 = () => {
      const worker = new CrawlerWorker(1, 1, 5, 10);
      worker.submit('x', () => {});
      worker.submit(10, () => {});
    };
    expect(case14).to.not.throw();

    done();
  });
});
