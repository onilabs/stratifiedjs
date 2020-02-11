@ = require(['sjs:test/suite', 'sjs:std']);

function simple_service({id,rv,block_init,block_finally,block_retract, block_api},
                        scope) {
  try {
    rv.push :: "#{id}:init";
    if (block_init) hold(0);
    scope(function() { hold(0); return "#{id}:hello"; });
  }
  retract {
    rv.push :: "#{id}:retract";
    if (block_retract) hold(0);
  }
  finally {
    rv.push :: "#{id}:finally";
    if (block_finally) hold(0);
  }
}
    
    

@context('withServiceScope') {||

  @test('single attached') {||
    var rv = [];
    @withServiceScope() {
      |service_scope|
      rv.push('service_scope start');
      var service = service_scope.attach(simple_service, {rv:rv,id: 1});
      @assert.eq(service.Status .. @current, 'stopped');
    }
    rv.push('service_scope done');
    @assert.eq(rv, ['service_scope start', 'service_scope done']);
  }

  @product([true,false],[true,false],[true,false]) .. @each {
    |[b1,b2,b3]|
    @test("single started #{b1},#{b2},#{b3}") {||
      var rv = [], service;
      @withServiceScope() {
        |service_scope|
        rv.push('service_scope start');
        service = service_scope.attach(simple_service, {rv:rv, id: 1, block_init:b1,block_retract:b2,block_finally:b3});
        @assert.eq(service.Status .. @current, 'stopped');
        service.start();
        @assert.eq(service.Status .. @current, b1 ? 'initializing' : 'running');
      }
      @assert.eq(service.Status .. @current, 'terminated');
      rv.push('service_scope done');
      @assert.eq(rv, ['service_scope start', '1:init', '1:retract', '1:finally', 'service_scope done']);
    } // @test
  } // @product

  @product([true,false],[true,false],[true,false],[true,false]) .. @each {
    |[b1,b2,b3, b4]|
    @test("single used #{b1},#{b2},#{b3},#{b4}") {||
      var rv = [], service;
      @withServiceScope() {
        |service_scope|
        rv.push('service_scope start');
        service = service_scope.attach(simple_service, {rv:rv, id: 1, block_init:b1,block_retract:b2,block_finally:b3, block_api:b4});
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
      rv.push('service_scope done');
      @assert.eq(rv, ['service_scope start', '1:init', '1:hello', '1:hello', '1:retract', '1:finally', 'service_scope done']);
    } // @test
  } // @product

  @product([true,false],[true,false],[true,false],[true,false]) .. @each {
    |[b1,b2,b3, b4]|
    @test("single used/stopped/used #{b1},#{b2},#{b3},#{b4}") {||
      var rv = [], service;
      @withServiceScope() {
        |service_scope|
        rv.push('service_scope start');
        service = service_scope.attach(simple_service, {rv:rv, id: 1, block_init:b1,block_retract:b2,block_finally:b3, block_api:b4});
        @assert.eq(service.Status .. @current, 'stopped');
        service.use {
          |hello|
          rv.push(hello());
        }
        @assert.eq(service.Status .. @current, 'running');
        service.stop();
        @assert.eq(service.Status .. @current, b3 ? 'stopping' : 'stopped');

        service.use {
          |hello|
          rv.push(hello());
        }
      }
      @assert.eq(service.Status .. @current, 'terminated');
      rv.push('service_scope done');
      @assert.eq(rv, ['service_scope start', 
                      '1:init', '1:hello', '1:finally', 
                      '1:init', '1:hello', '1:retract', '1:finally', 
                      'service_scope done']);
    } // @test
  } // @product

  @product([true,false],[true,false],[true,false],[true,false]) .. @each {
    |[b1,b2,b3, b4]|
    @test("single started/stopped #{b1},#{b2},#{b3},#{b4}") {||
      var rv = [], service;
      @withServiceScope() {
        |service_scope|
        rv.push('service_scope start');
        service = service_scope.attach(simple_service, {rv:rv, id: 1, block_init:b1,block_retract:b2,block_finally:b3, block_api:b4});
        @assert.eq(service.Status .. @current, 'stopped');
        service.start();
        @assert.eq(service.Status .. @current, b1 ? 'initializing' : 'running');
        service.stop();
        @assert.eq(service.Status .. @current, b1||b3 ? 'stopping' : 'stopped');
        hold(0);
      }
      @assert.eq(service.Status .. @current, 'terminated');
      rv.push('service_scope done');
      @assert.eq(rv, ['service_scope start', 
                      '1:init', '1:finally', 
                      'service_scope done']);
    } // @test
  } // @product

  @product([true,false],[true,false],[true,false]) .. @each {
    |[b1,b2,b3, b4]|
    @test("used out of scope #{b1},#{b2},#{b3}") {||
      var rv = [], service;
      @withServiceScope() {
        |service_scope|
        rv.push('service_scope start');
        service = service_scope.attach(simple_service, {rv:rv, id: 1, block_init:b1,block_retract:b2,block_finally:b3});
      }
      rv.push('service_scope done');
      try {
        service.use {|hello| rv.push(hello()); }
      }
      catch(e) {
        @assert.truthy(e .. @isServiceUnavailableError);
      }
      @assert.eq(rv, ['service_scope start', 
                      'service_scope done']);
    } // @test
  } // @product
  
  @test("stopping while using - sync") {||
    var rv = [], service;

    @withServiceScope() {
      |service_scope|
      service = service_scope.attach(function(blk) {
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
      @withServiceScope() {
        |service_scope|
        service = service_scope.attach(function(blk) {
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
    
    waitfor {
      try {
        @withServiceScope() {
          |service_scope|
          service = service_scope.attach(function(blk) {
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
    and {
      try {
        service.use {|exit| exit(); try { hold(); } retract { rv.push('use retract'); hold(0);}}
      }
      catch (e) {
        if (@isServiceUnavailableError(e)) rv.push('catch');
      }
    }
    @assert.eq(rv, ['throw', 'service finally', 'xxx', 'use retract', 'catch']);
  }
}
