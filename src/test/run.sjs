#!/usr/bin/env apollo

var path = require('path');
var fs   = require('fs');
var sys = require("sys");
var args = process.argv.slice(1);
var http = require("apollo:http");
var base = path.dirname(http.parseURL(module.id).relative);
var suite_dir = path.join(base, "suites");

var runOpts = {
  verbose: false
}
//TODO: proper optparse
var verboseIndex = args.indexOf("-v");
if(verboseIndex !== -1) {
  args.splice(verboseIndex, 1);
  runOpts.verbose = true;
}

var is_sjs_file = function(fname){
  return path.extname(fname) == ".sjs";
};

var path_to_test = function(fname) {
  return path.normalize(path.join(suite_dir, fname));
};

var test_files;
if(args.length > 0) {
  var cwd = process.cwd();
  test_files = args.map(function(arg) { return path.resolve(cwd, arg); });
} else {
  test_files = fs.readdirSync(suite_dir).filter(is_sjs_file).map(path_to_test).sort();
}

var NodeRunner = require("./runners/node").NodeRunner;

var runner = new NodeRunner(runOpts);

//TODO: needs a sequantialMap operation (waitForAll does it in parallel, which breaks
// filename-association because it uses global state).
for(var i=0; i<test_files.length; i++) {
  runner.load(test_files[i]);
}
runner.run();
runner.report();
process.exit(runner.success() ? 0 : 1);
