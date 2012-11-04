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

test('bound 1', 3, function() {
  var x = 0;
  function G() { ++x; hold(100); }
  var g = f.bound(G, 3);
  waitfor { g(); } and { g(); } and { g(); } and { g(); } and { g(); }
  and {
    return x;
  }
});

test('bound 2', 0, function() {
  var x = 0;
  function G() { ++x; if (x>3) throw new Error(x); hold(10); --x; }
  var g = f.bound(G, 3);
  waitfor { g(); } and { g(); } and { g(); } and { g(); } and { g(); }
  return x;
});

test('rate limit', true, function() {
  var invocations = 0;
  function G() { ++invocations; hold(0); }
  var g = f.rateLimit(G, 6);
  waitfor {
    while (1) g();
  }
  or {
    hold(300);
  }
  return invocations<=2;
});

test('exclusive', 'TRATCRBTD', function() {
  var rv = "";
  var g = f.exclusive(function() { try {rv+='T'; hold(100);} retract {rv+='R';} });
  waitfor {
    g();
    rv+='A';
  }
  and {
    g();
    rv+='B';
  }
  and {
    hold(10);
    rv+='C';
    g();
    rv+='D';
  }
  return rv;
});

test('deferred 1', 'Cb(A)', function() {
  var g = f.deferred(function() { hold(0); return 'A'; });
  var ret;
  g().then({|v| ret("Cb(#{v})")}, {|e| ret("Eb(#{e})")});
  waitfor(var rv) { ret = resume }
  return rv;
});

test('deferred 2', 'Eb(A)', function() {
  var g = f.deferred(function() { hold(0); throw 'A'; });
  var ret;
  g().then({|v| ret("Cb(#{v})")}, {|e| ret("Eb(#{e})")});
  waitfor(var rv) { ret = resume }
  return rv;
});

test('deferred 3', 'Eb(.)', function() {
  var g = f.deferred(function() { hold(0); return 'A'; });
  var ret;
  var d = g();
  d.then({|v| ret("Cb(.)")}, {|e| ret("Eb(.)")});
  waitfor(var rv) { ret = resume; d.cancel(); }
  return rv;
});

test('memoize 1', 1, function() {
  var c = 0;
  var g = f.memoize(function(x) {
    if (x == 42) ++c;
    return x;
  });
  g(42);
  g(10);
  g(42);
  g(32);
  return c;
});

test('memoize 2', 3, function() {
  var c = 0;
  var g = f.memoize(function(x) {
    hold(100);
    ++c;
    return x;
  });
  waitfor {
    g(42);
  }
  and {
    g(10);
  }
  and {
    g(42);
  }
  and {
    g(32);
  }
  and {
    g(10);
  }
  g(10);
  g(42);
  return c;
});

test('memoize with custom key', 2, function() {
  var c = 0;
  var g = f.memoize(function(x) {
    if (x == 42) ++c;
    return x;
  }, function(a, b) {
    return b;
  });
  results = [];
  g(42, 1);
  g(42, 2);
  g(42, 2);
  return c;
});


test('memoize retraction', 2, function() {
  var c = 0;
  var g = f.memoize(function(x) {
    ++c;
    hold(100);
    return x;
  });
  waitfor {
    g(42);
    g(42);
  }
  or {
    /* */
  }
  g(42);
  return c;
});

test('sequential', 0, function() {
  var x = 0;
  function G() { ++x; if (x>1) throw new Error(x); hold(10); --x; }
  var g = f.sequential(G);
  waitfor { g(); } and { g(); } and { g(); } and { g(); } and { g(); }
  return x;
});
