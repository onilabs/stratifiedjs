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
