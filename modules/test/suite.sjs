/*
 * StratifiedJS 'test/suite' module
 * Functions for defining test suites
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
   @module  test/suite
   @summary Functions for defining test suites
   @home    sjs:test/suite
   @desc
      Typically, exports from this module are imported into each test module's scope.

      ### Example usage:

          var suite = require('sjs:test/suite');
          var {test, context, assert} = suite;

          context("addition") {||
            test("one plus one") {||
              assert.eq(1+1, 2);
            }

            test("negative result") {||
              assert.eq(1 + (-9), -8);
            }
          }

          context("subtraction") {||

            test.beforeAll {|state|
              state.subtractor = function(a,b) { return a - b };
            }

            test("1 - 2") {|state|
              state.subtractor(1, 2) .. assert.eq(-1);
            }
          }.skipIf(suite.isBrowser, "Subtraction is not supported in the browser");

*/

var _runner = null;
var sys=require('builtin:apollo-sys');
var object=require('../object');
var logging = require("sjs:logging");
var { each, filter } = require('../sequence');


/**
  @variable isBrowser
  @summary whether the suite is being run in a browser
*/
var isBrowser = exports.isBrowser = sys.hostenv == "xbrowser";
/**
  @variable isServer
  @summary whether the suite is being run in nodejs (i.e `!isBrowser`)
*/
var isServer = exports.isServer = !isBrowser;

/**
  @variable isWindows
  @summary whether the suite is being run on Windows
  @hostenv nodejs
*/
var isWindows = exports.isWindows = isBrowser ? undefined : process.platform === "win32";

var getRunner = function() {
  if (_runner == null) throw new Error("no active runner");
  return _runner;
}

var currentContext = function() {
  return getRunner().currentContext();
}

exports._withRunner = function(runner, fn) {
  if (_runner != null) throw new Error("multiple test runners");
  _runner = runner;
  try {
    fn();
  } finally {
    if (_runner != runner) throw new Error("runner changed during test collection");
    _runner = null;
  }
}

var skip_sn = exports._skip_sn = {};
exports._isSkip = e -> e.is_skip === skip_sn;

/**
  @function skipTest
  @param {optional String} [reason] Reason for skipping test
  @summary Abort the currently executing test, marking it as `skipped`
  @desc
    This is similar to the [::Test::skip] method, except it
    happens during the test body.

    These two examples are _almost_ equivalent:

        test("some function", function() {
          // test body
        }).skipIf(someCondition());

        test("some function", function() {
          if(someCondition()) skipTest();
          // test body
        });

    The difference is that in the first case, `someCondition()` is evaluated
    when the module is loaded. In the second case, `someCondition()` is not
    evaluated until the test is actually running.
    
    This is an important distinction for some conditions which can't easily be
    checked up front but can be checked during the test's execution.
*/
exports.skipTest = function(reason) {
  var e = new Error("Test skipped: #{reason}");
  e.reason = reason;
  e.is_skip = skip_sn;
  throw e;
}

/**
  @function context
  @param {String} [desc] Context description
  @return {::Context}
  @summary Create and return a new test context.
  @desc
    A context is a way to group tests on a smaller scale
    than at the module level. Any modifiers applied to the
    context will be applied to each test.

    If `desc` is not provided, the default reporters will not
    print the context or indent its children.
    This is useful if you just want group a set of tests
    for the sake of applying some common trait (`skip`,
    `beforeAll`, `timeout`, etc).
*/
var context = exports.context = function(desc, fn) {
  if (arguments.length == 1 && typeof(desc == 'function')) {
    fn = desc;
    desc = undefined;
  }
  var ctx = new Context(desc, fn);
  currentContext().addChild(ctx);
  return ctx;
}

/**
  @function test
  @param {String} [desc] Test description
  @param {Function} [block] Test body
  @return {::Test}
  @summary Create and return a new test case.
  @desc
    The test will pass unless `body` throws an exception.
    Typically, the body of the test will contain at least one
    call to an [::assert] function.

    ### Example:

        test("will pass") {||
          assert.ok(true);
        }

        test("will fail") {||
          assert.eq(1, 2, "one doesn't equal two!");
        }
*/
var test = exports.test = function(desc, fn) {
  var ctx = currentContext();
  var test = new Test(desc, fn, ctx);
  ctx.addTest(test);
  return test;
}
// extend `test` with context-related methods

/**
  @function test.beforeAll
  @param {Function} [block]
  @summary Run an action before any of this context's tests (or child contexts) are run
*/
test.beforeAll = function(f) {
  currentContext().hooks.before.all.push(f);
};

/**
  @function test.beforeEach
  @param {Function} [block]
  @summary Run an action before each of this context's tests are run
  @desc
    Before every test is run, the `beforeEach` actions of *all* of its containing
    contexts are run (starting with the outermost context).
*/
test.beforeEach = function(f) {
  currentContext().hooks.before.each.push(f);
};

/**
  @function test.afterAll
  @param {Function} [block]
  @summary Run an action after all of this context's tests (and child contexts) are run
*/
test.afterAll = function(f) {
  currentContext().hooks.after.all.push(f);
};

/**
  @function test.afterEach
  @param {Function} [block]
  @summary Run an action after each of this context's tests are run
  @desc
    After each test is run (regardless of its success), the `afterEach` actions of *all* of its containing
    contexts are run (starting with the innermost context).

    `block` will be called as `block.call(state, state, error)` where `state` is
    the test's state object, and `error` is the first error that occurred during this test.
*/
test.afterEach = function(f) {
  currentContext().hooks.after.each.push(f);
};

// Helper for properties that, if not defined
// on the current instance, can be inherited
// from their containing context (recursively)
function inheritedProperty(name, defaultValue) {
  var fn = function() {
    if (this[name] !== undefined) return this[name];
    if(this.parent) return fn.apply(this.parent);
    return defaultValue;
  }
  return fn;
}

var MetaMixins = {};
MetaMixins._skip = false;
MetaMixins._ignoreGlobals = [];
MetaMixins._timeout = undefined;
MetaMixins._withTimeout = function(defaultTimeout, desc, block) {
  var timeout = this._getTimeout();
  if (timeout === undefined) timeout = defaultTimeout;

  waitfor {
    return block();
  } or {
    if (timeout == null) hold();
    hold(timeout * 1000);
    throw new Error("#{desc} exceeded #{timeout}s timeout");
  }
}
MetaMixins.skip = function(reason) {
  this._skip = true;
  this.skipReason = reason || null;
  return this;
}
MetaMixins.skipIf = function(cond, reason) {
  if (cond) this.skip(reason);
  return this;
}
MetaMixins.browserOnly = function(reason) {
  this.skipIf(!isBrowser, reason);
  return this;
}
MetaMixins.serverOnly = function(reason) {
  this.skipIf(isBrowser, reason);
  return this;
}
MetaMixins.windowsOnly = function(reason) {
  this.skipIf(isBrowser || !isWindows, reason || "Windows only");
  return this;
}
MetaMixins.posixOnly = function(reason) {
  this.skipIf(isBrowser || isWindows, reason || "POSIX only");
  return this;
}

MetaMixins.ignoreLeaks = function(globals) {
  // globals may be multuple string arguments or a single array of strings
  this._ignoreGlobals = arguments.length == 0 ? true : sys.expandSingleArgument(globals);
  return this;
}
MetaMixins.timeout = function(t) {
  this._timeout = t;
  return this;
}
MetaMixins.shouldSkip = inheritedProperty('_skip', false);
MetaMixins._getTimeout = inheritedProperty('_timeout', undefined);
MetaMixins._getIgnoreGlobals = function() {
  if (this._ignoreGlobals === true) return true;
  var parentGlobals = [];
  if (this.parent) parentGlobals = this.parent._getIgnoreGlobals();
  if (parentGlobals === true) return true;

  // otherwise, parentGlobals and my globals must both be lists:
  return parentGlobals.concat(this._ignoreGlobals);
}

var addMetaFunctions = function(cls) {
  object.extend(cls.prototype, MetaMixins);
}

/**
  @class Context
  @summary Return value from [::context]
  @desc
    The methods on this object do exactly the same as
    those on [::Test], but the settings they affect are
    inherited by all tests inside this context, instead of
    just a single test. See [::Test] for the documentation
    on what these methods do.

    The only exception is the `skip*` methods, which act slightly
    differently: the body (block) of any skipped context will never
    even be executed, which means that its child tests won't
    be reported. This is so that you can guard
    environment-specific code via `skip` declarations. e.g:

        context("server stuff") {||
          var fs = require("sjs:nodejs/fs");
          test("fs.read()") {||
            // ...
          }
        }.serverOnly();

    When this suite is loaded in the browser, the outer context
    prevents the `require('sjs:nodejs/fs')` line from ever
    executing (it would throw an exception if it were executed
    in a browser).


  @function Context.skip
  @param {optional String} [reason]

  @function Context.skipIf
  @param {Boolean} [condition]
  @param {optional String} [reason]

  @function Context.browserOnly
  @param {optional String} [reason]

  @function Context.serverOnly
  @param {optional String} [reason]

  @function Context.windowsOnly
  @param {optional String} [reason="Windows only"]

  @function Context.posixOnly
  @param {optional String} [reason="POSIX only"]

  @function Context.ignoreLeaks
  @param {Array|String ...} [globals] Variable names

  @function Context.timeout
  @param {Number} [seconds]
*/
var Context = context.Cls = function(desc, body, module_name) {
  this._module = module_name;
  this.parent = null;
  this.children = [];
  this.description = desc;
  this.hide = desc === undefined;
  this.body = body;
  this.state = null;
  this.hooks = {
    before: {
      all: [],
      each: []
    },
    after: {
      all: [],
      each: []
    },
  };
}
addMetaFunctions(Context);

Context.prototype.initState = function() {
  this.state = this.parent ? Object.create(this.parent.state) : {};
};

Context.prototype.withHooks = function(defaultTimeout, fn) {
  try {
    this._withTimeout(defaultTimeout, "beforeAll hooks") {||
      runHooks(this.hooks.before.all, this.state);
    }
  } catch(e) {
    e.message = "#{e.message || ""} (#{this.fullDescription()})";
    throw e;
  }

  var first_error = null;
  try {
    fn();
  } catch(e) {
    first_error = e;
  }
  runAllHooks('afterAll', this.hooks.after.all, this.state, first_error);
}

Context.prototype.addTest = function(child) {
  this.children.push(child);
}

Context.prototype.addChild = function(child) {
  child.parent = this;
  this.children.push(child);
}

Context.prototype.collect = function() {
  this.initState();
  if (this._collected) {
    logging.verbose("Ignoring double-collection: #{this.fullDescription()}");
    return;
  }
  this.body.call(this.state, this.state);
  this._collected = true;
}

Context.prototype.fullDescription = function() {
  if (this.hide) return this.parent.fullDescription();

  if (this.parent == null) return this.description;
  return this.parent.fullDescription() + ":" + this.description;
}

Context.prototype.module = inheritedProperty('_module', null);

Context.prototype.toString = function() {
  return "<#Context: #{this.description} (#{this._module})>";
}


/* runHooks is fail-fast - i.e the first error encountered will be raised
 * (and no further hooks run). Use this for `before` hooks:
 */
var runHooks = function(hooks, state) {
  hooks .. each {|h|
    h.call(state, state);
  }
}

/* runAllHooks:
 * A helper function to run all hooks in order, regardless of errors.
 * The first error encountered will be (eventually) raised, and all
 * subsequent errors logged at WARN level.
 */
var runAllHooks = function(hook_type, hooks, state, first_error) {
  hooks .. each {|h|
    try {
      h.call(state, state, first_error);
    } catch(e) {
      if(first_error == null) {
        first_error = e;
      } else {
        logging.error("Additional error in #{hook_type} hook:\n#{e}");
      }
    }
  }
  if (first_error) throw first_error;
}


/**
  @class Test
  @summary Return value from [::test]

  @function Test.skip
  @param {optional String} [reason]
  @summary Unconditionally skip this test.

  @function Test.skipIf
  @param {Boolean} [condition]
  @param {optional String} [reason]
  @summary Skip this test only if `condition` is truthy..

  @function Test.browserOnly
  @param {optional String} [reason]
  @summary Shortcut for `skipIf(!isBrowser, reason)`

  @function Test.serverOnly
  @param {optional String} [reason]
  @summary Shortcut for `skipIf(isBrowser, reason)`

  @function Test.windowsOnly
  @param {optional String} [reason="Windows only"]
  @summary Skip unless running on a Windows nodejs environment

  @function Test.posixOnly
  @param {optional String} [reason="POSIX only"]
  @summary Skip unless running on a POSIX nodejs environment

  @function Test.ignoreLeaks
  @param {Array|String ...} [globals] Variable names
  @summary Ignore specific leaked global variables from tests in this context.
  @desc
    Use this function when you cannot prevent a test from creating
    one or more global variables, but don't want to disable the test runner's
    global variable leak detection entirely.

    Global variables named in this list that are created during the test will
    still be removed, but will not cause the test to fail.

    Pass no arguments to ignore *all* globals created by
    this test. Use only as a last resort.

  @function Test.timeout
  @param {Number} [seconds]
  @summary Override the default timeout (in seconds) for this test. Pass `0` to disable.
*/
var Test = function(description, body, context) {
  this.description = description;
  this.body = body;
  this.context = context;
  this.parent = context; // alias `context` as `parent`, for `inheritedProperty` to use
}
addMetaFunctions(Test);

Test.prototype.toString = function() {
  return "<#Test: #{this.fullDescription()}>";
}

Test.prototype.run = function(defaultTimeout) {
  var state = Object.create(this.context.state);

  var beforeEachHooks = [];
  var afterEachHooks = [];

  var ctx = this.context;
  while(ctx) {
    // beforeEach hooks run from outermost to innermost
    beforeEachHooks = ctx.hooks.before.each.concat(beforeEachHooks);
    
    // beforeEach hooks run from innermost to outermost
    afterEachHooks = afterEachHooks.concat(ctx.hooks.after.each);
    ctx = ctx.parent;
  }

  this._withTimeout(defaultTimeout, "beforeEach hooks") {||
    runHooks(beforeEachHooks, state);
  }

  var first_error = null;
  try {
    this._withTimeout(defaultTimeout, "Test") {||
      this.body.call(state, state);
    }
  } catch(e) {
    first_error = e;
  }
  runAllHooks('afterEach', afterEachHooks, state, first_error);
}

/* Returns the full name of this test, including parent contexts */
Test.prototype.fullDescription = function() {
  if(this.context == null) return this.description;
  return this.context.fullDescription() + ":" + this.description;
}


/**
  @variable assert
  @summary Alias for the [../assert::] module
  @desc
    Since almost all tests will use the [../assert::] module, this
    module re-exports it so that you can import the basic things
    you'll need for a test in one line:

        var {test, context, assert} = require('sjs:test/suite');
*/

exports.assert = require('../assert');

var isIE = exports.isIE = function() { return isBrowser && __oni_rt.UA == 'msie'; }
var ieVersion = exports.ieVersion = function() {
  if (!exports.isIE()) return null;
  return parseInt(navigator.appVersion.match(/MSIE ([0-9]+)/)[1]);
}
