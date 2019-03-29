'use strict';

const Crawler = require('../lib/Crawler');
const expect = require('chai').expect;
const sinon = require('sinon');

const nock = require('nock');

const url = 'http://nock.nock';

let cb;
let crawler;

describe('preRequest feature tests', () => {
  before(() => {
    nock.cleanAll();
    nock(url)
      .get('/')
      .reply(200, 'ok')
      .persist();
  });

  beforeEach(() => {
    cb = sinon.spy();
  });

  it('should do preRequest before request when preRequest defined in crawler options', finishTest => {
    crawler = new Crawler({
      transform: false,
      preRequest: (options, done) => {
        setTimeout(() => {
          cb('preRequest');
          done();
        }, 50);
      }
    });
    crawler.queue({
      uri: url,
      callback: (error, response, done) => {
        expect(error).to.be.null;
        expect(cb.getCalls().length).to.equal(1);
        expect(cb.getCalls()[0].args[0]).to.equal('preRequest');
        done();
        finishTest();
      }
    });
  });

  it('should do preRequest before request when preRequest defined in queue options', finishTest => {
    crawler = new Crawler({ transform: false });
    crawler.queue({
      uri: url,
      preRequest: (options, done) => {
        setTimeout(() => {
          cb('preRequest');
          done();
        }, 50);
      },
      callback: (error, response, done) => {
        expect(error).to.be.null;
        expect(cb.getCalls().length).to.equal(1);
        expect(cb.getCalls()[0].args[0]).to.equal('preRequest');
        done();
        finishTest();
      }
    });
  });

  it('preRequest should be executed the same times as request', finishTest => {
    crawler = new Crawler({
      transform: false,
      rateLimit: 50,
      preRequest: (options, done) => {
        cb('preRequest');
        done();
      },
      callback: (error, response, done) => {
        expect(error).to.be.null;
        cb('callback');
        done();
      }
    });
    const seq = [];
    for (let i = 0; i < 5; ++i) {
      crawler.queue(url);
      seq.push('preRequest');
      seq.push('callback');
    }
    crawler.queue({
      uri: url,
      preRequest: (options, done) => {
        done();
      },
      callback: (error, response, done) => {
        expect(
          cb
            .getCalls()
            .map(c => c.args[0])
            .join()
        ).to.equal(seq.join());
        done();
        finishTest();
      }
    });
  });

  it('when preRequest fail, should retry three times by default', finishTest => {
    crawler = new Crawler({
      transform: false,
      rateLimit: 20,
      retryTimeout: 0,
      preRequest: (options, done) => {
        cb('preRequest');
        done(new Error());
      },
      callback: (error, response, done) => {
        expect(error).to.exist;
        expect(cb.getCalls().length).to.equal(4);
        done();
        finishTest();
      }
    });
    crawler.queue(url);
  });

  it("when preRequest fail, should return error when error.op = 'fail'", finishTest => {
    crawler = new Crawler({
      transform: false,
      rateLimit: 20,
      retryTimeout: 0,
      preRequest: (options, done) => {
        cb('preRequest');
        const error = new Error();
        error.op = 'fail';
        done(error);
      },
      callback: (error, response, done) => {
        expect(error).to.exist;
        expect(cb.getCalls().length).to.equal(1);
        done();
        finishTest();
      }
    });
    crawler.queue(url);
  });

  it("when preRequest fail, callback should not be called when error.op = 'abort'", finishTest => {
    crawler = new Crawler({
      transform: false,
      rateLimit: 20,
      retries: 0,
      preRequest: (options, done) => {
        cb('preRequest');
        let error = new Error();
        error.op = 'abort';
        done(error);
        setTimeout(() => {
          expect(cb.getCalls().length).to.equal(1);
          for (let i = 0; i < cb.getCalls().length; ++i) {
            expect(cb.getCalls()[i].args[0]).to.equal('preRequest');
          }
          finishTest();
        }, 100);
      },
      callback: () => {
        expect(null).to.equal(1);
      }
    });
    crawler.queue(url);
  });

  it("when preRequest fail, should put request back in queue when error.op = 'queue'", finishTest => {
    let counter = 0;
    crawler = new Crawler({
      transform: false,
      rateLimit: 20,
      preRequest: (options, done) => {
        expect(options.retries).to.equal(3);
        let error = new Error();
        error.op = 'queue';
        if (++counter > 3) {
          expect(cb.getCalls().length).to.equal(3);
          for (let i = 0; i < cb.getCalls().length; ++i) {
            expect(cb.getCalls()[i].args[0]).to.equal('preRequest');
          }
          error.op = 'abort';
          finishTest();
        }
        cb('preRequest');
        done(error);
      },
      callback: () => {
        expect(null).to.equal(1);
      }
    });
    crawler.queue(url);
  });
});
