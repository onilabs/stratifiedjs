var c = require('apollo:common');
var test = require('../lib/testUtil').test;

test('bind', 44, function() {
  var A = {x:44};
  function foo() { return this.x; }
  var boundFoo = c.bind(foo, A);
  return boundFoo();
});

test('isArray', true, function() {
  return c.isArray([]) && !c.isArray(undefined) && !c.isArray(true) &&
    !c.isArray({foo:"bar"}) && !c.isArray("foo") &&
    c.isArray([1,2,3]);
});

test('flatten', true, function() {
  var a1 = [1,2,[3,4,[5,6]],[[7,8]],[9],10];
  var a2 = [1,2,3,4,5,6,7,8,9,10];
  var a3 = c.flatten(a1);
  if (a2.length != a3.length) return false;
  for (var i=0; i<a2.length; ++i)
    if (a2[i] != a3[i]) return false;
  return true;
});

test('clone object', [{'a':1, 'b':2}, {'a':1}], function() {
  var Cls = function(a) {
    this.a = a;
  };
  Cls.prototype = {};
  Cls.prototype.p = "proto!"

  var initial = new Cls(1);
  var clone = c.clone(initial);
  initial.b = 2;
  return [initial, clone];
});

test('clone array', [[1,2,3], [1,2]], function() {
  var initial = [1,2];
  var clone = c.clone(initial);
  initial.push(3);
  return [initial, clone];
});

test('clone arguments', [[1,2], [1,2,3]], function() {
  var initial;
  (function() { initial = arguments})(1, 2);
  var clone = c.clone(initial);
  clone.push(3);
  return [initial, clone];
});
