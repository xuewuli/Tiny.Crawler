'use strict';

const Crawler = require('../lib/Crawler');
const nock = require('nock');

const url = 'http://nock.nock';

describe('Callback test', () => {
  before(() => {
    nock.cleanAll();
  });

  let crawler = null;

  beforeEach(() => {
    crawler = new Crawler({
      retryTimeout: 0,
      retries: 0,
      timeout: 100,
      logger: {
        log: () => {}
      }
    });
  });

  afterEach(() => {
    crawler = null;
  });

  it('should end as expected without callback', done => {
    nock(url)
      .get('/get')
      .reply(200, '<html></html>', {
        'Content-Type': 'text/html'
      });

    crawler.on('drain', done);
    crawler.queue(`${url}/get`);
  });

  it('should end as expected', done => {
    nock(url)
      .get('/get')
      .reply(200, '', {
        'Content-Type': 'image/png'
      });

    crawler.on('drain', done);
    crawler.queue(`${url}/get`);
  });

  it('should end as expected without callback when timedout', done => {
    nock(url)
      .get('/delay')
      .delayBody(500)
      .reply(200, '<html></html>', {
        'Content-Type': 'text/html'
      });

    crawler.on('drain', done);
    crawler.queue(`${url}/delay`);
  });

  it('should end as expected without callback when encoding error', done => {
    nock(url)
      .get('/get')
      .reply(200, '<html></html>', {
        'Content-Type': 'text/html'
      });

    crawler._doEncoding = () => {
      throw new Error('Error for testing.');
    };
    crawler.on('drain', done);
    crawler.queue(`${url}/get`);
  });
});
