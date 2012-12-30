var testUtil = require('../lib/testUtil');
var test = testUtil.test;

var s = require("apollo:stream");

test("stream([1,2,3])", 6, function() {
  var rv = 0;
  s.stream([1,2,3]) { |x| rv += x }
  return rv;
});

test("collect(stream([1,2,3]))", "123", function() {
  return s.collect(s.stream([1,2,3])).join('');
});

test("pick", "12", function() {
  return s.collect(s.pick(2, s.stream([1,2,3]))).join('');
});

test("integers()", "0123456789", function() {
  return s.collect(s.pick(10, s.integers())).join('');
});
test("integers(1)", "123456789", function() {
  return s.collect(s.pick(9, s.integers(1))).join('');
});

test("filter(.,.,.)", "024681012141618", function() {
  var rv = "";
  var i=10;
  s.filter(x -> x%2==0, s.integers()) {
    |x|
    rv += x;
    if (--i==0) return rv;
  }
});

test("filter(.,.)", "024681012141618", function() {
  return s.collect(s.pick(10, s.filter(x -> x%2==0, s.integers()))).join('');
});

test("filter(.)", "024681012141618", function() {
  var even = s.filter(x -> x%2==0);
  return s.collect(s.pick(10, even(s.integers()))).join('');
});

test("map(.,.,.)", "0149162536496481", function() {
  var rv = "";
  var i=10;
  s.map(x -> x*x, s.integers()) {
    |x|
    rv += x;
    if (--i==0) return rv;
  }
});

test("map(.,.)", "0149162536496481", function() {
  return s.collect(s.pick(10, s.map(x -> x*x, s.integers()))).join('');
});

test("map(.)", "0149162536496481", function() {
  var squared = s.map(x -> x*x);
  return s.collect(s.pick(10, squared(s.integers()))).join('');
});

test("iterator(stream())", "012", function() {
  var I = s.iterator(s.pick(3,s.integers()));
  var rv = "";
  while (I.hasMore())
    rv += I.next();
  return rv;
});

test("stream(iterator(.)), stream(iterator(.))", "012345", function() {
  var I = s.iterator(s.integers());
  var rv = "";

  rv += s.collect(s.pick(3,s.stream(I))).join('');
  rv += s.collect(s.pick(3,s.stream(I))).join('');

  return rv;
});

test("S = stream(iterator(.)); S,S", "012345", function() {
  var I = s.iterator(s.integers());
  var rv = "";

  var S = s.pick(3,s.stream(I));

  rv += s.collect(S).join('');
  rv += s.collect(S).join('');

  return rv;
});

test("S = stream(iterator(.)); S,iterator.close(),S", "012", function() {
  var I = s.iterator(s.integers());
  var rv = "";

  var S = s.pick(3,s.stream(I));

  rv += s.collect(S).join('');
  I.close();
  rv += s.collect(S).join('');

  return rv;
});

test("async iterator", "012345", function() {
  var I = s.iterator(s.map(x -> (hold(10),x), s.integers()));
  var rv = "";

  rv += s.collect(s.pick(3,s.stream(I))).join('');
  rv += s.collect(s.pick(3,s.stream(I))).join('');

  return rv;
});

test("unpack", "F,o,o,B,a,r", function() {
  var chars = s.unpack(function(x,f) { for (var i=0; i<x.length; ++i) f(x.charAt(i)) });
  return s.collect(chars(s.stream(['Foo','Bar']))).join(',');
});

test("pack", "[1,2]:[3,4]:[5,6]", function() {
  var pairs = s.pack(function(iter,f) { while (iter.hasMore()) f("[#{iter.next()},#{iter.next()}]") });
  return s.collect(s.pick(3,pairs(s.integers(1)))).join(':');
});

test("iterator exception", 1, function() {
  var I = s.iterator(s.stream([1,2]));
  I.next();
  I.next();
  try { I.next(); } catch(e) {}
  try { I.next(); /* try to call next again, because we used to get a hang for this case */ } catch(e) { return 1 }
})
