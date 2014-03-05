/** NOTE: this file is very sensitive to inserted / removed lines,
 *  thus the use of a running "line" variable to provide a base.
 */

var test = require('../lib/testUtil').test, puts = require('sjs:logging').print;
var clean_stack = function(e) { return String(e).replace(/module [^ ]*stack-tests.sjs/g, 'this_file').replace(/module [^ ]*fixtures/g, "fixtures").replace(/^ *at ([^ ]* \()?/mg, '').replace(/(:[\d]+):[\d]+\)$/gm, '$1').replace(/\nthis_file:11$/, ''); }; // This could really do with some work ;)
var remove_message = function(s) { return s.replace(/^Error(: [^\n]*)?\n/m, ''); };
var line;
var stack_from_running = function(f, keep_message) {
  try {
    f();
  } catch(e) {
    //puts('\n---- ERR: -----\n' + String(e)); puts('\n---- STACK: -----\n' + (e.stack)); puts('\n---- CLEANED STACK: -----\n' + (clean_stack(e)));
    var stack = clean_stack(e);
    return keep_message === true ? stack : remove_message(stack);
  }
  throw new Error("fn " + f + " did not fail!");
};

line=20;
test('regular stack traces', 'this_file:' + (line+2) + '\nthis_file:' + (line+3) + '\nthis_file:' + (line+5), function() {
  var bottom_fn = function() { throw new Error("inner error"); };
  var mid_fn = function() { bottom_fn(); };
  // nothing on this line...
  var top_fn = function() { mid_fn(); };
  return stack_from_running(top_fn);
});


line=30;
test('stack from function with args & return', 'this_file:' + (line+2) + '\nthis_file:' + (line+3) + '\nthis_file:' + (line+4), function() {
  var bottom_fn = function(a, b, c) { throw new Error("inner error"); };
  var mid_fn = function(a, b, c) { return bottom_fn(a, b, c); };
  var top_fn = function(a, b, c) { return mid_fn(1, 2, 3); };
  return stack_from_running(top_fn);
});


line=39;
test('stack from function after delay', 'this_file:' + (line+2) + '\nthis_file:' + (line+3), function() {
  var bottom_fn = function() { hold(2); throw new Error("inner error"); };
  var top_fn = function() { return bottom_fn(1, 2, 3); };
  return stack_from_running(top_fn);
});


line=47;
test('stack from waitfor/and', 'this_file:' + (line+6) + '\nthis_file:' + (line+9), function() {
  var bottom_fn = function() {
    waitfor {
      hold(1);
    } and {
      throw new Error("inner error");
    }
  };
  var top_fn = function() { return bottom_fn(); };
  return stack_from_running(top_fn);
});


line=61;
test('stack from waitfor/or', 'this_file:' + (line+6) + '\nthis_file:' + (line+9), function() {
  var bottom_fn = function() {
    waitfor {
      hold(1);
    } and {
      throw new Error("inner error");
    }
  };
  var top_fn = function() { return bottom_fn(); };
  return stack_from_running(top_fn);
});


line=75;
test('stack from loop', 'this_file:' + (line+6) + '\nthis_file:' + (line+10), function() {
  var i = 0;
  var bottom_fn = function() {
    while(true) {
      i += 1;
      if(i == 4) throw new Error("inner error");
      hold(1);
    }
  };
  var top_fn = function() { return bottom_fn(); };
  return stack_from_running(top_fn);
});


line=90;
test('stack from error handling code', 'this_file:' + (line+2) + '\nthis_file:' + (line+7) + '\nthis_file:' + (line+14), function() {
  var bottom_fn = function() { hold(2); throw new Error("inner error"); };
  var middle_fn = function() {
    try {
      throw new Error("invisible error");
    } catch(e) {
      bottom_fn();
    }
  };
  var top_fn = function() {
    try {
      // noop
    } finally {
      return middle_fn();
    }
  };
  return stack_from_running(top_fn);
});


line=111;
test('stack with multiple entries on the same line', 'this_file:' + (line+2) + '\nthis_file:' + (line+3) + '\nthis_file:' + (line+3), function() {
  var bottom_fn = function() { hold(1); throw new Error("inner error"); };
  var middle_fn = function() { return bottom_fn(); }; var top_fn = function() { return middle_fn(); };
  return stack_from_running(top_fn);
});

line=118;
test('stack from tail-call', 'this_file:' + (line+2) + '\nthis_file:' + (line+3), function() {
  var bottom_fn = function() { hold(1); throw new Error("inner error"); };
  var middle_fn = function() { bottom_fn(); };
  return stack_from_running(middle_fn);
});

line=125;
var module = require('./fixtures/stack_js_module.js');
test('stack from imported JS', (module.fail_normally.expected_stack_lines.join("\n")) + '\nthis_file:' + (line+4), function() {
  var caller = function() {
    module.fail_normally();
  };
  var ret = stack_from_running(caller);
  return ret;
}).serverOnly("Not yet implemented for `xbrowser`");

line=135;
test('stack from embedded JS', 'this_file:' + (line+11) + '\nthis_file:' + (line + 4) + '\nthis_file:' + (line + 7), function() {
  __js {
    var f1 = function() {
      f2();
    };
    var f2 = function() {
      throw new Error();
    };
  }
  var caller = function() {
    f1();
  };
  return stack_from_running(caller);
}).skip("Not yet implemented");

// things to note:
// - blocklambdas
// - tail calls?
// - interspersing with plain __js
// - parallel calls (waitfor ... and)
// - retracted calls
// - calls from a catch or finally


/*

A stacktrace consists of a) the (file:line) tuple where the exception
happened and b) the (file:line) tuples of all function callsites
travesed as the exception travels up the stack.

There are 4 main different code paths by which function callsites are
handled in VM1:

       | __oni_rt.C-encoded call  |  __oni_rt.Fcall-encoded call
-------|--------------------------|------------------------------
sync   |          1               |              3
-------|--------------------------|------------------------------
async  |          2               |              4
-------|--------------------------|------------------------------

__oni_rt.C-encoded calls are those where the arguments are known to be
nonblocking, e.g. a call such as foo(a, b, 1, 2, 4+5)

__oni_rt.Fcall-encoded calls are those where the arguments might suspend, e.g.:
foo(a()) <-- here a might suspend

Cases 1 & 3 are the 'easy' ones: __oni_rt.C/Fcall just annotate any exception that
gets thrown.

In cases 2 & 4, C/Fcall drop out of the picture: The function being
called returns an 'execution frame', and C/Fcall drop out of the
picture. Before they do, we record the (file:line) tuple of the
callsite in the execution frame (ef.callstack array)

Here we excercise those 4 paths:

*/

line= 194;
function outer(async) { 
  return inner(async); // line + 2
}

function inner(async) { 
  if (async) hold(0);
  throw new Error("inner error"); // line + 7
}

function id(x) { return x; }

test('codepath 1', "this_file:#{line+7}\nthis_file:#{line+2}\nthis_file:#{line+13}", function() { 
  return stack_from_running(function() { outer(false); }); // line + 13
});

test('codepath 2', "this_file:#{line+7}\nthis_file:#{line+2}\nthis_file:#{line+17}", function() { 
  return stack_from_running(function() { outer(true); }); // line + 17
});

test('codepath 3', "this_file:#{line+7}\nthis_file:#{line+2}\nthis_file:#{line+21}", function() { 
  return stack_from_running(function() { outer(id(false)); }); // line + 21
});

test('codepath 4', "this_file:#{line+7}\nthis_file:#{line+2}\nthis_file:#{line+25}", function() { 
  return stack_from_running(function() { outer(id(true)); }); // line + 25
});

line=222;
test('tail call (ef copying)', "this_file:#{line+6}\nthis_file:#{line+9}", function() {
  function inner() {
    // cause inner's ef to be returned:
    hold(0); 
    // cause the returned ef to be replaced by a new one (tail call):
    throw new Error(hold(0),'inner error');
  }
  function outer() {
    inner();
  }
  return stack_from_running(outer);
});

line=236;
test('tail call (ef concating)', "this_file:#{line+2}\nthis_file:#{line+7}\nthis_file:#{line+10}", function() {
  function inner2() { hold(0); throw new Error('inner error'); }
  function inner() {
    // cause inner's ef to be returned:
    hold(0); 
    // cause the returned ef to be replaced by a new one (tail call):
    inner2();
  }
  function outer() {
    inner();
  }
  return stack_from_running(outer);
});


line=252;
test('long recursive callstack pruning', true, function() {
  // less depth in browser-based sjs, because every hold(0) is a
  // timeout, taking much longer that nextTick on nodejs
  var depth = require('sjs:sys').hostenv == 'nodejs' ? 1000 : 100;

  function recurse() {
    hold(0);
    if (--depth)
      recurse();
    else
      throw new Error('inner error');
  }
  try {
    recurse();
  }
  catch (e) {
    return (e.toString().indexOf('...(frames omitted)') != -1);
  }
  return false;
});

line=274;
test('long recursive callstack pruning 2', true, function() {
  // less depth in browser-based sjs, because every hold(0) is a
  // timeout, taking much longer that nextTick on nodejs
  var depth = require('sjs:sys').hostenv == 'nodejs' ? 1000 : 100;

  function recurse1() {
    hold(0);
    if (--depth)
      recurse2();
    else
      throw new Error('inner error');
  }


  function recurse2() {
    hold(0);
    if (--depth)
      recurse1();
    else
      throw new Error('inner error');
  }
  try {
    recurse1();
  }
  catch (e) {
    return (e.toString().indexOf('...(frames omitted)') != -1);
  }
  return false;
});

line=305;
test('callstack copying edgecase (Sc)', "this_file:#{line+3}\nthis_file:#{line+8}\nthis_file:#{line+11}", function() {
  function should_not_be_on_stack() { hold(0); return 1;}
  function inner2() { hold(0); throw new Error('inner error'); }
  function inner() {
    // create an Sc(..) execution frame with should_not_be_on_stack
    // child_frame which will be replaced by the inner2 child_frame.
    // The stack must not be copied between the two child_frames
    return should_not_be_on_stack() + inner2();
  }
  function outer() {
    inner();
  }
  return stack_from_running(outer);

});

line=322;
test('callstack copying edgecase (Switch 1)', "this_file:#{line+3}\nthis_file:#{line+9}\nthis_file:#{line+14}", function() {
  function should_not_be_on_stack() { hold(0); return 1;}
  function inner2() { hold(0); throw new Error('inner error'); }
  function inner() {
    // create a Switch(..) execution frame with should_not_be_on_stack
    // child_frame which will be replaced by the inner2 child_frame.
    // The stack must not be copied between the two child_frames
    switch (should_not_be_on_stack()) {
      case inner2():
        return 'dummy';
    }
  }
  function outer() {
    inner();
  }
  return stack_from_running(outer);
});

line=341;
test('callstack copying edgecase (Switch 2)', "this_file:#{line+3}\nthis_file:#{line+10}\nthis_file:#{line+15}", function() {
  function should_not_be_on_stack() { hold(0); return 1;}
  function inner2() { hold(0); throw new Error('inner error'); }
  function inner() {
    // create a Switch(..) execution frame with should_not_be_on_stack
    // child_frame which will be replaced by the inner2 child_frame.
    // The stack must not be copied between the two child_frames
    switch (1) {
    case should_not_be_on_stack():
      inner2();
      return 'dummy';
    }
  }
  function outer() {
    inner();
  }
  return stack_from_running(outer);
});

line=361;
test('callstack copying edgecase (Try/Catch)', "this_file:#{line+3}\nthis_file:#{line+12}\nthis_file:#{line+16}", function() {
  function should_not_be_on_stack() { hold(0); throw 'foo';}
  function inner2() { hold(0); throw new Error('inner error'); }
  function inner() {
    // create a Try(..) execution frame with should_not_be_on_stack
    // child_frame which will be replaced by the inner2 child_frame.
    // The stack must not be copied between the two child_frames
    try { 
      should_not_be_on_stack();
    }
    catch(e) {
      inner2();
    }
  }
  function outer() {
    inner();
  }
  return stack_from_running(outer);
});

line=382;
test('callstack copying edgecase (Loop 1)', "this_file:#{line+3}\nthis_file:#{line+9}\nthis_file:#{line+13}", function() {
  function should_not_be_on_stack() { hold(0); return true}
  function inner2() { hold(0); throw new Error('inner error'); }
  function inner() {
    // create a Loop(..) execution frame with should_not_be_on_stack
    // child_frame which will be replaced by the inner2 child_frame.
    // The stack must not be copied between the two child_frames
    while(should_not_be_on_stack()) {
      inner2();
    }
  }
  function outer() {
    inner();
  }
  return stack_from_running(outer);
});

line=400;
test('callstack copying edgecase (Loop 2)', "this_file:#{line+3}\nthis_file:#{line+10}\nthis_file:#{line+14}", function() {
  function should_not_be_on_stack() { hold(0); return true}
  function inner2() { hold(0); throw new Error('inner error'); }
  function inner() {
    // create a Loop(..) execution frame with should_not_be_on_stack
    // child_frame which will be replaced by the inner2 child_frame.
    // The stack must not be copied between the two child_frames
    while(1) {
      should_not_be_on_stack();
      inner2();
    }
  }
  function outer() {
    inner();
  }
  return stack_from_running(outer);
});

line=419;
test('callstack copying edgecase (Loop 3)', "this_file:#{line+3}\nthis_file:#{line+10}\nthis_file:#{line+13}", function() {
  function should_not_be_on_stack() { hold(0); return true}
  function inner2() { hold(0); throw new Error('inner error'); }
  function inner() {
    // create a Loop(..) execution frame with should_not_be_on_stack
    // child_frame which will be replaced by the inner2 child_frame.
    // The stack must not be copied between the two child_frames
    do {
      should_not_be_on_stack();
    } while (inner2())
  }
  function outer() {
    inner();
  }
  return stack_from_running(outer);
});

line=437;
test('callstack copying edgecase (Loop 4)', "this_file:#{line+3}\nthis_file:#{line+8}\nthis_file:#{line+13}", function() {
  function should_not_be_on_stack() { hold(0); return true}
  function inner2() { hold(0); throw new Error('inner error'); }
  function inner() {
    // create a Loop(..) execution frame with should_not_be_on_stack
    // child_frame which will be replaced by the inner2 child_frame.
    // The stack must not be copied between the two child_frames
    for(;;inner2()) {
      should_not_be_on_stack();
    }
  }
  function outer() {
    inner();
  }
  return stack_from_running(outer);
});

line=455;
test('callstack copying edgecase (Par)', "this_file:#{line+3}\nthis_file:#{line+6}\nthis_file:#{line+10}\nthis_file:#{line+17}", function() {
  function should_not_be_on_stack() { hold(0); return true}
  function inner3() { hold(0); throw new Error('inner error'); }
  function inner2() {
    should_not_be_on_stack();
    return inner3();
  }
  function inner() {
    waitfor {
      inner2();
    }
    and {
      hold();
    }
  }
  function outer() {
    inner();
  }
  return stack_from_running(outer);
});

line=477;
test('callstack copying edgecase (Alt)', "this_file:#{line+3}\nthis_file:#{line+6}\nthis_file:#{line+10}\nthis_file:#{line+17}", function() {
  function should_not_be_on_stack() { hold(0); return true}
  function inner3() { hold(0); throw new Error('inner error'); }
  function inner2() {
    should_not_be_on_stack();
    return inner3();
  }
  function inner() {
    waitfor {
      inner2();
    }
    or {
      hold();
    }
  }
  function outer() {
    inner();
  }
  return stack_from_running(outer);
});

line=499;
test('exception messages spanning multiple lines', "Error: line1\nline2\nline3\nthis_file:#{line+3}", function() {
  function inner() {
    throw new Error("line1\nline2\nline3");
  }
  return stack_from_running(inner, true);
});

line=507;
test('empty exception messages', "Error: \nthis_file:#{line+3}", function() {
  function inner() {
    throw new Error();
  }
  return stack_from_running(inner, true);
});

line=515;
test('Builtin error subclass exception messages', "TypeError: err\nthis_file:#{line+3}", function() {
  function inner() {
    throw new TypeError("err");
  }
  return stack_from_running(inner, true);
});

line=523;
test('stack from blocklambda', 'this_file:' + (line+7) + '\nthis_file:' + (line + 3), function() {
  var f1 = function(block) {
    block();
  };
  var caller = function() {
    f1 {||
      throw new Error();
    }
  };
  return stack_from_running(caller);
}).skip("broken");

