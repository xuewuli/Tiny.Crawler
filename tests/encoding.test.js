'use strict';

const Crawler = require('../lib/Crawler');
const expect = require('chai').expect;
const nock = require('nock');

describe('Encoding', () => {
  before(() => {
    nock.cleanAll();
  });

  const origin = 'http://nock.nock';
  const encodingFileName = 'iso8859.html';
  const charsetName = 'ISO-8859-1';
  const path = `/charsets/${encodingFileName}`;
  const url = `${origin}${path}`;
  const pathWithoutCharsetHeader = `/charsets-noheader/${encodingFileName}`;
  const urlWithoutCharsetHeader = `${origin}${pathWithoutCharsetHeader}`;

  let crawler = null;

  beforeEach(() => {
    crawler = new Crawler({
      retries: 0
    });

    nock(origin)
      .get(path)
      .replyWithFile(200, `${__dirname}/${encodingFileName}`, {
        'Content-Type': `text/html;charset=${charsetName}`
      });
    nock(origin)
      .get(pathWithoutCharsetHeader)
      .replyWithFile(200, `${__dirname}/${encodingFileName}`, {
        'Content-Type': 'text/html'
      });
  });

  it('should parse latin-1', done => {
    crawler.queue([
      {
        uri: url,
        callback: (error, result) => {
          expect(error).to.be.null;
          expect(result.charset).to.eql(charsetName);
          expect(result.body.indexOf('Jörg')).to.be.above(0);
          done();
        }
      }
    ]);
  });

  it('should return buffer if encoding = null', done => {
    crawler.queue([
      {
        uri: url,
        encoding: null,
        callback: (error, result) => {
          expect(error).to.be.null;
          expect(result.body instanceof Buffer).to.be.true;
          done();
        }
      }
    ]);
  });

  it('should parse latin-1 if incomingEncoding = ISO-8859-1', done => {
    crawler.queue([
      {
        uri: url,
        incomingEncoding: charsetName,
        callback: (error, result) => {
          expect(error).to.be.null;
          expect(result.charset).to.eql(charsetName);
          expect(result.body.indexOf('Jörg')).to.be.above(0);
          done();
        }
      }
    ]);
  });

  it('could not parse latin-1 if incomingEncoding = gb2312', done => {
    crawler.queue([
      {
        uri: url,
        incomingEncoding: 'gb2312',
        callback: (error, result) => {
          expect(error).to.be.null;
          expect(result.body.indexOf('Jörg')).to.equal(-1);
          done();
        }
      }
    ]);
  });

  it('should parse charset from header ', done => {
    crawler.queue([
      {
        uri: url,
        callback: (error, result) => {
          expect(error).to.be.null;
          expect(result.charset).to.equal(charsetName);
          expect(result.body.indexOf('Jörg')).to.be.above(0);
          done();
        }
      }
    ]);
  });

  it('should parse charset from meta tag in html if header does not contain content-type key ', done => {
    crawler.queue([
      {
        uri: urlWithoutCharsetHeader,
        callback: (error, result) => {
          expect(error).to.be.null;
          expect(result.charset).to.equal(charsetName);
          expect(result.body.indexOf('Jörg')).to.be.above(0);
          done();
        }
      }
    ]);
  });
});
