'use strict';

const transformer = require('../lib/Transformer');
const expect = require('chai').expect;
const given = require('mocha-testdata');

let response = {
  body: '<p><i>great!</i></p>'
};
let task = {};

describe('Transformer test', () => {
  before(() => {
    response.$ = undefined;
  });

  given
    .async(true, 'cheerio', { name: 'cheerio' }, {}, 1)
    .it('should transform', (done, transform) => {
      task.transform = transform;
      transformer(response, task, (error, res) => {
        expect(res.$('i').html()).to.equal('great!');

        done();
      });
    });

  given.async(false, null, undefined, '', NaN, 0).it('should not transform', (done, transform) => {
    task.transform = transform;
    transformer(response, task, (error, res) => {
      expect(res.$).to.be.undefined;

      done();
    });
  });
});
