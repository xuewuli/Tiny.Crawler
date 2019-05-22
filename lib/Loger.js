'use strict';

const { format } = require('util');
const [DEBUG, INFO, WARN, ERROR] = [0, 1, 2, 3];
const LEVEL_NAME = ['DEBUG', 'INFO', 'WARN', 'ERROR'];

let logLevel = INFO;

const setLogLevel = level => {
  logLevel = level;
};

const defaultLog = (level, ...args) => {
  if (logLevel > level) {
    return;
  }
  process.stdout.write(
    `${new Date().toJSON()} - CRAWLER[${LEVEL_NAME[level]}]: ${format(...args)}\n`
  );
};

module.exports = {
  defaultLog,
  setLogLevel,
  LOG_LEVEL: [DEBUG, INFO, WARN, ERROR],
  LEVEL_NAME
};
