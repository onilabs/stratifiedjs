@ = require(['sjs:test/suite', 'sjs:std']);

function simple_service({id,rv,block_init,block_finally,block_retract, block_api},
                        session) {
  try {
    rv.push :: "#{id}:init1";
    if (block_init) hold(0);
    rv.push :: "#{id}:init2";
    session(function() { hold(0); return "#{id}:hello"; });
  }
  retract {
    rv.push :: "#{id}:retract";
    if (block_retract) hold(0);
  }
  finally {
    rv.push :: "#{id}:finally1";
    if (block_finally) hold(0);
    rv.push :: "#{id}:finally2";
  }
}
    
    

@context('withBackgroundServices/withControlledService') {||
  // XXX these tests mostly combine withBackgroundServices & withControlledService, because
  // the functionality of these two functions used to be combined in just one function
  // (withBackgroundServices)
  @test('single runService') {||
    var rv = [];
    @withBackgroundServices() {
      |background_session|
      rv.push('background_session start');
      var [service] = background_session.runService(@withControlledService, simple_service, {rv:rv,id: 1});
      @assert.eq(service.Status .. @current, 'stopped');
    }
    rv.push('background_session done');
    @assert.eq(rv, ['background_session start', 'background_session done']);
  }

  @product([true,false],[true,false],[true,false],[true,false]) .. @each {
    |[b1,b2,b3,b4]|
    @test("single started #{b1},#{b2},#{b3}") {||
      var rv = [], service;
      @withBackgroundServices {
        |background_session|
        rv.push('background_session start');
        [service] = background_session.runService(@withControlledService, simple_service, {rv:rv, id: 1, block_init:b1,block_retract:b2,block_finally:b3});
        @assert.eq(service.Status .. @current, 'stopped');
        service.start(b4);
        @assert.eq(service.Status .. @current, (b1&&!b4) ? 'initializing' : 'running');
      }
      @assert.eq(service.Status .. @current, 'terminated');
      rv.push('background_session done');
      if (b1&&!b4) 
        @assert.eq(rv, ['background_session start', '1:init1', '1:retract', '1:finally1', '1:finally2', 'background_session done']);
      else
        @assert.eq(rv, ['background_session start', '1:init1', '1:init2', '1:retract', '1:finally1', '1:finally2', 'background_session done']);
    } // @test
  } // @product

  @product([true,false],[true,false],[true,false],[true,false]) .. @each {
    |[b1,b2,b3, b4]|
    @test("single used #{b1},#{b2},#{b3},#{b4}") {||
      var rv = [], service;
      @withBackgroundServices {
        |background_session|
        rv.push('background_session start');
        [service] = background_session.runService(@withControlledService, simple_service, {rv:rv, id: 1, block_init:b1,block_retract:b2,block_finally:b3, block_api:b4});
        @assert.eq(service.Status .. @current, 'stopped');
        service.use {
          |hello|
          rv.push(hello());
        }
        @assert.eq(service.Status .. @current, 'running');
        service.use {
          |hello|
          rv.push(hello());
        }
      }
      @assert.eq(service.Status .. @current, 'terminated');
      rv.push('background_session done');
      @assert.eq(rv, ['background_session start', '1:init1', '1:init2', '1:hello', '1:hello', '1:retract', '1:finally1', '1:finally2', 'background_session done']);
    } // @test
  } // @product

  @product([true,false],[true,false],[true,false],[true,false],[true,false]) .. @each {
    |[b1,b2,b3, b4, b5]|
    @test("single used/stopped/used #{b1},#{b2},#{b3},#{b4},#{b5}") {||
      var rv = [], service;
      @withBackgroundServices {
        |background_session|
        rv.push('background_session start');
        [service] = background_session.runService(@withControlledService, simple_service, {rv:rv, id: 1, block_init:b1,block_retract:b2,block_finally:b3, block_api:b4});
        @assert.eq(service.Status .. @current, 'stopped');
        service.use {
          |hello|
          rv.push(hello());
        }
        @assert.eq(service.Status .. @current, 'running');
        service.stop(b5);
        @assert.eq(service.Status .. @current, (b3 && !b5) ? 'stopping' : 'stopped');

        service.use {
          |hello|
          rv.push(hello());
        }
      }
      @assert.eq(service.Status .. @current, 'terminated');
      rv.push('background_session done');
      @assert.eq(rv, ['background_session start', 
                      '1:init1', '1:init2', '1:hello', '1:finally1', '1:finally2',
                      '1:init1', '1:init2', '1:hello', '1:retract', '1:finally1', '1:finally2', 
                      'background_session done']);
    } // @test
  } // @product

  @product([true,false],[true,false],[true,false],[true,false]) .. @each {
    |[b1,b2,b3, b4]|
    @test("single started/stopped #{b1},#{b2},#{b3},#{b4}") {||
      var rv = [], service;
      @withBackgroundServices {
        |background_session|
        rv.push('background_session start');
        [service] = background_session.runService(@withControlledService, simple_service, {rv:rv, id: 1, block_init:b1,block_retract:b2,block_finally:b3, block_api:b4});
        @assert.eq(service.Status .. @current, 'stopped');
        service.start();
        @assert.eq(service.Status .. @current, b1 ? 'initializing' : 'running');
        service.stop();
        @assert.eq(service.Status .. @current, b1||b3 ? 'stopping' : 'stopped');
        hold(0);
      }
      @assert.eq(service.Status .. @current, 'terminated');
      rv.push('background_session done');
      @assert.eq(rv, ['background_session start', 
                      '1:init1', '1:init2', '1:finally1', '1:finally2',
                      'background_session done']);
    } // @test
  } // @product

  @product([true,false],[true,false],[true,false]) .. @each {
    |[b1,b2,b3, b4]|
    @test("used out of scope #{b1},#{b2},#{b3}") {||
      var rv = [], service;
      @withBackgroundServices {
        |background_session|
        rv.push('background_session start');
        [service] = background_session.runService(@withControlledService, simple_service, {rv:rv, id: 1, block_init:b1,block_retract:b2,block_finally:b3});
      }
      rv.push('background_session done');
      try {
        service.use {|hello| rv.push(hello()); }
      }
      catch(e) {
        @assert.truthy(e .. @isServiceUnavailableError);
      }
      @assert.eq(rv, ['background_session start', 
                      'background_session done']);
    } // @test
  } // @product
  
  @test("stopping while using - sync") {||
    var rv = [], service;

    @withBackgroundServices {
      |background_session|
      [service] = background_session.runService(@withControlledService, function(blk) {
        var exit;
        waitfor {
          waitfor() { exit = resume; }
          service.stop();
        }
        and {
          blk(exit);
        }
        finally {
          rv.push('retract');
        }
      });
      try {
        service.use {|exit| exit(); rv.push('after_signal'); hold(); };
      }
      catch(e) { if (@isServiceUnavailableError(e)) rv.push('catch') }
    }
    @assert.eq(rv, ['retract','after_signal','catch']);
  }

  @test("stopping while using - async") {||
    var rv = [], service;
    
    waitfor {
      @withBackgroundServices {
        |background_session|
        [service] = background_session.runService(@withControlledService, function(blk) {
          var exit;
          waitfor {
            waitfor() { exit = resume; }
            hold(0);
            rv.push('stop');
            service.stop();
          }
          and {
            blk(exit);
          }
          finally {
            rv.push('service finally');
          }
        });
        hold();
      }
    }
    or {
      try {
        service.use {|exit| exit(); try { hold(); } retract { rv.push('use retract'); hold(0);}}
      }
      catch (e) {
        if (@isServiceUnavailableError(e)) rv.push('catch');
      }
    }
    @assert.eq(rv, ['stop', 'use retract', 'service finally','catch']);
  }

  @test("throw in service - sync") {||
    var rv = [], service;
    // XXX this test is structured in an odd way because of the way withBackgroundServices used
    // to work. it could be restructured without the waitfor/or now
    waitfor {
      try {
        @withBackgroundServices {
          |background_session|
          [service] = background_session.runService(@withControlledService, function(blk) {
            var exit;
            waitfor {
              waitfor() { exit = resume; }
              rv.push('throw');
              throw 'xxx';
            }
            and {
              blk(exit);
            }
            finally {
              rv.push('service finally');
            }
          });
          hold();
        }
      }
      catch(e) {
        rv.push(e);
      }
    }
    or {
      try {
        service.use {|exit| exit(); try { hold(); } retract { rv.push('use retract'); hold(0);}}
      }
      catch (e) {
        @assert.truthy(@isServiceUnavailableError(e));
        @assert.truthy(e.message .. @contains("(Service threw xxx"));
        @assert.truthy(service.Status .. @current, 'terminated');
        rv.push('catch');
      }
    }
    @assert.eq(rv, ['throw', 'service finally', 'use retract', 'catch']);
  }

  @test("early termination") { ||
    [true,false] .. @each {
      |p1|
      var rv = [];
      @withBackgroundServices { 
        |session|
        rv.push('session start');
        var [service,term] = session.runService(simple_service, {rv:rv, id:1, block_finally:p1});
        rv.push('terminating');
        term();
        rv.push('session end');
      }
      @assert.eq(rv, ['session start', '1:init1', '1:init2', 'terminating', '1:finally1', '1:finally2', 'session end']);
    }
  }

  @test("abort during init") { ||
    [true, false] .. @each {
      |p1|
      var rv = [];
      @withBackgroundServices { 
        |session|
        rv.push('session start');
        waitfor {
          session.runService(simple_service, {rv:rv, id:1, block_init:true, block_retract:p1});
        }
        or {
          rv.push('aborting');
        }
        rv.push('session end');
      }
      @assert.eq(rv, ['session start', '1:init1', 'aborting', '1:retract', '1:finally1', '1:finally2', 'session end']);
    }
  }
}
