var {context, test, assert} = require("sjs:test/suite");
var {Runner} = require("sjs:test/runner");
var logging = require("sjs:logging");

context("hooks") {||
  test("runs all before / after hooks") {||
    var runner = new Runner();
    var events = [];

    runner.collect {||
      context("ctx") {||
        test.beforeAll( -> events.push("before all"));
        test.beforeEach( -> events.push("before each 1"));
        test.beforeEach( -> events.push("before each 2"));
        test.afterEach( -> events.push("after each"));
        test.afterAll( -> events.push("after all 1"));
        test.afterAll( -> events.push("after all 2"));
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
  }

  test("runs nested before / after hooks") {||
    var runner = new Runner();
    var events = [];

    runner.collect {||
      context("parent") {||
        test.beforeAll( -> events.push("parent before all"));
        test.beforeEach( -> events.push("parent before each"));
        test.afterEach( -> events.push("parent after each"));
        test.afterAll( -> events.push("parent after all"));
        test("parent test", -> events.push("parent test"));

        context("child") {||
          test.beforeAll( -> events.push("child before all"));
          test.beforeEach( -> events.push("child before each"));
          test.afterEach( -> events.push("child after each"));
          test.afterAll( -> events.push("child after all"));
          test("child test", -> events.push("child test"));
        }
      }
    }
    var results = runner.run();
    assert.ok(results.ok())
    assert.equal(results.count(), 2)
    assert.equal(events, [
      'parent before all',
        'parent before each',
          'parent test',
        'parent after each',

        'child before all',
          'child before each',
            'child test',
          'child after each',
        'child after all',
        
      'parent after all',
    ]);
  }
}

context("filtering") {||
  var runWithFilter = function (filters) {
    var loaded = [];
    var tests_run = [];
    var contexts_run = [];
    var reporter = {
      loading: (mod) -> loaded.push(mod.split("/")[1]),
      run: function(results) {
        waitfor {
          while(true) {
            var testResult = results.testFinished.wait();
            tests_run.push(testResult.test.fullDescription());
          }
        } or {
          while(true) {
            var ctx = results.contextStart.wait();
            contexts_run.push(ctx.fullDescription());
          }
        } or {
          results.end.wait();
        }
      }
    };
    var opts = {
      reporter: reporter,
      base: module.id,
      modules: [
        'fixtures/test_1.sjs',
        'fixtures/test_12.sjs',
        'fixtures/test_2.sjs',
      ],
      default_opts: {
        logCapture: false,
        logLevel: logging.VERBOSE,
        testSpecs: filters,
      }
    }
    var results = Runner.run(opts, []);
    return {
      files: loaded,
      results: results,
      tests: tests_run,
      contexts: contexts_run,
    };
  }

  test("on exact relative path") {||
    var run = runWithFilter([{file: "fixtures/test_1.sjs"}]);
    run.files .. assert.eq(["test_1.sjs"]);
    run.results.ok() .. assert.ok("result failed");
  }

  test("on parent directory") {||
    var run = runWithFilter([{file: "fixtures"}]);
    run.files .. assert.eq(["test_1.sjs", "test_12.sjs", "test_2.sjs"]);
  }

  test("unions filters") {||
    var run = runWithFilter([{file: "fixtures/test_1.sjs"}, {file: "fixtures/test_2.sjs"}]);
    run.files .. assert.eq(["test_1.sjs", "test_2.sjs"]);
  }

  test("supports paths relative to cwd()") {||
    // assumes cwd is apollo root
    var run = runWithFilter([{file: "testsuite/test/fixtures/test_1.sjs"}]);
    run.files .. assert.eq(["test_1.sjs"]);
  }.serverOnly("meaningless in a browser");

  test("requires exact match") {||
    var run = runWithFilter([{file: "test_1"}]);
    run.files .. assert.eq([]);

    var run = runWithFilter([{file: "fixtures/test"}]);
    run.files .. assert.eq([]);
  }

  test("fails suite if not all file filters were used") {||
    var run = runWithFilter([{file: "fixtures/test_1.sjs"}, {file: "fixtures/test_34.sjs"}]);
    run.files .. assert.eq(["test_1.sjs"]);
    run.results.ok() .. assert.notOk();
  }

  test("on test name substring") {||
    var run = runWithFilter([{test: "test o"}]);
    run.tests .. assert.eq([
      "fixtures/test_1.sjs:test_1 context_1:test one",
      "fixtures/test_1.sjs:test_1 context_2:test one",
      "fixtures/test_2.sjs:test_2 context_1:test one",
      "fixtures/test_2.sjs:test_2 context_2:test one",
    ]);
    run.results.ok() .. assert.ok();
  }

  test("on context + test name substring") {||
    var run = runWithFilter([{test: "context_1:test one"}]);
    run.tests .. assert.eq([
      "fixtures/test_1.sjs:test_1 context_1:test one",
      "fixtures/test_2.sjs:test_2 context_1:test one",
    ]);
    run.results.ok() .. assert.ok();
  }

  test("on both module and test") {||
    var run = runWithFilter([{file: "fixtures/test_1.sjs", test: "test one"},{file: "fixtures/test_2.sjs", test: "test two"},]);
    run.tests .. assert.eq([
      "fixtures/test_1.sjs:test_1 context_1:test one",
      "fixtures/test_1.sjs:test_1 context_2:test one",
      "fixtures/test_2.sjs:test_2 context_1:test two",
      "fixtures/test_2.sjs:test_2 context_2:test two",
    ]);
    run.results.ok() .. assert.ok();
  }

  test("fails suite if unused") {||
    var run = runWithFilter([{test: "test three"}]);
    run.results.ok() .. assert.notOk();
  }
}

context("logging") {||
  test("sets log level during tests (and reverts afterwards)") {||
    var original_level = logging.getLevel();
    var new_level = original_level + 10;

    var runner = new Runner({
      default_opts: { logLevel: new_level }
    });

    var test_log_level = null;
    runner.collect() {||
      context("test") {||
        test("1") {||
          test_log_level = logging.getLevel();
        }
      }
    }
    var results = runner.run();
    assert.ok(results.ok());

    assert.ok(logging.getLevel(), original_level);
    assert.ok(test_log_level, new_level);
  }
}
