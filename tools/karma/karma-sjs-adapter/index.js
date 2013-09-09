var Path = require('path');
var fs = require('fs');

var init = function(logger, customFileHandlers, files, client) {
  var log = logger.create('sjs-adapter');

  if (Object.prototype.hasOwnProperty.call(process.env, "KARMA_CLIENT_ARGS")) {
    client.args = JSON.parse(process.env.KARMA_CLIENT_ARGS);
    log.debug("Set client.args = ", client.args);
  }

  // find SJS
  var sjsPath;
  var localPaths = ['stratified.js', 'components/stratifiedjs/stratified.js'];
  for (var i=0; i<localPaths.length; i++) {
    if (fs.existsSync(localPaths[i])) {
      sjsPath = localPaths[i];
      break;
    }
  }
  if (!sjsPath) {
    sjsPath = Path.join(Path.dirname(require.resolve('stratifiedjs')), 'stratified.js');
  }

  var sjsRoot = fs.realpathSync(Path.dirname(sjsPath));
  var cwdRoot = process.cwd();
  log.debug("SJS path: " + sjsPath);
  log.debug("SJS root: " + sjsRoot);
  log.debug("CWD root: " + cwdRoot);

  var serve404 = function(response, path) {
    log.warn('404: ' + path);
    response.writeHead(404);
    return response.end('NOT FOUND');
  };

  var serveStatic = function(request, response, next) {
    var url = request.url;
    // strip __sjs/
    var path = decodeURIComponent(request.url.slice(6).replace(/\?.*/, ''));
    var root;
    if (path.indexOf('/__sjs/') == 0) {
      root = sjsRoot;
      path = path.slice(6);
    } else {
      root = cwdRoot;
    }
    path = Path.join(root, path);
    if (Path.normalize(path).indexOf(root) != 0) {
      // tried to access a file outside root
      log.warn("Denying access to path outside root:", path);
      return serve404(response, path);
    }

    return fs.readFile(path, function(error, data) {
      if (error) {
        return serve404(response, path);
      }

      // TODO: use `mime` if we ever need it
      response.setHeader('Content-Type', 'text/plain');

      response.setHeader('Cache-Control', 'no-store');
      response.setHeader('Expires', '-1');

      response.writeHead(200);

      log.debug('serving: ' + path);
      return response.end(data);
    });
  };

  customFileHandlers.push({
    urlRegex: /^\/__sjs\//,
    handler: serveStatic
  });

  //TODO: getting by with duck-typing here, but there
  // ought to be a proper karma API
  var mkFilePattern = function(path) {
    var abspath = fs.realpathSync(path);
    return {
      pattern: abspath,
      served: true,
      included: true,
      watched: false,
    };
  }
  files.push(mkFilePattern(Path.join(__dirname, 'boot.js')));
  files.push(mkFilePattern(sjsPath));
}


init.$inject = ['logger', 'customFileHandlers', 'config.files', 'config.client'];

// PUBLISH DI MODULE
module.exports = {
  'framework:sjs': ['factory', init],
};
