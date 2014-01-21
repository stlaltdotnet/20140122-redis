'use strict';
var _ = require('underscore'),
  EventEmitter2 = require('eventemitter2').EventEmitter2,
  async = require('async')
  ;

function evenIndices(item, index) {
  return index % 2 === 0;
}

var api = {
  setRoster: function (roster, cb) {
    var instance = this._instanceID;
    // will persist as a comma-deliminted string
    this._client.hset('altnet:rosters', instance, roster, cb);
  },

  getRosters: function (cb) {
    this._client.hgetall('altnet:rosters', function (err, rosters) {
      if (err) {
        return cb(err);
      }
      rosters = rosters || {};
      // turn each comma-delimited string into an array
      Object.keys(rosters).forEach(function (instanceID) {
        rosters[instanceID] = rosters[instanceID].split(',');
      });
      cb(null, rosters);
    });
  },

  getRoster: function (instance, cb) {
    this._client.hget('altnet:rosters', instance, function (err, roster) {
      try {
        if (err) {
          return cb(err);
        }
        roster = roster || [];
        cb(null, roster.split(','));
      } catch (ex) {
        console.error(ex);
      }
    });
  },

  getInstances: function (cb) {
    try {
      this._client.hkeys('altnet:rosters', cb);
    } catch (ex) {
      console.error(ex);
    }
  },

  storeMessage: function (instances, message, cb) {
    if (!instances.length) {
      return;
    }

    var client = this._client;

    var err;
    try {
      message = JSON.stringify(message);
    } catch (ex) {
      err = ex;
    }
    if (err) {
      return cb(err);
    }

    function getStartID(cb) {
      client.incrby('altnet:autoid', instances.length, function (err, id) {
        if (err) {
          return cb(err);
        }
        cb(null, id - instances.length);
      });
    }

    function createMessages(startID, cb) {
      var multi = client.multi();
      instances.forEach(function (instance) {
        var messageKey = 'altnet:message:%1'.replace('%1', startID);
        var mailboxKey = 'altnet:%1:mailbox'.replace('%1', instance);

        multi.setex(messageKey, 60, message);
        multi.rpush(mailboxKey, startID);

        startID += 1;
      });
      multi.exec(function (err) {
        cb(err);
      });
    }

    async.waterfall([
      getStartID,
      createMessages
    ], function (err) {
      cb(err);
    });

  },

  getMessages: function (cb) {
    var client = this._client,
      mailboxKey = 'altnet:%1:mailbox'.replace('%1', this._instanceID);

    function getMessageIDs(cb) {
      client.llen(mailboxKey, function (err, length) {
        var multi = client.multi();
        var loop = 0;
        while (loop < length) {
          multi.lpop(mailboxKey);
          loop += 1;
        }
        multi.exec(cb);
      });
    }

    function getMessages(ids, cb) {
      var multi = client.multi();
      //[1, 2, 3, 4]
      ids.forEach(function (id) {
        var messageKey = 'altnet:message:%1'.replace('%1', id);
        multi.get(messageKey);
        multi.del(messageKey);
      });
      multi.exec(function (err, results) {
        if (err) {
          return cb(err);
        }
        var messages = _.chain(results)
          .filter(evenIndices)
          .map(JSON.parse)
          .value();
        cb(null, messages);
      });
    }

    async.waterfall([
      getMessageIDs,
      getMessages
    ], cb);
  }
};

module.exports = function Storage(config, client) {
  var inst = Object.create(new EventEmitter2());
  inst = _.extend(inst, api);

  inst._instanceID = config.instance.id;
  inst._client = client;

  return inst;
};