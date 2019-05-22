'use strict';

const Crawler = require('../lib/Crawler');
const expect = require('chai').expect;

const nock = require('nock');

const url = 'http://nock.nock';

describe('Errors', () => {
  before(() => {
    nock.cleanAll();
    nock(url)
      .get('/')
      .reply(200, '<html><p>hello<div>dude</p></html>', {
        'Content-Type': 'text/html'
      })
      .persist();
    nock(url)
      .get('/delay/1')
      .delay(1000)
      .reply(200, 'ok')
      .persist();
    nock(url)
      .get('/status/400')
      .reply(400, 'Bad Request')
      .persist();
    nock(url)
      .get('/status/401')
      .reply(401, 'Unauthorized')
      .persist();
    nock(url)
      .get('/status/403')
      .reply(403, 'Forbidden')
      .persist();
    nock(url)
      .get('/status/404')
      .reply(404, 'Not Found')
      .persist();
    nock(url)
      .get('/status/500')
      .reply(500, 'Internal Error')
      .persist();
    nock(url)
      .get('/status/204')
      .reply(204, '')
      .persist();
  });

  describe('timeout', () => {
    const crawler = new Crawler({
      options: {
        timeout: 500
      },
      retryTimeout: 1000,
      retries: 2,
      transform: false
    });

    it('should retry after timeout', finishTest => {
      let options = {
        retries: 3,
        uri: `${url}/delay/1`,
        callback: (error, response, done) => {
          expect(error).to.exist;
          expect(response.task.retries).to.equal(0);
          done();
          finishTest();
        }
      };
      crawler.queue(options);
    }).timeout(10000);

    it('should return a timeout error after ~2sec', finishTest => {
      crawler.queue({
        uri: `${url}/delay/1`,
        callback: (error, response, done) => {
          expect(error).to.exist;
          expect(error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT').to.be.true;
          done();
          finishTest();
        }
      });
    });
  }).timeout(10000);

  describe('error status code', () => {
    const crawler = new Crawler({ transform: false });

    it('should not return an error on status code 400 (Bad Request)', finishTest => {
      crawler.queue({
        uri: `${url}/status/400`,
        callback: (error, response, done) => {
          expect(error).to.be.null;
          expect(response.statusCode).to.equal(400);
          done();
          finishTest();
        }
      });
    });

    it('should not return an error on status code 401 (Unauthorized)', finishTest => {
      crawler.queue({
        uri: `${url}/status/401`,
        callback: (error, response, done) => {
          expect(error).to.be.null;
          expect(response.statusCode).to.equal(401);
          done();
          finishTest();
        }
      });
    });

    it('should not return an error on status code 403 (Forbidden)', finishTest => {
      crawler.queue({
        uri: `${url}/status/403`,
        callback: (error, response, done) => {
          expect(error).to.be.null;
          expect(response.statusCode).to.equal(403);
          done();
          finishTest();
        }
      });
    });

    it('should not return an error on a 404', finishTest => {
      crawler.queue({
        uri: `${url}/status/404`,
        callback: (error, response, done) => {
          expect(error).to.be.null;
          expect(response.statusCode).to.equal(404);
          done();
          finishTest();
        }
      });
    });

    it('should not return an error on a 500', finishTest => {
      crawler.queue({
        uri: `${url}/status/500`,
        callback: (error, response, done) => {
          expect(error).to.be.null;
          expect(response.statusCode).to.equal(500);
          done();
          finishTest();
        }
      });
    });

    it('should not fail on empty response', finishTest => {
      crawler.queue({
        uri: `${url}/status/204`,
        callback: (error, response, done) => {
          expect(error).to.be.null;
          done();
          finishTest();
        }
      });
    });

    it('should not fail on a malformed html if transform is false', finishTest => {
      crawler.queue({
        uri: url,
        callback: (error, response, done) => {
          expect(error).to.be.null;
          expect(response).not.to.be.null;
          done();
          finishTest();
        }
      });
    });
  });
});
