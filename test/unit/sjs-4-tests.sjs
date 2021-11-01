@ = require('sjs:test/std');

/*
  @test("", function() {
    var rv = '';
    function foo() {
      var s1 = reifiedStratum;
    };
    
    foo();
    @assert.eq(rv, '');
    
  });
*/

var TF = [true,false];

@context("reifiedStratum", function() {

  @test("basic structure", function() {
    var s1,s2;
    (function() { 
      s1 = reifiedStratum;
      @assert.eq(s1,reifiedStratum);
      @assert.truthy(typeof s1.running == 'boolean');
      @assert.truthy(typeof s1.wait == 'function');
      @assert.truthy(typeof s1.spawn == 'function');
      @assert.truthy(typeof s1.join == 'function');
      @assert.truthy(typeof s1.abort == 'function');
      @assert.truthy(typeof s1.adopt == 'function');
      @assert.truthy(s1.running); 
    })();
    (function() { s2 = reifiedStratum; hold(0); })();

    @assert.notEq(s1,s2);
    @assert.falsy(s1.running);
    @assert.falsy(s2.running);
  });

  @product(TF,TF,TF) .. @each { |[async1,async2, double_abort]|
    @test("abort - #{async1},#{async2},#{double_abort}", function() {
      var s1,rv = '';
      function foo() {
        s1 = reifiedStratum;
        if (async1) hold(0);
        waitfor {
          try { hold(); }
          retract { rv += 'r'; }
          finally { if(async2) hold(0); rv += 'f'; }
        }
        and {
          rv += 'a';
          reifiedStratum.abort();
          @assert.truthy(reifiedStratum.running);
          if (double_abort) {
            reifiedStratum.abort();
            @assert.truthy(reifiedStratum.running);
          }
          rv += 'b';
          hold(); // <- this should be aborted
          rv += 'x';
        }
        rv += 'y';
      };
      
      foo();
      @assert.falsy(s1.running);
      s1.abort(); // just to check that this doesn't except
      @assert.eq(rv, 'abrf');
      
    });
  }

  @product(TF) .. @each { |[async1]|
    @test("spawn substrata - #{async1}", function() {
      var rv = '', S;
      function foo() {
        if (async1) hold(0);
        S = reifiedStratum;
        rv += 'a';
        reifiedStratum.spawn(function() { rv += 'b'; });
        reifiedStratum.spawn(function() { try { hold(0); rv += 'x'; } retract { rv += 'r';} finally { rv += 'f'} });
        reifiedStratum.spawn(function() { rv += 'c'; });
        rv += 'd';
        return 'R';
      }
      rv += foo();
      try {
        S.spawn(function() { rv += 'x'; });
      }
      catch(e) {
        rv += 'C';
      }
      @assert.eq(rv, 'abcdrfRC');
    });
  }

  @product(TF,TF) .. @each { |[async1,async2]|
    @test("reentrant abort 1 - #{async1}, #{async2}", function() {
      var rv = '', S;
      function foo() {
        S = reifiedStratum;
        try {
          hold();
        }
        finally {
          rv += 'b';
        }
      }
      
      waitfor {
        foo();
      }
      and { 
        S.spawn(function() { rv += 'a'; if (async1) hold(0); S.abort(); try { hold(); } retract { rv+= 'c'; } finally { if (async2) hold(0); rv += 'd';} });
      }
      @assert.eq(rv, 'abcd');
    });

    @test("reentrant abort 2 - #{async1}, #{async2}", function() {
      var rv = '', R, S;
      function foo() {
        S = reifiedStratum;
        try { hold(); } finally { rv += 'b'; }
      }
      waitfor {
        waitfor() { R = resume }
      }
      or {
        waitfor {
          foo();
        }
        and {
          hold(0);
          S.spawn(function() { rv += 'a'; if (async1) hold(0); R(); try { hold(); } retract { rv += 'c'; } finally { if (async2) hold(0); rv+='d';}});
        }
      }
      @assert.eq(rv, 'abcd');
    });
  }

  @product(TF) .. @each { |[async1]|
    @test("reentrant abort 3", function() {
      var rv = '';
      function foo() {
        if (async1) hold(0);
        reifiedStratum.spawn(function() { try { rv += 'a'; hold(); } finally { hold(100); rv += 'c'; } });
      }
      waitfor {
        foo();
      }
      or {
        hold(0);
        hold(0);
        rv += 'b';
      }
      rv += 'd';
      @assert.eq(rv, 'abcd');
    });
  }

  @product(TF, TF) .. @each { |[async1, async2]|
    @test("exceptions 1 - #{async1}, #{async2}", function() {
      var rv = '';
      function foo() {
        if (async1) hold(0);
        reifiedStratum.spawn(function() { try { hold(); rv += 'x'; } retract { rv += 'r';} finally { if (async2) hold(0); rv += 'f'} });
        throw new Error('err');
      }
      try {
        foo();
      }
      catch(e) {
        rv += 'c';
      }
      @assert.eq(rv, 'rfc');
    });

    @test("exceptions 2 - #{async1}, #{async2}", function() {
      var rv = '';

      function thrower() { try { if (async2) hold(0); throw new Error('err'); } retract { rv += 'x';} finally { rv += 'f'} }

      function foo() {
        if (async1) hold(0);
        reifiedStratum.spawn(thrower);
        try {
          hold();
        }
        retract {
          rv += 'r';
        }
        finally {
          rv += 'F';
          return 'x'; // should not be executed
        }
      }
      try {
        foo();
      }
      catch(e) {
        @assert.eq(e.message, 'err');
        rv += 'c';
      }
      @assert.eq(rv, 'frFc');
    });

    @test("exceptions 3 - #{async1}, #{async2}", function() {
      var rv = '';

      function thrower() { try { if (async2) hold(0); throw new Error('swallowed'); } retract { rv += 'x';} finally { rv += 'f'} }

      function foo() {
        if (async1) hold(0);
        reifiedStratum.spawn(thrower);
        try {
          hold();
        }
        retract {
          rv += 'r';
        }
        finally {
          rv += 'F';
          throw new Error('err');
        }
      }
      try {
        foo();
      }
      catch(e) {
//        console.log(e);
        @assert.eq(e.message, 'err');
        rv += 'c';
      }
      @assert.eq(rv, 'frFc');
    });

    @test("exceptions 4 - #{async1}, #{async2}", function() {
      var rv = '';

      function thrower() { try { hold(); } retract { rv += 'r';} finally { if (async2) hold(0); rv += 'f'; throw new Error('err');} }

      function foo() {
        reifiedStratum.spawn(thrower);
        try {
          if (async1) hold(0);
          return 'x'; // should be overriden by exception from stratum
        }
        retract {
          rv += 'x';
        }
        finally {
          rv += 'F';
        }
      }
      try {
        rv += foo();
      }
      catch(e) {
//        console.log(e);
        @assert.eq(e.message, 'err');
        rv += 'c';
      }
      @assert.eq(rv, 'Frfc');
    });

  }

  @test("wait", function() {
    var rv = '';
    function s() { rv += 'a'; hold(0); rv+='b'; }
    function foo() {
      var ss = reifiedStratum.spawn(s);
      ss.wait();
      rv += 'c';
      return 'd';
    }
    rv += foo();
    @assert.eq(rv, 'abcd');
  });

  @test("adopt", function() {
    var barS, rv='';
    function bar() { barS=reifiedStratum; try { hold(); } finally { rv+='d'} }
    function foo() {
      var ss = reifiedStratum.spawn(function() { try { rv+='a'; hold(); }finally { hold(0); rv+='f'}});
      barS.adopt(ss);
      try { 
        hold();
      }
      finally {
        rv += 'b';
      }
    }

    function drive() {
      var s1 = reifiedStratum.spawn(bar);
      var s2 = reifiedStratum.spawn(foo);
      s2.abort();
      rv += 'c';
      s1.abort();
      s1.wait();
      rv += 'e';
    }
    drive();
    @assert.eq(rv, 'abcdfe');
  });

  @product(TF) .. @each { |[async1]|
    @test("adopt during abort - #{async1}", function() {
      var rv = '', M;
      function slave() {
        var S = reifiedStratum.spawn(function() {hold(0); if (async1) hold(0); rv +='c';});
        try {
          hold();
        }
        retract {
          M.adopt(S);
          rv += 'b';
        }
      }
      
      M = reifiedStratum;
      waitfor {
        slave();
      }
      or {
        if (async1) hold(0);
        rv += 'a';
      }
      hold(0); // give S a chance to finish
      @assert.eq(rv, 'abc');
    });
  }

  @test("adopt from child stratum during abort", function() {
    var rv = '', M;
    function slave() {
      reifiedStratum.spawn(function() { try { hold(); } retract { @assert.truthy(S.running); M.adopt(S); rv += 'b'; }});
      var S = reifiedStratum.spawn(function() { try { hold(0); rv += 'c'; } retract { rv += 'X' }});
      hold();
    }

    M = reifiedStratum;
    waitfor {
      slave();
    }
    or {
      rv += 'a';
    }
    hold(0); hold(0); // give S a chance to finish
    @assert.eq(rv, 'abc');
  });

  @product(TF) .. @each { |[async1]|
    @test("child stratum finishing during abort - #{async1}", function() {
      var rv = '';
      function slave() {
        var S;
        reifiedStratum.spawn(function() { try { hold(); } retract { rv+='b'; @assert.truthy(S.running); hold(0); @assert.falsy(S.running); rv += 'd'; } });
        S = reifiedStratum.spawn(function() { try { } finally {hold(0); if (async1) hold(0); rv += 'c';} });
        hold();
      }
      waitfor {
        slave();
      }
      or {
        if (async1) hold(0);
        rv += 'a';
      }
      @assert.eq(rv, 'abcd');
    });
  }

  @product(TF) .. @each { |[async1]|
    @test("reentrant adopt - #{async1}", function() {
      var rv = '';
      function outer() {
        var S = reifiedStratum, SS;
        function foo() {
          try {
            SS = reifiedStratum.spawn(function(SS) { try { S.adopt(SS); } finally { if (async1) hold(0); rv+='f'; } });
          }
          finally {
            rv += 'a';
          }
        }
        try {
          foo();
        }
        finally {
          rv += 'b';
        }
      }
      outer();
      if (async1)
        @assert.eq(rv, 'abf');
      else
        @assert.eq(rv, 'fab');
    });
  }

  @test('adopt function', function() {
    var rv = '';

    function outer() {
      var S = reifiedStratum;

      function inner() {
        rv += 'a';
        S.adopt(reifiedStratum);
        try {
          hold(0);
        }
        retract {
          rv += 'c';
        }
        return 'x';
      }
      @assert.eq(inner(), undefined);
      rv += 'b';
      
    }
    outer();
    @assert.eq(rv, 'abc');
  });

  @test('exception during join', function() {
    var rv = '';
    function foo() {
      reifiedStratum.spawn(function() {
        hold(0);
        rv += 'b';
        throw new Error('foo');
      });
      rv += 'a';
      reifiedStratum.join();
      rv += 'x'; // should not be reached
      return 'y';
    }

    try {
      rv += foo();
    }
    catch(e) {
      @assert.eq(e.message, 'foo');
      rv += 'e';
    }
    @assert.eq(rv, 'abe');
  });

  @test('abort point for reentrant blocklambda break', function() {
    var rv = '';
    function foo(bl) {
      rv += 'a';
      var S = reifiedStratum.spawn(bl);
      @assert.falsy(S.running);
      @assert.truthy(reifiedStratum.running);
      rv += 'c';
      hold(0); // <- should be aborted
      rv += 'x';
    }

    foo { || rv += 'b'; break; rv += 'y'; }
    @assert.eq(rv, 'abc');
  });

  @test('abort point for reentrant blocklambda return', function() {
    var rv = '';
    function foo(bl) {
      rv += 'a';
      var S = reifiedStratum.spawn(bl);
      @assert.falsy(S.running);
      @assert.truthy(reifiedStratum.running);
      rv += 'c';
      hold(0); // <- should be aborted
      rv += 'x';
    }

    function bar() {
      foo { || rv += 'b'; return 'd'; rv += 'y'; }
    }
    rv += bar();
    @assert.eq(rv, 'abcd');
  });


}); // context 'reifiedStratum'

@context("blocklambda - new syntax restrictions", function() {
  @test("blocklambdas as object properties", function() {
    var rv = '';
    function bar({a,b}) { a(); b(); rv += 'x'; }
    function foo() {
      bar({
        a: {|| rv += 'a'; },
        b: {|| rv += 'b'; break; }
      })
      rv += 'c';
    }
    foo();
    @assert.eq(rv, 'abc');
  });
  
  @test("blocklambdas as array elements", function() {
    var rv = '';
    function bar([a,b]) { a(); b(); rv += 'x'; }
    function foo() {
      bar([{|| rv += 'a'; },{|| rv += 'b'; break; }]);
      rv += 'c';
    }
    foo();
    @assert.eq(rv, 'abc');
  });
  
  @test("blocklambdas in nested obj/arr", function() {
    var rv = '';
    function bar({x:[{a},b]}) { a(); b(); rv += 'x'; }
    function foo() {
      bar({x:[{a:{|| rv += 'a'; }},{|| rv += 'b'; break; }]});
      rv += 'c';
    }
    foo();
    @assert.eq(rv, 'abc');
  });

  @product(TF) .. @each { |[async1]|

    @test("blocklambda break via arrow function - #{async1}", function() {
      var rv = '';
      function foo() {
        rv += 'a';
        (x->x())({|| rv += 'b'; if (async1) hold(0); break; rv += 'x'; });
        rv += 'c';
      }
      foo();
      @assert.eq(rv, 'abc');
    });
    
    @test("blocklambda return via arrow function - #{async1}", function() {
      var rv = '';
      function foo() {
        rv += 'a';
        (x->x())({|| rv += 'b'; if (async1) hold(0); return 'c'; rv += 'x'; });
        rv += 'X';
      }
      rv += foo();
      @assert.eq(rv, 'abc');
    });
  }

  @test("blocklambda break inside arrow function", function() {
    var rv = '';
    function call(x) { x(); }
    function foo() {
      rv += 'a';
      (-> call({|| rv += 'b'; break; rv+= 'x';}))();
      rv += 'c';
    }
    foo();
    @assert.eq(rv, 'abc');
  }).skip('_taskXXX');

  @test("blocklambda return inside arrow function", function() {
    var rv = '';
    function call(x) { x(); }
    function foo() {
      rv += 'a';
      (-> call({|| rv += 'b'; return 'c'; rv+= 'x';}))();
      rv += 'X';
    }
    rv += foo();
    @assert.eq(rv, 'abc');
  }).skip('_taskXXX');


}); // context

@context("blocklambda function anchors", function() {

  @test("inactive", function() {
    var bl;
    function store(_bl) { bl = _bl }
    function foo() {
      waitfor {
        store { || @assert.fail('not reached'); }
      }
      and {
        bl();
      }
    }
    @assert.raises({message:/Blocklambda anchor.*inactive/}, foo);
  });

}); // context

@context("blocklambda controlflow - retracting", function() {
  @product([true, false]) .. @each {
    |[sync]|
    @test('bl return - '+(sync?'sync':'async'), function() {
      var rv = '';
      function caller_inner(bl) {
        try {
          bl();
        }
        retract {
          rv += 'b';
        }
      }
      function caller_outer(bl) {
        try {
          caller_inner(bl);
        }
        retract {
          rv += 'c';
        }
      }
      function top() {
        try {
          caller_outer {
            ||
            try {
              if (!sync) hold(0);
              rv += 'a';
              return 'r';
            }
            retract {
              rv += 'x1';
            }
          };
        }
        retract {
          rv += 'x2';
        }
        rv += 'x3';
      }
      rv += top();
      @assert.eq(rv, 'abcr');
    })
  }
}).skip("MAKE THIS STUFF WORK");
