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
var hubtest_path = path.join(http.parseURL(module.id).path, '../../data/hubtest.sjs');

test('hub resolution via $APOLLO_HUB_PATH', {stdout: 'HELLO!\n', stderr: ''}, function() {
  var child_process = require('apollo:node-child-process');
  var result = child_process.run(apollo_path, [hubtest_path], {
    env: common.mergeSettings(process.env, {APOLLO_HUB_PATH: hubs_path})
  });
  return result;
}).serverOnly();
