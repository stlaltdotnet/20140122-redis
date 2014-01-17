window.chat = window.chat || {};
window.chat.loadio = (function ($) {
  'use strict';
  var search = window.location.search,
    query = {
      host: location.hostname || 'localhost',
      port: '8090'
    };
  if (search.length) {
    search = search.substr(1);
    var parts = search.split('&');
    $.each(parts, function (i, part) {
      var pairs = part.split('='),
        key = pairs[0],
        value = pairs[1];
      query[key] = value;
    });
  }

  var ioURLBase = 'http://' + query.host + ':' + query.port;
  var script = document.createElement('script');
  script.src = ioURLBase + '/socket.io/socket.io.js';

  return function (cb) {
    $(function () {
      script.onload = cb.bind(null, ioURLBase);
      document.body.appendChild(script);
    });
  };

}(jQuery));