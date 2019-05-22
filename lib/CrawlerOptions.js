'use strict';

const globalOnlyOptions = [
  'maxConnections',
  'rateLimit',
  'priorityRange',
  'skipDuplicates',
  'rotateUA'
];

const defaultOptions = {
  forceUTF8: false,
  incomingEncoding: null,
  transform: true,
  maxConnections: 10,
  priority: 5,
  priorityRange: 10,
  rateLimit: 0,
  retries: 3,
  retryTimeout: 10000,
  skipDuplicates: false,
  rotateUA: false,
  raw: false,
  options: {
    timeout: 15000,
    retry: 0,
    encoding: null,
    decompress: true,
    followRedirect: false,
    throwHttpErrors: false
  }
};

module.exports = {
  globalOnlyOptions,
  defaultOptions
};
