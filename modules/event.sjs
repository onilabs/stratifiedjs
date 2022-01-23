/*
 * StratifiedJS 'event' module
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.20.0-development'
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2013-2016 Oni Labs, http://onilabs.com
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
  @inlibrary sjs:std
  @inlibrary mho:std
  @require   sjs:xbrowser/dom
  @desc
    This module provides abstractions around *event streams* ([::EventStream]), 
    which are a type of [./sequence::Stream] composed of discrete events.
*/
'use strict';

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

     To create EventStreams for DOM object events or nodejs EventEmitters use [::events].
     This function can also be used to create an EventStream for [./cutil::Dispatcher] objects.
*/

//----------------------------------------------------------------------

/**
   @function events
   @altsyntax events(dispatcher) // Form operating on Dispatchers - see description
   @summary  An [::EventStream] of [./cutil::Dispatcher], DOMElement or nodejs EventEmitter events. 
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

    * `events()` is polymorphic: If called with a single argument - a [./cutil::Dispatcher] - it 
      will return an [::EventStream] of dispatcher events. If called with two or three arguments
      it will return an [::EventStream[ of the described DOMElement or nodejs EventEmitter events.

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
__js function events(...args/* dispatcher | emitters, events, opts*/) {
  if (args.length < 2)
    return dispatcher_events(args[0]);
  else 
    return host_events(args);
}
exports.events = events;

function dispatcher_events(dispatcher) {
  return seq.Stream(function(receiver) {
    while (1) {
      receiver(dispatcher.receive());
    }
  });
}

var _listen, _unlisten;
if (sys.hostenv === 'nodejs') {
  _listen = function(emitter, event, dispatch) {
    emitter.on(event, dispatch);
  }
  _unlisten = function(emitter, event, dispatch) {
    emitter.removeListener(event, dispatch);
  }
}
else if (sys.hostenv === 'xbrowser') {
  var {addListener, removeListener } = require('sjs:xbrowser/dom');
  _listen = function(emitter, event, dispatch) {
    addListener(emitter, event, dispatch);
  }
  _unlisten = function(emitter, event, dispatch) {
    removeListener(emitter, event, dispatch);
  }
}

function host_events(args) {
  __js {
    var emitters = sys.expandSingleArgument([args[0]]);
    var events = sys.expandSingleArgument([args[1]]);
    if (args[2])
      var {transform, filter, handle} = args[2];

    var dispatcher = cutil.Dispatcher();

    function dispatch(...args) {
      dispatcher.dispatch(args.length <= 1 ? args[0] : args);
    }
  } // __js


  return seq.Stream(function(receiver) {
    
    try {
      emitters .. seq.each { 
        |emitter|
        events .. seq.each {
          |event|
          _listen(emitter, event, dispatch);
        }
      }

      while (true) {
        var ev = dispatcher.receive();
        if (transform) ev = transform(ev);
        if (filter && !filter(ev)) continue;
        if (handle) handle(ev);
        receiver(ev);
      }

    }
    finally {
      emitters .. seq.each { 
        |emitter|
        events .. seq.each {
          |event|
          _unlisten(emitter, event, dispatch);
        }
      }
    }
  });
}

/**
   @function wait
   @param {./sequence::Stream|Object} [stream_or_emitter]
   @param {optional any} [...] Optional `filter` function, if first argument is a [./sequence::Stream], 
                               otherwise arguments as for [::events].
   @summary Wait for an event or the first item of a [./sequence::Stream]
   @return {Object} Item emitted from stream
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
