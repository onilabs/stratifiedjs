/*
 * Oni Apollo 'cutil' module
 * Utility functions and constructs for concurrent stratified programming
 *
 * Part of the Oni Apollo Standard Module Library
 * Version: 'unstable'
 * http://onilabs.com/apollo
 *
 * (c) 2010-2013 Oni Labs, http://onilabs.com
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
  @home      sjs:cutil
*/

var sys  = require('builtin:apollo-sys');
var { each } = require('sjs:sequence');
var { remove } = require('sjs:array');

/**
  @function waitforAll
  @summary  Execute a number of functions on separate strata and wait for all
            of them to finish, or, execute a single function with different
            arguments on separate strata and wait for all executions to finish.
  @param    {Function | Array} [funcs] Function or array of functions.
  @param    {optional Array} [args] Array of arguments.
  @param    {optional Object} [this_obj] 'this' object on which `funcs` will be executed.
  @desc
    If `funcs` is an array of functions, each of the functions will
    be executed on a separate stratum, with 'this' set to `this_obj` and
    arguments set to `args`.

    If `funcs` is a single function and `args` is an array, `funcs`
    will be called `args.length` times on separate strata with its
    first argument set to a different elements of `args`, the second
    argument set to the index of the element in `args`, and the the
    third argument set to the `args`.
*/
function waitforAll(funcs, args, this_obj) {
  this_obj = this_obj || null;
  if (sys.isArrayLike(funcs)) {
    if (!funcs.length) return;
    //...else
    return waitforAllFuncs(funcs, args, this_obj);
  }
  else if (sys.isArrayLike(args)) {
    if (!args.length) return;
    //...else
    return waitforAllArgs(funcs, args, 0, args.length, this_obj);
  }
  // else
  throw new Error("waitforAll: argument error; either funcs or args needs to be an array");
};
exports.waitforAll = waitforAll;

function waitforAllFuncs(funcs, args, this_obj) {
  if (funcs.length == 1)
    funcs[0].apply(this_obj, args || []);
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

function waitforAllArgs(f, args, i, l, this_obj) {
  if (l == 1)
    f.call(this_obj, args[i], i, args);
  else {
    // build a binary recursion tree, so that we don't blow the stack easily
    // XXX we should really have waitforAll as a language primitive
    var split = Math.floor(l/2);
    waitfor {
      waitforAllArgs(f, args, i, split, this_obj);
    }
    and {
      waitforAllArgs(f, args, i+split, l-split, this_obj);
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
  @param    {optional Array} [args] Array of arguments.
  @param    {optional Object} [this_obj] 'this' object on which *funcs* will be executed.
  @desc
    If `funcs` is an array of functions, each of the functions will
    be executed on a separate stratum, with 'this' set to `this_obj` and
    arguments set to `args`.

    If `funcs` is a single function and `args` is an array, `funcs`
    will be called `args.length` times on separate strata with its
    first argument set to a different elements of `args`, the second
    argument set to the index of the element in `args`, and the
    third argument set to the `args`.  
*/
function waitforFirst(funcs, args, this_obj) {
  this_obj = this_obj || this;
  if (sys.isArrayLike(funcs)) {
    if (!funcs.length) return;
    //...else
    return waitforFirstFuncs(funcs, args, this_obj);
  }
  else if (sys.isArrayLike(args)) {
    if (!args.length) return;
    //...else
    return waitforFirstArgs(funcs, args, 0, args.length, this_obj);
  }
  // else
  throw new Error("waitforFirst: argument error; either funcs or args needs to be an array");
};
exports.waitforFirst = waitforFirst;

function waitforFirstFuncs(funcs, args, this_obj) {
  if (funcs.length == 1)
    return funcs[0].apply(this_obj, args || []);
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

function waitforFirstArgs(f, args, i, l, this_obj) {
  if (l == 1)
    return f.call(this_obj, args[i], i, args);
  else {
    // build a binary recursion tree, so that we don't blow the stack easily
    // XXX we should really have waitforFirst as a language primitive
    var split = Math.floor(l/2);    
    waitfor {
      return waitforFirstArgs(f, args, i, split, this_obj);
    }
    or {
      return waitforFirstArgs(f, args, i+split, l-split, this_obj);
    }
  }
};


/**
  @class    Semaphore
  @summary  A counting semaphore.
  @function Semaphore
  @param    {Integer} [permits] Number of permits available to be handed out.
  @param    {Boolean} [sync=false] Toggles synchronous behaviour (see [::Semaphore::release])
  @desc
    Example:
    `var S = cutil.Semaphore(10);`
*/
function Semaphore(permits, sync) {
  var rv = Object.create(SemaphoreProto);

  /**
    @variable Semaphore.permits
    @summary  Number of free permits currently available to be handed out.
   */
  rv.permits = permits;
  rv.sync = sync;
  rv.queue = [];

  return rv;
}
exports.Semaphore = Semaphore;

var SemaphoreProto = {
  /**
    @function Semaphore.acquire
    @summary  Acquire a permit. If all permits are currently taken, block until one
              becomes available.
    @desc
      Calls to [::Semaphore::acquire] usually need to be paired up
      with calls to [::Semaphore::release]. Instead of ensuring this pairing 
      manually, consider using [::Semaphore::synchronize].
   */
  acquire: function() {
    if (this.permits <= 0) {
      waitfor() {
        this.queue.push(resume);
      }
      retract {
        this.queue .. remove(resume);
      }
    }
    --this.permits;
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
      See documentation for [::Semaphore::synchronize]
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
function Event() {
  var rv = Object.create(EventProto);
  rv.waiting = [];
  return rv;
};
exports.Event = Event;

var EventProto = {};
/**
  @function  Event.wait
  @summary   Block until this event is next emitted, and return the emitted value (if given).
*/

EventProto.wait = function wait() {
  var result = this.value;
  waitfor(result) {
    this.waiting.push(resume);
  } retract {
    this.waiting .. remove(resume);
  }
  return result;
};

EventProto.toString = function toString() { return "[object cutil.Event]"; }

/**
  @function  Event.emit
  @param     {optional Object} [value]
  @summary   Emit event with optional `value`
  @desc
    Resumes all strata that are waiting on this event object.

    If `val` is provided, it will be the return value of all
    outstanding `wait()` calls.
*/
EventProto.emit = function emit(value) {
  if(this.waiting.length == 0) return;
  var waiting = this.waiting;
  this.waiting = [];
  spawn(waiting .. each { |resume| resume(value) });
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
EventProto.restartLoop = function restartLoop(f) {
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
function Condition() {
  var rv = Object.create(ConditionProto);
  rv._ev = Event();
  rv.clear();
  return rv;
};
exports.Condition = Condition;

var ConditionProto = {};

/**
  @function  Condition.wait
  @summary   Block until this condition is set, and return the condition's `value`.
  @desc
    If the condition has already been set, this function returns immediately.
*/
ConditionProto.wait = function wait() {
  if (!this.isSet) {
    this.value = this._ev.wait();
  }
  return this.value;
};
ConditionProto.toString = function toString() { return "[object cutil.Condition]"; }

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
ConditionProto.set = function set(value) {
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
ConditionProto.clear = function clear() {
  this.isSet = false;
  this.value = undefined;
};


/**
  @class   Queue
  @summary FIFO queue
  @function Queue
  @summary Creates a bounded FIFO queue datastructure.
  @param   {Integer} [capacity] Maximum number of items to which the queue will
           be allowed to grow.
  @param   {optional Boolean} [sync=false] Whether or not this queue uses synchronous semaphores (see [::Semaphore]).
*/
function Queue(capacity, sync) {
  var rv = Object.create(QueueProto);

  rv.items = [];
  rv.S_nonfull  = Semaphore(capacity, sync);
  rv.S_nonempty = Semaphore(0, sync);

  return rv;
}
exports.Queue = Queue;

QueueProto = {
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

