var util = require('util');
var http = require('sjs:http');
var { supplant } = require("sjs:string");

var is_running = exports.is_running = function(port) {
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

var run = exports.run = function(port, basedir) {
  var child_process = require("sjs:nodejs/child-process");
  // Point $APOLLO_ROCKET to a stable implementation if you have broken rocket but
  // still want to run the rest of the tests:
  var rocket_exe = process.env['APOLLO_ROCKET'] || basedir + "/rocket";
  try {
    child_process.run(rocket_exe, ['--port', port], {
      cwd: basedir,
      customFds: [-1, -1, 2]
    });
  } catch(e) {
    throw new Error(supplant(
      "Rocket died: {message}\nstdout:{stdout}\nstderr:{stderr}", e));
  }
  throw new Error("Rocket complete (it should have run forever...");
};

var wait_until_running = exports.wait_until_running = function(port) {
  waitfor {
    while(!is_running(port)) {
      hold(100);
    }
  } or {
    hold(2000);
    util.puts("waiting for rocket startup on port " + port);
    hold();
  }
};

