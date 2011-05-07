/*
 * Oni Apollo 'node-utils' module
 * Stratified utilities for interfacing with plain nodejs code
 *
 * Part of the Oni Apollo Standard Module Library
 * 0.12+
 * http://onilabs.com/apollo
 *
 * (c) 2011 Oni Labs, http://onilabs.com
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
  @module    node-utils
*/

exports.waitforEvent = function(emitter, event) {
  waitfor (var rv) {
    function listener(x) { resume(arguments); }
    emitter.on(event, listener);
  }
  finally {
    emitter.removeListener(event, listener);
  }
  return rv;
};

exports.eventQueue = function(emitter, event) {
  return (new EventQueue(emitter, event));
};

function EventQueue(emitter, event) {
  // XXX we queue up to 100 events max. Does this need to be configurable?
  var capacity = 100;
  this._queue = new (require("./cutil").Queue)(capacity, true);
  this.emitter = emitter;
  this.event = event;

  var me = this;
  this._handleEvent = function() {
    me._queue.put(Array.prototype.slice.call(arguments, 0));
  };
  emitter.on(event, this._handleEvent);
}

EventQueue.prototype = {
  count: function() { 
    return this._queue.count();
  },

  get: function() {
    return this._queue.get();
  },

  stop: function() {
    this.emitter.removeListener(this.event, this._handleEvent);
  },

  __finally__: function() { this.stop(); }
};
