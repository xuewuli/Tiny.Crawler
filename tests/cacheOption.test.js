'use strict';

const Crawler = require('../lib/Crawler');
const expect = require('chai').expect;
const nock = require('nock');
const url = 'http://nock.nock';
let c;
let scope;

describe('Cache features tests', () => {
  describe('Skip Duplicate active', () => {
    beforeEach(() => {
      scope = nock(url);
    });
    afterEach(() => {
      c = {};
    });

    it('skip should work as expect', done => {
      let call = scope.get('/').reply(200);
      c = new Crawler({
        transform: false,
        skipDuplicates: true,
        options: {
          form: 'true'
        },
        callback: (error, result) => {
          expect(error).to.be.null;
          expect(result.statusCode).to.equal(200);
          expect(call.isDone()).to.be.true;

          const queueSize = c.queueSize;
          c.queue(url);
          expect(c.queueSize).to.equal(queueSize);

          done();
        }
      });

      c.queue(url);
    });

    it('skip should work as expect [POST]', done => {
      let call = scope.post('/').reply(200, '{}');
      c = new Crawler({
        transform: false,
        skipDuplicates: true,
        options: {
          method: 'POST',
          searchParams: 'a=1&b=2',
          body: { a: 1, b: 2, b: 3 },
          json: true
        },
        callback: (error, result) => {
          expect(error).to.be.null;
          expect(result.statusCode).to.equal(200);
          expect(call.isDone()).to.be.true;

          const queueSize = c.queueSize;
          c.queue(url);
          expect(c.queueSize).to.equal(queueSize);

          done();
        }
      });

      c.queue(url);
    });

    it('should notify the callback when an error occurs and "retries" is disabled', done => {
      let koScope = scope.get('/').replyWithError('too bad');
      c = new Crawler({
        transform: false,
        skipDuplicates: true,
        retries: 0,
        callback: error => {
          expect(error).to.be.a('error');
          expect(koScope.isDone()).to.be.true;
          done();
        }
      });

      c.queue(url);
    });

    it('should notify the callback when an error occurs and "retries" is disabled [POST]', done => {
      let koScope = scope.post('/').replyWithError('too bad');
      c = new Crawler({
        transform: false,
        skipDuplicates: true,
        retries: 0,
        options: {
          method: 'POST',
          searchParams: { a: 1, b: 2 },
          form: 'd=4&c=3'
        },
        callback: error => {
          expect(error).to.be.a('error');
          expect(koScope.isDone()).to.be.true;
          done();
        }
      });

      c.queue(url);
    });

    it('should retry and notify the callback when an error occurs and "retries" is enabled', done => {
      let koScope = scope.get('/').replyWithError('too bad');
      let okScope = scope.get('/').reply(200);
      c = new Crawler({
        transform: false,
        skipDuplicates: true,
        retries: 1,
        retryTimeout: 10,
        callback: error => {
          expect(error).to.be.null;
          expect(koScope.isDone()).to.be.true;
          expect(okScope.isDone()).to.be.true;
          done();
        }
      });

      c.queue(url);
    });

    it('should retry and notify the callback when an error occurs and "retries" is enabled [POST]', done => {
      let koScope = scope.post('/').replyWithError('too bad');
      let okScope = scope.post('/').reply(200);
      c = new Crawler({
        transform: false,
        skipDuplicates: true,
        retries: 1,
        retryTimeout: 10,
        options: {
          method: 'POST',
          form: { a: 1, b: 2 }
        },
        callback: error => {
          expect(error).to.be.null;
          expect(koScope.isDone()).to.be.true;
          expect(okScope.isDone()).to.be.true;
          done();
        }
      });

      c.queue(url);
    });
  });
});
