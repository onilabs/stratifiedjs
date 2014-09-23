/*
 * StratifiedJS 'nodejs/stream' module
 * Stratified helpers for dealing nodejs's async streams
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.19.0'
 * http://onilabs.com/stratifiedjs
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
  @module    nodejs/stream
  @summary   Stratified helpers for dealing with [nodejs's async streams](http://nodejs.org/api/stream.html)
  @home      sjs:nodejs/stream
  @hostenv   nodejs
*/

if (require('builtin:apollo-sys').hostenv != 'nodejs')
  throw new Error('The nodejs/stream module only runs in a nodejs environment');

var nodeVersion = process.versions.node.split('.');
@ = require(['../array', '../sequence']);
@assert = require('../assert');
var OLD_API = nodeVersion .. @cmp([0,10]) < 0;

/**
  @function read
  @summary  Read a single piece of data from `stream`.
  @param    {Stream} [stream] the stream to read from
  @desc
    This function blocks until the first `data` event is received
    on the stream, and returns that data. Returns `null` if the
    stream has ended.

    If stream emits `error`, the error is thrown.

    Calls `resume` on the stream before waiting for data,
    and calls `pause` on the stream after data is returned.
    This ensures that no data is emitted between calls to `read()`.
*/
// implementation in apollo-sys-nodejs.sjs
exports.read = require('builtin:apollo-sys').readStream;

/**
  @function readAll
  @summary  Read and return the entire contents of `stream` as a single string.
  @param    {Stream} [stream] the stream to read from
  @desc
    Repeatedly calls `read` until the stream ends. This function
    should not be used on infinite or large streams, as it will buffer the
    entire contents in memory.
*/
exports.readAll = function(stream) {
  var result = [];
  var data;
  while((data = exports.read(stream)) !== null) {
    result.push(data);
  }
  return result.join('');
};


/**
  @function write
  @summary  Write data to the `dest` stream.
  @param    {Stream} [dest] the stream to write to
  @param    {String|Buffer} [data] the data to write
  @param    {optional String} [encoding] the encoding, if `data` is a string
  @desc
    If the data cannot be written immediately, this function
    will wait for a `drain` event on the `dest` stream before
    returning.

    Any additional arguments (after `data`) are passed through
    to the underlying `write` function.
*/
exports.write = function(dest, data/*, ...*/) {
  var wrote = dest.write.apply(dest, Array.prototype.slice.call(arguments, 1));
  if(!wrote) {
    waitfor() {
      dest.on('drain', resume);
    } finally {
      dest.removeListener('drain', resume);
    }
  }
};


/**
  @function end
  @summary  End the stream with a final chunk of data.
  @param    {Stream} [dest] the stream to write to
  @param    {optional String|Buffer} [data] the data to write
  @param    {optional String} [encoding] the encoding, if `data` is a string
  @desc
    This function ends the stream and waits for its `finish`
    event before returning.
*/
exports.end = function(dest, data, encoding) {
  waitfor () {
    dest.end(data, encoding, resume)
  }
};
if (OLD_API) {
  exports.end = function(dest, data, encoding) {
    if (data) {
      exports.write(dest, data, encoding);
    }
    waitfor () {
      dest.on('close', resume);
      dest.end();
    }
  };
}


/**
  @function pump
  @summary  Keep writing data from `src` into `dest` until `src` ends.
  @param    {Stream} [src] the source stream
  @param    {String} [dest] the destination stream
  @param    {optional Function} [fn] the processing function
  @desc
    This function will not return until the `src` stream has ended,
    although it will not send `end` to `dest`.

    If `fn` is provided, each piece of data will be passed through
    it in turn. e.g. to produce an uppercase version of a stream:

        stream.pump(src, dest, function(data) { return data.toUpperCase(); })
*/
exports.pump = function(src, dest, fn) {
  var data;
  while((data = exports.read(src)) !== null) {
    if(fn) data = fn(data);
    exports.write(dest, data);
  }
};


/**
  @class    ReadableStringStream
  @summary  A readable in-memory Stream wrapping a single String.
  @desc
    This class is similar to StringIO in other languages,
    it allows the user to present a `String` as if it were a nodejs `Stream`.

    The stream will emit a single `data` event with the provided string. `pause()`
    and `resume()` can be used to delay this event, and `destroy()` to cancel it.

  @constructor ReadableStringStream
  @param    {String} [data] The data for this stream to emit
  @param    {optional Boolean} [paused=false] If this flag is not set, the stream will start emitting (asynchronous) events as soon as it is constructed.
*/
var ReadableStringStream = exports.ReadableStringStream = function(data, paused) {
  this.data = data;
  this.paused = paused || false;
  this.done = false;
  if (!this.paused) this.resume();
};

require('util').inherits(ReadableStringStream, require('stream').Stream);

ReadableStringStream.prototype.toString = function() {
  return "#<ReadableStringStream of data: " + data + ">";
};
ReadableStringStream.prototype.pause = function() {
  this.paused = true;
};
ReadableStringStream.prototype.resume = function() {
  this.paused = false;
  // delayed in order to give the creator a chance to pause()
  // this stream before it emits anything
  spawn((function() {
    hold(0);
    if(this.paused) return;
    this.emit('data', this.data);
    if(!this.done) {
      this.destroy();
    }
  }).call(this));
};
ReadableStringStream.prototype.destroy = function() {
  this.emit('end');
  this.done = true;
  this.data = null;
};
ReadableStringStream.prototype.setEncoding = function() {
  throw new Error("Can't set encoding on ReadableStringStream");
};

/**
   @class    WritableStringStream
   @summary  A writable in-memory Stream wrapping a single String.
   @desc
     This class wraps a `String` with nodejs `Writable Stream` interface.

     The data written to the stream can be retrieved from field 
     [::WritableStringStream::data].

   @constructor WritableStringStream

   @variable WritableStringStream.data
   @summary  Data that has been written to the stream (String)

*/
var WritableStringStream = exports.WritableStringStream = function() {
  this.data = "";
};

require('util').inherits(WritableStringStream, require('stream').Stream);


/**
   @function WritableStringStream.write
   @param {Buffer|String} [data]
*/
WritableStringStream.prototype.write = function(data) {
  if (data && data.length)
    this.data += data.toString();
  return true;
};

/**
   @function WritableStringStream.end
   @param {optional Buffer|String} [data]
*/
WritableStringStream.prototype.end = function(data) {
  this.write(data);
  this.emit('end');
};


/**
  @class DelimitedReader
  @summary A wrapper around a stream for reading delimited data

  @function DelimitedReader
  @param {Stream} [stream]

  @function DelimitedReader.readUntil
  @param {String|Number} [separator] charater or byte to read until
  @summary Read from the underlying `stream` until reaching `separator` or EOF
  @desc
    This will keep reading (and buffering) from the underlying stream until
    `separator` or EOF. Any additional data (after `separator`) which has been
    read from the underlying stream will be buffered internally
    (for use by a future call to [::DelimitedReader::readUntil]
    or [::DelimitedReader::read]).

  @function DelimitedReader.read
  @summary Read the next available data from the underlying stream
  @desc
    This does the same thing as calling [::read] on the underlying stream,
    except that it may return buffered data which was read (but not rerurned) by
    a previous call to [::DelimitedReader::readUntil].
*/
var DelimitedReader = function(stream) {
  var pending = [];
  var convertSentinel = null;
  var ended = false;
  var _read = function() {
    if (ended) return null;
    var buf = exports.read(stream);
    if (buf === null) ended = true;
    return buf;
  };

  return {
    readUntil: function(ch) {
      // first, check `pending` buffer
      if (pending.length > 0) {
        var sentinel = convertSentinel(ch);
        @assert.eq(pending.length, 1, "multiple chunks pending");
        var buf = pending[0];
        for (var idx=0; idx<buf.length; idx++) {
          if(buf[idx] == sentinel) {
            // Reached sentinel. Return everything in `pending` up until this point:
            var bufReturn = buf.slice(0, idx+1);
            var bufPending = buf.slice(idx+1);
            pending = bufPending.length > 0 ? [bufPending] : [];
            return bufReturn;
          }
        }
      }

      // not found in `pending`, check for new data...
      while(true) {
        var buf = _read();
        if (buf == null) {
          // reached end, with no sentinel in sight.
          // Return all pending data, or `null`
          if (pending.length == 0) return null;
          var rv = @join(pending);
          pending = [];
          return rv;
        }

        if (!convertSentinel) {
          // this is the first chunk read - determine whether we're
          // in Buffer or String mode
          if (Buffer.isBuffer(buf)) {
            convertSentinel = function(ch) {
              if (typeof(ch) == 'number') return ch;
              @assert.eq(Buffer.byteLength(ch), 1);
              return ch.charCodeAt(0);
            };
          } else {
            // stream is returning strings, so no conversion necessary
            convertSentinel = function(c) {
              @assert.eq(c.length, 1);
              return c;
            };
          }
        }

        var sentinel = convertSentinel(ch);

        for (var idx=0; idx<buf.length; idx++) {
          if(buf[idx] == sentinel) {
            // return the result, including pending chunks and terminal
            var rv = pending;
            pending = [buf.slice(idx+1)];
            rv.push(buf.slice(0, idx+1));
            return @join(rv)
          }
        }

        // didn't find sentinel in `buf`
        pending.push(buf);
      }
    },

    read: function() {
      if (pending.length> 0) {
        return pending.shift();
      }
      return _read();
    }
  }
  
};
exports.DelimitedReader = DelimitedReader;

/**
  @function lines
  @param    {Stream} [stream] the stream to read from
  @param    {optional String} [sep="\n"]
  @param    {optional String} [encoding="utf-8"]
  @return   {../sequence::Stream} A sequence of lines
  @summary  Return a [../sequence::Stream] of lines from a nodejs Stream
  @desc
    This function creates and calls a [::DelimitedReader]
    repeatedly with the given separator (`\n` by default)
    and generates a [../sequence::Stream] of the results.

    Each element in the returned stream will include the
    trailing `sep` character, except for the final element
    (which will be the end of the stream, whether it ends with
    `sep` or not).

    Multiple-character `sep` values are not supported.

    If `encoding` is passed, this function will call
    `stream.setEncoding(encoding)` before reading from the stream.

    If stream has no encoding (i.e it returns Buffer objects),
    `sep` will be treated as an ASCII byte.
*/
exports.lines = function(stream, sep, encoding) {
  if (encoding) stream.setEncoding(encoding);
  var reader = DelimitedReader(stream);
  if(!sep) sep = '\n';
  return @Stream(function(emit) {
    var buf;
    while(true) {
      buf = reader.readUntil(sep);
      if (buf === null) break;
      emit(buf);
    }
  });
};
