#!/usr/bin/env apollo

var path = require('path');
var fs   = require('fs');
var sys = require("sys");
var args = process.argv.slice(1);
var http = require("apollo:http");
var base = path.dirname(http.parseURL(module.id).relative);
var suite_dir = path.join(base, "suites");
var cwd = process.cwd();
var print = function(s) { process.stdout.write(s+"\n") };

function usage() {
  print("Usage: test/run.sjs [options] [testfile...]");
  print("");
  print("Options:");
  print("  -h, --help         display this help message");
  print("  -v                 verbose output");
  print("");
}

var runOpts = {
  verbose: false
};
var test_files = [];

//TODO: proper optparse
for (var i=1; i<process.argv.length; ++i) {
  var flag = process.argv[i];
  switch (flag) {
  case "-h":
  case "--help":
    usage();
    process.exit(1);
    break;
  case "-v":
    runOpts.verbose = true;
    break;
  default:
    test_files.push(path.resolve(cwd, flag));
  }
}

var is_sjs_file = function(fname){
  return path.extname(fname) == ".sjs";
};

var path_to_test = function(fname) {
  return path.normalize(path.join(suite_dir, fname));
};

if (!test_files.length)
  test_files = fs.readdirSync(suite_dir).filter(is_sjs_file).map(path_to_test).sort();

var NodeRunner = require("./runners/node").NodeRunner;

var runner = new NodeRunner(runOpts);

//TODO: could be runnable in-process with require, except rocket uses ARGV
var rocket_ctrl = require('./lib/rocket_ctrl');
var rocket_port = '7071'
var rocket_root = path.join(base, "..");
var rocket_base_url = 'http://localhost:' + rocket_port + '/test/';
require('./lib/testContext').setBaseURL(rocket_base_url);
var exitStatus = 2;

waitfor {
  if(!rocket_ctrl.is_running(rocket_port)) {
    rocket_ctrl.run(rocket_port, rocket_root);
  } else {
    sys.puts("using existing rocket instance on port " + rocket_port);
    // nothing to wait for
    hold();
  }
} or {
  rocket_ctrl.wait_until_running(rocket_port);

  //TODO: needs a sequantialMap operation (waitForAll does it in parallel, which breaks
  // filename-association because it uses global state).
  for(var i=0; i<test_files.length; i++) {
    runner.load(test_files[i]);
  }
  runner.run();
  runner.report();
  exitStatus = runner.success() ? 0 : 1;
}
process.exit(exitStatus);
