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
