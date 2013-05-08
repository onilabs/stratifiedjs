var util = require('util');
var object = require('sjs:object');
var logging = require('sjs:logging');
var http = require('sjs:http');
var path = require('path');
var url = require('sjs:url');
var { supplant } = require("sjs:string");

var isRunning = exports.isRunning = function(port) {
  var base_url = 'http://localhost:' + port + '/';
  try {
    http.get(base_url);
    return true;
  } catch (e) {
    if(e.toString().indexOf('ECONNREFUSED') == -1) {
      // this is not the error we expected!
      throw(e);
    }
    return false;
  }
};

var run = exports.run = function(port, opts) {
  var child_process = require("sjs:nodejs/child-process");
  opts = opts || {};
  // Point $APOLLO_ROCKET to a stable implementation if you have broken rocket but
  // still want to run the rest of the tests:
  var basedir = module.id .. url.toPath() .. path.join("../../../") .. path.resolve();
  logging.verbose("rocket basedir: #{basedir}");
  var rocket_exe = process.env['APOLLO_ROCKET'] || basedir .. path.join("rocket");

  var args = ['--port', port];
  if ('args' in opts) {
    args = args.concat(opts.args);
    delete opts.args;
  }

  try {
    child_process.run(rocket_exe, args, object.merge(opts, {
      cwd: basedir,
      customFds: [-1, -1, 2]
    }));
  } catch(e) {
    throw new Error(supplant(
      "Rocket died: {message}\nstdout:{stdout}\nstderr:{stderr}", e));
  }
  throw new Error("Rocket complete (it should have run forever...");
};

var waitUntilRunning = exports.waitUntilRunning = function(port) {
  waitfor {
    while(!isRunning(port)) {
      hold(100);
    }
  } or {
    hold(2000);
    util.puts("waiting for rocket startup on port " + port);
    hold(8000);
    throw new Error("Rocket didn't start after 10s");
  }
};

var withRocket = exports.withRocket = function(port, opts, block) {
  if (arguments.length == 2) {
    [port, block] = arguments;
    opts = undefined;
  }

  if (exports.isRunning(port)) {
    logging.verbose("Reusing existing rocket on port #{port}");
    return block();
  }

  waitfor {
    logging.verbose("Launching rocket on port #{port}");
    exports.run(port, opts);
  } or {
    exports.waitUntilRunning(port);
    block();
  }
}
