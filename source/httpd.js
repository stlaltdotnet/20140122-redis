'use strict';
var path = require('path'),
  strata = require('strata');

var PUBLIC_DIR = path.join(__dirname, 'public');

strata.use(strata.file, PUBLIC_DIR);
strata.use(strata.commonLogger);
strata.use(strata.contentType, 'text/html');
strata.use(strata.contentLength);
strata.run();