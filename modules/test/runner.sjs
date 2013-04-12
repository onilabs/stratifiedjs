var suite = require("./suite.sjs");
var { Event } = require("../cutil.sjs");
var { isArrayLike } = require('../array');
var { each, reduce, toArray, any, filter, map } = require('../sequence');
var object = require('../object');
var sys = require('builtin:apollo-sys');
var http = require('../http');
var logging = require('../logging');

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
  if (opts.logLevel != null) {
    logging.setLevel(opts.logLevel);
  }
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
  return contents.trim().split("\n");
}

Runner.prototype.loadModules = function(modules, base) {
  modules .. each {|module|
    if (this.opts.testFilter.shouldLoadModule(module)) {
      if (this.reporter.loading) this.reporter.loading(module);
      this.loadModule(module, base);
    } else {
      logging.verbose("skipping module: #{module}");
    }
  }
}

Runner.prototype.loadAll = function(opts) {
  //TODO: support more methods of test discovery?
  var suiteList = sys.canonicalizeURL(opts.suiteList, opts.base);
  var modules = this.getModuleList(suiteList, opts.encoding || 'UTF-8');
  this.loadModules(modules, opts.base);
}

Runner.prototype.withContext = function(ctx, fn) {
  var existing_contexts = this.active_contexts.slice();
  if (existing_contexts.length > 0) {
    var parent = existing_contexts[existing_contexts.length - 1];
    ctx.parent = parent;
    parent.children.push(ctx);
  } else {
    this.root_contexts.push(ctx);
  }
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

Runner.prototype.currentContext = function(test) {
  if(this.active_contexts.length < 1) {
    throw new Error("test defined without an active context");
  }
  return this.active_contexts[this.active_contexts.length-1];
}

Runner.prototype.collect = function(fn) {
  suite._withRunner(this, fn);
}

Runner.prototype.loadModule = function(module_name, base) {
  // TODO: what about non-file URLs?
  var canonical_name = sys.canonicalizeURL(module_name, base);

  // ensure the module actually gets reloaded
  // XX maybe replace with require(., {reload:true}) mechanism when we have it.
  delete require.modules[require.resolve(canonical_name).path];

  this.collect() { ||
    suite.context(module_name, -> require(canonical_name));
  }
};

Runner.prototype.run = function(reporter) {
  if (!reporter && this.reporter.run) {
    reporter = this.reporter.run.bind(this.reporter);
  }
  var count_tests = function(accum, ctx) {
    ctx.children .. each {|child|
      if (child.hasOwnProperty('children')) {
        accum = count_tests(accum, child);
      } else {
        accum += 1;
      }
    }
    return accum;
  }
  var total = this.root_contexts .. reduce(0, count_tests);
  var results = new Results(total);

  waitfor {
    if (reporter) reporter(results);
  } and {
    var runTest = function(test) {
      var result = new TestResult(test);
      results.testStart.emit(result);
      try {
        if (test.shouldSkip()) {
          results._skip(result, test.skipReason);
        } else {
          test.run();
          results._pass(result);
        }
      } catch (e) {
        results._fail(result, e);
      }
      results.testFinished.emit(result);
    }.bind(this);

    var traverse = function(ctx) {
      results.contextStart.emit(ctx);

      ctx.withHooks() {||
        ctx.children .. each {|child|
          if (child.hasOwnProperty('children')) {
            traverse(child);
          } else {
            runTest(child);
          }
        }
      }

      results.contextEnd.emit(ctx);
    }.bind(this);

    this.root_contexts .. each(traverse);
 
    results.end.emit();
  }
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
  this._complete({ok: true, skipped: false});
}

TestResult.prototype.fail = function(e) {
  this._complete({ok: false, skipped: false, error: e});
}

TestResult.prototype.skip = function(reason) {
  this._complete({ok: true, skipped: true, reason: reason});
}

var Results = exports.Results = function(total) {
  this.succeeded = 0;
  this.failed = 0;
  this.skipped = 0;

  this.total = total;

  this.testResults = [];
  this.end = Event();
  this.contextStart = Event();
  this.contextEnd = Event();
  this.testStart = Event();
  this.testFinished = Event();
  this.testSucceeded = Event();
  this.testFailed = Event();
  this.testSkipped = Event();
}

Results.prototype.ok = function() {
  return this.failed == 0;
}

Results.prototype._fail = function(result, err) {
  result.fail(err);
  this.failed += 1;
  this.testResults.push(result);
  this.testFailed.emit(result);
}

Results.prototype._pass = function(result) {
  result.pass(result);
  this.succeeded += 1;
  this.testResults.push(result);
  this.testSucceeded.emit(result);
}
Results.prototype._skip = function(result, reason) {
  result.skip(reason);
  this.skipped += 1;
  this.testResults.push(result);
  this.testSkipped.emit(result);
}

Results.prototype.count = function() {
  return this.testResults.length;
}

var CompiledOptions = function(opts) {
  object.extend(this, opts);
}
CompiledOptions.prototype = {
  // default options
  color: null,
  testSpecs: null,
  //TODO:
  //showPassed: true,
  //showSkipped: true,
  //showFailed: true,
  logLevel: null,
  logCapture: true,
}

exports.getRunOpts = function(opts, args) {
  // takes an options object and produces a version with
  // environmental options (from either `args`, process.args or location.hash) taken into account
  var result = new CompiledOptions();

  if (opts.default_opts) {
    opts.default_opts .. object.ownPropertyPairs .. each {|prop|
      var [k,v] = prop;
      if (!(k in result)) {
        throw new Error("Unknown option: #{k}");
      }
      result[k] = v;
    }
  }
  
  if (args == undefined) {
    // if none provided, get args from the environment
    if (suite.isBrowser) {
      throw new Error("todo..");
    } else {
      // first argument is the script that invoked us:
      args = process.argv.slice(1);
    }
  }
  // TODO: proper option parsing!
  if (args.length > 0) {
    opts.testSpecs = args.map(function(arg) {
      return {
        file: arg,
      }
    });
  }
  result.testFilter = buildTestFilter(opts.testSpecs);
  return result;
};

var buildTestFilter = exports._buildTestFilter = function(specs) {
  var always = () -> true;
  var module_check = always, test_check = always;
  var id = (x) -> x;
  if (!specs || specs.length == 0) {
    module_check = test_check = always;
  } else {
    var fileFilters = specs .. map(s -> s.file) .. filter(id) .. toArray;
    if (fileFilters.length > 0) {
      module_check = function(module_path) {
        return fileFilters..any(f -> module_path.indexOf(f) != -1);
      }
    }
    // TODO: test_check...
  }
  return {
    shouldLoadModule: module_check,
    shouldRunTest: test_check
  }
}

exports.run = function(opts) {
  logging.debug(`GOT OPTS: ${opts}`);
  var run_opts = exports.getRunOpts(opts);
  logging.debug(`GOT RUN_OPTS: ${run_opts}`);
  var reporter = opts.reporter || new (require("./reporter").DefaultReporter)(run_opts);
  var runner = new Runner(run_opts, reporter);
  runner.loadAll(opts);
  return runner.run();
}
