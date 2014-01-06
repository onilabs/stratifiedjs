/*
 * StratifiedJS 'event' module
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.15.0-1-development'
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2013 Oni Labs, http://onilabs.com
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
  @module    event
  @summary   Event emitter and utilities for dealing with events.
  @home      sjs:event
  @require   sjs:xbrowser/dom
  @desc
    This module deals with two sources of events:

    ### Explicitly triggered  events:
    
    To create an event that your code will trigger, use [::Emitter].
    Emitters have the `emit(value)` method, which is used to trigger the event.

    ### Wrapped external events:

    To respond to events on a DOM object or a nodejs EventEmitter, you should
    use [::HostEmitter]. This creates a [::BaseEmitter] for the underlying
    events, which means they can be used just like [::Emitter] objects.

    Utility functions `wait` and `when` are provided for responding to
    external events in a more concise way than building a [::HostEmitter].
*/

var cutil = require('./cutil');
var seq = require('./sequence');
var sys = require('builtin:apollo-sys');

/**
  @class    BaseEmitter
  @summary  The base class shared by both [::Emitter] and [::HostEmitter].

  @function  BaseEmitter.wait
  @summary   Block until the next event is emitted by this object, and return the emitted value (if given).


  @class    Emitter
  @inherit  BaseEmitter
  @summary  An emitter for manually triggered events.

  @function  Emitter.emit
  @param     {optional Object} [value]
  @summary   Emit event with optional `value`
  @desc
    Resumes all strata that are waiting on this emitter object.

    If `val` is provided, it will be the return value of all
    outstanding `wait()` calls.
*/
var BaseEmitterProto = Object.create(cutil._Waitable);

BaseEmitterProto.toString = function toString() { return "[object Emitter]"; }


/**
   @function BaseEmitter.restartLoop
   @altsyntax emitter.restartLoop { || ... }
   @param {Function} [f] Function to execute
   @summary (Re-)start a function everytime an event is emitted
   @desc
     The code

         emitter.restartLoop {
           ||
           some_code
         }

     is equivalent to

         while (1) {
           waitfor {
             emitter.wait();
           }
           or {
             some_code
             hold();
           }
         }
*/
BaseEmitterProto.restartLoop = function restartLoop(f) {
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
  @function  BaseEmitter.queue
  @summary Constructs a queue of this emitter's events.
  @return  {::Queue}
  @param   {Settings} [opts]
  @setting {Number} [capacity] Maximum number of events to buffer in the queue (default 100). Events will be dropped if the queue grows beyond this size. For each dropped event an exception will be reported in the console.
  @setting {Boolean} [bound] Whether to `stop` the underlying emitter when this Queue is stopped (default `true`).
  @desc
    The returned [::Queue] object proceeds to listen for
    events immediately in the background, and continues to do so until
    [::Queue::stop] is called.

    Alternatively, because [::Queue] implements a
    [::Queue::__finally__] method, it can be used in a
    `using` block:

        using (var q = emitter.queue()) {
          while (true) {
            var data = q.get();
            ...
          }
        }

    Here the `using` construct will automatically call
    [::Queue::stop] when the `using` code
    block is exited.

    By default, stopping an event queue will also call `stop` on the original
    event emitter. To avoid this behvaiour, set `opts.bound` to false.
*/
BaseEmitterProto.queue = function(opts) {
  var rv = Object.create(QueueProto);
  rv.init(this, opts);
  return rv;
};

/**
   @function BaseEmitter.stream
   @return {sequence::Stream}
   @summary  Create a continuous stream from this emitter's events.
   @desc
      Up to one event is buffered - that is, if you call:

          emitter.stream() .. seq.each {|event|
            doSomething(event);
          }

      If multiple events are emitted while `doSomething` is executing, all but the
      most recent will be skipped.

      It will also skip any events that occur *before* you start iterating over its result.

      **Note**: the generated stream will never complete - it will continue waiting
      for futher events until retracted.

      ### Example:

          // Assume dataStore.recordAdded is a [::BaseEmitter] object
          // which emits the record each time a new record is added.
          
          var newRecord = dataStore.recordAdded;
          
          var people = newRecord.stream() .. filter(p -> p.isPerson());
          var firstTenPeople = people .. take(10);

      The returned stream will have a `__finally_` method that simply calls
      this emitter's finally method, if this emitter has a __finally__ method.
*/
var noop = () -> null;
BaseEmitterProto.stream = function() {
  var emitter = this;
  var rv = seq.Stream(function(emit) {
    var hasItem = false;
    var current = null;
    var collect = noop;
    waitfor {
      // buffer is synchronous, so we won't miss any events
      while(true) {
        current = emitter.wait();
        hasItem = true;
        spawn(collect());
      }
    } and {
      while(true) {
        collect = noop;
        while(hasItem) {
          hasItem = false;
          emit(current); // may block
        }
        waitfor() {
          collect = resume
        }
      }
    }
  });
  if (emitter.__finally__) rv.__finally__ = -> emitter.__finally__();
  return rv;
};

/**
  @function  BaseEmitter.when
  @summary   Run a function each time an event occurs
  @param     {optional Settings} [opts]
  @param     {Function} [block]
  @setting   {Boolean}  [queue] Queue events
  @desc
    This function waits indefinitely (or until retracted) for events
    from the given source, and calls `block(e)` as each event arrives.

    By default, events will be dealt with synchronously - any events that
    occur during a call to `block(e)` will be missed if `block` suspends.
    However, if you set `opts.queue` to `true`, events will be buffered
    in a [::Queue] until they can be processed.

    **Note:** Unlike [::when], this function will not automatically call
    `__finally__` on the underlying emitter upon completion. This only
    matters for [::HostEmitter] objects, since [::Emitter]s have no
    `__finally__` method.
*/
BaseEmitterProto.when = function(options, block) {
  if (block === undefined) {
    block = options;
    options = {};
  }

  if (options.queue) {
    using(var q = this.queue({bound:false})) {
      while (true) {
        block(q.get());
      }
    }
  }
  else {
    while(true) {
      block(this.wait());
    }
  }
};

/**
  @function Emitter
*/
__js {
  function Emitter() {
    var rv = Object.create(EmitterProto);
    rv.init.call(rv, arguments);
    return rv;
  };
  exports.Emitter = Emitter;

  var EmitterProto = Object.create(BaseEmitterProto);
}

/**
  @class     HostEmitter
  @inherit   ::BaseEmitter
  @summary   A [::BaseEmitter] subclass that wraps a "host" event emitter.
  @function  HostEmitter
  @param     {Array|Object} [emitters] Host object or objects to watch (DOMElement or nodejs EventEmitter).
  @param     {Array|String} [events] Event name (or array of names) to watch for.
  @param     {optional Settings} [settings]
  @setting   {Function} [filter] Function through which received
             events will be passed. An event will only be emitted if this
             function returns a value == true.
  @setting   {Function} [handle] A handler function to call directly on the event.
  @setting   {Function} [transform] Function through which an
             event will be passed before filtering.
  @desc
    A "host" event emitter is a native [nodejs EventEmitter](http://nodejs.org/api/events.html#events_class_events_eventemitter) object when running in nodejs,
    and a DOM element in the browser.

    Note that since creating a `HostEmitter` adds a listener to the
    underlying emitter, you *must* call `emitter.stop()` to prevent resource leaks.

    Instead of calling `stop()` explicitly, you can pass this object to a
    `using` block, e.g.:

        using (var click = cutil.HostEmitter(elem, 'click')) {
          click.wait();
          console.log("Thanks for clicking!");
        }

    ### Notes

    * In the browser, you typically want to pass [sjs:xbrowser/dom::preventDefault] or
      [sjs:xbrowser/dom::stopPropagation] if you are handling this event yourself.

    * If the underlying event emitter passes a single argument to listener functions,
      this argument will be returned from `wait()`. But if multiple arguments are passed
      to the listener, an array of all arguments will be returned from `wait()`.

    * In the browser, [xbrowser/dom::addListener] is used to bind the event
      listener - so you can prefix events with "!" to have the event fire
      during the "capture" phase.

    * If using a [::BaseEmitter::queue] or [::BaseEmitter::stream], events may be held for some time before
      they get handled. So calls that influence the internal handling of the event
      (such as [xbrowser/dom::stopEvent]), should be called from the `handle` function,
      rather than after the event is retrieved.

    * IE multiplexes all events onto a global event object. To ensure events
      are the same events that were put in, the implementation
      clones events on IE before emitting them.
      This means that calls such as [xbrowser/dom::stopEvent] will **never** work on IE if
      performed on the return value of [::BaseEmitter::wait]. To have any effect, these
      calls must be performed from the `handle` function.

    * You should only need to use the `transform` setting in rare cases. This
      setting is primarily for use when you need to attach additional custom
      information to an event before it can be filtered. It is not the place
      for calling things like `e.preventDefault`, as it runs *before* any event filter.

*/
function HostEmitter(emitter, event) {
  var rv = Object.create(HostEmitterProto);
  rv.init.apply(rv, arguments);
  return rv;
};
exports.HostEmitter = HostEmitter;
exports.from = HostEmitter;

var HostEmitterProto = Object.create(BaseEmitterProto);
HostEmitterProto.init = function(emitters, events, opts) {
  BaseEmitterProto.init.call(this);
  if (arguments.length > 3 || typeof(opts) === 'function') {
    throw new Error('HostEmitter()\'s filter & transform arguments have been moved into a settings object');
  }
  this.emitters = sys.expandSingleArgument([emitters]);
  this.events = sys.expandSingleArgument([events]);

  var transform, filter, handle;
  if (opts)
    var {transform, filter, handle} = opts;

  var self = this;
  this._handleEvent = function(val) {
    var arg = (arguments.length == 1) ? val : Array.prototype.slice.call(arguments);
    if (transform) arg = transform(arg) || arg;
    if (filter && !filter(arg)) return;
    if (handle) handle(arg);
    if (this._transformEvent) arg = this._transformEvent(arg);
    self.emit(arg);
  };
  this._stopped = false;
  this._start();
}

HostEmitterProto._start = function() {
  this.emitters .. seq.each {|emitter|
    this.events .. seq.each {|event|
      this._listen(emitter, event, this._handleEvent);
    }
  }
};

/**
  @function HostEmitter.stop
  @summary Stop listening for events
  @desc
    You must call this method when you are finished with this
    object. [::HostEmitter::__finally__] is an alias for this method,
    so you can pass this object into a `using` block to avoid
    having to explicitly call `stop()`.
*/
HostEmitterProto.stop = function() {
  if (this._stopped) return;
  this.emitters .. seq.each {|emitter|
    this.events .. seq.each {|event|
      this._unlisten(emitter, event);
    }
  }
};

/**
  @function HostEmitter.__finally__
  @summary Alias for [::HostEmitter::stop]
  @desc
    This alias allows you to pass a [::HostEmitter] instance to
    a `using` block rather than explicitly calling `stop` when
    you are finished with it.
*/
HostEmitterProto.__finally__ = HostEmitterProto.stop;

if (sys.hostenv == 'nodejs') {
  HostEmitterProto._listen = function(emitter, event) {
    emitter.on(event, this._handleEvent);
  }
  HostEmitterProto._unlisten = function(emitter, event) {
    emitter.removeListener(event, this._handleEvent);
  }
} else {
  // xbrowser
  var {addListener, removeListener } = require('sjs:xbrowser/dom');
  HostEmitterProto._listen = function(emitter, event) {
    addListener(emitter, event, this._handleEvent);
  }
  HostEmitterProto._unlisten = function(emitter, event) {
    removeListener(emitter, event, this._handleEvent);
  }
  if (__oni_rt.UA == 'msie') {
    HostEmitterProto._transformEvent = function(evt) {
      var ret = {};
      for (var p in evt) {
        ret[p] = evt[p];
      }
      return ret;
    }
  }
}


/**
  @function wait
  @summary Wait for a single firing of a DOM or nodejs event.
  @param     {Array|Object} [emitters] Host object or objects to watch (DOMElement or nodejs EventEmitter).
  @param     {Array|String} [events] Event name (or array of names) to watch for.
  @param     {optional Settings} [settings]
  @setting   {Function} [filter] Event filter, as for [::HostEmitter]
  @setting   {Function} [handle] Event handler, as for [::HostEmitter]
  @setting   {Function} [transform] Event transformer, as for [::HostEmitter]
  @desc
    This function waits for a single event and then stops
    listening for further events. It takes exactly the same arguments
    as [::HostEmitter].
    
    A call to this function:
    
        var result = event.wait(emitter, eventName);
    
    is essentially a shortcut for the following code:

        var e = event.HostEmitter(emitter, eventName);
        var result = e.wait();
        e.stop();
*/
function wait() {
  var emitter = HostEmitter.apply(null, arguments);
  try {
    var result = emitter.wait();
  } finally {
    emitter.stop();
  }
  return result;
};
exports.wait = wait;

/**
  @function  when
  @summary   Run a function each time an event occurs
  @param     {Array|Object} [emitters] Host object or objects to watch (DOMElement or nodejs EventEmitter).
  @param     {Array|String} [events] Event name (or array of names) to watch for.
  @param     {optional Settings} [opts]
  @param     {Function} [block]
  @setting   {Boolean}  [queue] Queue events
  @setting   {Function} [filter] Event filter, as for [::HostEmitter]
  @setting   {Function} [handle] Event handler, as for [::HostEmitter]
  @setting   {Function} [transform] Event transformer, as for [::HostEmitter]
  @desc
    This function waits indefinitely (or until retracted) for events
    from the given source, and calls `block(e)` as each event arrives.

    By default, events will be dealt with synchronously - any events that
    occur during a call to `block(e)` will be missed if `block` suspends.
    However, if you set `opts.queue` to `true`, events will be buffered
    in a [::Queue] until they can be processed.
*/
var when = exports.when = function(emitters, events, options, block) {
  if (arguments.length < 4) {
    block = options;
    options = {};
  }
  var host_emitter = HostEmitter(emitters, events, options);
  using (host_emitter) {
    host_emitter.when(options, block);
  }
};

/**
  @class Queue
  @summary The return value of [::BaseEmitter::queue].
*/
var QueueProto = {
  init: function(source, opts) {
    var opts = opts || {};
    var capacity = opts.capacity;
    if (capacity == null) capacity = 100;
    this._queue = new cutil.Queue(capacity, true);
    this.source = source;
    this.bound = opts.bound !== false; // default to true
    var self = this;
    self._strata = spawn(function() {
      while(true) {
        var next = self.source.wait();
        if (self._queue.count() == capacity) {
          // We've exceeded the capacity of the queue and we need to
          // drop events.  
          // XXX should we treat this as fatal??
          // At least make sure there'll be a warning appearing in the
          // console (note the 'spawn' which ensures that the 'throw'
          // doesn't abort this stratum):
          spawn (function(ev) { throw new Error("Dropping event #{ev}") })(next);
        }
        else
          self._queue.put(next);
      }
    }());
  },

  /**
    @function Queue.count
    @summary  Returns current number of events in the queue.
    @return   {Integer}
   */
  count: function() {
    return this._queue.count();
  },

  /**
    @function  Queue.get
    @summary   Retrieve the next event from the queue; blocks if the queue is empty.
               Safe to be called from multiple strata concurrently.
    @return {Array} event data retrieved from head of queue.
   */
  get: function() {
    return this._queue.get();
  },

  /**
    @function  Queue.stop
    @summary   Stop listening for events.
    @desc
       See the 'More information' section under [::BaseEmitter::queue]
       for an alternative to calling [::Queue::stop]
       manually.
   */
  stop: function() {
    if (this._strata) {
      this._strata.abort();
      this._strata = null;
    }
    if (this.bound && this.source.stop) this.source.stop();
  },
};

/**
  @function  Queue.__finally__
  @summary   Calls [::Queue::stop].
              Allows Queue to be used a `using` construct.
  @desc
      See 'More information' section under [::BaseEmitter::queue].
  */
QueueProto.__finally__ = QueueProto.stop;

