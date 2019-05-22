'use strict';

const isBoolean = value => value === true || value === false || value instanceof Boolean;

const isFunction = value => typeof value === 'function';

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

module.exports = {
  isBoolean,
  isFunction,
  isString,
  isObject,
  contentType,
  mergeOptions
};
