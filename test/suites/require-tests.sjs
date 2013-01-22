var testUtil = require('../lib/testUtil');
var test = testUtil.test;
var global = require("builtin:apollo-sys").getGlobal();
var http = require('sjs:http');
var common = require('sjs:common');

test('force extension/sjs', "a=1&b=2", function() {
  return require('sjs:http.sjs').constructQueryString({a:1},{b:2});
});

test('force extension/js', 42, function() {
  return require('../data/testmodule.js').foo(1);
});

test('"this" object in modules', this, function() {
  return require('../data/testmodule.js').bar.apply(global);
});

if (!testUtil.isBrowser) {
  var child_process = require('sjs:nodejs/child-process');
  var path = require('nodejs:path');
  var apollo_path = path.join(http.parseURL(module.id).path, '../../../apollo');

  var run_with_env = function(cmd, args, env)
  {
    try {
      var result = child_process.run(cmd, args, {
        env: common.mergeSettings(process.env, env || process.env)
      });
      return result;
    } catch(e) {
      console.log(e.stderr);
      return e;
    }
  }
  
  test('apollo -e', {stdout: 'hi\n', stderr: ''}, function() {
    return run_with_env(apollo_path, ['-e', 'require("util").puts("hi");'], null);
  }).serverOnly();
  
  test('hub resolution via $APOLLO_INIT', {stdout: 'HELLO!\n', stderr: ''}, function() {
    var hub_path = path.join(http.parseURL(module.id).path, '../../data/literal-hub.sjs');
    var script = 'require("util").puts(require("literal:exports.hello=\'HELLO!\'").hello);';
    return run_with_env(apollo_path, ['-e', script], {APOLLO_INIT: hub_path});
  }).serverOnly();

  test('loading .sjs from NODE_PATH', {stdout: '42\n', stderr: ''}, function() {
    var script = 'try{}or{}; require("util").puts(require("nodejs:child1.sjs").child1_function1());';
    var data_dir = path.join(http.parseURL(module.id).path, '../../data');
    return run_with_env(apollo_path, ['-e', script], {NODE_PATH: data_dir});
  }).serverOnly();

  test('loading .sjs (without an extension) from NODE_PATH', {stdout: '42\n', stderr: ''}, function() {
    var script = 'waitfor{}or{}; require("util").puts(require("nodejs:child1").child1_function1());';
    var data_dir = path.join(http.parseURL(module.id).path, '../../data');
    return run_with_env(apollo_path, ['-e', script], {NODE_PATH: data_dir});
  }).serverOnly();

  test('export to "this" (when requiring a nodeJS module)', {stdout: '42\n', stderr: ''}, function() {
    var script = 'require("nodejs:testmodule", {copyTo: this}); require("util").puts(foo(1));';
    var data_dir = path.join(http.parseURL(module.id).path, '../../data');
    return run_with_env(apollo_path, ['-e', script], {NODE_PATH: data_dir});
  }).serverOnly();
}

test('export to "this"', 42, function() {
  return require('../data/parent').export_to_this;
});

test('utf8 characters in modules: U+00E9', 233, function() {
  var data = require('../data/utf8').test1();
  return data.charCodeAt(data.length-1);
});

test('utf8 characters in modules: U+0192', 402, function() {
  var data = require('../data/utf8').test2();
  return data.charCodeAt(data.length-1);
});

test('load module from github', '\u0192', function() {
  var data = require('github:onilabs/apollo/master/test/data/utf8').test2();
  return data.charAt(data.length-1);
});
