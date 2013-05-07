// sanity checks on the test suite runner itself:

var { Runner } = require("sjs:test/runner");
var { context, assert, test } = require("sjs:test/suite");
var logging = require("sjs:logging");
var { each, toArray } = require('sjs:sequence');
var { waitforAll } = require('sjs:cutil');

// suite with passing & failing tests
var runner = new Runner({});
runner.context("root") {||
  context("group 1") {||
    test("OK 1", -> assert.ok(true));
    test("FAIL 1", -> assert.ok(false));
  }

  context("group 2") {||
    test("OK 2", -> assert.ok(true)).skip();
    test("FAIL 2", -> assert.ok(false));
    test("FAIL 3", -> assert.ok(false));
  }

  context("group 3") {||
    context("group 4") {||
      test("OK 3", -> assert.ok(true));
    }.skip();
    test("FAIL 4", -> assert.ok(false)).skip();
    test("FAIL 5", -> assert.ok(false)).skip();
  }
}

var suite_result = runner.run();
var debug = require("sjs:debug");
var check = function(actual, expected, desc) {
  if (expected != actual) {
    throw new Error("\n------------\n#{desc || "check failed"}: expected:\n#{expected}\n got:\n#{actual}\n---------------------");
  }
}

logging.debug(`got result: ${suite_result}`);
check(suite_result.ok(), false, "result.ok()");
check(suite_result.count(), 7, "result.count()");
check(suite_result.passed, 1, "result.passed");
check(suite_result.failed, 3, "result.failed");
check(suite_result.skipped, 3, "result.skipped");

var events = [];
var reporter = {};
var event_names = ['contextBegin', 'contextEnd', 'testBegin', 'testEnd', 'testPassed', 'testFailed', 'testSkipped', 'suiteEnd'];

reporter.suiteBegin = function(results) {
  check(results.total, 7, "results.total");
  events.push('suiteBegin');
}

event_names .. each {|key|
  reporter[key] = function(testResult) {
    if (testResult && testResult.description) {
      events.push("#{key}: #{testResult.description}");
    } else {
      events.push(key);
    }
  }
}

runner.run(reporter);

check(events.join("\n"), "
suiteBegin
contextBegin: root
contextBegin: group 1
testBegin: OK 1
testPassed: OK 1
testEnd: OK 1
testBegin: FAIL 1
testFailed: FAIL 1
testEnd: FAIL 1
contextEnd: group 1
contextBegin: group 2
testBegin: OK 2
testSkipped: OK 2
testEnd: OK 2
testBegin: FAIL 2
testFailed: FAIL 2
testEnd: FAIL 2
testBegin: FAIL 3
testFailed: FAIL 3
testEnd: FAIL 3
contextEnd: group 2
contextBegin: group 3
contextBegin: group 4
contextEnd: group 4
testBegin: FAIL 4
testSkipped: FAIL 4
testEnd: FAIL 4
testBegin: FAIL 5
testSkipped: FAIL 5
testEnd: FAIL 5
contextEnd: group 3
contextEnd: root
suiteEnd
".trim());
logging.verbose("test runner sanity check OK");

