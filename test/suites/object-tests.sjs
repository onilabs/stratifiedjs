var test = require('../lib/testUtil').test;
var o = require("sjs:object");

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
