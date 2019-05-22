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
  const pathGB2312 = '/gb2312';
  const urlWithoutCharsetHeader = `${origin}${pathWithoutCharsetHeader}`;
  const urlGB2312 = `${origin}${pathGB2312}`;

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

    nock(origin)
      .get(pathGB2312)
      .replyWithFile(200, `${__dirname}/${encodingFileName}`, {
        'Content-Type': 'text/html;charset=gb2312'
      });
  });

  it('should parse latin-1', done => {
    crawler.queue([
      {
        uri: url,
        forceUTF8: true,
        callback: (error, result) => {
          expect(error).to.be.null;
          expect(result.charset).to.eql(charsetName);
          expect(result.body.indexOf('Jörg')).to.be.above(0);
          done();
        }
      }
    ]);
  });

  it('should return buffer if raw = true', done => {
    crawler.queue([
      {
        uri: url,
        raw: true,
        callback: (error, result) => {
          expect(error).to.be.null;
          expect(result.body instanceof Buffer).to.be.true;
          done();
        }
      }
    ]);
  });

  it('treat gb2312 as gbk, for iconv-lite', done => {
    crawler.queue([
      {
        uri: urlGB2312,
        forceUTF8: true,
        callback: (error, result) => {
          expect(error).to.be.null;
          expect(result.charset).to.equal('gbk');
          done();
        }
      }
    ]);
  });

  it('should parse latin-1 if incomingEncoding = ISO-8859-1', done => {
    crawler.queue([
      {
        uri: url,
        forceUTF8: true,
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
        forceUTF8: true,
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
        forceUTF8: true,
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
        forceUTF8: true,
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
