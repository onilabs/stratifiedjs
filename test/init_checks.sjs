// sanity checks on the test suite runner itself:

var { Runner } = require("sjs:test/runner");
var { context, assert, test } = require("sjs:test/suite");
var logging = require("sjs:logging");
var { map, toArray } = require('sjs:sequence');
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
check(suite_result.succeeded, 1, "result.succeeded");
check(suite_result.failed, 3, "result.failed");
check(suite_result.skipped, 3, "result.skipped");

var events = [];
runner.run() {|results|
  check(results.total, 7, "results.total");
  var event_names = ['contextStart', 'contextEnd', 'testStart','testFinished', 'testSucceeded', 'testFailed', 'testSkipped'];
  var waiters = event_names .. map(function(key) {
    return function() {
      while(true) {
        var testResult = results[key].wait();
        if (testResult == undefined) {
          events.push(key);
        } else {
          events.push("#{key}: #{testResult.description}");
        }
      }
    }
  });

  waitfor {
    waitforAll(waiters .. toArray);
  } or {
    results.end.wait();
    events.push("end");
  }
}

check(events.join("\n"), "
contextStart: root
contextStart: group 1
testStart: OK 1
testSucceeded: OK 1
testFinished: OK 1
testStart: FAIL 1
testFailed: FAIL 1
testFinished: FAIL 1
contextEnd: group 1
contextStart: group 2
testStart: OK 2
testSkipped: OK 2
testFinished: OK 2
testStart: FAIL 2
testFailed: FAIL 2
testFinished: FAIL 2
testStart: FAIL 3
testFailed: FAIL 3
testFinished: FAIL 3
contextEnd: group 2
contextStart: group 3
contextStart: group 4
contextEnd: group 4
testStart: FAIL 4
testSkipped: FAIL 4
testFinished: FAIL 4
testStart: FAIL 5
testSkipped: FAIL 5
testFinished: FAIL 5
contextEnd: group 3
contextEnd: root
end
".trim());
logging.verbose("test runner sanity check OK");

