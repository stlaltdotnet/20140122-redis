'use strict';
var _ = require('underscore'),
	EventEmitter2 = require('eventemitter2').EventEmitter2;

var api = {
	isSignedIn: function () {
		return this._isSignedIn;
	},
	_onSocketSignedIn: function (userID) {
		this.userID = userID;
		this._isSignedIn = true;
		this.emit('chat.signedIn', this.userID);
	},
	_onSocketSignedOut: function () {
		this._isSignedIn = false;
		this.emit('chat.signedOut', this.userID);
	},
	_onSocketMessaged: function (to, content) {
		this.emit('chat.messaged', to, this.userID, content);
	},
	_onChatSocketDisconnected: function () {
		this._isSignedIn = false;
		this.emit('chat.signedOut', this.userID);
		this.emit('chat.disconnected', this.userID);
	},
	send: function (/*event, arguments...*/) {
    var args = Array.prototype.slice.call(arguments, 0);
		this.socket.emit.apply(this.socket, args);
	}
};

module.exports = function ChatSocket (socket) {
	var inst = Object.create(new EventEmitter2());
	inst = _.extend(inst, api);

	inst.socket = socket;
	inst.userID = '';
	inst._isSignedIn = false;

	socket.on('chat.signedIn', inst._onSocketSignedIn.bind(inst));
	socket.on('chat.signedOut', inst._onSocketSignedOut.bind(inst));
	socket.on('chat.messaged', inst._onSocketMessaged.bind(inst));
	socket.on('disconnect', inst._onChatSocketDisconnected.bind(inst));

	return inst;
};