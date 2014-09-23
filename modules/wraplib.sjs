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
   @desc    Work-in-progress
   @nodoc
*/

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
    @function mark_sync
    @summary Mark a function as synchronous (i.e not needing any further wrapping)
    @param {Function} [fn]
   */
  var mark_sync = exports.mark_sync = function(obj) { obj.__sjs_ok = true; return obj; };

  /**
    @function wrap
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
  var wrap = exports.wrap = function(source, name, num_args/*, [result_handler ... ]*/) {
    var result_handlers = Array.prototype.slice.call(arguments, 3);
    var orig = source[name];

    if(!orig) throw new Error("nonexistent property: " + name + " on object: " + source);
    if(orig.__sjs_wrapped) throw new Error("already wrapped: " + name + " on object: " + source);
    if(result_handlers.length == 0) {
      logdebug(arguments);
      throw new Error("Must provide at least one result handler");
    }

    var replacement = function() {
      var self = this;
      var args = Array.prototype.slice.call(arguments);
      if(args.length > num_args) {
        logdebug("callback provided for method " + name + " - not wrapping");
        return orig.apply(self, args);
      }

      try {
        waitfor(var err, result) {
          for(var i=0; i<result_handlers.length; i++) {
            args[num_args+i] = result_handlers[i](orig, resume);
          }
          orig.apply(self, args);
        }
        if(err) throw err;
        return result;
      } or {
        if(debug) {
          hold(timeout * 1000);
          throw new Error("call to " + name + " timed out!");
        } else {
          hold();
        }
      }
    };
    if(orig.hasOwnProperty('prototype')) {
      replacement.prototype = orig.prototype;
    }
    replacement.__sjs_wrapped = true;
    replacement.__sjs_orig = orig;
    replacement.__sjs_length = num_args;
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
    @function annotate
    @summary Convenience function to declaratively wrap an entire library.
    @param {object} [subject] The root object to wrap.
    @param {object} [spec]    The specification to use to wrap the library.
    @desc
      `spec` is a plain javascript object which will be used to traverse & annotate
      the given `subject`. The keys of the object will control traversal of the
      subject, and the values will either be nested objects, `sync`, or an array
      of arguments to pass into `wrap`. For example:
   
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
   **/
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

  var _apply_annotation = function(subject, k, annotation) {
    try {
      if(annotation == null) {
        throw new Error("annotation is null!");
      }
      if(annotation == 'sync')
      {
        mark_sync(subject[k]);
      } else {
        if(annotation instanceof Array) {
          var args = [subject, k].concat(annotation);
          wrap.apply(this, args);
        } else {
          annotate(subject[k], annotation);
        }
      }
    } catch(e) {
      require("sjs:logging").print("Error applying annotation for key #{k}: #{e}");
      throw e;
    }
  };

  exports.sync = 'sync';
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
  require('./wraplib/inspect').main();
}
