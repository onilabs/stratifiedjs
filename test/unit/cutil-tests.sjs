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

test('Semaphore: default permits is 1', function() {
  cutil.Semaphore().permits .. assert.eq(1);
});


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

testEq('Queue(0) get/put sequencing', '123123', function() {
  var Q = cutil.Queue(0);
  var rv = '';

  waitfor {
    Q.put('x');
    collapse; // collapse has no effect until second hold(0) reached
    rv += '1';
    hold(0);
    rv += '3';
  }
  or {
    Q.get();
    rv += '2';
    hold(0);
    rv += 'NO';
  }

  waitfor {
    Q.get();
    collapse; // collapse has no effect until second hold(0) reached
    rv += '1';
    hold(0);
    rv += 3;
  }
  or {
    Q.put('x');
    rv += '2';
    hold(0);
    rv += 'NO';
  }


  return rv;
});


context('breaking', function() {
  test('without error', function() {
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
  });

  test('error in setup', function() {
    var err = new Error("error thrown by `breaking` block");
    assert.raises({message: err.message}) {||
      cutil.breaking {|brk|
        throw err;
      }
    };
  });

  test('error in teardown', function() {
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
  });

  test('resume(error)', function() {
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
  });

  test('block retracted', function() {
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
  })

  test('error thrown from block body', function() {
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
  })

})

context('advanced semaphore', function() {
  test('acquire sequencing', function() {
    var S = cutil.Semaphore(1);
    var rv = '';
    waitfor {
      S.acquire();
      rv += '1';
      hold(0);
      S.release();
      // this synchronous acquire should execute after the pending one in the other waitfor/and branch:
      S.acquire();
      rv += '3';
    }
    and {
      S.acquire();
      rv += '2';
      S.release();
    }
    @assert.eq(rv, '123')
  })
  test('sequencing2/countWaiting', function() {
    var S = cutil.Semaphore(1);
    var rv = '';
    waitfor {
      S.acquire();
      rv += '1';
      @assert.eq(S.countWaiting(), 0);
      hold(0);
      @assert.eq(S.countWaiting(), 1);
      S.release();
      rv += '2';
      hold(0);
      rv += '4';
    }
    and {
      S.acquire();
      @assert.eq(S.countWaiting(), 0);
      rv += '3';
      hold(0);
      rv += '5';
      S.release();
    }
    @assert.eq(rv, '12345')
  })
})

function task(id, log_arr, blocking_retract, blocking_finally) {
  return function() {
    try {
      log_arr.push(id + ' start');
      hold(100);
    }
    retract {
      if (blocking_retract) hold(0);
      log_arr.push(id + ' retract');
    }
    finally {
      if (blocking_finally) hold(0);
      log_arr.push(id + ' finally');
    }
  }
}

context('withBackgroundStrata', function() {
  test('empty', function() {
    var rv = [];
    cutil.withBackgroundStrata {
      |scope|
      rv.push('in scope');
      scope.wait();
      rv.push('cont');
    }
    rv.push('out of scope');
    assert.eq(rv, ['in scope', 'cont', 'out of scope']);
  })

  @product([true,false],[true,false]) .. @each {
    |[blocking_retract,blocking_finally]|

    context("blocking_retract=#{blocking_retract}, blocking_finally=#{blocking_finally}", function() {

      // XXX not all tests here make use of the full 
      // [blocking_retract,blocking_finally] matrix.
      // We could factor them out to prevent the unnecessary redundancy.

      test('single task', function() {
        var rv = [];
        cutil.withBackgroundStrata {
          |scope|
          rv.push('in scope');
          scope.run(task(1,rv, blocking_retract, blocking_finally));
          rv.push('wait');
          scope.wait();
          rv.push('cont');
        }
        rv.push('out of scope');
        assert.eq(rv, ['in scope', '1 start', 'wait', '1 finally', 'cont', 'out of scope']);
      })
      
      test('single task abort', function() {
        var rv = [];
        cutil.withBackgroundStrata {
          |scope|
          rv.push('in scope');
          scope.run(task(1,rv, blocking_retract, blocking_finally));
          rv.push('cont');
        }
        rv.push('out of scope');
        assert.eq(rv, ['in scope', '1 start', 'cont', '1 retract', '1 finally',  'out of scope']);
      })
      
      test('2 tasks', function() {
        var rv = [];
        cutil.withBackgroundStrata {
          |scope|
          rv.push('in scope');
          scope.run(task(1,rv, blocking_retract, blocking_finally));
          hold(50);
          scope.run(task(2,rv, blocking_retract, blocking_finally));
          rv.push('wait');
          scope.wait();
          rv.push('cont');
        }
        rv.push('out of scope');
        assert.eq(rv, ['in scope', '1 start', '2 start', 
                       'wait', '1 finally', '2 finally', 
                       'cont', 'out of scope']);
      })
      
      test('2 tasks abort', function() {
        var rv = [];
        cutil.withBackgroundStrata {
          |scope|
          rv.push('in scope');
          scope.run(task(1,rv, blocking_retract, blocking_finally));
          hold(50);
          scope.run(task(2,rv, blocking_retract, blocking_finally));
          rv.push('cont');
        }
        rv.push('out of scope');
        if (blocking_finally) {
          assert.eq(rv, ['in scope', '1 start', '2 start', 'cont', 
                         '1 retract', '2 retract', '1 finally', '2 finally',  
                         'out of scope']);
        }
        else {
          assert.eq(rv, ['in scope', '1 start', '2 start', 'cont', 
                         '1 retract', '1 finally', '2 retract', '2 finally',  
                         'out of scope']);
        }
      })

      test('blklambda return sync', function() {
        var rv = [];
        function f() {
          cutil.withBackgroundStrata {
            |scope|
            rv.push('in scope');
            function run_and_hold(bl) {
              scope.run(bl);
              hold();
            }
            run_and_hold {
              ||
              rv.push('1 start');
              rv.push('1 returning');
              try {
                return 'rv';
              }
              finally {
                if (blocking_finally) hold(0);
              }
            }
            scope.run(task(2,rv,blocking_retract, blocking_finally));
            rv.push('cont');
            scope.wait();
            rv.push('not reached');
          }
        }
        rv.push(f());
        rv.push('out of scope');
        assert.eq(rv,[ 'in scope', '1 start', '1 returning', '2 start', 'cont', '2 retract', '2 finally', 'rv', 'out of scope' ]);
      }).skip('not sure if this can be made to work as intended');

      test('exception sync', function() {
        var rv = [];
        function f() {
          cutil.withBackgroundStrata {
            |scope|
            rv.push('in scope');
            scope.run {
              ||
              rv.push('1 start');
              rv.push('1 returning');
              try {
                throw 'except';
              }
              finally {
                if (blocking_finally) hold(0);
              }
            }
            scope.run(task(2,rv,blocking_retract, blocking_finally));
            rv.push('cont');
            scope.wait();
            rv.push('not reached');
          }
        }
        try { f(); } catch(e) { rv.push(e); }
        rv.push('out of scope');
        assert.eq(rv,[ 'in scope', '1 start', '1 returning', '2 start', 'cont', '2 retract', '2 finally', 'except', 'out of scope' ]);
      })


      test('blklambda return 1', function() {
        var rv = [];
        function f() {
          cutil.withBackgroundStrata {
            |scope|
            rv.push('in scope');
            scope.run {
              ||
              rv.push('1 start');
              hold(0);
              rv.push('1 returning');
              return 'rv';
            }
            scope.run(task(2,rv,blocking_retract, blocking_finally));
            rv.push('cont');
            scope.wait();
            rv.push('not reached');
          }
        }
        rv.push(f());
        rv.push('out of scope');
        assert.eq(rv,[ 'in scope', '1 start', '2 start', 'cont', '1 returning', '2 retract', '2 finally', 'rv', 'out of scope' ]);
      }).skip('not sure this can be made to work as intended');

      test('exception 1', function() {
        var rv = [];
        function f() {
          cutil.withBackgroundStrata {
            |scope|
            rv.push('in scope');
            scope.run {
              ||
              rv.push('1 start');
              hold(0);
              rv.push('1 returning');
              throw 'except';
            }
            scope.run(task(2,rv,blocking_retract, blocking_finally));
            rv.push('cont');
            scope.wait();
            rv.push('not reached');
          }
        }
        try { f(); } catch(e) { rv.push(e); }
        rv.push('out of scope');
        assert.eq(rv,[ 'in scope', '1 start', '2 start', 'cont', '1 returning', '2 retract', '2 finally', 'except', 'out of scope' ]);
      })

      test('exception with sole stratum', function() {
        var rv = [];
        function f() {
          cutil.withBackgroundStrata {
            |scope|
            rv.push('in scope');
            scope.run {
              ||
              rv.push('1 start');
              hold(0);
              rv.push('1 returning');
              try {
                throw 'except';
              }
              finally {
                if (blocking_finally) hold(0);
              }
            }
            rv.push('cont');
            scope.wait(); 
            rv.push('not reached');
          }
        }
        try { f(); } catch(e) { rv.push(e); }
        rv.push('out of scope');
        assert.eq(rv,[ 'in scope', '1 start', 'cont', '1 returning', 'except', 'out of scope' ]);
      })

      test('sync exception with sole stratum', function() {
        var rv = [];
        function f() {
          cutil.withBackgroundStrata {
            |scope|
            rv.push('in scope');
            scope.run {
              ||
              rv.push('1 start');
              rv.push('1 returning');
              try {
                throw 'except';
              }
              finally {
                if (blocking_finally) hold(0);
              }
            }
            rv.push('cont');
            scope.wait();
            rv.push('cont 2');
            hold();
            rv.push('not reached');
          }
        }
        try { f(); } catch(e) { rv.push(e); }
        rv.push('out of scope');
        if (blocking_finally)
          assert.eq(rv,[ 'in scope', '1 start', '1 returning', 'cont', 'except', 'out of scope' ]);
        else
          assert.eq(rv,[ 'in scope', '1 start', '1 returning', 'cont', 'cont 2', 'except', 'out of scope' ]);
      })

      test('blklamba break', function() {
        var rv = [];
        function f(blk) {
          cutil.withBackgroundStrata {
            |scope|
            rv.push('in scope');
            scope.run(blk);
            scope.run(task(2,rv,blocking_retract, blocking_finally));
            rv.push('cont');
            scope.wait();
            rv.push('not reached');
          }
        }
        f {
          ||
          rv.push('1 start');
          hold(0);
          rv.push('1 break');
          break;
        }
        rv.push('out of scope');
        assert.eq(rv,[ 'in scope', '1 start', '2 start', 'cont', '1 break', '2 retract', '2 finally', 'out of scope' ]);
      })

      test('blklambda return 2', function() {
        var rv = [];
        function f(blk) {
          cutil.withBackgroundStrata {
            |scope|
            rv.push('in scope');
            scope.run(blk);
            scope.run(task(2,rv,blocking_retract, blocking_finally));
            rv.push('cont');
            scope.wait();
            rv.push('not reached');
          }
        }
        function g() {
          f {
            ||
            rv.push('1 start');
            hold(0);
            rv.push('1 return');
            return 'rv';
          }
          rv.push('not reached 2');
        }
        rv.push(g());
        rv.push('out of scope');
        assert.eq(rv,[ 'in scope', '1 start', '2 start', 'cont', '1 return', '2 retract', '2 finally', 'rv', 'out of scope' ]);
      })


    }) // context
  } // [blocking_retract,blocking_finally]

  @product([true,false],[true,false],[true,false],[true,false],[true,false],[true,false]) ..
    @each {
      |[p1,p2,p3,p4,p5,p6]|
      if (!(p1 || p2 || p3)) continue; // need to ensure 'stratum1' is available
      test("cyclic abort #{p1} #{p2} #{p3} #{p4} #{p5} #{p6}", function() {
        var rv = [], stratum1;
        reifiedStratum.spawn(function(S) { 
          stratum1 = S;
          if (p1) hold(0); 
          try {
            @withBackgroundStrata {
              |scope|
              if (p2) hold(0); 
              scope.run {
                || 
                rv.push('inner');
                if (p3) hold(0);
                try {
                  rv.push('abort');
                  stratum1.abort(); 
                  hold();
                  rv.push('not reached');
                }
                retract {
                  if (p4) hold(0);
                  rv.push('inner retract');
                }
                finally {
                  if (p5) hold(0);
                  rv.push('inner finally');
                }
                rv.push('not reached');
              } /* scope.run */ 
              rv.push('outer waiting');
              if (p6) 
                hold();
              else
                scope.wait();
              rv.push('not reached');
            } // background session
            rv.push('not reached');
          }
          retract {
            rv.push('outer retract');
          }
          finally {
            rv.push('outer finally');
          }
          rv.push('not reached');
        });

        stratum1.wait();

        var expected = ['inner'];
        if (p3) 
          expected.push('outer waiting', 'abort');
        else
          expected.push('abort', 'outer waiting');
        expected.push('inner retract', 'inner finally', 'outer retract', 'outer finally');
          assert.eq(rv,expected);
      })

      if (p6) continue; // p6 not used in next test

      test("cyclic abort in finally #{p1} #{p2} #{p3} #{p4} #{p5}", function() {
        var rv = [], stratum1;
        reifiedStratum.spawn(function(S) { 
          stratum1 = S;
          if (p1) hold(0); 
          try {} finally {
            @withBackgroundStrata {
              |scope|
              if (p2) hold(0); 
              scope.run {
                || 
                rv.push('inner');
                if (p3) hold(0);
                try {
                  rv.push('abort');
                  stratum1.abort();
                  rv.push('after abort');
                }
                retract {
                  if (p4) hold(0);
                  rv.push('not reached');
                }
                finally {
                  if (p5) hold(0);
                  rv.push('inner finally');
                }
                rv.push('abort cont');
              } 
              rv.push('outer waiting');
              scope.wait();
              rv.push('outer cont');
            } // background session
            rv.push('outer continue finally');
          } // finally
          rv.push('after outer finally'); // <- this used to be reached, but not always anymore. finally is now an abort point if it blocks
          hold(0);
          rv.push('not reached');
        });

        stratum1.wait();

        var expected = ['inner'];
        if (p3) {
          expected.push('outer waiting', 'abort', 'after abort', 'inner finally', 'abort cont', 'outer cont', 'outer continue finally');
        }
        else {
          if (!p5) {
            expected.push('abort', 'after abort', 'inner finally', 'abort cont', 'outer waiting', 'outer cont', 'outer continue finally');
          }
          else
            expected.push('abort', 'after abort', 'outer waiting', 'inner finally', 'abort cont', 'outer cont', 'outer continue finally');
        }
        if (!p2 && !p3 && !p5)
          expected.push('after outer finally');
        assert.eq(rv,expected);
      })

    }

  test('wait for return', function() {
    @withBackgroundStrata {
      |strata|
      var S = strata.run((S)-> S.value = 'x');
      S.wait();
      assert.eq(S.value, 'x');

      var A = strata.run((S)-> (hold(0),S.value = 'y'));
      var A2 = strata.run(function(S) { hold(0); S.value = 'z';});
      A.wait();
      assert.eq(A.value, 'y');
      A2.wait();
      assert.eq(A2.value, 'z');

      /* THIS DOESN'T WORK ANY LONGER: 
      try {
        // sync exception
        var E = strata.run(function() { throw 'e'; });
      }
      catch(e) {
        assert.eq(e,'e');
      }

      try {
        // async exception
        var E = strata.run(function() { hold(0); throw 'e'; });
        E.value(); // this catches the exception
      }
      catch(e) {
        assert.eq(e,'e');
      }
      */
      strata.wait();
    }
  })

  test('ignore return', function() {
    @withBackgroundStrata {
      |strata|
      var S = strata.run(()->'x', true);
      assert.eq(S,undefined);
      var A = strata.run(()->(hold(0),'x'), true);
      assert.eq(A,undefined);
    }
  }).skip("'ignore return flag' has been retired for now"); 
})
