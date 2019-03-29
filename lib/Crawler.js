'use strict';

const { format } = require('util');
const { EventEmitter } = require('events');
const {
  defaultsDeep,
  flattenDeep,
  isArray,
  isBoolean,
  isFunction,
  isNull,
  isUndefined,
  isString,
  isPlainObject
} = require('lodash');
const cheerio = require('cheerio');
const CrawlerGroups = require('./CrawlerGroups');
const got = require('got');
const iconvLite = require('iconv-lite');
const { is: typeis } = require('type-is');
const normalize = require('./ReqNormalizer');

// log level
const [DEBUG, INFO, WARN, ERROR] = [0, 1, 2, 3];
const LEVEL_NAME = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
let logLevel = INFO;

const defaultLog = (level, ...args) => {
  if (logLevel > level) {
    return;
  }
  // eslint-disable-next-line no-console
  console.log(`${new Date().toJSON()} - CRAWLER[${LEVEL_NAME[level]}]: ${format(...args)}`);
};

let log = defaultLog;

const contentType = res => {
  const header = res.headers['content-type'] || '';
  return header
    .split(';')
    .filter(item => item.trim().length !== 0)
    .join(';');
};

const isIllegal = options => {
  return isNull(options) || isUndefined(options) || (!isString(options) && !isPlainObject(options));
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

class Crawler extends EventEmitter {
  constructor(options = {}) {
    super();

    const defaultOptions = {
      forceUTF8: true,
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
      options: {
        timeout: 15000,
        retry: 0,
        encoding: null,
        decompress: true,
        followRedirect: false,
        throwHttpErrors: false
      }
    };

    this.options = defaultsDeep({}, options, defaultOptions);

    logLevel = this.options.debug ? DEBUG : WARN;

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
        return this.emit('drain');
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

  get queueSize() {
    return this.workerGroups.pendingTasks;
  }

  direct(task) {
    if (isIllegal(task) || !isPlainObject(task)) {
      return log(WARN, 'Illegal queue option: ', JSON.stringify(task));
    }

    if (!isFunction(task.callback)) {
      return log(
        WARN,
        'must specify callback function when using sending direct request with crawler'
      );
    }

    const finalTask = defaultsDeep({}, task, this.options);

    // direct request does not follow the global preRequest
    finalTask.preRequest = task.preRequest || null;

    // direct request is not allowed to retry
    finalTask.retries = 0;

    // direct request does not emit event:'request' by default
    finalTask.skipEventRequest = isBoolean(finalTask.skipEventRequest)
      ? finalTask.skipEventRequest
      : true;

    globalOnlyOptions.forEach(globalOnlyOption => delete finalTask[globalOnlyOption]);

    this._buildHttpRequest(finalTask);
  }

  queue(options) {
    // Did you get a single object or string? Make it compatible.
    options = isArray(options) ? options : [options];

    options = flattenDeep(options);

    for (let i = 0, n = options.length; i < n; ++i) {
      if (isIllegal(options[i])) {
        log(WARN, 'Illegal queue option: ', JSON.stringify(options[i]));
        continue;
      }

      const task = isString(options[i]) ? { uri: options[i] } : options[i];

      const finalTask = defaultsDeep({}, task, this.options);

      globalOnlyOptions.forEach(globalOnlyOption => delete finalTask[globalOnlyOption]);

      this._pushToQueue(finalTask);
    }
  }

  _pushToQueue(task) {
    // If duplicate skipping is enabled, avoid queueing entirely for URLs we already crawled
    if (this.options.skipDuplicates && isSeen(this._seenTasks, task)) {
      return;
    }

    this.emit('schedule', task);

    this.workerGroups.group(task.group || 'default').submit(task.priority, done => {
      task.release = () => {
        done();
        this.emit('_release');
      };
      if (!task.callback) {
        task.callback = task.release;
      }

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
    log(DEBUG, task.method || 'GET' + ' ' + task.uri);

    if (task.proxy) {
      log(DEBUG, 'Use proxy: %s', task.proxy);
    }

    const opts = got.mergeOptions(got.defaults.options, task.options);
    // 禁止后续iconv做转码
    if (task.json) {
      task.encoding = null;
      opts.json = task.json;
    }

    if (task.userAgent) {
      if (this.options.rotateUA && isArray(task.userAgent)) {
        opts.headers['User-Agent'] = task.userAgent[0];
        task.userAgent.push(task.userAgent.shift());
      } else {
        opts.headers['User-Agent'] = task.userAgent;
      }
    }
    if (task.method) {
      opts.method = task.method;
    }

    if (task.searchParamss) {
      opts.searchParamss = task.searchParamss;
    }

    const doRequest = err => {
      if (err) {
        err.message = 'Error in preRequest' + (err.message ? ', ' + err.message : err.message);
        switch (err.op) {
          case 'retry':
            log(DEBUG, err.message + ', retry ' + task.uri);
            this._processContent(err, task);
            break;
          case 'fail':
            log(DEBUG, err.message + ', fail ' + task.uri);
            task.callback(err, { task }, task.release);
            break;
          case 'abort':
            log(DEBUG, err.message + ', abort ' + task.uri);
            task.release();
            break;
          case 'queue':
            log(DEBUG, err.message + ', queue ' + task.uri);
            this._pushToQueue(task);
            task.release();
            break;
          default:
            log(DEBUG, err.message + ', retry ' + task.uri);
            this._processContent(err, task);
            break;
        }
        return;
      }

      if (task.skipEventRequest !== true) {
        this.emit('request', opts);
      }

      got(task.uri, opts)
        .then(response => {
          this._processContent(null, task, response);
        })
        .catch(error => {
          this._processContent(error, task);
        });
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
        'Error ' +
          error +
          ' when fetching ' +
          (task.uri || task.url) +
          (task.retries ? ' (' + task.retries + ' retries left)' : '')
      );

      if (task.retries) {
        this.options.skipDuplicates = false;
        setTimeout(() => {
          task.retries--;
          this._pushToQueue(task);
          task.release();
        }, task.retryTimeout);
      } else {
        task.callback(error, { task }, task.release);
      }

      return;
    }

    log(
      DEBUG,
      'Got ' +
        (task.uri || 'html') +
        ' (' +
        (response.body ? response.body.length : '0') +
        ' bytes)...'
    );

    response.task = task;

    this._doEncoding(task, response);

    if (task.method === 'HEAD' || !task.transform) {
      return task.callback(null, response, task.release);
    }

    const transformableTypes = ['html', 'xhtml', 'text/xml', 'application/xml', '+xml'];
    if (!task.html && !typeis(contentType(response), transformableTypes)) {
      log(
        WARN,
        'response body is not HTML, skip transforming. Set transform to false to suppress this message'
      );
      return task.callback(null, response, task.release);
    }

    log(DEBUG, 'transforming');

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
      let cheerioOptions = task.transform.options || defaultCheerioOptions;
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
    if (task.encoding === null || !response.body) {
      return;
    }

    if (task.forceUTF8) {
      const charset = task.incomingEncoding || this._parseCharset(response);
      response.charset = charset;
      log(DEBUG, 'Charset ' + charset);

      if (charset !== 'utf-8' && charset !== 'ascii') {
        // convert response.body into 'utf-8' encoded buffer
        response.body = iconvLite.decode(response.body, charset);
      }
    }

    response.body = response.body.toString();
  }

  _parseCharset(res) {
    const getCharset = str => {
      const charset = ((str && str.match(/charset=['"]?([\w.-]+)/i)) || [0, null])[1];
      return charset && charset.replace(/:\d{4}$|[^0-9a-z]/g, '') == 'gb2312' ? 'gbk' : charset;
    };

    const charsetParser = (header, binary, default_charset = null) => {
      return getCharset(header) || getCharset(binary) || default_charset;
    };

    let charset = charsetParser(contentType(res));
    if (charset) {
      return charset;
    }

    if (!typeis(contentType(res), ['html'])) {
      log(
        DEBUG,
        'Charset not detected in response headers, please specify using `incomingEncoding`, use `utf-8` by default'
      );
      return 'utf-8';
    }

    const body = res.body instanceof Buffer ? res.body.toString() : res.body;
    charset = charsetParser(contentType(res), body, 'utf-8');

    return charset;
  }
}

module.exports = Crawler;
