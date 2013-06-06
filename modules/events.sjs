/*
 * Oni Apollo 'events' module
 * Stratified utilities for native events
 *
 * Part of the Oni Apollo Standard Module Library
 * Version: 'unstable'
 * http://onilabs.com/apollo
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
  @module    events
  @summary   Event emitter and utilities for dealing with events.
  @home      sjs:events
*/

var cutil = require('./cutil');
var seq = require('./sequence');
var sys = require('builtin:apollo-sys');

/**
  @class    Emitter
  @summary  An event emitter that can be waited upon and emitted multiple times.
*/
var BaseEmitterProto = Object.create(cutil._Waitable);

/**
  @function  Emitter.wait
  @summary   Block until the next event is emitted by this object, and return the emitted value (if given).

  @function  Emitter.emit
  @param     {optional Object} [value]
  @summary   Emit event with optional `value`
  @desc
    Resumes all strata that are waiting on this emitter object.

    If `val` is provided, it will be the return value of all
    outstanding `wait()` calls.
*/
BaseEmitterProto.toString = function toString() { return "[object Emitter]"; }


/**
   @function Emitter.restartLoop
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
  @function Emitter
*/
function Emitter() {
  var rv = Object.create(EmitterProto);
  rv.init.call(rv, arguments);
  return rv;
};
exports.Emitter = Emitter;

var EmitterProto = Object.create(BaseEmitterProto);

/**
  @class     HostEmitter
  @inherit   ::Emitter
  @summary   An [::Emitter] subclass that wraps a "host" event emitter.
  @function  HostEmitter
  @param     {ArrayElement|EventEmitter} [emitters] Object or objects to watch.
  @param     {Array|String} [events] Event name (or array of names) to watch for.
  @param     {optional Function} [filter] Function through which received
             events will be passed. An event will only be emitted if this
             function returns a value == true.
  @param     {optional Function} [transform] Function through which an
             event will be passed before passing the return value on to
             *filter* and/or emitting it.
  @desc
    A "host" event emitter is a native [nodejs EventEmitter](http://nodejs.org/api/events.html#events_class_events_eventemitter) object when running in nodejs,
    and a DOM element in the browser.

    Note that since creating a `HostEmitter` adds a listener to the
    underlying emitter, you *must* call `emitter.stop()` when you are finished
    with this object to prevent resource leaks.

    Instead of calling `stop()` explicitly, you can pass this object to a
    `using` block, e.g.:

        using (var click = cutil.HostEmitter(elem, 'click')) {
          click.wait();
          console.log("Thanks for clicking!");
        }

    ### Notes

    * If the underlying event emitter passes a single argument to listener functions,
      this argument will be returned from `wait()`. But if multiple arguments are passed
      to the listener, an array of all arguments will be returned from `wait()`.

    * In the browser, [xbrowser/dom::attachEvent] is used to bind the event
      listener - so you can prefix events with "!" to have the event fire
      during the "capture" phase.

    * If using a [::Queue] or [::Stream], events may be held for some time before
      they get handled. So calls that influence the internal handling of the event
      (such as [dom::stopEvent]), should be called from the `transform` function,
      rather than after the event is retrieved.

    * IE multiplexes all events onto a global event object. To ensure events 
      are the same events that were put in, the implementation 
      clones events on IE before emitting them. 
      This means that calls such as [dom::stopEvent] will **never** work on IE if 
      performed on the return value of [::HostEmitter::wait]. To have any effect, these
      calls must be performed from the `transform` function.
*/
function HostEmitter(emitter, event) {
  var rv = Object.create(HostEmitterProto);
  rv.init.apply(rv, arguments);
  return rv;
};
exports.HostEmitter = HostEmitter;
exports.from = HostEmitter;

var HostEmitterProto = Object.create(BaseEmitterProto);
HostEmitterProto.init = function(emitters, events, filter, eventTransformer) {
  BaseEmitterProto.init.call(this);
  this.emitters = sys.expandSingleArgument([emitters]);
  this.events = sys.expandSingleArgument([events]);
  var self = this;
  this._handleEvent = function(val) {
    var arg = (arguments.length == 1) ? val : Array.prototype.slice.call(arguments);
    if (eventTransformer)
      arg = eventTransformer(arg);
    if (filter && !filter(arg)) return;
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
    object. [::HostEmitter.__finally__] is an alias for this method,
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
  @summary Alias for [::HostEmitter.stop]
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
  var {addListener, removeListener} = require('sjs:xbrowser/dom');
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
  @summary Wait for a single event only.
  @param     {ArrayElement|EventEmitter} [emitters] Object or objects to watch.
  @param     {Array|String} [events] Event name (or array of names) to watch for.
  @param     {optional Function} [filter] Function through which received
             events will be passed. An event will only be emitted if this
             function returns a value == true.
  @param     {optional Function} [eventTransformer] Function through which an
             event will be passed before passing the return value on to
             *filter* and/or emitting it.
  @desc
    This function waits for a single event and then stops
    listening for further events. It takes exactly the same arguments
    as [::HostEmitter].
    
    A call to this function:
    
        var result = events.wait(emitter, eventName);
    
    is essentially a shortcut for the following code:

        var e = events.HostEmitter(emitter, eventName);
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
  @class Queue
  @summary Watches an [::Emitter] and stores its events in a queue.

  @function  Queue
  @summary Constructs a new event queue.
  @return  {::Queue}
  @param   {Emitter|Object} [source] [::HostEmitter], [::Emitter] or host object.
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

        var events = require('sjs:events');

        using (var Q = events.Queue(emitter)) {
          while (true) {
            var data = Q.get();
            ...
          }
        }

    Here the `using` construct will automatically call
    [::Queue::stop] when the `using` code
    block is exited.

    By default, stopping an event queue will also call `stop` on the underlying
    event emitter (if it has such a method). To avoid this behvaiour, set `opts.bound` to false.

    ### Shorthand for host events:

    Normally, you would pass a [::Emitter] or [::HostEmitter] as the `source` argument. For convenience,
    you may use the following shortcut to create a queue directly from a host event emitter:

        var q = events.Queue(emitter, 'click');
        // equivalent to:
        // var q = events.queue(events.HostEmitter(emitter, 'click'));
        
        // or:
        
        var q = events.Queue(emitter, ['click', 'drag']);
        // equivalent to:
        // var q = events.Queue(events.HostEmitter(emitter, ['click', 'drag']));

    If you need to pass additional arguments to [::HostEmitter] or pass settings to [::Queue], you'll need to use
    the longer form.
*/
function Queue(source, opts) {
  var rv = Object.create(QueueProto);
  rv.init.apply(rv, arguments);
  return rv;
}
exports.Queue = Queue;

var QueueProto = {
  init: function(source, opts) {
    if (Array.isArray(opts) || typeof(opts) == 'string') {
      // Queue(emitter, events) is shorthand for:
      // Queue(HostEmitter(emitter, events))
      source = HostEmitter(source, opts);
      opts = {bound: true};
    }
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
    self.events = seq.Stream {|emit|
      while(true) {
        emit(self.get());
      }
    };

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
       See 'More information' section under [::Queue]
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
      See 'More information' section under [::Queue].
  */
QueueProto.__finally__ = QueueProto.stop;



/**
   @function Stream
   @param {::Emitter} [emitter]
   @return {sequence::Stream}
   @summary  Builds a continuous stream from an [::Emitter]'s events.
   @desc
      Up to one event is buffered - that is, if you call:

          emitter .. events.Stream .. seq.each {|event|
            doSomething(event);
          }

      If multiple events are emitted while `doSomething` is executing, all but the
      most recent will be skipped.

      It will also skip any events that occur *before* you start iterating over its result.

      **Note**: the generated stream will never complete - it will continue waiting
      for futher events until retracted.

      ### Example:

          // Assume dataStore.recordAdded is an [::Emitter] object
          // which emits the record each time a new record is added.
          
          var newRecord = dataStore.recordAdded;
          
          var people = events.Stream(newRecord) .. filter(p -> p.isPerson());
          var firstTenPeople = people .. take(10);
*/
var noop = () -> null;
function Stream(emitter) {
  return seq.Stream(function(emit) {
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
};
exports.Stream = Stream;

