var testUtil = require('../lib/testUtil');
var test = testUtil.test;

test("-> 5*4", 20, function() {
  var f = -> 5*4;
  return f();
});

test("() -> 5*4", 20, function() {
  var f = () -> 5*4;
  return f();
});

test("x -> x*4", 20, function() {
  var f = x -> x*4;
  return f(5);
});

test("(x,y) -> x*y", 20, function() {
  var f = (x,y) -> x*y;
  return f(4,5);
});

test("'-> 10, -> 20'  == '(-> 10), (-> 20)'", 20, function() {
  var f = (-> 10, -> 20);
  return f();
});

test("-> (10, -> 20)", 20, function() {
  var f = -> (10, -> 20);
  return f()();
});

test("-> -> 20", 20, function() {
  var f = -> -> 20;
  return f()();
});

test("-> () -> 20", 20, function() {
  var f = -> () -> 20;
  return f()();
});

test("'x -> x -> x*x' == '-> (x -> x*x)'", 9, function() {
  var f = x -> x -> x*x;
  return f(2)(3);
});

test("{x,y} -> [y,x]", "Y,X", function() {
  var f = {x,y} -> [y,x];
  return f({x:'X',y:'Y'}).join(',');
});

test("{x:a,y:b} -> a+b+x+y", "XYxy", function() {
  var a='a',b='b', x='x', y='y';
  var f = {x:a,y:b} -> a+b+x+y;
  return f({x:'X',y:'Y'});
});

test("[a,,{b:[,c]}] -> a+b+c", "AbC", function() {
  var a='a',b='b', c='c';
  var f = [a,,{b:[,c]}] -> a+b+c;
  return f(['A', 'x', {a:'x', b:['x','C']}, 'x']);
});

test("[a,,{b:[,c]}] -> (hold(0),a+b+c)", "AbC", function() {
  var a='a',b='b', c='c';
  var f = [a,,{b:[,c]}] -> (hold(0),a+b+c);
  return f(['A', 'x', {a:'x', b: (hold(0),['x','C'])}, 'x']);
});

test("{ a: -> this } ", true, function() {
  function t1_ctor() {}
  t1_ctor.prototype = { a: -> this };
  var t2 = new t1_ctor();
  return t2.a() == t2;
});

// XXX, hmm, not sure about this one. Should we be able to bind 'this'
// to an object, and not just lexically?
test("{ a: => this } ", true, function() {
  function t1_ctor() {}
  t1_ctor.prototype = { a: => this };
  var t2 = new t1_ctor();
  return t2.a() == this;
});

test("-> this", true, function() {
  var t1 = {}, t2 = {};
  var f = function() { var a = -> this; return a; }
  var a = f.call(t1);
  return a.call(t2) == t2;
});

test("=> this", true, function() {
  var t1 = {}, t2 = {};
  var f = function() { var a = => this; return a; }
  var a = f.call(t1);
  return a.call(t2) == t1;
});

test("=> this; blocking ctx", true, function() {
  var t1 = {}, t2 = {};
  var f = function() { var a = (hold(0),=> this); return a; }
  var a = f.call(t1);
  return a.call(t2) == t1;
});

test("__js -> this", true, function() {
  var t1 = {}, t2 = {};
  __js var f = function() { var a = -> this; return a; }
  var a = f.call(t1);
  return a.call(t2) == t2;
});

test("__js => this", true, function() {
  var t1 = {}, t2 = {};
  __js var f = function() { var a = => this; return a; }
  var a = f.call(t1);
  return a.call(t2) == t1;
});

test("__js => this; blocking ctx", true, function() {
  var t1 = {}, t2 = {};
  __js var f = function() { var a = (hold(0),=> this); return a; }
  var a = f.call(t1);
  return a.call(t2) == t1;
});

// helper for blocklambda tests:
function thrice(f) {
  f();
  f();
  f();
}

test("blocklambda inner continue", 'aaaaaa', function() {
  var rv = '';
  thrice {
    ||
    for (var i=0; i<2; ++i) {
      rv += 'a';
      continue;
      rv += 'b';
    }
  }
  return rv;
});

test("blocklambda inner break", 'aaa', function() {
  var rv = '';
  thrice {
    ||
    for (var i=0; i<2; ++i) {
      rv += 'a';
      break;
      rv += 'b';
    }
  }
  return rv;
});


test("blocklambda continue", 'aaac', function() {
  var rv = '';

  thrice {
    ||
    rv += 'a';
    continue;
    rv += 'b';
  }

  rv += 'c';
  
  return rv;
});

test("blocklambda break", 'ac', function() {
  var rv = '';

  thrice {
    ||
    rv += 'a';
    break;
    rv += 'b';
  }
  rv += 'c';

  return rv;
});

test("blocklambda break 2", 'ac', function() {
  var rv = '';

  // XXX we might disallow this non-idiomatic syntax in future!
  // it excercises a different code path in vm1.js than the test above
  // (grep vm1.js.in for sjs-testsuite2:26 to find the code path)

  var bl = {
    ||
    rv += 'a';
    break;
    rv += 'b';
  };

  thrice(bl);

  rv += 'c';

  return rv;
});
