var {context, test, assert} = require("sjs:test/suite");
var {Runner} = require("sjs:test/runner");

context("hooks") {||
  test("runs all before / after hooks") {||
    var runner = new Runner();
    var events = [];

    runner.collect {||
      context("before") {||
        test.beforeAll() {||
          events.push("before all");
        }
        test.beforeEach() {||
          events.push("before each 1");
        }
        test.beforeEach() {||
          events.push("after each 2");
        }
        test.afterEach() {||
          events.push("after each");
        }
        test.afterAll() {||
          events.push("after all 1");
        }
        test.afterAll() {||
          events.push("after all 2");
        }
        test("1", -> events.push("test 1"));
        test("1", -> events.push("test 2"));
      }
    }
    var results = runner.run();
    assert.ok(results.ok())
    assert.equal(results.count(), 2)
    assert.equal(events, [
      'before all',
        'before each 1',
        'before each 2',
          'test 1',
        'after each',

        'before each 1',
        'before each 2',
          'test 2',
        'after each',
      'after all 1',
      'after all 2',
    ]);
  }.skip("TODO");

  test("runs nested before / after hooks") {||
  }.skip("TODO");
}

context("filtering") {||
  test("on relative path") {||
  }.skip("TODO");

  test("on absolute path") {||
  }.skip("TODO");
}
