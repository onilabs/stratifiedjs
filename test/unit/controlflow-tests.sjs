@ = require([
  'sjs:std',
  {id:'sjs:test/suite', include: ['test', 'assert', 'context']}
]);

// establish some baseline behavior cases (e.g. what happens if a catch{} is aborted?)
/*

  We want the following rule:

  When competing controlflows arrive at a stratum juncture (e.g. a waitfor/or), 
  the following precedence applies:

  exceptions > break|return (whether explicit or implicit *) > sequential

  For controlflow of the same class (e.g. two competing returns, or a break and return), 
  it is not the instant that the control 
  flow was initated counts, but the instant when control flow arrives a stratum 
  juncture. For breaks & returns, the first controlflow seen at the juncture 'wins' - the other one is silently discarded.
  For exceptions, later exceptions override earlier ones. The overridden exceptions will be logged to stderr.

  Aborting: Aborted controlflow will be handled according to the above rule (i.e. the aborted 
  controlflow will be considered at the abort point - if e.g. the abort was caused by sequential 
  controlflow in a waitfor/or, and an aborted branch returns a pending 'break' or 'return', 
  the latter will win).

  For JS parity, exceptions are overridden by 'return' in 'finally' clauses.

  (*) An implicit return is a return from a function. In the following code, `foo` will return 
      'undefined' and not 'a'. The return from `foo` which triggers the sub-stratum abortion is
      classified as an 'implicit return', even though there is no explicit 'return' statement in
      `foo`:
         function foo() {
           reifiedStratum.spawn(function() { try { hold() } finally { return 'a'; }});
         }
       
*/

/* 
   * finally(e) argument:
      e[0]: return value (value or exception)
      e[1]: is_exception (boolean) 
      e[2]: is_abortion (boolean)
      e[3]: is_pseudo_abort (boolean; "true"="don't exec retract clauses")
      e[4]: execution frame

   * Various combinations of e[1],e[2],e[3] are possible; they are not mutually exclusive. see 'controlflow_type' function.
   
   * For 'normal' controlflow processing, "finally(e)" must "throw e"

*/
function controlflow_type(e) {
  var rv;
  if (e[1] === false) {
    // not an exception -> sequential controlflow
    rv = 'sequential';
  }
  else {
    // we have an exception
    @assert.truthy(!!e[0]);
    
    if (e[0].type === 'r') {
      if (e[0].eid)
        rv = 'blocklambda-return';
      else
        rv = 'return';
    }
    else if (e[0].type === 'b') {
      rv = 'break';
    }
    else if (e[0].type === 'blb_old') {
      rv = 'blocklambda-break';
    }
    else if (e[0].type === 'c') {
      rv = 'continue';
    }
    else if (e[0].type === 't') {
      rv = 'exception';
    }
    else 
      throw new Error("Unknow controlflow type #{e[0].type}");
  }
  if (e[2]) {
    if (e[3])
      rv += '-pseudoabort';
    else
      rv += '-abort';
  }
  else @assert.truthy(!e[3]); // pseudo flag should only be set for aborts
  return rv;
}



@context('baseline', function() {
  @test("abort during finally should abort at finally", function() {
    var rv = '';
    function t1() {
      try {
        rv += '1';
        return 'a';
      }
      finally {
        rv += '2';
        hold(20);
        rv += '4';
      } // <- abort point
    }
    function t() {
      waitfor {
        t1();
        rv += 'x';
        hold(0); // <- used to be the abort point
        rv += 'y';
      }
      or {
        hold(0);
        rv += '3';
      }
    }
    
    var x = t();
    if (x !== undefined) rv += x;
    @assert.eq(rv, '1234');
  })

  @test("abort should not be masked by retract & blocking finally", function() {
    var rv = '';
    function t1() {
      try {
        hold(20);
        rv += '1';
        //return 'a';
      }
      finally {
        rv += '2';
        hold(20);
        rv += '3';
      }
    }
    function t() {
      waitfor {
        t1();
        rv += 'x';
      }
      or {
        hold(0);
      }
    }
    
    var x = t();
    if (x !== undefined) rv += x;
    @assert.eq(rv, '23');
  })

  @test("catch is abortable", function() {
    var rv = '';
    function t1() {
      try {
        rv += '1';
        throw 'xxx';
      }
      catch(e) {
        rv += '2';
        hold(20);
        rv += '4';
      }
      retract {
        rv += 'r';
      }
      finally {
        rv += 'f';
      }
    }
    function t() {
      waitfor {
        return t1();
      }
      or {
        try {
          hold(0);
          rv += '3';
        }
        retract {
          rv +='R';
        }
      }
    }

    var x = t();
    if (x !== undefined) rv += x;
    @assert.eq(rv, '123rf');
  })

  @test("first return to clear all try/catch/finally wins", function() {
    var rv = '';
    function t1() {
      try {
        rv += '1';
        return 'a';
      }
      finally {
        rv += '2';
        hold(20);
        rv += '4';
      }
    }
    function t() {
      waitfor {
        return t1();
      }
      or {
        try {
          hold(0);
          rv += '3';
          return 'b';
        }
        retract {
          rv +='R';
        }
      }
    }

    var x = t();
    if (x !== undefined) rv += x;
    @assert.eq(rv, '1234b');
  })

  @test("first return to clear all try/catch/finally wins - exception overrides", function() {
    var rv = '';
    function t1() {
      try {
        rv += '1';
        return 'a';
      }
      finally {
        rv += '2';
        hold(20);
        rv += '4';
        throw 'E';
      }
    }
    function t() {
      waitfor {
        return t1();
      }
      or {
        try {
          hold(0);
          rv += '3';
          return 'b';
        }
        retract {
          rv +='R';
        }
      }
    }

    try {
      var x = t();
      if (x !== undefined) rv += x;
    }
    catch(e) { rv += e; }
    @assert.eq(rv, '1234E');
  })


  @test("first return to clear all try/catch/finally wins - async", function() {
    var rv = '';
    function t1() {
      try {
        rv += '1';
        hold(0);
        rv += '2'
        return 'a';
      }
      finally {
        rv += '3';
        hold(20);
        rv += '5';
      }
    }
    function t() {
      waitfor {
        return t1();
      }
      or {
        try {
          hold(0);
          hold(0);
          rv += '4';
          return 'b';
        }
        retract {
          rv +='R';
        }
      }
    }

    var x = t();
    if (x !== undefined) rv += x;
    @assert.eq(rv, '12345b');
  })

  @test("first return to clear all try/catch/finally wins - async - exception overrides", function() {
    var rv = '';
    function t1() {
      try {
        rv += '1';
        hold(0);
        rv += '2'
        return 'a';
      }
      finally {
        rv += '3';
        hold(20);
        rv += '5';
        throw 'E';
      }
    }
    function t() {
      waitfor {
        return t1();
      }
      or {
        try {
          hold(0);
          hold(0);
          rv += '4';
          return 'b';
        }
        retract {
          rv +='R';
        }
      }
    }

    try {
      var x = t();
      if (x !== undefined) rv += x;
    }
    catch(e) { rv += e; }
    @assert.eq(rv, '12345E');
  })


  @test("final exception thrown wins - other exception reported on console", function() {
    var rv = '';
    function t1() {
      try {
        rv += '1';
        throw 'a';
      }
      finally {
        rv += '2';
        hold(20);
        rv += '4';
      }
    }
    function t() {
      waitfor {
        return t1();
      }
      or {
        try {
          hold(0);
          rv += '3';
          throw 'b';
        }
        retract {
          rv +='R';
        }
      }
    }

    try { t(); } catch(e) { rv+= e; }
    @assert.eq(rv, '1234a');
  })

  @test("final exception thrown wins (async) - other exception reported on console", function() {
    var rv = '';
    function t1() {
      try {
        rv += '1';
        hold(0);
        rv += '2';
        throw 'a';
      }
      finally {
        rv += '3';
        hold(20);
        rv += '5';
      }
    }
    function t() {
      waitfor {
        return t1();
      }
      or {
        try {
          hold(0);
          hold(0);
          rv += '4';
          throw 'b';
        }
        retract {
          rv +='R';
        }
      }
    }

    try { t(); } catch(e) { rv+= e; }
    @assert.eq(rv, '12345a');
  })

  @test("blmda-ret - like normal return", function() {

    var rv = '';

    function exec(block) {
      try {
        return block();
      }
      finally {
        rv += '2';
        hold(20);
        rv += '4';
      }
    }

    function t() {
      waitfor {
        exec {||
          rv += '1';
          return 'a';
        }
      }
      or {
        hold(0);
        rv += '3';
        return 'b';
      }
    }
    var x = t();
    if (x !== undefined) rv += x;
    @assert.eq(rv, '1234b');
  })

  @test("blmda-ret async - like normal return", function() {

    var rv = '';

    function exec(block) {
      try {
        return block();
      }
      finally {
        rv += '3';
        hold(20);
        rv += '5';
      }
    }

    function t() {
      waitfor {
        exec {||
          rv += '1';
          hold(0);
          rv += '2';
          return 'a';
        }
      }
      or {
        hold(0);
        hold(0);
        rv += '4';
        return 'b';
      }
    }
    var x = t();
    if (x !== undefined) rv += x;
    @assert.eq(rv, '12345b');
  })

  @test("returns in finally masks exceptions (unfortunate JS parity)", function() {

    function t1() {
      try {
        hold(0);
        throw new Error('foo');
      }
      finally {
        return 'ok';
      }
    }

    var rv = t1();
    @assert.eq(rv, 'ok');

  })

  @test("aborted return", function() {
    var rv = '';
    function t1() {
      try {
        rv += '1';
        return 'a';
      }
      finally {
        rv += '2';
        hold(20);
        rv += '4';
      }
    }
    function t() {
      waitfor {
        // return should be aborted
        return t1();
      }
      or {
        try {
          hold(0);
          rv += '3';
        }
        retract {
          rv +='R';
        }
      }
      return 'b';
    }

    var x = t();
    if (x !== undefined) rv += x;
    @assert.eq(rv, '1234b');
  })

  @test("aborted return - async", function() {
    var rv = '';
    function t1() {
      try {
        rv += '1';
        hold(0);
        rv += '2';
        return 'a';
      }
      finally {
        rv += '3';
        hold(20);
        rv += '5';
      }
    }
    function t() {
      waitfor {
        // this return should be aborted
        return t1();
      }
      or {
        try {
          hold(0);
          hold(0);
          rv += '4';
        }
        retract {
          rv +='R';
        }
      }
      return 'b';
    }

    var x = t();
    if (x !== undefined) rv += x;
    @assert.eq(rv, '12345b');
  })

  @test("blmda-ret superceeds sequential", function() {

    var rv = '';

    function exec(block) {
      try {
        return block();
      }
      finally {
        rv += '2';
        hold(20);
        rv += '4';
      }
    }

    function t() {
      waitfor {
        exec {||
          rv += '1';
          return 'a';
        }
      }
      or {
        hold(0);
        rv += '3';
      }
      // should not be reached
      rv += 'x';
      return 'b';
    }
    var x = t();
    if (x !== undefined) rv += x;
    @assert.eq(rv, '1234a');
  })

  @test("blmda-ret superceeds sequential - async", function() {

    var rv = '';

    function exec(block) {
      try {
        return block();
      }
      finally {
        rv += '3';
        hold(20);
        rv += '5';
      }
    }

    function t() {
      waitfor {
        exec {||
          rv += '1';
          hold(0);
          rv += '2';
          return 'a';
        }
      }
      or {
        hold(0);
        hold(0);
        rv += '4';
      }
      // should not be reached
      rv += 'x';
      return 'b';
    }
    var x = t();
    if (x !== undefined) rv += x;
    @assert.eq(rv, '12345a');
  })

  @test("blmda-brk - later return finishing first superceeds", function() {

    var rv = '';

    function exec(block) {
      try {
        return block();
      }
      finally {
        rv += '2';
        hold(20);
        rv += '4';
      }
    }

    function t() {
      waitfor {
        exec {||
          rv += '1';
          break;
        }
      }
      or {
        hold(0);
        rv += '3';
        return 'b';
      }
      rv += 'x';
      return 'a';
    }
    var x = t();
    if (x !== undefined) rv += x;
    @assert.eq(rv, '1234b');
  })

  @test("blmda-brk - later return finishing first superceeds - exception overrides", function() {

    var rv = '';

    function exec(block) {
      try {
        return block();
      }
      finally {
        rv += '2';
        hold(20);
        rv += '4';
        throw 'E';
      }
    }

    function t() {
      waitfor {
        exec {||
          rv += '1';
          break;
        }
      }
      or {
        hold(0);
        rv += '3';
        return 'b';
      }
      rv += 'x';
      return 'a';
    }
    try {
      var x = t();
      if (x !== undefined) rv += x;
    }
    catch (e) {
      rv += e;
    }
    @assert.eq(rv, '1234E');
  })


  @test("blmda-brk - later return finishing first superceeds - async", function() {

    var rv = '';

    function exec(block) {
      try {
        return block();
      }
      finally {
        rv += '3';
        hold(20);
        rv += '5';
      }
    }

    function t() {
      waitfor {
        exec {||
          rv += '1';
          hold(0);
          rv += '2';
          break;
        }
      }
      or {
        hold(0);
        hold(0);
        rv += '4';
        return 'b';
      }
      rv += 'x';
      return 'a';
    }
    var x = t();
    if (x !== undefined) rv += x;
    @assert.eq(rv, '12345b');
  })

  @test("blmda-brk - later return finishing first superceeds - async - exception overrides", function() {

    var rv = '';

    function exec(block) {
      try {
        return block();
      }
      finally {
        rv += '3';
        hold(20);
        rv += '5';
        throw 'E';
      }
    }

    function t() {
      waitfor {
        exec {||
          rv += '1';
          hold(0);
          rv += '2';
          break;
        }
      }
      or {
        hold(0);
        hold(0);
        rv += '4';
        return 'b';
      }
      rv += 'x';
      return 'a';
    }
    try {
      var x = t();
      if (x !== undefined) rv += x;
    }
    catch(e) { rv += e; }
    @assert.eq(rv, '12345E');
  })


  @test("blmda-brk - later return finishing first superceeds - nested", function() {

    var rv = '';

    function exec(block) {
      try {
        return block();
      }
      finally {
        rv += '3';
        hold(20);
        rv += '5';
      }
    }

    function t(block) {
      waitfor {
        return exec(block);
      }
      or {
        hold(0);
        rv += '4';
        return 'b';
      }
      rv += 'x';
      return 'a';
    }
    var x = t  {||
          rv += '1';
          rv += '2';
          break;
        };
    if (x !== undefined) rv += x;
    @assert.eq(rv, '12345b');
  })

  @test("blmda-brk - later return finishing first superceeds - nested, async", function() {

    var rv = '';

    function exec(block) {
      try {
        return block();
      }
      finally {
        rv += '3';
        hold(20);
        rv += '5';
      }
    }

    function t(block) {
      waitfor {
        return exec(block);
      }
      or {
        hold(0);
        hold(0);
        rv += '4';
        return 'b';
      }
      rv += 'x';
      return 'a';
    }
    var x = t  {||
          rv += '1';
          hold(0);
          rv += '2';
          break;
        };
    if (x !== undefined) rv += x;
    @assert.eq(rv, '12345b');
  })

  @test("blmda-brk - later brk finishing first superceeds", function() {

    var rv = '';

    function exec(block) {
      return block();
    }

    function t() {
      waitfor {
        exec {||
          rv += '1';
          hold(0);
          rv += '4';
          break;
        }
      }
      or {
        try {
          rv += '2';
          return 'b';
        }
        finally {
          rv += '3';
          hold(20);
          rv += '5';
        }
      }
      rv += '6';
      return 'a';
    }
    var x = t();
    if (x !== undefined) rv += x;
    @assert.eq(rv, '123456a');
  })

})

//----------------------------------------------------------------------
// same as above with sessioned strata (i.e. withBackgroundStrata)

@context('baseline-sessioned', function() {

  @test("blr routing", function() {
    var rv = '';
    function t() {
      @withBackgroundStrata {
        |strata|
        strata.run {||
        hold(0);
        rv += '1';
        return 'a';
        };
        strata.wait();
      }
    }
    
    rv += t();

    @assert.eq(rv, '1a');
  })


  @test("blr routing 2", function() {
    var rv = '';
    function t(strata) {
      strata.run {||
        hold(0);
          rv += '1';
          return 'a'; // not routable because t() doesn't contain session
      };
      hold(100);
    }

    try {
      @withBackgroundStrata {
        |strata|
        t(strata);
        strata.wait();
        rv += '2';
      }
    }
    catch(e) { rv += 'R'; }
    @assert.eq(rv, '1R');
  }).skip('_taskXXX FIXME');


  @test("first bl return to clear all try/catch/finally wins", function() {
    var rv = '';
    function t() {
      @withBackgroundStrata {
        |strata|
        strata.run {||
          try {
            rv += '1';
            return 'a';
          }
          finally {
            rv += '2';
            hold(20);
            rv += '4';
          }
        };
        strata.run {||
          try {
            hold(0);
            rv += '3';
            return 'b';
          }
          retract {
            rv += 'R';
          }
        };
        strata.wait();
      }
    }

    var x = t();
    if (x !== undefined) rv += x;
    @assert.eq(rv, '1234b');
  })

  @test("first bl return to clear all try/catch/finally wins - exception overrides", function() {
    var rv = '';
    function t() {
      @withBackgroundStrata {
        |strata|
        strata.run {||
          try {
            rv += '1';
            return 'a';
          }
          finally {
            rv += '2';
            hold(20);
            rv += '4';
            throw 'E';
          }
        };
        strata.run {||
          try {
            hold(0);
            rv += '3';
            return 'b';
          }
          retract {
            rv += 'R';
          }
        }
        strata.wait();
      }
    }

    try {
      var x = t();
      if (x !== undefined) rv += x;
    }
    catch(e) { rv += e; }
    @assert.eq(rv, '1234E');
  })


  @test("first bl return to clear all try/catch/finally wins - async", function() {
    var rv = '';
    function t() {
      @withBackgroundStrata {
        |strata|
        strata.run {||
          try {
            rv += '1';
            hold(0);
            rv += '2';
            return 'a';
          }
          finally {
            rv += '3';
            hold(20);
            rv += '5';
          }
        };
        strata.run {||
          try {
            hold(0);
            hold(0);
            rv += '4';
            return 'b';
          }
          retract {
            rv += 'R';
          }
        }
        strata.wait();
      }
    }

    var x = t();
    if (x !== undefined) rv += x;
    @assert.eq(rv, '12345b');
  })

  @test("first bl return to clear all try/catch/finally wins - async - exception overrides", function() {
    var rv = '';
    function t() {
      @withBackgroundStrata {
        |strata|
        strata.run {||
          try {
            rv += '1';
            hold(0);
            rv += '2';
            return 'a';
          }
          finally {
            rv += '3';
            hold(20);
            rv += '5';
            throw 'E';
          }
        };
        strata.run {||
          try {
            hold(0);
            hold(0);
            rv += '4';
            return 'b';
          }
          retract {
            rv += 'R';
          }
        }
        strata.wait();
      }
    }

    try {
      var x = t();
      if (x !== undefined) rv += x;
    }
    catch(e) { rv += e; }
    @assert.eq(rv, '12345E');
  })

  @test("exception routing - sync", function() {
    var rv = '';
    try {
      @withBackgroundStrata {
        |strata|
        strata.run(function() { rv+='1'; throw 'a'; });
        rv += 'C';
        hold(0);
        rv += 'X';
      }
    }
    catch(e) {
      rv += 'E';
    }
    @assert.eq(rv, '1CE');
  })

  @test("exception routing - async", function() {
    var rv = '';
    try {
      @withBackgroundStrata {
        |strata|
        strata.run(function() { rv+='1'; hold(0); throw 'a'; });
        rv += '2';
        hold(100);
        rv += 'x';
      }
    }
    catch(e) {
      rv += 'E';
    }
    @assert.eq(rv, '12E');
  })


  @test("final exception thrown wins - other exception reported on console", function() {
    var rv = '';
    function t1() {
      try {
        rv += '1';
        throw 'a';
      }
      finally {
        rv += '2';
        hold(20);
        rv += '4';
      }
    }
    function t2() {
      try {
        hold(0);
        rv += '3';
        throw 'b';
      }
      retract {
        rv +='R';
      }
    }

    function t() { 
      @withBackgroundStrata {
        |strata|
        strata.run(t1);
        strata.run(t2);
        strata.wait();
      }
    }

    try { t(); } catch(e) { rv+= e; }
    @assert.eq(rv, '1234a');
  })

  @test("final exception thrown wins (async) - other exception reported on console", function() {
    var rv = '';
    function t1() {
      try {
        rv += '1';
        hold(0);
        rv += '2';
        throw 'a';
      }
      finally {
        rv += '3';
        hold(20);
        rv += '5';
      }
    }
    function t2() {
      try {
        hold(0);
        hold(0);
        rv += '4';
        throw 'b';
      }
      retract {
        rv +='R';
      }
    }

    function t() { 
      @withBackgroundStrata {
        |strata|
        strata.run(t1);
        strata.run(t2);
        strata.wait();
      }
    }

    try { t(); } catch(e) { rv+= e; }
    @assert.eq(rv, '12345a');
  })

  @test("final exception thrown wins - session throwing", function() {
    var rv = '';
    function t1() {
      try {
        rv += '1';
        throw 'a';
      }
      finally {
        rv += '2';
        hold(20);
        rv += '4';
      }
    }
    function t2() {
      try {
        hold(0);
      }
      retract {
        rv += '3';
        throw 'b';
      }
    }

    function t() { 
      @withBackgroundStrata {
        |strata|
        strata.run(t1);
        strata.run(t2);
        throw 'x';
        strata.wait();
      }
    }

    try { t(); } catch(e) { rv+= e; }
    @assert.eq(rv, '1234a');
  })

  @test("final exception thrown wins - session throwing + finally", function() {
    var rv = '';
    function t1() {
      try {
        rv += '1';
        throw 'a';
      }
      finally {
        rv += '2';
        hold(20);
        rv += '4';
      }
    }
    function t2() {
      try {
        hold(0);
        rv += '3';
        throw 'b';
      }
      retract {
        rv += 'R';
      }
    }

    function t() { 
      @withBackgroundStrata {
        |strata|
        strata.run(t1);
        strata.run(t2);
        try {
          throw 'x';
          strata.wait();
        }
        finally {
          hold(100);
        }
      }
    }

    try { t(); } catch(e) { rv+= e; }
    @assert.eq(rv, '1234x');
  })

})

//----------------------------------------------------------------------

@context('transparent', function() {
  @integers(0,7) .. @each {
    |i|
    var async1 = !!(i & 1);
    var async2 = !!(i & 2);
    var missing_throw = !!(i & 4);
    
    @test("sequential - #{async1}/#{async2}/#{missing_throw}", function() {
      var rv = '';
      function t() {
        try {
          if (async1) hold(0);
          rv += '1';
          'a';
        }
        retract {
          rv += 'r';
        }
        finally(e) {
          rv += '2';
          if (async2) hold(0);
          rv += '3';
          if (!missing_throw)
            throw e;
        }
      }
      if (missing_throw) {
        @assert.raises({message: 'augmented finally(){} block needs to throw a value'},t);
      }
      else {
        var x = t();
        if (x !== undefined) rv += x;
      }
      @assert.eq(rv, '123');
    })

    @test("return - #{async1}/#{async2}/#{missing_throw}", function() {
      var rv = '';
      function t() {
        try {
          if (async1) hold(0);
          rv += '1';
          return 'a';
        }
        retract {
          rv += 'r';
        }
        finally(e) {
          rv += '2';
          if (async2) hold(0);
          rv += '3';
          if (!missing_throw)
            throw e;
        }
      }
      if (missing_throw) {
        @assert.raises({message: 'augmented finally(){} block needs to throw a value'},t);
        @assert.eq(rv, '123');
      }
      else {
        var x = t();
        if (x !== undefined) rv += x;
        @assert.eq(rv, '123a');
      }
    })

    @test("throw - #{async1}/#{async2}/#{missing_throw}", function() {
      var rv = '';
      function t() {
        try {
          if (async1) hold(0);
          rv += '1';
          throw new Error('a');
        }
        retract {
          rv += 'r';
        }
        finally(e) {
          rv += '2';
          if (async2) hold(0);
          rv += '3';
          if (!missing_throw)
            throw e;
        }
      }
      if (missing_throw) {
        @assert.raises({message: 'augmented finally(){} block needs to throw a value'},t);
        @assert.eq(rv, '123');
      }
      else {
        @assert.raises({message: 'a'},t);
        @assert.eq(rv, '123');
      }
    })

    @test("abort - #{async1}/#{async2}/#{missing_throw}", function() {
      var rv = '';
      function t1() {
        try {
          if (async1) hold(50);
          rv += '1';
          return 'a';
        }
        retract {
          rv += 'r';
        }
        finally(e) {
          rv += '2';
          if (async2) hold(50);
          rv += '3';
          if (!missing_throw)
            throw e;
        }
      }
      function t() {
        waitfor {
          return t1();
        }
        or {
          hold(1);
        }
      }
      
      if (missing_throw) {
        @assert.raises({message: 'augmented finally(){} block needs to throw a value'},t);
        if (async1) {
          @assert.eq(rv, 'r23');
        }
        else {
          @assert.eq(rv, '123');
        }
      }
      else {
        var x = t();
        if (x !== undefined) rv += x;
        if (async1)
          @assert.eq(rv, 'r23');
        else if (async2)
          @assert.eq(rv, '123');
        else 
          @assert.eq(rv, '123a');
      }
    })

    @test("abort2 - #{async1}/#{async2}/#{missing_throw}", function() {
      var rv = '';
      function t1() {
        try {
          if (async1) hold(50);
          rv += '1';
          return 'a';
        }
        retract {
          rv += 'r';
        }
        finally(e) {
          rv += '2';
          if (async2) hold(50);
          rv += '3';
          if (!missing_throw)
            throw e;
        }
      }
      function t() {
        waitfor {
          t1();
          rv += 'b';
        }
        or {
          hold(0);
          rv += 'c';
        }
      }
      
      if (missing_throw) {
        @assert.raises({message: 'augmented finally(){} block needs to throw a value'},t);
        if (!async1 && !async2)
          @assert.eq(rv, '123');
        else if (!async1 && async2)
          @assert.eq(rv, '12c3');
        else if (async1 && !async2)
          @assert.eq(rv, 'cr23');
        else
          @assert.eq(rv, 'cr23');
      }
      else {
        var x = t();
        if (x !== undefined) rv += x;
        if (!async1 && !async2)
          @assert.eq(rv, '123b');
        else if (!async1 && async2)
          @assert.eq(rv, '12c3');
        else if (async1 && !async2)
          @assert.eq(rv, 'cr23');
        else
          @assert.eq(rv, 'cr23');
      }
    })


  } // @integers(0,7)
})
 
@context('identify control flow', function() {

  @test('sequential', function() {
    var rv;
    try {
      'a';
    }
    finally(e) {
      rv = controlflow_type(e);
      throw e;
    }
    @assert.eq(rv, 'sequential');
  })

  @test('return', function() {
    var rv;
    function f() {
      try {
        return 'a';
      }
      finally(e) {
        rv = controlflow_type(e);
        throw e;
      }
    }
    f();
    @assert.eq(rv, 'return');
  })

  @test('break', function() {
    var rv;
    function f() {
      while (1) {
        try {
          break;
        }
        finally(e) {
          rv = controlflow_type(e);
          throw e;
        }
      }
    }
    f();
    @assert.eq(rv, 'break');
  })

  @test('continue', function() {
    var rv;
    function f() {
      do {
        try {
          continue;
        }
        finally(e) {
          rv = controlflow_type(e);
          throw e;
        }
      } while (0);
    }
    f();
    @assert.eq(rv, 'continue');
  })

  @test('exception', function() {
    var rv;
    function f() {
      try {
        throw new Error('a');
      }
      finally(e) {
        rv = controlflow_type(e);
        throw e;
      }
    }
    try { f(); } catch(e) { }
    @assert.eq(rv, 'exception');
  })

  @test('abort', function() {
    var rv;
    function f() {
      try {
        hold();
      }
      finally(e) {
        rv = controlflow_type(e);
        throw e;
      }
    }
    waitfor { f() } 
    or { hold(0); }
    catch(e) {
      rv += '-caught';
    }
    @assert.eq(rv, 'sequential-abort');
  })

  @test('abort2', function() {
    var rv;
    function f() {
      try {
        try {
          hold();
        }
        finally {
          hold(0);
        }
      }
      finally(e) {
        rv = controlflow_type(e);
        throw e;
      }
    }
    waitfor { f() } 
    or { hold(0); }
    catch(e) {
      console.log(e);
      rv += '-caught';
    }
    @assert.eq(rv, 'sequential-abort');
  })


  @test('exception during abort', function() {
    var rv;
    function f() {
      try {
        hold();
      }
      retract {
        throw new Error('foo');
      }
      finally(e) {
        rv = controlflow_type(e);
        throw e;
      }
    }
    waitfor { f() } 
    or { hold(0); }
    catch(e) {
      rv += '-caught';
    }
    @assert.eq(rv, 'exception-abort-caught');
  })

  @test('blocklambda-break', function() {
    var rv;
    function f(block) {
      try {
        block();
      }
      finally(e) {
        rv = controlflow_type(e);
        throw e;
      }
      rv += 'not called';
    }
    f {|| hold(0); break; }
    @assert.eq(rv, 'blocklambda-break');
  })

  @test('blocklambda-return', function() {
    var rv;
    function f(block) {
      try {
        block();
      }
      finally(e) {
        rv = controlflow_type(e);
        throw e;
      }
    }
    function test() {
      f {|| hold(0); return '-R'; }
    }
    rv += test();

    @assert.eq(rv, 'blocklambda-return-R');
  })

  @test("blocklambda abort doesn't retract inner", function() {
    var rv;
    function f(block) {
      try {
        reifiedStratum.spawn(block);
        hold();
      }
      finally(e) {
        rv = controlflow_type(e);
        throw e;
      }
    }
    function test() {
      f {|| hold(0); try { break; } retract { @assert.fail('not reached'); } }
    }
    test();
    @assert.eq(rv, 'sequential-abort'); 
 })

  @test('abort / w return', function() {
    var rv;
    function f(block) {
      try {
        reifiedStratum.spawn(block);
        hold();
      }
      finally(e) {
        rv = controlflow_type(e);
        throw e;
      }
    }
    function test() {
      f {|| hold(0); try { return '-R'; } retract { @assert.fail('not reached'); } }
    }
    rv += test();

    @assert.eq(rv, 'sequential-abort-R');
  })

})

@context('amend', function() {
  
  @test('override blocklambda break handling', function() {
    var rv = '';
    function f(block) {
      try {
        rv += '1';
        block();
        rv += 'x';
      }
      finally(e) {
        rv += '2';
        throw [undefined];
      }
      rv += '3';
    }
    f {|| hold(0); break; rv+='y';}
    rv += '4'
    @assert.eq(rv, '1234');
    
  })
  
  @test('throw exception', function() {
    function foo() {
      try {
        /* */
      }
      finally(e) {
        throw new Error('foo error');
      }
    }
    var rv;
    try { foo(); } catch(e) { rv = e }
    @assert.eq(rv.message, 'foo error');
  })

  // this edgecase used to fail due to a vm bug:
  @test('throw plaintext', function() {
    function foo() {
      try {
        /* */
      }
      finally(e) {
        throw 'plain_string_exception';
      }
    }
    var rv;
    try { foo(); } catch(e) { rv = e }
    @assert.eq(rv, 'plain_string_exception');
  })
  
})

