'use strict';

const Crawler = require('..');
const ua = require('./ua_list');

const options = {
  rotateUA: true,
  userAgent: ua,
  debug: true,
  options: {
    timeout: 20000,
    followRedirect: true
  },
  callback: process
};

const ipArr = [];
const max = 3;

let curPage = 1;

const save = data => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log('data len:', data.length);
      resolve();
    }, 1000);
  });
};

options.callback = (error, res, done) => {
  if (error) {
    return done();
  }

  const ipList = res.$('#ip_list tr');

  for (let i = 1, n = ipList.length; i < n; ++i) {
    const value = ipList.eq(i);
    ipArr.push({
      protocol: value
        .find('td')
        .eq(5)
        .html()
        ? value
            .find('td')
            .eq(5)
            .html()
            .toLowerCase()
        : '',
      ip: value
        .find('td')
        .eq(1)
        .html(),
      port: value
        .find('td')
        .eq(2)
        .html(),
      status: value
        .find('td')
        .eq(4)
        .html()
        ? value
            .find('td')
            .eq(4)
            .html()
            .trim()
        : '',
      responseTime: value
        .find('td')
        .eq(6)
        .find('.bar')
        .attr('title')
        ? value
            .find('td')
            .eq(6)
            .find('.bar')
            .attr('title')
            .trim()
        : ''
    });
  }

  console.log(ipArr.length);

  if (++curPage <= max) {
    crawler.queue('http://www.xicidaili.com/wt/' + curPage);
  }

  return done();
};

const crawler = new Crawler(options);

crawler.queue('http://www.xicidaili.com/wt/' + curPage);

crawler.on('drain', async () => {
  console.log('saved begin:', Date.now());
  await save(ipArr);
  console.log('saved end:', Date.now());
});
