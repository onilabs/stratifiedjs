var karmaProxy = require('karma/lib/proxy');
var httpProxy = require('http-proxy');
var path = require('path');

var init = function(logger, customFileHandlers, files) {
  var log = logger.create('sjs-adapter');
  var rocketURL = 'http://localhost:' + (process.env.ROCKET_PORT || '7071') + '/';
  log.debug('Adding proxy for ' + rocketURL);
  var proxyConfig = { '/rocket/': rocketURL };
  var proxy = new httpProxy.RoutingProxy({changeOrigin: true});
  var handler = karmaProxy.createProxyHandler(proxy, proxyConfig);

  customFileHandlers.push({
    urlRegex: /^\/rocket\//,
    handler: function(request, response, staticFolder, adapterFolder, baseFolder, urlRoot) {
      return handler(request, response, function() {
        throw new Error("proxy passed on request");
      });
    }
  });

  //TODO: getting by with duck-typing here, but there
  // ought to be a proper karma API
  var mkFilePattern = function(relpath) {
    var abspath = path.normalize(path.join(__dirname, relpath));
    console.log(abspath);
    return {
      pattern: abspath,
      served: true,
      included: true,
      watched: false,
    };
  }
  files.push(mkFilePattern('../boot.js'));
  files.push(mkFilePattern('../../../stratified.js'));
}


init.$inject = ['logger', 'customFileHandlers', 'config.files'];

// PUBLISH DI MODULE
module.exports = {
  'framework:sjs': ['factory', init],
};
