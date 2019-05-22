'use strict';

const qs = require('querystring');
const url = require('url');

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
  const method = options.method || 'GET';

  let uri = req.uri;
  let body = null;

  const searchParams = options.searchParams;
  if (searchParams && !url.parse(uri).search) {
    const params = typeof searchParams === 'object' ? qs.stringify(searchParams) : searchParams;
    uri = [uri, params].join('?');
  }

  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    if (options.json && typeof options.body === 'object') {
      body = sortJsonObject(options.body);
    } else if (typeof options.form === 'object') {
      body = sortFormObject(options.form);
    } else if (typeof options.form === 'string') {
      body = sortFormString(options.form);
    }
  }

  // if (this.globalOptions.stripFragment) {
  //     opt.uri = opt.uri.replace(/#.*/g, '');
  // }

  return [method, uri, body].join('\r\n');
};

module.exports = normalize;
