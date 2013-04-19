var test = require('../lib/testUtil').test;
var o = require("sjs:object");
var {sort} = require("sjs:sequence");

test('clone object', [{'a':1, 'b':2}, {'a':1}], function() {
  var Cls = function(a) {
    this.a = a;
  };
  Cls.prototype = {};
  Cls.prototype.p = "proto!"

  var initial = new Cls(1);
  var clone = o.clone(initial);
  initial.b = 2;
  return [initial, clone];
});

test('clone array', [[1,2,3], [1,2]], function() {
  var initial = [1,2];
  var clone = o.clone(initial);
  initial.push(3);
  return [initial, clone];
});

test('clone arguments', [[1,2], [1,2,3]], function() {
  var initial;
  (function() { initial = arguments})(1, 2);
  var clone = o.clone(initial);
  clone.push(3);
  return [initial, clone];
});

test("merge argument list", {"a":1,"b":2}, function() {
	var a = {a:1};
	var b = {b:2};
	return o.merge(a,b);
});

test("merge array of objects", {"a":1,"b":2}, function() {
	var a = {a:1};
	var b = {b:2};
	return o.merge([a,b]);
});

// these next two aren't particularly likely scenarios, but just to test that we aren't recursively flattening:
test("merge array of arrays", {"a":1, "0": {"b":2}}, function() {
	var a = {a:1};
	var b = {b:2};
	return o.merge([a, [b]]);
});

test("merge multiple array arguments", {"a":1, "0": {"b":2}}, function() {
	var a = {a:1};
	var b = {b:2};
	return o.merge(a, [b]);
});

(function() {
	var Obj = function(props) {
		o.extend(this, props);
		console.log(this);
	};
	Obj.prototype.c = 'cee';
	var obj = new Obj({a:'aye', b:'bee'});

	test("keys", ["a","b", "c"], function() { return obj .. o.keys() .. sort(); });
	test("values", ["aye","bee", "cee"], function() { return obj .. o.values() .. sort(); });
	test("ownKeys", ["a","b"], function() { return obj .. o.ownKeys() .. sort(); });
	test("ownValues", ["aye","bee"], function() { return obj .. o.ownValues() .. sort(); });
})();
