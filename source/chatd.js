'use strict';
var path = require('path'),
  bootstrap = require('./bootstrap'),
  async = require('async'),
  _ = require('underscore')
  ;

var configFilePath = path.join(__dirname, 'chatdconfig.json');

bootstrap(configFilePath, function (err, app) {

  var instanceID = app.config.instance.id;

  // SEND

  app.chatSockets.on('roster.changed', function (roster) {
    console.info('chatSockets^roster.changed');

    function updateRoster(cb) {
      app.storage.setRoster(roster, function (err) {
        cb(err);
      });
    }

    function getOtherInstances(cb) {
      app.storage.getInstances(function handleGetInstances (err, instances) {
        if (err) {
          return cb(err);
        }
        instances = _.without(instances, instanceID);
        cb(null, instances);
      });
    }

    function notifyInstances(instances, cb) {
      _.each(instances, function (instance) {
        app.mailbox.send(instance, 'roster.changed', instanceID);
      });
      cb(null);
    }

    async.waterfall([
      updateRoster,
      getOtherInstances,
      notifyInstances
    ], function (err) {
      if (err) {
        console.error('unable to change roster', err);
      }
    });
  });

  app.chatSockets.on('chat.event', function (message) {
    console.info('chatSockets^chat.event');
    function getRosters(cb) {
      app.storage.getRosters(cb);
    }

    function getRecipientInstances(rosters, cb) {
      console.info('getRecipientInstances', arguments);
      var instances = [],
        sendToAll = (message.to === '*');
      _.each(rosters, function (members, instanceID) {
        if (sendToAll || _.contains(members, message.to)) {
          instances.push(instanceID);
        }
      });
      // exclude this instance
      instances = _.without(instances, instanceID);
      cb(null, instances);
    }

    function storeInstanceMessage(instances, cb) {
      console.info('storeInstanceMessage', arguments);
      app.storage.storeMessage(instances, message, function (err) {
        cb(err, instances);
      });
    }

    function notifyInstances(instances, cb) {
      console.info('notifyInstances', arguments);
      instances.forEach(function (instance) {
        app.mailbox.send(instance, 'new.messages', {});
      });
      cb(null);
    }

    async.waterfall([
      getRosters,
      getRecipientInstances,
      storeInstanceMessage,
      notifyInstances
    ], function (err) {
      if (err) {
        return console.error('unable to send chat messages', err);
      }
    });
  });

  // RECEIVE

  app.mailbox.on('new.messages', function () {
    console.info('mailbox^new.messages');

    function sendToSockets(message) {
      // message.handler is the function on the socket collection to invoke
      var handler = app.chatSockets[message.handler];
      if (!handler) {
        return console.warn('socket collection handler %s does not exist', handler);
      }

      // message.parameters is an array of arguments to pass to the handler
      handler.apply(app.chatSockets, message.parameters);
    }

    app.storage.getMessages(function (err, messages) {
      if (err) {
        return console.error('error getting messages', err);
      }
      messages.forEach(sendToSockets);
    });
  });

  app.mailbox.on('roster.changed', function (instanceID) {
    console.info('mailbox^roster.changed', instanceID);

    app.storage.getRoster(instanceID, function (err, userIDs) {
      if (err) {
        return console.error('error fetching instance roster', instanceID, err);
      }
      app.chatSockets.updateRoster(instanceID, userIDs);
    });
  });

  app.listen(function () {
    app.storage.getRosters(function (err, rosters) {
      if (err) {
        return console.error('error fetching rosters', err);
      }
      app.chatSockets.updateRosters(rosters);
      console.log('listening...');
    });
  });
});

