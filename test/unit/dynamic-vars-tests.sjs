@ = require('sjs:test/std');

@context("missing dynvar", function() {
  @test("clearDynVar", function() {
    @sys.clearDynVar('foo');
    // should not throw
  })
  @test("getDynVar", function() {
    @assert.raises(-> @sys.getDynVar('foo'));
  })
  @test("getDynVar with def_val", function() {
    var sentinel = {descr: 'sentinel'};
    @assert.is(@sys.getDynVar('foo', sentinel), sentinel);
  })
})


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


@test("withDynVarContext", function() {
  base_test(->null);
})

@test("withDynVarContext / hold(0)", function() {
  base_test(->hold(0));
})

@test("withDynVarContext / hold(10)", function() {
  base_test(->hold(10));
})

@test("withDynVarContext / nested contexts", function() {
  base_test(function() { @sys.withDynVarContext{|| @sys.clearDynVar('foo'); @sys.clearDynVar('bar')} });
})

@test("withDynVarContext / nested contexts / hold(0)", function() {
  base_test(function() { @sys.withDynVarContext{|| @sys.clearDynVar('foo'); @sys.clearDynVar('bar'); hold(0)} });
})

@test("withDynVarContext / spawned interstitial", function() {
  base_test(function() { reifiedStratum.spawn(-> @sys.withDynVarContext{|| @sys.clearDynVar('foo'); @sys.clearDynVar('bar')}) });
})

@test("withDynVarContext / global spawned interstitial", function() {
  base_test(function() { @sys.spawn(-> @sys.withDynVarContext{|| @sys.clearDynVar('foo'); @sys.clearDynVar('bar')}) });
})


@test("withDynVarContext / spawned interstitial / hold(0)", function() {
  base_test(function() { reifiedStratum.spawn(-> @sys.withDynVarContext{|| @sys.clearDynVar('foo'); @sys.clearDynVar('bar')}); hold(0); });
})

@test("withDynVarContext / global spawned interstitial / hold(0)", function() {
  base_test(function() { @sys.spawn(-> @sys.withDynVarContext{|| @sys.clearDynVar('foo'); @sys.clearDynVar('bar')}); hold(0); });
})


@test("context survives spawed stratum", function() {
  var signal = @Dispatcher();
  var stratum;
  @sys.withDynVarContext{
    ||
    @sys.setDynVar('foo', 'x');

    @sys.withDynVarContext{
      ||
      
      @sys.setDynVar('foo', 'y');
      stratum = reifiedStratum.spawn (function() {
        signal.receive();
        @assert.is(@sys.getDynVar('foo'), 'y');
      });
    }
  
    waitfor {
      hold(10);
      signal.dispatch();
    }
    and {
      stratum.wait();
      // make sure that the correct context is restored:
      hold(0);
      @assert.is(@sys.getDynVar('foo'), 'x');
    }
  }
})

@test("context survives global spawed stratum", function() {
  var signal = @Dispatcher();
  var stratum;
  @sys.withDynVarContext{
    ||
    @sys.setDynVar('foo', 'x');

    @sys.withDynVarContext{
      ||
      
      @sys.setDynVar('foo', 'y');
      stratum = @sys.spawn (function() {
        signal.receive();
        @assert.is(@sys.getDynVar('foo'), 'y');
      });
    }
  
    waitfor {
      hold(10);
      signal.dispatch();
    }
    and {
      stratum.wait();
      // make sure that the correct context is restored:
    hold(0);
      @assert.is(@sys.getDynVar('foo'), 'x');
    }
  }
})


@test("waitfor/and", function() {
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
})

@test("waitfor/or", function() {
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
})

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

@test("waitfor/or hold() finally 1", function() {
  waitfor_or_finally(-> hold(), -> hold(10));
})

@test("waitfor/or hold() finally 2", function() {
  waitfor_or_finally(-> hold(), -> undefined);
})

@test("waitfor/or hold() finally 3", function() {
  waitfor_or_finally(-> hold(0), -> undefined);
})

@test("waitfor/or hold() finally 4", function() {
  waitfor_or_finally(-> hold(100), -> undefined);
})

@test("waitfor/or hold() finally 5", function() {
  waitfor_or_finally(-> hold(100), -> hold(0));
})


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


@test("waitfor/or hold() retraction 1", function() {
  waitfor_or_retraction(-> hold(), -> hold(10));
})

@test("waitfor/or hold() retraction 2", function() {
  waitfor_or_retraction(-> hold(), -> undefined);
})

@test("waitfor/or hold() retraction 3", function() {
  waitfor_or_retraction(-> hold(0), -> undefined);
})

@test("waitfor/or hold() retraction 4", function() {
  waitfor_or_retraction(-> hold(100), -> undefined);
})

@test("waitfor/or hold() retraction 5", function() {
  waitfor_or_retraction(-> hold(100), -> hold(0));
})

@test("waitfor/or upon return", function() {
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
})

@test("waitfor/and upon return", function() {
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
})

@test("waitfor/or collapse", function() {
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
})


@test("waitfor/or waitfor/resume retraction 1", function() {
  waitfor_or_retraction(function() { waitfor() { } }, -> hold(10));
})

@test("waitfor/or waitfor/resume retraction 2", function() {
  waitfor_or_retraction(function() { waitfor() { } }, -> undefined);
})

@test("waitfor/or waitfor/resume retraction 3", function() {
  waitfor_or_retraction(function() { hold(0); waitfor() { } }, -> undefined);
})

@test("waitfor/or waitfor/resume finally 1", function() {
  waitfor_or_finally(function() { waitfor() { } }, -> hold(10));
})

@test("waitfor/or waitfor/resume finally 2", function() {
  waitfor_or_finally(function() { waitfor() { } }, -> undefined);
})

@test("waitfor/or waitfor/resume finally 3", function() {
  waitfor_or_finally(function() { hold(0); waitfor() { } }, -> undefined);
})

@test("spawn abort", function() {
  @assert.raises(->@sys.getDynVar('foo'));

  var stratum = reifiedStratum.spawn (function() {
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
  });

  hold(0);
  @assert.raises(->@sys.getDynVar('foo'));

  waitfor {
    stratum.wait();
    @assert.raises(->@sys.getDynVar('foo'));
  }
  and {
    stratum.abort();
    @assert.raises(->@sys.getDynVar('foo'));
  }
  
})

@test("global spawn abort", function() {
  @assert.raises(->@sys.getDynVar('foo'));

  var stratum = @sys.spawn (function() {
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
  });

  hold(0);
  @assert.raises(->@sys.getDynVar('foo'));

  waitfor {
    stratum.wait();
    @assert.raises(->@sys.getDynVar('foo'));
  }
  and {
    stratum.abort();
    @assert.raises(->@sys.getDynVar('foo'));
  }
  
})


@test("spawn abort 2", function() {
  @assert.raises(->@sys.getDynVar('foo'));

  var stratum;
  @sys.withDynVarContext {
    ||
    stratum = reifiedStratum.spawn (function() {
        @sys.setDynVar('foo', 'x');
        hold();
    });
  }

  stratum.abort();
  @assert.raises(->@sys.getDynVar('foo'));
  
})

@test("global spawn abort 2", function() {
  @assert.raises(->@sys.getDynVar('foo'));

  var stratum;
  @sys.withDynVarContext {
    ||
    stratum = @sys.spawn (function() {
        @sys.setDynVar('foo', 'x');
        hold();
    });
  }

  stratum.abort();
  @assert.raises(->@sys.getDynVar('foo'));
  
})


@test("spawn abort 3", function() {
  @assert.raises(->@sys.getDynVar('foo'));

  var stratum;
  @sys.withDynVarContext {
    ||
    stratum = reifiedStratum.spawn (function() {
        @sys.setDynVar('foo', 'x');
        hold();
    });
  }
  
  hold(0);
  stratum.abort();
  @assert.raises(->@sys.getDynVar('foo'));
  
})

@test("global spawn abort 3", function() {
  @assert.raises(->@sys.getDynVar('foo'));

  var stratum;
  @sys.withDynVarContext {
    ||
    stratum = @sys.spawn (function() {
        @sys.setDynVar('foo', 'x');
        hold();
    });
  }
  
  hold(0);
  stratum.abort();
  @assert.raises(->@sys.getDynVar('foo'));
  
})


@test("spawn abort 4", function() {
  @assert.raises(->@sys.getDynVar('foo'));

  var stratum;
  @sys.withDynVarContext {
    ||
    stratum = reifiedStratum.spawn(function() {
        @sys.setDynVar('foo', 'x');
        hold(10);
    });
  }
  
  stratum.wait();
  @assert.raises(->@sys.getDynVar('foo'));
  
})

@test("global spawn abort 4", function() {
  @assert.raises(->@sys.getDynVar('foo'));

  var stratum;
  @sys.withDynVarContext {
    ||
    stratum = @sys.spawn(function() {
        @sys.setDynVar('foo', 'x');
        hold(10);
    });
  }
  
  stratum.wait();
  @assert.raises(->@sys.getDynVar('foo'));
  
})

@test("spawn/join 1", function() {
  @assert.raises(->@sys.getDynVar('foo'));
  var stratum;
  @sys.withDynVarContext {
    ||
    stratum = reifiedStratum.spawn(function() {
      @sys.setDynVar('foo', 'x');
      hold(10);
      @assert.is(@sys.getDynVar('foo'), 'x');    
    });
  }

  @sys.withDynVarContext {
    ||
    @sys.setDynVar('foo', 'y');
    stratum.join(); // this doesn't really join anything; there's no sub-stratum in stratum
    @assert.is(@sys.getDynVar('foo'), 'y');
  }
  @assert.raises(->@sys.getDynVar('foo'));  
});

@test("spawn/join 2", function() {
  @assert.raises(->@sys.getDynVar('foo'));
  var stratum;
  @sys.withDynVarContext {
    ||
    stratum = reifiedStratum.spawn(function() {
      @sys.setDynVar('foo', 'x');
      hold(10);
      @assert.is(@sys.getDynVar('foo'), 'x');    
    });
  }

  @sys.withDynVarContext {
    ||
    @sys.setDynVar('foo', 'y');
    reifiedStratum.join();
    @assert.is(@sys.getDynVar('foo'), 'y');
  }
  @assert.raises(->@sys.getDynVar('foo'));  
});


@test("spawn wait/abort edge case", function() {
  @assert.raises(->@sys.getDynVar('foo'));

  var S;
  @sys.withDynVarContext {
    ||
    @sys.setDynVar('foo', 'y');
    S = reifiedStratum.spawn(->hold());
    reifiedStratum.spawn(function() { try { S.wait(); } finally { @assert.is(@sys.getDynVar('foo'), 'y');} });
  }
  @assert.raises(->@sys.getDynVar('foo'));
  S.abort();
  @assert.raises(->@sys.getDynVar('foo')); // this used to not raise
})

@test("global spawn wait/abort edge case", function() {
  @assert.raises(->@sys.getDynVar('foo'));

  var S;
  @sys.withDynVarContext {
    ||
    @sys.setDynVar('foo', 'y');
    S = @sys.spawn(->hold());
    @sys.spawn(function() { try { S.wait(); } finally { @assert.is(@sys.getDynVar('foo'), 'y');}});
  }
  @assert.raises(->@sys.getDynVar('foo'));
  S.abort();
  @assert.raises(->@sys.getDynVar('foo')); // this used to not raise
})

@test("spawn wait/abort edge case async", function() {
  @assert.raises(->@sys.getDynVar('foo'));

  var S;
  @sys.withDynVarContext {
    ||
    @sys.setDynVar('foo', 'y');
    S = reifiedStratum.spawn(->hold());
    reifiedStratum.spawn(function() { try { S.wait(); } finally { @assert.is(@sys.getDynVar('foo'),'y'); } });
  }
  @assert.raises(->@sys.getDynVar('foo'));
  hold(0);
  @assert.raises(->@sys.getDynVar('foo'));
  S.abort();
  @assert.raises(->@sys.getDynVar('foo')); // this used to not raise
})

@test("global spawn wait/abort edge case async", function() {
  @assert.raises(->@sys.getDynVar('foo'));

  var S;
  @sys.withDynVarContext {
    ||
    @sys.setDynVar('foo', 'y');
    S = @sys.spawn(->hold());
    @sys.spawn(function() { try { S.wait(); } finally { @assert.is(@sys.getDynVar('foo'),'y'); } });
  }
  @assert.raises(->@sys.getDynVar('foo'));
  hold(0);
  @assert.raises(->@sys.getDynVar('foo'));
  S.abort();
  @assert.raises(->@sys.getDynVar('foo')); // this used to not raise
})

@test("join/abort edge case", function() {
  @assert.raises(->@sys.getDynVar('foo'));

  reifiedStratum.spawn(->hold());
  waitfor {
    @sys.withDynVarContext {
      ||
      @sys.setDynVar('foo', 'x');
      try {
        reifiedStratum.join();
      }
      finally {
        @assert.is(@sys.getDynVar('foo'), 'x'); // this used to not find the variable
      }
    }
  }
  or {
    @sys.withDynVarContext {
      ||
      @sys.setDynVar('foo', 'y');
      reifiedStratum.spawn(->hold());
    }
    @assert.raises(->@sys.getDynVar('foo'));
  }
  @assert.raises(->@sys.getDynVar('foo'));
})


// XXX This doesn't really test what it purports to; the context is cleared further upstream
// see v2 of the test below
@test("js call / context cleared by hold()", function() {

  @assert.raises(->@sys.getDynVar('foo'));
  
  __js {
    setTimeout(function() { @assert.raises(->@sys.getDynVar('foo')); }, 10);
  }
  @sys.withDynVarContext{
    ||
    @sys.setDynVar('foo', 'x');
    hold(100);
  }

})

// XXX This doesn't really test what it purports to; the context is cleared further upstream
// see v2 of the test below
@test("js call / context cleared by waitfor()", function() {

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

})

// wraps v1 of the test in an extra setTimeout, so that there are no upstream 
// callstack effects that reset the context
@test("js call / context cleared by hold() 2", function() {

  waitfor() {
    var R = resume;
    setTimeout(function() {
      @assert.raises(->@sys.getDynVar('foo'));
      
      __js {
        setTimeout(function() { @assert.raises(->@sys.getDynVar('foo')); }, 10);
      }
      @sys.withDynVarContext{
        ||
        @sys.setDynVar('foo', 'x');
        hold(100);
      }
      R();
    },10);
  }
});

// wraps v1 of the test in an extra setTimeout, so that there are no upstream 
// callstack effects that reset the context
@test("js call / context cleared by waitfor() 2", function() {

  waitfor() { 
    var R = resume;
    var prod;
    setTimeout(function() {
      @assert.raises(->@sys.getDynVar('foo'));
      __js {
        setTimeout(function() { @assert.raises(->@sys.getDynVar('foo')); prod(); }, 100);
      }
      @sys.withDynVarContext{
        ||
        @sys.setDynVar('foo', 'x');
        waitfor() { prod = resume }
      }
      R();
    }, 10);
  }
});

@test("alt::abortInner child abort edge case", function() {
  
  var exception_thrown = false;
  waitfor() {
    var R = resume;
    setTimeout(function() {
      @assert.raises(->@sys.getDynVar('foo'));
      __js {
        setTimeout(function() { 
          try { @sys.getDynVar('foo'); } catch(e) { exception_thrown = true} } , 10);
      }
      @sys.withDynVarContext {
        ||
        @sys.setDynVar('foo', 'x');
        waitfor {
          try { hold(); } finally { hold(100); }
        }
        or {
          hold(1001);
        }
        or {
          @assert.is(@sys.getDynVar('foo'), 'x');
        }
        @assert.is(@sys.getDynVar('foo'), 'x');
      }
      R();
    }, 10);
  }
  @assert.is(exception_thrown, true);  
});


@test("par::abortInner child abort edge case", function() {
  
  var exception_thrown = false;
  waitfor() {
    var R = resume;
    setTimeout(function() {
      @assert.raises(->@sys.getDynVar('foo'));
      __js {
        setTimeout(function() { 
          try { @sys.getDynVar('foo'); } catch(e) { exception_thrown = true} } , 10);
      }
      @sys.withDynVarContext {
        ||
        @sys.setDynVar('foo', 'x');
        (function() {
          waitfor {
            try { hold(); } finally { hold(100); }
          }
          and {
            hold(1001);
          }
          and {
          @assert.is(@sys.getDynVar('foo'), 'x');
            return;
          }
        })();
        @assert.is(@sys.getDynVar('foo'), 'x');
      }
      R();
    }, 10);
  }
  @assert.is(exception_thrown, true);  
});

@test("reentrant adoption edge case", function() {
  @assert.raises(->@sys.getDynVar('foo'));
  var otherParent;
  waitfor {
    @sys.withDynVarContext {
      ||
      @sys.setDynVar('foo', 'y');
      (function() { otherParent = reifiedStratum; 
                    @assert.is(@sys.getDynVar('foo'), 'y'); 
                    try {
                      hold();
                    } finally {
                      @assert.is(@sys.getDynVar('foo'), 'y'); 
                    }})();
    }
  }
  or {
    @sys.withDynVarContext {
      ||
      @sys.setDynVar('foo', 'x');
      (function() {
        @assert.is(@sys.getDynVar('foo'), 'x'); 
        otherParent.adopt(reifiedStratum);
        @assert.is(@sys.getDynVar('foo'), 'x');
        try {
          hold();
        }
        finally {
          @assert.is(@sys.getDynVar('foo'), 'x');
        }
      })();
      @assert.is(@sys.getDynVar('foo'), 'x'); 
      hold(0);
      @assert.is(@sys.getDynVar('foo'), 'x'); 
    }
  }
  @assert.raises(->@sys.getDynVar('foo'));
});

@test("reentrant adoption edge case 2", function() {
  @assert.raises(->@sys.getDynVar('foo'));
  var otherParent;
  waitfor {
    @sys.withDynVarContext {
      ||
      @sys.setDynVar('foo', 'y');
      try {
        (function() { otherParent = reifiedStratum; 
                      @assert.is(@sys.getDynVar('foo'), 'y'); 
                      try {
                        hold();
                      } finally {
                        @assert.is(@sys.getDynVar('foo'), 'y'); 
                      }})();
      }
      finally {
        @assert.is(@sys.getDynVar('foo'), 'y');
      }
    }
  }
  or {
    @sys.withDynVarContext {
      ||
      @sys.setDynVar('foo', 'x');
      (function() {
        @assert.is(@sys.getDynVar('foo'), 'x'); 
        otherParent.adopt(reifiedStratum);
        @assert.is(@sys.getDynVar('foo'), 'x'); 
        reifiedStratum.spawn(function() { try { hold(); } 
                                          finally { hold(0); @assert.is(@sys.getDynVar('foo'), 'x'); } });
        hold(0);
      })();
      @assert.is(@sys.getDynVar('foo'), 'x'); 
      hold(0);
      @assert.is(@sys.getDynVar('foo'), 'x'); 
    }
  }
  @assert.raises(->@sys.getDynVar('foo'));
});


@test("wfw::abortInner child sequence & abort", function() {
  
  var exception_thrown = false;
  waitfor() {
    var R = resume;
    setTimeout(function() {
      @assert.raises(->@sys.getDynVar('foo'));
      __js {
        setTimeout(function() { 
          try { @sys.getDynVar('foo'); } catch(e) { exception_thrown = true} } , 10);
      }
      @sys.withDynVarContext {
        ||
        @sys.setDynVar('foo', 'x');
        waitfor {
          try { hold(); } finally { hold(100); }
        }
        while {
          @assert.is(@sys.getDynVar('foo'), 'x');
        }
        @assert.is(@sys.getDynVar('foo'), 'x');
      }
      R();
    }, 10);
  }
  @assert.is(exception_thrown, true);  
});

@test("spawn abort", function() {
  @assert.raises(->@sys.getDynVar('foo'));
  var S;
  @sys.withDynVarContext {
    ||
    @sys.setDynVar('foo', 'x');
    S = reifiedStratum.spawn(function() { 
      try {
        @assert.is(@sys.getDynVar('foo'), 'x');
        hold();
      }
      finally {
        @assert.is(@sys.getDynVar('foo'),'x');
      }
    });
  }
  @assert.raises(->@sys.getDynVar('foo'));
  @sys.withDynVarContext {
    ||
    @sys.setDynVar('foo', 'y');
    S.abort();
    @assert.is(@sys.getDynVar('foo'), 'y');
  }
     
});

@test("reified abort", function() {
  @assert.raises(->@sys.getDynVar('foo'));
  var S;
  @sys.withDynVarContext {
    ||
    @sys.setDynVar('foo', 'x');
    waitfor {
      (function() { S = reifiedStratum.spawn(function() { 
        try {
          @assert.is(@sys.getDynVar('foo'), 'x');
          hold();
        }
        finally {
          hold(0);
          @assert.is(@sys.getDynVar('foo'),'x');
        }
      });
                  })();
    }
    or {
      /**/
    }
    @assert.is(@sys.getDynVar('foo'),'x');
  }
  @assert.raises(->@sys.getDynVar('foo'));
});

@test("reified abort 2", function() {
  @assert.raises(->@sys.getDynVar('foo'));
  var S;
  @sys.withDynVarContext {
    ||
    @sys.setDynVar('foo', 'x');
    waitfor {
      (function() { S = reifiedStratum.spawn(function() { 
        try {
          @assert.is(@sys.getDynVar('foo'), 'x');
          hold();
        }
        finally {
          hold(0);
          @assert.is(@sys.getDynVar('foo'),'x');
        }
      });
          hold()        })();
    }
    or {
      /**/
    }
    @assert.is(@sys.getDynVar('foo'),'x');
  }
  @assert.raises(->@sys.getDynVar('foo'));
});

@test("reentrant abort", function() { 
  var R;
  @sys.withDynVarContext {
    ||
    waitfor {
      @sys.setDynVar('foo', 'x');
      waitfor() { 
        R = resume;
      }
      @assert.is(@sys.getDynVar('foo'), 'x');
    }
    or {
      hold(0);
      @sys.withDynVarContext {
        ||
        @sys.setDynVar('foo', 'y');
        try { @sys.withDynVarContext { || R(); } } 
        finally { @assert.is(@sys.getDynVar('foo'),'y') }
      }
    }
  }
});
