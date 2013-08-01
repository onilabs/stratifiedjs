// We can't easily test the actual logging (output),
// but we can at least test the logic & formatting.

var testUtil = require('../lib/testUtil');
var testEq = require('../lib/testUtil').test;
var logging = require('sjs:logging');
var {test, context, assert} = require('sjs:test/suite');
var {each} = require('sjs:sequence');
var {remove} = require('sjs:array');

test('default format') {||
  logging.formatMessage(logging.DEBUG, ['msg']) .. assert.eq(['DEBUG:', 'msg'])
};

testEq("formatting quasis", ["INFO:", "Hello " + require("sjs:debug").inspect({'subject':'world'})], function() {
  var obj = {subject: "world"};
  return logging.formatMessage(logging.INFO, [`Hello ${obj}`]);
});
  

test('print all log levels and revert') {||
  var messages = [];
  var initial = {
    level: logging.getLevel(),
    console: logging.getConsole(),
    fmt: logging.getFormatter(),
  };
  
  var console = {
    log: -> messages.push(Array.prototype.slice.call(arguments)),
  }
  var fmt = (rec) -> ['(test)', rec.level + ':'].concat(rec.args);

  using(logging.logContext({
    level: logging.DEBUG,
    console: console,
    formatter: fmt
  })) {
    assert.eq(logging.getLevel(), logging.DEBUG);
    assert.eq(logging.getConsole(), console);
    assert.eq(logging.getFormatter(), fmt);
    logging.debug('debug');
    logging.verbose('verbose');
    logging.info('info');
    logging.warn('warn');
    logging.error('message and', `quasi with ${'string'} and ${ {object:true} }`);
    logging.error('error with object:', {error: "some error!"});
    logging.error({error: "some error!"});
  }

  assert.eq(logging.getLevel(), initial.level);
  assert.eq(logging.getConsole(), initial.console);
  assert.eq(logging.getFormatter(), initial.fmt);
  messages .. assert.eq([
    ['(test)', 'DEBUG:', 'debug'],
    ['(test)', 'VERBOSE:', 'verbose'],
    ['(test)', 'INFO:', 'info'],
    ['(test)', 'WARN:', 'warn'],
    ['(test)', 'ERROR:', 'message and', 'quasi with string and { object: true }'],
    ['(test)', 'ERROR:', 'error with object:', { error: 'some error!' }],
    ['(test)', 'ERROR:', { error: 'some error!' }],
  ]);
};

testEq('enabled levels at INFO', {DEBUG: false, VERBOSE:false, INFO:true, WARN:true, ERROR:true}, function() {
  var levels = ['DEBUG', 'VERBOSE', 'INFO', 'WARN', 'ERROR'];
  var enabled = {};
  for(var i=0; i<levels.length; i++) {
    var level = levels[i];
    enabled[level] = logging.isEnabled(logging[level]);
  }
  return enabled;
});

//--------------------------------------------------------------------------------
context {||
  test.beforeEach {|s|
    s.consoles = [];
  }
  test.afterEach {|s|
    s.consoles .. each { |c|
      c.shutdown();
    }
  }
  test('logging to xbrowser.console objects') {|state|
    var shutdown = function(c) {
      state.consoles .. remove(c) .. assert.ok();
      c.shutdown();
    }

    var debug = require('sjs:xbrowser/console');
    function mkConsole(receivelog) {
      var c = debug.console({receivelog: receivelog});
      // make a console that records log messages
      c.loggedMessages = [];
      c.log = function() {
        this.loggedMessages.push(Array.prototype.slice.call(arguments));
      };
      state.consoles.push(c);
      return c;
    };

    var noLogging = mkConsole(false);
    var logging1 = mkConsole(true);
    var logging2 = mkConsole(true);

    logging.info("message 1");

    logging1..shutdown();

    logging.info("message 2");

    logging2..shutdown();

    logging.info("message 3 - should appear in browser console");

    noLogging..shutdown();

    logging1.loggedMessages .. assert.eq([['INFO:', 'message 1']]);
    logging2.loggedMessages .. assert.eq([['INFO:', 'message 1'], ['INFO:', 'message 2']]);
    noLogging.loggedMessages .. assert.eq([]);
  }.browserOnly();
}


context("nodejs") {||
  test("all log levels go to stderr") {||
    try {
    var result = require('sjs:nodejs/child-process').run(process.execPath, [
      require('sjs:sys').executable,
        '-e',
        "var l = require('sjs:logging');
        l.setLevel(l.DEBUG);
        l.debug('debug');
        l.verbose('verbose');
        l.info('info');
        l.warn('warn');
        l.error('error');
        console.log('log');
        "]);
    } catch (e) {
      logging.info(e.stderr);
      throw e;
    }

    result.stdout .. assert.eq("log\n");
    result.stderr.split('\n') .. assert.eq([
      'DEBUG: debug',
      'VERBOSE: verbose',
      'INFO: info',
      'WARN: warn',
      'ERROR: error',
      '',
    ]);
  }
}.serverOnly();
