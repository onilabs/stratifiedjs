var testUtil = require('../lib/testUtil')
var test = testUtil.test;
var child_process = require('apollo:node-child-process');

if(!testUtil.isBrowser) {
  //-------------------------------------------------------------
  // exec (simple string)
  test('exec("echo 1")', {stdout: '1\n', stderr: ''}, function() {
    return child_process.exec('echo 1');
  });

  test('exec("echo 2 >&2")', {stdout: '', stderr: '2\n'}, function() {
    return child_process.exec('echo 2 >&2');
  });

  //-------------------------------------------------------------
  // run (an array of args)
  test('run("echo", ["1  2"]).stdout', '1  2\n', function() {
    // if spaces are interpreted by the shell,
    // the double-space will turn into a single.
    return child_process.run('echo', ['1  2']).stdout;
  });

  test('run("bash", ["-c", "echo 2 >&2"]).stderr', '2\n', function() {
    return child_process.run('bash', ['-c', 'echo 2 >&2']).stderr;
  });

  //-------------------------------------------------------------
  // wait
  test('wait()', ['time passed', 'wait returned'], function() {
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

  test('wait() throws error with exit code', {events: [], code: 1}, function() {
    var events = [];
    var child = child_process.launch('bash', ['-c', 'exit 1']);
    try {
      child_process.wait(child);
      events.push('wait returned');
    } catch (e) {
      return {events: events, code: e.code};
    }
    return {events: events, error: 'no error'};
  });

  test('wait() throws error with signal', {events: [], signal: 'SIGTERM'}, function() {
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
  

  //-------------------------------------------------------------
  // kill
  function bash_exit_after(seconds) {
    return "trap 'echo interrupted; sleep " + seconds + "; exit' SIGINT SIGTERM; while true; do sleep 1; done";
  };

  test('kill returning immediately', 'immediately', function() {
    child = child_process.launch('bash', ['-c', bash_exit_after(1)], {});
    try {
      child_process.kill(child, {wait:false});
      return 'immediately';
    } or {
      hold(500);
      return 'waited'
    }
  });

  test('kill waiting for child to exit', ['time passed', 'kill returned'], function() {
    //XXX this test succeeds inconsistently, and it's not a timing issue (raising the
    // timeout doesn't help). Is it an issue with node? or sjs?
    child = child_process.launch('bash', ['-c', bash_exit_after(0.5)]);
    var events = [];
    try {
      child_process.kill(child);
      events.push('kill returned');
    } or {
      hold(250);
      events.push('time passed');
      hold();
    }
    return events;
  });

}
