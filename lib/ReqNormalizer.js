'use strict';

const qs = require('querystring');
const URL = require('url').URL;

const sortJsonObject = obj =>
  JSON.stringify(
    Object.keys(obj)
      .map(k => [k, obj[k]])
      .sort((a, b) => (a[0] > b[0] ? 1 : -1))
      .reduce((pre, cur) => {
        pre[cur[0]] = cur[1];
        return pre;
      }, Object.create(null))
  );

const sortFormObject = obj =>
  Object.keys(obj)
    .map(k => [k, obj[k]].join('='))
    .sort()
    .join('&');

const sortFormString = str =>
  str
    .split('&')
    .sort()
    .join('&');

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
      opt.body = sortJsonObject(options.body);
    } else if (typeof options.form === 'object') {
      opt.body = sortFormObject(options.form);
    } else if (typeof options.form === 'string') {
      opt.body = sortFormString(options.form);
    }
  }

  // if (this.globalOptions.stripFragment) {
  //     opt.uri = opt.uri.replace(/#.*/g, '');
  // }

  return [opt.method, opt.uri, opt.body].join('\r\n');
};

module.exports = normalize;
