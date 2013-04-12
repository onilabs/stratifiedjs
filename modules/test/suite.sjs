var _runner = null;
var sys=require('builtin:apollo-sys');
var object=require('../object');
var isBrowser = exports.isBrowser = sys.hostenv == "browser";
var logging = require("sjs:logging");
var { each } = require('../sequence');

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

var context = exports.context = function(desc, fn) {
  var ctx = new Context(desc, fn);
  getRunner().withContext(ctx) {||
    ctx.collect();
  }
  return ctx;
}

var test = exports.test = function(desc, fn) {
  var ctx = currentContext();
  var test = new Test(desc, fn, ctx);
  ctx.children.push(test);
  return test;
}
// extend `test` with context-related methods
test.beforeAll = function(f) {
  currentContext().hooks.before.all.push(f);
};
test.beforeEach = function(f) {
  currentContext().hooks.before.each.push(f);
};
test.afterAll = function(f) {
  currentContext().hooks.after.all.push(f);
};
test.afterEach = function(f) {
  currentContext().hooks.after.each.push(f);
};


var SkipMixins = {};
SkipMixins.skip = function(reason) {
  this._skip = true;
  this.skipReason = reason || null;
}
SkipMixins.skipIf = function(cond_fn, reason) {
  if (cond_fn()) this.skip(skipReason);
}
SkipMixins.browserOnly = function(reason) {
  this.skipIf(-> !isBrowser, reason);
}
SkipMixins.serverOnly = function(reason) {
  this.skipIf(-> isBrowser, reason);
}

var addSkipFunctions = function(cls) {
  object.extend(cls.prototype, SkipMixins);
}

var Context = context.Cls = function(desc, body, module_name) {
  this._skip = false;
  this._module = module_name;
  this.parent = null;
  this.children = [];
  this.description = desc;
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
addSkipFunctions(Context);

Context.prototype.withHooks = function(fn) {
  state = this.parent ? Object.create(this.parent.state) : {};
  runHooks(this.hooks.before.all, this.state);
  var first_error = null;
  try {
    fn();
  } catch(e) {
    first_error = e;
  }
  runAllHooks('afterAll', this.hooks.after.all, this.state, first_error);
}

Context.prototype.collect = function() {
  this.body.call(this.state, this.state);
}
Context.prototype.fullDescription = function() {
  if (this.parent == null) return this.description;
  return this.parent.fullDescription() + ":" + this.description;
}

Context.prototype.module = function() {
  if(this._module !== undefined) return this._module;
  if(this.parent) return this.parent.module();
  return null;
}

Context.prototype.toString = function() {
  return "<#Context: #{this.description} (#{this._module}>";
}

Context.prototype.shouldSkip = function() {
  if (this._skip) return true;
  if (this.parent) return this.parent.shouldSkip();
  return false;
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
      h.call(state, state);
    } catch(e) {
      if(first_error != null) {
        first_error = e;
      } else {
        logging.ERROR("Additional error in #{hook_type} hook:\n#{e}");
      }
    }
  }
  if (first_error) throw first_error;
}

var Test = function(description, body, context) {
  this.description = description;
  this.body = body;
  this.context = context;
  this.state = Object.create(context.state);
  this._skip = false;
}
addSkipFunctions(Test);

Test.prototype.toString = function() {
  return "<#Test: #{this.fullDescription()}>";
}

Test.prototype.run = function() {
  runHooks(this.context.hooks.before.each, this.state);
  var first_error = null;
  try {
    this.body.call(this.state, this.state);
  } catch(e) {
    first_error = e;
  }
  runAllHooks('afterEach', this.context.hooks.after.each, this.state, first_error);
}

/* Returns the full name of this test, including parent contexts */
Test.prototype.fullDescription = function() {
  if(this.context == null) return this.description;
  return this.context.fullDescription() + ":" + this.description;
}


Test.prototype.shouldSkip = function() {
  return this._skip || this.context.shouldSkip();
}

exports.assert = require('../assert');
