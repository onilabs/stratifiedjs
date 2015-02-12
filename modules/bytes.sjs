/*
 * StratifiedJS 'bytes' module
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.20.0-development'
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2015 Oni Labs, http://onilabs.com
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
   @summary   Type checking and conversions for binary types.
   @home      sjs:bytes
   @desc
    This module exposes test methods for checking if a given object
    is a [::Bytes] (or a specific implementation), and for converting
    between the various concrete types.

    The conversion functions in this module only make a copy
    when it's necessary to do so, which means the result may be
    aliased to the original input. If you modify the result of
    a call to `toUint8Array` (for example), it may modify the
    original value as well, depending on the original type.
*/

var sys = require('builtin:apollo-sys');

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
  var toUint8Array = exports.toUint8Array = b -> isUint8Array(b) ? b : new Uint8Array(b);
  var toArrayBuffer = exports.toArrayBuffer = function(b) {
    if(isArrayBuffer(b)) return b;
    return toUint8Array(b).buffer;
  };

  if (sys.hostenv == 'nodejs') {
    isBuffer = exports.isBuffer = Buffer.isBuffer;
    var toBuffer = exports.toBuffer = function(b) {
      if (isBuffer(b)) return b;
      return new Buffer(b .. toUint8Array);
    }
  }
}
