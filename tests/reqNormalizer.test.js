'use strict';

const normalize = require('../lib/ReqNormalizer');
const expect = require('chai').expect;
const uri = 'http://nock.nock';

describe('ReqNormalizer test', () => {
  it('simple op', done => {
    expect(
      normalize({
        uri,
        options: { method: 'POST', json: false, body: { a: 1, b: 2, c: 3 } }
      })
    ).to.equal(
      normalize({
        uri,
        options: { method: 'POST', json: false, body: { c: 3, b: 2, a: 1 } }
      })
    );
    expect(
      normalize({ uri, options: { method: 'POST', json: true, body: { a: 1, b: 2, c: 3 } } })
    ).to.equal(
      normalize({ uri, options: { method: 'POST', json: true, body: { c: 3, b: 2, a: 1 } } })
    );

    expect(
      normalize({ uri, options: { method: 'POST', json: false, form: { a: 1, b: 2, c: 3 } } })
    ).to.equal(
      normalize({ uri, options: { method: 'POST', json: false, form: { c: 3, b: 2, a: 1 } } })
    );
    expect(
      normalize({ uri, options: { method: 'POST', json: true, form: { a: 1, b: 2, c: 3 } } })
    ).to.equal(
      normalize({ uri, options: { method: 'POST', json: true, form: { c: 3, b: 2, a: 1 } } })
    );

    expect(
      normalize({ uri, options: { method: 'POST', json: false, form: 'a=1&b=2&c=3' } })
    ).to.equal(normalize({ uri, options: { method: 'POST', json: false, form: 'c=3&b=2&a=1' } }));

    expect(
      normalize({ uri, options: { method: 'POST', json: true, form: 'a=1&b=2&c=3' } })
    ).to.equal(normalize({ uri, options: { method: 'POST', json: true, form: 'c=3&b=2&a=1' } }));

    done();
  });
});
