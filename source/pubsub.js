'use strict';
var redis = require('redis'),
  EventEmitter2 = require('eventemitter2').EventEmitter2,
  _ = require('underscore');

var api = {
  _onSubReady: function () {
    this._canSub = true;
  },
  _onSubError: function () {
    this._canSub = false;
    console.warn('redis subscription down');
  },
  _onSubMessage: function (channel, message) {

  },
  _onPubReady: function () {
    this._canPub = true;
    this._flushQueue();
  },
  _onPubError: function () {
    this._canPub = false;
    console.warn('redis publication down');
  },
  broadcast: function () {

  },
  _flushQueue: function () {

  }
};

module.exports = function () {
  var inst = Object.create(new EventEmitter2());
  inst = _.extend(inst, api);

  inst._pubQueue = [];
  inst._canSub = false;
  inst._canPub = false;

  inst._sub = redis.createClient(6379, 'localhost');
  inst._sub.on('ready', inst._onSubReady.bind(inst));
  inst._sub.on('error', inst._onSubError.bind(inst));
  inst._sub.on('message', inst._onSubMessage.bind(inst));

  inst._pub = redis.createClient(6379, 'localhost');
  inst._pub.on('ready', inst._onPubReady.bind(inst));
  inst._pub.on('error', inst._onPubError.bind(inst));

  return inst;
};