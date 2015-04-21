@ = require('sjs:test/std');

var normalizeOutput = exports.normalizeOutput = function(proc) {
  if (proc.stdout) proc.stdout = proc.stdout .. normalize;
  if (proc.stderr) proc.stderr = proc.stderr .. normalize;
  return proc;
}

var normalize = exports.normalize = function(str) {
  @assert.string(str, require('nodejs:util').inspect(str));
  return str.replace(/\r\n/g,'\n').replace(/ *\n/, '\n');
}

// common tests are used for multiple child-process-like modules.
// Currently this is the child-process module, as well as the ssh-client module
exports.commonTests = function(child_process, opts) {
  var checkSignal = function(child, expected) {
    if(opts.supportsSignal === false) return;
    child.signal .. @assert.eq(expected);
  }

  var testUtil = require('../../lib/testUtil')
  var testEq = testUtil.test;
  var { @TemporaryDir, @TemporaryFile } = require('sjs:nodejs/tempfile');

  @context('exec (simple string)') {||
    @test('exec("echo 1")', function() {
      var rv = child_process.exec('echo 1') .. normalizeOutput;
      rv.stdout .. @assert.eq("1\n");
      rv.stderr .. @assert.eq("");
    });

    @test('exec("echo 2>&2")', function() {
      var rv = child_process.exec('echo 2 >&2') .. normalizeOutput;
      rv.stdout .. @assert.eq("");
      rv.stderr .. @assert.eq("2\n");
    });
  }

  @context('run() with block') {||
    @test("output pipes are readable streams") {||
      child_process.run(process.execPath, ['-e', 'console.log(1)'], {stdio:['ignore', 'pipe', 'pipe']}) {|p|
        p.stdout .. @stream.isReadableStream .. @assert.ok();
        p.stderr .. @stream.isReadableStream .. @assert.ok();
        p.stderr .. @stream.readAll('ascii') .. @assert.eq('');
        p.stdout .. @stream.readAll('ascii') .. @assert.eq('1\n');
      }
    }

    @test("default `stdio` is ['pipe','inherit','inherit']") {||
      child_process.run(process.execPath, ['-e', '1']) {|p|
        p.stdin.write .. @assert.ok();
        p.stdout .. @assert.eq(null);
        p.stderr .. @assert.eq(null);
      }
    }

    @test("process is killed upon retraction") {||
      var proc;
      var ready = @Condition();
      waitfor {
        child_process.run('bash', ['-c', 'sleep 5']) {|p|
          proc = p;
          ready.set();
          hold();
        }
      } or {
        ready.wait();
      }
      hold(200);
      proc .. child_process.isRunning() .. @assert.eq(false);
      proc.exitCode .. @assert.eq(null);
      proc.signalCode .. @assert.eq('SIGTERM');
    }.skipIf(opts.supportsKill === false, "module does not support kill()");

    @test("retracts block upon process failure") {||
      var retracted = false;
      @assert.raises( -> child_process.run('bash', ['-c','sleep 1; exit 2']) {|p|
        try {
          hold(2000);
        } retract {
          retracted = true;
        }
      })
      retracted .. @assert.eq(true);
    }

    @test("does not retract block upon process failure when throwing=false") {||
      var retracted = false;
      child_process.run('bash', ['-c','sleep 1; exit 2'], {throwing: false}) {|p|
        try {
          hold(2000);
        } retract {
          retracted = true;
        }
      }
      retracted .. @assert.eq(false);
    }

    @test("run will not return until block is complete") {||
      // NOTE: pipes are only allowed as fd3+ when not passing a block, for backwards compatibility
      var waited = false;
      var child = child_process.run('bash', ['-c', 'exit 0']) {|p|
        hold(1000);
        waited = true;
      };
      waited .. @assert.eq(true);
    }

    @test("error from failed command will wait for `stdio` collection") {||
      try {
        child_process.run(process.execPath, [@sys.executable, '-e', 'hold(1000); console.log("exiting"); process.exit(1);'], {stdio:['ignore','string', 'inherit']})
        @assert.fail("child_process.run() didn't throw");
      } catch(e) {
        @info(e);
        e.stdout .. normalize .. @assert.eq("exiting\n");
        e.code .. @assert.eq(1);
        e .. checkSignal(null);
      }
    // no matter how long we wait, windows doesn't
    // seem to collect further output from a dead process.
    }.skipIf(@isWindows, "TODO: windows bug?");

    @test("`buffer` output type") {||
      var output = child_process.run(process.execPath, ['-e', 'console.log(1)'], {stdio:'buffer'}).stdout;
      output .. Buffer.isBuffer .. @assert.eq(true);
      output.toString('ascii') .. normalize .. @assert.eq('1\n');
    }

    @context("Writing to `stdin`") {||
      var stdin = @integers() .. @transform(function(i) { hold(100); return String(i) + "\n"; });

      @test("reports IO failure if command succeeds") {||
        @assert.raises({message: /^(Socket is closed|Failed writing to child process `stdin`|write after end)$/},
          -> child_process.run(process.execPath, ['-e', 'console.log(1)'], {stdio:[stdin, 'string', 'inherit']})
        );
      }

      @test("reports command failure if both command and IO fail") {||
        @assert.raises({message: /exited with nonzero exit status: 1/},
          -> child_process.run(process.execPath, ['-e', 'console.log(1); process.exit(1)'], {stdio:[stdin, 'string', 'inherit']})
        );
      }

      @test("aborts if an error occurs in stdio iteration") {||
        var input = @Stream(function(emit) {
          hold(500);
          throw new Error("Can't stream this");
        });
        
        // if the module doesn't support killing, just let the command end after 1s
        var delay = opts.supportsKill === false ? 1 : 10;
        delay = 10;

        @assert.raises({message: /Can't stream this/},
          -> child_process.run('bash', ['-c', "sleep #{delay}"], {stdio:[input, 'inherit', 'inherit']})
        );
      }
    }

  }

  //-------------------------------------------------------------
  @context('run (an array of args)') {||
    @test('arguments with spaces') {||
      // if spaces are interpreted by the shell, argv[1] will just be "1"
      child_process.run(process.execPath, ['-e', 'console.log(process.argv[1])', '1  2']).stdout .. normalize .. @assert.eq('1  2\n');
    }

    @test('run("bash", ["-c", "echo 2 >&2"]).stderr') {||
      child_process.run('bash', ['-c', 'echo 2 >&2']).stderr .. normalize .. @assert.eq('2\n');
    }

    @test('run returns stdout / stderr') {||
      var { filter } = require('sjs:sequence');
      var { propertyPairs, pairsToObject } = require('sjs:object');
      @assert.raises({filter: function(e) {
        return (
          e.code === 1
          && (opts.supportsSignal === false ? true : e.signal === null)
          && e.stdout === "out\n"
          && e.stderr === "err\n"
        );
      }}, -> child_process.run('bash', ['-c', 'echo out; echo err 1>&2; exit 1']));
    }

    @test("run returns child object when throwing == false") {||
      var child = child_process.run('bash', ['-c', 'echo out; echo err >&2; sleep 1;exit 2'], {throwing: false});

      child.code .. @assert.eq(2);
      child.stdout .. @strip() .. @assert.eq('out');
      child.stderr .. @strip() .. @assert.eq('err');
    }

    @test("run throws an error with stderr when it is a string") {||
      var err = @assert.raises( -> child_process.run('bash', ['-c', 'echo "some error" >&2; sleep 1;exit 2']))
      @info(err.message);
      var lines = (err.message .. normalizeOutput).split('\n');
      /child process `bash -c (')?echo \"some error\" >&2; sleep 1;exit 2(')?` exited with nonzero exit status: 2/.test(lines[0]) .. @assert.ok();
      lines[1] .. @assert.eq("some error");
    }

    @context("exits when stdin is inherited") {||
      var run = function(stdin) {
        child_process.run(process.execPath, ['-e', 'process.exit(0)'], {stdio:[stdin, 'ignore', 'ignore']});
      }
      
      @test("with `inherit`") {||
        run('inherit');
      }

      @test("explicitly") {||
        run(process.stdin);
      }

      @test("with @stream.contents") {||
        @assert.raises(
          {message: /write after end/},
          -> run(process.stdin .. @stream.contents)
        );
      }.skip("BUG - see https://github.com/joyent/node/issues/17204");
    }

    @test("stdio accepts nodejs file streams") {||
      @TemporaryFile {|f0|
        f0.path .. @fs.writeFile('input');
        var stdin = @fs.createReadStream(f0.path, {autoClose: false});
        @TemporaryFile {|f1|
          var stdout = f1.writeStream();
          @TemporaryFile {|f2|
            var stderr = f2.writeStream();

            child_process.run('bash', ['-c', 'echo "hello-out"; cat; echo "hello-err" >&2;'], {stdio:[stdin, stdout, stderr]});
            
            @fs.readFile(f1.path, 'utf-8') .. normalize .. @assert.eq("hello-out\ninput");
            @fs.readFile(f2.path, 'utf-8') .. normalize .. @assert.eq("hello-err\n");
          }
        }
      }
    }.skipIf(opts.supportsAllNodeStreams === false, "module does not support arbitrary nodejs streams");

    @test("stdio accepts raw file descriptors") {||
      @TemporaryFile {|f0|
        f0.path .. @fs.writeFile('input');
        @TemporaryFile {|f1|
          @TemporaryFile {|f2|
            child_process.run('bash', ['-c', 'echo "hello-out"; cat; echo "hello-err" >&2;'], {stdio:[f0.file, f1.file, f2.file]});
            
            @fs.readFile(f1.path, 'utf-8') .. normalize .. @assert.eq("hello-out\ninput");
            @fs.readFile(f2.path, 'utf-8') .. normalize .. @assert.eq("hello-err\n");
          }
        }
      }
    }.skipIf(opts.supportsRawFileDescriptors === false, "module does not support raw FDs")
  }

  @test("stream::contents collects all data from a stdio stream") {||
    // this is special-cased to eagerly collect for a child-process, due to
    // a bug in nodejs
    var input = @fs.readFile(module.id .. @url.toPath(), 'ascii');
    var run = function(block) {
      var cmd = 'python';
      var args = ['-c', '
from __future__ import print_function
import sys, time
for i, line in enumerate(sys.stdin):
  sys.stdout.write(line)
  sys.stdout.flush()
  if i % 100 == 0:
    time.sleep(0.5)
'
      ];
      child_process.run(cmd, args, {stdio:['pipe', 'pipe']}) {|proc|
        waitfor {
          block(proc);
        } and {
          var inputStream = @Stream(function(emit) {
            var i=0;
            var chunkSize = 600;
            while(i<input.length) {
              emit(input.slice(i, i+chunkSize));
              i+=chunkSize;
              hold(100);
            }
          });
          inputStream .. @stream.pump(proc.stdin);
        }
      }
    };

    run {|proc|
      var output = proc.stdout .. @stream.contents('ascii');
      hold(2000);
      var buf = [];
      output .. @each {|chunk|
        buf.push(chunk);
        hold(400);
      }
      output = buf .. @toArray();

      @info("got #{output.length} chunks");
      @assert.ok(output.length > 2, "this test requires at least three chunks, got #{output.length}");
      output .. @join .. @count .. @assert.eq(input.length);
      output .. @join .. @assert.eq(input);
    }
  }.timeout(60);

};
