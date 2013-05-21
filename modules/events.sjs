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
  @summary   Stratified utilities for native events and [cutil::Event] objects.
  @home      sjs:events
*/

var cutil = require('./cutil');
var seq = require('./sequence');
var sys = require('builtin:apollo-sys');

/**
  @class     HostEvent
  @summary   A [cutil::Event] subclass that wraps a "host" event emitter.
  @function  HostEvent
  @param     {ArrayElement|EventEmitter} [emitters] Object or objects to watch.
  @param     {Array|String} [events] Event name (or array of names) to watch for.
  @param     {optional Function} [filter] Function through which received
             events will be passed. An event will only be emitted if this
             function returns a value == true.
  @param     {optional Function} [transform] Function through which an
             event will be passed before passing the return value on to
             *filter* and/or emitting it.
  @desc
    A "host" event emitter is an `EventEmitter` object when running in nodejs,
    and a DOM element in the browser.

    Note that since creating a `HostEvent` adds a listener to the
    underlying emitter, you *must* call `event.stop()` when you are finished
    with this object to prevent resource leaks.

    Instead of calling `stop()` explicitly, you can pass this object to a
    `using` block, e.g.:

        using (var click = cutil.HostEvent(elem, 'click')) {
          click.wait();
          console.log("Thanks for clicking!");
        }

     * In the browser, [xbrowser/dom::attachEvent] is used to bind the event
       listener - so you can prefix events with "!" to have the event fire
       during the "capture" phase.
*/
function HostEvent(emitter, event) {
  var rv = Object.create(HostEventProto);
  rv.init.apply(rv, arguments);
  return rv;
};
exports.HostEvent = HostEvent;
exports.from = HostEvent;

var HostEventProto = Object.create(cutil._BaseEventProto);
HostEventProto.init = function(emitters, events, filter, eventTransformer) {
  cutil._BaseEventProto.init.call(this);
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

HostEventProto._start = function() {
  this.emitters .. seq.each {|emitter|
    this.events .. seq.each {|event|
      this._listen(emitter, event, this._handleEvent);
    }
  }
};

/**
  @function HostEvent.stop
  @summary Stop listening for events
  @desc
    You must call this method when you are finished with this
    object. [::HostEvent.__finally__] is an alias for this method,
    so you can pass this object into a `using` block to avoid
    having to explicitly call `stop()`.
*/
HostEventProto.stop = function() {
  if (this._stopped) return;
  this.emitters .. seq.each {|emitter|
    this.events .. seq.each {|event|
      this._unlisten(emitter, event);
    }
  }
};

/**
  @function HostEvent.__finally__
  @summary Alias for [::HostEvent.stop]
  @desc
    This alias allows you to pass a [::HostEvent] instance to
    a `using` block rather than explicitly calling `stop` when
    you are finished with it.
*/
HostEventProto.__finally__ = HostEventProto.stop;

if (sys.hostenv == 'nodejs') {
  HostEventProto._listen = function(emitter, event) {
    emitter.on(event, this._handleEvent);
  }
  HostEventProto._unlisten = function(emitter, event) {
    emitter.removeListener(event, this._handleEvent);
  }
} else {
  // xbrowser
  var {addListener, removeListener} = require('sjs:xbrowser/dom');
  HostEventProto._listen = function(emitter, event) {
    addListener(emitter, event, this._handleEvent);
  }
  HostEventProto._unlisten = function(emitter, event) {
    removeListener(emitter, event, this._handleEvent);
  }
  if (__oni_rt.UA == 'msie') {
    HostEventProto._transformEvent = function(evt) {
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
    as [::HostEvent].
    
    A call to this function:
    
        var result = event.wait(emitter, eventName);
    
    is essentially a shortcut for the following code:

        var e = event.HostEvent(emitter, eventName);
        var result = e.wait();
        e.stop();
*/
function wait() {
  var event = HostEvent.apply(null, arguments);
  try {
    var result = event.wait();
  } finally {
    event.stop();
  }
  return result;
};
exports.wait = wait;


/**
  @class Queue
  @summary Listens for specified events and stores them in a queue.

  @function  Queue
  @summary Constructs a new event queue.
  @return  {::Queue}
  @param   {Event|Object} [source] [::HostEvent], [cutil::Event] or host object.
  @param   {Settings} [opts]
  @setting {Number} [capacity] Maximum number of events to buffer in the queue (default 100).
  @setting {Boolean} [bound] Whether to `stop` the underlying event when this Queue is stopped (default `true`).
  @desc

    The returned [::Queue] object proceeds to listen for
    events immediately in the background, and continues to do so until
    [::Queue::stop] is called.

    Alternatively, because [::Queue] implements a
    [::Queue::__finally__] method, it can be used in a
    `using` block:

        var event = require('sjs:event');

        using (var Q = events.Queue(event)) {
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

    Normally, you would pass a [cutil::Event] or [::HostEvent] as the `source` argument. For convenience,
    you may use the following shortcut to create a queue directly from a host event emitter:

        var q = events.Queue(emitter, 'click');
        // equivalent to:
        // var q = events.queue(events.hostevent(emitter, 'click'));
        
        var q = events.Queue(emitter, ['click', 'drag']);
        // equivalent to:
        // var q = events.Queue(events.HostEvent(emitter, ['click', 'drag']));

    If you need to pass additional arguments to [::HostEvent] or pass settings to [::Queue], you'll need to use
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
      // Queue(HostEvent(emitter, events))
      source = HostEvent(source, opts);
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
        spawn(self._queue.put(next));
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
   @function Event.stream
   @param {optional Number} [maxSize] Maximum number of events to buffer.
   @return {sequence::Stream}
   @summary  Builds a continuous stream from this event's emissions.
   @desc
      Up to one event is buffered - that is, if you call:

          eventSource.stream .. seq.each {|event|
            doSomething(event);
          }

      If multiple events are emitted while `doSomething` is executing, all but the
      most recent will be skipped.

      It will also skip any events that occur *before* you start iterating over its result.

      **Note**: the generated stream will never complete - it will continue waiting
      for futher events until retracted.

      ### Example:

          // Assume dataStore.recordAdded is a `cutil.Event` object
          // which emits the record each time a new record is added.
          
          var newRecord = dataStore.recordAdded;
          
          var people = eventStream(newRecord) .. filter(p -> p.isPerson());
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

