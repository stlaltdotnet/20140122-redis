'use strict';
var EventEmitter2 = require('eventemitter2').EventEmitter2,
  _ = require('underscore'),
  redis = require('redis'),
  MailBox = require('./mailbox'),
  ChatSocketCollection = require('./chat-socket-collection'),
  Storage = require('./storage')
  ;

var api = {
  listen: function (cb) {
    var self = this;
    /**
     * When a socket connects, add it to the socket collection.
     * Collection handles disconnects automatically.
     */
    this._ioSrv.sockets.on('connection', function (socket) {
      self.chatSockets.add(socket);
    });

    this.mailbox.listen();
    cb(null);
  },

  dispose: function (cb) {
    this.mailbox.dispose();
    this._client.removeListener('error', this._onClientError);
    this._client.quit();
    this._pub.removeListener('error', this._onPubError);
    this._pub.quit();
    this._sub.removeListener('error', this._onSubError);
    this._sub.quit();
    cb(null);
  },

  _onClientError: function (err) {
    console.warn('redis client down', err);
  },

  _onSubError: function () {
    console.warn('redis sub down');
  },

  _onPubError: function () {
    console.warn('redis pub down');
  }
};

module.exports = function (config, ioSrv) {
  var inst = Object.create(new EventEmitter2());
  inst = _.extend(inst, api);
  _.bindAll(inst,
    '_onClientError',
    '_onPubError',
    '_onSubError'
  );

  inst.config = config;
  inst._ioSrv = ioSrv;

  inst._client = redis.createClient(config.redis.port, config.redis.host);
//  inst._client.on('error', inst._onClientError);

  inst._pub = redis.createClient(config.redis.port, config.redis.host);
  inst._pub.on('error', inst._onPubError);

  inst._sub = redis.createClient(config.redis.port, config.redis.host);
  inst._sub.on('error', inst._onSubError);

  inst.mailbox = new MailBox(config, inst._pub, inst._sub);
  inst.chatSockets = new ChatSocketCollection(config);
  inst.storage = new Storage(config, inst._client);

  return inst;
};