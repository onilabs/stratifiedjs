var test = require('../lib/testUtil').test;
var global = require("sjs:apollo-sys").getGlobal();
var path = require('nodejs:path');
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

var apollo_path = path.join(http.parseURL(module.id).path, '../../../apollo');
var hubs_path = path.join(http.parseURL(module.id).path, '../../data/hubs');

test('apollo -e', {stdout: 'hi\n', stderr: ''}, function() {
  var child_process = require('apollo:node-child-process');
  return child_process.run(apollo_path, ['-e', 'require("sys").puts("hi");'], {
    env: process.env
  });
}).serverOnly();

test('hub resolution via $APOLLO_HUB_PATH', {stdout: 'HELLO!\n', stderr: ''}, function() {
  var child_process = require('apollo:node-child-process');
  var script = 'require("sys").puts(require("literal:exports.hello=\'HELLO!\'").hello);';
  try {
    var result = child_process.run(apollo_path, ['-e', script], {
      env: common.mergeSettings(process.env, {APOLLO_HUB_PATH: hubs_path})
    });
    return result;
  } catch(e) {
    return JSON.stringify(e);
  }
}).serverOnly();
