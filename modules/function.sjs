/*
 * StratifiedJS 'function' module
 * Function composition helpers
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.20.0-development'
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2012-2013 Oni Labs, http://onilabs.com
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
   @module  function
   @summary Function composition helpers
   @home    sjs:function
*/

module.setCanonicalId('sjs:function');

var sys    = require('builtin:apollo-sys');
var cutil  = require('./cutil');
var { extend } = require('./object');
var { map, zip, each } = require('./sequence');
var { Interface } = require('./type');

__js exports.isFunction = (f) -> (typeof f === "function");

/**
   @function chain
   @summary Function chaining composition
   @param   {Function} [f1, f2, ...] Functions to compose
   @return  {Function} Chain composition of f1, f2, ...
   @desc
      The composed function `c = chain(f,g)` will apply its arguments first 
      to `f`, then call `g` with the result of evaluationg `f`, and return the result of evaluating `g`.

      `f` and `g` will be called with the same `this` pointer that `c` is called with.
*/
exports.chain = function(/*f1,f2,...*/) {
  var fs = arguments;
  return function() { 
    var rv = fs[0].apply(this, arguments);
    for (var i=1; i<fs.length; ++i)
      rv = fs[i].apply(this, [rv]); 
    return rv;
  }
};

/**
   @function seq
   @summary Sequential function composition
   @param   {Function} [f1, f2, ...] Functions to compose
   @return  {Function} Sequential composition of f1, f2, ...
   @desc
      The composed function `c = seq(f,g)` will apply its arguments first 
      to `f`, then to `g`, and return the result of evaluating `g`.

      `f` and `g` will be called with the same `this` pointer that `c` is called with.
*/
exports.seq = function(/*f1,f2,...*/) {
  var fs = arguments;
  return function() { 
    var rv;
    for (var i=0; i<fs.length; ++i)
      rv = fs[i].apply(this, arguments); 
    return rv;
  }
};


/**
   @function par
   @summary Parallel function composition
   @param   {Function} [f1, f2, ...] Functions to compose
   @return  {Function} Parallel composition of f1, f2, ...
   @desc
      A call `c(a1,a2,...)` to the composed function `c = par(f,g)`
      executes as
      `waitfor{ f(a1,a2,...) } and { g(a1,a2,...) }`.

      `f` and `g` will be called with the same `this` pointer that `c` is called with.

*/
exports.par = function(/*f1,f2,...*/) {
  var fs = Array.prototype.slice.call(arguments);
  return function() {
    return cutil.waitforAll(fs, arguments, this);
  }
};

/**
   @function tryfinally
   @summary try-finally function composition
   @param   {Function} [try_func] 
   @param   {Function} [finally_func]
   @return  {Function} Composition try { try_func } finally { finally_func }
   @desc
      A call `c(a1,a2,...)` to the composed function `c = tryfinally(f,g)`
      executes as
      `try{ return f(a1,a2,...) } finally { g(a1,a2,...) }`.

      `f` and `g` will be called with the same `this` pointer that `c` is called with.

*/
exports.tryfinally = function(try_func, finally_func) {
  return function() {
    try     { return try_func.apply(this, arguments); }
    finally { finally_func.apply(this, arguments); }
  }
};

/**
   @function trycatch
   @summary try-catch function composition
   @param   {Function} [try_func] 
   @param   {Function} [catch_func]
   @return  {Function} Composition try { try_func } catch { catch_func }
   @desc
      A call `c(a1,a2,...)` to the composed function `c = trycatch(f,g)`
      executes as
      `try{ return f(a1,a2,...) } catch(e) { return g(e) }`.

      `f` and `g` will be called with the same `this` pointer that `c` is called with.

*/
exports.trycatch = function(try_func, catch_func) {
  return function() {
    try     { return try_func.apply(this, arguments); }
    catch(e) { return catch_func.call(this, e); }
  }
};


/**
  @function identity
  @param    [argument]
  @summary  Returns whatever argument it receives, unmodified.
*/
__js exports.identity = function(a) { return a; };

/**
  @function nop
  @summary  Null function, taking no argument and returning 'undefined'
*/
__js exports.nop = function() { };

/**
  @function bound
  @summary  A wrapper for limiting the number of concurrent executions of a function.
  @return   {Function} The wrapped function.
  @param    {Function} [f] The function to wrap.
  @param    {Integer} [max_concurrent_calls] The maximum number of concurrent executions to allow for 'f'.
*/
exports.bound = function(f, max_concurrent_calls) {
  var permits = cutil.Semaphore(max_concurrent_calls);
  return function() {
    permits.synchronize { 
      ||
      return f.apply(this, arguments);
    }
  };
};

/**
  @function sequential
  @summary  A wrapper for sequentializing concurrent executions of a function. 
            Like [::bound] (f,1).
  @return   {Function} The wrapped function.
  @param    {Function} [f] The function to wrap.
*/
exports.sequential = function(f) {
  var permits = cutil.Semaphore(1);
  return function() {
    permits.synchronize { 
      ||
      return f.apply(this, arguments);
    }
  };
};

/**
  @function exclusive
  @summary  A wrapper for limiting the number of concurrent executions of a function to one.
  @return   {Function} The wrapped function.
  @param    {Function} [f] The function to wrap.
  @param    {optional Boolean} [reuse=false] Reuse a previous call's value, rather than cancelling it.
  @desc
    The returned function will be executed at most once concurrently.

    If `reuse` is `true`, calls that occur when the function is already running will wait for (and return) the value from the earlier execution.
    If `reuse` is `false` (or not given), each call will cancel any currently-running call, abandoning their results.
*/
exports.exclusive = function(f, reuse) {
  var stratum, cancel;
  return function() {
    if (!reuse && cancel) cancel();
    if (!cancel) stratum = spawn (function(t,a){
      waitfor {
        waitfor() { cancel = resume; }
      } or {
        return f.apply(t,a);
      } finally {
        cancel = null;
      }
    }(this,arguments));
    return stratum.value();
  }
};

/**
  @function rateLimit
  @summary  A wrapper for limiting the rate at which a function can be called.
  @return   {Function} The wrapped function.
  @param    {Function} [f] The function to wrap.
  @param    {Integer} [max_cps] The maximum number of calls per seconds allowed for 'f'.
*/
exports.rateLimit = function(f, max_cps) {
  var min_elapsed = 1000/max_cps;
  var last_call;
  return exports.bound(
    function() {
      if (last_call) {
        var elapsed = (new Date()) - last_call;
        if (elapsed < min_elapsed)
          hold(min_elapsed - elapsed);
      }
      last_call = new Date();
      return f.apply(this, arguments);
    }, 1);
};


/**
   @function deferred
   @summary  A wrapper for implementing the 'deferred pattern' on a function (see 
             [ECMAScript docs](http://wiki.ecmascript.org/doku.php?id=strawman:deferred_functions#deferred_pattern)).
   @param    {Function} [f] The function to wrap.
   @return   {Function} The wrapped function.
   @desc
     When the wrapped function is called, it returns a 'deferred object' which 
     implements the methods `then` and `cancel`, as described in 
     [ECMAScript docs](http://wiki.ecmascript.org/doku.php?id=strawman:deferred_functions#deferred_pattern). With these methods, plain JS code can be made to wait for
     for the execution of asynchronous SJS code.
*/
exports.deferred = function(f) {
  return function() {
    var stratum = spawn f.apply(this, arguments);
    var deferred = {
      then : function(callback, errback) {
        spawn (function() {
          try { callback(stratum.value()); }
          catch (e) { if (errback) errback(e); }
        })();
        return deferred;
      },
      cancel : function() {
        stratum.abort();
      }
    };
    return deferred;
  }
};

/**
   @function memoize
   @summary  A wrapper for implementing a memoized version of a function.
   @param    {Function} [f] The function to wrap.
   @param    {optional Function} [key] The key function to use.
   @return   {Function} The wrapped function.
   @desc
     The wrapped function `g = memoize(f)` stores values that have
     been previously computed by `f` in the hash `g.db`, indexed by key. 
     If `g` is called multiple times with the same argument `X`, only the 
     first invocation will call `f(X)` and store the resulting value under 
     `g.db[X]`. Subsequent invocations to `g(X)` will read the value for `X` from 
     `g.db[X]`.

     If `keyfn` is provided, it is called with the same arguments as the function 
     itself, and its return value becomes the key for this call. If `keyfn` is 
     omitted, the first argument to the function is used as the key.

     It is safe to call `g` concurrently from multiple strata: 
     If a call `g(X)` is already in progress (blocked in `f(X)`), while 
     another call `g(X)` is being made, the second (and any subsequent) call 
     will not cause `f(X)` to be called again. Instead, these subsequent 
     calls will wait for the first invocation of `f(X)`.

     `g` implements the following retraction semantics: A pending invocation of 
     `f(X)` will be aborted if and only if every `g(X)` call waiting for 
     `f(X)` to finish has been aborted (i.e. noone is interested in the value 
     for `X` at the moment).
*/
exports.memoize = sys.makeMemoizedFunction;

/**
   @function unbatched
   @param {Function} [batched_f] Function to be unbatched.
   @param {optional Object} [settings] Settings.
   @setting {Integer} [batch_period=0] Period (in ms) over which to batch results. The default value of `0` only collects calls that are "temporally adjacent", i.e. calls made in the same event loop (e.g. `waitfor { g(1) } and { g(2) }`).
   @setting {Boolean} [throw_errors=true] If `true`, return values that are `instanceof Error` 
                      will be thrown to the corresponding caller, rather than returned.
   @summary Create an unbatched function from a batched one.
   @desc
      `batched_f` must be a function accepting a single array argument
      `X` and returning an array `Y` of same length. The idea
      is that `batched_f` operates on a parallel batch of data,
      transforming each of the values `x1, x2, ...` of `X` individually
      into corresponding `y1, y2, ...`.

      `unbatched(batched_f)` creates a function `g(x)` that, when
      called from multiple strata concurrently, will collect multiple
      values `x1, x2, ...` into an array `X` over a given timeframe
      `batch_period`. It then calls `batched_f(X)` and distributes the
      returned array `Y=[y1,y2,...]` to the corresponding callers
      `g(x1), g(x2), ...`.

      #Example

      A database API might offer a `readBatch` function that can retrieve
      several records `R(id1), R(id2), ...` with a single call
      `readBatch([id1, id2, ...])`.

      The unbatched function `read = unbatched(readBatch)` would accumulate any calls
      that are "temporally adjacent", e.g.:

          waitfor {   
            var r1 = read(id1);
          }
          and {
            ...any_non_blocking_code..
            var r2 = read(id2);
          }

      This code would perform a single call `readBatch([id1, id2])` behind the scenes.

      By adjusting the parameter `batch_period`, temporally
      non-adjacent can be made to be accumulated:

          var read = unbatched(readBatch, { batch_period: 100 });

          waitfor {
            var r1 = read(id1);
          }
          and {
            hold(50);
            var r2 = read(id2);
          }

      Here, both calls `read(id1)` and `read(id2)` will resolve to a
      single call `readBatch([id1, id2])` because the time difference
      between them (50ms) is smaller than `batch_period` (100ms).

*/
function unbatched(batched_f, settings) {
  settings = 
    {
      batch_period: 0,
      throw_errors: true
    } .. extend(settings);

  var pending_calls = [], batch_pending = false;

  function process_batch() {
    batch_pending = true;
    hold(settings.batch_period);
    batch_pending = false;
    var batch = pending_calls;
    pending_calls = [];

    if (!batch.length) return;

    try {
      var rvs = batched_f.call(this, batch .. map([arg] -> arg));
      if (!rvs || rvs.length != batch.length) throw new Error('Unexpected return value from batch function');
    }
    catch (e) {
      batch .. each {
        |[,resume]|
        resume(e, true);
      }
      return;
    }

    zip(rvs, batch) .. each {
      |[rv, [,resume]]|
      resume(rv);
    }
  }

  return function(x) {
    waitfor (var rv, isException) {
      var req = [x, resume];
      pending_calls.push(req);
      if (!batch_pending) spawn process_batch.call(this);
    }
    retract {
      var index = pending_calls.indexOf(req);
      if (index !== -1) 
        pending_calls.splice(index, 1);
    }

    if (isException || (settings.throw_errors && rv instanceof Error)) throw(rv);
    return rv;
  }
}
exports.unbatched = unbatched;

/**
   @variable ITF_SIGNAL
   @summary Interface for customizing [::signal]
*/
var ITF_SIGNAL = exports.ITF_SIGNAL = module .. Interface('signal');

/**
   @function signal
   @altsyntax f .. signal(this_obj, args)
   @param {Function} [f] Function to call
   @param {Object} [this_obj] 'this' object to call `f` on
   @param {Array} [args] Argument array for the function call
   @return {void}
   @summary Call a function asynchronously without waiting for the return value
   @desc
     Calling `f .. signal(this_obj, arguments)` is equivalent to
     executing `spawn f.apply(this_obj, arguments)`.

     Signalling is more efficient than spawning but doesn't allow the caller to interact with the
     called function: Whereas the `spawn` call returns a [#language/builtins::Stratum], the 
     `signal` call returns `void`. 

     The efficiency gain is particularly interesting when communicating between 
     different systems across a network using the [mho:rpc/bridge::] 
     (usually via [mho:#features/api-file::]s): Normal and spawned calls 
     wait for a reply from the other end; signalled calls, however, don't require the 
     other end to reply, and thus lead to less network traffic.

     The action performed by `signal` can be customized through [::ITF_SIGNAL]. If this interface is
     present on `f`, `signal` will call `f[ITF_SIGNAL](this_obj, args)`. [::ITF_SIGNAL] is e.g. used 
     by the [mho:rpc/bridge::] to special-case the handling of signalled calls across the network.
*/
__js {
  function signal(f, this_obj, args) {
    if (f[ITF_SIGNAL])
      f[ITF_SIGNAL](this_obj, args);
    else
      f.apply(this_obj, args);
  }
  exports.signal = signal;
}
// XXX alt, curry
