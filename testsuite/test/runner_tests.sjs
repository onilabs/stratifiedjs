var {context, test, assert} = require("sjs:test/suite");
var {Runner} = require("sjs:test/runner");

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
  var loadWithFilter = function (filters) {
    var loaded = [];
    var reporter = {loading: (mod) -> loaded.push(mod.split("/")[1]) };
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
        testSpecs: filters,
      }
    }
    var results = Runner.run(opts, []);
    return {
      files: loaded,
      results: results
    };
  }

  test("on exact relative path") {||
    var loaded = loadWithFilter([{file: "fixtures/test_1.sjs"}]);
    loaded.files .. assert.eq(["test_1.sjs"]);
    loaded.results.ok() .. assert.ok("result failed");
  }

  test("on parent directory") {||
    var loaded = loadWithFilter([{file: "fixtures"}]);
    loaded.files .. assert.eq(["test_1.sjs", "test_12.sjs", "test_2.sjs"]);
  }

  test("unions path filters") {||
    var loaded = loadWithFilter([{file: "fixtures/test_1.sjs"}, {file: "fixtures/test_2.sjs"}]);
    loaded.files .. assert.eq(["test_1.sjs", "test_2.sjs"]);
  }

  test("supports paths from cwd()") {||
    // assumes cwd is apollo root
    var loaded = loadWithFilter([{file: "testsuite/test/fixtures/test_1.sjs"}]);
    loaded.files .. assert.eq(["test_1.sjs"]);
  }.serverOnly("pointless in a browser");

  test("requires exact match") {||
    var loaded = loadWithFilter([{file: "test_1"}]);
    loaded.files .. assert.eq([]);

    var loaded = loadWithFilter([{file: "fixtures/test"}]);
    loaded.files .. assert.eq([]);
  }

  test("fails suite if not all file filters were used") {||
    var loaded = loadWithFilter([{file: "fixtures/test_1.sjs"}, {file: "fixtures/test_34.sjs"}]);
    loaded.files .. assert.eq(["test_1.sjs"]);
    loaded.results.ok() .. assert.not_ok();
  }
}
