'use strict';

const Crawler = require('../lib/Crawler');
const ua = require('./ua_list');

const options = {
  rotateUA: true,
  userAgent: ua,
  debug: true,
  options: {
    timeout: 20000,
    followRedirect: true
  }
};

const ipArr = [];

options.callback = (error, res, done) => {
  if (error) {
    return done();
  }

  const ipList = res.$('#ip_list tr');

  for (let i = 1, n = ipList.length; i < n; ++i) {
    const value = ipList.eq(i).find('td');

    const protocol = value.eq(5).html();
    const ip = value.eq(1).html();
    const port = value.eq(2).html();
    const status = value.eq(4).html();

    ipArr.push({
      protocol,
      ip,
      port,
      status
    });
  }

  return done();
};

const crawler = new Crawler(options);

crawler.queue([
  'http://www.xicidaili.com/wt/1',
  'http://www.xicidaili.com/wt/2',
  'http://www.xicidaili.com/wt/3'
]);
