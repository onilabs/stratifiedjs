var testUtil = require('../lib/testUtil');
var test = testUtil.test;
var sys = require('sjs:sys');

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

// This syntax is now disallowed
//test("blocklambda break 2", 'ac', function() {
//  var rv = '';
//
//  // XXX we might disallow this non-idiomatic syntax in future!
//  // it excercises a different code path in vm1.js than the test above
//  // (grep vm1.js.in for sjs-testsuite2:26 to find the code path)
//
//  var bl = {
//    ||
//    rv += 'a';
//    break;
//    rv += 'b';
//  };
//
//  thrice(bl);
//
//  rv += 'c';
//
//  return rv;
// });

test('return propagation', undefined, function() {
  function foo() { bar(); }
  function bar() { return 'x' }
  return foo();
});

test('return propagation 2', 'x', function() {
  function foo() { return bar(); }
  function bar() { return 'x' }
  return foo();
});

test('async return propagation', undefined, function() {
  function foo() { bar(); }
  function bar() { hold(0); return 'x' }
  return foo();
});

test('async return propagation 2', 'x', function() {
  function foo() { return bar(); }
  function bar() { hold(0); return 'x' }
  return foo();
});

test('async return propagation through arrow', 'x', function() {
  var foo = -> bar();
  function bar() { hold(0); return 'x' }
  return foo();
});

test('return propagation from suspended blocklambda', undefined, function() {
  // regression test
  var withBlock = function(b) { b(); };
  var makeValue = function() {
    withBlock {||
      hold(0);
      return "value";
    }
  };
  var returnNothing = function() {
    makeValue();
  };
  return returnNothing();
});

test('a() .. b()', 'ab', function() {
  var a = -> 'a', b = x -> x+'b';
  return a() .. b();
});

test('a() .. b', 'ab', function() {
  var a = -> 'a', b = x -> x+'b';
  return a() .. b;
});

test("a() .. b('c')", 'abc', function() {
  var a = -> 'a', b = (x,y) -> x+'b'+y;
  return a() .. b('c');
});

test("a() .. (b('c'))", 'ab', function() {
  var a = -> 'a', b = -> x -> x+'b';
  return a() .. (b('c'));
});

test("a() .. b.c", 'ab', function() {
  var a = -> 'a', b = { c: x -> x+'b' };
  return a() .. b.c;
});

test("a() .. b['c']", 'ab', function() {
  var a = -> 'a', b = { c: x -> x+'b' };
  return a() .. b['c'];
});

test("a() .. (b['c']()) .. d", 'abd', function() {
  var a = -> 'a', b = { c: -> x -> x+'b' }, d = x -> x+'d';
  return a() .. (b['c']()) .. d;
});

test("waitfor() { ... } sequencing", 'ba', function() {
  var rv = '', next;
  waitfor {
    waitfor() { next = resume; }
    rv += 'b';
  }
  and {
    next();
    rv += 'a';
  }
  return rv;
});

test("reentrant blocklambda calltree teardown", 'BbABacd', function() {

  var rv = '';

  function foo(f) {
    waitfor {
      try { f('a'); } finally { rv += 'a' }
    }
    and {
      try { f('b'); } finally { rv += 'b' }
    } 
    finally {
      rv += 'c';
    }
  }

  function bar() {
    try {
      foo { 
        |x|
        try {
          if (x == 'a') {
            try {
              hold();
            }
            finally {
              rv += 'A';
            }
          }
          else
            return;
        }
        finally {
          rv += 'B';
        }
      }
    }
    finally {
      rv += 'd';
    }
  }

  bar();
  return rv;
});




test("double dot falsly encoding as nblock bug", true, function() {
  function A() {
    hold(0);
    return ->true;
  }
  function id(x) { return x }

  // "id(A()(),1)" works. But for "A()() .. id(1)", the compiler was
  // fooled into thinking that the call to id(.) can be encoded as non
  // blocking
  return A()() .. id(1)
});

test("async blocklambda return", 'ar', function() {
  var rv = '';
  
  function inner() {
    thrice {
      ||
      rv += 'a';
      hold(0);
      return 'r';
      rv += 'b';
    }
    rv += 'c';
  }
  
  rv += inner();

  return rv;
});



test("async blocklambda continue", 'aaac', function() {
  var rv = '';

  thrice {
    ||
    rv += 'a';
    hold(0);
    continue;
    rv += 'b';
  }

  rv += 'c';
  
  return rv;
});

test("async blocklambda break", 'ac', function() {
  var rv = '';

  thrice {
    ||
    rv += 'a';
    hold(0);
    break;
    rv += 'b';
  }
  rv += 'c';

  return rv;
});

test("nested blocklambda break", 'ac', function() {
  var rv = '';

  function exec(x) { x() } 

  exec {
    ||
    thrice {
      ||
      rv += 'a';
      break;
      rv += 'b';
    }
    rv += 'c';
  }

  return rv;
});

test("async nested blocklambda break", 'ac', function() {
  var rv = '';

  function exec(x) { x() } 

  exec {
    ||
    thrice {
      ||
      rv += 'a';
      hold(0);
      break;
      rv += 'b';
    }
    rv += 'c';
  }

  return rv;
});

test("tail-called async nested blocklambda break", 'a', function() {
  var rv = '';

  function exec(x) { x() } 

  // exec must not tail-call thrice here, or the 'break' won't find
  // it's targeted scope
  exec {
    ||
    thrice {
      ||
      rv += 'a';
      hold(0);
      break;
      rv += 'b';
    }
  }

  return rv;
});


test("async blocklambda break in do-while", 'ac', function() {
  var rv = '';

  do {
    thrice {
      ||
      rv += 'a';
      hold(0);
      break;
      rv += 'b';
    }
    rv += 'c';
  }
  while (false)

  return rv;
});

test("async blocklambda break in while()", 'ac', function() {
  var rv = '';

  while(1) {
    thrice {
      ||
      rv += 'a';
      hold(0);
      break;
      rv += 'b';
    }
    rv += 'c';
    break;
  }

  return rv;
});

test("blocklambda break in for(;;)", 'ac', function() {
  var rv = '';

  for(;;) {
    thrice {
      ||
      rv += 'a';
      break;
      rv += 'b';
    }
    rv += 'c';
    break;
  }

  return rv;
});


test("async blocklambda break in for(;;)", 'ac', function() {
  var rv = '';

  for(;;) {
    thrice {
      ||
      rv += 'a';
      hold(0);
      break;
      rv += 'b';
    }
    rv += 'c';
    break;
  }

  return rv;
});

test("async blocklambda break in for-in", 'ac', function() {
  var rv = '';

  for(var a in {x:1}) {
    thrice {
      ||
      rv += 'a';
      hold(0);
      break;
      rv += 'b';
    } 
    rv += 'c';
    break;
  }

  return rv;
});

test("async blocklambda break in switch", 'ac', function() {
  var rv = '';

  switch(1) {
    case 1:
    thrice {
      ||
      rv += 'a';
      hold(0);
      break;
      rv += 'b';
    } 
    rv += 'c';
    break;
  }

  return rv;
});

test("async blocklambda break in switch", 'ac', function() {
  var rv = '';

  switch(1) {
    case 1:
    thrice {
      ||
      rv += 'a';
      break;
      rv += 'b';
    } 
    rv += 'c';
    break;
  }

  return rv;
});

test("async blocklambda break in if()", 'ac', function() {
  var rv = '';

  if(1) {
    thrice {
      ||
      rv += 'a';
      break;
      rv += 'b';
    } 
    rv += 'c';
  }

  return rv;
});


test("async blocklambda break in try", 'ac', function() {
  var rv = '';

  try {
    thrice {
      ||
      rv += 'a';
      hold(0);
      break;
      rv += 'b';
    }
    rv += 'c';
  }
  catch (e) { rv += 'e' }

  return rv;
});

test("async blocklambda break in catch", 'ac', function() {
  var rv = '';

  try {
    throw 'foo';
  }
  catch (e) {
    thrice {
      ||
      rv += 'a';
      hold(0);
      break;
      rv += 'b';
    }
    rv += 'c';
  }

  return rv;
});

test("async blocklambda break in finally", 'ac', function() {
  var rv = '';

  try {
    //
  }
  finally {
    thrice {
      ||
      rv += 'a';
      hold(0);
      break;
      rv += 'b';
    }
    rv += 'c';
  }

  return rv;
});

test("async blocklambda break in retract", 'ac', function() {
  var rv = '';
  
  waitfor {
    try {
      hold();
    }
    retract {
      thrice {
        ||
        rv += 'a';
        hold(0);
        break;
        rv += 'b';
      }
      rv += 'c';
    }
  }
  or {
    // 
  }

  return rv;
});

test("async blocklambda break in waitfor() {}", 'ac', function() {
  var rv = '';

  waitfor() {
    thrice {
      ||
      rv += 'a';
      hold(0);
      break;
      rv += 'b';
    }
    rv += 'c';
    resume();
  }

  return rv;
});

test("async blocklambda break in waitfor/or", 'ac', function() {
  var rv = '';

  waitfor {
    thrice {
      ||
      rv += 'a';
      hold(0);
      break;
      rv += 'b';
    }
    rv += 'c';
  }
  or {
    hold();
  }

  return rv;
});

test("async blocklambda break in waitfor/and", 'ac', function() {
  var rv = '';

  waitfor {
    thrice {
      ||
      rv += 'a';
      hold(0);
      break;
      rv += 'b';
    }
    rv += 'c';
  }
  and {
    hold(0);
  }

  return rv;
});

test('reentrant quench/abort', 'ok', function() {

  // This used to produce a "Cannot call method 'quench' of null"
  // error in the runtime.

  // The code causes 'quench' and 'abort' to be called on the 'Sc'
  // execution frame of the call 'r()'. This execution frame doesn't
  // have a child frame, which caused the quench call to fail. Now we
  // check for null child frames in EF_Proto.quench/abort, fixing this
  // bug.
  var r, stratum;
  waitfor {
    waitfor() {
      r = resume;
    }
    stratum.abort();
  }
  and {
    stratum = reifiedStratum.spawn(->(hold(0),r()));
  }
  return 'ok';
});

test('reentrant stratum abort', 'a|b|c', function() {

  var rv = '';

  function append_to_rv(txt) { rv += txt }

  var stratum = reifiedStratum.spawn (
    function() {
      hold(0); // ensure 'stratum' var is filled in
      try {
        reifiedStratum.spawn(stratum.abort);
        append_to_rv('a');
        hold(0); // this should be retracted
        rv += 'X';
      }
      retract {
        rv += '|b';
      } 
    });

   // wait for stratum to finish
   stratum.wait();
   rv += '|c';
  return rv;
});

test('synchronous reentrant stratum abort', 'a|b|c', function() {
  // Note: up to version fbddca13b727870f5efd0e220e9f37d1316115ae, this used
  // to call the retract AFTER the stratum.value call, because of the way
  // abort cycles were resolved.
  var rv = '';

  function append_to_rv(txt) { rv += txt }

  var stratum = reifiedStratum.spawn (
    function() {
      hold(0); // ensure 'stratum' var is filled in
      try {
        stratum.abort(); 
        append_to_rv('a');
        hold(0); // this should be aborted
        rv += 'X';
      }
      retract {
        rv += '|b';
      } 
    });

   // wait for stratum to finish
  stratum.wait();
   rv += '|c';
  return rv;
});


test('reentrant stratum abort via loop & blocklambda', 'a|b|c', function() {

  var rv = '';

  function bl_caller(f) {
    while (1) {
      hold(0);
      f();
      hold(0);
    }
  }

  var stratum = reifiedStratum.spawn (
    function() {
      hold(0); // ensure 'stratum' var is filled in
      try {
        bl_caller { 
          ||
          stratum.abort(); 
          rv += 'a';
          hold(0); // this should be aborted
          rv += 'X';
        }
      }
      retract {
        rv += '|b';
      } 
    });

   // wait for stratum to finish
  stratum.wait();
  rv += '|c';
  return rv;
});

test('synchronous reentrant stratum abort via loop & blocklambda', 'a|b|c', function() {

  var rv = '';

  function bl_caller(f) {
    while (1) {
      hold(0);
      f();
      hold(0);
    }
  }

  var stratum = reifiedStratum.spawn (
    function() {
      hold(0); // ensure 'stratum' var is filled in
      try {
        bl_caller { 
          ||
          reifiedStratum.spawn(stratum.abort);
          rv += 'a';
          hold(0); // this should be retracted
          rv += 'X';
        }
      }
      retract {
        rv += '|b';
      } 
    });

   // wait for stratum to finish
  stratum.wait();
  rv += '|c';
  return rv;
});


test('reentrant stratum abort via loop & resume', 'a|b|c', function() {

  var rv = '';

  var R;

  var stratum = reifiedStratum.spawn(
    function() {
      hold(0); // ensure 'stratum' var is filled in
      try {
        while (1) {
          waitfor() {
            R = resume;
          }
          retract {
            console.log('hitting weird retract');
          }
          stratum.abort();
          rv += 'a';
          hold(0);  // this should be aborted
          rv += 'X';
        }
      }
      retract {
        rv += '|b';
      } 
    });

  hold(0);
  reifiedStratum.spawn(->(hold(100),R()));

   // wait for stratum to finish
   stratum.wait();
   hold(100);
   rv += '|c';
  return rv;
});

test('synchronous reentrant stratum abort via loop & resume', 'a|b|c', function() {

  var rv = '';

  var R;

  var stratum = reifiedStratum.spawn(
    function() {
      hold(0); // ensure 'stratum' var is filled in
      try {
        while (1) {
          waitfor() {
            R = resume;
          }
          retract {
            console.log('hitting weird retract');
          }
          reifiedStratum.spawn(stratum.abort);
          rv += 'a';
          hold(0); // this should be retracted
          rv += 'X';
        }
      }
      retract {
        rv += '|b';
      } 
    });

  hold(0);
  reifiedStratum.spawn(->(hold(100),R()));

   // wait for stratum to finish
  stratum.wait();
  rv += '|c';
  return rv;
});


test("single-sided conditional: true ? 'yes'", 'yes', function() {
  return true ? 'yes';
});

test("single-sided conditional: false ? 'yes'", undefined, function() {
  return false ? 'yes';
});

test("single-sided conditional: true ? blocking_yes()", 'yes', function() {
  function blocking_yes() { hold(0); return 'yes'; }
  return true ? blocking_yes();
});

test("reentrant blocklambda resume/break", undefined, function() {
  function call(bl) { bl(); }
  var R;
  waitfor {
    call {|| 
      waitfor() { R = resume } 
      break; 
      hold();
     };
  }
  and { R(); }
});

test("reentrant abortion from catch()", 'ok', function() {
  var cont;
  waitfor {
    waitfor() { cont = resume; }
  }
  or {
    try {
      hold(0);
      throw 'inner'; 
    }
    catch(e) {
      cont(); // this triggers reentrant abortion of this waitfor/or branch
      hold(); // this hold needs to be retracted
    }
  }
  return 'ok';
});

test("collapse from blocklambda", 'b',
     function() {
       function call(bl) { bl(); } 
       var rv = '';
       try {
         waitfor {
           hold(100);
           rv += 'a';
         }
         or {
           call {||          
             hold(0);
             collapse;
             rv += 'b';
           };
           hold(200);
         }
       }
       catch (e) {
         rv += 'x';
       }
       return rv;
     });

function callme(f) { f(); }

test("collapse from blocklambda via intermediate", 'rb',
     function() {
       

       var rv = '';
       try {
         waitfor {
           try {
             hold(100);
           }
           retract {
             rv += 'r';
           }
           rv += 'a';
         }
         or {
           callme {||
             hold(0);
             collapse;
             rv += 'b';
           };
           hold(200);
         }
       }
       catch (e) {
         rv += 'x';
       }
       return rv;
     });


test("disallow collapse from function", 'x',
     function() {
       var rv = '';
       try {
         waitfor {
           hold(100);
           rv += 'a';
         }
         or {
           (function() { 
             hold(0);
             collapse;
             rv += 'b';
           })();
         }
       }
       catch (e) {
         rv += 'x';
       }
       return rv;
     });

test("reentrant 'stratum aborted' exception persistence edge case", true, 
     function() {
       // we're starting a stratum and aborting it from within.  when
       // we later attempt to retrieve the stratum's value it should
       // be an exception.

       function S() {
         hold(0);
         stratum.abort();
         hold();
       }
       var stratum = spawn(S);

       try { 
         // wait a bit, then pick up return value from stratum; it
         // should be an exception.
         hold(100);
         stratum.value();
         return false;
       }
       catch (e) {
         return true;
       }
     }).skip('capability removed');


// XXX the logic here used to be different: we used to abort at the hold() also for
// cases where async_try_catch=true. The rationale was that the sync & async cases should produce the same
// outcome.
// However, a different way of looking at it is:
//  while(1) { something_async; } next();
// Here, we expect next() not to be executed on abortion
function makeAbortBreakTest(async_try_catch, late_pickup) {
  return function() {
    var rv = '';
    
    function S() {
      hold(50); // make sure 'stratum' is defined
      while(1) {
        try { 
          if (async_try_catch)
            hold(50); // asynchronize try/catch
          rv += 'a';
          throw new Error('foo');
        }
        catch(e) {
          stratum.abort();
          rv += 'b';
          break;
          rv += 'x';
        }
        rv += 'y';
      } // this is where stratum should abort in async case
      rv += 'c';
      hold(); // this is where stratum should abort in sync case
      rv += 'z';
    }
    
    var stratum = reifiedStratum.spawn(S);
    
    // xxx the 'late_pickup' flag doesn't really make sense any more, now that we've removed the ability of strata to store return values
    if (late_pickup)
      hold(200); // only attempt to pick up value after stratum aborted 
    stratum.wait();
    rv += 'd';

    return rv;
    
  }
}

test("reentrant abort/break edge case with sync try/catch, early pickup", 
     'abcd', 
     makeAbortBreakTest(false, false));

test("reentrant abort/break edge case with sync try/catch, late pickup", 
     'abcd', 
     // used to yield 'abc'
     makeAbortBreakTest(false, true));

test("reentrant abort/break edge case with async try/catch, early pickup", 
     'abd', 
     // used to yield 'Uncaught error: Error: Unexpected break statement'
     makeAbortBreakTest(true, false));

test("reentrant abort/break edge case with async try/catch, late pickup", 
     'abd', 
     makeAbortBreakTest(true, true));

test('tailcalled blocklambda break / par edge case', 'b', 
     function() {
       function call(bl) { bl(); }
       var rv = '';
       waitfor {
         // this `break` should only abort the blocklambda. it
         // erroneously used to abort the waitfor/and
         call {|| hold(0); break; rv += 'a';};
       }
       and {
         hold(100);
         rv += 'b';
       }
       return rv;
     });

test('waitfor/and exception edgecase', 'ok',
     function() {
       function f() {
         waitfor {
           try {
             hold();
           }
           finally {
             hold(0);
             throw new Error('foo');
           }
         }
         and {
           // this return used to cause the Error 'foo' being swallowed
           return;
         }
       }

       try {
         f();
       }
       catch(e) {
         return 'ok';
       }
       return 'not ok';
     });

test('waitfor/and exception edgecase (async)', 'ok',
     function() {
       function f() {
         waitfor {
           try {
             hold();
           }
           finally {
             hold(0);
             throw new Error('foo');
           }
         }
         and {
           hold(0);
           // this return used to cause the Error 'foo' being swallowed
           return;
         }
       }

       try {
         f();
       }
       catch(e) {
         return 'ok';
       }
       return 'not ok';
     });

test('waitfor/and exception edgecase 2', 'ok',
     function() {
       function f() {
         var X;
         waitfor {
           waitfor() {
             X = resume;
           }
           return;
         }
         and {
           try {
             throw new Error('foo');
           }
           finally {
             X();
           }
         }
       }

       try {
         f();
       }
       catch(e) {
         return 'ok';
       }
       return 'not ok';
     });


test('waitfor/and exception edgecase 2 (async)', 'ok',
     function() {
       function f() {
         var X;
         waitfor {
           waitfor() {
             X = resume;
           }
           return;
         }
         and {
           try {
             hold(0);
             throw new Error('foo');
           }
           finally {
             X();
           }
         }
       }

       try {
         f();
       }
       catch(e) {
         return 'ok';
       }
       return 'not ok';
     });

//---

test('waitfor/or exception edgecase', 'ok',
     function() {
       function f() {
         waitfor {
           try {
             hold();
           }
           finally {
             hold(0);
             throw new Error('foo');
           }
         }
         or {
           // this return used to cause the Error 'foo' being swallowed
           return;
         }
       }

       try {
         f();
       }
       catch(e) {
         return 'ok';
       }
       return 'not ok';
     });

test('waitfor/or exception edgecase (async)', 'ok',
     function() {
       function f() {
         waitfor {
           try {
             hold();
           }
           finally {
             hold(0);
             throw new Error('foo');
           }
         }
         or {
           hold(0);
           // this return used to cause the Error 'foo' being swallowed
           return;
         }
       }

       try {
         f();
       }
       catch(e) {
         return 'ok';
       }
       return 'not ok';
     });

test('waitfor/or exception edgecase 2', 'ok',
     function() {
       function f() {
         var X;
         waitfor {
           waitfor() {
             X = resume;
           }
           // the return here used to cause the error 'foo' being swallowed
           return;
         }
         or {
           try {
             throw new Error('foo');
           }
           finally {
             X();
           }
         }
       }

       try {
         f();
       }
       catch(e) {
         return 'ok';
       }
       return 'not ok';
     });


test('waitfor/or exception edgecase 2 (async)', 'ok',
     function() {
       function f() {
         var X;
         waitfor {
           waitfor() {
             X = resume;
           }
           // the return here used to cause the error 'foo' being swallowed
           return;
         }
         or {
           try {
             hold(0);
             throw new Error('foo');
           }
           finally {
             X();
           }
         }
       }

       try {
         f();
       }
       catch(e) {
         return 'ok';
       }
       return 'not ok';
     });

//--

test('waitfor/or exception edgecase 3', 'ok',
     function() {
       function f() {
         var X;
         waitfor {
           waitfor() {
             X = resume;
           }
           // the implicit teardown of the waitfor/or here used to cause the error 'foo' being swallowed
         }
         or {
           try {
             throw new Error('foo');
           }
           finally {
             X();
           }
         }
       }

       try {
         f();
       }
       catch(e) {
         return 'ok';
       }
       return 'not ok';
     });

test('waitfor/or exception edgecase 3 (async)', 'ok',
     function() {
       function f() {
         var X;
         waitfor {
           waitfor() {
             X = resume;
           }
           // the implicit teardown of the waitfor/or here used to cause the error 'foo' being swallowed
         }
         or {
           try {
             hold(0);
             throw new Error('foo');
           }
           finally {
             X();
           }
         }
       }

       try {
         f();
       }
       catch(e) {
         return 'ok';
       }
       return 'not ok';
     });

//--

test('waitfor/or exception edgecase 4', 'ok',
     function() {
       function f() {
         var X;
         waitfor {
           waitfor() {
             X = resume;
           }
           // the collapse of the waitfor/or here used to cause the error 'foo' being swallowed
           collapse;
         }
         or {
           try {
             throw new Error('foo');
           }
           finally {
             X();
           }
         }
       }

       try {
         f();
       }
       catch(e) {
         return 'ok';
       }
       return 'not ok';
     });

test('waitfor/or exception edgecase 4 (async)', 'ok',
     function() {
       function f() {
         var X;
         waitfor {
           waitfor() {
             X = resume;
           }
           // the collapse of the waitfor/or here used to cause the error 'foo' being swallowed
           collapse;
         }
         or {
           try {
             hold(0);
             throw new Error('foo');
           }
           finally {
             X();
           }
         }
       }

       try {
         f();
       }
       catch(e) {
         return 'ok';
       }
       return 'not ok';
     });

//--

test('waitfor/or uncaught exception edgecase', 'ok',
     function() {
       function f() {
         waitfor {
           try {
             hold();
           }
           finally {
             // this used to be thrown as an uncaught exception
             throw new Error('foo');
           }
         }
         or {
           hold(0);
           return;
         }
       }
       
       try {
         f();
       }
       catch(e) {
         return 'ok';
       }
       return 'not ok';
     });

test('waitfor/and uncaught exception edgecase', 'ok',
     function() {
       function f() {
         waitfor {
           try {
             hold();
           }
           finally {
             // this used to be thrown as an uncaught exception
             throw new Error('foo');
           }
         }
         and {
           hold(0);
           return;
         }
       }
       
       try {
         f();
       }
       catch(e) {
         return 'ok';
       }
       return 'not ok';
     });


test('stratum abort waits for blocking finally', 'AabB',
     function() {
       var rv = '';
       var stratum = reifiedStratum.spawn (function() { try { hold(); } finally { rv += 'a';  hold(0); rv += 'b'; } });
       hold(0);
       rv += 'A';
       stratum.abort().wait();
       rv += 'B';
       return rv;
     });

test('detached blocklambda return / stratum.value / stratum.abort interaction', 'finally blocklambda',
     function() {

       var rv = '';

       function outer() {
         function inner(r) {
           var stratum;
           try {
             stratum = reifiedStratum.spawn(r);
             stratum.wait();
             rv += 'not reached ';
             return 'inner';
           }
           finally {
             rv += 'finally ';
             stratum.abort();
           }
         }
         
         return inner { || hold(0); return 'blocklambda'; };
       }

       rv += outer();
       return rv;
     });

test("detached blocklambda break", 'ad', function() {
  var rv = '';
  function f(g) {
    reifiedStratum.spawn(g);
    hold(100);
    rv += 'c';
  }
  f { || rv += 'a'; break; rv += 'b' };
  rv += 'd';
  return rv;
});

/*
  detached blocklambdas are e.g. used in @each.track:

    @integers() .. @monitor(-> hold(50)) .. @each.track {
      |x|
      hold(0);
      console.log(x);
      if (x === 10) break;
    }

    console.log('done');

  Here, @each.track internally spawns the provided blocklambda

*/
test("detached async blocklambda break 1", 'ad', function() {
  var rv = '';
  function f(g) {
    reifiedStratum.spawn(g);
    hold(100);
    rv += 'c';
  }
 
  f { || rv += 'a'; hold(0); break; rv += 'b' };

  rv += 'd';
  return rv;
});

test("detached async blocklambda break with blocking finally", 'ahfd', function() {
  var rv = '';
  function f(g) {
    reifiedStratum.spawn(g);
    try {
      rv += 'h';
      hold(100);
    }
    finally {
      hold(100);
      rv += 'f';
    }
    rv += 'c';
  }
 
  f { || rv += 'a'; hold(0); break; rv += 'b' };

  rv += 'd';
  return rv;
});

test("detached sync blocklambda break with blocking finally", 'ahfd', function() {
  var rv = '';
  function f(g) {
    reifiedStratum.spawn(g);
    try {
      rv += 'h';
    }
    finally {
      hold(100);
      rv += 'f'; 
    } // <- should break here
    rv += 'x';
    hold(0); 
    rv += 'y';
  }
 
  f { || rv += 'a'; hold(0); break; rv += 'b' };

  rv += 'd';
  return rv;
});

test("blocking finally is abort point in sync processing", 'abcd', function() {
  var rv = '';
  waitfor {
    try {
      rv += 'a';
    }
    finally {
      hold(100);
      rv += 'c';
    } // <-- should abort here
    rv += 'x';
    hold(0); 
    rv += 'y';
  }
  or {
    hold(0);
    rv += 'b';
  }
  rv += 'd';
  return rv;
});

test("blocking retract / sync processing", 'abcd', function() {
  var rv = '';
  waitfor {
    try {
      try {
        rv += 'a';
      }
      finally {
        hold(100);
        rv += 'c';
      }
    }
    retract {
      hold(100);
      rv += 'd';
    }  // <-- should abort here
    rv += 'x';
    hold(0);
    rv += 'y';
  }
  or {
    hold(0);
    rv += 'b';
  }

  return rv;
});


test("unroutable async blocklambda break", 'acde', function() {
  var rv = '';
  function foo() {
    var parent = reifiedStratum;
    function f(g) {
      parent.spawn(g);
      hold(0);
      rv += 'c';
    }
    
    f { || rv += 'a'; try { break; } finally { hold(100); } rv += 'b' };
    
    rv += 'd';
    hold(2000);
    return rv;
  }

  try { 
    return foo();
  }
  catch (e) {
    if (e.message === 'Unroutable blocklambda break')
      rv += 'e';
    return rv;
  }
}).skip('FIXME _taskXXX');

test("detached blocklambda break with value pickup", 'bv', function() {
  var stratum;
  var rv = '';
  function f(s) { 
    stratum = reifiedStratum.spawn(s);
    hold(100);
    rv += 'a';
  }
  
  waitfor {
    f {|| hold(0); break; }
    rv += 'b';
  }
  and {
    stratum.wait();
    rv += 'v';
  }
  return rv;
});

test("detached blocklambda break with value pickup & finally", 'vfb', function() {
  var stratum;
  var rv = '';
  function f(s) { 
    stratum = reifiedStratum.spawn(s);
    hold(100);
    rv += 'a';
  }
  
  waitfor {
    try {
      f {|| hold(0); break; }
    }
    finally {
      hold(100);
      rv += 'f';
    }
    rv += 'b';
  }
  and {
    stratum.wait();
    rv += 'v';
  }
  return rv;
});

test('detached blocklambda break / stratum.value / stratum.abort interaction', 'finally outer',
     function() {

       var rv = '';

       function outer() {
         function inner(r) {
           var stratum;
           try {
             stratum = reifiedStratum.spawn(r);
             stratum.wait();
             rv += 'not reached ';
             return 'inner';
           }
           finally {
             rv += 'finally ';
             stratum.abort(); // <- this abort is actually ineffective & unnecessary
           }
         }
         
         inner { || hold(0); break; };
         return 'outer';
       }

       rv += outer();
       return rv;
     });

// this test exercises some features used in our sequence::each.track implementation:
test('nested blocklambda abort/break', '0(0)(1)(2)(3)(4)5(5)6(6)7(7)8(8)9', 
     function() {
       var rv = '';

       function driver(consumer) {
         var stratum;

         function abort_stratum(i) {
           try { /* */ }
           finally {
             // this is in a finally clause, so that cascaded strata are forced to cancel on the
             // previous one.
             // Our each.track implementation takes a different approach: there strata adopt 
             // their previous ones, effectively forcing them to wait for the previous one
             // (and also taking care of correct exception routing).
             stratum.abort().wait();
             rv += '('+i+')';
           }
         }

         for (var i=0; i<=10; ++i) {
           stratum = reifiedStratum.spawn(-> (stratum ? abort_stratum(i-1), consumer(i)));
           if (i == 5) hold(100);
         }         
         rv += 'not reached';
       }
       
       driver { 
         |x| 
         rv += x; 
         if (x === 9) break;
         try { hold(); } finally { if (x<5) hold(0); } 
       };
       
       return rv;
     });

// XXX these cyclic abort tests don't really make sense anymore, since stratum::abort is now async.
// What we really want to test here is a deadlock scenario (and we currently DO deadlock on stratum::wait, but that is probably OK).

test('cyclic abort 1', '1',
     function() {
       var rv = '';
       var stratum = reifiedStratum.spawn (function() { hold(0); try { stratum.abort(); } finally { rv += '1' } });
       hold(100);
       return rv;
     });

test('cyclic abort 2', '12',
     function() {
       var rv = '';
       var stratum = reifiedStratum.spawn (function() { hold(0); try { try { stratum.abort(); } finally { rv += '1' } }finally{ rv+='2'} });
       hold(100);
       return rv;
     });

test('cyclic abort 3', '12',
     function() {
       var rv = '';
       var stratum = reifiedStratum.spawn (function() { hold(0); waitfor { stratum.abort(); } and { try { hold(); } finally { rv += '1'} } finally { rv += '2' } });
       hold(100);
       return rv;
     });

test('cyclic abort 1 async', '1',
     function() {
       var rv = '';
       var stratum = reifiedStratum.spawn (function() { try { hold(0); stratum.abort(); } finally { rv += '1' } });
       hold(100);
       return rv;
     });

test('cyclic abort 2 async', '12',
     function() {
       var rv = '';
       var stratum = reifiedStratum.spawn (function() {  try { try { hold(0); stratum.abort(); } finally { rv += '1' } }finally{ rv+='2'} });
       hold(100);
       return rv;
     });

test('cyclic abort 3 async', '12',
     function() {
       var rv = '';
       var stratum = reifiedStratum.spawn (function() { waitfor { hold(0); stratum.abort(); } and { try { hold(); } finally { rv += '1'} } finally { rv += '2' } });
       hold(100);
       return rv;
     });

test('cyclic abort 4', '12',
     function() {
       var rv = '';
       var stratum = reifiedStratum.spawn (function() {  waitfor { hold(0); stratum.abort(); } or { try { hold(); } finally { rv += '1'} } finally { rv += '2' } });
       hold(100);
       return rv;
     });

test('cyclic abort 5', '12',
     function() {
       var rv = '';
       var stratum = reifiedStratum.spawn (function() { hold(0); waitfor { stratum.abort(); } and { try { hold(); } finally { stratum.abort(); rv += '1'} } finally { rv += '2' } });
       hold(100);
       return rv;
     });

test('cyclic abort 1 / async finally', '1',
     function() {
       var rv = '';
       var stratum = reifiedStratum.spawn (function() { hold(0); try { stratum.abort(); } finally { hold(0); rv += '1' } });
       hold(100);
       return rv;
     });

test('cyclic abort 2 / async finally', '12',
     function() {
       var rv = '';
       var stratum = reifiedStratum.spawn (function() { hold(0); try { try { stratum.abort(); } finally { hold(0); rv += '1' } }finally{ hold(0); rv+='2'} });
       hold(100);
       return rv;
     });

test('cyclic abort 3 / async finally', '12',
     function() {
       var rv = '';
       var stratum = reifiedStratum.spawn (function() { hold(0); waitfor { stratum.abort(); } and { try { hold(); } finally { hold(0); rv += '1'} } finally { hold(0); rv += '2' } });
       hold(100);
       return rv;
     });

test('cyclic abort 4 / async finally', '12',
     function() {
       var rv = '';
       var stratum = reifiedStratum.spawn (function() {  waitfor { hold(0); stratum.abort(); } or { try { hold(); } finally { hold(0); rv += '1'} } finally { hold(0); rv += '2' } });
       hold(100);
       return rv;
     });

test('cyclic abort 5 / async finally', '12',
     function() {
       var rv = '';
       var stratum = reifiedStratum.spawn (function() { hold(0); waitfor { stratum.abort(); } and { try { hold(); } finally { hold(0); stratum.abort(); rv += '1'} } finally { hold(0); rv += '2' } });
       hold(100);
       return rv;
     });

test('abort resolved stratum', '1',
     function() {
       var rv = '';
       var stratum = reifiedStratum.spawn (function() { hold(0); rv+='1'});
       stratum.wait();
       stratum.abort();
       return rv;
     });

test('waitfor/or abort', '213',
     function() {
       var rv = '';
       var stratum = reifiedStratum.spawn (function() {  waitfor { try {hold(); }finally { hold(0); rv+='1'} } or { try { hold(); } finally { rv += '2'} } finally { rv += '3' } });
       hold(0);
       stratum.abort().wait();
       return rv;
     });

test('for-in loop property deletion', 'abd',
     function() {
       var X = {a:1, b:2, c:3, d:4};
       var rv = '';
       for (var x in X) {
         rv += x;
         if (x === 'b')
           delete X.c;
       }
       return rv;
     });

test('for-in loop property async deletion', 'abd',
     function() {
       var X = {a:1, b:2, c:3, d:4};
       var rv = '';
       for (var x in X) {
         hold(0);
         rv += x;
         if (x === 'b')
           delete X.c;
       }
       return rv;
     });

test('blocking finally clause is abort point 1', 'ab',
     function() {
       var rv = '';
       
       function stratum() {
         hold(0);
         try {
           rv += 'a';
         }
         finally {
           S.abort();
           rv+= 'b';
           hold(0);
         }  // <-- this should be aborted
         rv += 'x';
         hold(0);
       }
       
       var S = reifiedStratum.spawn(stratum);

       reifiedStratum.join(); // wait for substratum to be done

       return rv;
     });

test('blocking finally clause is abort point 2', 'abc',
     function() {
       var rv = '';
       
       function stratum() {
         hold(0);
         try {
           rv += 'a';
         }
         finally {
           try {
             S.abort();
           }
           finally { hold(0); rv+='b';}
           rv+= 'c';
         } // <-- this should be aborted
         rv += 'x';
         hold(0); 
       }
       
       var S = reifiedStratum.spawn(stratum);

       reifiedStratum.join(); // wait for stratum to be done

       return rv;
     });

test('blocking finally clause in loop is abort point', 'ab',
     function() {
       var rv = [];

       waitfor {
         hold(0);
         rv += 'a';
       }
       or {
         do {
           try {} finally { hold(100); break; } // <-- should abort here; break has no effect
         } while (0);
         rv += 'x';
         hold(0);
         rv += 'y';
       }
       rv += 'b';

       return rv;
     });

// this is a complicated variant of the previous test:
test('blocking finally clause in loop is abort point - complicated', 'ab',
     function() {
       var rv = '';
       
       function stratum() {
         hold(0);
         do {
           try {
             rv += 'a';
           }
           finally {
             S.abort(); hold(0);
             rv+= 'b';
           } // <-- this should be aborted

           // the 'if' statement is to package the code up in a 'seq'
           if (true) {
             rv += 'x';
             try {} finally { hold(0); }  

             rv += 'y';
           //  break; // ineffective 'break'
           }
         } while(0);
         rv += 'c';
         hold(0);
       }
       
       var S = reifiedStratum.spawn(stratum);

       S.wait() // wait for stratum to be done

       return rv;
     });

test('sync blocklambda break routing', 'ab', function() {
  var rv = '';
  function aborter(block) { var S = reifiedStratum.spawn(block); rv + 'x'; hold(); }
  
  function foo() { 
    hold(0);
    aborter { ||
      rv += 'a';
      break;
    }
    return true;
  }

  if (foo()) rv += 'b';

  return rv;

});


// this used to just hang because of old spawn implementation accidentally returning 'ef_if' frame to sync caller
test('sync blocklambda return routing edgecase', 'ab', function() {
  var rv = '';
  function aborter(block) { var S = reifiedStratum.spawn(block); rv + 'x'; hold(); }
  
  function foo() { 
    hold(0);
    aborter { ||
      rv += 'a';
      return true;
    }
  }

  if (foo()) rv += 'b';

  return rv;

});

test('reentrant if-abortion edgecase', 'abc', function() {
  var rv = '';
  var R;
  waitfor {
    waitfor() {
      R = resume;
    }
    rv += 'a';
  }
  or {
    if (hold(0),true) {
      R();
      rv += 'b';
      hold(0);
      rv + 'X'; // should not be reached
      hold();
    }
  }
  // this used to be never reached
  rv += 'c';
  return rv;
});


/*
  stray-abort

  This leakage of abort control flow exceptions used to cause a disconnect in the conductance birdge for the following test case:

  abort.app
  ----------------------------------------------------------------------
  @ = require(['mho:std', 'mho:app']);

  require('mho:surface/api-connection').withAPI('./abort.api') { 
    |api|

    function via_server(g) {
      try {
        api.C(g);
      }
      finally {
        hold(0);
      }
    }

    function test() {
      via_server { || return 'success'; };
    }

    document.body .. @appendContent(`<div>${test()}</div>`);
    hold();

  }
  ----------------------------------------------------------------------

  abort.api
  ----------------------------------------------------------------------
  @ = require(['mho:std']);

  exports.C = f -> f();
  ----------------------------------------------------------------------
*/
test('stray-abort', 'a', function() {
  var rv = '';
  function perform_in_js(f) {
    try {
      return f();
    }
    catch(e) {
      rv += 'c';
      throw e;
    }
  }

  function inner(a) {
    var P = reifiedStratum;
    function call_via_stratum() {
      return P.spawn(a);
    }
    hold(0);
    perform_in_js(call_via_stratum);
    hold();
  }

  function test() {
    inner { || return 'a'; }
  }

  rv += test();

  return rv;  
});

// This test used to generate an internal SJS error (Cannot read property 'length' of undefined), 
test('par-reentrant-tailcall-edgecase', 'abcd', function() {
  var rv = '';
  var R;
  waitfor {
    hold(0);
    rv += 'c';
  }
  and {
    waitfor() { R = resume; }
    rv += 'a';
  }
  and {
    R();
    rv += 'b';
  }
  rv += 'd';
  return rv;
});

// This test used to loop forever... the `abort` wasn't fed past the inner waitfor due to buggy 
// handling of the async abort path in vm1::EF_Alt
test('alt-abort-edgecase', 'r', function() {
  var rv = '';
  waitfor {
    while (1) {
      console.log('loop...');
      waitfor {
        try {
          hold();
        }
        finally {
          //console.log('loop finally ... ');
          hold(100);
          rv += 'r';
        }
      }
      or {
        hold();
      }
    }
  }
  or {
    //console.log('retracting other branch...');
  }

  return rv;
});

//----------------------------------------------------------------------

test('bl return across spawn - sync', 'xfRF', function() {
  var rv = '';
  function foo() {
    function call(f) { reifiedStratum.spawn(f); try { hold(); } retract { rv += 'R'; } }
    try {
      call { || try { rv += 'x'; return; } retract { rv += 'r' } finally { rv += 'f' } };
      rv+='!';
      hold();
    }
    retract {
      rv += '@';
    }
    finally {
      rv += 'F';
    }
  }
  foo();
  return rv;
});

// this used to generate 'xfRF'
test('bl return across spawn - async', 'xfRF', function() {
  var rv = '';
  function foo() {
    function call(f) { reifiedStratum.spawn(f); try { hold(); } retract { rv += 'R' } }
    try {
      call { || try { hold(0); rv += 'x'; return; } retract { rv += 'r' } finally { rv += 'f' } }
      rv+='!';
      hold();
    }
    retract {
      rv += '@';
    }
    finally {
      rv += 'F';
    }
  }
  foo();
  return rv;
});

//----------------------------------------------------------------------

// the finally clause here used to silently swallow the error thrown in retract:
test('retract exception pass through - sync', 'xrfe', function() {
  var rv = '';

  function foo() {
    try {
      rv += 'x';
      hold();
    }
    retract {
      rv += 'r';
      throw new Error('e');
    }
    finally {
      rv += 'f';
    }
  }

  waitfor {
    foo();
  }
  or {
    /* sync */
  }
  catch (e) {
    rv += 'e';
  }

  return rv;

});

// the finally clause here used to silently swallow the error thrown in retract:
test('retract exception pass through - async', 'xrfe', function() {
  var rv = '';

  function foo() {
    try {
      rv += 'x';
      hold();
    }
    retract {
      rv += 'r';
      throw new Error('e');
    }
    finally {
      rv += 'f';
    }
  }

  waitfor {
    foo();
  }
  or {
    hold(0);
  }
  catch (e) {
    rv += 'e';
  }

  return rv;

});

// this used to continue going around the loop despite the 'break':
test('swallowed break bug', 'abcd', function() {
  var rv = '';
  function foo() {
    var i = 10;
    while (--i) {
      waitfor {
        try {
          rv += 'a';
          hold(0);
          break;
        }
        finally {
          rv += 'b';
          hold(100);
        }
      }
      or {
        hold(100);
        rv += 'c';
      }
    }
    rv += 'd';
  }

  foo();
  return rv;

});

// this used to continue going around the loop despite the 'break':
test('swallowed return bug', 'abc', function() {
  var rv = '';
  function foo() {
    var i = 10;
    while (--i) {
      waitfor {
        try {
          rv += 'a';
          hold(0);
          return;
        }
        finally {
          rv += 'b';
          hold(200);
        }
      }
      or {
        hold(100);
        rv += 'c';
      }
    }
    rv += 'd';
  }

  foo();
  return rv;

});


// this test used to time out
test('swallowed break in aborted stratum 1', 'abc', function() {

  var rv = '';

  function foo(block) {
    for (var i=0; i<10; ++i) {
      var S = reifiedStratum.spawn(function() { rv += 'a'; hold(0); try { block();} finally { hold(100); rv += 'c';} });
      hold(0);
      rv += 'b';
      reifiedStratum.spawn(S.abort); 

      hold(); // used to be stuck here, as 'break' got swallowed

      rv += 'd';
    }
  }

  foo { || break; }

  return rv;

});

test('swallowed break in aborted stratum 2', 'abc', function() {

  var rv = '';

  function foo(block) {
    for (var i=0; i<10; ++i) {
      var S = reifiedStratum.spawn(function() { rv += 'a'; hold(0); try { block();} finally { hold(100); rv += 'c';} });
      hold(0);
      rv += 'b'; 
      S.abort().wait(); // this should be aborted
      rv += 'd';
    }
  }

  foo { || break; }

  return rv;

});

test('swallowed break in aborted stratum 3', 'abcf', function() {

  var rv = '';

  function foo(block) {
    for (var i=0; i<10; ++i) {
      var S = reifiedStratum.spawn(function() { rv += 'a'; hold(0); try { block();} finally { hold(100); rv += 'c';} });
      hold(0);
      rv += 'b'; 
      try {
        S.abort().wait(); 
      }
      finally {
        rv += 'f';
      }
      rv += 'd';
    }
  }

  foo { || break; }

  return rv;

});

//----------------------------------------------------------------------

test('exception in finally clause in stratum - synchronous', 'afF', function() {
  var rv = '';
  function foo() {
    try {
      hold();
    }
    finally {
      rv += 'f';
      throw 'F';
    }
  }
  function bar() {
    var S = reifiedStratum.spawn(foo);
    rv += 'a';
    S.abort();
    hold(0); // <- should be aborted
    rv += 'x';
  }
  try { bar() }
  catch(e) { rv += e; }
  return rv;
});

test('exception in finally clause in stratum - asynchronous', 'afF', function() {
  var rv = '';
  function foo() {
    try {
      hold();
    }
    finally {
      rv += 'f';
      hold(0);
      throw 'F';
    }
  }
  function bar() {
    var S = reifiedStratum.spawn(foo);
    rv += 'a';
    S.abort();
    hold(0); // <- should be aborted
    rv += 'x';
  }
  try { bar() }
  catch(e) { rv += e; }
  return rv;
});

test('exception in retract clause in stratum - synchronous', 'afF', function() {
  var rv = '';
  function foo() {
    try {
      hold();
    }
    retract {
      rv += 'f';
      throw 'F';
    }
  }
  function bar() {
    var S = reifiedStratum.spawn(foo);
    rv += 'a';
    S.abort();
    hold(0); // <- should be aborted
    rv += 'x';
  }
  try { bar(); }
  catch(e) { rv += e; }
  return rv;
});

test('exception in retract clause in stratum - asynchronous', 'afF', function() {
  var rv = '';
  function foo() {
    try {
      hold();
    }
    retract {
      rv += 'f';
      hold(0);
      throw 'F';
    }
  }
  function bar() {
    var S = reifiedStratum.spawn(foo);
    rv += 'a';
    S.abort();
    hold(0); // <- should be aborted
    rv += 'x';
  }
  try { bar(); }
  catch(e) { rv += e; }
  return rv;
});

test('blocklambda breaks across nested spawned strata', '<o<ii>o>brfirfowd', function() {
  var rv = '';
  var spawnExec = x -> function(block) { 
    rv += '<'+x;
    var stratum = reifiedStratum.spawn(block);
    rv += x+'>';
    try {
      hold();
    }
    retract {
      rv += 'r';
    }
    finally {
      rv += 'f'+x;
    }
    rv += 'X';
  }

  var spawnNested = bl -> spawnExec('o')(function() { spawnExec('i')(bl);
                                                      rv += 'C';
                                                    });
  do {
    spawnNested
              {||
                hold(0);
                rv += 'b';
                break;
                rv += 'B';
              }
    hold(0);
    // should break to here:
    // XXX arguably to the line after the `do` ? NO
    rv += 'w';
  }
  while (0);
  rv += 'd';

  return rv;

});

test('sync blocklambda breaks across nested spawned strata', '<o<ibi>rfio>rfowd', function() {
  var rv = '';
  var spawnExec = x -> function(block) { 
    rv += '<'+x;
    var stratum = reifiedStratum.spawn(block);
    rv += x+'>';
    try {
      hold();
    }
    retract {
      rv += 'r';
    }
    finally {
      rv += 'f'+x;
    }
    rv += 'X';
  }

  var spawnNested = bl -> spawnExec('o')(function() { 
    spawnExec('i')(bl);
    rv += 'X';
  });

  do {
    spawnNested
              {||
                rv += 'b';
                break;
                rv += 'X';
              }
    hold(0);
    // should break to here:
    // XXX arguably to the line after the `do` ?
    rv += 'w';
  }
  while (0);
  rv += 'd';

  return rv;

});

test('blocklambda return across nested spawned strata', '<o<ii>o>brfirfov', function() {
  var rv = '';
  var spawnExec = x -> function(block) { 
    rv += '<'+x;
    var stratum = reifiedStratum.spawn(block);
    rv += x+'>';
    try {
      hold();
    }
    retract {
      rv += 'r';
    }
    finally {
      rv += 'f'+x;
    }
    rv += 'X';
  }

  var spawnNested = bl ->spawnExec('o')(function() {
    spawnExec('i')(bl);
    rv += 'X';
  });

  rv += (function(){
    do {
      spawnNested
               {||
               hold(0);
               rv += 'b';
               return 'v';
               rv += 'X'
               }
      hold(0);
      rv += 'X';
    }
    while (0);
    rv += 'X';
  })();

  return rv;

});

// This _could_ be made to work, but at the moment it generates
// a runtime error. The problem is the point of definition of the blocklambda.
// It seems a pretty useless pattern though, so might not be worth fixing.
test('bl break across _taskXXX - async', 'xfF', function() {
  var rv = '';
  function foo() {
    function call(f) { f(); }
    try {
      //XXX _taskXXX call { || try { hold(0); rv += 'x'; break; } retract { rv += 'r' } finally { rv += 'f' } };
      hold();
    }
    retract {
      rv += 'R';
    }
    finally {
      rv += 'F';
    }
  }
  foo();
  return rv;
}).skip("Needs work");

// We now allow routing via inactive frames:
// (this used to not properly route the 'inactive frame' exception and cause a 
// deadlock)
test('bl return routing deadlock edgecase', '1234', function() {
  var rv = '';

  function spawn_and_return(f) { return spawn(f); }
  function test() {
    var S = spawn_and_return { || hold(10); rv+='1'; return; };

    try { S.value(); rv += 'x'; }
    finally { rv+='2'; S.abort(); rv+= '3'; }
    rv+='y';
  }

  try { 
    test();
    rv += '4';
  }
  catch(e) {
    rv += 'z';
  }
  return rv;
}).skip('obsolete stratum routing');

// this used to not properly route the 'inactive frame' exception and cause a 
// deadlock:
test('bl break routing deadlock edgecase', '1234', function() {
  var rv = '';

  function spawn_and_return(f) { return spawn(f); }
  function test() {
    var S = spawn_and_return { || hold(10); rv+='1'; break; };

    try { S.value(); rv += 'x'; }
    finally { rv+='2'; S.abort(); rv+= '3'; }
    rv+='y';
  }

  try { 
    test();
    rv += 'z';
  }
  catch(e) {
    rv += '4';
  }
  return rv;
}).skip('obsolete stratum routing');

