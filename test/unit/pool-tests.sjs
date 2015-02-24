@ = require(['sjs:test/std', 'sjs:pool']);


@context('sharedContext') {||
  var delay = 100;

  function commonTests() {
    @test('reuses context when open') {|s|
      var open = 0;
      var block = function() {
        open++;
        try {
          hold(0);
          s.concurrent .. @assert.eq(1);
          s.total .. @assert.eq(1);
          open .. @assert.eq(3);
          hold(100);
        } finally {
          open--;
        }
      };
      waitfor {
        s.ctx(block);
      } and {
        s.ctx(block);
      } and {
        s.ctx(block);
      }
    }

    @test('fails all users when connection fails') {|s|
      var msg = "emulating failed connection";
      s.init({
        connect: function() {
          hold(10);
          throw new Error(msg);
        }
      });

      waitfor {
        @assert.raises({message: msg}, -> s.ctx(->null));
      } or {
        @assert.raises({message: msg}, -> s.ctx(->null));
      } or {
        @assert.raises({message: msg}, -> s.ctx(->null));
      }

      s.concurrent .. @assert.eq(0);
      s.total .. @assert.eq(1);
    }

    @test('retraction during connect') {|s|
      s.init({ connect: -> hold() });
      waitfor {
        s.ctx( -> null);
      } or {
        hold(0);
      }
    }

    @test('retracts all concurrent users when block is retracted') {|s|
      s.ctx = @sharedContext({
        log: @logging.info,
        delay: s.delay,
      }, function(block) {
        waitfor {
          block();
        } or {
          hold(delay);
          @info("retracting");
        }
      });

      var retracted = 0;
      var block = function() {
        try {
          @info("holding..");
          hold(delay*4);
          @assert.fail("did not get retracted");
        } retract {
          retracted++;
        }
      }

      waitfor {
        s.ctx(block);
      } and {
        s.ctx(block);
      } and {
        s.ctx(block);
      }
      retracted .. @assert.eq(3);

      // make sure we're left in a good state and can run new jobs:
      if(s.delay) hold(s.delay*4);
      var run = false;
      s.ctx {|| run = true }
      run .. @assert.ok();
    }
  };
  @test.beforeAll {|s|
    s.connect = -> null;
    s.disconnect = -> null;
  }

  @test.beforeEach {|s|
    s.concurrent = 0;
    s.total = 0;
    s.init = function(hooks) {
      hooks = {
        connect: -> null,
        disconnect: -> null,
      } .. @merge(hooks);

      var s = this;
      s.ctx = @sharedContext({
        delay: s.delay,
        log: @logging.info,
      }, function(block) {
        //console.log(this);
        s.total++;
        s.concurrent++;
        try {
          hold(delay);
          hooks.connect();
          @info("ctx connected - running block");
          block();
        } finally {
          @info("ctx resumed");
          hold(delay);
          s.concurrent--;
          hooks.disconnect();
        }
      });
    };
  };

  @context('with delay') {||
    commonTests();

    @test.beforeEach {|s|
      s.delay = delay;
      s.init();
    }

    @test('reuses context before it is destroyed') {|s|
      s.ctx( -> hold(0));
      hold(s.delay / 2);
      s.ctx {||
        s.concurrent .. @assert.eq(1);
        s.total .. @assert.eq(1);
      }
    }

    @test('recreates new context after delay') {|s|
      s.ctx( -> hold(0));
      hold(s.delay * 2);
      s.ctx {||
        s.concurrent .. @assert.eq(1);
        s.total .. @assert.eq(2);
      }
    }

    @test('disconnection error is uncaught') {|s|
      // This is not great, but all code using block
      // has completed, so there's nowhere to report it.
      // Thankfully, most disconnect code never throws
      
      var thrown = false;
      var msg = "error thrown during disconnect";
      s.init({
        disconnect: function() {
          @info("disconnecting");
          hold(0);
          if(thrown) return; // only fail the first time
          thrown = true;
          throw new Error(msg);
        }
      });

      var domain = require('nodejs:domain').create();
      domain.enter();

      try {
        s.ctx( -> null);

        waitfor {
          var uncaught = domain .. @wait('error');
        } or {
          hold(s.delay*4);
        }
      } finally {
        domain.exit();
        domain.dispose();
      }

      thrown .. @assert.ok("exception not thrown");
      uncaught .. @assert.ok();
      uncaught.message .. @assert.eq(msg);

      var run = false;
      s.ctx {|| run = true; }
      run .. @assert.ok();
      hold(s.delay*4);
    }.serverOnly();
  }

  @context('without delay') {||
    @test.beforeEach {|s|
      s.init();
    }
    
    commonTests();

    @test('destroys context synchronously') {|s|
      s.ctx( -> hold(0));
      s.ctx {||
        s.concurrent .. @assert.eq(1);
        s.total .. @assert.eq(2);
      }
    }

    @test('throws disconnection error') {|s|
      var msg = "fake disconnection error";
      var thrown = false;
      s.init({
        disconnect: function() {
          hold(100);
          thrown = true;
          throw new Error(msg);
        },
      });
      @assert.raises({message:msg}, -> s.ctx(-> null));
      thrown .. @assert.ok('exception not thrown');
    }
  }
}
