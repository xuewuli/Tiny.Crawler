'use strict';

const Crawler = require('../lib/Crawler');
const expect = require('chai').expect;
const { CookieJar } = require('tough-cookie');

const nock = require('nock');

const url = 'http://nock.nock';

describe('Jar Options', () => {
  before(() => {
    nock.cleanAll();
    nock(url)
      .get('/setCookie')
      .reply(() => {
        let response = [
          200,
          'ok',
          {
            'set-cookie': [
              `ping=pong; Domain=.nock.nock; Expires=${new Date(
                Date.now() + 86400000
              ).toUTCString()}; Path=/`
            ]
          }
        ];
        return response;
      })
      .persist();
    nock(url)
      .get('/getCookie')
      .reply(200, function() {
        return this.req.headers.cookie;
      })
      .persist();
  });

  after(() => {
    delete require.cache[nock];
  });

  const jar = new CookieJar();
  jar.setCookieSync('foo=bar', url);

  let crawler = new Crawler({
    transform: false,
    options: {
      cookieJar: jar
    }
  });

  it('should send with cookie when setting jar options', finishTest => {
    crawler.queue({
      uri: `${url}/getCookie`,
      callback: (error, response, done) => {
        expect(error).to.be.null;
        expect(response.body).to.equal(jar.getCookieStringSync(url));
        done();
        finishTest();
      }
    });
  });

  it('should set cookie when response set-cookie headers exist', finishTest => {
    crawler.queue({
      uri: `${url}/setCookie`,
      callback: (error, response, done) => {
        expect(error).to.be.null;
        expect(jar.getCookieStringSync(url).indexOf('ping=pong') > -1).to.be.true;
        done();
        finishTest();
      }
    });
  });
});
