'use strict';

const { EventEmitter } = require('events');
const got = require('got');

const util = require('./Util');
const { isBoolean, isString, isObject, contentType, mergeOptions, isSeen, typeis } = util;
const encoder = require('./Encoder');
const transformer = require('./Transformer');
const { defaultOptions, globalOnlyOptions } = require('./CrawlerOptions');
const { setLogLevel, defaultLog, LOG_LEVEL } = require('./Loger');
const CrawlerGroups = require('./CrawlerGroups');

const [DEBUG, , WARN, ERROR] = LOG_LEVEL;
let log = defaultLog;

const isIllegal = options =>
  options === null || options === undefined || (!isString(options) && !isObject(options));

class Crawler extends EventEmitter {
  constructor(options = {}) {
    super();

    this.options = mergeOptions(options, defaultOptions);

    setLogLevel(this.options.debug ? DEBUG : WARN);

    if (this.options.logger) {
      log = this.options.logger.log.bind(this.options.logger);
    }

    this.workerGroups = new CrawlerGroups(this.options);

    this._seenTasks = {};

    this.on('_release', () => this.workerGroups.empty && this.emit('drain'));
  }

  direct(task) {
    if (isIllegal(task)) {
      log(WARN, 'Illegal task option: ', JSON.stringify(task));
      return;
    }

    if (typeof task.callback !== 'function') {
      log(WARN, 'must specify callback function when using direct request with crawler');
      return;
    }

    const finalTask = mergeOptions(task, this.options);

    finalTask.preRequest = task.preRequest || null;

    finalTask.retries = 0;

    finalTask.skipEventRequest = isBoolean(finalTask.skipEventRequest)
      ? finalTask.skipEventRequest
      : true;

    globalOnlyOptions.forEach(globalOnlyOption => delete finalTask[globalOnlyOption]);

    this._buildHttpRequest(finalTask);
  }

  queue(options) {
    options = Array.isArray(options) ? options : [options];

    for (let i = 0, n = options.length; i < n; ++i) {
      if (isIllegal(options[i])) {
        log(WARN, 'Illegal queue option: ', JSON.stringify(options[i]));
        continue;
      }

      const task = isString(options[i]) ? { uri: options[i] } : options[i];

      const finalTask = mergeOptions(task, this.options);

      globalOnlyOptions.forEach(globalOnlyOption => delete finalTask[globalOnlyOption]);

      this._pushToQueue(finalTask);
    }
  }

  shrink() {
    const workerGroups = this.workerGroups;
    if (!workerGroups.empty) {
      return;
    }

    workerGroups.groups().forEach(group => workerGroups.deleteGroup(group));

    this._seenTasks = {};
  }

  get queueSize() {
    return this.workerGroups.pendingTasks;
  }

  get status() {
    return this.workerGroups.status();
  }

  setGroupProperty(group, property, value) {
    switch (property) {
      case 'rateLimit':
        this.workerGroups.group(group).setRateLimit(value);
        break;
      default:
        break;
    }
  }

  _pushToQueue(task) {
    if (this.options.skipDuplicates && isSeen(this._seenTasks, task)) {
      return;
    }

    this.emit('schedule', task);

    const process = done => {
      task.release = () => (done(), this.emit('_release'));

      task.callback = task.callback || task.release;

      if (typeof task.uri === 'function') {
        task.uri(uri => ((task.uri = uri), this._buildHttpRequest(task)));
      } else {
        this._buildHttpRequest(task);
      }
    };

    this.workerGroups.group(task.group || 'default').submit(task.priority, process);
  }

  _handlPreRequestError(err, task) {
    err.message = `Error in preRequest, ${err.message}`;
    switch (err.op) {
      case 'fail':
        task.callback(err, { task }, task.release);
        break;
      case 'abort':
        task.release();
        break;
      case 'queue':
        this._pushToQueue(task);
        task.release();
        break;
      default:
        this._handlProcessError(err, task);
        break;
    }

    log(DEBUG, `op: ${err.op} uri: ${task.uri} msg: ${err.message}`);
  }

  async _doRequest(task, opts) {
    if (task.skipEventRequest !== true) {
      this.emit('request', opts);
    }

    try {
      const response = await got(task.uri, opts);
      this._processContent(response, task);
    } catch (error) {
      this._handlProcessError(error, task);
    }
  }

  _buildHttpRequest(task) {
    log(DEBUG, `${task.options.method || 'GET'} ${task.uri}`);

    const opts = got.mergeOptions(got.defaults.options, task.options);

    if (task.userAgent) {
      if (this.options.rotateUA && Array.isArray(task.userAgent)) {
        opts.headers['user-agent'] = task.userAgent[0];
        task.userAgent.push(task.userAgent.shift());
      } else {
        opts.headers['user-agent'] = task.userAgent;
      }
    }

    if (typeof task.preRequest === 'function') {
      const process = err =>
        err ? this._handlPreRequestError(err, task) : this._doRequest(task, opts);
      task.preRequest(task, process);
    } else {
      this._doRequest(task, opts);
    }
  }

  _handlProcessError(error, task) {
    log(ERROR, `Error ${error} when fetching ${task.uri} (${task.retries} retries left)`);

    if (!task.retries) {
      task.callback(error, { task }, task.release);
      return;
    }

    this.options.skipDuplicates = false;
    setTimeout(() => {
      task.retries--;
      this._pushToQueue(task);
      task.release();
    }, task.retryTimeout);
  }

  _processContent(response, task) {
    log(DEBUG, `Got ${response.body ? response.body.length : '0'} bytes from ${task.uri}`);

    response.task = task;

    encoder(task, response);

    if (task.options.method === 'HEAD' || !task.transform) {
      task.callback(null, response, task.release);
      return;
    }

    const transformableTypes = ['html', 'xhtml', 'text/xml', 'application/xml', '+xml'];
    if (!typeis(contentType(response), transformableTypes)) {
      log(WARN, 'response body is not HTML, skip transforming.');
      task.callback(null, response, task.release);
      return;
    }

    transformer(response, task, (errors, response, task) => {
      task.callback(errors, response, task.release);
    });
  }
}

module.exports = Crawler;
