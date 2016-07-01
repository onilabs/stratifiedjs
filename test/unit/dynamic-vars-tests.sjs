@ = require('sjs:test/std');

@context("no dynvar context") {||
  @test("setDynVar") {||
    @assert.raises(-> @sys.setDynVar('foo', 'bar'));
  }
  @test("clearDynVar") {||
    @assert.raises(-> @sys.clearDynVar('foo'));
  }
  @test("getDynVar") {||
    @assert.raises(-> @sys.getDynVar('foo'));
  }
  @test("getDynVar with def_val") {||
    var sentinel = {descr: 'sentinel'};
    @assert.is(@sys.getDynVar('foo', sentinel), sentinel);
  }
}


function base_test(interstitial) {

  @sys.withDynVarContext {
    ||

    // 'foo' should not be set yet
    
    @assert.raises(-> @sys.getDynVar('foo'));
    var sentinel = {descr: 'sentinel'};
    @assert.is(@sys.getDynVar('foo', sentinel), sentinel);

    interstitial();

    // set 'foo' and check that it is gettable
    var val1 = {descr:'val1'};    
    @sys.setDynVar('foo', val1);

    interstitial();
    
    @assert.is(@sys.getDynVar('foo'), val1);

    interstitial();
    
    // nested context
    @sys.withDynVarContext {
      ||

      interstitial();      
      // check that 'foo' is inherited
      @assert.is(@sys.getDynVar('foo'), val1);

      // set 'foo' in nested context to val2 and check that it is gettable
      var val2 = {descr:'val2'};    
      @sys.setDynVar('foo', val2);

      
      interstitial();
      @assert.is(@sys.getDynVar('foo'), val2);

      // set 'bar' in nested context to val3 and check that it is gettable
      var val3 = {descr:'val3'};    
      @sys.setDynVar('bar', val3);
      @assert.is(@sys.getDynVar('bar'), val3);

      // set 'baz' in nested context to val4 and check that it is gettable
      var val4 = {descr:'val4'};    
      @sys.setDynVar('baz', val4);
      @assert.is(@sys.getDynVar('baz'), val4);

      // clear 'baz' and check that it has been cleared
      @sys.clearDynVar('baz');
      interstitial();
      @assert.raises(-> @sys.getDynVar('baz'));

      interstitial();
    }
    
    // check that non of the inherited values have stuck around:

    interstitial();
    
    @assert.is(@sys.getDynVar('foo'), val1);
    @assert.raises(-> @sys.getDynVar('bar'));
    @assert.raises(-> @sys.getDynVar('baz'));

    
    // clear 'foo', check that it is gone
    @sys.clearDynVar('foo');

    interstitial();
    
    @assert.raises(-> @sys.getDynVar('foo'));
    var sentinel = {descr: 'sentinel'};
    @assert.is(@sys.getDynVar('foo', sentinel), sentinel);      
  }
}  


@test("withDynVarContext") {||
  base_test(->null);
}

@test("withDynVarContext / hold(0)") {||
  base_test(->hold(0));
}

@test("withDynVarContext / hold(10)") {||
  base_test(->hold(10));
}

@test("withDynVarContext / nested contexts") {||
  base_test(function() { @sys.withDynVarContext{|| @sys.clearDynVar('foo'); @sys.clearDynVar('bar')} });
}

@test("withDynVarContext / nested contexts / hold(0)") {||
  base_test(function() { @sys.withDynVarContext{|| @sys.clearDynVar('foo'); @sys.clearDynVar('bar'); hold(0)} });
}

@test("withDynVarContext / spawned interstitial") {||
  base_test(function() { spawn @sys.withDynVarContext{|| @sys.clearDynVar('foo'); @sys.clearDynVar('bar')} });
}

@test("withDynVarContext / spawned interstitial / hold(0)") {||
  base_test(function() { spawn @sys.withDynVarContext{|| @sys.clearDynVar('foo'); @sys.clearDynVar('bar')}; hold(0); });
}

@test("context survives spawed stratum") { ||
  var signal = @Emitter();
  var stratum;
  @sys.withDynVarContext{
    ||
    @sys.setDynVar('foo', 'x');

    @sys.withDynVarContext{
      ||
      
      @sys.setDynVar('foo', 'y');
      stratum = spawn (function() {
        signal .. @wait;
        @assert.is(@sys.getDynVar('foo'), 'y');
      })();
    }
  
    waitfor {
      hold(10);
      signal.emit();
    }
    and {
      stratum.value();
      // make sure that the correct context is restored:
    hold(0);
      @assert.is(@sys.getDynVar('foo'), 'x');
    }
  }
}

@test("waitfor/and") {||
  @assert.raises(->@sys.getDynVar('foo'));
  
  waitfor {
    @sys.withDynVarContext{
      ||
      @sys.setDynVar('foo', 'x');
      hold(100);
      @assert.is(@sys.getDynVar('foo'), 'x');
    }
  }
  and {
    @assert.raises(->@sys.getDynVar('foo'));
    hold(0);
    @assert.raises(->@sys.getDynVar('foo'));
  }
  @assert.raises(->@sys.getDynVar('foo'));  
}

@test("waitfor/or") {||
  @assert.raises(->@sys.getDynVar('foo'));
  
  waitfor {
    @sys.withDynVarContext{
      ||
      @sys.setDynVar('foo', 'x');
      hold(0);
      @assert.is(@sys.getDynVar('foo'), 'x');
      hold();
    }
  }
  or {
    @assert.raises(->@sys.getDynVar('foo'));
    hold(0);
    @assert.raises(->@sys.getDynVar('foo'));
  }
  @assert.raises(->@sys.getDynVar('foo'));  
}

function waitfor_or_finally(blocking1, blocking2) {
  @assert.raises(->@sys.getDynVar('foo'));
  
  waitfor {
    @sys.withDynVarContext{
      ||
      try {
        @sys.setDynVar('foo', 'x');
        blocking1();
      }
      finally {
        @assert.is(@sys.getDynVar('foo'), 'x');
      }
    }
  }
  or {
    @assert.raises(->@sys.getDynVar('foo'));
    blocking2();
    @assert.raises(->@sys.getDynVar('foo'));
  }
  @assert.raises(->@sys.getDynVar('foo'));
}

@test("waitfor/or hold() finally 1") {||
  waitfor_or_finally(-> hold(), -> hold(10));
}

@test("waitfor/or hold() finally 2") {||
  waitfor_or_finally(-> hold(), -> undefined);
}

@test("waitfor/or hold() finally 3") {||
  waitfor_or_finally(-> hold(0), -> undefined);
}

@test("waitfor/or hold() finally 4") {||
  waitfor_or_finally(-> hold(100), -> undefined);
}

@test("waitfor/or hold() finally 5") {||
  waitfor_or_finally(-> hold(100), -> hold(0));
}


function waitfor_or_retraction(blocking1, blocking2) {
  @assert.raises(->@sys.getDynVar('foo'));
  
  waitfor {
    @sys.withDynVarContext{
      ||
      try {
        @sys.setDynVar('foo', 'x');
        blocking1();
      }
      retract {
        @assert.is(@sys.getDynVar('foo'), 'x');
      }
    }
  }
  or {
    @assert.raises(->@sys.getDynVar('foo'));
    blocking2();
    @assert.raises(->@sys.getDynVar('foo'));
  }
  @assert.raises(->@sys.getDynVar('foo'));
}


@test("waitfor/or hold() retraction 1") {||
  waitfor_or_retraction(-> hold(), -> hold(10));
}

@test("waitfor/or hold() retraction 2") {||
  waitfor_or_retraction(-> hold(), -> undefined);
}

@test("waitfor/or hold() retraction 3") {||
  waitfor_or_retraction(-> hold(0), -> undefined);
}

@test("waitfor/or hold() retraction 4") {||
  waitfor_or_retraction(-> hold(100), -> undefined);
}

@test("waitfor/or hold() retraction 5") {||
  waitfor_or_retraction(-> hold(100), -> hold(0));
}

@test("waitfor/or upon return") {||
  @assert.raises(->@sys.getDynVar('foo'));
  function x() {  
    waitfor {
      @sys.withDynVarContext{
        ||
        try {
          @sys.setDynVar('foo', 'x');
          hold();
        }
        finally {
          @assert.is(@sys.getDynVar('foo'), 'x');
        }
      }
    }
    or {
      @assert.raises(->@sys.getDynVar('foo'));
      return;
    }
  }
  x();
  @assert.raises(->@sys.getDynVar('foo'));
}

@test("waitfor/and upon return") {||
  @assert.raises(->@sys.getDynVar('foo'));
  function x() {  
    waitfor {
      @sys.withDynVarContext{
        ||
        try {
          @sys.setDynVar('foo', 'x');
          hold();
        }
        finally {
          @assert.is(@sys.getDynVar('foo'), 'x');
        }
      }
    }
    and {
      @assert.raises(->@sys.getDynVar('foo'));
      return;
    }
  }
  x();
  @assert.raises(->@sys.getDynVar('foo'));
}

@test("waitfor/or collapse") {||
  @assert.raises(->@sys.getDynVar('foo'));
  function x() {  
    waitfor {
      @sys.withDynVarContext{
        ||
        try {
          @sys.setDynVar('foo', 'x');
          hold();
        }
        retract {
          @assert.is(@sys.getDynVar('foo'), 'x');
        }
        finally {
          @assert.is(@sys.getDynVar('foo'), 'x');
        }
      }
    }
    or {
      @assert.raises(->@sys.getDynVar('foo'));
      collapse;
      @assert.raises(->@sys.getDynVar('foo'));
    }
    @assert.raises(->@sys.getDynVar('foo'));
  }
  x();
  @assert.raises(->@sys.getDynVar('foo'));
}


@test("waitfor/or waitfor/resume retraction 1") {||
  waitfor_or_retraction(function() { waitfor() { } }, -> hold(10));
}

@test("waitfor/or waitfor/resume retraction 2") {||
  waitfor_or_retraction(function() { waitfor() { } }, -> undefined);
}

@test("waitfor/or waitfor/resume retraction 3") {||
  waitfor_or_retraction(function() { hold(0); waitfor() { } }, -> undefined);
}

@test("waitfor/or waitfor/resume finally 1") {||
  waitfor_or_finally(function() { waitfor() { } }, -> hold(10));
}

@test("waitfor/or waitfor/resume finally 2") {||
  waitfor_or_finally(function() { waitfor() { } }, -> undefined);
}

@test("waitfor/or waitfor/resume finally 3") {||
  waitfor_or_finally(function() { hold(0); waitfor() { } }, -> undefined);
}

@test("spawn abort") {||
  @assert.raises(->@sys.getDynVar('foo'));

  var stratum = spawn (function() {
    @sys.withDynVarContext{
      ||
        try {
          @sys.setDynVar('foo', 'x');
          hold();
        }
        retract {
          @assert.is(@sys.getDynVar('foo'), 'x');
        }
        finally {
          @assert.is(@sys.getDynVar('foo'), 'x');
        }      
    }    
  })();

  hold(0);
  @assert.raises(->@sys.getDynVar('foo'));

  waitfor {
    @assert.raises(->stratum.value());
    @assert.raises(->@sys.getDynVar('foo'));
  }
  and {
    stratum.abort();
    @assert.raises(->@sys.getDynVar('foo'));
  }
  
}

@test("spawn abort 2") {||
  @assert.raises(->@sys.getDynVar('foo'));

  var stratum;
  @sys.withDynVarContext {
    ||
    stratum = spawn (function() {
        @sys.setDynVar('foo', 'x');
        hold();
    })();
  }
  
  stratum.abort();
  @assert.raises(->@sys.getDynVar('foo'));
  
}

@test("spawn abort 3") {||
  @assert.raises(->@sys.getDynVar('foo'));

  var stratum;
  @sys.withDynVarContext {
    ||
    stratum = spawn (function() {
        @sys.setDynVar('foo', 'x');
        hold();
    })();
  }
  
  hold(0);
  stratum.abort();
  @assert.raises(->@sys.getDynVar('foo'));
  
}

@test("spawn abort 4") {||
  @assert.raises(->@sys.getDynVar('foo'));

  var stratum;
  @sys.withDynVarContext {
    ||
    stratum = spawn (function() {
        @sys.setDynVar('foo', 'x');
        hold(10);
    })();
  }
  
  stratum.value();
  @assert.raises(->@sys.getDynVar('foo'));
  
}

@test("spawn value/abort edge case") {||
  @assert.raises(->@sys.getDynVar('foo'));

  var S;
  @sys.withDynVarContext {
    ||
    @sys.setDynVar('foo', 'y');
    S = spawn hold();
    spawn(function() { try { S.value(); } catch(e) {}; })();
  }
  @assert.raises(->@sys.getDynVar('foo'));
  S.abort();
  @assert.raises(->@sys.getDynVar('foo')); // this used to not raise
}

@test("spawn value/abort edge case async") {||
  @assert.raises(->@sys.getDynVar('foo'));

  var S;
  @sys.withDynVarContext {
    ||
    @sys.setDynVar('foo', 'y');
    S = spawn hold();
    spawn(function() { try { S.value(); } catch(e) {}; })();
  }
  @assert.raises(->@sys.getDynVar('foo'));
  hold(0);
  @assert.raises(->@sys.getDynVar('foo'));
  S.abort();
  @assert.raises(->@sys.getDynVar('foo')); // this used to not raise
}


@test("js call / context cleared by hold()") {||

  @assert.raises(->@sys.getDynVar('foo'));
  
  __js {
    setTimeout(function() { @assert.raises(->@sys.getDynVar('foo')); }, 10);
  }
  @sys.withDynVarContext{
    ||
    @sys.setDynVar('foo', 'x');
    hold(100);
  }

}

@test("js call / context cleared by waitfor()") {||

  @assert.raises(->@sys.getDynVar('foo'));
  
  var prod;

  __js {
    setTimeout(function() { @assert.raises(->@sys.getDynVar('foo')); prod(); }, 100);
  }
  @sys.withDynVarContext{
    ||
    @sys.setDynVar('foo', 'x');
    waitfor() { prod = resume }
  }

}
