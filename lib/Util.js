'use strict';

const { is: typeis } = require('type-is');

const normalize = require('./ReqNormalizer');

const isBoolean = value => value === true || value === false || value instanceof Boolean;

const isString = value => typeof value === 'string';

const isObject = value => typeof value === 'object';

const contentType = res =>
  (res.headers['content-type'] || '')
    .split(';')
    .filter(item => item.trim().length !== 0)
    .join(';');

const mergeOptions = (target, source) => {
  const merged = Object.assign({}, source, target);
  merged.options = Object.assign({}, source.options, target.options);
  return merged;
};

const isSeen = (seenTasks, task) => {
  const n = normalize(task);
  const have = seenTasks[n];
  seenTasks[n] = true;
  return have;
};

module.exports = {
  isBoolean,
  isString,
  isObject,
  contentType,
  mergeOptions,
  isSeen,
  typeis
};
