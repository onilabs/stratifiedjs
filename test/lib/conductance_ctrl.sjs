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

var run = exports.run = function() {
  var child_process = require("sjs:nodejs/child-process");
  var basedir = module.id .. url.toPath() .. path.join("../../../") .. path.resolve();
  logging.verbose("conductance basedir: #{basedir}");
  var bin_ext = process.platform == 'win32' ? '.cmd' : '';
  var bin = "conductance#{bin_ext}";

  var root = process.env['CONDUCTANCE_ROOT'];
  if (root) {
    bin = path.join(root, "bin", bin);
  }

  try {
    child_process.run(bin, ['serve', 'test/config.mho'], {
      cwd: basedir,
      customFds: [-1, 'ignore', 'ignore']
    });
  } catch(e) {
    throw new Error(supplant(
      "conductance died: {message}\nstdout:{stdout}\nstderr:{stderr}", e));
  }
  throw new Error("Conductance complete (it should have run forever...");
};

var waitUntilRunning = exports.waitUntilRunning = function(port) {
  waitfor {
    while(!isRunning(port)) {
      hold(100);
    }
  } or {
    hold(2000);
    util.puts("waiting for conductance startup on port " + port);
    hold(8000);
    throw new Error("conductance didn't start after 10s");
  }
};

var withConductance = exports.withConductance = function(port, block) {
  if (exports.isRunning(port)) {
    logging.verbose("Reusing existing conductance on port #{port}");
    return block();
  }

  waitfor {
    logging.verbose("Launching conductance on port #{port}");
    exports.run();
  } or {
    exports.waitUntilRunning(port);
    block();
  }
}
