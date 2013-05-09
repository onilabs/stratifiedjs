var { context, test, assert } = require('sjs:test/suite');

context {||
  var testUtil = require('../../lib/testUtil')
  var testEq = testUtil.test;
  var str = require('sjs:string');
  var logging = require('sjs:logging');
  var cutil = require('sjs:cutil');
  var seq = require('sjs:sequence');
  var events = require('sjs:nodejs/events');
  var child_process = require('sjs:nodejs/child-process');
  var fs = require('sjs:nodejs/fs');
  var NODE_VERSION = process.versions['node'].split('.').map(x -> parseInt(x));

  context('exec (simple string)') {||
    testEq('exec("echo 1")', {stdout: '1\n', stderr: ''}, function() {
      return child_process.exec('echo 1');
    });

    testEq('exec("echo 2 >&2")', {stdout: '', stderr: '2\n'}, function() {
      return child_process.exec('echo 2 >&2');
    });
  }

  //-------------------------------------------------------------
  context('run (an array of args)') {||
    testEq('run("echo", ["1  2"]).stdout', '1  2\n', function() {
      // if spaces are interpreted by the shell,
      // the double-space will turn into a single.
      return child_process.run('echo', ['1  2']).stdout;
    });

    testEq('run("bash", ["-c", "echo 2 >&2"]).stderr', '2\n', function() {
      return child_process.run('bash', ['-c', 'echo 2 >&2']).stderr;
    });

    testEq('run returns stdout / stderr', {"code":1,"signal":null,"stdout":"out\n","stderr":"err\n"}, function() {
      var { filter } = require('sjs:sequence');
      var { propertyPairs, pairsToObject } = require('sjs:object');
      try{
        return child_process.run('bash', ['-c', 'echo out; echo err 1>&2; exit 1']);
      } catch(e) {
        return propertyPairs(e) ..
          filter([key,val] => ['stdout', 'stderr', 'code', 'signal'].indexOf(key) != -1) ..
          pairsToObject;
      }
    });
  }

  //-------------------------------------------------------------
  context('wait') {||
    testEq('wait()', ['time passed', 'wait returned'], function() {
      var events = [];
      var child = child_process.launch('sleep', ['0.5']);
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
      assert.raises({message: /spawn EACCES|child process exited with nonzero exit status: 127/},
        -> child_process.run(".")); // "." will be a directory
    }

    testEq('wait() throws error with exit code', {events: [], code: 123}, function() {
      var events = [];
      var child = child_process.launch('bash', ['-c', 'exit 123']);
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
      var child = child_process.launch('sleep', ['0.5']);
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
  }
  

  //-------------------------------------------------------------
  context('kill') {||
    var stdio = logging.isEnabled(logging.DEBUG) ? 'inherit' : null;
    var sleep_for_10 = "i=10; while [ $i -gt 0 ]; do sleep 0.5; i=`expr $i - 1`; done; echo TIMED_OUT";
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
        return process.kill(pid, 0);
      };

      // launches a child (bash), which then launches a sub-process (also bash). The
      // gradchild process prints its PID to stdout. We then kill the child
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
      using (var q = events.eventQueue(child.stdout, 'data')) {
        var pid;
        var lines = [];

        var process_data = function() {
          q.get().toString().split("\n") .. seq.filter(x -> x.trim()) .. seq.each {|line|
            logging.info("got line: #{JSON.stringify(line)}");
            if (line .. str.startsWith('SPAWNED_')) {
              pid = (line.split('_')[1].trim());
              logging.info("pid:", pid);
              
              // the grandchild has launched and printed its pid. Check that everything is as we expect
              pid .. isRunning() .. assert.ok("grandchild pid not running! (#{pid})");
              pid .. assert.notEq(child.pid, "child pid == grandchild pid");

              // then kill the process group:
              logging.info("killing child group");
              child_process.kill(child, {detached:true, wait:true});
              logging.info("killed");
              hold(100);

              // check *both* processes are dead
              child.pid .. isRunning() .. assert.ok("child pid still running! (#{child.pid})");
              pid       .. isRunning() .. assert.ok("grandchild pid still running! (#{pid})");

            } else {
              lines.push(line);
            }
          }
        }

        while(true) {
          waitfor {
            process_data();
          } or {
            var result = child_process.wait(child);
            logging.info("child died");
            break;
          }
        }

        // collect any remaining data events on child stdout
        hold(100);
        while(q.count() > 0) process_data();

        assert.eq(lines, [
          'child start',
          'child continue after spawn',
          'interrupted grandchild',
          'interrupted child'
        ]);
      }
    }.skipIf(NODE_VERSION[0] == 0 && NODE_VERSION[1] < 8, 'detached support introduced in node 0.8')
  }.timeout(4);
}.serverOnly();
