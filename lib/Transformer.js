'use strict';

const cheerio = require('cheerio');

const transform = (response, task, callback) => {
  let $ = undefined;

  if (typeof task.transform === 'function') {
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

  response.$ = $;

  callback(null, response, task);
};

module.exports = transform;
