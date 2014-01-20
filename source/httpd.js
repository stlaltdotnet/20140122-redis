'use strict';
var path = require('path'),
  fs = require('fs'),
  strata = require('strata'),
  async = require('async')
  ;

var PUBLIC_DIR = path.join(__dirname, 'public'),
  CONFIG_FILE = process.argv[2] || 'httpdconfig.json',
  CONFIG_FILE_PATH = path.join(__dirname, CONFIG_FILE);

function readConfig(cb) {
  fs.readFile(CONFIG_FILE_PATH, cb);
}

function parseConfig(buffer, cb) {
  var err, json;
  try {
    json = JSON.parse(buffer.toString());
  } catch (ex) {
    err = ex;
  }
  cb(err, json);
}

async.waterfall([
  readConfig,
  parseConfig
], function (err, config) {
  if (err) {
    console.error('error starting http server', err);
    return process.exit(1);
  }
  strata.use(strata.file, PUBLIC_DIR);
  strata.use(strata.commonLogger);
  strata.use(strata.contentType, 'text/html');
  strata.use(strata.contentLength);
  strata.run({port: config.http.port});
});

