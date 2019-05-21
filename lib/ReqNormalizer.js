'use strict';

const qs = require('querystring');
const URL = require('url').URL;

const normalize = req => {
  const opt = {
    method: 'GET',
    body: null
  };

  if (typeof req === 'string') {
    opt.uri = req;
  } else if (typeof req === 'object') {
    opt.uri = req.uri;

    if (!new URL(opt.uri).search && req.searchParams) {
      opt.uri = [
        opt.uri,
        typeof req.searchParams === 'object' ? qs.stringify(req.searchParamss) : req.searchParams
      ].join('?');
    }

    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      if (req.json && typeof req.body === 'object') {
        const sorted = Object.keys(req.body)
          .map(k => [k, req.body[k]])
          .sort((a, b) => {
            return a[0] === b[0] ? a[1] > b[1] : a[0] > b[0];
          })
          .reduce((pre, cur) => {
            pre[cur[0]] = cur[1];
            return pre;
          }, Object.create(null));
        opt.body = JSON.stringify(sorted);
      } else if (typeof req.form === 'object') {
        opt.body = Object.keys(req.form)
          .map(k => {
            return [k, req.form[k]].join('=');
          })
          .sort()
          .join('&');
      } else if (typeof req.form === 'string') {
        opt.body = req.form
          .split('&')
          .sort()
          .join('&');
      }
    }
  } else {
    throw new Error('request should be String or Object.');
  }

  // if (this.globalOptions.stripFragment) {
  //     opt.uri = opt.uri.replace(/#.*/g, '');
  // }

  return [opt.method, opt.uri, opt.body].join('\r\n');
};

module.exports = normalize;
