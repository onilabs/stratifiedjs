var testUtil = require('../lib/testUtil');
var test = testUtil.test;
var global = require("sjs:apollo-sys").getGlobal();
var http = require('apollo:http');
var common = require('apollo:common');

test('force extension/sjs', "a=1&b=2", function() {
  return require('apollo:http.sjs').constructQueryString({a:1},{b:2});
});

test('force extension/js', 42, function() {
  return require('../data/testmodule.js').foo(1);
});

test('"this" object in modules', this, function() {
  return require('../data/testmodule.js').bar.apply(global);
});

if (!testUtil.isBrowser) {
  var child_process = require('apollo:nodejs/child-process');
  var path = require('nodejs:path');
  var apollo_path = path.join(http.parseURL(module.id).path, '../../../apollo');
  
  test('apollo -e', {stdout: 'hi\n', stderr: ''}, function() {
    return child_process.run(apollo_path, ['-e', 'require("util").puts("hi");'], {
      env: process.env
    });
  }).serverOnly();
  
  test('hub resolution via $APOLLO_INIT', {stdout: 'HELLO!\n', stderr: ''}, function() {
    var hub_path = path.join(http.parseURL(module.id).path, '../../data/literal-hub.sjs');
    var script = 'require("util").puts(require("literal:exports.hello=\'HELLO!\'").hello);';
    try {
      var result = child_process.run(apollo_path, ['-e', script], {
        env: common.mergeSettings(process.env, {APOLLO_INIT: hub_path})
      });
      return result;
    } catch(e) {
      console.log(e.stderr);
      return e;
    }
  }).serverOnly();

  test('loading .sjs using NODE_PATH', {stdout: '42\n', stderr: ''}, function() {
    var script = 'try{}or{}; require("util").puts(require("nodejs:child1.sjs").child1_function1());';
    var data_dir = path.join(http.parseURL(module.id).path, '../../data');
    try {
      var result = child_process.run(apollo_path, ['-e', script], {
        env: common.mergeSettings(process.env, {NODE_PATH: data_dir})
      });
      return result;
    } catch(e) {
      console.log(e.stderr);
      return e;
    }
  }).serverOnly();
}

test('export to "this"', 42, function() {
  return require('../data/parent').export_to_this;
});

