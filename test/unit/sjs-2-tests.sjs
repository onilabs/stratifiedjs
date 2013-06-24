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

test('reentrant stratum abort', 'stratum aborted|a|c', function() {

  var rv = '';

  var stratum = spawn (
    function() {
      hold(0); // ensure 'stratum' var is filled in
      try {
        stratum.abort();
        hold(0); // this should be aborted
        rv += 'x';
      }
      retract {
        rv += '|a';
      } 
    })();

   // wait for stratum to finish
   try { stratum.value(); rv += 'y'; } catch(e) { rv += String(e).substr(7,15); }
   hold(0);
   rv += '|c';
  return rv;
});

test('reentrant stratum abort via loop & blocklambda', 'stratum aborted|a|c', function() {

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
          stratum.abort();
          hold(0); // this should be aborted
          rv += 'x';
        }
      }
      retract {
        rv += '|a';
      } 
    })();

   // wait for stratum to finish
   try { stratum.value(); rv += 'y'; } catch(e) { rv += String(e).substr(7,15); }
   hold(100);
   rv += '|c';
  return rv;
});


test('reentrant stratum abort via loop & resume', 'stratum aborted|a|c', function() {

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
          stratum.abort();
          hold(0); // this should be aborted
          rv += 'x';
        }
      }
      retract {
        rv += '|a';
      } 
    })();

  hold(0);
  spawn (hold(100),R());

   // wait for stratum to finish
   try { stratum.value(); rv += 'y'; } catch(e) { rv += String(e).substr(7,15); }
   hold(100);
   rv += '|c';
  return rv;
});

