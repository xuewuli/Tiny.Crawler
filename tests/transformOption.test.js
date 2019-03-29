'use strict';

const Crawler = require('../lib/Crawler');
const expect = require('chai').expect;
const given = require('mocha-testdata');
let c;

describe('transform testing', () => {
  afterEach(() => {
    c = {};
  });
  describe('transform parsing', () => {
    given.async('cheerio').it('should work on inline html', (done, transform) => {
      c = new Crawler();
      c.queue([
        {
          html: '<p><i>great!</i></p>',
          transform: transform,
          callback: (
            error,
            res //noinspection BadExpressionStatementJS,BadExpressionStatementJS
          ) => {
            expect(error).to.be.null;
            expect(res.$('i').html()).to.equal('great!');
            done();
          }
        }
      ]);
    });
  });
  describe('transform injection', () => {
    it('should enable cheerio by default', done => {
      c = new Crawler({
        html: '<p><i>great!</i></p>',
        transform: true,
        callback: (error, res) => {
          expect(error).to.be.null;
          expect(res.$('i').html()).to.equal('great!');
          done();
        }
      });
      c.queue([{ html: '<p><i>great!</i></p>' }]);
    });
    given
      .async('cheerio', { name: 'cheerio' })
      .it('should enable cheerio if set', (done, transform) => {
        c = new Crawler({
          transform: transform,
          callback: (error, res) => {
            expect(error).to.be.null;
            expect(res.$('i').html()).to.equal('great!');
            done();
          }
        });
        c.queue([{ html: '<p><i>great!</i></p>' }]);
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
      c.queue([{ html: '<p><i>great!</i></p>' }]);
    });
    given.async(false, null).it('should not inject transform', (done, transform) => {
      c = new Crawler({
        transform: transform,
        callback: (error, res) => {
          expect(error).to.be.null;
          expect(res.$).to.be.undefined;
          done();
        }
      });
      c.queue([{ html: '<p><i>great!</i></p>' }]);
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
          c.queue([{ html: '<p><i>great!</i></p>' }]);
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
        c.queue([{ html: '<p><i>great!</i></p>' }]);
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
      c.queue([{ html: '<p><i>great!</i></p>' }]);
    });
  });
});
