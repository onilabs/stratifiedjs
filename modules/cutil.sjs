/*
 * StratifiedJS 'cutil' module
 * Utility functions and constructs for concurrent stratified programming
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.20.0-development'
 * http://onilabs.com/stratifiedjs
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
  @summary   Functions and constructs for concurrent stratified programming
  @home      sjs:cutil
*/

var sys  = require('builtin:apollo-sys');

/**
  @class StratumAborted
  @summary the error type thrown by calling abort() on a stratum
  @desc
    You can check if an error is a stratum being aborted with:

    ### Example:

        try {
          stratum.value();
        } catch(e) {
          if (e instanceof cutil.StratumAborted) {
            // stratum was aborted
          } else {
            // stratum code threw an error
          }
        }
*/
__js exports.StratumAborted = __oni_rt.StratumAborted;


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
  __js this_obj = this_obj || null;
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
  __js this_obj = this_obj || this;
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
__js exports.waitforFirst = waitforFirst;

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
  @param    {Integer} [permits=1] Number of permits available to be handed out.
  @param    {Boolean} [sync=false] Toggles synchronous behaviour (see [::Semaphore::release])
  @desc
    Example:
    `var S = cutil.Semaphore(10);`
*/
__js function Semaphore(permits, sync) {
  var rv = Object.create(SemaphoreProto);

  /**
    @variable Semaphore.permits
    @summary  Number of free permits currently available to be handed out.
   */
  if (permits == null) permits = 1;
  rv.permits = permits;
  rv.sync = sync;
  rv.queue = [];

  return rv;
}
__js exports.Semaphore = Semaphore;

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
        this.queue.splice(this.queue.indexOf(resume), 1);
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
           (this.permits>0 && this.queue.length ? this.queue.shift()() : null))
  },

  /**
     @function Semaphore.synchronize
     @altsyntax semaphore.synchronize { || ... some code ... }
     @summary Acquire permit, execute function, and release permit.
     @param {Function} [f] Argument-less function or block lambda to execute
     @return {value} Return the result of `f`
     @desc
       `f` will be executed in a `try/finally` construct after the
       permit has been acquired. The permit will be released in
       the `finally` clause, i.e. it is guaranteed to to be released
       even if `f` throws an exception or is cancelled.
   */
  synchronize : function(f) {
    this.acquire();
    try {
      return f();
    }
    finally {
      this.release();
    }
  },

  /**
    @function Semaphore.forceAcquire
    @summary  Acquire a permit even if there are no available permits. The number 
              of permits will be decremented by 1.
   */
  forceAcquire: function() {
    --this.permits;
  }
};


// shared prototype for events.HostEmitter & cutil.Condition objects
// (undocumented)
__js {
  var Waitable = {};
  exports._Waitable = Waitable;
  Waitable.init = function() {
    this.waiting = [];
  }
  
  Waitable.emit = function emit(value) {
    if(this.waiting.length == 0) return;
    var waiting = this.waiting;
    this.waiting = [];
    // because we are in a __js block, the code below is equivalent to 
    //  spawn(waiting .. each { |resume| resume(value) });
    for (var i=0; i<waiting.length; ++i)
      waiting[i](value);
  };
}

Waitable.wait = function wait() {
  waitfor(var result) {
    this.waiting.push(resume);
  } retract {
    var idx = this.waiting.indexOf(resume);
    if (idx !== -1) this.waiting.splice(idx, 1);
  }
  return result;
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
  __js var rv = Object.create(ConditionProto);
  rv.init();
  return rv;
};
exports.Condition = Condition;

var ConditionProto = Object.create(Waitable);
ConditionProto.init = function() {
  Waitable.init.call(this);
  this.clear();
}

/**
  @function  Condition.wait
  @summary   Block until this condition is set, and return the condition's `value`.
  @desc
    If the condition has already been set, this function returns immediately.
*/
ConditionProto.wait = function wait() {
  if (!this.isSet) {
    this.value = Waitable.wait.call(this);
  }
  return this.value;
};

ConditionProto.toString = function toString() { return "[object Condition]"; }

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
  Waitable.emit.call(this, value);
};

/**
  @function  Condition.clear
  @summary   Un-set (clear) this condition
  @desc
    Once cleared, the condition can be waited upon and triggered again with
    `wait` and `set`.
*/
__js ConditionProto.clear = function clear() {
  this.isSet = false;
  this.value = undefined;
};


/**
  @class   Queue
  @summary FIFO queue
  @function Queue
  @summary Creates a bounded FIFO queue datastructure.
  @param   {Integer} [capacity] Maximum number of items to which the queue will
           be allowed to grow. A capacity of zero means that the Queue will only 
           accept puts when there is a pending get.
  @param   {optional Boolean} [sync=false] Whether or not this queue uses synchronous semaphores (see [::Semaphore]).
*/
__js function Queue(capacity, sync) {
  var rv = Object.create(QueueProto);

  rv.items = [];
  rv.S_nonfull  = Semaphore(capacity, sync);
  rv.S_nonempty = Semaphore(0, sync);

  return rv;
}
__js exports.Queue = Queue;

var QueueProto = {
  /**
    @function Queue.count
    @summary  Returns current number of elements in the queue.
    @return   {Integer}
   */
  count: function() { return this.items.length; },

  /**
    @function Queue.isFull
    @summary  Returns true if the queue is full and a [::Queue::put] call 
              would block.
    @return   {Boolean}
    @desc
      Note: For Queues with `capacity > 0`, this function 
            is equivalent to `queue.count() == capacity`. For Queues with
            `capacity=0` (i.e. where `queue.count()` is always `==0`), `queue.isFull()` 
            will return `false` if there is a pending `queue.get()` call that is 
            waiting for a `queue.put()`.
   */
  isFull: function() { return this.S_nonfull.permits <= 0; },

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
    // release a slot *now*, so that a queue of size 0 can accept a put now:
    this.S_nonfull.release();

    try {
      this.S_nonempty.acquire();
      var item = this.items.shift();
      return item;
    }
    retract {
      // We've been retracted while waiting for a put; need to
      // re-accquire the slot we released earlier.

      // We need to call `forceAcquire()` rather than `acquire()` because
      // the empty slot we created might have been already filled by a
      // put. An normal blocking `acquire()` could prevent our
      // retraction code from ever returning.
      this.S_nonfull.forceAcquire();
    }
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


/**
  @class SuspendedContext
  @summary The result of [::breaking].

  @variable SuspendedContext.value
  @valtype Object
  @summary The value passed to this context

  @function SuspendedContext.resume
  @summary Resume this context

  @function SuspendedContext.wait
  @summary Suspend until this context is retracted
*/

/**
  @function breaking
  @summary Pause a piece of code's execution and resume it later
  @param {Function} [block]
  @return {::SuspendedContext}
  @desc
    **Warning**: You should not use this function unless you're certain you
    need it, since it creates opportunity to leak resources if you're not careful.

    A common StratifiedJS idiom is the function which takes a "block" argument, and performs
    setup before the block is called, as well as cleanup after the block finishes.
    An example of this might be a file opening utility which ensures files are closed
    when you're finished using them:

        var withFile = function(name, mode, block) {
          var fd = fs.open(name, mode);
          try {
            block(fileWrapper(fd));
          } finally {
            fs.close(fd);
          }
        };

    Normally, this kind of API is desirable (and easy to use):

        withFile('output.txt', 'w') {|file|
          file.write("result!");
        }

        // users of `withFile` can't cause a resource leak by leaving the
        // file open - `withFile` will always close it for them.

    However, in some cases it can be useful to extract the intermediate result
    (in this case, the file object), and explicitly perform the cleanup stage
    at a later time. This is what `breaking` does.

    It will call the provided `block` with a single argument - a function to halt the
    currently executing code and save it for resuming later. Once that function is called,
    the call to `breaking` will return a [::SuspendedContext] object.

    ### Example:

        // idiomatic code - passing a block to `withFile:
        
        withFile('output.txt', 'w') {|file|
          try {
            console.log("withFile passed #{file} to the block");
            hold(1000);
            console.log("OK, done with file");
          } retract {
            console.log("withFile was cancelled, and retracted the block we passed it");
          }
        }

        // equivalent code using `breaking` to separate setup & teardown
        // into explicit functions:
        
        var ctx = func.breaking {|brk|
          withFile('output.txt', 'w') {|file|
            brk(file);
          }
        }

        waitfor {
          console.log("withFile passed #{ctx.value} to the block");
          hold(1000);
          console.log("OK, done with file");
        } or {
          ctx.wait();
          console.log("withFile was cancelled, and retracted the block we passed it");
        } finally {
          ctx.resume();
        }

    In this example, since all the block does is to call `brk`, we could pass it
    directly to `withFile`:

        var ctx = func.breaking {|brk|
          withFile('output.txt', 'w', brk);
        }

    To emulate the case where the block passed to `withFile` throws
    an error, you can pass an error object as an argument
    to `ctx.resume()`.
*/
exports.breaking = function(block) {
  var cont, stratum;
  var uncaught = Condition();
  var retracted = function() {
    if(!stratum) hold(0);
    try {
      waitfor {
        stratum.value();
      } or {
        throw uncaught.wait();
      }
    } catch(e) {
      // this should never happen, but just in case:
      if(!e instanceof exports.StratumAborted) throw e;
    }
  }
  waitfor(var err, rv) {
    var ready = resume;
    var ret = null;
    stratum = spawn (function() {
      try {
        block {|result|
          try {
            waitfor(var err) {
              var cleanup = resume;
              cont = function(block_err) {
                var err;
                if(cleanup) {
                  waitfor(err) {
                    ret = resume;
                    cleanup(block_err);
                  }
                }
                if(err) throw err;
                if(uncaught.isSet) throw uncaught.value;
              };
              var _ready = ready;
              ready = null;
              _ready(null, result);
            }
            if (err) throw err;
          } retract {
            cleanup = null;
          }
        }
      } catch(err) {
        if(ready) ready(err) // exception in block setup
        else if (ret) {
          ret(err); // exception in block teardown; reported by resume()
          ret = null;
        } else {
          // Error thrown from main body. This is rare, since the main body
          // is just waiting for a resume(). But errors can be thrown from
          // code running concurrently, e.g:
          //     waitfor { block() } and { throw error.wait() }
          uncaught.set(err);
        }
      }
      if(ret) ret();
    })();
  }
  if(err) throw err;
  return { value: rv, resume: cont, wait: retracted };
}

