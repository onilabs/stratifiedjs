/*
 * Oni Apollo 'cutil' module
 * Utility functions and constructs for concurrent stratified programming
 *
 * Part of the Oni Apollo client-side SJS library
 * 0.9.1+
 * http://onilabs.com/apollo
 *
 * (c) 2010 Oni Labs, http://onilabs.com
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
  @module    cutil
  @summary   The cutil module contains utility functions and constructs for
             concurrent stratified programming.
*/

var common = require('common');

/**
  @function waitforAll
  @summary  Execute a number of functions on separate strata and wait for all
            of them to finish, or, execute a single function with different
            arguments on separate strata and wait for all executions to finish.
  @param    {Function | Array} [funcs] Function or array of functions.
  @param    {optional Object | Array} [args] Argument or array of arguments.
  @param    {optional Object} [this_obj] 'this' object on which *funcs* will be executed.
  @desc
    If *funcs* is an array of functions, each of the functions will
    be executed on a separate stratum, with 'this' set to *this_obj* and
    the first argument set to *args*.

    If *funcs* is a single function and *args* is an array, *funcs* will be
    called *args.length* times on separate strata with its first argument set
    to a different elements of *args* in each stratum.
*/
exports.waitforAll = function waitforAll(funcs, args, this_obj) {
  this_obj = this_obj || this;
  if (common.isArray(funcs))
    return waitforAllFuncs(funcs, args, this_obj);
  else if (common.isArray(args))
    return waitforAllArgs(funcs, args, this_obj);
  // else
  throw new Error("waitforAll: argument error; either funcs or args needs to be an array");
};

function waitforAllFuncs(funcs, args, this_obj) {
  if (!funcs.length) return;
  waitfor {
    funcs[0].call(this_obj, args);
  }
  and {
    // We're calling hold(0) here so that we are not bound by the size
    // of the native VM's stack:
    hold(0);
    waitforAllFuncs(funcs.slice(1), args, this_obj);
  }
};

function waitforAllArgs(f, args, this_obj) {
  if (!args.length) return;
  waitfor {
    f.call(this_obj, args[0]);
  }
  and {
    // We're calling hold(0) here so that we are not bound by the size
    // of the native VM's stack:
    hold(0);
    waitforAllArgs(f, args.slice(1), this_obj);
  }
}

/**
  @function waitforFirst
  @summary  Execute a number of functions on different strata and wait for the first
            one to finish.
  @return   {value} Return value of function that finished first.
  @param    {Array} [arr] Array of functions.
*/
exports.waitforFirst = function waitforFirst(arr) {
  if (!arr.length) hold();
  waitfor {
    return arr[0]();
  }
  or {
    // We're calling hold(0) here so that we are not bound by the size
    // of the native VM's stack:
    hold(0);
    return waitforFirst(arr.slice(1));
  }
};

/**
  @class    Semaphore
  @summary  A counting semaphore.
  @function Semaphore
  @summary  Constructor for a Semaphore object.
  @return   {Semaphore}
  @param    {Integer} [permits] Number of permits available to be handed out.
  @desc
    Example:
    `var S = new (cutil.Semaphore)(10);`
*/
function Semaphore(permits) {
  /**
    @variable Semaphore.permits
    @summary  Number of free permits currently available to be handed out.
   */
  this.permits = permits;
  this.queue = [];
  var me = this;
  this._permit = { __finally__: function() { me.release(); } };
}
exports.Semaphore = Semaphore;
Semaphore.prototype = {
  /**
    @function Semaphore.acquire
    @summary  Acquire a permit. If all permits are currently taken, block until one
              becomes available.
    @return   {Permit} An object with a *__finally__* method, which will release
              the semaphore.
    @desc
      Calls to [Semaphore.acquire](#cutil/Semaphore/acquire)
      usually need to be paired up with calls
      to [Semaphore.release](#cutil/Semaphore/release).
      Instead of doing this manually,
      [Semaphore.acquire](#cutil/Semaphore/acquire) can be used in a
      'using' block:

      `using (mySemaphore.acquire()) {
        ...
      }`

      Here the 'using' construct will automatically call the permit's
      *__finally__* method when the code block is left.
   */
  acquire: function() {
    if (this.permits <= 0) {
      waitfor() {
        this.queue.push(resume);
      }
      retract {
        for (var i=0; this.queue[i] != resume; ++i) /**/;
        this.queue.splice(i, 1);
      }
    }
    --this.permits;
    return this._permit;
  },
  
  /**
    @function Semaphore.release
    @summary  Release a permit.
    @desc
      If upon releasing a permit, there are other strata
      waiting for a permit (by blocking in
      [Semaphore.acquire](#cutil/Semaphore/acquire)),
      the oldest one will be handed the permit and resumed
      after [Semaphore.release](#cutil/Semaphore/release) returns.

      Calls to [Semaphore.release](#cutil/Semaphore/release) are usually
      paired with calls to [Semaphore.acquire](#cutil/Semaphore/acquire).
      See documentation for [Semaphore.acquire](#cutil/Semaphore/acquire)
      for an alternative to doing this manually.
   */
  release : function() {
    var me = this;
    spawn(function() {
      ++me.permits;
      if (me.queue.length) me.queue.shift()();
    });
  }
};

/**
  @function makeBoundedFunction
  @summary  A wrapper for limiting the number of concurrent executions of a function.
  @return   {Function} The wrapped function.
  @param    {Function} [f] The function to wrap.
  @param    {Integer} [max_concurrent_calls] The maximum number of concurrent executions to allow for 'f'.
*/
exports.makeBoundedFunction = function(f, max_concurrent_calls) {
  var permits = new Semaphore(max_concurrent_calls);
  return function() {
    using (permits.acquire())
      return f.apply(this, arguments);
  }
};

/**
  @function makeRateLimitedFunction
  @summary  A wrapper for limiting the rate at which a function can be called.
  @return   {Function} The wrapped function.
  @param    {Function} [f] The function to wrap.
  @param    {Integer} [max_cps] The maximum number of calls per seconds allowed for 'f'.
*/
exports.makeRateLimitedFunction = function(f, max_cps) {
  var min_elapsed = 1000/max_cps;
  var last_call;
  return exports.makeBoundedFunction(
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
  @class   Queue

  @function Queue
  @summary Constructor for a bounded FIFO queue datastructure.
  @param   {Integer} [capacity] Maximum number of items to which the queue will
           be allowed to grow.
  @return  {Queue}
*/
function Queue(capacity) {
  this.items = [];
  this.S_nonfull  = new Semaphore(capacity);
  this.S_nonempty = new Semaphore(0);
}
exports.Queue = Queue;
Queue.prototype = {
  /**
    @function Queue.count
    @summary  Returns current number of elements in the queue.
    @return   {Integer}
   */
  count: function() { return this.items.length; },

  /**
    @function Queue.put
    @summary  Put an item into the queue; blocks if the queue has reached
              its capacity. Safe to be called from multiple strata concurrently.
    @param {anything} [item] Item to put into the queue.
   */
  put: function(item) {
    this.S_nonfull.acquire();
    this.items.push(item);
    this.S_nonempty.release();
  },

  /**
    @function  Queue.get
    @summary   Get an item from the queue; blocks if the queue is empty.
               Safe to be called from multiple strata concurrently.
    @return {item} Item retrieved from front of queue.
   */
  get: function() {
    this.S_nonempty.acquire();
    var item = this.items.shift();
    this.S_nonfull.release();
    return item;
  }
};
