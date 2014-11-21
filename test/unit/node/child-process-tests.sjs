@ = require('sjs:test/std');
var { context, test, assert, isWindows } = require('sjs:test/suite');
var { integers, take, any } = require('sjs:sequence');

context {||
  var testUtil = require('../../lib/testUtil')
  var testEq = testUtil.test;
  var str = require('sjs:string');
  var logging = require('sjs:logging');
  var cutil = require('sjs:cutil');
  var seq = require('sjs:sequence');
  var array = require('sjs:array');
  var event = require('sjs:event');
  var child_process = require('sjs:nodejs/child-process');
  var fs = require('sjs:nodejs/fs');
  var stream = require('sjs:nodejs/stream');
  var NODE_VERSION = process.versions['node'].split('.').map(x -> parseInt(x));
  var initPid = isWindows ? 4 : 1;

  var normalize = function(str) {
    return str.replace(/\r\n/g,'\n').replace(/ *\n/, '\n');
  }

  var normalizeOutput = function(proc) {
    if (proc.stdout) proc.stdout = proc.stdout .. normalize;
    if (proc.stderr) proc.stderr = proc.stderr .. normalize;
    return proc;
  }

  context('exec (simple string)') {||
    testEq('exec("echo 1")', {stdout: "1\n", stderr: ''}, function() {
      return child_process.exec('echo 1') .. normalizeOutput;
    });

    testEq('exec("echo 2>&2")', {stdout: '', stderr: "2\n"}, function() {
      return child_process.exec('echo 2 >&2') .. normalizeOutput;
    });
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
  }.skipIf(NODE_VERSION .. array.cmp([0,8]) < 0, "process.kill() returns no result before 0.8");

  //-------------------------------------------------------------
  context('run (an array of args)') {||
    testEq('arguments with spaces', '1  2\n', function() {
      // if spaces are interpreted by the shell, argv[1] will just be "1"
      return child_process.run(process.execPath, ['-e', 'console.log(process.argv[1])', '1  2']).stdout .. normalize;
    });

    testEq('run("bash", ["-c", "echo 2 >&2"]).stderr', '2\n', function() {
      return child_process.run('bash', ['-c', 'echo 2 >&2']).stderr .. normalize;
    });

    testEq('run returns stdout / stderr', {"code":1,"signal":null,"stdout":"out\n","stderr":"err\n"}, function() {
      var { filter } = require('sjs:sequence');
      var { propertyPairs, pairsToObject } = require('sjs:object');
      try{
        return child_process.run('bash', ['-c', 'echo out; echo err 1>&2; exit 1']) .. normalizeOutput;
      } catch(e) {
        return propertyPairs(e) ..
          filter([key,val] => ['stdout', 'stderr', 'code', 'signal'].indexOf(key) != -1) ..
          pairsToObject .. normalizeOutput;
      }
    });

    @test("run returns child object when throwing == false") {||
      var child = child_process.run('bash', ['-c', 'echo out; echo err >&2; sleep 1;exit 2'], {throwing: false});

      child.code .. @assert.eq(2);
      child.stdout .. @strip() .. @assert.eq('out');
      child.stderr .. @strip() .. @assert.eq('err');
    }
  }

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

    testEq('wait() throws error with signal', {events: [], signal: 'SIGTERM'}, function() {
      var events = [];
      var child = child_process.launch('sleep', ['1'], {stdio:'inherit'});
      try {
        child_process.wait(child);
        events.push('wait returned');
      } or {
        hold(250);
        child_process.kill(child);
        events.push('child killed');
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
        var stdout = child.stdout .. @readAll('utf-8') .. @strip();
      } and {
        var stderr = child.stderr .. @readAll('utf-8') .. @strip();
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
    var stdio = logging.isEnabled(logging.DEBUG) ? 'inherit' : null;
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
      var pidEvt = cutil.Condition();

      var process_data = function(data) {
        data.toString().split("\n") .. seq.filter(x -> x.trim()) .. seq.each {|line|
          logging.info("got line: #{JSON.stringify(line)}");
          if (line .. str.startsWith('SPAWNED_')) {
            var pid = (line.split('_')[1].trim());
            logging.info("pid:", pid);
            pidEvt.set(+pid);
          } else {
            lines.push(line);
          }
        }
      }

      waitfor {
        while(true) {
          var data = child.stdout .. stream.read();
          if (data == null) break;
          process_data(data);
        }
        logging.info("stdout finished");
      } and {
        var pid = pidEvt.wait();
        
        // the grandchild has launched and printed its pid. Check that everything is as we expect
        pid .. isRunning() .. assert.ok("grandchild pid not running: #{pid}");
        pid .. assert.notEq(child.pid, "child pid == grandchild pid");

        // then kill the process group:
        logging.info("killing child group");
        child_process.kill(child, {detached:true, wait:true});
        logging.info("killed");
        hold(100);

        // check *both* processes are dead
        child.pid .. isRunning() .. assert.eq(false, "child pid still running! (#{child.pid})");
        pid       .. isRunning() .. assert.eq(false, "grandchild pid still running! (#{pid})");
        logging.info("all processes ended");
      }

      assert.eq(lines, [
        'child start',
        'child continue after spawn',
        'interrupted grandchild',
        'interrupted child'
      ]);
    }.skipIf(isWindows || NODE_VERSION .. array.cmp([0,8]) < 0, 'unix only, nodejs>0.8')
    // ^ should work on windows, it's probably just weirdness in winbash that makes the test fail
    
  }.timeout(4);
}.serverOnly();
