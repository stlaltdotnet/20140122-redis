'use strict';
var _ = require('underscore'),
  EventEmitter2 = require('eventemitter2').EventEmitter2,
  ChatSocket = require('./chat-socket');

var api = {
  add: function (socket) {
    var chatSocket = new ChatSocket(socket);
    this._chatSockets.push(chatSocket);
    chatSocket.on('chat.signedIn', this._onChatSocketSignedIn.bind(this));
    chatSocket.on('chat.signedOut', this._onChatSocketSignedOut.bind(this));
    chatSocket.on('chat.messaged', this._onChatSocketMessaged.bind(this));
    chatSocket.on('chat.disconnected', this._onChatSocketDisconnected.bind(this, chatSocket));
  },

  // methods to RECEIVE events from sockets

  _onChatSocketSignedIn: function (userID) {
    this.signIn(userID);
  },
  _onChatSocketSignedOut: function (userID) {
    this.signOut(userID);
  },
  _onChatSocketMessaged: function (to, from, content) {
    this.message(to, from, content);
  },
  _onChatSocketDisconnected: function (chatSocket) {
    var index = this._chatSockets.indexOf(chatSocket);
    if (index < 0) {
      return;
    }
    this._chatSockets.splice(index, 1);
  },

  // methods to EMIT events to sockets

  _broadcastRosterChange: function () {
    var self = this;
    _.chain(this._chatSockets)
      .filter(function (chatSocket) {
        return chatSocket.isSignedIn();
      })
      .each(function (chatSocket) {
        var roster = _.without(self._roster, chatSocket.userID);
        chatSocket.send('chat.roster.changed', roster);
      })
      .value();
  },
  signIn: function (userID) {
    this._roster = _.union(this._roster, [userID]);
    this._broadcastRosterChange();
  },
  signOut: function (userID) {
    this._roster = _.without(this._roster, userID);
    this._broadcastRosterChange();
  },
  message: function (to, from, content) {
    var chatSocket = _.find(this._chatSockets, function (chatSocket) {
      return chatSocket.userID === to;
    });
    if (!chatSocket) {
      console.warn('cannot find socket; dropping message');
      return;
    }
    chatSocket.send('chat.message', from, content);
  },

  length: function () {
    return this._chatSockets.length;
  }
};

module.exports = function ChatSocketCollection() {
  var inst = Object.create(new EventEmitter2());
  inst = _.extend(inst, api);

  inst._chatSockets = [];
  inst._roster = [];

  return inst;
};