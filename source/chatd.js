'use strict';
var bootstrap = require('./bootstrap'),
  ChatSocketCollection = require('./chat-socket-collection');

var socketCollection = new ChatSocketCollection();

bootstrap(function (config, ioSrv) {

  socketCollection.on('chat.*', function () {
    //notify redis
  });

  ioSrv.sockets.on('connection', function (socket) {
    socketCollection.add(socket);
  });
});

