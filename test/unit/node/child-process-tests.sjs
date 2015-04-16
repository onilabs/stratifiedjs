@ = require('sjs:test/std');
var { context, test, assert, isWindows } = require('sjs:test/suite');
var { integers, take, any } = require('sjs:sequence');

context {||
  var testUtil = require('../../lib/testUtil')
  var testEq = testUtil.test;
  @array = require('sjs:array');
  var { @TemporaryDir, @TemporaryFile } = require('sjs:nodejs/tempfile');
  var child_process = require('sjs:nodejs/child-process');
  var NODE_VERSION = process.versions['node'].split('.').map(x -> parseInt(x));
  var initPid = isWindows ? 4 : 1;

  var { normalize, normalizeOutput, commonTests } = require('./child-process-common');
  
  // NOTE: if you're adding tests that should apply to the `ssh` client API
  // as well, put them in ../child-process-common
  commonTests(child_process, {
    supportsAllNodeStreams: false,
  });


  @test("failure in a multi-process pipeline") {||
    // tar file does not exist. While pumping the stream into
    // tar.stdin, this should raise.
    @assert.raises({message:/ENOENT.*does_not_exist.tgz/}, ->
      @TemporaryDir {|dest|
        var input = @fs.fileContents(@url.normalize('./does_not_exist.tgz', module.id) .. @url.toPath());
        @childProcess.run('gunzip', {cwd:dest, stdio: [input, 'pipe']}) {|gunzip|
          @childProcess.run('tar', ['-xv'], {stdio: [gunzip.stdout, 'pipe', 'string']}) {|tar|
            tar.stdout .. @stream.lines('utf-8') .. @each {|line|
              @logging.info("tar: #{line.trim()}");
            }
          } .. @childProcess.isRunning .. @assert.eq(false);
        } .. @childProcess.isRunning .. @assert.eq(false);
      }
    )
  }.skipIf(@isWindows); // XXX should replace / augment this with a version that runs on Windows.

  context('run (an array of args)') {||
    @test("run throws ENOENT when command cannot be found") {||
      var err = @assert.raises( -> child_process.run('nonexistent-command', []))
      err.code .. @assert.eq('ENOENT');
    }
  }

  context('isRunning') {||
    test('returns true for a running PID') {||
      child_process.isRunning({pid: process.pid}) .. assert.truthy();
    }

    test("returns true for a running PID that we don't own") {||
      child_process.isRunning({pid: initPid}) .. assert.truthy();
    }

    test("returns false for a non-running PID") {||
      // can't exhaustively check for non-running PIDs, just try a bunch
      // of pids greater than our own (since we probably started recently)
      var pids = integers(process.pid, undefined, 100) .. take(50);
      pids .. any(p -> child_process.isRunning({pid: p})) .. assert.ok();
    }
  }.skipIf(NODE_VERSION .. @array.cmp([0,8]) < 0, "process.kill() returns no result before 0.8");


  //-------------------------------------------------------------
  context('wait') {||
    testEq('wait()', ['time passed', 'wait returned'], function() {
      var events = [];
      var child = child_process.launch('sleep', ['1'], {stdio:'inherit'});
      try {
        child_process.wait(child);
        events.push('wait returned');
      } or {
        hold(250);
        events.push('time passed');
        hold();
      }
      return events;
    });

    test('wait() throws error on spawn error') {||
      //message differs between node < 0.10 and > 0.10
      assert.raises({message: /spawn EACCES|spawn ENOENT|child process exited with nonzero exit status: 127/},
        -> child_process.run(".")); // "." will be a directory
    }

    testEq('wait() throws error with exit code', {events: [], code: 123}, function() {
      var events = [];
      var child = child_process.launch('bash', ['-c', 'exit 123'], {stdio:'inherit'});
      try {
        child_process.wait(child);
        events.push('wait returned');
      } catch (e) {
        return {events: events, code: e.code};
      }
      return {events: events, error: 'no error'};
    });

    testEq('wait() throws error with signal', {events: ['child killed'], signal: 'SIGTERM'}, function() {
      var events = [];
      var child = child_process.launch('sleep', ['1'], {stdio:'inherit'});
      try {
        child_process.wait(child);
        events.push('wait returned');
      } or {
        hold(250);
        child_process.kill(child);
        events.push('child killed');
        hold(100);
      } catch (e) {
        return {events: events, signal: e.signal};
      }
      return {events: events, error: 'no error'};
    });

    @test('wait() returns child object on success') {||
      var child = child_process.launch('bash', ['-c', 'exit 0']);
      var rv = child .. child_process.wait();
      rv .. @assert.eq(child);
      rv.code .. @assert.eq(0);
    }

    @test('wait() returns child object with code property if throwing === false') {||
      var child = child_process.launch('bash', ['-c', 'echo out; echo err >&2; sleep 1;exit 2']);
      waitfor {
        var stdout = child.stdout .. @stream.readAll('utf-8') .. @strip();
      } and {
        var stderr = child.stderr .. @stream.readAll('utf-8') .. @strip();
      } and {
        child .. child_process.wait({throwing: false});
      }

      child.code .. @assert.eq(2);
      stdout .. @assert.eq('out');
      stderr .. @assert.eq('err');
    }
  }
  

  //-------------------------------------------------------------
  context('kill') {||
    var stdio;
    test.beforeAll {||
      stdio = @logging.isEnabled(@logging.DEBUG) ? 'inherit' : null;
    }
    var sleep_for_10 = "i=10; while [ $i -gt 0 ]; do sleep 1; i=`expr $i - 1`; done; echo TIMED_OUT";
    function trap_and_exit_after(seconds, message) {
      return "trap \"sleep #{seconds}; echo \\\"#{message || 'interrupted'}\\\"; exit\" SIGINT SIGTERM";
    };

    testEq('kill returning immediately', 'immediately', function() {
      var child = child_process.launch('bash', ['-c', trap_and_exit_after(1) + ';' + sleep_for_10]);
      try {
        child_process.kill(child, {wait:false});
        return 'immediately';
      } or {
        hold(500);
        return 'waited'
      }
    });

    testEq('kill waiting for child to exit', ['time passed', 'kill returned'], function() {
      //XXX this test succeeds inconsistently, and it's not a timing issue (raising the
      // timeout doesn't help). Is it an issue with node? or sjs?
      var child = child_process.launch('bash', ['-c', trap_and_exit_after(0.5) + ';' + sleep_for_10], {stdio:stdio});
      var events = [];
      try {
        hold(100); // give process time to even start
        child_process.kill(child);
        events.push('kill returned');
      } or {
        hold(250);
        events.push('time passed');
        hold();
      }
      return events;
    });

    test('kill detached process (group)') {||
      var isRunning = function(pid) {
        try {
          return process.kill(pid, 0);
        } catch(e) {
          if (e.code == 'ESRCH') return false;
          throw e;
        }
      };

      // launches a child (bash), which then launches a sub-process (also bash). The
      // grandchild process prints its PID to stdout. We then kill the child
      // and make sure that the grandchild is also dead.
      var child = child_process.launch('bash', ['-c', "
          echo child start;
          bash -c '#{trap_and_exit_after(0.1, 'interrupted grandchild')}; echo SPAWNED_$$; #{sleep_for_10};' &
          #{trap_and_exit_after(0.5, 'interrupted child')};
          echo child continue after spawn;
          #{sleep_for_10};
        "], {
        detached: true,
        stdio: [null, 'pipe', null],
      });

      child.pid .. isRunning() .. assert.ok("child pid not running! (#{child.pid})");

      var lines = [];
      var pidEvt = @Condition();

      var process_data = function(data) {
        data.toString().split("\n") .. @filter(x -> x.trim()) .. @each {|line|
          @logging.info("got line: #{JSON.stringify(line)}");
          if (line .. @startsWith('SPAWNED_')) {
            var pid = (line.split('_')[1].trim());
            @logging.info("pid:", pid);
            pidEvt.set(+pid);
          } else {
            lines.push(line);
          }
        }
      }

      waitfor {
        child.stdout .. @stream.contents .. @each(process_data);
        @logging.info("stdout finished");
      } and {
        var pid = pidEvt.wait();
        
        // the grandchild has launched and printed its pid. Check that everything is as we expect
        pid .. isRunning() .. assert.ok("grandchild pid not running: #{pid}");
        pid .. assert.notEq(child.pid, "child pid == grandchild pid");

        // then kill the process group:
        @logging.info("killing child group");
        child_process.kill(child, {detached:true, wait:true});
        @logging.info("killed");
        hold(100);

        // check *both* processes are dead
        child.pid .. isRunning() .. assert.eq(false, "child pid still running! (#{child.pid})");
        pid       .. isRunning() .. assert.eq(false, "grandchild pid still running! (#{pid})");
        @logging.info("all processes ended");
      }

      assert.eq(lines, [
        'child start',
        'child continue after spawn',
        'interrupted grandchild',
        'interrupted child'
      ]);
    }.skipIf(isWindows || NODE_VERSION .. @array.cmp([0,8]) < 0, 'unix only, nodejs>0.8')
    // ^ should work on windows, it's probably just weirdness in winbash that makes the test fail
    
  }.timeout(4);


}.serverOnly();
