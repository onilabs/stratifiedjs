#!/usr/bin/env apollo

var path = require('path');
var fs   = require('fs');
var args = process.argv.slice(1);
//TODO: __filename not defined for SJS?
// var base = path.dirname(fs.realpathSync(__filename));
var base = ".";
var suite_dir = path.join(base, "suites");
var sys = require("sys");

var is_sjs_file = function(fname){
	return path.extname(fname) == ".sjs";
};

var path_to_test = function(fname) {
	return path.normalize(path.join(suite_dir, fname));
};
var test_files;
if(args.length > 0) {
	test_files = args;
} else {
	test_files = fs.readdirSync(suite_dir).filter(is_sjs_file).map(path_to_test).sort();
}
sys.puts("test files: " + test_files);

require.path = "../../modules/"; // XXX does this do anything for .sjs requires?
var testUtil = require("file:testutil");

var suite = new test_helpers.NodeSuite();

var cutil = require("apollo:cutil");
for(var i=0; i<test_files.length; i++) {
	suite.load(test_files[i]);
}
// cutil.waitforAll(suite.load, test_files, suite);
suite.run();
suite.report();
// TODO: exit process with correct status
