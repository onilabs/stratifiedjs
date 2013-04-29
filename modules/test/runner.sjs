/*
 * Oni Apollo 'test/runner' module
 * Functions for collecting and running test suites
 *
 * Part of the Oni Apollo Standard Module Library
 * Version: 'unstable'
 * http://onilabs.com/apollo
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
   @summary Functions for collecting and running test suites
   @home    sjs:test/runner
*/

// TODO: (tjc) document

// import deps in parallel, as roundtrips affect browser startup time significantly.
waitfor {
  var suite = require("./suite.sjs");
} and {
  var reporterModule = require('./reporter');
  var {UsageError} = reporterModule;
} and {
  var { Condition, Event } = require("../cutil.sjs");
} and {
  var array = require('../array');
  var { isArrayLike } = array;
} and {
  var seq = require('../sequence');
  var { each, reduce, toArray, any, filter, map, join, sort, concat } = seq;
} and {
  var { rstrip, startsWith, strip } = require('../string');
} and {
  var object = require('../object');
} and {
  var sys = require('builtin:apollo-sys');
} and {
  var http = require('../http');
} and {
  var logging = require('../logging');
}

var NullRporter = {};
  
var Runner = exports.Runner = function(opts, reporter) {
  if (!(opts instanceof CompiledOptions)) {
    // build opts with no additional context
    opts = exports.getRunOpts(opts || {}, []);
  }
  this.opts = opts;
  this.reporter = reporter || NullRporter;
  this.loading = Event();
  this.active_contexts = [];
  this.root_contexts = [];
}

Runner.prototype.getModuleList = function(url) {
  var contents;
  if (suite.isBrowser) {
    contents = require('../http').get(url);
  } else {
    var path = http.parseURL(url).path;
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

Runner.prototype.loadAll = function(opts) {
  var modules;
  if (!opts.base) {
    throw new Error("opts.base not defined");
  }
  if (opts.hasOwnProperty('moduleList')) {
    var url = sys.canonicalizeURL(opts.moduleList, opts.base);
    modules = this.getModuleList(url, opts.encoding || 'UTF-8');
  } else if (opts.hasOwnProperty('modules')) {
    modules = opts.modules;
  } else {
    throw new Error("no moduleList or modules property provided");
  }
  this.loadModules(modules, opts.base);
}

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

Runner.prototype.currentContext = function() {
  if(this.active_contexts.length < 1) {
    throw new Error("there is no active test context");
  }
  return this.active_contexts[this.active_contexts.length-1];
}

Runner.prototype.context = function(desc, fn) {
  var ctx = new suite.context.Cls(desc, fn);
  this.root_contexts.push(ctx);
  return ctx;
}

Runner.prototype.loadModule = function(module_name, base) {
  // TODO: what about non-file URLs?
  var canonical_name = sys.canonicalizeURL(module_name, base);

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

Runner.prototype.run = function(reporter) {
  var opts = this.opts;
  // use `reporter.run` if no reporter func given explicitly
  if (reporter == undefined) reporter = this.reporter;

  // count the number of tests, while marking them (and their parent contexts)
  // as _enabled while disabling all other contexts
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

  // ----------------------------
  // Call a given `reporter` method, if it exists
  var report = function(key /*, ... */) {
    var reporterFn = reporter[key];
    if (reporterFn) {
      var args = Array.prototype.slice.call(arguments, 1);
      reporterFn.apply(reporter, args);
    }
  }

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
        var testTimeout = test._getTimeout();
        if (testTimeout == null) testTimeout = defaultTimeout;
        waitfor {
          test.run();
        } or {
          hold(testTimeout * 1000);
          throw new Error("Test exceeded #{testTimeout}s timeout");
        }

        extraGlobals = getGlobals(initGlobals);
        checkGlobals(test, extraGlobals);
        results._pass(result);
      }
    } catch (e) {
      results._fail(result, e);
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
    if (!ctx._enabled) {
      logging.verbose("Skipping context: #{ctx}");
      return;
    }
    if (!ctx.hide) report('contextBegin', ctx);

    if (!ctx.shouldSkip()) {
      ctx.withHooks() {||
        ctx.children .. each {|child|
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
  with(logging.logContext({level: this.opts.logLevel})) {
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

var Results = exports.Results = function(report, total) {
  this.succeeded = 0;
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

Results.prototype.durationSeconds = function(precision) {
  if (precision === undefined) precision = 2;
  return (this.duration / 1000).toFixed(precision);
}

Results.prototype._error = function(err) {
  logging.error(err);
  this.ok = -> false;
}

Results.prototype._uncaughtError = function(err) {
  this._currentError = err; // attach this error to the current / next test, if any
  this.ok = -> false;
}

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
    this._currentError = null;
    return this._fail(result, this._currentError)
  }
  result.pass(result);
  this.succeeded += 1;
  this._report('testPassed', result);
}

Results.prototype._skip = function(result, reason) {
  result.skip(reason);
  this.skipped += 1;
  this._report('testSkipped', result);
}

Results.prototype.count = function() {
  return this.succeeded + this.skipped + this.failed;
}

var CompiledOptions = function(opts) {
  object.extend(this, opts);
}
CompiledOptions.prototype = {
  // default options
  color: null,
  testSpecs: null,
  logLevel: null,
  logCapture: true,
  allowedGlobals: [],
  checkLeaks: true,
  showAll: true,
  skippedOnly: false,
  baseModule: null,
  timeout: 10,
}

exports.getRunOpts = function(opts, args) {
  // takes an options object and produces a version with
  // environmental options (from either `args`, process.args or location.hash) taken into account
  var result = new CompiledOptions();
  var setOpt = function(k, v) {
    if (!(k in result)) {
      throw new UsageError("Unknown option: #{k}");
    }
    result[k] = v;
  }

  if (opts.defaults) {
    opts.defaults .. object.ownPropertyPairs .. each {|prop|
      setOpt.apply(null, prop);
    }
  }

  if (opts.base) {
    result.baseModule = opts.base;
  }
  
  if (args == undefined) {
    // if none provided, get args from the environment
    if (suite.isBrowser) {
      // TODO: need to parse this to split into arguments
      var argstring = decodeURIComponent(document.location.hash.slice(1));
      logging.debug("decoding: ", argstring);
      args = require('../shell-quote').parse(argstring);
    } else {
      // first argument is the script that invoked us:
      args = process.argv.slice(1);
    }
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
        help: 'enable log capture during running tests'
      },
      { name: 'no-logcapture',
        type: 'bool',
        help: 'disable log capture during running tests'
      },
      { name: 'loglevel',
        type: 'string',
        help: "set the log level (#{logging.levelNames .. object.ownValues .. sort .. join("|")})"
      },
      { name: 'skipped',
        type: 'bool',
        help: 'Just report skipped tests (don\'t run anything)'
      },
      { name: 'timeout',
        type: 'number',
        help: 'Set the default test timeout (in seconds). Set to 0 to disable.'
      },
      { name: 'ignore-leaks',
        type: 'bool',
        help: 'skip checking for leaked global variables'
      },
      { names: ['show-failed','f'],
        type: 'bool',
        help: 'print only failed (or skipped) tests'
      },
      { names: ['show-all','a'],
        type: 'bool',
        help: 'print all tests'
      },
      { names: ['debug'],
        type: 'bool',
        help: "set logLevel=DEBUG before test runner begins"
      },
      { names: ['help', 'h'],
        type: 'bool',
        help: "print this help"
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
            key = 'logCapture';
            val = false;
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
            if (['on','off', 'auto'].indexOf(val) == -1) {
              throw new Error("unknown color mode: #{val}");
            }
            break;

          case 'debug':
            logging.setLevel(logging.DEBUG);
            continue;
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
        }) .. toArray;
      }
    } catch(e) {
      printHelp();
      throw new UsageError(e.message);
    }
  }
  result.testFilter = buildTestFilter(result.testSpecs || [], opts.base, result.skippedOnly);
  return result;
};


var CWD = null;
// In node.js we also allow paths relative to cwd()
if (sys.hostenv == "nodejs") {
  CWD = 'file://' + process.cwd() + '/';
}
var canonicalizeAgainst = (p, base) -> sys.canonicalizeURL(p, base)..rstrip('/');

var SuiteFilter = function SuiteFilter(opts, base) {
  this.opts = opts;
  this.used = {};
  this.base = base;
  if (this.opts.file) {
    this.file = opts.file;
    this.used.file = false;
    this.absolutePaths = [this.file .. canonicalizeAgainst(this.base)];
    if (CWD) {
      this.absolutePaths.push(this.file .. canonicalizeAgainst(CWD));
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

var buildTestFilter = exports._buildTestFilter = function(specs, base, skippedOnly) {
  var always = () -> true;
  var emptyList = () -> [];
  var defaultAction = (mod, test) -> skippedOnly ? test.shouldSkip() : true;

  if (specs.length > 0 && !base) throw new Error("opts.base not defined");
  var filters = specs .. map(s -> new SuiteFilter(s, base)) .. toArray;

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
 * The top-level run function is the main entry point to the test
 * functionality. Users should not need to instantiate Runner objects
 * directly unless they are doing advanced things (like loading multiple
 * test suites).
 */
exports.run = Runner.run = function(opts, args) {
  reporterModule.init();
  logging.debug(`opts: ${opts}`);
  try {
    var run_opts = exports.getRunOpts(opts, args);
  } catch(e) {
    var msg = (e instanceof UsageError) ? e.message : String(e);
    console.error(msg);
    throw new Error();
  }
  logging.debug(`run_opts: ${run_opts}`);
  var reporter = opts.reporter || new reporterModule.DefaultReporter(run_opts);
  var runner = new Runner(run_opts, reporter);
  if (opts.init) { opts.init(runner); }
  runner.loadAll(opts);
  return runner.run();
};

(function() {
  //module-time one-off setup tasks
  if (suite.isBrowser) {
    exports.exit = -> null;
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
    var instance = Results.INSTANCES .. seq.reverse .. seq.find(r -> !r.end.isSet);
    if (instance == null) {
      exports.exit(1);
    } else {
      instance._uncaughtError(e);
    }
  });
})();
