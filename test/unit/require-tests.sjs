var testUtil = require('../lib/testUtil');
var testEq = testUtil.test;
var global = require("builtin:apollo-sys").getGlobal();
var http = require('sjs:http');
var logging = require('sjs:logging');
var { merge } = require('sjs:object');
var {test, assert, context} = require('sjs:test/suite');

var dataRoot = './fixtures';

testEq('force extension/sjs', "a=1&b=2", function() {
  return require('sjs:http.sjs').constructQueryString({a:1},{b:2});
});

testEq('force extension/js', 42, function() {
  return require(dataRoot + '/testmodule.js').foo(1);
});

testEq('"this" object in modules', this, function() {
  return require(dataRoot + '/testmodule.js').bar.apply(global);
});

context("server-side") {||
  var child_process = require('sjs:nodejs/child-process');
  var path = require('nodejs:path');
  var url = require('sjs:nodejs/url');

  var modulePath = path.join(url.toPath(module.id), '../');
  var apolloPath = path.join(modulePath, '../../apollo');
  var dataPath = path.join(modulePath, dataRoot);

  var run_with_env = function(args, env)
  {
    return child_process.run(apolloPath, args, {
      env: merge(process.env, env || process.env)
    });
  }
  
  test('apollo -e') {|s|
    var result = run_with_env(['-e', 'require("util").puts("hi");'], null);
    result .. assert.eq({stdout: 'hi\n', stderr: ''})
  }
  
  test('hub resolution via $APOLLO_INIT') {|s|
    var hub_path = path.join(dataPath, 'literal-hub.sjs');
    var script = 'require("util").puts(require("literal:exports.hello=\'HELLO!\'").hello);';
    var result = run_with_env(['-e', script], {APOLLO_INIT: hub_path});
    result .. assert.eq({stdout: 'HELLO!\n', stderr: ''});
  }

  test('loading .sjs from NODE_PATH') {|s|
    var script = 'try{}or{}; require("util").puts(require("nodejs:child1.sjs").child1_function1());';
    var result = run_with_env(['-e', script], {NODE_PATH: dataPath});
    result .. assert.eq({stdout: '42\n', stderr: ''});
  }

  test('loading .sjs (without an extension) from NODE_PATH') {|s|
    var script = 'waitfor{}or{}; require("util").puts(require("nodejs:child1").child1_function1());';
    var result = run_with_env(['-e', script], {NODE_PATH: dataPath});
    result .. assert.eq({stdout: '42\n', stderr: ''});
  }

  test('export to "this" (when requiring a nodeJS module)') {|s|
    var script = 'require("nodejs:testmodule", {copyTo: this}); require("util").puts(foo(1));';
    var result = run_with_env(['-e', script], {NODE_PATH: dataPath});
    result .. assert.eq({stdout: '42\n', stderr: ''});
  }

}.serverOnly();

testEq('export to "this"', 42, function() {
  return require(dataRoot + '/parent').export_to_this;
}).ignoreLeaks('child1_function1');

testEq('utf8 characters in modules: U+00E9', 233, function() {
  var data = require(dataRoot + '/utf8').test1();
  return data.charCodeAt(data.length-1);
});

testEq('utf8 characters in modules: U+0192', 402, function() {
  var data = require(dataRoot + '/utf8').test2();
  return data.charCodeAt(data.length-1);
});
