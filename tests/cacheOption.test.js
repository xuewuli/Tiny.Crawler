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

    it('should not skip one single url [GET]', done => {
      let call = scope.get('/').reply(200);
      c = new Crawler({
        transform: false,
        skipDuplicates: true,
        callback: (error, result) => {
          expect(error).to.be.null;
          expect(result.statusCode).to.equal(200);
          expect(call.isDone()).to.be.true;
          done();
        }
      });

      c.queue(url);
    });

    it('should not skip one single url [POST]', done => {
      let call = scope.post('/').reply(200, '{}');
      c = new Crawler({
        transform: false,
        skipDuplicates: true,
        searchParams: 'a=1&b=2',
        method: 'POST',
        body: { a: 1, b: 2 },
        json: true,
        callback: (error, result) => {
          expect(error).to.be.null;
          expect(result.statusCode).to.equal(200);
          expect(call.isDone()).to.be.true;
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
        method: 'POST',
        form: 'd=4&c=3',
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
        method: 'POST',
        form: { a: 1, b: 2 },
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