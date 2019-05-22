'use strict';

const Crawler = require('../lib/Crawler');
const expect = require('chai').expect;
const sinon = require('sinon');

const nock = require('nock');

const url = 'http://nock.nock';

let cb;
let crawler;

describe('Direct feature tests', () => {
  before(() => {
    nock.cleanAll();
    nock(url)
      .get('/')
      .reply(200, 'ok')
      .persist();
  });

  beforeEach(() => {
    cb = sinon.spy();
    crawler = new Crawler({
      transform: false,
      rateLimit: 100,
      preRequest: (options, done) => {
        cb('preRequest');
        done();
      },
      callback: (err, res, done) => {
        if (err) {
          cb('error');
        } else {
          cb('callback');
        }
        done();
      }
    });
    crawler.on('request', () => {
      cb('Event:request');
    });
  });

  it('should not trigger preRequest or callback of crawler instance', finishTest => {
    crawler.direct({
      uri: url,
      callback: (error, res) => {
        expect(error).to.be.null;
        expect(res.statusCode).to.equal(200);
        expect(res.body).to.equal('ok');
        expect(cb.called).to.be.false;
        finishTest();
      }
    });
  });

  it('should be sent directly regardless of current queue of crawler', finishTest => {
    crawler.queue({
      uri: url,
      callback: (error, res, done) => {
        expect(error).to.be.null;
        crawler.direct({
          uri: url,
          callback: () => {
            expect(cb.getCalls().length).to.equal(2);
            cb('direct');
          }
        });
        done();
      }
    });
    crawler.queue(url);
    crawler.queue(url);
    crawler.queue({
      uri: url,
      callback: (error, res, done) => {
        expect(error).to.be.null;
        let seq = [
          'preRequest',
          'Event:request',
          'direct',
          'preRequest',
          'Event:request',
          'callback',
          'preRequest',
          'Event:request',
          'callback',
          'preRequest',
          'Event:request'
        ];
        expect(
          cb
            .getCalls()
            .map(c => c.args[0])
            .join()
        ).to.equal(seq.join());
        expect(cb.getCalls().length).to.equal(11);
        done();
        finishTest();
      }
    });
  });

  it('should not trigger Event:request by default', finishTest => {
    crawler.direct({
      uri: url,
      callback: (error, res) => {
        expect(error).to.be.null;
        expect(res.statusCode).to.equal(200);
        expect(res.body).to.equal('ok');
        expect(cb.called).to.be.false;
        finishTest();
      }
    });
  });

  it('should trigger Event:request if specified in options', finishTest => {
    crawler.direct({
      uri: url,
      skipEventRequest: false,
      callback: (error, res) => {
        expect(error).to.be.null;
        expect(res.statusCode).to.equal(200);
        expect(res.body).to.equal('ok');
        expect(cb.calledOnce).to.be.true;
        expect(cb.firstCall.args[0]).to.equal('Event:request');
        finishTest();
      }
    });
  });

  it('Illegal task option', finishTest => {
    const c = new Crawler({
      transform: false
    });

    c.direct(null);

    finishTest();
  });

  it('must specify callback', finishTest => {
    const c = new Crawler({
      transform: false
    });

    c.direct(url);

    finishTest();
  });
});
