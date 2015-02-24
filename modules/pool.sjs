/*
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.20.0-development'
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2014 Oni Labs, http://onilabs.com
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
  @module    pool
  @summary   Utilities for shared resources
*/


@ = require(['sjs:cutil']);
@assert = {
  ok: function(o) { if(!o) throw new Error("Assertion failed"); return o },
};

/**
  @function sharedContext
  @param {optional Settings} [opts]
  @param {Function} [fn] context function
  @setting {Number} [delay] hold onto last resource for `delay` milliseconds before disposing
  @setting {Function} [log] function to log status messages
  @setting {String} [name] name to use in log messages
  @return {Function}
  @summary Create a function which acts like `fn`, but shares a single resource between concurrent calls
  @desc
    A "context" function is one which takes a block, and performs setup / cleanup
    around the invocation of that block. For example:

        function withResource(block) {
          var resource = // <acquire resource>
          try {
            block(resource);
          } finally {
            // <clean up>
          }
        }
      
    Such functions are idiomatic in StratifiedJS for managing resources (e.g. [./nodejs/fs::withReadStream]).

    In some circumstances, the "resource" passed to the block can be used in multiple places,
    as long as the block is still running.

    Given a function like `withResource` above, `sharedContext` returns a similar function which
    can be called concurrently by multiple users. Regardless of how many concurrent users there are,
    it will invoke the underlying `withResource` function only once, invoking each user-supplied block
    with the same (shared) `resource`. Only after all user-supplied blocks are complete, the block passed
    to `withResource` will also complete, allowing cleanup to occur. After all concurrent users
    have completed, the next call to the returned function will invoke `fn` to re-acquire
    the resource.

    **Note**: The function returned by `sharedContext` accepts only one argument - the block.
    If your context function requires additional arguments, you should wrap it in
    a function which only requires a single argument, e.g:

        sharedContext(opts, block -> contextFn(arg1, arg2, block));

    ### Options:

    If `delay` is given, the resource will be kept open for `delay` milliseconds after
    last use before cleanup occurs. If the function returned by `sharedContext` is invoked
    before this time expires, the current resource will be re-used instead of invoking
    `fn` anew. This allows you to store a resource for some time, and only perform
    re-initialization if the resource has not been used for a set time.

    Note: if `delay` is provided, any exceptions thrown by `fn`'s cleanup code
    will be uncaught (and will terminate thr process). If using `delay`, you should
    not use a `fn` which may throw an exception from its cleanup code.
*/

var noop = -> null;
exports.sharedContext = function(opts, fn) {
  if(arguments.length === 1) {
    fn = opts;
    opts = {};
  }
  var shared = @Condition();
  var reap = null;
  var users = 0;
  var cancelReap = noop;
  var log = opts.log || noop;
  var name = opts.name || 'ctx';

  var reap = function(ok, ctx) {
    log(`$name unused - destroying`);
    shared.clear();
    if(ok) {
      ctx.resume();
      log(`destroyed $name`);
    }
  };

  var beginReap = function() {
    var [ok, ctx] = shared.value;
    if(!ok) return reap(ok, ctx);
    spawn(function() {
      // NOTE: errors thrown here will be uncaught
      waitfor {
        waitfor() {
          cancelReap = resume;
        }
        log(`$name cleanup cancelled by new use`);
        cancelReap = noop;
      } or {
        log(`$name unused - waiting ${opts.delay}ms`);
        hold(opts.delay);
        cancelReap = noop;
        collapse;
        reap(ok, ctx);
      }
    }());
  };
  
  if(!opts.delay) {
    // if no delay set, clean up resource immediately
    beginReap = function() {
      log(`$name unused - destroying immediately`);
      reap.apply(null, shared.value);
    }
  }

  return function(block) {
    var ok, ctx;
    log(`Acquiring shared $name ($users current users)`);
    try {
      if((users++) === 0) {
        // first one in
        if(shared.isSet) {
          // save a previous context from garbage collection
          cancelReap();
          [ok, ctx] = shared.value;
          ok .. @assert.ok();
        } else {
          // create a new context
          try {
            ctx = @breaking(brk -> fn(brk));
            shared.set([true, ctx]);
          } catch(e) {
            shared.set([false, e]);
            throw e;
          }
        }
      } else {
        ;[ok, ctx] = shared.wait();
        if(!ok) throw ctx;
      }

      log(`Acquired shared $name`);
      waitfor {
        block(ctx.value);
      } or {
        ctx.wait();
      }
    } finally {
      log(`Dropping shared $name - ${users-1} users left`);
      if((--users) === 0) {
        // last one out
        if(shared.isSet) beginReap();
      }
    }
    
  };
}


