/*
 * Oni Apollo 'cutil' module
 * Utility functions and constructs for concurrent stratified programming
 *
 * Part of the Oni Apollo Standard Module Library
 * 0.11.0+
 * http://onilabs.com/apollo
 *
 * (c) 2010-2011 Oni Labs, http://onilabs.com
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
  if (Array.isArray(funcs)) {
    if (!funcs.length) return;
    //...else
    return waitforAllFuncs(funcs, args, this_obj);
  }
  else if (Array.isArray(args)) {
    if (!args.length) return;
    //...else
    return waitforAllArgs(funcs, args, this_obj);
  }
  // else
  throw new Error("waitforAll: argument error; either funcs or args needs to be an array");
};

function waitforAllFuncs(funcs, args, this_obj) {
  if (funcs.length == 1)
    funcs[0].call(this_obj, args);
  else {
    // build a binary recursion tree, so that we don't blow the stack easily
    // XXX we should really have waitforAll as a language primitive
    var split = Math.floor(funcs.length/2);
    waitfor {
      waitforAllFuncs(funcs.slice(0,split), args, this_obj);
    }
    and {
      waitforAllFuncs(funcs.slice(split), args, this_obj);
    }
  }
};

function waitforAllArgs(f, args, this_obj) {
  if (args.length == 1)
    f.call(this_obj, args[0]);
  else {
    // build a binary recursion tree, so that we don't blow the stack easily
    // XXX we should really have waitforAll as a language primitive
    var split = Math.floor(args.length/2);
    waitfor {
      waitforAllArgs(f, args.slice(0,split), this_obj);
    }
    and {
      waitforAllArgs(f, args.slice(split), this_obj);
    }
  }
}

/**
  @function waitforFirst
  @summary  Execute a number of functions on separate strata and wait for the first
            of them to finish, or, execute a single function with different
            arguments on separate strata and wait for the first execution to finish.
  @return   {value} Return value of function execution that finished first.
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
exports.waitforFirst = function waitforFirst(funcs, args, this_obj) {
  this_obj = this_obj || this;
  if (Array.isArray(funcs)) {
    if (!funcs.length) return;
    //...else
    return waitforFirstFuncs(funcs, args, this_obj);
  }
  else if (Array.isArray(args)) {
    if (!args.length) return;
    //...else
    return waitforFirstArgs(funcs, args, this_obj);
  }
  // else
  throw new Error("waitforFirst: argument error; either funcs or args needs to be an array");
};


function waitforFirstFuncs(funcs, args, this_obj) {
  if (funcs.length == 1)
    return funcs[0].call(this_obj, args);
  else {
    // build a binary recursion tree, so that we don't blow the stack easily
    // XXX we should really have waitforFirst as a language primitive
    var split = Math.floor(funcs.length/2);    
    waitfor {
      return waitforFirstFuncs(funcs.slice(0,split), args, this_obj);
    }
    or {
      return waitforFirstFuncs(funcs.slice(split), args, this_obj);
    }
  }
};

function waitforFirstArgs(f, args, this_obj) {
  if (args.length == 1)
    return f.call(this_obj, args[0]);
  else {
    // build a binary recursion tree, so that we don't blow the stack easily
    // XXX we should really have waitforFirst as a language primitive
    var split = Math.floor(args.length/2);    
    waitfor {
      return waitforFirstArgs(f, args.slice(0,split), this_obj);
    }
    or {
      return waitforFirstArgs(f, args.slice(split), this_obj);
    }
  }
};

/**
  @class    Semaphore
  @summary  A counting semaphore.
  @function Semaphore
  @summary  Constructor for a Semaphore object.
  @return   {Semaphore}
  @param    {Integer} [permits] Number of permits available to be handed out.
  @param    {Boolean} [sync=false] Toggles synchronous behaviour (see [Semaphore.release](#cutil/Semaphore/release))
  @desc
    Example:
    `var S = new (cutil.Semaphore)(10);`
*/
function Semaphore(permits, sync) {
  /**
    @variable Semaphore.permits
    @summary  Number of free permits currently available to be handed out.
   */
  this.permits = permits;
  this.sync = sync;
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
      the oldest one will be handed the permit and resumed.

      The sequencing of resumption is determined by the Semaphore
      constructor flag 'sync':

      If sync is false, the pending stratum will be resumed
      *after* [Semaphore.release](#cutil/Semaphore/release) returns.

      If sync is true, the pending stratum will be resumed *before*
      [Semaphore.release](#cutil/Semaphore/release) returns.

      Calls to [Semaphore.release](#cutil/Semaphore/release) are usually
      paired with calls to [Semaphore.acquire](#cutil/Semaphore/acquire).
      See documentation for [Semaphore.acquire](#cutil/Semaphore/acquire)
      for an alternative to doing this manually.
   */
  release : function() {
    spawn ((this.sync ? null : hold(0)), ++this.permits,
           (this.queue.length ? this.queue.shift()() : null))
  },
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
  @function makeExclusiveFunction
  @summary  A wrapper for limiting the number of concurrent executions of a function to one. 
            Instead of potentially waiting for the previous execution to end, like makeBoundedFunction, it will cancel it.
  @return   {Function} The wrapped function.
  @param    {Function} [f] The function to wrap.
*/
exports.makeExclusiveFunction = function(f) {
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
}



/**
  @class   Queue

  @function Queue
  @summary Constructor for a bounded FIFO queue datastructure.
  @param   {Integer} [capacity] Maximum number of items to which the queue will
           be allowed to grow.
  @param   {Boolean} [sync=false] Whether or not this queue uses synchronous semaphores (see [Semaphore](#cutil/Semaphore))
  @return  {Queue}
*/
function Queue(capacity, sync) {
  this.items = [];
  this.S_nonfull  = new Semaphore(capacity, sync);
  this.S_nonempty = new Semaphore(0, sync);
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
