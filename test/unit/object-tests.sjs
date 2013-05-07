var testEq = require('../lib/testUtil').test;
var o = require("sjs:object");
var {sort, toArray} = require("sjs:sequence");
var {test, assert, context} = require('sjs:test/suite');

test('clone object', function() {
  var Cls = function(a) {
    this.a = a;
  };
  Cls.prototype.p = "proto!"

  var initial = new Cls(1);
  var clone = o.clone(initial);
  assert.notEq(initial, clone); // prototypes should differ
  initial.b = 2;
  assert.eq(initial.a, 1);
});

testEq('clone array', [[1,2,3], [1,2]], function() {
  var initial = [1,2];
  var clone = o.clone(initial);
  initial.push(3);
  return [initial, clone];
});

test('clone arguments', function() {
  var initial;
  (function() { initial = arguments})(1, 2);
  var clone = o.clone(initial);
  clone.push(3);

  initial .. toArray() .. assert.eq([1,2]);
  clone .. assert.eq([1,2,3]);
});

testEq("merge argument list", {"a":1,"b":2}, function() {
	var a = {a:1};
	var b = {b:2};
	return o.merge(a,b);
});

testEq("merge array of objects", {"a":1,"b":2}, function() {
	var a = {a:1};
	var b = {b:2};
	return o.merge([a,b]);
});

// these next two aren't particularly likely scenarios, but just to test that we aren't recursively flattening:
testEq("merge array of arrays", {"a":1, "0": {"b":2}}, function() {
	var a = {a:1};
	var b = {b:2};
	return o.merge([a, [b]]);
});

testEq("merge multiple array arguments", {"a":1, "0": {"b":2}}, function() {
	var a = {a:1};
	var b = {b:2};
	return o.merge(a, [b]);
});

(function() {
	var Obj = function(props) {
		o.extend(this, props);
	};
	Obj.prototype.c = 'cee';
	var obj = new Obj({a:'aye', b:'bee'});

	testEq("keys", ["a","b", "c"], function() { return obj .. o.keys() .. sort(); });
	testEq("values", ["aye","bee", "cee"], function() { return obj .. o.values() .. sort(); });
	testEq("ownKeys", ["a","b"], function() { return obj .. o.ownKeys() .. sort(); });
	testEq("ownValues", ["aye","bee"], function() { return obj .. o.ownValues() .. sort(); });
})();
