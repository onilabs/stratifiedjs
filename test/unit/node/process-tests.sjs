@ = require('sjs:test/std');

@context() {||
  var runMethods = {
    'module': function(code, opts) {
      require('sjs:nodejs/tempfile').TemporaryFile {|f|
        code .. @pump(f.writeStream());
        var rv = @childProcess.run(process.execPath, [@sys.executable, f.path .. @url.normalize(module.id)], {'stdio':['ignore','pipe',2], throwing: false} .. @merge(opts || {}));
        @info("child process exited with code #{rv.code}, signal #{rv.signal}");
        return rv;
      }
    },
    'eval': function(code, opts) {
      var rv = @childProcess.run(process.execPath, [@sys.executable, '-e', code], {'stdio':['ignore','pipe',2], throwing: false} .. @merge(opts || {}));
      @info("child process exited with code #{rv.code}, signal #{rv.signal}");
      return rv;
    },
  };
  ;['module', 'eval'] .. @each {|runMethod|
    @context("#{runMethod} process") {||
      var run = runMethods[runMethod];
      @context("termination") {||
        @test("process.exit() runs synchronous cleanup") {||
          // async cleanup cannot be done on `exit` (nodejs restriction)
          var result = run("
            spawn(function() {
              hold(500);
              process.exit(0);
            }());

            try {
              console.log('start');
              hold();
            } finally {
              console.log('finally sync');
              hold(10);
              console.log('finally async');
            }
          ");
          result.stdout.trim().split('\n')
            .. @assert.eq([
              'start',
              'finally sync',
            ]);
          result.code .. @assert.eq(0);
          result.signal .. @assert.eq(null);
        }

        @test("SIGINT runs async cleanup") {||
          var result = run("
            spawn(function() {
              hold(500);
              process.kill(process.pid, 'SIGINT');
            }());

            try {
              console.log('start');
              hold();
            } finally {
              console.log('finally sync');
              hold(10);
              console.log('finally async');
            }
          ");
          result.stdout.trim().split('\n')
            .. @assert.eq([
              'start',
              'finally sync',
              'finally async',
            ]);
          [result.code, result.signal] .. @assert.eq([null, 'SIGINT']);
        }

        @test("SIGHUP runs async cleanup") {||
          var result = run("
            spawn(function() {
              hold(500);
              process.kill(process.pid, 'SIGHUP');
            }());

            try {
              console.log('start');
              hold();
            } finally {
              console.log('finally sync');
              hold(10);
              console.log('finally async');
            }
          ");
          result.stdout.trim().split('\n')
            .. @assert.eq([
              'start',
              'finally sync',
              'finally async',
            ]);
          [result.code, result.signal] .. @assert.eq([null, 'SIGHUP']);
        }

        @test("secondary SIGINT cancels cleanup") {||
          var result = run("
            spawn(function() {
              hold(500);
              process.kill(process.pid, 'SIGINT');
              hold(500);
              process.kill(process.pid, 'SIGINT');
            }());

            try {
              console.log('start');
              hold();
            } finally {
              console.log('finally sync');
              hold(10);
              console.log('finally async');
              try {
                hold(2000);
              } retract {
                console.log('cleanup retracted');
              }
            }
          ");
          result.stdout.trim().split('\n')
            .. @assert.eq([
              'start',
              'finally sync',
              'finally async',
              'cleanup retracted',
            ]);
          [result.code, result.signal] .. @assert.eq([null, 'SIGINT']);
        }.skip("not yet implemented");

        @test("uncaughtException kills the process after cleanup") {||
          var result = run("
            spawn(function() {
              hold(200);
              throw new Error('uncaught');
            }());
            try {
              console.log('start');
              hold(300);
            } finally {
              console.log('finally sync');
              hold(10);
              console.log('finally async');
            }
            console.log('OK');
            process.exit(0);
          ", {stdio: ['ignore', 'pipe', 'pipe']});

          result.stdout.trim().split('\n')
            .. @assert.eq([
              'start',
              'finally sync',
              'finally async',
            ]);
          [result.code, result.signal] .. @assert.eq([null, 'SIGINT']);
        }
      }
    }
  }
}.skipIf(@isBrowser || @isWindows || process.versions.node .. @split('.') .. @map(i -> parseInt(i, 10)) .. @cmp([0,8]) < 0, "Not supported on windows or node <= 0.6");
