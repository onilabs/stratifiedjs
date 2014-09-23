/*
 * StratifiedJS 'event' module
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.20.0-development'
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
    This module provides abstractions around *event streams* ([::EventStream]), 
    which are a type of [./sequence::Stream] composed of discrete events.

    ### Explicitly triggered  events:
    
    To create an event stream that is composed of programatically triggered 
    events, this module provides the function [::Emitter].
    Emitters are [::EventStream]s that have an `emit(value)` method, 
    which is used to explicitly trigger events.

    ### External events:

    To respond to events on a DOM object or a nodejs EventEmitter, this module
    provides the function [::events].

*/

var cutil = require('./cutil');
var seq = require('./sequence');
var sys = require('builtin:apollo-sys');

//----------------------------------------------------------------------

/**
   @class EventStream
   @inherit sjs:sequence::Stream
   @summary A stream with 'event' semantics
   @desc
     A stream is said to be an "event stream" if it consists of a *temporal*
     sequence of discrete values. In contrast to an [sjs:observable::Observable], 
     event streams do not have the concept of a 'current' value, i.e. calling [sjs:sequence::first] on 
     an event stream is not guaranteed to yield a value in a finite time. 

     Furthermore, 
     event streams are 'free running' and do not perform any buffering: if an
     event is emitted while the downstream receiver is blocked, the event will be lost. For web applications this implies that it is generally not safe to share event streams between client and server without some form of buffering (e.g. [sjs:sequence::tailbuffer]).

     To wait for a single occurance of an event, you can call [::wait].

*/

//----------------------------------------------------------------------

/**
   @class Emitter
   @inherit ::EventStream
   @summary An [::EventStream] with an `emit` function

   @function Emitter

   @function Emitter.emit
   @param {Object} [event] Event value to emit.
   @summary Emit a event value
*/
function Emitter() {
  var listeners = [];
  
  var rv = seq.Stream(function(receiver) {
    while(1) {
      waitfor(var val) {
        listeners.push(resume);
      }
      // could clean up listener under retraction, but benign to just
      // leave it; it's an uncommon case
      receiver(val);
    }
  });

  __js rv.emit = function(val) {
    var _listeners = listeners;
    listeners = [];
    // because rv.emit is encoded as __js, the following is equivalent to a 'spawn':
    for (var i=0,l=_listeners.length; i<l; ++i)
      _listeners[i](val);
  }

  return rv;
}
exports.Emitter = Emitter;


//----------------------------------------------------------------------

/**
   @function events
   @summary  An [::EventStream] of DOMElement or nodejs EventEmitter events. 
   @param    {Array|Object} [emitters] (Array of) DOMElement(s) or nodejs EventEmitters on which to listen for events.
   @param    {Array|String} [events] (Array of) event name(s) to listen for.
   @param    {optional Settings} [settings]
   @setting  {Function} [filter] Function through which received events 
             will be passed. An event will only be emitted if this 
             function returns a truthy value.
   @setting  {Function} [handle] A handler function to call directly on the event,
             if it hasn't been filtered (by virtue of `filter` returning a falsy value).
   @setting  {Function} [transform] Function through which an event will be passed
             before filtering.
   @return   {::EventStream} 
   @desc

    ### Notes

    * If the underlying event emitter passes a single argument to listener functions,
      the event stream will be composed of these single values. But if multiple arguments are passed
      to the listener, the event stream will be composed of *array* of all arguments.

    * In the browser, [xbrowser/dom::addListener] is used to bind the event
      listener - so you can prefix events with "!" to have the event fire
      during the "capture" phase.

    * When iterating over events (with [sjs:sequence::each]), as per [::EventStream] semantics, some of the events 
      might not be passed on to the downstream (if the downstream is blocked while an event arrives), or might only 
      be handled by the downstream asynchronously after some delay (e.g. if a [sjs:sequence::tailbuffer]) is used.
      So calls that influence the internal handling of the event
      (such as [sjs:xbrowser/dom::stopEvent], [sjs:xbrowser/dom::preventDefault] or [sjs:xbrowser/dom::stopPropagation]), 
      should be called from the `handle` function, rather than in a downstream iteration loop.

    * IE multiplexes all events onto a global event object. To ensure events
      are the same events that were put in, the implementation
      clones events on IE before emitting them.
      This means that calls such as [xbrowser/dom::stopEvent] will **never** work on IE if
      performed on elements of the emitted stream. To have any effect, these
      calls must be performed from the `handle` function.

    * You should only need to use the `transform` setting in rare cases. This
      setting is primarily for use when you need to attach additional custom
      information to an event before it can be filtered. It is not the place
      for calling things like `e.preventDefault`, as it runs *before* any event filter.
*/
function events(emitters, events, opts) {
  return seq.Stream(function(receiver) {
    var host_emitter = HostEmitter(emitters, events, opts);
    try {
      while (true) {
        receiver(host_emitter.wait());
      }
    }
    finally {
      host_emitter.__finally__();
    }
  });
}
exports.events = events;


/**
   @function wait
   @param {./sequence::Stream|Object} [stream_or_emitter]
   @param {optional any} [...] Optional `filter` function, if first argument is a [./sequence::Stream], 
                               otherwise additional arguments as for [::events].
   @summary Wait for an event or the first item of a [./sequence::Stream]
   @desc
     This function is polymorphic:

     ### Use with [./sequence::Stream]s
     
     If `stream_or_emitter` is a [./sequence::Stream] and no other arguments are provided, this function acts like
     [./sequence::first], awaiting and returning the first emitted
     item from the stream. 

     If, in addition to the first argument, a second argument `filter` 
     is provided, `wait` acts like [./sequence::find], returning the
     first item in the stream for which `filter(item)` is truthy.

     In either case, `wait` raises a [./sequence::SequenceExhausted] 
     error if the stream ends before a (matching) event is emitted.

     #### Example

         // wait for first emitted event
         some_event_stream .. @wait; 

         // wait for first emitted event that has a member foo = 'bar'
         some_event_stream .. @wait(ev -> ev.foo == 'bar');


     ### Use with DOM or nodejs event emitters

     If `stream_or_emitter` is not a [./sequence::Stream], this method passes all arguments through to 
     [::events] to create an event stream, then acts like
     calling [./sequence::first] on that stream.

     #### Example

         button .. @events('click') .. @wait();
         // equivalent to
         button .. @wait('click');
*/
var wait = exports.wait = function(stream /*,...*/) {
  if (!seq.isStream(stream)) {
    stream = events.apply(null, arguments);
  }
  else if (arguments.length > 1)
    return seq.find(stream, arguments[1]);

  return seq.first(stream);
};

//----------------------------------------------------------------------
// EVERYTHING BELOW IS DEPRECATED


/* -- not part of documentation --
  @class     HostEmitter
  @summary   wraps a "host" event emitter.
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

        using (var click = HostEmitter(elem, 'click')) {
          click.wait();
          console.log("Thanks for clicking!");
        }
*/
function HostEmitter(emitter, event) {
  var rv = Object.create(HostEmitterProto);
  rv.init.apply(rv, arguments);
  return rv;
};
//exports.HostEmitter = HostEmitter;
//exports.from = HostEmitter;

var HostEmitterProto = Object.create(cutil._Waitable);
HostEmitterProto.init = function(emitters, events, opts) {
  cutil._Waitable.init.call(this);
  this.emitters = sys.expandSingleArgument([emitters]);
  this.events = sys.expandSingleArgument([events]);

  var transform, filter, handle;
  if (opts)
    var {transform, filter, handle} = opts;

  var self = this;
  this._handleEvent = function(val) {
    var arg = (arguments.length > 1) ? Array.prototype.slice.call(arguments) : val;
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

/* -- not part of documentation -- 
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

/* -- not part of documentation --
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


