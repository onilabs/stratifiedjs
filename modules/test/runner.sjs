/*
 * StratifiedJS 'test/runner' module
 * Functions for collecting and running test suites
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.20.0-development'
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2013 Oni Labs, http://onilabs.com
 *
 * This file is licensed under the terms of the MIT License:
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */

/**
   @module  test/runner
   @summary Test suite runner
   @home    sjs:test/runner
   @desc
    The only function you should generally need to use from this module is [::run]. Its
    purpose is to be the entry point for a "test script" that will run your project's
    automated test suite. This will select a reporter appropiate for the current
    runtime, parse command line options, and run all of your tests.

    Since you will generally want to run your test suite in both the console and the browser,
    you will most likely want to make your test script a valid HTML file. For example:

        <!DOCTYPE html>
        <html>
          <head>
            <title>My test suite</title>
            <!--[if lt IE 8]>
              <script src="//cdnjs.cloudflare.com/ajax/libs/json2/20121008/json2.js"></script>
            <![endif]-->
            <script src="../stratified.js"></script>
            <script type="text/sjs">
              require("sjs:test/runner").run({
                moduleList: "./index.txt",
                base: module.id,
              });
            </script>
          </head>
        </html>

    To run tests in your browser, just load this file in a browser. Note that due to security
    settings in most browsers, you will need to serve it via a server (any server that
    can serve files should do - apache, WEBrick, SimpleHTTPServer, etc).

    In addition, the nodejs runner has rudimentary support for .html files. If you pass a .html
    file to the `sjs` command-line tool, it'll strip out anything inside a
    `<script type="text/sjs">` block and run that as if it were a plain `.sjs` file. So you
    can run your tests in nodejs with this same file, using e.g:
    
        sjs ./test/run.html

    ## Command-line arguments

    In both nodejs and the browser, you can control the runner's operation by passing
    command-line arguments. These are taken from `sys.argv()` on nodejs, and by parsing
    `document.location` as a POSIX-shell format argument list on the browser.
    The format should be the same in both cases, e.g:

        # command line
        sjs test/run.html --no-logcapture 'foo-tests:My first test'

        # browser address
        http://localhost:7070/test/run.html#--no-logcapture 'foo-tests:My first test'

    Technically, the above browser address should be property url-encoded, like so:

        http://localhost:7070/test/run.html#--no-logcapture%20%27foo-tests%3AMy%20first%20test%27

    But for convenient interactive use, most browsers will accept unescaped characters
    after the hash.

    ## Available command-line options

    Some of these options can be given explicit defaults by passing options into [::run].
    In all cases, a present command-line option overrides any default supplied to [::run].

    You can also just pass `--help` to your runner to print this help text:

        Usage: [options] [testspec [...]]

        Testspec formats:
        - path/to/test.sjs
        - path/to/test.sjs:text
        - :text

        (a test will match if `text` appears anywhere in its context + test description)

        Options:

            --color=ARG        Terminal colors (on|off|auto)
            --logcapture       Enable log capture during running tests
            --no-logcapture    Disable log capture during running tests
            --loglevel=ARG     Set the log level (DEBUG|ERROR|INFO|VERBOSE|WARN)
            --skipped          Just report skipped tests (don't run anything)
            -l, --list         Print out all full test names and then exit
            --timeout=NUM      Set the default test timeout (in seconds, 0 to disable)
            --ignore-leaks     Skip checking for leaked global variables
            -f, --show-failed  Print only failed (or skipped) tests
            -a, --show-all     Print all tests
            -b, --bail         Exit immediately after the first failure
            --debug            Set logLevel=DEBUG before test runner begins
            -h, --help         Print this help
*/

// import deps in parallel, as roundtrips affect browser startup time significantly.
waitfor {
  var suite = require("./suite.sjs");
} and {
  var reporterModule = require('./reporter');
  var {UsageError} = reporterModule;
} and {
  var { Condition } = require("../cutil.sjs");
} and {
  var array = require('../array');
  var { isArrayLike } = array;
} and {
  var seq = require('../sequence');
  var { each, reduce, toArray, any, filter, map, join, sort, concat, hasElem } = seq;
} and {
  var { rstrip, startsWith, strip } = require('../string');
} and {
  var object = require('../object');
} and {
  var sys = require('builtin:apollo-sys');
} and {
  var urlMod = require("../url.sjs");
} and {
  var logging = require('../logging');
}

var NullRporter = {};
  
/**
  @class Runner
  @summary Test suite runner / collector
  @desc
    This class is for advanced usage only - most
    users of this module should just use the [::run] function.

  @function Runner
  @param {optional Object} [settings]
  @summary Create a runner object
  @desc
    Settings can either be `compiled` (the output of [::getRunOpts],
    or plain (in which case they will automatically be passed
    to [::getRunOpts] with empty `args`.

    See [::run] for available settings.
*/
var Runner = exports.Runner = function(opts) {
  if (!(opts instanceof CompiledOptions)) {
    // build opts with no additional context
    logging.verbose("compiling opts from input:", opts);
    opts = exports.getRunOpts(opts || {}, []);
  }
  this.opts = opts;
  this.reporter = opts.reporter || NullRporter;
  this.active_contexts = [];
  this.root_contexts = [];
}

Runner.prototype.getModuleList = function(url) {
  var contents;
  if (suite.isBrowser) {
    contents = require('../http').get(url);
  } else {
    var path = urlMod.parse(url) .. urlMod.toPath;
    contents = require('../nodejs/fs').readFile(path, 'UTF-8');
  }
  logging.debug(`module list contents: ${contents}`);
  return (contents.trim().split("\n")
    .. map(strip)
    .. filter(line -> line && !(line..startsWith('#')))
  );
}

Runner.prototype.loadModules = function(modules, base) {
  modules .. each {|module|
    if (this.opts.testFilter.shouldLoadModule(module)) {
      this.loadModule(module, base);
    } else {
      logging.verbose("skipping module: #{module}");
    }
  }
}

/**
  @function Runner.loadAll
  @summary Load all test modules
  @desc
    The list of modules to load is taken from
    `opts.moduleList` or `opts.modules`.
*/
Runner.prototype.loadAll = function() {
  var modules;
  var opts = this.opts;
  if (!opts.base) {
    throw new Error("opts.base not defined");
  }
  if (opts.hasOwnProperty('moduleList')) {
    var url = urlMod.normalize(opts.moduleList, opts.base);
    modules = this.getModuleList(url, opts.encoding || 'UTF-8');
  } else if (opts.hasOwnProperty('modules')) {
    modules = opts.modules;
  } else {
    throw new Error("no moduleList or modules property provided");
  }
  this.loadModules(modules, opts.base);
}

// Used by `./suite`
Runner.prototype.withContext = function(ctx, fn) {
  var existing_contexts = this.active_contexts.slice();
  this.active_contexts.push(ctx);

  try {
    fn();
  } finally {
    if (this.active_contexts[this.active_contexts.length - 1] != ctx) {
      throw new Error("invalid context nesting");
    }
    this.active_contexts.pop();
  }
};

// Used by `./suite`
Runner.prototype.currentContext = function() {
  if(this.active_contexts.length < 1) {
    throw new Error("there is no active test context");
  }
  return this.active_contexts[this.active_contexts.length-1];
}

/**
  @function Runner.context
  @summary Create a top-level context
  @param {String} [desc] Description
  @param {Function} [fn] Block
  @desc
    This function acts much like [./suite::context],
    but allows defining tests directly on a `Runner`
    instance rather than having tests in a separate module.
*/
Runner.prototype.context = function(desc, fn) {
  var ctx = new suite.context.Cls(desc, fn);
  this.root_contexts.push(ctx);
  return ctx;
}

Runner.prototype.loadModule = function(module_name, base) {
  // TODO: what about non-file URLs?
  var canonical_name = urlMod.normalize(module_name, base);

  // ensure the module actually gets reloaded
  // XX maybe replace with require(., {reload:true}) mechanism when we have it.
  delete require.modules[require.resolve(canonical_name).path];

  // construct a special toplevel context that knows its module path
  var ctx = new suite.context.Cls(module_name, function() {
    if (this.reporter.loading) this.reporter.loading(module_name);
    require(canonical_name);
  }.bind(this) , module_name);
  this.root_contexts.push(ctx);
};

/**
  @function Runner.run
  @summary Run all tests
  @param {optional Object} [reporter] Reporter
  @return {::Results}
  @desc
    If `reporter` is given, it overrides `opts.reporter`.
*/
Runner.prototype.run = function(reporter) {
  var opts = this.opts;
  // use `reporter.run` if no reporter func given explicitly
  if (reporter == undefined) reporter = this.reporter;

  // ----------------------------
  // Call a given `reporter` method, if it exists
  var report = function(key /*, ... */) {
    var reporterFn = reporter[key];
    if (reporterFn) {
      var args = Array.prototype.slice.call(arguments, 1);
      reporterFn.apply(reporter, args);
    }
  }

  // count the number of tests, while marking them (and their parent contexts)
  // as _enabled while disabling all other contexts
  //
  // if opts.listOnly is true, this will call `reporter.listTest` with each test
  // and then exit.
  var total_tests = 0;
  var enable = function(ctx) {
    while(ctx && !ctx._enabled) {
      ctx._enabled = true;
      ctx = ctx.parent;
    }
  };

  var preprocess_context = function(module, ctx) {
    ctx._enabled = false;

    if (ctx.shouldSkip()) {
      // skipped contexts can be enabled, but their children are never collected / run
      if (opts.testFilter.shouldRun(module, ctx)) {
        enable(ctx);
      }
      return;
    }

    this.withContext(ctx) {||
      ctx.collect();
      ctx.children .. each {|child|
        if (child.hasOwnProperty('children')) {
          preprocess_context(module, child);
        } else {
          if (opts.testFilter.shouldRun(module, child)) {
            total_tests++;
            child._enabled = true;
            enable(child.context);
            if (opts.listOnly) report('listTest', child);
          } else {
            child._enabled = false;
          }
        }
      }
    }
  }.bind(this);

  suite._withRunner(this) { ||
    this.root_contexts .. each(ctx -> preprocess_context(ctx.module(), ctx));
  }
  if (opts.listOnly) return;

  // ----------------------------
  // Create the results object
  var results = new Results(report, total_tests);
  var startTime = new Date();

  // ----------------------------
  // Checking for unexpected global variables
  var global = sys.getGlobal();
  var getGlobals = function(existing) {
    // if `existing` is defined, get only the globals that are not in `existing`.
    // Otherwise return the names of all globals
    var keys = object.ownKeys(global) .. toArray();
    if (existing) {
      keys = keys .. array.difference(existing);
    } else {
      if (opts.allowedGlobals) {
        keys = keys.concat(opts.allowedGlobals)
      }
    }
    return keys;
  }
  var deleteGlobals = function(globals) {
    globals .. each {|g|
      try {
        delete global[g];
      } catch(e) {
        global[g] = undefined; //IE
      }
    }
  }
  var checkGlobals = function(test, extraGlobals) {
    var ignoreGlobals = test._getIgnoreGlobals();
    if (ignoreGlobals === true) return true; // ignore all globals

    extraGlobals = extraGlobals .. array.difference(ignoreGlobals);
    if (extraGlobals.length > 0) {
      throw new Error("Test introduced additional global variable(s): #{extraGlobals..sort..join(", ")}");
    }
  }
  if (!opts.checkLeaks) { getGlobals = -> [] }
  var defaultTimeout = opts.timeout;
  var BAIL = false;

  // ----------------------------
  // run a single test
  var runTest = function(test) {
    var initGlobals = getGlobals();
    var extraGlobals = null;
    var result = new TestResult(test);
    report('testBegin', result);
    try {
      if (test.shouldSkip()) {
        results._skip(result, test.skipReason);
      } else {
        test.run(defaultTimeout);

        extraGlobals = getGlobals(initGlobals);
        checkGlobals(test, extraGlobals);
        results._pass(result);
      }
    } catch (e) {
      results._fail(result, e);
      if (opts.bail) BAIL = true;
    } finally {
      if (extraGlobals == null) extraGlobals = getGlobals(initGlobals);
      deleteGlobals(extraGlobals);
    }
    report('testEnd', result);
    if (suite.isBrowser) hold(0); // don't lock up the browser's UI thread
  };

  // ----------------------------
  // traverse a test context
  var traverse = function(ctx) {
    if (BAIL) return;
    if (!ctx._enabled) {
      logging.verbose("Skipping context: #{ctx}");
      return;
    }
    if (!ctx.hide) report('contextBegin', ctx);

    if (!ctx.shouldSkip()) {
      ctx.withHooks(defaultTimeout) {||
        ctx.children .. each {|child|
          if (BAIL) break;
          if (child.hasOwnProperty('children')) {
            traverse(child);
          } else {
            if (child._enabled) {
              runTest(child);
            } else {
              logging.verbose("Skipping test: #{child}");
            }
          }
        }
      }
    }
    if (!ctx.hide) report('contextEnd', ctx);
  }
  
  // ----------------------------
  // run the tests
  report('suiteBegin', results);
  using(logging.logContext({level: this.opts.logLevel})) {
    var unusedFilters = this.opts.testFilter.unusedFilters();
    if (unusedFilters.length > 0) {
      throw new UsageError("Some filters didn't match anything: #{unusedFilters .. join(", ")}");
    }

    try {
      this.root_contexts .. each(traverse);
    } catch (e) {
      results._error(e);
    }
  }
  results.duration = new Date().getTime() - startTime.getTime();
  results.end.set();
  report('suiteEnd', results);
  return results;
}

/**
  @class TestResult
  @summary The result of a single test run
  @desc
    Instances of this class are created by [::Runner], you should
    not need to create them yourself.

  @constructor TestResult
  @param {test/suite:Test} [test]

  @variable TestResult.test
  @summary The test

  @variable TestResult.description
  @summary The test description

  @variable TestResult.ok
  @summary Whether this test result is ok
  @desc
    Skipped and Passed tests are considered "ok", Failed tests are not.

  @variable TestResult.passed
  @summary Whether this test passed

  @variable TestResult.failed
  @summary Whether this test failed

  @variable TestResult.skipped
  @summary Whether this test was skipped

  @variable TestResult.reason
  @summary The reason given for skipping this test
  @desc
    If this test was not skipped (or no `reason` was given to [./suite::Test::skip]),
    `reason` will be `undefined`.
*/
var TestResult = exports.TestResult = function(test) {
  this.test = test;
  this.description = test.description;
  this.state = null;
}

TestResult.prototype._complete = function(state) {
  if (this.state != null) {
    throw new Error("Test already complete");
  }
  this.state = state;
  object.extend(this, state);
}

TestResult.prototype.pass = function() {
  this._complete({ok: true, passed: true, skipped: false});
}

TestResult.prototype.fail = function(e) {
  this._complete({ok: false, passed: false, skipped: false, error: e});
}

TestResult.prototype.skip = function(reason) {
  this._complete({ok: true, passed: false, skipped: true, reason: reason});
}


/**
  @class Results
  @summary The result of an test suite run
  @desc
    Instances of this class are created by [::Runner], you should
    not need to create them yourself.

  @constructor Results
  @param {Function} [report]
  @param {Number} [total]

  @variable Results.passed
  @summary Number of passed tests

  @variable Results.failed
  @summary Number of failed tests

  @variable Results.skipped
  @summary Number of skipped tests

  @variable Results.total
  @summary Total number of expected tests
  @desc
    This is set on instance initialization to the number
    of tests we expect to run. If there are errors, the
    number of tests actually run may be less than this.

  @variable Results.duration
  @summary Duration of this test run (in milliseconds)
  @desc
    This is only set once all tests have completed

*/
var Results = exports.Results = function(report, total) {
  this.passed = 0;
  this.failed = 0;
  this.skipped = 0;
  this.total = total;
  this.duration = 0;

  this.end = Condition();
  this._currentError = null;
  this._report = report;
  Results.INSTANCES.push(this);
}

Results.INSTANCES = [];

/**
  @function Results.durationSeconds
  @summary Return the suite duration in seconds
  @param {Number} precision
  @return {Number} Fixed-precision number of seconds
  @desc
    Returns a `precision`-digit decimal (e.g "3.14") of the number
    of seconds this test suite took to run. If `precision` is
    not given, it defaults to `2`.

    Only returns a useful value once all tests are complete.
*/
Results.prototype.durationSeconds = function(precision) {
  if (precision === undefined) precision = 2;
  return (this.duration / 1000).toFixed(precision);
}

Results.prototype._error = function(err) {
  logging.error(String(err));
  this.ok = -> false;
}

Results.prototype._uncaughtError = function(err) {
  this._currentError = err; // attach this error to the current / next test, if any
  this.ok = -> false;
}

/**
  @function Results.ok
  @summary whether the entire test run was acceptable
  @desc
    Reporters *must* check this value, rather than simply checking
    for zero failed tests.
    
    For example, an uncaught error (from a spawned strata)
    or from a context's `beforeAll` block will cause the
    result to be "not ok" despite no specific test having failed.
*/
Results.prototype.ok = function() {
  return this.failed == 0;
}

Results.prototype._fail = function(result, err) {
  result.fail(err);
  this.failed += 1;
  this._report('testFailed', result);
}

Results.prototype._pass = function(result) {
  if (this._currentError != null) {
    this._fail(result, this._currentError)
    this._currentError = null;
    return;
  }
  result.pass(result);
  this.passed += 1;
  this._report('testPassed', result);
}

Results.prototype._skip = function(result, reason) {
  result.skip(reason);
  this.skipped += 1;
  this._report('testSkipped', result);
}

/**
  @function Results.count
  @summary The number of tests that have run so far
  @return {Number}
  @desc
    This number is always kept up to date (so it can be used
    to update a progress bar, for example).

    In some curcumstances it may never reach the value of
    [::Results::total], e.g if errors prevent some tests from
    even starting.
*/
Results.prototype.count = function() {
  return this.passed + this.skipped + this.failed;
}

var CompiledOptions = function(opts) {
  object.extend(this, opts);
}
CompiledOptions.prototype = {
  // default options
  allowedGlobals : [],
  checkLeaks     : true,
  color          : null,
  logCapture     : true,
  logLevel       : logging.INFO,
  reporter       : null,
  showAll        : true,
  skippedOnly    : false,
  testSpecs      : null,
  timeout        : 10,
  bail           : false,
  diff           : true,
  debug          : false,
  
  // known options that have no default
  base       : undefined,
  moduleList : undefined,
  modules    : undefined,
  init       : undefined,
  exit       : undefined,
}

/**
  @function getRunOpts
  @summary Combine `opts` and command-line arguments
  @param {Object} [settings]
  @param {optional Array} [args] Array of string arguments
  @desc
    Like instantiating a [::Runner] instance directly, most users
    should not need to use this function directly (use [::run] instead).

    If `args` is not given, arguments will be taken from the environment
    (`sys.argv()` on node.js, derived from `document.location.hash` in
    a browser).

    For possible `settings`, see [::run].
*/
exports.getRunOpts = function(opts, args) {
  // takes an options object and produces a version with
  // environmental options (from either `args`, process.args or location.hash) taken into account

  if (args == undefined) {
    // if none provided, get args from the environment
    if (suite.isBrowser) {
      if (karma && karma.config !== undefined) {
        args = (karma.config.args || []).slice(1); // args[0] is the testsuite path
      } else {
        var argstring = decodeURIComponent(document.location.hash.slice(1));
        args = require('../shell-quote').parse(argstring);
      }
    } else {
      args = require('../sys').argv();
    }
  } else {
    args = args .. toArray();
  }
  if (args .. hasElem('--debug') || opts.debug) {
    // special-case logging flag, as otherwise we miss debug info from parsing args
    logging.setLevel(logging.DEBUG);
    opts.debug = true;
  }

  var result = new CompiledOptions(opts);
  var setOpt = function(k, v) {
    // warn on unknown options (only visible with --debug)
    if (!(k in CompiledOptions.prototype)) {
      logging.verbose("Unknown option: #{k}");
    }
    result[k] = v;
  }

  opts .. object.ownPropertyPairs .. each {|prop|
    setOpt.apply(null, prop);
  }

  if (args.length > 0) {
    var dashdash = require('sjs:dashdash');
    var options = [
      { name: "color",
        type: 'string',
        help: 'Terminal colors (on|off|auto)'
      },
      { name: 'logcapture',
        type: 'bool',
        help: 'Enable log capture during running tests'
      },
      { name: 'no-logcapture',
        type: 'bool',
        help: 'Disable log capture during running tests'
      },
      { name: 'diff',
        type: 'bool',
        help: 'Enable diffs for failed assertions'
      },
      { name: 'no-diff',
        type: 'bool',
        help: 'Disable diffs for failed assertions'
      },
      { name: 'loglevel',
        type: 'string',
        help: "Set the log level (#{logging.levelNames .. object.ownValues .. sort .. join("|")})"
      },
      { name: 'skipped',
        type: 'bool',
        help: 'Just report skipped tests (don\'t run anything)'
      },
      { names: ['list', 'l'],
        type: 'bool',
        help: 'Print out all full test names and then exit'
      },
      { name: 'timeout',
        type: 'number',
        help: 'Set the default test timeout (in seconds, 0 to disable)'
      },
      { name: 'ignore-leaks',
        type: 'bool',
        help: 'Skip checking for leaked global variables'
      },
      { names: ['show-failed','f'],
        type: 'bool',
        help: 'Print only failed (or skipped) tests'
      },
      { names: ['show-all','a'],
        type: 'bool',
        help: 'Print all tests'
      },
      { names: ['bail', 'b'],
        type: 'bool',
        help: "Exit immediately after the first failure"
      },
      { names: ['no-bail'],
        type: 'bool',
        help: "Don't exit immediately after the first failure (default)"
      },
      { names: ['debug'],
        type: 'bool',
        help: "Set logLevel=DEBUG before test runner begins"
      },
      { names: ['help', 'h'],
        type: 'bool',
        help: "Print this help"
      },
    ];
    var parser = dashdash.createParser({options: options});
    var printHelp = function() {
      logging.error(
"Usage: [options] [testspec [...]]

Testspec formats:
 - path/to/test.sjs
 - path/to/test.sjs:text
 - :text

(a test will match if `text` appears anywhere in its context + test description)

Options:

" + parser.help()
      );
    }
    try {
      var parsed = parser.parse({argv: args, slice:0});
      if (parsed.help) throw new Error();
      
      // process parsed options
      parsed .. object.ownPropertyPairs .. each {|pair|
        var [key, val] = pair;
        if (key .. startsWith('_')) continue;
        switch(key) {
          case 'loglevel':
            key = 'logLevel';
            val = val.toUpperCase();
            if (!(val in logging)) {
              throw new Error("unknown log level: #{val}");
            }
            val = logging[val];
            break;

          case 'logcapture':
            key = 'logCapture';
            break;

          case 'no_logcapture':
            key = 'no_logCapture';
            break;

          case 'ignore_leaks':
            key = 'checkLeaks';
            val = false;
            break;

          case 'timeout':
            if (val == 0) val = undefined;
            break;

          case 'skipped':
            key = 'skippedOnly';
            break;

          case 'l':
          case 'list':
            key = 'listOnly';
            break;

          case 'b':
            key = 'bail';
            break

          case 'f':
          case 'show_failed':
            key = 'showAll';
            val = false;
            break;

          case 'a':
          case 'show_all':
            key = 'showAll';
            val = true;
            break;
          
          case 'color':
            if (val == 'on') {
              val = true;
            } else if (val == 'off') {
              val = false;
            } else if (val != 'auto') {
              throw new Error("unknown color mode: #{val}");
            }
            break;

          case 'debug':
            // dealt with explicitly at the start of getRunOpts
            continue;
        }

        if (key .. startsWith('no_')) {
          val = false;
          key = key.slice(3);
        }

        setOpt(key, val);
      }

      // process testspecs
      if (parsed._args.length > 0) {
        result.testSpecs = parsed._args .. map(function(arg) {
          if (arg == '') throw new Error("empty testspec");
          var parts = arg.split(':');
          var spec = {};

          if (parts[0]) spec.file = parts[0];
          if (parts.length > 1) {
            spec.test = parts.slice(1) .. join(':');
          }
          return spec;
        });
      }
    } catch(e) {
      printHelp();
      throw new UsageError(e.message);
    }
  }
  result.testFilter = buildTestFilter(result.testSpecs || [], opts.base, result.skippedOnly);
  return result;
};


/**
  SuiteFilter is an internal class used for representing
  parsed command-line filter arguments
*/
var CWD = null;
// In node.js we also allow paths relative to cwd()
if (sys.hostenv == "nodejs") {
  CWD = -> './' .. urlMod.fileURL();
}
var canonicalizeAgainst = (p, base) -> urlMod.normalize(p, base)..rstrip('/');

var SuiteFilter = function SuiteFilter(opts, base) {
  this.opts = opts;
  this.used = {};
  this.base = base;
  if (this.opts.file) {
    this.file = opts.file;
    this.used.file = false;
    this.absolutePaths = [this.file .. canonicalizeAgainst(this.base)];
    if (CWD) {
      this.absolutePaths.push(this.file .. canonicalizeAgainst(CWD()));
    }
  }
  if (this.opts.test) {
    this.used.test = false;
    this.test = this.opts.test;
  }
}

SuiteFilter.prototype.toString = function() {
  return JSON.stringify(this.opts);
}

SuiteFilter.prototype.shouldLoadModule = function(module_path) {
  if (!this.file) return true;

  if (this._shouldLoadModule(module_path)) {
    this.used.file = true;
    return true;
  }
  return false;
}

SuiteFilter.prototype.shouldRun = function(test_fullname) {
  if (!this.test) return true;
  if (test_fullname.indexOf(this.test) != -1) {
    this.used.test = true;
    return true;
  }
  return false;
}

SuiteFilter.prototype._shouldLoadModule = function(module_path) {
  if(module_path == this.file) return true;

  var absolutePath = module_path .. canonicalizeAgainst(this.base);
  if (this.absolutePaths.indexOf(absolutePath) != -1) return true;
  return this.absolutePaths .. any(p -> absolutePath .. startsWith(p + '/'));
}

/**
  build a `testFilter` object from an array of filter specs.
  the result object has the following methods:
   - shouldLoadModule(moduleUrl) -> Boolean
   - shouldRun(test) -> Boolean
   - unusedFilters() -> Boolean
*/
var buildTestFilter = exports._buildTestFilter = function(specs, base, skippedOnly) {
  var always = () -> true;
  var emptyList = () -> [];
  var defaultAction = (mod, test) -> skippedOnly ? test.shouldSkip() : true;

  if (specs.length > 0 && !base) throw new Error("opts.base not defined");
  var filters = specs .. map(s -> new SuiteFilter(s, base));

  if (specs.length == 0) {
    return {
      shouldLoadModule: always,
      shouldRun: defaultAction,
      unusedFilters: emptyList,
    }
  }

  var shouldLoadModule = function(mod) {
    var result = false;
    filters .. each{|suiteFilter|
      if (suiteFilter.shouldLoadModule(mod)) {
        result = true;
      }
    }
    return result;
  }

  var shouldRun = function(mod, test) {
    var result = false;
    var fullname = test.fullDescription();
    filters .. each{|suiteFilter|
      if (suiteFilter.shouldLoadModule(mod) && suiteFilter.shouldRun(fullname)) {
        result = true;
      }
    }
    return result && defaultAction(mod, test);
  }

  return {
    shouldLoadModule: shouldLoadModule,
    shouldRun: shouldRun,
    unusedFilters: () -> (filters .. filter(s -> (s.used.file === false || s.used.test === false)) .. toArray),
  }
}

/**
  @function run
  @summary Run a test suite
  @param {Object} [settings]
  @param {optinal Array} [args]

  @setting [base] **Required** - the base module URL that all relative module paths are be relative to.
  @setting [moduleList] A relative path to a text file containing a list of module names (one module per line).
  @setting [modules] An array of strings, each item being a relative module path.
  @setting [allowedGlobals] An array of global variable names to ignore in leak checking. Use only as a last resort.
  @setting [checkLeaks] Whether to fail tests that introduce global variable leaks (default `true`)
  @setting [color] Use terminal colours: `null` (auto), `true`, or `false` (default `null`).
  @setting [diff] Print diffs for failed assertions. (default `true`).
  @setting [logCapture] Capture `sjs:logging` calls during tests and display them only for failed tests (default `true`).
  @setting [logLevel] Set the log level during tests.
  @setting [reporter] Custom reporter instance.
  @setting [showAll] Print all test results (default `true`).
  @setting [skippedOnly] Print skipped tests only.
  @setting [timeout] Set the default test timeout, in seconds (default `10`).
  @setting [bail] Stop running tests after the first failure (default `false`).
  @setting [init] An initialization function which (if given) will be called with the [::Runner] instance as the first argument before any tests are loaded.
  @setting [exit] Whether to exit the process with an appropriate status code after the test run (prevents useless stacktrace output).
  @desc
    This is the function used to configure and run an entire test suite.
    It is designed to be called from your test runner script.

    The only required settings are `base` and either `modules` or `moduleList`.

    ### Example usage:

        require('sjs:test/runner').run({
          base: module.id,
          modules: [
            'foo-tests',
            'bar-tests',
            'integration/more-tests'
          ]
        });

    Alternatively, say you have a module list file at `test-modules.txt` next to your test script with the following contents:

        foo-tests.sjs
        bar-tests.sjs
        integration-more-tests.sjs

    This is much easier to generate with a build script than the above inline-version (the .sjs extension is optional). To use
    it in your test script, it's simply:

        require('sjs:test/runner').run({
          base: module.id,
          moduleList: './test-modules.txt',
        });
*/
exports.run = Runner.run = function(opts, args) {
  var exit = opts.exit !== false;
  var _run = function() {
    reporterModule.init();
    logging.debug(`opts: ${opts}`);
    try {
      opts = exports.getRunOpts(opts, args);
    } catch(e) {
      var msg = (e instanceof UsageError) ? e.message : String(e);
      console.error(msg);
      if (exit) return exports.exit(1);
      else throw new Error();
    }
    logging.debug(`opts: ${opts}`);
    opts.reporter = opts.reporter || new reporterModule.DefaultReporter(opts);
    var runner = new Runner(opts);
    if (opts.init) { opts.init(runner); }
    runner.loadAll(opts);
    return runner.run();
  };

  if (!exit) {
    // just run it, without catching exceptions
    return _run();
  } else {
    try {
      return _run();
    } catch(e) {
      // catch exceptions and turn them into process.exit()
      if (opts.debug) {
        console.log(String(e));
      } else {
        if (e.message) console.log(e.message);
      }
      exports.exit(1);
    }
  }
};

var karma;
(function() {
  //module-time one-off setup tasks
  if (suite.isBrowser) {
    karma = window.__karma__;
    exports.exit = -> null;
    if (karma) exports.exit = function(code) { throw new Error(); };
    // preload modules that may be needed at runtime
    spawn(function() {
      require('../shell-quote');
      require('../dashdash');
    }());
  } else {
    exports.exit = (code) -> process.exit(code);
  }
  var onUncaught = function(handler) {
    if (suite.isBrowser) {
      window.onerror = handler;
    } else {
      process.on('uncaughtException', handler);
    }
  }

  // Any uncaught exception fails the most recently created Result instance
  // that has not yet ended.
  // If all results instances have ended, it kills the process with an error status.
  onUncaught(function(e) {
    logging.error("Uncaught error: #{e}");
    var instance = Results.INSTANCES .. seq.reverse .. seq.find(r -> !r.end.isSet, null);
    if (instance == null) {
      exports.exit(1);
    } else {
      instance._uncaughtError(e);
    }
  });
})();
