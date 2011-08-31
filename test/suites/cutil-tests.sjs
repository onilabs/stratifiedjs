var test = require('../testUtil').test;
var cutil = require("apollo:cutil");

test('waitforAll funcs', 3, function() {
  var x = 0;
  function one() { hold(Math.random()*100); ++x; }
  cutil.waitforAll([one, one, one]);
  return x;
});

test('waitforAll funcs + arg', 3, function() {
  var x = 0;
  function one(a) { hold(Math.random()*100); x+=a[1]; }
  cutil.waitforAll([one, one, one], [2,1,3]);
  return x;
});

test('waitforAll args', 6, function() {
  var x = 0;
  function one(a) { hold(Math.random()*100); x+=a; }
  cutil.waitforAll(one, [1,2,3]);
  return x;
});

test('waitforAll args 2nd par', 3, function() {
  var x = 0;
  function one(a,i) { hold(Math.random()*100); x+=i; }
  cutil.waitforAll(one, [5,6,7]);
  return x;
});

test('waitforAll args 2nd+3rd par', 18, function() {
  var x = 0;
  function one(a,i,arr) { hold(Math.random()*100); x+=arr[i]; }
  cutil.waitforAll(one, [5,6,7]);
  return x;
});

test('waitforFirst funcs', 1, function() {
  var x = 0;
  function one() { hold(Math.random()*100); ++x; }
  cutil.waitforFirst([one, one, one]);
  return x;
});

test('waitforFirst funcs + arg', 3, function() {
  var x = 0;
  function one(a) { hold(Math.random()*100); x+=a[1]; }
  cutil.waitforFirst([one, one, one], [3,3,3]);
  return x;
});

test('waitforFirst args', 6, function() {
  var x = 0;
  function one(a) { hold(Math.random()*100); x+=a; }
  cutil.waitforFirst(one, [6,6,6]);
  return x;
});

test('Semaphore: blocking on acquire', 1, function() {
  var S = new (cutil.Semaphore)(1);
  S.acquire();
  waitfor {
    S.acquire();
    return 2;
  }
  or {
    hold(100);
    return 1;
  }
});

test('Semaphore: block/resume on acquire', 1, function() {
  var S = new (cutil.Semaphore)(1);
  S.acquire();
  waitfor {
    S.acquire();
    return 1;
  }
  or {
    S.release();
    hold(100);
    return 2;
  }
});

test('makeBoundedFunction 1', 3, function() {
  var x = 0;
  function f() { ++x; hold(100); }
  var g = cutil.makeBoundedFunction(f, 3);
  waitfor { g(); } and { g(); } and { g(); } and { g(); } and { g(); }
  and {
    return x;
  }
});

test('makeBoundedFunction 2', 0, function() {
  var x = 0;
  function f() { ++x; if (x>3) throw new Error(x); hold(10); --x; }
  var g = cutil.makeBoundedFunction(f, 3);
  waitfor { g(); } and { g(); } and { g(); } and { g(); } and { g(); }
  return x;
});

test('Queue: producer/consumer', 1000, function() {
  var rv = 0;
  var q = new (cutil.Queue)(100);
  waitfor {
    for (var i=0; i<1000; ++i)
      q.put(1);
  }
  and {
    for (var j=0; j<1000; ++j)
      rv += q.get();
  }
  return rv;
});

test('Queue: producer/consumer (async get)', 100, function() {
  var rv = 0;
  var q = new (cutil.Queue)(10);
  waitfor {
    for (var i=0; i<100; ++i)
      q.put(1);
  }
  and {
    for (var j=0; j<100; ++j) {
      hold(0);
      rv += q.get();
    }
  }
  return rv;
});

test('Queue: producer/consumer blocking', 100, function() {
  var q = new (cutil.Queue)(100);
  waitfor {
    waitfor {
      for (var i=0; i<1000; ++i)
        q.put(1);
    }
    and {
      // The above loop should block after 100 iterations; then we reach this line:
      return i;
    }
  }
  and {
    for (var j=0; j<1000; ++j)
      rv += q.get();
  }
  return 0;
});

test('Queue: producer/consumer (async put)', 100, function() {
  var rv = 0;
  var q = new (cutil.Queue)(10);
  waitfor {
    for (var i=0; i<100; ++i) {
      hold(0);
      q.put(1);
    }
  }
  and {
    for (var j=0; j<100; ++j) {
      rv += q.get();
    }
  }
  return rv;
});

test('Queue: producer/consumer (async put/get)', 100, function() {
  var rv = 0;
  var q = new (cutil.Queue)(10);
  waitfor {
    for (var i=0; i<100; ++i) {
      hold(0);
      q.put(1);
    }
  }
  and {
    for (var j=0; j<100; ++j) {
      hold(0);
      rv += q.get();
    }
  }
  return rv;
});
