var suite = require("sjs:test/suite");
var {context, test, assert, skipTest} = suite;
var {merge} = require('sjs:object');
var runnerMod = require("sjs:test/runner");
var {Runner} = runnerMod;
var {each, map, toArray} = require("sjs:sequence");
var logging = require("sjs:logging");
var debug = require("sjs:debug");
var sys = require("builtin:apollo-sys");

function CollectWatcher() {
  this.results = [];
  this.testEnd = (result) -> this.results.push(result);
  this.conciseResults = => this.results .. map(r -> [r.description, r.error ? r.error.message : null]);
}

var defaultOpts = {
  base: module.id,
  exit: false,
  logCapture: false,
  logLevel: logging.VERBOSE,
}

var throwError = function() { throw new Error("thrown error"); }

// blanket check to make sure no test runs modify the log level:
test.beforeEach:: function(s) {
  s.initialLogLevel = logging.getLevel();
}
test.afterEach:: function(s) {
  assert.eq(logging.getLevel(), s.initialLogLevel, 'test has modified log level!');
}

context("hooks", function() {
  test.beforeEach:: function(s) {
    s.runner = new Runner(defaultOpts);
    s.events = [];
  }

  test("runs all before / after hooks", function(s) {
    s.runner.context("ctx", function() {
      test.beforeAll( -> s.events.push("before all"));
      test.beforeEach( -> s.events.push("before each 1"));
      test.beforeEach( -> s.events.push("before each 2"));
      test.afterEach( -> s.events.push("after each"));
      test.afterAll( -> s.events.push("after all 1"));
      test.afterAll( -> s.events.push("after all 2"));
      test("1", -> s.events.push("test 1"));
      test("1", -> s.events.push("test 2"));
    })
    var results = s.runner.run();
    assert.ok(results.ok())
    assert.equal(results.count(), 2)
    assert.equal(s.events, [
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
  })

  test("runs nested before / after hooks", function(s) {
    s.runner.context("parent", function() {
      test.beforeAll( -> s.events.push("parent before all"));
      test.beforeEach( -> s.events.push("parent before each 1"));
      test.beforeEach( -> s.events.push("parent before each 2"));
      test.afterEach( -> s.events.push("parent after each 1"));
      test.afterEach( -> s.events.push("parent after each 2"));
      test.afterAll( -> s.events.push("parent after all"));
      test("parent test", -> s.events.push("parent test"));

      context("child", function() {
        test.beforeAll( -> s.events.push("child before all"));
        test.beforeEach( -> s.events.push("child before each"));
        test.afterEach( -> s.events.push("child after each"));
        test.afterAll( -> s.events.push("child after all"));
        test("child test", -> s.events.push("child test"));
      })
    })
    var results = s.runner.run();
    assert.ok(results.ok())
    assert.equal(results.count(), 2)
    assert.equal(s.events, [
      'parent before all',
        'parent before each 1',
        'parent before each 2',
          'parent test',
        'parent after each 1',
        'parent after each 2',

        'child before all',
          'parent before each 1',
          'parent before each 2',
            'child before each',
              'child test',
            'child after each',
          'parent after each 1',
          'parent after each 2',
        'child after all',
        
      'parent after all',
    ]);
  })

  test("stops on first error in before hooks", function(s) {
    s.runner.context("parent", function() {
      test.beforeEach:: function() {
        s.events.push('parent before each');
        throwError();
      }

      context("child", function() {
        test.beforeEach:: function() {
          s.events.push('child before each');
        }
        test("child test", -> s.events.push("child test"));
      })
    })
    var results = s.runner.run();
    assert.equal(s.events, [
      'parent before each',
    ]);
    assert.notOk(results.ok())
    assert.equal(results.count(), 1)
  })

  test("fails if there is an error in afterEach hooks (after running all hooks)", function(s) {
    var watcher = new CollectWatcher();
    s.runner.context("grandparent", function() {
      test.afterEach:: function() {
        s.events.push('grandparent after each');
        throw new Error('grandparent afterEach error');
      }

      context("parent", function() {
        test.afterEach:: function(){
          s.events.push('parent after each');
          throw new Error('parent afterEach error');
        }

        context("child", function() {
          test.afterEach:: function(){
            s.events.push('child after each');
          }
          test("child test 1", -> s.events.push('child test 1'));
          test("child test 2", function() {
            s.events.push('child test 2');
            throw new Error("child test error");
          })
        })
      })
    })
    var results = s.runner.run(watcher);
    assert.eq(s.events, [
      'child test 1',
      'child after each',
      'parent after each',
      'grandparent after each',

      'child test 2',
      'child after each',
      'parent after each',
      'grandparent after each',
    ]);
    assert.eq(watcher.conciseResults(), [
      ['child test 1', 'parent afterEach error'],
      ['child test 2', 'child test error'],
    ]);
    assert.notOk(results.ok())
    assert.equal(results.count(), 2)
    assert.equal(results.passed, 0)
    assert.equal(results.failed, 2)
  })

  test("fails the suite if an afterAll hook fails", function() {
  })
})

context("filtering", function() {
  var runWithFilter = function (filters, args) {
    var loaded = [];
    var tests_run = [];
    var contexts_run = [];
    var reporter = {
      loading: (mod) -> loaded.push(mod.split("/")[1]),
      testEnd: (result) -> tests_run.push(result.test.fullDescription()),
      contextBegin: (ctx) -> contexts_run.push(ctx.fullDescription()),
    };
    var opts = defaultOpts .. merge({
      reporter: reporter,
      modules: [
        'fixtures/test_1.sjs',
        'fixtures/test_12.sjs',
        'fixtures/test_2.sjs',
      ],
      testSpecs: filters || [],
    });
    var results = Runner.run(opts, args || []);
    return {
      files: loaded,
      results: results,
      tests: tests_run,
      contexts: contexts_run,
    };
  }

  test("on exact relative path", function() {
    var run = runWithFilter([{file: "fixtures/test_1.sjs"}]);
    run.files .. assert.eq(["test_1.sjs"]);
    run.results.ok() .. assert.ok("result failed");
  })

  test("on parent directory", function() {
    var run = runWithFilter([{file: "fixtures"}]);
    run.files .. assert.eq(["test_1.sjs", "test_12.sjs", "test_2.sjs"]);
  })

  test("unions filters", function() {
    var run = runWithFilter([{file: "fixtures/test_1.sjs"}, {file: "fixtures/test_2.sjs"}]);
    run.files .. assert.eq(["test_1.sjs", "test_2.sjs"]);
  })

  test("supports paths relative to cwd()", function() {
    var sjsRoot = require('sjs:sys').executable .. require('nodejs:path').dirname;
    var cwd = process.cwd();
    process.chdir(sjsRoot);
    try {
      var run = runWithFilter([{file: "test/unit/test/fixtures/test_1.sjs"}]);
      run.files .. assert.eq(["test_1.sjs"]);
    } finally {
      process.chdir(cwd);
    }
  }).serverOnly("no cwd");

  test("requires exact match", function() {
    assert.raises(
      {message: 'Some filters didn\'t match anything: {"file":"test_1"}'},
      -> runWithFilter([{file: "test_1"}]));

    assert.raises(
      {message: 'Some filters didn\'t match anything: {"file":"fixtures/test"}'},
      -> runWithFilter([{file: "fixtures/test"}]));
  })

  test("fails suite if not all file filters were used", function() {
    assert.raises(
      {message: 'Some filters didn\'t match anything: {"file":"fixtures/test_34.sjs"}'},
      -> runWithFilter([{file: "fixtures/test_1.sjs"}, {file: "fixtures/test_34.sjs"}]));
  })

  test("on test name substring", function() {
    var run = runWithFilter([{test: "test o"}]);
    run.tests .. assert.eq([
      "fixtures/test_1.sjs:test_1 context_1:test one",
      "fixtures/test_1.sjs:test_1 context_2:test one",
      "fixtures/test_2.sjs:test_2 context_1:test one",
      "fixtures/test_2.sjs:test_2 context_2:test one",
    ]);
    run.results.ok() .. assert.ok();
  })

  test("on context + test name substring", function() {
    var run = runWithFilter([{test: "context_1:test one"}]);
    run.tests .. assert.eq([
      "fixtures/test_1.sjs:test_1 context_1:test one",
      "fixtures/test_2.sjs:test_2 context_1:test one",
    ]);
    run.results.ok() .. assert.ok();
  })

  test("on both module and test", function() {
    var run = runWithFilter([{file: "fixtures/test_1.sjs", test: "test one"},{file: "fixtures/test_2.sjs", test: "test two"},]);
    run.tests .. assert.eq([
      "fixtures/test_1.sjs:test_1 context_1:test one",
      "fixtures/test_1.sjs:test_1 context_2:test one",
      "fixtures/test_2.sjs:test_2 context_1:test two",
      "fixtures/test_2.sjs:test_2 context_2:test two",
    ]);
    run.results.ok() .. assert.ok();
  })

  test("fails suite if unused", function() {
    assert.raises(
      {message: 'Some filters didn\'t match anything: {"test":"test three"}'},
      -> runWithFilter([{test: "test three"}]));
  })

  test("running only skipped tests", function() {
    // i.e get a report of all skipped tests
    var run = runWithFilter([], ['--skipped']);
    run.tests .. assert.eq([
      "fixtures/test_12.sjs:skipped_1",
      "fixtures/test_12.sjs:skipped_2",
    ]);
    run.results.ok() .. assert.ok();
  })

  test("running only skipped tests with filter", function() {
    // i.e get a report of all skipped tests
    var run = runWithFilter([{file: "fixtures/test_1.sjs"}], ['--skipped']);
    run.tests .. assert.eq([]);
    run.results.ok() .. assert.ok();
  })
})

context("logging", function() {
  test("sets log level during tests (and reverts afterwards)", function() {
    var original_level = logging.getLevel();
    var new_level = original_level + 10;

    var runner = new Runner(defaultOpts .. merge({
      logLevel: new_level
    }));

    var test_log_level = null;
    runner.context("test", function() {
      test("1", function() {
        test_log_level = logging.getLevel();
      })
    })
    var results = runner.run();
    assert.ok(results.ok());

    assert.ok(logging.getLevel(), original_level);
    assert.ok(test_log_level, new_level);
  })
})

context("test state", function() {
  test("before / after shares state", function() {
    var runner = new Runner(defaultOpts);
    var context_state = null;
    var before_all_state = null;
    var after_all_state = null;
    var before_each_state = [];
    var after_each_state = [];
    var test_state = [];

    runner.context("ctx", function(state) {
      state.contextLevel = true;
      context_state = state;

      test.beforeAll:: function(state) {
        state.contextLevel = true;
        before_all_state = state;
      }
      test.afterAll:: function(state) {
        after_all_state = state;
      }

      test.beforeEach:: function(state){
        state.testLevel = true;
        before_each_state.push(state);
      }

      test.afterEach:: function(state) {
        after_each_state.push(state);
      }

      test("test 1", function(state) {
        state.test1 = true;
        test_state.push(state);
      })
      test("test 1", function(state) {
        state.test2 = true;
        test_state.push(state);
      })
    })
    var results = runner.run();
    results.ok() .. assert.ok(debug.inspect(results));
    
    // context level states
    assert.ok(context_state.contextLevel);
    assert.ok(before_all_state.contextLevel);
    assert.ok(before_all_state.contextLevel);
    assert.ok(before_all_state === before_all_state);
    assert.ok(context_state === before_all_state);

    assert.eq(before_each_state.length, 2);
    assert.eq(after_each_state.length, 2);
    assert.eq(test_state.length, 2);

    var first_test_state = test_state[0];
    var second_test_state = test_state[1];

    // first test should have test1 and not property
    assert.ok(first_test_state.hasOwnProperty('test1'));
    assert.notOk('test2' in first_test_state);

    // each test state should inherit from the context level state
    assert.notOk(first_test_state.hasOwnProperty('contextLevel'));
    assert.ok(first_test_state.contextLevel);
    assert.ok(first_test_state.test1);
    assert.ok(before_all_state.isPrototypeOf(first_test_state));
    assert.ok(before_all_state.isPrototypeOf(second_test_state));

    [before_each_state, after_each_state] .. each { |list|
      assert.ok(list[0] === first_test_state);
      assert.ok(list[1] === second_test_state);
    }
  })

  test("context level state inherits from parent context", function() {
    var runner = new Runner(defaultOpts);
    var parent_state = null;
    var ctx_state = null;

    runner.context("parent ctx", function() {
      test.beforeAll:: function(state) {
        parent_state = state;
      }
      context("ctx", function() {
        test.beforeAll:: function(state) {
          ctx_state = state;
        }
        test("test", -> null);
      })
    })

    var results = runner.run();
    results.ok() .. assert.ok(debug.inspect(results));
    
    // context level states
    assert.notOk(ctx_state == parent_state);
    assert.ok(parent_state.isPrototypeOf(ctx_state), "parent is not prototype of ctx");
  })
})

context("argument parsing", function() {
  var opts = {
    base: module.id,
    logLevel: null,
    logCapture: null,
    color: null,
    testSpecs: null,
    bail: null,
  };
  var parseSpecs = (args) -> runnerMod.getRunOpts(opts, args).testSpecs

  test('options', function() {
    runnerMod.getRunOpts(opts, ['--color=auto']).color .. assert.eq('auto');
    runnerMod.getRunOpts(opts, ['--loglevel=info']).logLevel .. assert.eq(logging.INFO);
    runnerMod.getRunOpts(opts, ['--loglevel=INFO']).logLevel .. assert.eq(logging.INFO);
    runnerMod.getRunOpts(opts, ['--logcapture']).logCapture .. assert.eq(true);
    runnerMod.getRunOpts(opts, ['--no-logcapture']).logCapture .. assert.eq(false);
    runnerMod.getRunOpts(opts, ['--bail']).bail .. assert.eq(true);
  })

  test('invalid options', function() {
    assert.raises({message: 'unknown color mode: whatever'}, -> runnerMod.getRunOpts(opts, ['--color=whatever']));
    assert.raises({message: 'unknown log level: LOUD'}, -> runnerMod.getRunOpts(opts, ['--loglevel=loud']));
    assert.raises({message: 'unknown option: "--foo"'}, -> runnerMod.getRunOpts(opts, ['--foo']));
    assert.raises(-> runnerMod.getRunOpts(opts, ['--help']));
  })

  test('test specs', function() {
    parseSpecs(['filename']) .. assert.eq([{file: 'filename'}]);
    parseSpecs(['filename:testname']) .. assert.eq([{file: 'filename', test:'testname'}]);
    parseSpecs([':testname']) .. assert.eq([{test:'testname'}]);
    parseSpecs([':testname:with : colons']) .. assert.eq([{test:'testname:with : colons'}]);
    parseSpecs(['file1', ':text']) .. assert.eq([{file: 'file1'}, {test:'text'}]);
    parseSpecs(['--', '--logcapture']) .. assert.eq([{file: '--logcapture'}]);
  })

  test('invalid test specs', function() {
    assert.raises({message: "empty testspec"}, -> parseSpecs(['']));
  })
})

context("global variable leaks", function() {

  test.afterEach:: function() {
    // clean up any globals that may have been added
    var g = sys.getGlobal();
    delete g.foo;
    delete g.bar;
    delete g.bar;
  }

  var tests;
  var fooTest = -> test('new global `foo`', function() { foo = 12; })
  var barTest = -> test('new global `bar`', function() { bar = 12; })
  var bazTest = -> test('new global `baz`', function() { baz = 12; })

  test.beforeEach:: function(s) {
    s.watcher = new CollectWatcher();
    s.opts = defaultOpts .. merge({
      base: module.id,
      allowedGlobals: ['bar'],
      reporter: s.watcher,
    });
    s.runner = new Runner(s.opts);
  }
    
  test('fails on unexpected global', function(s) {
    s.runner.context("root", function() { fooTest(); barTest(); bazTest();})
    s.runner.run();

    assert.eq(s.watcher.conciseResults(), [
      ['new global `foo`', "Test introduced additional global variable(s): foo"],
      ['new global `bar`', null],
      ['new global `baz`', "Test introduced additional global variable(s): baz"],
    ]);
  })

  test('allows any globals per-test', function(s) {
    s.runner.context("root", function() { fooTest().ignoreLeaks(); })
    s.runner.run();

    assert.eq(s.watcher.conciseResults(), [
      ['new global `foo`', null],
    ]);
  })

  test('allows any globals per-context', function(s) {
    s.runner.context("root", function() { fooTest(); }).ignoreLeaks();
    s.runner.run();

    assert.eq(s.watcher.conciseResults(), [
      ['new global `foo`', null],
    ]);
  })

  test('allows specific globals per-test', function(s) {
    s.runner.context("root", function() { fooTest().ignoreLeaks(["foo"]); bazTest().ignoreLeaks(["not_one"]); })
    s.runner.run();

    assert.eq(s.watcher.conciseResults(), [
      ['new global `foo`', null],
      ['new global `baz`', "Test introduced additional global variable(s): baz"],
    ]);
  })

  test('ignores unexpected globals if --ignore-leaks is given', function(s) {
    var opts = runnerMod.getRunOpts(s.opts .. merge({reporter: s.watcher}), ['--ignore-leaks'])
    var runner = new Runner(opts);
    runner.context("root", fooTest);
    runner.run(s.watcher.run).ok() .. assert.ok();
  })
}).skipIf(suite.isIE() && suite.ieVersion() < 9, "not supported on IE<9");

context("uncaught exceptions", function() {
  test("fail the current test if it is still running", function() {
    var watcher = new CollectWatcher();
    var runner = new Runner(defaultOpts);
    runner.context("root", function() {
      test("one", function() {
        sys.spawn(function() {
          hold(1);
          logging.info("throwing");
          throw new Error("strata error (This error is deliberately generated by the test suite!)");
        });
        hold(1000);
      })
    })
    var results = runner.run(watcher);
    logging.info("runner finished");
    results.ok() .. assert.notOk();
    watcher.results[0].ok .. assert.notOk("test passed!");
  })

  test("fail the next test, if there is one", function() {
    var watcher = new CollectWatcher();
    var runner = new Runner(defaultOpts);
    runner.context("root", function() {
      test("one", function() {
        sys.spawn(function() {
          hold(1);
          logging.info("throwing");
          throw new Error("strata error (This error is deliberately generated by the test suite!)");
        });
      });
      test("two", function() {
        logging.info("test two starting");
        hold(100);
        logging.info("test two finished");
      })
    })
    var results = runner.run(watcher);
    logging.info("runner finished");
    results.ok() .. assert.notOk();
    watcher.results[0].ok .. assert.ok("first test not ok!");
    watcher.results[1].ok .. assert.notOk("second test passed!");
  })

  test("fail the suite even if there is no test to fail", function() {
    var runner = new Runner(defaultOpts);
    runner.context("root", function() {
      test.afterAll:: function() {
        hold(100);
      }
      test("one", function() {
        sys.spawn(function() {
          hold(1);
          logging.info("throwing");
          throw new Error("strata error (This error is deliberately generated by the test suite!)");
        });
      })
    })
    var results = runner.run();
    results.ok() .. assert.notOk("results passed!");
    results.failed .. assert.eq(0, "test failed");
  })

  //UNTESTABLE: kills the process if there is no unfinished test result instance.
})

context("timeout", function() {
  test("fails the active test if timeout is exceeded", function() {
    var watcher = new CollectWatcher();
    var opts = runnerMod.getRunOpts(defaultOpts, ['--timeout=0.2'])
    var runner = new Runner(opts);
    runner.context("root", function() {
      test("short", function() {
        hold(100);
      })

      test("long", function() {
        hold(250);
      })

      test("timeout overridden", function() {
        hold(250);
      }).timeout(0.3);

      context("timeout overridden", function() {
        test("sub-test", function() {
          hold(250);
        })
      }).timeout(0.3);

      test("no timeout", function() {
        hold(250);
      }).timeout(null);
    })
    runner.run(watcher);
    watcher.conciseResults() .. assert.eq([
      ["short", null],
      ["long", "Test exceeded 0.2s timeout"],
      ["timeout overridden", null],
      ["sub-test", null],
      ["no timeout", null],
    ]);
  })

  test("does not skip or abort hooks on timeout", function() {
    var watcher = new CollectWatcher();
    var opts = runnerMod.getRunOpts(defaultOpts, ['--timeout=0.2'])
    var hooksCompleted = 0;
    var bodiesCompleted = 0;
    var runner = new Runner(opts);
    runner.context("root", function() {
      test.afterEach:: function() {
        hold(300);
        hooksCompleted += 1;
      }
      test("quick", function() {
        bodiesCompleted += 1;
      })
      test("slow", function() {
        hold(250);
        bodiesCompleted += 1;
      })
    })
    runner.run(watcher);
    watcher.conciseResults() .. assert.eq([
      ["quick",null],
      ["slow", "Test exceeded 0.2s timeout"],
    ]);
    assert.eq(hooksCompleted, 2);
    assert.eq(bodiesCompleted, 1);
  })

  test("before hooks are subject to `timeout`", function() {
    var watcher = new CollectWatcher();
    var opts = runnerMod.getRunOpts(defaultOpts, ['--timeout=0.2'])
    var runner = new Runner(opts);

    runner.context("root", function() {
      context(function() {
        test.beforeEach(-> hold(1000));
        test("test beforeEach", -> null);
      })

      context(function() {
        test.afterEach(-> hold(1000));
        test("test afterEach", -> null);
      })

      context(function() {
        test.afterAll(-> hold(1000));
        test("test afterAll", -> null);
      })

    })

    runner.run(watcher);
    watcher.conciseResults() .. assert.eq([
      ['test beforeEach', 'beforeEach hooks exceeded 0.2s timeout'],
      ['test afterEach', null],
      ['test afterAll', null],
    ]);


    var runner = new Runner(opts);
    runner.context("root", function() {
      test.beforeAll(-> hold(1000));
      test("test beforeAll", -> null);
    })
    var results = runner.run(watcher);
    logging.info("RESULTS:", results);
    results.total .. assert.eq(1);
    results.passed + results.failed + results.skipped .. assert.eq(0);
    results.ok() .. assert.eq(false);
  })
})

context("bail", function() {
  test("stops after the first failure", function() {
    var watcher = new CollectWatcher();
    var opts = runnerMod.getRunOpts(defaultOpts, ['--bail'])
    var runner = new Runner(opts);
    runner.context("root", function() {
      test("ok", -> null);
      test("fail1", -> assert.fail());
      test("fail2", -> assert.fail());
    })
    runner.run(watcher);
    watcher.conciseResults() .. assert.eq([
      ["ok", null],
      ["fail1", "Failed"],
    ]);
  })

  test("stops after the first async failure", function() {
    var watcher = new CollectWatcher();
    var opts = runnerMod.getRunOpts(defaultOpts, ['--bail'])
    var runner = new Runner(opts);
    runner.context("root", function() {
      test("ok", -> null);
      test("fail1", function() {
        sys.spawn(function() {
          hold(0);
          throw new Error("strata error (This error is deliberately generated by the test suite!)");
        });
        hold(500);
      });
      test("fail2", -> assert.fail());
    })
    runner.run(watcher);
    watcher.conciseResults() .. assert.eq([
      ["ok", null],
      ["fail1", "strata error (This error is deliberately generated by the test suite!)"],
    ]);
  })
})

test("dynamic skipping", function() {
  var watcher = new CollectWatcher();
  var opts = runnerMod.getRunOpts(defaultOpts, [])
  var runner = new Runner(opts);
  runner.context("root", function() {
    test("ok", -> null);
    test("skip", function() {
      skipTest("dynamic skip");
      assert.fail();
    });
  })
  runner.run(watcher);
  watcher.conciseResults() .. assert.eq([
    ["ok", null],
    ["skip", null],
  ]);
})
