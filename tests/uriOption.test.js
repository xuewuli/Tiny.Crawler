'use strict';

const Crawler = require('../lib/Crawler');
const expect = require('chai').expect;
const sinon = require('sinon');

const nock = require('nock');

const url = 'http://nock.nock';

describe('Uri Options', () => {
  before(() => {
    nock.cleanAll();
    nock(url)
      .get('/')
      .reply(200, 'ok')
      .persist();
  });

  const crawler = new Crawler({ transform: false });

  it('should work if uri is string', finishTest => {
    crawler.queue({
      uri: url,
      callback: (error, response, done) => {
        expect(error).to.be.null;
        done();
        finishTest();
      }
    });
  });

  it('should work if uri is a function', finishTest => {
    const uriFn = onUri => {
      onUri(url);
    };
    crawler.queue({
      uri: uriFn,
      callback: (error, response, done) => {
        expect(error).to.be.null;
        done();
        finishTest();
      }
    });
  });

  it('should skip if the uri is undefined or an empty string', finishTest => {
    const push = sinon.spy(crawler, '_pushToQueue');
    crawler.queue([undefined, null, []]);
    crawler.queue({
      uri: url,
      callback: (error, response, done) => {
        expect(push.calledOnce).to.be.true;
        done();
        finishTest();
      }
    });
  });
});
