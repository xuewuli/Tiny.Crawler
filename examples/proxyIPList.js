'use strict';

const Crawler = require('../lib/Crawler');
const ua = require('./ua_list');

const ipArr = [];

const crawler = new Crawler({
  rotateUA: true,
  userAgent: ua,
  debug: true,
  options: {
    timeout: 20000,
    followRedirect: true
  },
  callback: (error, res, done) => {
    if (error) {
      return done();
    }

    const ipList = res.$('#ip_list tr');

    for (let i = 1, n = ipList.length; i < n; ++i) {
      const value = ipList.eq(i).find('td');
      ipArr.push(value.eq(1).html());
    }

    return done();
  }
});

crawler.queue([
  'http://www.xicidaili.com/wt/1',
  'http://www.xicidaili.com/wt/2',
  'http://www.xicidaili.com/wt/3'
]);

crawler.on('drain', () => {
  process.stdout.write(JSON.stringify(ipArr));
});
