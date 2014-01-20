'use strict';
var EventEmitter2 = require('eventemitter2').EventEmitter2,
  _ = require('underscore');

var api = {
  listen: function () {
    this._sub.on('message', this._onSubMessage);
    this._sub.subscribe(this._subChannel);
    this._pub.on('ready', this._onPubReady);
    this._pub.on('error', this._onPubError);
  },
  dispose: function () {
    this._sub.unsubscribe(this._subChannel);
    this._sub.removeListener('message', this._onSubMessage);
    this._canPub = false;
    this._pub.removeListener('ready', this._onPubReady);
    this._pub.removeListener('error', this._onPubError);
    this._pubChannels = {};
  },
  send: function (instance, event, message) {
    var envelope = {
      origin: this._instanceID,
      event: event,
      payload: message
    };
    var channel = 'chat:%1'.replace('%1', instance);
    this._queueMessage(channel, envelope);
    this._flushQueue();
  },
  _queueMessage: function (channel, envelope) {
    if (!_.has(this._pubChannels, channel)) {
      this._pubChannels[channel] = [];
    }
    this._pubChannels[channel].push(JSON.stringify(envelope));
  },
  _flushQueue: function () {
    if (!this._canPub) {
      return;
    }
    var self = this;
    Object.keys(this._pubChannels).forEach(function (channel) {
      var messages = self._pubChannels[channel];
      messages.forEach(function (message) {
        self._pub.publish(channel, message);
      });
      self._pubChannels[channel] = [];
    });
  },
  _onSubMessage: function (channel, message) {
    var json;
    try {
      json = JSON.parse(message);
      // only process messages NOT from me
      if (message.origin === this._instanceID) {
        return;
      }
      this.emit(json.event || 'message', json.payload);
    } catch (ex) {
      console.error('unable to parse pubsub message', message);
    }
  },
  _onPubReady: function () {
    this._canPub = true;
    this._flushQueue();
  },
  _onPubError: function () {
    this._canPub = false;
    console.warn('redis publication down');
  }
};

module.exports = function (config, pub, sub) {
  var inst = Object.create(new EventEmitter2());
  inst = _.extend(inst, api);
  _.bindAll(inst,
    '_onSubMessage',
    '_onPubReady',
    '_onPubError'
  );

  inst._instanceID = config.instance.id;

  inst._subChannel = 'chat:%1'.replace('%1', inst._instanceID);
  inst._sub = sub;

  inst._canPub = false;
  inst._pubChannels = {};
  inst._pub = pub;
  inst._pub.on('ready', inst._onPubReady);
  inst._pub.on('error', inst._onPubError);

  return inst;
};