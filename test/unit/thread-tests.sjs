var testUtil = require('../lib/testUtil');
var {test, context, assert} = require('sjs:test/suite');
@ = require('sjs:std');
@thread = require('sjs:thread');
context('withThread', function() {
  test('basic', function() {
    @thread.withThread {
      |[{eval},{kill}]|
      eval('1+1') .. assert.eq(2);
    }
  });

  test('basic thread_itf I', function() {
    @thread.withThread(
      @{
        -> {__eval: code -> eval(__oni_rt.c1.compile(code))};
      }) {
      |[{__eval},{kill}]|
      __eval('1+1') .. assert.eq(2);
    }
  });

  test('basic thread_itf II', function() {
    @thread.withThread(
      {
        thread_itf:@{
            -> {__eval: code -> eval(__oni_rt.c1.compile(code))};
        }
      }) {
        |[{__eval},{kill}]|
      __eval('1+1') .. assert.eq(2);
    }
  });

  test('basic thread_itf III', function() {
    @thread.withThread(
      @{
        -> {__eval: code -> eval(__oni_rt.c1.compile(code))};
      },
      {}) {
      |[{__eval},{kill}]|
      __eval('1+1') .. assert.eq(2);
    }
  });

  test('async thread_itf', function() {
    @thread.withThread(
      @{
        hold(0);
        -> {__eval: code -> eval(__oni_rt.c1.compile(code))};
      }) {
      |[{__eval},{kill}]|
      __eval('1+1') .. assert.eq(2);
    }
  });

  test('error in thread_itf', function() {
    try {
      @thread.withThread(@{-> x}) {
        ||
        assert.fail('not reached');
      }
    }
    catch(e) {
      assert.eq(e.message, 'x is not defined');
    }
  });

  test('async error in thread_itf', function() {
    try {
      @thread.withThread(@{hold(0); -> x;}) {
        ||
        assert.fail('not reached');
      }
    }
    catch(e) {
      assert.eq(e.message, 'x is not defined');
    }
  });

  test('abort thread_itf', function() {
    waitfor {
      @thread.withThread(@{hold(1e5); -> x;}) {
        ||
        assert.fail('not reached');
      }
    }
    or {
      hold(0);
    }
  });

  test('transferable objects - Uint8Array', function() {
    @thread.withThread(
      @{
        @ = require('sjs:std');
        var saved;
        -> { 
          xfer: function(arr) {
            @assert.eq(arr.byteLength, 3);
            saved = arr;
            return arr;
          },
          check: function() {
            @assert.eq(saved.byteLength, 0);
          }
        };
      }) {
      |[{xfer, check}]|
      var arr = new Uint8Array([1,2,3]);
      assert.eq(arr.byteLength, 3);
      var arr2 = xfer(arr);
      assert.eq(arr.byteLength, 0);
      assert.eq(arr2.byteLength, 3);
      check();
    }
  }).skip("Threads don't use transferables anymore because of performance issues");

  test('dfuncs disallowed by default', function() {
    @thread.withThread(
      @{ 
        @ = require('sjs:std');
        -> { exec: (f -> f()),
             exec_and_catch_rv: function(f) {
               try {
                 f();
               }
               catch(e) {
                 @assert.eq(e.message, 'Remote bridge does not accept dfuncs');
                 return true;
               }
               return false;
             },
             send_dfunc: function(f) {
               try {
                 f(@{ ()->undefined });
               }
               catch(e) {
                 @assert.eq(e.message, 'Remote bridge does not accept dfuncs');
               }
             },
             return_dfunc: function() { 
               try {
                 return @{ () -> undefined }; 
               }
               catch(e) { 
                 // error in return marshalling is uncatchable on this side
                 @assert.fail('not reached'); 
               }
             }
           }
      }) {
      |[{exec,exec_and_catch_rv, send_dfunc, return_dfunc}]|
      // 'normal' remoted function:
      assert.eq(exec(->3), 3);

      // dfunc as parameter:
      try {
        exec(@{-> (-> 3)});
      }
      catch(e) {
        assert.eq(e.message, 'Remote bridge does not accept dfuncs');
      }
      
      // dfunc as return value:
      exec_and_catch_rv(-> @{ ()->undefined }) .. assert.truthy;

      // get remote to send a dfunc:
      send_dfunc(function(x) { assert.fail('not reached'); } );

      // get remote to return a dfunc:
      try {
        return_dfunc();
      }
      catch(e) {
        assert.eq(e.message, 'Remote bridge does not accept dfuncs');
      }

      return;
    }
    assert.fail('not reached');
  });

  test('retract withThread', function() {
    var retract_called = 0;
    waitfor {
      var trigger_retract;
      waitfor() { trigger_retract = resume };
      hold(0);
    }
    or {
      @thread.withThread(
        @{
            -> (function(r) { 
              try { hold(); } retract { r(); }
            });
        }) {
        |[run]|
        trigger_retract();
        try {
          run(-> ++retract_called);
        }
        finally {
          ++retract_called;
        }
        assert.fail('not reached');
      };
    }
    assert.eq(retract_called, 2);    
  });

  test('implicit abort', function() {
    // XXX maybe this is the correct behavior; we have nothing holding the `withThread` session open,
    // so there is no orderly shutdown.
    var run_call_threw = false;
    var retract_called = false;
    @thread.withThread(
      @{
        -> (function(r) { 
          try { hold(); } retract { console.log("RETRACT NOT CALLED..."); r(); }
        });
      }) {
      |[run]|
      reifiedStratum.spawn(function() {
        try {
          run(-> retract_called=true);
        }
        catch(e) {
          run_call_threw = true;
        }
      });
      hold(100);
    }
    assert.truthy(run_call_threw);
    assert.truthy(retract_called);
  }).skip('needs work?');

  test('kill', function() {
    try {
      @thread.withThread(
        @{
          function isPrime(num) {
            for (var i=2, sqrt = Math.sqrt(num); i<=sqrt; ++i) {
              if (num % i === 0) return false;
            }
            return num > 1;
          }
          () -> { 
            largestPrimeLTE: function(i) { 
              while (i>1) { 
                if (isPrime(i)) return i; 
                --i;
              }
              throw new Error("not found");
            }
          }
        }) {
        |[{largestPrimeLTE}, {kill}]|
        waitfor {
          largestPrimeLTE(Number.MAX_SAFE_INTEGER);
        }
        or {
          hold(0);
          kill();
        }
      }
    }
    catch(e) {
      assert.truthy(require('sjs:vmbridge').isVMBridgeError(e));
      assert.truthy(e.message.search('Connection killed')>0);
      return;
    }
    assert.fail('not reached');
  });

});
