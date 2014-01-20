'use strict';
var async = require('async'),
  io = require('socket.io'),
  fs = require('fs'),
  App = require('./app')
  ;

module.exports = function (configFilePath, cb) {

  console.info('using config file', configFilePath);

  function readConfig(cb) {
    fs.readFile(configFilePath, function (err, buffer) {
      if (err) {
        return cb(err);
      }
      var json;
      try {
        json = JSON.parse(buffer.toString());
      } catch (ex) {
        err = ex;
      }
      cb(err, json);
    });
  }

  function setUpSocketIO(config, cb) {
    var ioSrv = io.listen(config.socketio.port);
    ioSrv.configure('demo', function(){
      ioSrv.set('transports', ['websocket']);
    });
    cb(null, config, ioSrv);
  }

  function createApp(config, ioSrv, cb) {
    var app = new App(config, ioSrv);
    process.on('SIGINT', function () {
      app.dispose(function (err) {
        if (err) {
          console.error(err);
          return process.exit(1);
        }
        process.exit(0);
      });
    });
    cb(null, app);
  }

  async.waterfall([
    readConfig,
    setUpSocketIO,
    createApp
  ], function (err, app) {
    if (err) {
      console.error('error bootstrapping chatd', err);
      return process.exit(1);
    }
    cb(null, app);
  });

};