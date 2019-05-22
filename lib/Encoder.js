'use strict';

const iconvLite = require('iconv-lite');
const { contentType, typeis } = require('./Util');

const getCharset = str => {
  const charset = ((str && str.match(/charset=['"]?([\w.-]+)/i)) || [0, null])[1];
  return charset && charset.replace(/:\d{4}$|[^0-9a-z]/g, '') === 'gb2312' ? 'gbk' : charset;
};

const charsetParser = (header, binary, default_charset = null) =>
  getCharset(header) || getCharset(binary) || default_charset;

const parseCharset = res => {
  let charset = charsetParser(contentType(res));
  if (charset) {
    return charset;
  }

  if (!typeis(contentType(res), ['html'])) {
    return 'utf-8';
  }

  return charsetParser(contentType(res), res.body.toString(), 'utf-8');
};

const encoding = (task, response) => {
  if (task.raw || !response.body || !(response.body instanceof Buffer)) {
    return;
  }

  const charset = task.incomingEncoding || parseCharset(response);
  response.charset = charset;

  if (task.forceUTF8 && charset !== 'utf-8' && charset !== 'ascii') {
    response.body = iconvLite.decode(response.body, charset);
  }

  response.body = response.body.toString();
};

module.exports = encoding;
