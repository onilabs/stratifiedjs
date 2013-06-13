/*
 * StratifiedJS 'function' module
 * Function composition helpers
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.14.0'
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

var sys   = require('builtin:apollo-sys');
var cutil  = require('./cutil');

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
      A call `c(a1,a2,...)` to the composed function `c = par(f,g)`
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
  @function identity
  @param    [argument]
  @summary  Returns whatever argument it receives, unmodified.
*/
exports.identity = function(a) { return a; };

/**
  @function nop
  @summary  Null function, taking no argument and returning 'undefined'
*/
exports.nop = function() { };

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
            Instead of potentially waiting for the previous execution to end, like [::serialized], it will cancel it.
  @return   {Function} The wrapped function.
  @param    {Function} [f] The function to wrap.
*/
exports.exclusive = function(f) {
  var executing = false, cancel;
  return function() {
    if (executing) cancel();
    waitfor {
      executing = true;
      return f.apply(this, arguments);
    }
    or {
      waitfor() {
        cancel = resume;
      }
    }
    finally {
      executing = false;
    }
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
          try { callback(stratum.waitforValue()); }
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


// XXX alt, compose (f o g), curry
