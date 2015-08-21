/*
 * StratifiedJS 'wraplib' module
 * Utility functions for wrapping plain JS libraries for SJS
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.20.0-development'
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2012 Oni Labs, http://onilabs.com
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
   @module  wraplib
   @executable
   @summary Utility functions for wrapping plain JS libraries for SJS
   @home    sjs:wraplib
   @desc
     This module has multiple methods for wrapping a third-party library:

     ### [::annotate]-based:

     This is well-suited for simple, flat APIs. You define the topoloy of a
     library, and it is (recursively) annotated. This is actually a mutation of
     the underlying library, and so requires dilligence to ensure that you have
     wrapped all relevant functions.

     ### [::wrapObject]-based:

     This is required for more advanced libraries with complex objects and
     return values. You create a parallel structure wrapping an underlying
     API. This method allows you to apply wrapping to _return values_, which
     is required for APIs which construct and return object with (asynchronous)
     methods.

     It also ensures that _only_ the properties you define are present in the
     wrapped API. This makes it easier to detect an incomplete wrapper (you
     will get an `undefined` property, rather than accidentally using
     the un-wrapped version)

   @nodoc
*/

@ = require([
  {id:'./assert', name: 'assert'},
  './sequence',
  './object',
]);

var SENTINEL_SYNC = {};
SENTINEL_SYNC.toString = -> '<sync>';

var ASYNC_PROTO = {};
var SENTINEL_ASYNC = function() {
  var rv = Object.create(SENTINEL_ASYNC);
  rv.args = Array.prototype.slice.call(arguments);
  return rv;
};
SENTINEL_ASYNC.toString = -> '<async>';
SENTINEL_ASYNC.args = null;

__js function isAsync(obj) {
  return obj === SENTINEL_ASYNC || SENTINEL_ASYNC.isPrototypeOf(obj);
}

var SENTINEL_IGNORE = {};
SENTINEL_IGNORE.toString = -> '<ignore>';

// the whole of wraplib's operation is parameterised with values for `debug` and `timeout`,
// so this function generates an implementation of `wraplib` for the given values
function generateWrapLib(debug, timeout) {
  var exports = {};
  if(debug) {
    var logging = require("sjs:logging");
  }
  var logdebug = function() {
    if (!debug) return;
    logging.print.apply(logging, arguments);
  }

  /**
    @function annotate
    @summary Declaratively wrap an entire library.
    @param {object} [subject] The root object to wrap.
    @param {object} [spec]    The specification to use to wrap the library.
    @desc
      `spec` is a plain javascript object which will be used to traverse & annotate
      the given `subject`. The keys of the object will control traversal of the
      subject, and the values will either be nested objects, [::sync], or an array
      of arguments to pass into [::annotate.fn]. For example:
   
          // Original javascript library code:
          var module = {};
          module.ClassA = function() { this.val = 42; }
          module.ClassA.prototype = {
            "slowStringify": function(cb) {
              window.setTimeout(500, cb(this.toString()));
            },
            "fetch": function(id, on_success, on_fail) {
              // some code that fetches a resource via AJAX, for example
            }
          }
   
          // Wrap for SJS:
          var wraplib = require("sjs:wraplib");
          wraplib.annotate(module,
            {
              "ClassA": {
                // `this` key applies an annotation to `ClassA`, while allowing
                // child properties to be annotated as well
                "this": wraplib.sync,
   
                "prototype": {
                  // slowStringify has no regular arguments, uses a callback with a single value,
                  // and has no failure callback
                  "slowStringify": [0, wraplib.handle_success],
   
                  // fetch has one regular argument and uses two callbacks
                  //  - the first is used in case of success, the second in case of error:
                  "fetch": [1, wraplib.handle_success, wraplib.handle_error],
                }
              }
            });
   */
  var annotate = exports.annotate = function(subject, spec) {
    for (var k in spec) {
      if(k == 'this') continue;
      if(!spec.hasOwnProperty(k)) continue;
      var annotation = spec[k];
      
      if(annotation == null) {
        throw new Error("null annotation given for key " + k);
      }
      _apply_annotation(subject, k, annotation);
      
      // we apply "this" annotations from the parent, so that
      // `k` and `val` apply to the correct things
      if(annotation.hasOwnProperty('this')) {
        _apply_annotation(subject, k, annotation['this']);
      }
    }
  };

  /**
    @function annotate.fn
    @summary Replace the given function with a wrapped version
    @param {object} [source] The parent object.
    @param {String} [name]   The name of the property to wrap / replace.
    @param {Int} [num_args]  The number of arguments to expect.
    @param {Function} [result_handler ...] One or more result handler functions,
                      which will be used to provide callback arguments for the original
                      (unwrapped) function.
    @desc
      This function will replace `source[name]` with a wrapped version of the existing
      function. The wrapped version will block until a result is returned (via a callback)
      from the underlying function, and return the result (or raise an exception if
      an error occurs).
   
      The wrapped version will act as follows:
   
       - If the number of arguments passed is greater than `num_args`, it assumes
         callbacks have been provided already and will pass the call onto the wrapped
         function unmodified. This allows library code to call the wrapped function as
         it would the plain JS function and still work correctly.
       - Otherwise, it will call the underlying function with additional callbacks,
         controlled by the one or more `result_handler` arguments passed in to `wrap`.
   
       The `result_handler` argument(s) will usually be one or more of the handlers
       provided by this module (e.g `handle_error_and_value`). If you need to write your
       own, you should consult the source code of this module and follow the existing
       examples.
   */
  var wrap = annotate.fn = exports.wrap /* compat */ = function(source, name, num_args/*, [result_handler ... ]*/) {
    var result_handlers = Array.prototype.slice.call(arguments, 3);
    var orig = source[name];

    if(!orig) throw new Error("nonexistent property: " + name + " on object: " + source);
    if(orig.__sjs_wrapped) throw new Error("already wrapped: " + name + " on object: " + source);
    if(result_handlers.length == 0) {
      logdebug(arguments);
      throw new Error("Must provide at least one result handler");
    }

    var call = call_async.apply(null, Array.prototype.slice.call(arguments, 2));
    var replacement = function() {
      return call(orig, this, arguments, name);
    }

    if(orig.hasOwnProperty('prototype')) {
      replacement.prototype = orig.prototype;
    }
    replacement.__sjs_wrapped = true;
    replacement.__sjs_orig = orig;
    if(num_args !== undefined) replacement.__sjs_length = num_args;
    replacement.__sjs_callbacks = result_handlers.length;
    source[name] = replacement;
  }

  /**
    @variable handle_error_and_value
    @summary A handler for callback(error, value).
    @desc
      A handler which will provide a callback that expects two arguments: `err` and `value`.
      If `err` is truthy, it will be thrown as an exception. Otherwise, `value` will be
      returned to the caller.
   */
  var handle_error_and_value = exports.handle_error_and_value = function handle_error_and_value(fn, resume) {
    return function(err, value) {
      resume(err, value);
    }
  }

  /**
    @variable handle_error
    @summary A handler for callback(error).
    @desc
      A handler which will provide a callback that expects a single argument: `err`.
      If invoked, it will raise `err`.
   */
  var handle_error = exports.handle_error = function handle_error(fn, resume) {
    return function(err) {
      resume(err);
    }
  }

  /**
    @variable handle_success
    @summary A handler for callback(value).
    @desc
      A handler which will provide a callback that expects a single argument: `value`.
      If invoked, it will return `value` to the caller.
   */
  var handle_success = exports.handle_success = function handle_success(fn, resume) {
    return function(val) {
      resume(null, val);
    }
  }


  /**
    @function annotate.sync
    @summary Mark a function as synchronous (i.e not needing any further wrapping)
    @param {Function} [fn]
   */
  var mark_sync = annotate.mark_sync = exports.mark_sync /* deprecated */ = function(obj) { obj.__sjs_ok = true; return obj; };

  /**
    @function annotate.ignore
    @summary Mark an object as ignored (i.e not reported by [./inspect::])
    @param {Function} [fn]
   */
  var mark_ignore = annotate.ignore = function(obj) { obj.__sjs_wraplib_ignore = true; return obj; };


  var _apply_annotation = function(subject, k, annotation) {
    try {
      if(annotation == null) {
        throw new Error("annotation is null!");
      }
      if(annotation === 'sync' /* compat */
      || annotation === SENTINEL_SYNC)
      {
        annotate.mark_sync(subject[k]);
      } else if (annotation === SENTINEL_IGNORE) {
        annotate.mark_ignore(subject[k]);
      } else if (isAsync(annotation)) {
        var args = annotation.args;
        if(!args) throw new Error("async annotation requires arguments");
        var wrapArgs = [subject, k];
        if(args.length == 1) {
          wrapArgs.push(args[0]);
          wrapArgs.push(handle_error_and_value);
        } else {
          wrapArgs = wrapArgs.concat(args);
        }
        annotate.fn.apply(this, wrapArgs);
      } else {
        if(annotation instanceof Array) {
          var args = [subject, k].concat(annotation);
          annotate.fn.apply(this, args);
        } else {
          annotate(subject[k], annotation);
        }
      }
    } catch(e) {
      require("sjs:logging").print("Error applying annotation for key #{k}: #{e}");
      throw e;
    }
  };

  /**
    @variable sync
    @type Mode
    @summary Synchronous function marker
   */
  exports.sync = SENTINEL_SYNC;
  /**
    @variable ignore
    @summary Ignored object marker
   */
  exports.ignore = SENTINEL_IGNORE;
  /**
    @variable async
    @type Mode
    @summary Asynchronous function marker
    @desc
      `async` can be used as-is, where it is a [::Mode] which
      always appends a single callback to the provided arguments, using
      the (most common) calling convention of [::handle_error_and_value].

      This is generally all you need to wrap a callback-taking JavaScript function
      into a suspending StratifiedJS function.

      If you need to customize the exact calling mode, you can invoke async as:

         async(num_args, [handler1, [handler2 ...]])

      When `num_args` is given, the wrapped function will behave
      as async only when this many (or fewer) arguments are supplied. If
      more than `num_args` are supplied to the wrapped function, it is assumed that the
      function is being called from JavaScript rather than SJS, in which
      case it will pass all arguments through transparently.

      If you provide one or more trailing `handler` arguments,
      these will be used to handle callback results instead of
      the default [::handle_error_and_value].
   */
  exports.async = SENTINEL_ASYNC;


  /**
    @function wrapObject
    @summary Wrap an object
    @param {object} [subject]
    @param {object} [spec] see description below
    @param {Settings} [settings]
    @setting {Array} [copy] Array of property names to copy from `subject`
    @setting {Array} [proxy] Array of property names to proxy from `subject`
                             (gets and sets will be proxied; requires Object.defineProperty support)
    @setting {Object} [extend] Additional properties to mix into the returned object (using [object::extend])
    @setting {Boolean} [inherit] Inherit from `subject` (shorthand for `proto: subject`)
    @setting {Object} [proto] Custom prototype for the returned object
    @return {Object}
    @desc
      `spec` is a plain javascript object which specifies what properties
      will appear on the returned object, and how they relate to the
      property (of the same name) of `subject`.

      The value of each property in `spec` should be a [::Wrapper], as
      returned by:

       - [::wrapConstructor]
       - [::wrapMethod]
       - [::wrapProperty]

      For properties which don't need to be wrapped, you can usually use either the
      `copy` or `proxy` settings.


      ### Example:

          module.exports = lib .. wrapObject({
            compute: @wrapMethod(@sync, obj -> obj .. @wrapObject({
              instances: @wrapProperty({
                list: @wrapMethod(@async, true),
                get: @wrapMethod(@async, true),
                'delete': @wrapMethod(@async),
              }),
            }, {
              // include _options property from underlying compute object
              copy: '_options',
            })),
          });

   */
  exports.wrapObject = function(subject, spec, opts) {
    //console.log("Wrapping object #{subject} which has #{subject .. @keys .. @join(",")} with spec #{spec .. @ownKeys .. @join(",")}");
    var rv;
    if(opts && opts.inherit === true) {
      rv = Object.create(subject);
    } else if(opts && opts.proto) {
      rv = Object.create(opts.proto);
    } else {
      rv = {};
    }

    if(spec) {
      spec .. @ownPropertyPairs .. @each {|[k, wrapper]|
        rv[k] = wrapper(subject[k], subject, k)
      }
    }
    if (opts) {
      opts .. @ownPropertyPairs .. @each {|[k, v]|
        switch(k) {
          case 'copy':
            v .. @each {|k| rv[k] = subject[k] };
            break;
          case 'extend':
            rv .. @extend(v);
            break;
          case 'proxy':
            v .. @each {|k|
              Object.defineProperty(rv, k, {
                configurable: true,
                enumerable: true,
                get: -> subject[k],
                set: function(val) { subject[k] = val },
              });
            };
            break;

          // dealt with explicitly above
          case 'inherit': break;
          case 'proto': break;

          default: throw new Error("unknown option: #{k}");
        }
      }
    }
    //console.log("Wrapped object #{subject} has props #{rv .. @ownKeys .. @join(",")}");
    rv.__sjs_orig = subject;
    return rv;
  }

  /**
    @class Wrapper
    @summary Callable wrapper
    @desc
      This class is not to be instantiated directly, but is returned
      by functions like [::wrapProperty].
  */

  /**
    @class Mode
    @summary Callable mode
    @desc
      This class is not to be instantiated directly - you should use existing modes like
      [::async] and [::sync].
  */

  // Return a wrapped function with debug timeout, if debug is set
  // (otherwise returns `fn` unmodified)
  function withDebugTimeout(fn) {
    if(debug) {
      fn = function(orig) {
        waitfor {
          return orig.apply(this, arguments);
        } or {
          hold(timeout * 1000);
          throw new Error("call timed out!");
        }
      }(fn);
    }
    return fn;
  }

  /**
    @function wrapProperty
    @summary Create a property wrapper, for use with [::wrapObject]
    @param {object} [spec] see below
    @param {Settings} [settings]
    @return {Wrapper}
    @desc
      This function acts much like [::wrapObject], and in particular it
      supports the same `spec` and `settings` arguments.

      The difference is that this function returns a {::Wrapper} (for use
      in a spec), while [::wrapObject] returns a wrapped object directly.
      Generally, you will use [::wrapObject] for a top-level object, and
      [::wrapProperty] for sub-objects.
   */
  exports.wrapProperty = function(spec, opts) {
    return function(property /*, subject, key */) {
      return exports.wrapObject(property, spec, opts);
    }
  }

  var call_sync = function(property, subject, args) {
    return property.apply(subject, args);
  }

  var call_async = function(len /* handlers */) {
    var result_handlers;
    if(arguments.length > 1) {
      // handlers provided
      result_handlers = arguments .. @slice(1) .. @toArray();
    } else {
      result_handlers = null;
    }

    var as_async = function(orig, subject, args) {
      var args = args .. @toArray();
      waitfor(var err, rv) {
        if(result_handlers) {
          var num_args = args.length;
          for(var i=0; i<result_handlers.length; i++) {
            args[num_args+i] = result_handlers[i](orig, resume);
          }
        } else {
          args.push(resume);
        }
        args.push(resume);
        orig.apply(subject, args);
      }
      if(err) throw err;
      return rv;
    } .. withDebugTimeout();
    
    if(len === undefined) return as_async;
    var rv = function(property, subject, args, name) {
      if(args.length > len) {
        logdebug("callback provided for method " + name + " - not wrapping");
        return call_sync(property, subject, args);
      } else {
        return as_async(property, subject, args);
      }
    }
    rv.__sjs_length = len;
    rv.__sjs_callbacks = result_handlers ? result_handlers.length : 1;
    return rv;
  }

  var construct_sync = function(constructor, subject, args) {
    function F() {
        return constructor.apply(this, args);
    }
    F.prototype = constructor.prototype;
    return new F();
  }

  var wrapCallable = function(call, ret) {
    @assert.func(call);
    return function(property, subject, key) {
      //console.log("wrapping method #{key}");
      var wrapped = function() {
        var rv;
        var val = call(property, subject, arguments, key);
        // to prevent against acidental leakage of non-wrapped return values,
        // we return `undefined` unless `true` is explicitly passed
        if(ret) {
          if(ret === true) {
            rv = val;
          } else {
            rv = ret(val);
          }
        }
        else if (ret === null) rv = undefined;
        return rv;
      };
      wrapped.__sjs_wrapped = true;
      wrapped.__sjs_orig = property;
      if(wrapped.__sjs_length !== undefined) wrapped.__sjs_length = call.__sjs_length;
      wrapped.__sjs_callbacks = call.__sjs_callbacks;
      return wrapped;
    };
  }

  /**
    @function wrapMethod
    @summary Create a method wrapper, for use with [::wrapObject]
    @param {::Mode} [mode] call mode
    @param {Boolean|Function} [return=false] return action
    @return {::Wrapper}
    @desc
      This function creates a wrapper (appropriate for [::wrapObject])
      which wraps the underlying function in the given `mode`.

      `return` may either be a boolean, in which case it simply determines
      whether or not the underlying return value is returned. This defaults
      to `false` to prevent accidental exposure of un-wrapped objects.

      If `return` is instead a function, the underlying return value will be
      passed through this function before being returned from the wrapper.
   */
  // TODO: wrapFunction?
  exports.wrapMethod = function(call, ret) {
    if(call === exports.sync) call = call_sync;
    else if(isAsync(call)) call = call_async.apply(null, call.args);
    return wrapCallable(call, ret);
  };

  /**
    @function wrapConstructor
    @summary Create a method wrapper, for use with [::wrapObject]
    @param {::Mode} [mode] call mode
    @param {Boolean|Function} [return=false] return action
    @return {::Wrapper}
    @desc
      Accepts the same arguments as [::wrapFunction]. Use this to wrap constructor
      functions. Async-mode constructors are not supported.
   */
  exports.wrapConstructor = function(call, ret) {
    if(call == null || call === exports.sync) call = construct_sync;
    else if(call === exports.async) throw new Error("async constructors are not supported");
    return wrapCallable(call, ret);
  };

  return exports;
};

/**
  @function withDebug
  @param {Number} [timeout] Timeout
  @summary Generate and return a debug version of the wraplib module
  @desc
    Returns a new version of the `wraplib` module with debug enabled,
    and `timeout` set to the given number of seconds. This object will have
    the same properties and functions as the `wraplib` module itself, except
    that all invocations of wrapped functions will:
 
     - Log information (using `sjs:logging`) about the call (ie. whether it
       is wrapping the invocation or passing it straight through to
       the underlying code)
     - Throw an exception if any wrapped function does not complete within the
       given `timeout` (in seconds).
 
    This improves feedback when debugging, and prevents "runaway" code that never
    returns due to misconfigured callbacks.
 */
exports.withDebug = function(timeout) { return generateWrapLib(true, timeout || 2); }

// at the top level, this module exports a non-debug version of itself
require("builtin:apollo-sys").extendObject(exports, generateWrapLib(false));

if (require.main === module) {
  process.exit(require('./wraplib/inspect').main());
}

