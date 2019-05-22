'use strict';

const Crawler = require('../lib/Crawler');
const expect = require('chai').expect;
const nock = require('nock');

describe('Request tests', () => {
  before(() => {
    nock.cleanAll();
  });

  let crawler = null;
  let scope = null;
  const url = 'http://nock.nock';
  const path = '/get';
  const headerPath = '/header';

  beforeEach(() => {
    crawler = new Crawler({
      retries: 0,
      transform: false,
      options: {
        json: true
      }
    });

    scope = nock(url)
      .get(path)
      .reply(200, 'null')
      .persist();
    nock(url)
      .get(headerPath)
      .reply(function() {
        return [200, JSON.stringify(this.req.headers), { 'Content-Type': 'application/json' }];
      });
  });

  afterEach(() => {
    scope.persist(false);
    crawler = null;
  });

  it('should crawl one request', end => {
    crawler.queue({
      uri: `${url}${path}`,
      callback: (error, res, done) => {
        expect(error).to.be.null;
        expect(res.statusCode).to.eql(200);
        done();
        end();
      }
    });
  });

  it('should crawl two request and execute the onDrain() callback', done => {
    const callback = (error, res, next) => {
      expect(error).to.be.null;
      expect(res.statusCode).to.eql(200);
      next();
    };

    crawler.on('drain', done);

    crawler.queue({
      uri: `${url}${path}`,
      callback: callback
    });

    crawler.queue({
      uri: `${url}${path}`,
      callback: callback
    });
  });

  it('should contain gzip header', end => {
    crawler.queue({
      uri: `${url}${headerPath}`,
      callback: (error, res, done) => {
        expect(error).to.be.null;
        expect(res.body['accept-encoding']).to.match(/gzip/);
        done();
        end();
      }
    });
  });

  it('should use the provided user-agent', end => {
    const ua = 'test/1.2';
    crawler.queue({
      uri: `${url}${headerPath}`,
      userAgent: ua,
      callback: (error, res, done) => {
        expect(error).to.be.null;
        expect(res.body['user-agent']).to.eql(ua);
        done();
        end();
      }
    });
  });

  it('should replace the global User-Agent', end => {
    crawler = new Crawler({
      options: {
        json: true,
        headers: { 'User-Agent': 'test/1.2' }
      },
      transform: false,
      callback: (error, res, done) => {
        expect(error).to.be.null;
        expect(res.body['user-agent']).to.equal('foo/bar');
        done();
        end();
      }
    });

    crawler.queue({
      uri: `${url}${headerPath}`,
      options: { headers: { 'User-Agent': 'foo/bar' } }
    });
  });

  it('should replace the global userAgent', end => {
    crawler = new Crawler({
      userAgent: 'test/1.2',
      transform: false,
      options: {
        json: true
      },
      callback: (error, res, done) => {
        expect(error).to.be.null;
        expect(res.body['user-agent']).to.equal('foo/bar');
        done();
        end();
      }
    });

    crawler.queue({ uri: `${url}${headerPath}`, userAgent: 'foo/bar' });
  });

  it('should rotate the userAgent', end => {
    crawler = new Crawler({
      userAgent: ['test/1.1', 'test/1.2'],
      rotateUA: true,
      transform: false,
      options: {
        json: true
      }
    });

    crawler.queue({
      uri: `${url}${headerPath}`,
      callback: (error, res, done) => {
        expect(error).to.be.null;
        expect(res.body['user-agent']).to.equal('test/1.1');
        done();
      }
    });

    crawler.queue({
      uri: `${url}${headerPath}`,
      callback: (error, res, done) => {
        expect(error).to.be.null;
        expect(res.body['user-agent']).to.equal('test/1.2');
        done();
        end();
      }
    });
  });

  it('should spoof the referer', end => {
    const referer = 'http://nock.ref';

    crawler.queue({
      uri: `${url}${headerPath}`,
      options: {
        headers: { Referer: referer }
      },
      callback: (error, res, done) => {
        expect(error).to.be.null;
        expect(res.body.referer).to.equal(referer);
        done();
        end();
      }
    });
  });
});
