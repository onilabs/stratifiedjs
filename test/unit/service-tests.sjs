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
    
    

@context('withBackgroundServices/withControlledService', function() {
  // XXX these tests mostly combine withBackgroundServices & withControlledService, because
  // the functionality of these two functions used to be combined in just one function
  // (withBackgroundServices)
  @test('single runService', function() {
    var rv = [];
    @withBackgroundServices() {
      |background_session|
      rv.push('background_session start');
      var [service] = background_session.runService(@withControlledService, simple_service, {rv:rv,id: 1});
      @assert.eq(service.Status .. @current, 'stopped');
    }
    rv.push('background_session done');
    @assert.eq(rv, ['background_session start', 'background_session done']);
  })

  @product([true,false],[true,false],[true,false],[true,false]) .. @each {
    |[b1,b2,b3,b4]|
    @test("single started #{b1},#{b2},#{b3}", function() {
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
    }) // @test
  } // @product

  @product([true,false],[true,false],[true,false],[true,false]) .. @each {
    |[b1,b2,b3, b4]|
    @test("single used #{b1},#{b2},#{b3},#{b4}", function() {
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
    }) // @test
  } // @product

  @product([true,false],[true,false],[true,false],[true,false],[true,false]) .. @each {
    |[b1,b2,b3, b4, b5]|
    @test("single used/stopped/used #{b1},#{b2},#{b3},#{b4},#{b5}", function() {
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
    }) // @test
  } // @product

  @product([true,false],[true,false],[true,false],[true,false]) .. @each {
    |[b1,b2,b3, b4]|
    @test("single started/stopped #{b1},#{b2},#{b3},#{b4}", function() {
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
    }) // @test
  } // @product

  @product([true,false],[true,false],[true,false]) .. @each {
    |[b1,b2,b3, b4]|
    @test("used out of scope #{b1},#{b2},#{b3}", function() {
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
    }) // @test
  } // @product
  
  @test("stopping while using - sync", function() {
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
  })

  @test("stopping while using - async", function() {
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
  })

  @test("throw in service - sync", function() {
    var rv = [], service;
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
        @assert.eq(e.message, "Background service threw: xxx");
        rv.push('catch outer');
      }
    }
    and {
      try {
        service.use {|exit| exit(); try { hold(); } retract { rv.push('use retract'); hold(0);}}
      }
      catch (e) { 
        @assert.eq(e,'xxx');
        @assert.truthy(service.Status .. @current, 'terminated');
        rv.push('catch inner');
      }
    }
    @assert.eq(rv, ['throw', 'service finally', 'catch outer', 'use retract', 'catch inner']);
  })

  @test("throw in service 2 - sync", function() {
    var rv = [], service;
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
        
        try {
          service.use {|exit| exit(); try { hold(); } retract { rv.push('use retract'); hold(0);}}
          rv.push('not reached 1');
        }
        catch (e) { 
          rv.push('catch inner'); 
          @assert.eq(e,'xxx');
        }
        finally {
          @assert.truthy(service.Status .. @current, 'terminated');
          rv.push('finally inner');
        }
        rv.push('not reached 2');
      }
      rv.push('not reached 3');
    }
    catch(e) {
      @assert.eq(e.message, "Background service threw: xxx");
      rv.push('catch outer');
    }

    @assert.eq(rv, ['throw', 'service finally', 'use retract', 'catch inner', 'finally inner', 'catch outer']);
  })

  @test("throw in service 3 - sync", function() {
    var rv = [], service;
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
        
        try {}
        finally {
          try {
            service.use {|exit| exit(); try { hold(); } retract { rv.push('use retract'); hold(0);}}
            rv.push('not reached 1');
          }
          catch (e) { 
            @assert.eq(e,'xxx');
            @assert.truthy(service.Status .. @current, 'terminated');
            rv.push('catch inner'); 
          }
        }
        rv.push('not reached');
      }
      rv.push('not reached 3');
    }
    catch(e) {
      @assert.eq(e.message, "Background service threw: xxx");
      rv.push('catch outer');
    }

    @assert.eq(rv, ['throw', 'service finally', 'use retract', 'catch inner', 'catch outer']);
  })


  @test("early termination", function() {
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
      @assert.eq(rv, ['session start', '1:init1', '1:init2', 'terminating', '1:retract', '1:finally1', '1:finally2', 'session end']);
    }
  })

  @test("abort during init", function() {
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
  })
})


@context('withControlledService', function() {
  @test('throw from service - async sequencing', function() {
    var rv = '';
    try {
    @withControlledService(function(sf) {
      waitfor {
        hold(0);
        rv += 'b';
        throw 'f';
      }
      or {
        try {
          return sf();
        }
        retract {
          hold(0);
          rv += 'e';
        }
      }
    }) {
      |cs|
      try {
        cs.use {
          ||
          try {
            rv += 'a';
            hold();
          }
          retract {
            rv += 'c';
            hold(0);
            rv += 'd';
          }
        } /* cs.use */
      }
      catch (e) {
        rv += e+'1';
        hold(0);
      }
    }
    }
    catch (e) {
      rv += e+'2';
    }
    @assert.eq(rv, 'abcdef1f2');
  }) // @test('throw from service - async sequencing')

  @test('terminate 1', function() {
    @product([true,false], [true,false]) .. @each {
      |[p1, p2]|
      var rv = '';
      try {
        @withControlledService(function(sf) { rv += 'x'; return sf(); }) {
          |cs|
          if (p1) hold(0);
          cs.terminate('a');
          if (p2) hold();
        }
      }
      catch (e) {
        rv += e;
      }
      @assert.eq(rv, 'a');
    }
  })

  @test('terminate 2', function() {
    @product([true,false],[true,false]) .. @each {
      |[p1,p2]|
      var rv = '';
      try {
        @withControlledService(function(sf) { if(p1) hold(0); rv += 'a'; try { return sf(); }retract{rv += 'x'}finally{rv+='b'; if(p2) hold(0);} }) {
          |cs|
          cs.start(true);
          cs.terminate('c');
        }
      }
      catch (e) {
        rv += e;
      }
      @assert.eq(rv, 'abc');
    }
  })

  @product([true,false],[true,false],[true,false],[true,false],[true,false]) .. @each {
    |[p1,p2,p3,p4,p5]|
    @test("terminate 3 - #{p1},#{p2},#{p3},#{p4},#{p5}", function() {
      //console.log(p1,p2,p3,p4,p5);
      var rv = '';
      try {
        @withControlledService(function(sf) { if(p1) hold(0); rv += 'a'; try { return sf(); }retract{rv += 'x'}finally{rv+='b'; if(p2) hold(0);} }) {
          |cs|
          cs.use { 
            ||
            if (p5) hold(0);
            cs.terminate('c',p3);
            if (p4) hold();
          }
          rv += 'C';
        }
      }
      catch (e) {
        rv += e;
      }

      // see the comment in modules/service.sjs:~480 for why/how these cases differ:
      if (p1 /* && p2=any */ && !p3 && !p4 && !p5)
        @assert.eq(rv, 'aCbc');
      else if (/* p1=any && */ p2 && !p3 && !p4 && !p5)
        @assert.eq(rv, 'abCc');
      else 
        @assert.eq(rv, 'abc');
    });
  }

})
