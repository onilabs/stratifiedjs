var testUtil = require('../lib/testUtil');
var testEq = testUtil.test;
var f = require('sjs:function');
var sys = require('sjs:sys');
var {test, context, assert} = require('sjs:test/suite');

testEq('seq', 2, function() {
  return f.seq(-> hold(0), -> 1, -> 2)();
});

testEq("'this' in seq", 12, function() {
  var x = 1;
  var obj = {
    x: 2,
    foo: f.seq(function(a,b) { hold(0); if (a*b != 6) throw "error"; }, function(a,b) { return this.x*a*b })
  };
  return obj.foo(2,3);
});


testEq('bound 1', 3, function() {
  var x = 0;
  function G() { ++x; hold(100); }
  var g = f.bound(G, 3);
  waitfor { g(); } and { g(); } and { g(); } and { g(); } and { g(); }
  and {
    return x;
  }
});

testEq('bound 2', 0, function() {
  var x = 0;
  function G() { ++x; if (x>3) throw new Error(x); hold(10); --x; }
  var g = f.bound(G, 3);
  waitfor { g(); } and { g(); } and { g(); } and { g(); } and { g(); }
  return x;
});

testEq('rate limit', true, function() {
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

testEq('exclusive', 'TRATCRBTX', function() {
  var rv = "";
  var g = f.exclusive(function() { try {rv+='T'; hold(100); return 'X';} retract {rv+='R';} });
  waitfor {
    rv += g() || 'A';
  }
  and {
    rv += g() || 'B';
  }
  and {
    hold(10);
    rv+='C';
    rv += g() || 'D';
  }
  return rv;
});

testEq('exclusive external retraction', 'AR', function() {
  var rv = '';
  var g = f.exclusive(function() { try { rv+='A'; hold(10); rv+='B' } retract {  rv+= 'R'; } });
  waitfor { g() } or { /* */ }
  hold(100);
  return rv;
});

// this used to give "210" - XXX you could make the argument for either case
testEq('exclusive reentrancy','2', function() {
  var rv = ''
  var g = f.exclusive(function(n) { 
    rv += n;
    if (n==0) return;
    g(--n);
  });
  g(2);
  return rv;
});

// this used to yield '2'
testEq('exclusive reentrancy/async','210', function() {
  var rv = ''
  var g = f.exclusive(function(n) { 
    rv += n;
    if (n==0) return;
//    hold(0); <- this hold used to be important as a cancel point; it isn't any longer
    sys.spawn(-> g(--n)); // spawn so that we don't cancel the whole g callchain (which would yield '2', as in the test above, and in an earlier version of SJS '21', because the first cancel point is the hold(0) in the call to g(1)
  });
  g(2);
  hold(10);
  return rv;
});

testEq('exclusive with reuse', [1,1,1,2], function() {
  var count = 0;
  var g = f.exclusive(function() { count++; hold(100); return count; }, true);
  var rv = [];
  waitfor {
    rv[0] = g();
  }
  and {
    rv[1] = g();
  }
  and {
    rv[2] = g();
  }
  rv[3] = g();
  return rv;
});

testEq('exclusive with reusing (exception)', 'TTR', function() {
  var count=0;
  var g = f.exclusive(function() { count++; hold(100); if(count === 1) throw 'T'; return 'R';}, true);
  var rv = '';
  waitfor {
    try {
      rv += g();
    } catch(e) {
      rv += e;
    }
  }
  and {
    try {
      rv += g();
    } catch(e) {
      rv += e;
    }
  }
  rv += g();
  return rv;
});

testEq('exclusive sync', '012', function() {
  var count=0;
  var g = f.exclusive(function() {
      return count++;
  }, true);
  var rv = '';
  waitfor {
    rv += g();
  }
  and {
    rv += g();
  }
  rv += g();
  return rv;
});
  
testEq('exclusive/w reuse; blocklambda', '12', function() {
  var rv = '';
  var g = f.exclusive(function(x) {
    x();
    rv += 'x';
  }, true);
  
  function foo(x) {
    g(x);
    rv += 'y';
  }

  foo { || rv += '1'; break; }
  rv += '2';
  return rv;
});

testEq('exclusive/w reuse; blocklambda pathological', '12', function() {
  var rv = '';
  var g = f.exclusive(function(x) {
    x();
    rv += 'x';
  }, true);
  
  function foo(x) {
    waitfor {
      waitfor {
        g(x);
      }
      or {
        hold(0);
      }
    }
    and {
      // technically the blocklambda break could be routed through this second g() invocation,
      // but that doesn't work atm
      g(x);
    }
    rv += 'y';
  }

  foo { || rv += '1'; hold(0); hold(0); break; }
  rv += '2';
  return rv;
}).skip('NEEDS WORK');


testEq('memoize 1', 1, function() {
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

testEq('memoize 2', 3, function() {
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

testEq('memoize with custom key', 2, function() {
  var c = 0;
  var g = f.memoize(function(x) {
    if (x == 42) ++c;
    return x;
  }, function(a, b) {
    return b;
  });
  var results = [];
  g(42, 1);
  g(42, 2);
  g(42, 2);
  return c;
});


testEq('memoize retraction', 2, function() {
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

test("'this' in memoize", function() {
  var obj = {};
  var bodyThis, keyThis;

  var fn = f.memoize(function() {
    bodyThis = this;
  }, function() {
    keyThis = this;
  });

  fn.call(obj);

  assert.ok(bodyThis === obj);
  assert.ok(keyThis === obj);
})


testEq('sequential', 0, function() {
  var x = 0;
  function G() { ++x; if (x>1) throw new Error(x); hold(10); --x; }
  var g = f.sequential(G);
  waitfor { g(); } and { g(); } and { g(); } and { g(); } and { g(); }
  return x;
});

testEq('unbatched sequential', [[[1],[2],[3]], [1,4,9]], function() {
  var calls = [];
  var F = f.unbatched(function(x) {
    calls.push(x);
    var y = [];
    for (var i=0; i<x.length; ++i)
      y.push(x[i]*x[i]);
    return y;
  });

  var rv = [];
  rv.push(F(1));
  rv.push(F(2));
  rv.push(F(3));

  return [calls, rv];
});

testEq('unbatched parallel', [[[1,2,3]], [1,4,9]], function() {
  var calls = [];
  var F = f.unbatched(function(x) {
    calls.push(x);
    var y = [];
    for (var i=0; i<x.length; ++i)
      y.push(x[i]*x[i]);
    return y;
  });

  var rv = [];
  waitfor {
    rv[0] = (F(1));
  } and {
    rv[1] = (F(2));
  } and {
    rv[2] = (F(3));
  }

  return [calls, rv];
});

testEq('unbatched parallel / retraction', [[[2, 3]], [, 4, 9]], function() {
  var calls = [];
  var F = f.unbatched(function(x) {
    calls.push(x);
    var y = [];
    for (var i=0; i<x.length; ++i)
      y.push(x[i]*x[i]);
    return y;
  });

  var rv = [];
  waitfor {
    var starter = reifiedStratum.spawn(->(rv[0] = (F(1))));
  } and {
    rv[1] = (F(2));
  } and {
    rv[2] = (F(3));
  } and {
    starter.abort();
  }

  return [calls, rv];
});

testEq('signal 1', 'abc', function() {
  var rv = '';
  function foo(x) {
    hold(0);
    rv += x;
  }

  rv += 'a';
  foo .. f.signal(null, ['c']);
  rv += 'b';
  // let the signal call complete:
  hold(0);
  return rv;
});

testEq('signal 2', 'ab', function() {
  var rv = '';
  function foo(x) {
    hold(0);
    rv += x;
  }

  rv += 'a';
  foo .. f.signal(null, ['c']);
  rv += 'b';
  return rv;
});

testEq('ITF_SIGNAL 1', 'abcd', function() {
  var rv = '';
  function foo(x) {
    hold(0);
    rv += x;
  }

  foo[f.ITF_SIGNAL] = function(this_obj, args) {
    rv += 'b';
    foo.apply(this_obj, args);
  }

  rv += 'a';
  foo .. f.signal(null, ['d']);
  rv += 'c';
  // let the signal call complete:
  hold(0);
  return rv;
});

testEq('ITF_SIGNAL 2', 'abc', function() {
  var rv = '';
  function foo(x) {
    hold(0);
    rv += x;
  }

  foo[f.ITF_SIGNAL] = function(this_obj, args) {
    rv += 'b';
    foo.apply(this_obj, args);
  }

  rv += 'a';
  foo .. f.signal(null, ['d']);
  rv += 'c';

  return rv;
});
