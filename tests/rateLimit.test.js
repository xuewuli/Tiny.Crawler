'use strict';

const Crawler = require('../lib/Crawler');
const expect = require('chai').expect;
const nock = require('nock');

const url = 'http://nock.nock';

let c;
let tsArrs = [];

describe('rateLimit tests', () => {
  before(() => {
    nock.cleanAll();
  });

  beforeEach(() => {
    c = new Crawler({
      transform: false,
      rateLimit: 300,
      callback: (error, result, done) => {
        expect(error).to.be.equal(null);
        expect(result.statusCode).to.equal(200);
        done();
      }
    });
    c.on('request', () => tsArrs.push(Date.now()));
  });

  afterEach(() => {
    c = {};
    tsArrs = [];
  });

  describe('Exceed rateLimit', () => {
    before(() => {
      nock(url)
        .get(uri => uri.indexOf('status') >= 0)
        .times(2)
        .delay(500)
        .reply(200, 'Yes');
    });

    it('Interval of two requests should be no less than 500ms', testDone => {
      c.queue({ uri: `${url}/status/200` });
      c.queue({
        uri: `${url}/status/200`,
        callback: (error, result, done) => {
          expect(error).to.be.equal(null);
          expect(result.statusCode).to.equal(200);
          done();

          expect(tsArrs.length).to.equal(2);
          expect(tsArrs[1] - tsArrs[0]).to.be.least(450);

          testDone();
        }
      });
    });
  });

  describe('Abide rateLimit', () => {
    before(() => {
      nock(url)
        .get(uri => uri.indexOf('status') >= 0)
        .times(10)
        .reply(200, 'Yes');
    });

    it('request speed should abide rateLimit', done => {
      for (let i = 0; i < 5; ++i) {
        c.queue(`${url}/status/200`);
      }

      c.on('drain', () => {
        expect(tsArrs.length).to.equal(5);
        for (let i = 1; i < tsArrs.length; ++i) {
          const interval = tsArrs[i] - tsArrs[i - 1];
          const diff = Math.abs(interval - 300);
          expect(diff).to.be.most(30);
        }

        done();
      });
    });

    it('should be able to modify rateLimit', done => {
      c.setGroupProperty('default', 'rateLimit', 500);
      for (let i = 0; i < 5; ++i) {
        c.queue(`${url}/status/200`);
      }

      c.on('drain', () => {
        expect(tsArrs.length).to.equal(5);
        for (let i = 1; i < tsArrs.length; ++i) {
          const interval = tsArrs[i] - tsArrs[i - 1];
          const diff = Math.abs(interval - 500);
          expect(diff).to.be.at.most(50);
        }

        done();
      });
    });
  }).timeout(3000);
});
