'use strict';

const Crawler = require('../lib/Crawler');
const expect = require('chai').expect;
const given = require('mocha-testdata');

const nock = require('nock');

const url = 'http://nock.nock';

let c;

describe('transform testing', () => {
  before(() => {
    nock.cleanAll();
    nock(url)
      .get('/')
      .reply(200, '<p><i>great!</i></p>', {
        'Content-Type': 'text/html'
      })
      .persist();
  });

  afterEach(() => {
    c = {};
  });
  describe('transform with custom function', () => {
    it('should work with custom function', done => {
      c = new Crawler();
      c.queue([
        {
          uri: url,
          transform: body => {
            expect(body).to.equal('<p><i>great!</i></p>');
            return 'great!';
          },
          callback: (error, res) => {
            expect(error).to.be.null;
            expect(res.$).to.equal('great!');
            done();
          }
        }
      ]);
    });
  });
  describe('transform injection', () => {
    it('should enable cheerio by default', done => {
      c = new Crawler({
        transform: true,
        callback: (error, res) => {
          expect(error).to.be.null;
          expect(res.$('i').html()).to.equal('great!');
          done();
        }
      });
      c.queue([url]);
    });
    given
      .async('cheerio', { name: 'cheerio' }, {}, 1)
      .it('should enable cheerio if set', (done, transform) => {
        c = new Crawler({
          transform: transform,
          callback: (error, res) => {
            expect(error).to.be.null;
            expect(res.$('i').html()).to.equal('great!');
            done();
          }
        });
        c.queue([url]);
      });
    it('should disable transform if set to false', done => {
      c = new Crawler({
        transform: false,
        callback: (error, res) => {
          expect(error).to.be.null;
          expect(res.$).to.be.undefined;
          done();
        }
      });
      c.queue([url]);
    });
    given
      .async(null, undefined, '', NaN, 0)
      .it('should not inject transform', (done, transform) => {
        c = new Crawler({
          transform: transform,
          callback: (error, res) => {
            expect(error).to.be.null;
            expect(res.$).to.be.undefined;
            done();
          }
        });
        c.queue([url]);
      });
    given
      .async('cheerio')
      .it(
        'should also enable transform even if body is empty, to prevent `$ is not a function` error',
        (done, transform) => {
          c = new Crawler({
            transform: transform,
            callback: (error, res) => {
              expect(error).to.be.null;
              expect(res.$('i').html()).to.equal('great!');
              done();
            }
          });
          c.queue([url]);
        }
      );
    given
      .async('cheerio')
      .it('should disable transform if body is not text/html ', (done, transform) => {
        c = new Crawler({
          transform: transform,
          callback: (error, res) => {
            expect(error).to.be.null;
            expect(res.$('i').html()).to.equal('great!');
            done();
          }
        });
        c.queue([url]);
      });
  });
  describe('Cheerio specific test', () => {
    it('should inject cheerio with options', done => {
      const cheerioConf = {
        name: 'cheerio',
        options: {
          normalizeWhitespace: true,
          xmlMode: true
        }
      };
      c = new Crawler({
        maxConnections: 10,
        transform: cheerioConf,
        callback: (error, res, next) => {
          expect(error).to.be.null;
          expect(res.$('i').html()).to.equal('great!');
          next();
        }
      });

      c.on('drain', done);
      c.queue([url]);
    });
  });
});
