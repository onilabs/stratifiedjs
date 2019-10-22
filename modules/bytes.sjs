/*
 * StratifiedJS 'bytes' module
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.20.0-development'
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2015-2016 Oni Labs, http://onilabs.com
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
   @module    bytes
   @summary   Type checking, conversions and other utilities for binary data types.
   @home      sjs:bytes
   @inlibrary sjs:std when nodejs
   @inlibrary mho:std when nodejs
   @desc
    This module exposes methods for checking if a given object
    is a [::Bytes] (or a specific implementation), for converting
    between the various concrete types, and for handling streams of binary data

    The conversion functions in this module only make a copy
    when it's necessary to do so, which means the result may be
    aliased to the original input. If you modify the result of
    a call to `toUint8Array` (for example), it may modify the
    original value as well, depending on the original type.
*/
'use strict';

@ = require([
  {id:'builtin:apollo-sys', name: 'sys'},
  './sequence'
]);

/**
  @class Bytes
  @summary Abstract type representing bytes of binary data
  @desc
    The following concrete types are all implementations of Bytes:

     - Uint8Array
     - ArrayBuffer
     - Buffer (nodejs only)


  // test functions:
  
  @function isBytes
  @param {Object} [obj] Object to test
  @return {Boolean}
  @summary Returns `true` if `obj` is a [::Bytes]

  @function isBuffer
  @hostenv nodejs
  @param {Object} [obj] Object to test
  @return {Boolean}
  @summary Returns `true` if `obj` is a nodejs Buffer

  @function isUint8Array
  @param {Object} [obj] Object to test
  @return {Boolean}
  @summary Returns `true` if `obj` is a Uint8Array

  @function isArrayBuffer
  @param {Object} [obj] Object to test
  @return {Boolean}
  @summary Returns `true` if `obj` is an ArrayBuffer

  // conversion functions:
 
  @function toBuffer
  @hostenv nodejs
  @param {::Bytes} [bytes]
  @return {Buffer}
  @summary Convert any [::Bytes] type into a Buffer

  @function toArrayBuffer
  @param {::Bytes} [bytes]
  @return {ArrayBuffer}
  @summary Convert any [::Bytes] type into an ArrayBuffer

  @function toUint8Array
  @param {::Bytes} [bytes]
  @return {Uint8Array}
  @summary Convert any [::Bytes] type into a Uint8Array
*/

__js {
  var nope = -> false;
  var isBuffer = nope;

  var isUint8Array, isArrayBuffer;
  if(typeof(Uint8Array) === 'undefined') {
    isUint8Array = isArrayBuffer = nope;
  } else {
    isUint8Array = o -> o instanceof Uint8Array;
    isArrayBuffer = o -> o instanceof ArrayBuffer;
  }
  exports.isUint8Array = isUint8Array;
  exports.isArrayBuffer = isArrayBuffer;

  var isBytes = exports.isBytes = b -> isBuffer(b) || isUint8Array(b) || isArrayBuffer(b);
  // XXX nodejs >= 4.5 blurs the lines between buffers and uint8arrays. we use the 'isbuffer' test below
  // to get 'clean' uint8array. at some point we should harmonize buffers and typed arrays in conductance.
  var toUint8Array = exports.toUint8Array = b -> (isUint8Array(b) && !isBuffer(b)) ? b : new Uint8Array(b);
  var toArrayBuffer = exports.toArrayBuffer = function(b) {
    if(isArrayBuffer(b)) return b;
    return toUint8Array(b).buffer;
  };

  if (@sys.hostenv == 'nodejs') {
    isBuffer = exports.isBuffer = Buffer.isBuffer;
    var toBuffer = exports.toBuffer = function(b) {
      if (isBuffer(b)) return b;
      return Buffer.from(b .. toUint8Array);
    }
  }
}

//----------------------------------------------------------------------

// helper
__js function concatBuffers(b1, b2, offset1) {
  if (!isBytes(b1) || !isBytes(b2)) throw new Error("Binary data expected");
  var rv = new Uint8Array(b1.byteLength + b2.byteLength - offset1);
  rv.set(new Uint8Array(b1, offset1), 0);
  rv.set(new Uint8Array(b2), b1.byteLength - offset1);
  return rv.buffer;
}

/**
   @function parseBytes
   @altsyntax sequence .. parseBytes([eos], parse)
   @param {sequence::Sequence} [sequence] Input sequence of chunks of binary data
   @param {optional Object} [eos=undefined] End of sequence marker
   @param {Function} [parse] Parsing function
   @summary Parse a binary input stream into an output stream
   @return {sequence::Stream}
   @desc
      On iteration, calls `parse` with an api object:

          {
            emit: function(elem), emit an element into the output stream
            readUint8: function(), // read a Uint8 from the input stream,
            readUint8Array: function(l), // read a Uint8Array of bytelength l
            readUint32: function(le) // read a Uint32 (little-endian if le=true)
          }

      The `read*` functions return `eos` if the input stream is exhausted.

*/
function parseBytes(/*stream, eos, parse*/) {
  var stream, eos, parse;
  if (arguments.length === 2) {
    stream = arguments[0];
    parse = arguments[1];
  }
  else if (arguments.length === 3) {
    stream = arguments[0];
    eos = arguments[1];
    parse = arguments[2];
  }
  else throw new Error("Unexpected number of arguments");
    
    
  return @Stream(function(emit) {
    var upstream_eos = {};
    stream .. @consume(upstream_eos) {
      |next|
      var buffer = new ArrayBuffer(0);
      var length = 0, offset = 0;

      function fetchData() {
        var new_data = next();
        if (new_data === upstream_eos) return false;
        buffer = concatBuffers(buffer, new_data, offset);
        offset = 0;
        length = buffer.byteLength;
        return true;
      }
      
      parse({
        emit: emit,
        readUint8: function() {
          while (length-offset < 1 && fetchData())
            /**/;
          if (length-offset < 1) return eos;
          var view = new DataView(buffer, offset, 1);
          ++offset;
          return view.getUint8(0);
        },
        readUint8Array: function(l) {
          while (length-offset < l && fetchData())
            /**/;
          if (length-offset < l) return eos;
          var arr = new Uint8Array(buffer, offset, l);
          offset += l;
          return arr;
        },
        readUint32: function(littleEndian) {
          while (length-offset < 4 && fetchData())
            /**/;
          if (length-offset < 4) return eos;
          var view = new DataView(buffer, offset, 4);
          offset += 4;
          return view.getUint32(littleEndian);
        }
      });
    }
  });  
}
exports.parseBytes = parseBytes;
