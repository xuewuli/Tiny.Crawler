'use strict';

const Crawler = require('../lib/Crawler');
const ua = require('./ua_list');
const map = new Map();

const crawler = new Crawler({
  skipDuplicates: true,
  retries: 1,
  retryTimeout: 10,
  rotateUA: true,
  userAgent: ua,
  options: {
    cache: map,
    followRedirect: true
  },
  callback: (error, res, done) => {
    if (error) {
      console.log(error);
    } else {
      console.log(res.body);
    }
    done();
  }
});

crawler.queue('https://www.github.com/');
crawler.queue('https://www.github.com/');
