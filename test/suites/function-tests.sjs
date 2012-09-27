var testUtil = require('../lib/testUtil');
var test = testUtil.test;
var f = require('apollo:function');


test('seq', 2, function() {
  return f.seq({|| hold(0) }, {|| 1 }, {|| 2})();
});

test("'this' in seq", 12, function() {
  var x = 1;
  var obj = {
    x: 2,
    foo: f.seq({|a,b| hold(0); if (a*b != 6) throw "error"; }, function(a,b) { return this.x*a*b })
  };
  return obj.foo(2,3);
});

test('par', 36, function() {
  var rv = 0;
  f.par({|x,y| hold(0); rv += 1*x*y }, {|x,y| rv += 2*x*y }, {|x,y| hold(100); rv += 3*x*y})(2,3);
  return rv;
});

test("'this' in par", 18, function() {
  var x = 1, rv=0;
  var obj = {
    x: 2,
    foo: f.par({|a,b| hold(0); rv+=a*b}, function(a,b) { hold(100); rv+=this.x*a*b })
  };
  obj.foo(2,3);
  return rv;
});
