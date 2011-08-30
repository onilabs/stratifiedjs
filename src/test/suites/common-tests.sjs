var c = require('apollo:common');
var test = require('file:testutil').test;

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

test('supplant', "Hello world 1", function() {
  return c.supplant("Hello {who} {version}", {who:"world", version:1});
});

test('sanitize', "abc&amp;foo;def&gt;ght&lt;", function() {
  return c.sanitize("abc&foo;def>ght<");
});
