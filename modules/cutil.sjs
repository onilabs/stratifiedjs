/*
 * Oni Apollo 'cutil' module
 * Utility functions and constructs for concurrent stratified programming
 *
 * Part of the Oni Apollo Standard Module Library
 * Version: 'unstable'
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
  @summary   Utility functions and constructs for concurrent stratified programming
  @home      apollo:cutil
*/

var sys  = require('sjs:apollo-sys');
var coll = require('./collection');

/**
  @function waitforAll
  @deprecated Use [collection::par.waitforAll]
*/
exports.waitforAll = coll.par.waitforAll;

/**
  @function waitforFirst
  @deprecated Use [collection::par.waitforFirst]
*/
exports.waitforFirst = coll.par.waitforFirst;


/**
  @class    Semaphore
  @summary  A counting semaphore.
  @function Semaphore
  @param    {Integer} [permits] Number of permits available to be handed out.
  @param    {Boolean} [sync=false] Toggles synchronous behaviour (see [::Semaphore::release])
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
      Calls to [::Semaphore::acquire] usually need to be paired up
      with calls to [::Semaphore::release]. Instead of ensuring this pairing 
      manually, consider using [::Semaphore::synchronize], or the following 
      deprecated `using` syntax:

          using (mySemaphore.acquire()) {
            ...
          }

      Here the `using` construct will automatically call the permit's
      `__finally__` method when the code block is left.
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
      [::Semaphore::acquire]),
      the oldest one will be handed the permit and resumed.

      The sequencing of resumption is determined by the Semaphore
      constructor flag 'sync':

      If sync is false, the pending stratum will be resumed
      *after* [::Semaphore::release] returns.

      If sync is true, the pending stratum will be resumed *before*
      [::Semaphore::release] returns.

      Calls to [::Semaphore::release] are usually
      paired with calls to [::Semaphore::acquire].
      See documentation for [::Semaphore::acquire]
      for an alternative to doing this manually.
   */
  release : function() {
    spawn ((this.sync ? null : hold(0)), ++this.permits,
           (this.queue.length ? this.queue.shift()() : null))
  },

  /**
     @function Semaphore.synchronize
     @altsyntax semaphore.synchronize { || ... some code ... }
     @summary Acquire permit, execute function, and release permit.
     @param {Function} [f] Argument-less function or block lambda to execute
     @desc
       `f` will be executed in a `try/finally` construct after the 
       permit has been acquired. The permit will be released in
       the `finally` clause, i.e. it is guaranteed to to be released
       even if `f` throws an exception or is cancelled.

       [::Semaphore::synchronize] is intended to be used with paren-free 
       block lambda call syntax:

           S.synchronize { || ... some code ... }
   */
  synchronize : function(f) {
    this.acquire();
    try {
      f();
    }
    finally {
      this.release();
    }
  }
};


// TODO: pause / resume, in line with node events?
// TODO: wrap node's EventEmitters to provide the same API? e.g
//       var dataEvent = new NodeEvents.Event(someEventEmitter, 'data');
/**
  @class    Event
  @summary  An event that can be waited upon and emitted multiple times.
  @function Event
*/
var Event = exports.Event = function Event() {
  this.waiting = [];
};

/**
  @function  Event.wait
  @summary   Block until this event is next emitted, and return the emitted value (if given).
*/
Event.prototype.wait = function wait() {
  var result = this.value;
  waitfor(result) {
    this.waiting.push(resume);
  } retract {
    coll.remove(this.waiting, resume, null);
  }
  return result;
};

/**
  @function  Event.emit
  @param     {optional Object} [value]
  @summary   Emit event with optional `value`
  @desc
    Resumes all strata that are waiting on this event object.

    If `val` is provided, it will be the return value of all
    outstanding `wait()` calls.
*/
Event.prototype.emit = function emit(value) {
  if(this.waiting.length == 0) return;
  var waiting = this.waiting;
  this.waiting = [];
  spawn(coll.par.each(waiting, function(resume) { resume(value); }));
};

/**
   @function Event.restartLoop
   @altsyntax event.restartLoop { || ... }
   @param {Function} [f] Function to execute
   @summary (Re-)start a function everytime the event is emitted
   @desc
     The code

         event.restartLoop {
           ||
           some_code
         }

     is equivalent to

         while (1) {
           waitfor {
             event.wait();
           }
           or {
             some_code
             hold();
           }
         }
*/
Event.prototype.restartLoop = function restartLoop(f) {
  while (1) {
    waitfor {
      this.wait();
    }
    or {
      f();
      hold();
    }
  }
};

/**
  @class    Condition
  @summary  A single condition value that can be waited upon, set and cleared.
  @function Condition

  @variable Condition.isSet
  @summary  (Boolean) whether the condition is currently set
  @variable Condition.value
  @summary  the currently set value, or `undefined` if the condition is not set
*/
var Condition = exports.Condition = function Condition() {
  this._ev = new Event();
  this.clear();
};

/**
  @function  Condition.wait
  @summary   Block until this condition is set, and return the condition's `value`.
  @desc
    If the condition has already been set, this function returns immediately.
*/
Condition.prototype.wait = function wait() {
  if (!this.isSet) {
    this.value = this._ev.wait();
  }
  return this.value;
};

/**
  @function  Condition.set
  @param     {optional Object} [value] the value to set
  @summary   Trigger (set) this condition
  @desc
    Does nothing if this condition is already set. Otherwise, this will
    resume all strata that are waiting on this condition object.

    If `val` is provided, it will become this condition's value (and
    will be the return value of all outstanding `wait()` calls).
*/
Condition.prototype.set = function set(value) {
  if(this.isSet) return; // noop
  this.isSet = true;
  this.value = value;
  this._ev.emit(value);
};

/**
  @function  Condition.clear
  @summary   Un-set (clear) this condition
  @desc
    Once cleared, the condition can be waited upon and triggered again with
    `wait` and `set`.
*/
Condition.prototype.clear = function clear() {
  this.isSet = false;
  this.value = undefined;
};


/**
  @function makeBoundedFunction
  @deprecated Use [function::bound]
  @summary  A wrapper for limiting the number of concurrent executions of a function.
  @return   {Function} The wrapped function.
  @param    {Function} [f] The function to wrap.
  @param    {Integer} [max_concurrent_calls] The maximum number of concurrent executions to allow for 'f'.
*/
exports.makeBoundedFunction = function(f, max_concurrent_calls) { return require('./function').bound(f, max_concurrent_calls) };

/**
  @function makeRateLimitedFunction
  @deprecated Use [function::rateLimit]
  @summary  A wrapper for limiting the rate at which a function can be called.
  @return   {Function} The wrapped function.
  @param    {Function} [f] The function to wrap.
  @param    {Integer} [max_cps] The maximum number of calls per seconds allowed for 'f'.
*/
exports.makeRateLimitedFunction = function(f, max_cps) { return require('./function').rateLimit(f, max_cps); };

/**
  @function makeExclusiveFunction
  @deprecated Use [function::exclusive]
  @summary  A wrapper for limiting the number of concurrent executions of a function to one. 
            Instead of potentially waiting for the previous execution to end, like makeBoundedFunction, it will cancel it.
  @return   {Function} The wrapped function.
  @param    {Function} [f] The function to wrap.
*/
exports.makeExclusiveFunction = function(f) { return require('./function').exclusive(f); };

/**
   @function makeDeferredFunction
   @deprecated Use [function::deferred]
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
exports.makeDeferredFunction = function(f) { return require('./function').deferred(f); };

/**
   @function makeMemoizedFunction
   @deprecated Use [function::memoize]
   @summary  A wrapper for implementing a memoized version of a function.
   @param    {Function} [f] The function to wrap.
   @param    {optional Function} [key] The key function to use.
   @return   {Function} The wrapped function.
   @desc
     The wrapped function `g = makeMemoizedFunction(f)` stores values that have
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
exports.makeMemoizedFunction = sys.makeMemoizedFunction;

/**
  @class   Queue

  @function Queue
  @summary Constructor for a bounded FIFO queue datastructure.
  @param   {Integer} [capacity] Maximum number of items to which the queue will
           be allowed to grow.
  @param   {optional Boolean} [sync=false] Whether or not this queue uses synchronous semaphores (see [::Semaphore]).
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
  },

  /**
     @function Queue.peek
     @summary  Retrieve the first item on the queue without actually removing it. 
               Blocks if the queue is empty. Safe to be called from multiple strata
               concurrently.
     @return {item} Item at front of queue.
  */
  peek: function() {
    this.S_nonempty.acquire();
    var item = this.items[0];
    this.S_nonempty.release();
    return item;
  }
};

