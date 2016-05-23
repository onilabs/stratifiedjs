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
}).skip("BROKEN");

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
    stratum = spawn (hold(0),r());
  }
  return 'ok';
});

test('reentrant stratum abort', 'stratum aborted|a|b|c', function() {

  var rv = '';

  function append_to_rv(txt) { rv += txt }

  var stratum = spawn (
    function() {
      hold(0); // ensure 'stratum' var is filled in
      try {
        spawn stratum.abort();
        append_to_rv('|a');
        hold(0); // this should be retracted
        rv += 'X';
      }
      retract {
        rv += '|b';
      } 
    })();

   // wait for stratum to finish
   try { stratum.value(); rv += 'Y'; } catch(e) { rv += String(e).substr(7,15); }
   hold(0);
   rv += '|c';
  return rv;
});

test('synchronous reentrant stratum abort', 'stratum aborted|c', function() {

  var rv = '';

  function append_to_rv(txt) { rv += txt }

  var stratum = spawn (
    function() {
      hold(0); // ensure 'stratum' var is filled in
      try {
        stratum.abort(); // this should be aborted
        append_to_rv('|a');
        hold(0); 
        rv += 'X';
      }
      retract {
        rv += '|b';
      } 
    })();

   // wait for stratum to finish
   try { stratum.value(); rv += 'Y'; } catch(e) { rv += String(e).substr(7,15); }
   hold(0);
   rv += '|c';
  return rv;
});


test('reentrant stratum abort via loop & blocklambda', 'stratum aborted|b|c', function() {

  var rv = '';

  function bl_caller(f) {
    while (1) {
      hold(0);
      f();
      hold(0);
    }
  }

  var stratum = spawn (
    function() {
      hold(0); // ensure 'stratum' var is filled in
      try {
        bl_caller { 
          ||
          stratum.abort(); // this should be aborted
          rv += '|a';
          hold(0); 
          rv += 'X';
        }
      }
      retract {
        rv += '|b';
      } 
    })();

   // wait for stratum to finish
   try { stratum.value(); rv += 'Y'; } catch(e) { rv += String(e).substr(7,15); }
   hold(100);
   rv += '|c';
  return rv;
});

test('synchronous reentrant stratum abort via loop & blocklambda', 'stratum aborted|a|b|c', function() {

  var rv = '';

  function bl_caller(f) {
    while (1) {
      hold(0);
      f();
      hold(0);
    }
  }

  var stratum = spawn (
    function() {
      hold(0); // ensure 'stratum' var is filled in
      try {
        bl_caller { 
          ||
          spawn stratum.abort();
          rv += '|a';
          hold(0); // this should be retracted
          rv += 'X';
        }
      }
      retract {
        rv += '|b';
      } 
    })();

   // wait for stratum to finish
   try { stratum.value(); rv += 'Y'; } catch(e) { rv += String(e).substr(7,15); }
   hold(100);
   rv += '|c';
  return rv;
});


test('reentrant stratum abort via loop & resume', 'stratum aborted|b|c', function() {

  var rv = '';

  var R;

  var stratum = spawn (
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
          stratum.abort(); // this should be aborted
          rv += '|a';
          hold(0); 
          rv += 'X';
        }
      }
      retract {
        rv += '|b';
      } 
    })();

  hold(0);
  spawn (hold(100),R());

   // wait for stratum to finish
   try { stratum.value(); rv += 'Y'; } catch(e) { rv += String(e).substr(7,15); }
   hold(100);
   rv += '|c';
  return rv;
});

test('synchronous reentrant stratum abort via loop & resume', 'stratum aborted|a|b|c', function() {

  var rv = '';

  var R;

  var stratum = spawn (
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
          spawn stratum.abort();
          rv += '|a';
          hold(0); // this should be retracted
          rv += 'X';
        }
      }
      retract {
        rv += '|b';
      } 
    })();

  hold(0);
  spawn (hold(100),R());

   // wait for stratum to finish
   try { stratum.value(); rv += 'Y'; } catch(e) { rv += String(e).substr(7,15); }
   hold(100);
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
  var R;
  waitfor {
    ({|| 
      waitfor() { R = resume } 
      break; 
      hold();
     })();
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
       var rv = '';
       try {
         waitfor {
           hold(100);
           rv += 'a';
         }
         or {
           ({||          
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
       var stratum = spawn S();

       try { 
         // wait a bit, then pick up return value from stratum; it
         // should be an exception.
         hold(10);
         stratum.value();
         return false;
       }
       catch (e) {
         return true;
       }
     });

function makeAbortBreakTest(async_try_catch, late_pickup) {
  return function() {
    var rv = '';
    
    function S() {
      hold(10); // make sure 'stratum' is defined
      while(1) {
        try { 
          if (async_try_catch)
            hold(10); // asynchronize try/catch
          rv += 'a';
          throw new Error('foo');
        }
        catch(e) {
          spawn stratum.abort();
          rv += 'b';
          break;
          rv += 'x';
        }
        rv += 'y';
      }
      rv += 'c';
      hold(); // this is where stratum should abort
      rv += 'z';
    }
    
    var stratum = spawn S();
    
    try {
      if (late_pickup)
        hold(100); // only attempt to pick up value after stratum aborted 
      stratum.value();
    }
    catch(e) {
      // catch 'stratum aborted'
      rv += 'd';
    }
    if (!late_pickup)
      hold(100); // allow stratum to finish cleanup
    return rv;
    
  }
}

test("reentrant abort/break edge case with sync try/catch, early pickup", 
     'adbc', 
     makeAbortBreakTest(false, false));

test("reentrant abort/break edge case with sync try/catch, late pickup", 
     'abcd', 
     // used to yield 'abc'
     makeAbortBreakTest(false, true));

test("reentrant abort/break edge case with async try/catch, early pickup", 
     'adbc', 
     // used to yield 'adb' and 'Uncaught error: Error: Unexpected break statement'
     makeAbortBreakTest(true, false)).skip("test needs revisiting after rewriting VM's abort handling");

test("reentrant abort/break edge case with async try/catch, late pickup", 
     'abcd', 
     // used to yield 'abd'
    
     makeAbortBreakTest(true, true)).skip("test needs revisiting after rewriting VM's abort handling");

test('tailcalled blocklambda break / par edge case', 'b', 
     function() {
       var rv = '';
       waitfor {
         // this `break` should only abort the blocklambda. it
         // erroneously used to abort the waitfor/and
         ({|| hold(0); break; rv += 'a';})();
       }
       and {
         hold(10);
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
       var stratum = spawn (function() { try { hold(); } finally { rv += 'a';  hold(0); rv += 'b'; } })();
       hold(0);
       rv += 'A';
       stratum.abort();
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
             stratum = spawn r();
             stratum.value();
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
    spawn g();
    hold(10);
    rv += 'c';
  }
  f { || rv += 'a'; break; rv += 'b' };
  rv += 'd';
  return rv;
});

test("detached async blocklambda break 1", 'ad', function() {
  var rv = '';
  function f(g) {
    spawn g();
    hold(10);
    rv += 'c';
  }
 
  f { || rv += 'a'; hold(0); break; rv += 'b' };

  rv += 'd';
  return rv;
});

test("detached async blocklambda break with blocking finally", 'ahfd', function() {
  var rv = '';
  function f(g) {
    spawn g();
    try {
      rv += 'h';
      hold(10);
    }
    finally {
      hold(10);
      rv += 'f';
    }
    rv += 'c';
  }
 
  f { || rv += 'a'; hold(0); break; rv += 'b' };

  rv += 'd';
  return rv;
});



test("expired detached async blocklambda break", 'acde', function() {
  var stratum;
  var rv = '';
  function foo() {
    function f(g) {
      stratum = spawn g();
      hold(0);
      rv += 'c';
    }
    
    f { || rv += 'a'; try { break; } finally { hold(10); } rv += 'b' };
    
    rv += 'd';
    hold(2000);
    return rv;
  }

  waitfor { 
    return foo();
  }
  or {
    stratum.value(); // this should throw
  }
  catch (e) {
    if (e.message === 'Blocklambda break from spawned stratum to invalid or inactive scope')
      rv += 'e';
    return rv;
  }
});

test("detached blocklambda break with value pickup", 'vb', function() {
  var stratum;
  var rv = '';
  function f(s) { 
    stratum = spawn s();
    hold(10);
    rv += 'a';
  }
  
  waitfor {
    f {|| hold(0); break; }
    rv += 'b';
  }
  and {
    stratum.value();
    rv += 'v';
  }
  return rv;
});

test("detached blocklambda break with value pickup & finally", 'vfb', function() {
  var stratum;
  var rv = '';
  function f(s) { 
    stratum = spawn s();
    hold(10);
    rv += 'a';
  }
  
  waitfor {
    try {
      f {|| hold(0); break; }
    }
    finally {
      hold(10);
      rv += 'f';
    }
    rv += 'b';
  }
  and {
    stratum.value();
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
             stratum = spawn r();
             stratum.value();
             rv += 'not reached ';
             return 'inner';
           }
           finally {
             rv += 'finally ';
             stratum.abort();
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
           try {
             stratum.abort();
           }
           finally {
             rv += '('+i+')';
           }
         }

         for (var i=0; i<10; ++i) {
           stratum = spawn (stratum ? abort_stratum(i-1), consumer(i));
           if (i == 5) hold(10);
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

test('cyclic abort 1', '1',
     function() {
       var rv = '';
       var stratum = spawn (function() { hold(0); try { stratum.abort(); } finally { rv += '1' } })();
       hold(10);
       return rv;
     });

test('cyclic abort 2', '12',
     function() {
       var rv = '';
       var stratum = spawn (function() { hold(0); try { try { stratum.abort(); } finally { rv += '1' } }finally{ rv+='2'} })();
       hold(10);
       return rv;
     });

test('cyclic abort 3', '12',
     function() {
       var rv = '';
       var stratum = spawn (function() { hold(0); waitfor { stratum.abort(); } and { try { hold(); } finally { rv += '1'} } finally { rv += '2' } })();
       hold(10);
       return rv;
     });

test('cyclic abort 1 async', '1',
     function() {
       var rv = '';
       var stratum = spawn (function() { try { hold(0); stratum.abort(); } finally { rv += '1' } })();
       hold(10);
       return rv;
     });

test('cyclic abort 2 async', '12',
     function() {
       var rv = '';
       var stratum = spawn (function() {  try { try { hold(0); stratum.abort(); } finally { rv += '1' } }finally{ rv+='2'} })();
       hold(10);
       return rv;
     });

test('cyclic abort 3 async', '12',
     function() {
       var rv = '';
       var stratum = spawn (function() { waitfor { hold(0); stratum.abort(); } and { try { hold(); } finally { rv += '1'} } finally { rv += '2' } })();
       hold(10);
       return rv;
     });

test('cyclic abort 4', '12',
     function() {
       var rv = '';
       var stratum = spawn (function() {  waitfor { hold(0); stratum.abort(); } or { try { hold(); } finally { rv += '1'} } finally { rv += '2' } })();
       hold(10);
       return rv;
     });

test('cyclic abort 5', '12',
     function() {
       var rv = '';
       var stratum = spawn (function() { hold(0); waitfor { stratum.abort(); } and { try { hold(); } finally { stratum.abort(); rv += '1'} } finally { rv += '2' } })();
       hold(10);
       return rv;
     });

test('cyclic abort 1 / async finally', '1',
     function() {
       var rv = '';
       var stratum = spawn (function() { hold(0); try { stratum.abort(); } finally { hold(0); rv += '1' } })();
       hold(10);
       return rv;
     });

test('cyclic abort 2 / async finally', '12',
     function() {
       var rv = '';
       var stratum = spawn (function() { hold(0); try { try { stratum.abort(); } finally { hold(0); rv += '1' } }finally{ hold(0); rv+='2'} })();
       hold(10);
       return rv;
     });

test('cyclic abort 3 / async finally', '12',
     function() {
       var rv = '';
       var stratum = spawn (function() { hold(0); waitfor { stratum.abort(); } and { try { hold(); } finally { hold(0); rv += '1'} } finally { hold(0); rv += '2' } })();
       hold(10);
       return rv;
     });

test('cyclic abort 4 / async finally', '12',
     function() {
       var rv = '';
       var stratum = spawn (function() {  waitfor { hold(0); stratum.abort(); } or { try { hold(); } finally { hold(0); rv += '1'} } finally { hold(0); rv += '2' } })();
       hold(10);
       return rv;
     });

test('cyclic abort 5 / async finally', '12',
     function() {
       var rv = '';
       var stratum = spawn (function() { hold(0); waitfor { stratum.abort(); } and { try { hold(); } finally { hold(0); stratum.abort(); rv += '1'} } finally { hold(0); rv += '2' } })();
       hold(10);
       return rv;
     });

test('abort resolved stratum', '1',
     function() {
       var rv = '';
       var stratum = spawn (function() { hold(0); return '1'})();
       rv += stratum.value();
       stratum.abort();
       return rv;
     });

test('waitfor/or abort', '213',
     function() {
       var rv = '';
       var stratum = spawn (function() {  waitfor { try {hold(); }finally { hold(0); rv+='1'} } or { try { hold(); } finally { rv += '2'} } finally { rv += '3' } })();
       hold(0);
       stratum.abort();
       return rv;
     });
