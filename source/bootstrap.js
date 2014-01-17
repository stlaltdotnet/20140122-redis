'use strict';
var async = require('async'),
  io = require('socket.io'),
  redis = require('redis');

module.exports = function (cb) {

  // probably read from a config file
  var config = {
    ioPort: 8090,
    redisPort: 6379,
    redisHost: 'localhost',
    instanceID: ''
  };

  var client = redis.createClient(config.redisPort, config.redisHost);

  function getInstanceID(cb) {
    /**
     * Increment the key to get a unique ID for this instance
     */
    client.incr('altnet.autoid', function (err, id) {
      if (err) { return cb(err); }
      config.instanceID = 'altnet-' + id;
      cb(null, config);
    });
  }

  function registerInstance(config, cb) {
    /**
     * Add the instance ID to the instance set
     */
    client.sadd('altnet.instances', config.instanceID, function (err) {
      cb(err, config);
    });
  }

  function setUpSocketIO(config, cb) {
    var ioSrv = io.listen(config.ioPort);
    ioSrv.configure('demo', function(){
      ioSrv.set('transports', ['websocket']);
    });
    cb(null, ioSrv);
  }

  async.waterfall([
    getInstanceID,
    registerInstance,
    setUpSocketIO
  ], function (err, ioSrv) {
    client.quit();
    if (err) {
      console.error('error bootstrapping chatd', err);
      return process.exit(1);
    }
    cb(config, ioSrv);
  });

};