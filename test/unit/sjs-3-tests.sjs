@ = require('sjs:test/std');

// this used to fail to generate a 'Blocklambda return from spawned stratum to inactive scope' error, because in vm1 a synchronous abort path on EF_Seq didn't mark the frame as 'unreturnable'
@test("return via inactive scope edgecase") {||

  var rv = '';
  var S;
  function scope(f) {
    rv += 'a';
    S = spawn f();
    rv += 'c';
    return S.value();
  }

  function exec() {
    waitfor {
      scope { 
        ||
        rv += 'b';
        hold(100);
        return;
      }
    }
    or {
      // exit scope
      hold(0);
      rv += 'd';
    }

    // this S.value() call ensures that the exception doesn't go uncaught:
    S.value();
  }
  @assert.raises({message:'Blocklambda return from spawned stratum to inactive scope'}, exec);
  @assert.eq(rv, 'abcd');
}

@test("return via different scope with _adopt") {||

  var rv = '';
  var S;
  function scope(f) {
    rv += 'a';
    if (!S)
      S = spawn f();
    else
      __js S._adopt(this.blrref); // it is crucial that this is __js, so that 'this.blrref' refers to the right thing
    rv += 'c';
    return S.value();
  }

  function exec() {
    waitfor {
      scope { 
        ||
        rv += 'b';
        hold(100);
        return 'r';
      }
    }
    or {
      // exit scope
      hold(0);
      rv += 'd';
    }

    scope { || }
  }
  rv += exec();
  @assert.eq(rv, 'abcdacr');
}

@context("rest parameters") { ||
  @test("functions") { ||
    var f1 = function(...args) { return args; }
    @assert.eq(f1(1,2,3), [1,2,3]);
    var f2 = function(a,b,...args) { return [a,b,args]; }
    @assert.eq(f2(1,2,3,4), [1,2,[3,4]])
  }
  @test("blocklambdas") { ||
    ({|...args| @assert.eq(args, [1,2,3]) })(1,2,3);
    ({|a,b,...args| @assert.eq([a,b,args], [1,2,[3,4]]) })(1,2,3,4);
  }
  @test("thin arrows") { ||
    var f1 = (...args) -> args;
    @assert.eq(f1(1,2,3), [1,2,3]);
    var f2 = (a,b,...args) -> [a,b,args];
    @assert.eq(f2(1,2,3,4), [1,2,[3,4]])
  }
  @test("fat arrows") { ||
    var f1 = (...args) => args;
    @assert.eq(f1(1,2,3), [1,2,3]);
    var f2 = (a,b,...args) => [a,b,args];
    @assert.eq(f2(1,2,3,4), [1,2,[3,4]])
  }
}

@context("reentrant quench") {||
  // this used to produce '1234not reached', because EF_Alt didn't emit a 'quench'
  @test("waitfor/or") {||
    var rv = '', restart;
    waitfor {
      rv += '1';
      waitfor() { restart = resume; }
      rv += '3';
    }
    or {
      rv += '2';
      restart();
      hold(0);
      rv += 'not reached';
    }
    rv += '4';
    hold(100);
    @assert.eq(rv, '1234');
  }

  @test("waitfor/and") {||
    var rv = '';
    function inner() {
      var restart;
      waitfor {
        rv += '1';
        waitfor() { restart = resume; }
        rv += '3';
        return;
      }
      and {
        rv += '2';
        restart();
        hold(0);
        rv += 'not reached';
        return;
      }
    }
    inner();
    rv += '4';
    hold(100);
    @assert.eq(rv, '1234');
  }

  // this always worked, but is here just for completeness
  @test("resume") {||
    var rv = '', restart, restart2;
    waitfor {
      rv += '1';
      waitfor() { restart = resume; }
      rv += '3';
    }
    or {
      rv += '2';
      restart();
      waitfor() { restart2 = resume; }
      rv += 'not reached';
    }
    rv += '4';
    restart2();
    hold(100);
    @assert.eq(rv, '1234');
  }
}

@context("waitfor/while") {||
  
  @test('all sync') {||
    var rv = '';
    waitfor { 
      rv += '1';
    }
    while {
      rv += '2';
    }
    @assert.eq(rv, '12');
  }

  @test('all sync / try/finally') {||
    var rv = '';
    waitfor { 
      try {
        rv += '1';
      }
      retract {
        rv += 'x';
      }
      finally {
        rv += '2';
      }
    }
    while {
      rv += '3';
    }
    @assert.eq(rv, '123');
  }

  @test('async1') {||
    var rv = '';
    waitfor { 
      hold(0);
      rv += 'x'; // not reached
    }
    while {
      rv += '1';
    }
    @assert.eq(rv, '1');
  }

  @test('async2') {||
    var rv = '';
    waitfor { 
      hold(0);
      rv += '2';
    }
    while {
      rv += '1';
      hold(0);
      rv += '3';
    }
    @assert.eq(rv, '123');
  }

  @test('async3') {||
    var rv = '';
    waitfor {
      rv += '1';
    }
    while {
      rv += '2';
      hold(0);
      rv += '3';
    }
    @assert.eq(rv, '123');
  }

  @test('async4') {||
    @product([0,1],[0,1],[0,1]) .. @each { 
      |[p1,p2,p3]|
      var rv = '';
      waitfor { 
        try {
          hold();
          rv += 'x'; // not reached
        }
        retract {
          if (p1) hold(0);
          rv += '2';
        }
        finally {
          if (p2) hold(0);
          rv += '3';
        }
      }
      while {
        rv += '1';
        try {
          if (p3) hold(0);
          rv += 'a';
        }
        retract {
          rv += 'x';
        }
        finally {
          rv += 'b';
        }
      }
      @assert.eq(rv, '1ab23');
    }
  }

  @test('return 1') {||
    @product([0,1]) .. @each {
      |[p1]|
      var rv = '';
      function foo() {
        waitfor {
          rv += 'a';
          hold(0);
          return 'd';
        }
        while {
          rv += 'b';
          try {
            hold();
          }
          retract {
            if (p1) hold(0);
            rv += 'c';
          }
        }
      }
      rv += foo();
      @assert.eq(rv, 'abcd');
    }
  }

  @test('return 2') {||
    @product([0,1]) .. @each {
      |[p1]|
      var rv = '';
      function foo() {
        waitfor {
          rv += 'a';
          try {
            hold();
          }
          retract {
            if (p1) hold(0);
            rv += 'c';
          }
        }
        while {
          rv += 'b';
          hold(0);
          return 'd';
        }
      }
      rv += foo();
      @assert.eq(rv, 'abcd');
    }
  }

  @test('throw 1') {||
    @product([0,1]) .. @each {
      |[p1]|
      var rv = '';
      function foo() {
        waitfor {
          rv += 'a';
          hold(0);
          throw 'd';
        }
        while {
          rv += 'b';
          try {
            hold();
          }
          retract {
            if (p1) hold(0);
            rv += 'c';
          }
        }
      }
      try { foo(); } catch(e) { rv += e; }
      @assert.eq(rv, 'abcd');
    }
  }

  @test('throw 2') {||
    @product([0,1]) .. @each {
      |[p1]|
      var rv = '';
      function foo() {
        waitfor {
          rv += 'a';
          try {
            hold();
          }
          retract {
            if (p1) hold(0);
            rv += 'c';
          }
        }
        while {
          rv += 'b';
          hold(0);
          throw 'd';
        }
      }
      try { foo(); } catch(e) { rv += e; }
      @assert.eq(rv, 'abcd');
    }
  }

  @test('tailcalled blocklambda break / wfw edge case') {||
    var rv = '';
    function foo() {
      waitfor {
        // this `break` should only abort the blocklambda, not the waitfor/while
        ({|| hold(0); break; rv += 'x'; })();
        rv += 'b';
      }
      while {
        rv += 'a';
        hold(100);
        rv += 'c';
      }
    }
    foo();
    @assert.eq(rv, 'abc');
  }
  @test('tailcalled blocklambda break / wfw edge case 2') {||
    var rv = '';
    function foo() {
      waitfor {
        try {
          hold();
        }
        finally {
          rv += 'b';
        }
      }
      while {
        // this `break` should only abort the blocklambda, not the waitfor/while
        ({|| hold(0); break; rv += 'x'; })();
        rv += 'a';
      }
    }
    foo();
    @assert.eq(rv, 'ab');
  }

  @test('abort sequencing') {||

    @product([0,1],[0,1],[0,1],[0,1],[0,1]) .. @each {
      |[p1,p2,p3,p4, p5]|
      //console.log("#{p1} - #{p2} - #{p3} - #{p4} - #{p5}");
      var rv = '';
      function foo() {
        waitfor {
          try {
            rv += 'a';
            hold();
            rv += 'x1';
          }
          retract {
            if (p1) hold(0);
            rv += 'e';
          }
          finally {
            if (p2) hold(0);
            rv += 'f';
          }
        }
        while {
          try {
            rv += 'b';
            hold();
            rv += 'x2';
          }
          retract {
            if (p3) hold(0);
            rv += 'c';
          }
          finally {
            if (p4) hold(0);
            rv += 'd';
          }
        }
        rv += 'x3';
      }

      waitfor {
        foo();
      }
      or {
        if (p5) hold(0);
      }
      @assert.eq(rv, 'abcdef');
    }
  }
   
  @test("reentrant quench") {||
    var rv = '';
    function inner() {
      var restart;
      waitfor {
        rv += '1';
        waitfor() { restart = resume; }
        rv += '3';
        return;
      }
      while {
        rv += '2';
        restart();
        hold(0);
        rv += 'not reached';
        return;
      }
    }
    inner();
    rv += '4';
    hold(100);
    @assert.eq(rv, '1234');
  }

  @test("reentrant edge case") { ||
    var rv='';
    function foo() {
      waitfor {
        waitfor() { 
          var r = resume;
        }
        rv += 'a';
        return 'x';
      }
      while {
        r();
        try {
          hold(0);
        }
        finally {
          rv += 'b';
        }
        return 'x';
      }
      finally {
        return 'c';
      }
    }
    rv += foo();
    @assert.eq(rv, 'abc');
  }  
}

@test('catch-abort edgecase') {||
  var R;
  var rv = '';
  waitfor {
    try {
      hold(0);
      throw 'a';
    }
    catch(e) {
      rv += e;
      R();
      rv += 'c';
      hold(0);
      // NOT REACHED (BUT USED TO BE)
      rv += 'x';
    }
    retract {
      rv += 'd';
    }
  }
  or {
    waitfor() { R = resume; }
    rv += 'b';
  }
  hold(0);
  @assert.eq(rv, 'abcd');
}

@test('aborted retract deadlock edgecase') { ||
  /*
    retract clauses are unabortable (after all their try block has already been aborted!).
    This somewhat convoluted test case was able to provoke a deadlock in the VM because
    a retract block was being aborted.
    Additionally, the final return value ('a11') was not being propagated.
  */
  var rv = '';
  function L(x) { rv += x; }

  function t() {
    var R;
    waitfor {
      waitfor {
        hold(0);
        L('a1');
        return 'a11';
      }
      or {
        try {
          try {
            hold();
          }
          finally {
            L('a2');
            R();
            L('a5');
          }
        }
        retract {
          L('a6');
          hold(0);
          // !!!! WE USED TO DEALOCK HERE 
          L('a10');
        }
      }
    }
    or {
      try {
        waitfor {
          try {
            hold();
          }
          retract {
            L('a4');
            hold(0);
            L('a7');
          }
          
        }
        or {
          waitfor(){ R = resume; }
          // retract other branch:
          L('a3');
          throw 'xxx';
        }
      }
      catch(e) {
        L('a8');
      }
      L('a9');
    }
  }
  L(t());
  @assert.eq(rv, 'a1a2a3a4a5a6a7a8a9a10a11');
}
