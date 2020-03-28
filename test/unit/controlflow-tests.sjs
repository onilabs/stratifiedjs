@ = require([
  'sjs:std',
  {id:'sjs:test/suite', include: ['test', 'assert', 'context']}
]);

// establish some baseline behavior cases (e.g. what happens if a catch{} is aborted?)
/*

  We want the following rule:

  When competing controlflows arrive at a stratum juncture (e.g. a waitfor/or), 
  the following precedence applies:

  exceptions > break|return > sequential

  For controlflow of the same class (e.g. two competing returns, or a break and return), 
  it is not the instant that the control 
  flow was initated counts, but the instant when control flow arrives a stratum 
  juncture. The first controlflow seen at the juncture 'wins'.

  For JS parity, exceptions are overriden by 'return' in 'finally' clauses.
*/

/* 
   * finally(e) argument:
      e[0]: return value (value or exception)
      e[1]: is_exception (boolean) 
      e[2]: is_abortion (boolean)
      e[3]: is_pseudo_abort (boolean; "true"="don't exec retract clauses")

   * Various combinations of e[1],e[2],e[3] are possible; they are not mutually exlusive. see 'controlflow_type' function.
   
   * For 'normal' controlflow processing, "finally(e)" must "throw e"

*/
function controlflow_type(e) {
  if (e[2] === false) {
    // not aborted
    // assert that we are not pseudo-aborted:
    @assert.eq(e[3], false);
    
    if (e[1] === false) {
      // not an exception -> sequential controlflow
      return 'sequential';
    }
    else {
      // we have an exception
      @assert.truthy(!!e[0]);
      
      if (e[0].type === 'r') {
        if (e[0].eid)
          return 'blocklambda-return';
        else
          return 'return';
      }
      else if (e[0].type === 'b') {
        return 'break';
      }
      else if (e[0].type === 'blb') {
        return 'blocklambda-break';
      }
      else if (e[0].type === 'c') {
        return 'continue';
      }
      else if (e[0].type === 't') {
        return 'exception';
      }
      else 
        throw new Error("Unknow controlflow type #{e[0].type}");
    }
  } // e[2] === false
  else {
    // e[2] = true
    // abortion
    var rv;
    if (e[3])
      rv = 'pseudo-abort';
    else
      rv = 'abort';
    @assert.truthy(e[1]);
    if (e[0].type === 't') {
      rv += '-exception';
      @assert.truthy(!!e[0]);
    }
    else 
      @assert.eq(e[0].type, 'a');
    return rv;
  }
}



@context('baseline') {||
  @test("abort during finally should abort at next abort point") {||
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
        t1();
        rv += '5';
        hold(0); // <- abort point
        rv += 'x';
      }
      or {
        hold(0);
        rv += '3';
      }
    }
    
    var x = t();
    if (x !== undefined) rv += x;
    @assert.eq(rv, '12345');
  }

  @test("abort should not be masked by retract & blocking finally") {||
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
  }

  @test("catch is abortable") {||
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
  }

  @test("first return to clear all try/catch/finally wins") {||
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
  }

  @test("first return to clear all try/catch/finally wins - async") {||
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
  }

  @test("first exception thrown wins - other exception reported on console") {||
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
  }

  @test("first exception thrown wins (async) - other exception reported on console") {||
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
  }

  @test("blmda-ret - like normal return") {||

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
  }

  @test("blmda-ret async - like normal return") {||

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
  }

  @test("returns in finally masks exceptions (unfortunate JS parity)") {||

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

  }

  @test("return superceedes sequential") {||
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
        }
        retract {
          rv +='R';
        }
      }
      // should not be reached
      rv += 'x';
      return 'b';
    }

    var x = t();
    if (x !== undefined) rv += x;
    @assert.eq(rv, '1234a');
  }

  @test("return superceedes sequential - async") {||
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
      // should not be reached
      rv += 'x';
      return 'b';
    }

    var x = t();
    if (x !== undefined) rv += x;
    @assert.eq(rv, '12345a');
  }

  @test("blmda-ret superceeds sequential") {||

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
  }

  @test("blmda-ret superceeds sequential - async") {||

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
  }

  @test("blmda-brk - later return finishing first superceeds") {||

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
  }

  @test("blmda-brk - later return finishing first superceeds - async") {||

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
  }

  @test("blmda-brk - later return finishing first superceeds - nested") {||

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
  }

  @test("blmda-brk - later return finishing first superceeds - nested, async") {||

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
  }

  @test("blmda-brk - later brk finishing first superceeds") {||

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
  }

}

@context('transparent') {||
  @integers(0,7) .. @each {
    |i|
    var async1 = !!(i & 1);
    var async2 = !!(i & 2);
    var missing_throw = !!(i & 4);
    
    @test("sequential - #{async1}/#{async2}/#{missing_throw}") {||
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
    }

    @test("return - #{async1}/#{async2}/#{missing_throw}") {||
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
    }

    @test("throw - #{async1}/#{async2}/#{missing_throw}") {||
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
    }

    @test("abort - #{async1}/#{async2}/#{missing_throw}") {||
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
        else
          @assert.eq(rv, '123a');
      }
    }

    @test("abort2 - #{async1}/#{async2}/#{missing_throw}") {||
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
          @assert.eq(rv, '12c3b');
        else if (async1 && !async2)
          @assert.eq(rv, 'cr23');
        else
          @assert.eq(rv, 'cr23');
      }
    }


  } // @integers(0,7)
}
 
@context('identify control flow') {||

  @test('sequential') {||
    var rv;
    try {
      'a';
    }
    finally(e) {
      rv = controlflow_type(e);
      throw e;
    }
    @assert.eq(rv, 'sequential');
  }

  @test('return') {||
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
  }

  @test('break') {||
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
  }

  @test('continue') {||
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
  }

  @test('exception') {||
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
  }

  @test('abort') {||
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
    @assert.eq(rv, 'abort');
  }

  @test('abort2') {||
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
    @assert.eq(rv, 'abort');
  }


  @test('exception during abort') {||
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
    @assert.eq(rv, 'abort-exception-caught');
  }

  @test('blocklambda-break') {||
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
  }

  @test('blocklambda-return') {||
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
  }

  @test('pseudo-abort') {||
    var rv;
    function f(block) {
      try {
        spawn block();
        hold();
      }
      finally(e) {
        rv = controlflow_type(e);
        throw e;
      }
    }
    function test() {
      f {|| hold(0); break; }
    }
    test();
    @assert.eq(rv, 'pseudo-abort');
  }

  @test('pseudo-abort / w return') {||
    var rv;
    function f(block) {
      try {
        spawn block();
        hold();
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

    @assert.eq(rv, 'pseudo-abort-R');
  }

}

@context('amend') {||
  
  @test('override blocklambda break handling') {||
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
    
  }
  
}

