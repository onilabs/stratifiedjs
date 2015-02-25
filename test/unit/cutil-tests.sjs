@ = require('sjs:test/std');
var {test, context, assert} = require('sjs:test/suite');
var testEq = require('../lib/testUtil').test;
var cutil = require("sjs:cutil");

testEq('waitforAll funcs', 3, function() {
  var x = 0;
  function one() { hold(Math.random()*100); ++x; }
  cutil.waitforAll([one, one, one]);
  return x;
});

testEq('waitforAll funcs + arg', 3, function() {
  var x = 0;
  function one(a) { hold(Math.random()*100); x+=a[1]; }
  cutil.waitforAll([one, one, one], [[2,1,3]]);
  return x;
});

testEq('waitforAll args', 6, function() {
  var x = 0;
  function one(a) { hold(Math.random()*100); x+=a; }
  cutil.waitforAll(one, [1,2,3]);
  return x;
});

testEq('waitforAll args 2nd par', 3, function() {
  var x = 0;
  function one(a,i) { hold(Math.random()*100); x+=i; }
  cutil.waitforAll(one, [5,6,7]);
  return x;
});

testEq('waitforAll args 2nd+3rd par', 18, function() {
  var x = 0;
  function one(a,i,arr) { hold(Math.random()*100); x+=arr[i]; }
  cutil.waitforAll(one, [5,6,7]);
  return x;
});

testEq('waitforFirst funcs', 1, function() {
  var x = 0;
  function one() { hold(Math.random()*100); ++x; }
  cutil.waitforFirst([one, one, one]);
  return x;
});

testEq('waitforFirst funcs + arg', 3, function() {
  var x = 0;
  function one(a) { hold(Math.random()*100); x+=a[1]; }
  cutil.waitforFirst([one, one, one], [[3,3,3]]);
  return x;
});

testEq('waitforFirst args', 6, function() {
  var x = 0;
  function one(a) { hold(Math.random()*100); x+=a; }
  cutil.waitforFirst(one, [6,6,6]);
  return x;
});

test('Semaphore: default permits is 1') {||
  cutil.Semaphore().permits .. assert.eq(1);
};


testEq('Semaphore: blocking on acquire', 1, function() {
  var S = cutil.Semaphore(1);
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

testEq('Semaphore: block/resume on acquire', 1, function() {
  var S = cutil.Semaphore(1);
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

testEq('Condition: not blocking if already set', 1, function() {
  var c = cutil.Condition();
  c.set();
  waitfor {
    c.wait();
    return 1;
  } or {
    return 2;
  }
});

testEq('Condition: clearing and re-setting', 1, function() {
  var c = cutil.Condition();
  waitfor {
    c.wait();
    c.clear();
    c.wait();
    return 1;
  } or {
    c.set();
    hold(100);
    c.set();
    hold(0);
    return 2;
  }
});

testEq('Condition: setting with a value', ["result!", "result!", "result!"], function() {
  var c = cutil.Condition();
  var results = [];
  waitfor {
    waitfor {
      results.push(c.wait());
    } and {
      results.push(c.wait());
      c.set("ignored result (already set)");
      results.push(c.wait());
    }
  } or {
    hold(100);
    c.set("result!");
    hold();
  }
  return results;
});


testEq('makeBoundedFunction 1', 3, function() {
  var x = 0;
  function f() { ++x; hold(100); }
  var g = cutil.makeBoundedFunction(f, 3);
  waitfor { g(); } and { g(); } and { g(); } and { g(); } and { g(); }
  and {
    return x;
  }
}).skip('function removed');

testEq('makeBoundedFunction 2', 0, function() {
  var x = 0;
  function f() { ++x; if (x>3) throw new Error(x); hold(10); --x; }
  var g = cutil.makeBoundedFunction(f, 3);
  waitfor { g(); } and { g(); } and { g(); } and { g(); } and { g(); }
  return x;
}).skip('function removed');

testEq('Queue: producer/consumer', 1000, function() {
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

testEq('Queue: producer/consumer (async get)', 100, function() {
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

testEq('Queue: producer/consumer blocking', 100, function() {
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

testEq('Queue: producer/consumer (async put)', 100, function() {
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

testEq('Queue: producer/consumer (async put/get)', 100, function() {
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

testEq('makeMemoizedFunction 1', 1, function() {
  var c = 0;
  var f = cutil.makeMemoizedFunction(function(x) {
    if (x == 42) ++c;
    return x;
  });
  f(42);
  f(10);
  f(42);
  f(32);
  return c;
}).skip('function removed');

testEq('makeMemoizedFunction 2', 3, function() {
  var c = 0;
  var f = cutil.makeMemoizedFunction(function(x) {
    hold(100);
    ++c;
    return x;
  });
  waitfor {
    f(42);
  }
  and {
    f(10);
  }
  and {
    f(42);
  }
  and {
    f(32);
  }
  and {
    f(10);
  }
  f(10);
  f(42);
  return c;
}).skip('function removed');

testEq('makeMemoizedFunction with custom key', 2, function() {
  var c = 0;
  var f = cutil.makeMemoizedFunction(function(x) {
    if (x == 42) ++c;
    return x;
  }, function(a, b) {
    return b;
  });
  results = [];
  f(42, 1);
  f(42, 2);
  f(42, 2);
  return c;
}).skip('function removed');


testEq('makeMemoizedFunction retraction', 2, function() {
  var c = 0;
  var f = cutil.makeMemoizedFunction(function(x) {
    ++c;
    hold(100);
    return x;
  });
  waitfor {
    f(42);
    f(42);
  }
  or {
    /* */
  }
  f(42);
  return c;
}).skip('function removed');

testEq('Semaphore.synchronize', 1, function() {
  var S = cutil.Semaphore(1);
  var x = 0;
  waitfor {
    try {
      S.synchronize { ||
                      hold(100);
                      x = 1;
                      throw "foo";
                    }
    }
    catch (e) {
      hold();
    }
  }
  or {
    S.synchronize { ||
                    x = 1/x;
                  }
  }
  S.synchronize { ||
                  return x;
                }
});

testEq('Semaphore: negative permit count', 3, function() {
  var S = cutil.Semaphore(-2);
  var x = 0;
  waitfor {
    S.acquire();
  }
  or {
    while (true) {
      hold(0);
      ++x;
      S.release();
    }
  }
  return x;
});

testEq('Semaphore: negative permit count / forceAcquire', 3, function() {
  var S = cutil.Semaphore(0);
  var x = 0;
  S.forceAcquire();
  S.forceAcquire();
  waitfor {
    S.acquire();
  }
  or {
    while (true) {
      hold(0);
      ++x;
      S.release();
    }
  }
  return x;
});

testEq('Queue: async put/get + interspersed peek', 100, function() {
  var rv = 0;
  var q = new (cutil.Queue)(10);
  waitfor {
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
  }
  or {
    var at_least_one_peek = 0;
    while (1) {
      if (q.peek() != 1) return false;
      ++at_least_one_peek;
      hold(0);
    }
  }
  if (!at_least_one_peek) return false;
  return rv;
});


testEq('Queue size 0 (i.e. put only allowed when there\'s a get)', 'acdb0db1db2db3db4', function() {
  var Q = cutil.Queue(0);
  var rv = '';
  waitfor {
    rv += 'a';
    for (var i=0; i<5;++i) {
      Q.put(i);
      rv += 'b';
    }
      
  }
  and {
    rv += 'c';
    for (var j=0; j<5; ++j) {
      rv += 'd';
      rv += Q.get();
    }
  }
  return rv;
});

testEq('Retraction with queue size 0', 'ok', function() {
  var Q = cutil.Queue(0);
  var rv = '';

  // attempt a get(), priming the Queue to accept put()s:
  waitfor {
    Q.get();
    return 'not reached 1';
  }
  or {
    hold(10);
  }
  // the get() is retracted; the Queue should be unprimed:
  waitfor {
    Q.put('x');
    return 'not reached 2';
  }
  or {
    hold(10);
  }

  return 'ok';
});

testEq('Queue get/put retraction lockup', 'ok', function() {
  var Q = cutil.Queue(0);
  var rv = '';

  // attempt a get(), priming the Queue to accept put()s:
  waitfor {
    Q.get();
    return 'not reached 1';
  }
  or {
    hold(0);
    Q.put('x');
    hold();
  }
  or {
    hold(0);
    // do nothing; this effecively cancels the pending `get` before
    // the `put` feeds through (because the `put` only wakes up the
    // `get` asynchronously)

    // We now have a situation where the queue has grown beyond its
    // originally allowed size
  }

  // earlier implementations of the cutil::Queue didn't reach this
  // point; they locked up internally in the retraction code for
  // Q.get.

  return 'ok';
});


context('breaking') {||
  test('without error') {||
    var events = [];
    var context = function(block) {
      events.push('tx init');
      block('yielded');
      events.push('tx finish');
    };

    var block = cutil.breaking {|ret|
      events.push('block init')
      context(ret);
      events.push('block finish');
    };
    events.push(block.value);
    block.resume();
    events .. assert.eq([
      'block init',
      'tx init',
      'yielded',
      'tx finish',
      'block finish']);
  };

  test('error in setup') {||
    var err = new Error("error thrown by `breaking` block");
    assert.raises({message: err.message}) {||
      cutil.breaking {|brk|
        throw err;
      }
    };
  };

  test('error in teardown') {||
    var err = new Error("error thrown in teardown");
    var value = 'value';
    var transaction = function(block) {
      block(value);
      hold(0);
      throw err;
    }

    var ok = false;
    assert.raises({message: err.message}) {||
      var ctx = cutil.breaking(transaction);
      ctx.value .. assert.eq(value);
      ok = true;
      ctx.resume();
    };
    ok .. assert.ok();
  };

  test('resume(error)') {||
    var events = [];
    var context = function(block) {
      events.push('tx init');
      try {
        block('yielded');
      } catch(e) {
        events.push(e.message);
      } finally {
        events.push('tx finish');
      }
    };

    var block = cutil.breaking {|ret|
      context(ret);
    };
    events.push(block.value);
    block.resume(new Error('err'));
    events .. assert.eq(['tx init', 'yielded', 'err', 'tx finish']);
  };

  test('block retracted') {||
    var events = [];
    events.push = (function(o) {
      return function(e) {
        @info("Event: #{e}");
        return o.apply(this,arguments);
      }
    })(events.push);

    var context = function(block) {
      events.push('init');
      try {
        waitfor {
          block('yielded');
        } or {
          hold(100);
          events.push('retracting');
        }
      } finally {
        events.push('finally');
      }
    };

    var block = cutil.breaking(context);
    events.push(block.value);
    waitfor {
      hold(400);
      events.push('timed out');
    } or {
      block.wait();
      events.push('retracted');
    } or {
      block.wait();
      events.push('retracted');
    }
    block.resume();

    hold(10);
    block.wait();

    events .. assert.eq(['init', 'yielded', 'retracting', 'finally', 'retracted']);
  }

  test('error thrown from block body') {||
    var events = [];
    events.push = (function(o) {
      return function(e) {
        @info("Event: #{e}");
        return o.apply(this,arguments);
      }
    })(events.push);

    var err = @Condition();

    var context = function(block) {
      events.push('init');
      waitfor {
        var e = err.wait();
        events.push('throwing');
        throw e;
      } or {
        try {
          return block();
        } retract {
          events.push('retract block');
        }
      }
    };

    var msg = "expected error"
    var block = cutil.breaking(context);
    @assert.raises({message: msg}, function() {
      try {
        waitfor {
          events.push('setting error');
          err.set(new Error(msg));
          hold(0);
          events.push('set error');
        } or {
          block.wait();
          collapse;
          events.push('collapsed');
        }
      } finally {
        events.push('resuming');
        block.resume();
      }
    });

    events .. assert.eq(['init', 'setting error', 'throwing', 'retract block', 'collapsed', 'resuming']);
  }

}
