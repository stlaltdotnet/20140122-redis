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
    this.emit('chat.event', {
      to: '*',
      handler: 'signIn',
      parameters: [userID]
    });
    this.emit('roster.changed', this._rosters[this._instanceID]);
  },

  _onChatSocketSignedOut: function (userID) {
    this.signOut(userID);
    this.emit('chat.event', {
      to: '*',
      handler: 'signOut',
      parameters: [userID]
    });
    this.emit('roster.changed', this._rosters[this._instanceID]);
  },

  _onChatSocketMessaged: function (to, from, content) {
    this.message(to, from, content);
    this.emit('chat.event', {
      to: to,
      handler: 'message',
      parameters: [to, from, content]
    });
  },

  _onChatSocketDisconnected: function (chatSocket) {
    var index = this._chatSockets.indexOf(chatSocket);
    if (index < 0) {
      return;
    }
    this._chatSockets.splice(index, 1);
  },

  // methods to EMIT events to sockets

  signIn: function (userID) {
    this._addToInstanceRoster(userID);
    this._notifyRosterChange();
  },

  signOut: function (userID) {
    this._removeFromInstanceRoster(userID);
    this._notifyRosterChange();
  },

  message: function (to, from, content) {
    var chatSocket = _.find(this._chatSockets, function (chatSocket) {
      return chatSocket.userID === to;
    });
    if (!chatSocket) {
      //user is not on this server
      return;
    }
    chatSocket.send('chat.message', from, content);
  },

  updateRosters: function (rosters) {
    var self = this;
    Object.keys(rosters).forEach(function (instanceID) {
      if (instanceID === self._instanceID) {
        return;
      }
      self._rosters[instanceID] = rosters[instanceID];
    });
    this._notifyRosterChange();
  },

  updateRoster: function (instanceID, userIDs) {
    if (instanceID === this._instanceID) {
      return;
    }
    this._rosters[instanceID] = userIDs;
    this._notifyRosterChange();
  },

  _notifyRosterChange: function () {
    var mergedRosters = this._mergeRosters();

    return _.chain(this._chatSockets)
      .filter(function (chatSocket) {
        return chatSocket.isSignedIn();
      })
      .each(function (chatSocket) {
        var roster = _.without(mergedRosters, chatSocket.userID);
        chatSocket.send('roster.changed', roster);
      })
      .value();
  },

  _mergeRosters: function () {
    return _.chain(this._rosters)
      .values()
      .flatten()
      .uniq()
      .value()
      .sort();
  },

  _addToInstanceRoster: function (userID) {
    if (!userID) {
      return;
    }
    this._rosters[this._instanceID] =
      _.union(this._rosters[this._instanceID], [userID]);
  },

  _removeFromInstanceRoster: function (userID) {
    if (!userID) {
      return;
    }
    this._rosters[this._instanceID] =
      _.without(this._rosters[this._instanceID], userID);
  }
};

module.exports = function ChatSocketCollection(config) {
  var inst = Object.create(new EventEmitter2());
  inst = _.extend(inst, api);

  inst._instanceID = config.instance.id;
  inst._chatSockets = [];
  inst._rosters = {};
  inst._rosters[inst._instanceID] = [];

  return inst;
};