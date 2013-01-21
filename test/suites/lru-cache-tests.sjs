var testUtil = require('../lib/testUtil');
var test = testUtil.test;
var lru = require('sjs:lru-cache');
var coll = require('sjs:collection');

test('put/get', 'asdf', function() {
  var cache = lru.makeCache(100);
  var data = [[Math.random()+'a','a'],
              [Math.random()+'b','s'],
              [Math.random()+'c','d'],
              [Math.random()+'d','f']];
  coll.each(data) { |d| cache.put(d[0],d[1]) }
  var rv = "";
  coll.each(data) { |d| rv+=cache.get(d[0]) }
  return rv;
});

test('discard lru', true, function() {
  var cache = lru.makeCache(3);
  var data = [[Math.random()+'a','a'],  // 0
              [Math.random()+'b','s'],  // 1
              [Math.random()+'c','d'],  // 2
              [Math.random()+'d','f']]; // 3
  coll.each(data) { |d| cache.put(d[0],d[1]) }
  if (cache.get(data[1][0]) != 's') return 1;
  if (cache.get(data[0][0]) != undefined) return 2;
  cache.put('x', 'y'); 
  if (cache.get(data[2][0]) != undefined) return 3;
  if (cache.get(data[1][0]) != 's') return 4;
  return true;
});

test('discard multiple', true, function() {
  var cache = lru.makeCache(30);
  var data = [[Math.random()+'a','a',1],  // 0
              [Math.random()+'b','s',10],  // 1
              [Math.random()+'c','d',10],  // 2
              [Math.random()+'d','f',21]]; // 3
  coll.each(data) { |d| cache.put(d[0],d[1], d[2]) }  
  if (cache.get(data[0][0]) != undefined) return 1;
  if (cache.get(data[1][0]) != undefined) return 2;
  if (cache.get(data[2][0]) != undefined) return 3;
  if (cache.get(data[3][0]) != 'f') return 4;
  return true;
});

test('discard multiple 2', true, function() {
  var cache = lru.makeCache(39);
  var data = [[Math.random()+'a','a',1],  // 0
              [Math.random()+'b','s',10],  // 1
              [Math.random()+'c','d',10],  // 2
              [Math.random()+'d','f',10]]; // 3
  coll.each(data) { |d| cache.put(d[0],d[1], d[2]) }  
  coll.each(data) { |d| if (cache.get(d[0]) != d[1]) return d[1] }
  cache.get(data[0][0]); // put item 0 to front
  cache.put('x', 'y', 30);
  if (cache.get(data[0][0]) != 'a') return 1;
  if (cache.get(data[1][0]) != undefined) return 2;
  if (cache.get(data[2][0]) != undefined) return 3;
  if (cache.get(data[3][0]) != undefined) return 4;
  if (cache.get('x') != 'y') return 5;
  return true;
});
