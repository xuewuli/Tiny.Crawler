'use strict';

const qs = require('querystring');
const URL = require('url').URL;

const normalize = req => {
  const options = req.options;
  const opt = {
    uri: req.uri,
    method: options.method || 'GET',
    body: null
  };

  if (!new URL(opt.uri).search && options.searchParams) {
    opt.uri = [
      opt.uri,
      typeof options.searchParams === 'object'
        ? qs.stringify(options.searchParams)
        : options.searchParams
    ].join('?');
  }

  if (opt.method === 'POST' || opt.method === 'PUT' || opt.method === 'PATCH') {
    if (options.json && typeof options.body === 'object') {
      const sorted = Object.keys(options.body)
        .map(k => [k, options.body[k]])
        .sort((a, b) => {
          return a[0] > b[0];
        })
        .reduce((pre, cur) => {
          pre[cur[0]] = cur[1];
          return pre;
        }, Object.create(null));
      opt.body = JSON.stringify(sorted);
    } else if (typeof options.form === 'object') {
      opt.body = Object.keys(options.form)
        .map(k => {
          return [k, options.form[k]].join('=');
        })
        .sort()
        .join('&');
    } else if (typeof options.form === 'string') {
      opt.body = options.form
        .split('&')
        .sort()
        .join('&');
    }
  }

  // if (this.globalOptions.stripFragment) {
  //     opt.uri = opt.uri.replace(/#.*/g, '');
  // }

  return [opt.method, opt.uri, opt.body].join('\r\n');
};

module.exports = normalize;
