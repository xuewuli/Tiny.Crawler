'use strict';

const Crawler = require('../lib/Crawler');
const expect = require('chai').expect;
const nock = require('nock');

const url = 'http://nock.nock';

let tsArrs = [];
let c;

describe('Group tests', () => {
  before(() => {
    nock.cleanAll();
  });
  beforeEach(() => {
    nock(url)
      .get(uri => uri.indexOf('status') >= 0)
      .times(5)
      .reply(200, 'Yes');

    c = new Crawler({
      transform: false,
      rateLimit: 500,
      callback: (error, result, done) => {
        expect(error).to.be.null;
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

  it('One Group, tasks should execute one by one', done => {
    for (let i = 0; i < 5; ++i) {
      c.queue({ uri: `${url}/status/200` });
    }
    expect(c.queueSize).to.equal(5);

    c.on('drain', () => {
      expect(tsArrs.length).to.equal(5);
      expect(tsArrs[4] - tsArrs[0]).to.be.least(1950);
      expect(tsArrs[4] - tsArrs[0]).to.be.most(2050);
      expect(c.queueSize).to.equal(0);

      c.shrink();

      done();
    });
  });
  it('Multiple Groups, tasks should execute in parallel', done => {
    for (let i = 0; i < 5; ++i) {
      c.queue({ uri: `${url}/status/200`, group: i });
    }
    expect(c.queueSize).to.equal(5);

    c.on('drain', () => {
      expect(tsArrs.length).to.equal(5);
      expect(tsArrs[4] - tsArrs[0]).to.be.most(50);
      expect(c.queueSize).to.equal(0);

      c.shrink();

      done();
    });
  });
  it('Multiple Groups are mutual independent and shrink work as expect', done => {
    for (let i = 0; i < 5; ++i) {
      let group = i === 4 ? 'second' : 'default';
      c.queue({ uri: `${url}/status/200`, group: group });
    }
    expect(c.queueSize).to.equal(5);

    c.on('drain', () => {
      expect(tsArrs.length).to.equal(5);
      expect(tsArrs[4] - tsArrs[0]).to.be.least(1450);
      expect(tsArrs[4] - tsArrs[0]).to.be.most(1550);
      expect(c.queueSize).to.equal(0);

      expect(c.status).to.equal(
        'group: default,running: 0,pending: 0;group: second,running: 0,pending: 0'
      );
      c.shrink();
      expect(c.status).to.equal('');

      done();
    });
  });
}).timeout(10000);
