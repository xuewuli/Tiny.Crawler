const isBoolean = value => value === true || value === false || value instanceof Boolean;

const isFunction = value => typeof value === 'function';

const isString = value => typeof value === 'string';

const isObject = value => typeof value === 'object';

module.exports = {
  isBoolean,
  isFunction,
  isString,
  isObject
};
