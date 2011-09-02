var sys = require('sys');
var http = require('apollo:http');
var rocket = null;

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
  if(rocket != null) throw "rocket already launched!";
  var child_process = require("child_process");
  rocket = child_process['spawn'](basedir + "/rocket", ['--port', port], {
    cwd: basedir,
    customFds: [-1, -1, 2]
  });

  // rocket started - pause execution until it ends
  var exitHandler = null;
  waitfor() {
    exitHandler = function(code, signal) {
      rocket = null;
      throw("rocket died unexpectedly! (exit status=" + code + ", signal=" + signal + ")");
    };
    rocket.on('exit', exitHandler);
    hold();
  } retract {
    rocket.removeListener('exit', exitHandler);
  }
};

var wait_until_running = exports.wait_until_running = function(port) {
  waitfor {
    while(!is_running(port)) {
      hold(100);
    }
  } or {
    hold(2000);
    sys.puts("waiting for rocket startup on port " + port);
    hold();
  }
};

var kill = exports.kill = function() {
  if(rocket == null) return;
  waitfor {
    waitfor() {
      rocket.on('exit', resume);
      rocket.kill();
      hold();
    } finally {
      rocket.removeListener('exit', resume);
    }
  } or {
    hold(2000);
    // print info message if it hasn't died in 2 secs
    sys.puts("waiting for rocket (pid " + rocket.pid + ") to die...");
    hold();
  }
};
