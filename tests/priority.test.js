'use strict';

const Crawler = require('../lib/Crawler');
const expect = require('chai').expect;
const nock = require('nock');

const url = 'http://nock.nock';

let c;
let spf = [0, 0, 0, 0];
let cnt = 0;

describe('Priority test', () => {
  before(() => {
    nock.cleanAll();
    nock(url)
      .get(uri => uri.indexOf('links') >= 0)
      .times(4)
      .reply(200, 'Yes');

    c = new Crawler({
      transform: false,
      maxConnections: 1
    });

    c.queue([
      {
        uri: `${url}/links/0`,
        priority: 4,
        callback: (error, result, done) => {
          spf[cnt++] = 3;

          done();
        }
      }
    ]);

    c.queue([
      {
        uri: `${url}/links/4`,
        priority: 3,
        callback: (error, result, done) => {
          spf[cnt++] = 4;

          done();
        }
      }
    ]);

    c.queue([
      {
        uri: `${url}/links/5`,
        priority: 2,
        callback: (error, result, done) => {
          spf[cnt++] = 5;

          done();
        }
      }
    ]);

    c.queue([
      {
        uri: `${url}/links/6`,
        priority: 1,
        callback: (error, result, done) => {
          spf[cnt++] = 6;

          done();
        }
      }
    ]);
  });

  it('simple op', done => {
    c.setGroupProperty('test');
    c.setGroupProperty('test', 'dummy');
    c.setGroupProperty('test', 'dummy', 0);
    done();
  });

  it('should execute in order', done => {
    setTimeout(() => {
      expect(spf[0]).to.equal(3);
      expect(spf[1]).to.equal(6);
      expect(spf[2]).to.equal(5);
      expect(spf[3]).to.equal(4);
      done();
    }, 1000);
  }).timeout(5000);
});
