'use strict';

const { EventEmitter } = require('events');
const got = require('got');
const cheerio = require('cheerio');
const iconvLite = require('iconv-lite');
const { is: typeis } = require('type-is');

const { isBoolean, isFunction, isString, isObject, contentType, mergeOptions } = require('./Util');
const { setLogLevel, defaultLog, LOG_LEVEL } = require('./Loger');
const CrawlerGroups = require('./CrawlerGroups');
const normalize = require('./ReqNormalizer');

const [DEBUG, INFO, WARN, ERROR] = LOG_LEVEL;
let log = defaultLog;

const isIllegal = options => {
  return options === null || options === undefined || (!isString(options) && !isObject(options));
};

const isSeen = (seenTasks, task) => {
  const n = normalize(task);
  const have = seenTasks[n];
  seenTasks[n] = true;
  return have;
};

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

class Crawler extends EventEmitter {
  constructor(options = {}) {
    super();

    this.options = mergeOptions(options, defaultOptions);

    setLogLevel(this.options.debug ? DEBUG : WARN);

    if (this.options.logger) {
      log = this.options.logger.log.bind(this.options.logger);
    }

    this.workerGroups = new CrawlerGroups(
      this.options.maxConnections,
      this.options.rateLimit,
      this.options.priorityRange,
      this.options.priority
    );

    this._seenTasks = {};

    this.on('_release', () => {
      log(DEBUG, 'Queue size: %d', this.queueSize);

      if (this.workerGroups.empty) {
        this.emit('drain');
      }
    });
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

  shrink() {
    const workerGroups = this.workerGroups;
    if (workerGroups.empty) {
      workerGroups.groups().forEach(group => {
        workerGroups.deleteGroup(group);
      });
    }
  }

  get queueSize() {
    return this.workerGroups.pendingTasks;
  }

  direct(task) {
    if (isIllegal(task)) {
      log(WARN, 'Illegal task option: ', JSON.stringify(task));
      return;
    }

    if (!isFunction(task.callback)) {
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

  get status() {
    return this.workerGroups.status();
  }

  _pushToQueue(task) {
    if (this.options.skipDuplicates && isSeen(this._seenTasks, task)) {
      return;
    }

    this.emit('schedule', task);

    this.workerGroups.group(task.group || 'default').submit(task.priority, done => {
      task.release = () => {
        done();
        this.emit('_release');
      };

      task.callback = task.callback || task.release;

      if (task.html) {
        this._processContent(null, task, {
          body: task.html,
          headers: { 'content-type': 'text/html' }
        });
      } else if (typeof task.uri === 'function') {
        task.uri(uri => {
          task.uri = uri;
          this._buildHttpRequest(task);
        });
      } else {
        this._buildHttpRequest(task);
      }
    });
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

    const doRequest = async err => {
      if (err) {
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
            this._processContent(err, task);
            break;
        }

        log(DEBUG, `op: ${err.op} uri: ${task.uri} msg: ${err.message}`);
        return;
      }

      if (task.skipEventRequest !== true) {
        this.emit('request', opts);
      }

      try {
        const response = await got(task.uri, opts);
        this._processContent(null, task, response);
      } catch (error) {
        this._processContent(error, task);
      }
    };

    if (isFunction(task.preRequest)) {
      task.preRequest(task, doRequest);
    } else {
      doRequest();
    }
  }

  _processContent(error, task, response) {
    if (error) {
      log(
        ERROR,
        `Error ${error} when fetching ${task.uri}${
          task.retries ? ` (${task.retries} retries left)` : ''
        }`
      );

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

      return;
    }

    log(DEBUG, `Got ${task.uri || 'html'} (${response.body ? response.body.length : '0'}) bytes)`);

    response.task = task;

    this._doEncoding(task, response);

    if (task.options.method === 'HEAD' || !task.transform) {
      task.callback(null, response, task.release);
      return;
    }

    const transformableTypes = ['html', 'xhtml', 'text/xml', 'application/xml', '+xml'];
    if (!task.html && !typeis(contentType(response), transformableTypes)) {
      log(WARN, 'response body is not HTML, skip transforming.');
      task.callback(null, response, task.release);
      return;
    }

    this._transform(response, task, this._transformed);
  }

  _transform(response, task, callback) {
    let $ = undefined;

    if (isFunction(task.transform)) {
      $ = task.transform(response.body);
    } else if (task.transform) {
      const defaultCheerioOptions = {
        normalizeWhitespace: false,
        xmlMode: false,
        decodeEntities: true
      };
      const cheerioOptions = task.transform.options || defaultCheerioOptions;
      $ = cheerio.load(response.body, cheerioOptions);
    }

    callback(null, response, task, $);
  }

  _transformed(errors, response, task, $) {
    log(DEBUG, 'transformed');

    response.$ = $;
    task.callback(errors, response, task.release);
  }

  _doEncoding(task, response) {
    if (task.raw || !response.body || !(response.body instanceof Buffer)) {
      return;
    }

    const charset = task.incomingEncoding || this._parseCharset(response);
    response.charset = charset;
    log(DEBUG, 'Charset ' + charset);

    if (task.forceUTF8 && charset !== 'utf-8' && charset !== 'ascii') {
      response.body = iconvLite.decode(response.body, charset);
    }

    response.body = response.body.toString();
  }

  _parseCharset(res) {
    const getCharset = str => {
      const charset = ((str && str.match(/charset=['"]?([\w.-]+)/i)) || [0, null])[1];
      return charset && charset.replace(/:\d{4}$|[^0-9a-z]/g, '') === 'gb2312' ? 'gbk' : charset;
    };

    const charsetParser = (header, binary, default_charset = null) => {
      return getCharset(header) || getCharset(binary) || default_charset;
    };

    let charset = charsetParser(contentType(res));
    if (charset) {
      return charset;
    }

    if (!typeis(contentType(res), ['html'])) {
      log(DEBUG, 'Charset not detected in response headers, use `utf-8` by default');
      return 'utf-8';
    }

    return charsetParser(contentType(res), res.body.toString(), 'utf-8');
  }
}

module.exports = Crawler;
