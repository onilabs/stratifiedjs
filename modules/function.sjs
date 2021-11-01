/*
 * StratifiedJS 'function' module
 * Function wrappers & composition helpers
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.20.0-development'
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2012-2016 Oni Labs, http://onilabs.com
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
   @summary Function wrappers & composition helpers
   @home    sjs:function
   @inlibrary sjs:std as fn
   @inlibrary mho:std as fn
*/
'use strict';

module.setCanonicalId('sjs:function');

var sys    = require('builtin:apollo-sys');
var cutil  = require('./cutil');
var { remove } = require('./array');
var { extend } = require('./object');
var { map, zip, each } = require('./sequence');
var { Interface } = require('./type');

__js exports.isFunction = (f) -> (typeof f === "function");

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
exports.seq = function(...fs) {
  return function(...args) { 
    var rv;
    for (var i=0; i<fs.length; ++i)
      rv = fs[i].apply(this, args); 
    return rv;
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
exports.bound = __js function(f, max_concurrent_calls) {
  var permits = cutil.Semaphore(max_concurrent_calls);
  return function(...args) {
    var rv, async = false;
    if (__oni_rt.is_ef(rv = permits.acquire())) {
      //async = true;
      return _bound_async_1(rv, f, permits, this, args);
    }
    try {
      if (__oni_rt.is_ef(rv = f.apply(this, args))) {
        async = true;
        return _bound_async_2(rv, permits);
      }
      return rv; 
    }
    finally {
      if (!async)
        permits.release();
    }
  }
};

function _bound_async_1(ef, f, permits, _this, args) {
  try {
    ef.wait();
    return f.apply(_this, args);
  }
  finally {
    permits.release();
  }
}

function _bound_async_2(ef, permits) {
  try {
    return ef.wait();
  }
  finally {
    permits.release();
  }
}

/**
  @function sequential
  @summary  A wrapper for sequentializing concurrent executions of a function. 
            Like [::bound] (f,1).
  @return   {Function} The wrapped function.
  @param    {Function} [f] The function to wrap.
*/
__js exports.sequential = f -> exports.bound(f, 1);

/**
  @function exclusive
  @summary  A wrapper for limiting the number of concurrent executions of a function to one.
  @return   {Function} The wrapped function.
  @param    {Function} [f] The function to wrap.
  @param    {optional Boolean} [reuse=false] Reuse a previous call's value, rather than cancelling it.
  @desc
    The returned function will be executed at most once concurrently.

    If `reuse` is `true`, calls that occur when the function is already running will wait for (and return) the value from the earlier execution.
    If `reuse` is `false` (or not given), each call will cancel any currently-running call and return `undefined` for it, and then invoke `f` again.
*/
function exclusive_cancel_current(f) {
  var running;
  return function(...args) {
    if (running)
      running.abort().wait();
    try {
      running = reifiedStratum;
      return f.apply(this, args);
    }
    finally {
      running = undefined;
    }
  }
};

// XXX only supports blocklambda controlflow through first caller; maybe don't need to support at all
function exclusive_reuse(f) {
  var stratum;
  var waiting = [];
  return function(...args) {
    var owner = false;
    waitfor {
      waitfor(var rv, isException) {
        waiting.push(resume);
      }
      retract {
        waiting .. remove(resume);
      }
      if (isException) throw rv;
      return rv;
    }
    and {
      var me = this;
      if (!stratum) {
        owner = true;
        reifiedStratum.spawn (function(s) {
          stratum = s;
          var rv, isException = false;
          try {
            rv = f.apply(me, args);
          }
          catch(e) {
            rv = e;
            isException = true;
          }
          finally {
            stratum = undefined;
            var w = waiting;
            waiting = [];
            while (w.length)
              w.shift()(rv, isException);
            //return; // this return prevents blocklambda controlflow from ending up in global stratum
          }
        })
      };
    }
    retract {
      if (stratum) {
        if (waiting.length === 0) {
          stratum.abort().wait();
        }
        else if (owner) {
          // parenting by a global stratum means that blocklambda controlflow will not be routed correctly anymore, and will throw an uncaught exception instead.
          // this should only affect pathological cases.
          sys.spawn(function() { reifiedStratum.adopt(stratum) });
        }
      }
    }
  }
};

exports.exclusive = function(f, reuse) {
  return reuse ? exclusive_reuse(f) : exclusive_cancel_current(f);
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
exports.memoize = function(f, keyfn) {
  var lookups_in_progress = {};

  var memoizer = function(...args) {
    var key = keyfn ? keyfn.apply(this, args) : args[0];
    var rv = memoizer.db[key];
    if (!Array.isArray(rv)) {
      if (!lookups_in_progress[key]) {
        var self = this;
        lookups_in_progress[key] = [sys.spawn(function() {
          try {
            memoizer.db[key] = [f.apply(self, args), false];
          }
          catch(e) {
            memoizer.db[key] = [e, true];
          }
          finally {
            delete lookups_in_progress[key];
          }
        }), 0];
      }
      try {
        ++lookups_in_progress[key][1];
        lookups_in_progress[key][0].wait();
      }
      retract {
        if (lookups_in_progress) { // XXX is this `if` needed?
          if (--lookups_in_progress[key][1] === 0) {
            lookups_in_progress[key][0].abort().wait();
          }
        }
      }
      rv = memoizer.db[key];
    }
    if (rv[1])
      throw new Error(rv[0]);
    return rv[0];
  };
  
  memoizer.db = {};
  return memoizer;
};

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

      Note that `unbatched` does not support blocklambda controlflow: `X` must not contain
      blocklambdas with `break` or `return` statements. These will lead to global uncaught errors
      when executed.

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
      var me = this;
      if (!batch_pending) sys.spawn(-> process_batch.call(me));
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
     executing `_XXXtask f.apply(this_obj, arguments)`.

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
