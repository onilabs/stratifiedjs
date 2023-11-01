/*
 * StratifiedJS 'sequence' module
 * Constructs for manipulating sequence structures (arrays, strings and more general streams)
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '1.0.0'
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2013-2023 Oni Labs, http://onilabs.com
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
   @module    tuple-key-encoding
   @summary   Functions for working with tuple keys
   @home      sjs:tuple-key-encoding
   @desc
     This module provides functions for mapping between an array representation of tuple keys and an equivalent 
     ordered binary (Utf8Array/Buffer) representation, as well as functions for comparing keys.

     Modeled after [FoundationDB](https://apple.github.io/foundationdb/)'s tuple layer.


*/
'use strict';

module.setCanonicalId('sjs:tuple-key-encoding');

var { hostenv, isArrayLike } = require('builtin:apollo-sys');
var { Token } = require('./type');

/**
   @class TupleKey
   @summary An array of strings and/or signed integers intended to be used as an element-wise sorted key into an ordered key-value store
   @desc
     Tuple keys have the following syntax:

         TUPLE_KEY: IN_BOUNDS_TUPLE_KEY | OUT_OF_BOUNDS_TUPLE_KEY
         IN_BOUNDS_TUPLE_KEY: [ KEY_ELEMENT+ ]
         OUT_OF_BOUNDS_TUPLE_KEY: [ KEY_ELEMENT*, RangeEnd ]
         KEY_ELEMENT: null | Uint8Array | STRING | INTEGER | -INTEGER

     Tuple keys map onto an ordered binary (Uint8Array/Buffer) [::EncodedTupleKey] representation using the 
     functions [::encodeKey] and [::decodeKey]. This encoding is structured in a way 
     that the byte-wise lexicographic order of an EncodedTupleKey corresponds to an element-wise lexicographic
     order of its corresponding unencoded TupleKey:

     - For `K1 = [A1, B1]` and `K2 = [A2, B2]`, `K1` will be < `K2` iff either 1) `A1`<`A2` or 2) `A1`==`A2` and `B1`<`B2`. (And so forth for longer keys).
     - Uint8Arrays are sorted lexicographically.
     - String elements are sorted lexicographically based on their UTF8 representation.
     - Integer elements are sorted based on their (signed) value.
     - Elements of different types are sorted in the order `null < Uint8Array < string < integer < RangeEnd`

     Encoded tuples are e.g. intended to be used as keys for [sjs:map::SortedMap]s (with the `'encodedTuples'` comparator).

     See also https://apple.github.io/foundationdb/data-modeling.html#tuples. 

     ### Out-of-bounds tuple keys & key ranges

     Out-of-bounds tuple keys are those that have a [::RangeEnd] element in the last array position. 
     [::RangeEnd] must not appear in any other position in a TupleKey.

     Key-value stores should never store any value under an out-of-bounds key.
     The intended use case for out-of-bounds keys is to establish boundaries for key ranges, like specifying
     the start and end points for a specific range query.  

     Examples:

     - `[RangeEnd]` is a key larger than any in-bounds tuple key `K`: `[null] <= K < [RangeEnd]`
     - A multi-element tuple key `K=[P1,P2,P3,...,Pn,S1,S2,S3,...,Sm]` can be thought of consisting of a prefix 
       `P=P1,P2,P3,...,Pn` and a suffix `S=S1,S2,S3,...,Sm`. `K` can be thought of a __child__ of key `P` (and `P` as the
       __parent__ of `K`). The following range encompasses all children `C` of `P`: `[P1,P2,P3,...,Pn,null] <= C < [P1,P2,P3,...,Pn,RangeEnd]`.
     - In an ordered key-value store, the next __sibling__ of key `P=[P1,P2,P3,...,Pn]` is the first `n`-element key `S` (if any) for which `[P1,P2,P3,...,Pn,RangeEnd] < S`.


*/


/**
   @class EncodedTupleKey
   @summary A byte-wise lexicographic encoding of [::TupleKey]s
   @desc

     EncodedTupleKeys map to corresponding [::TupleKey]s through the functions [::encodeKey] and
     [::decodeKey]. See the [::TupleKey] documentation for the sorting properties of the encoding.
    
     Encoding scheme:

         null:       <0x00>

         Uint8Array: <1> + <byte stream> + <0x00>
                     (<0x00> in <byte stream> is encoded as <0x00> + <0xFF>
                      Terminator <0x00> ensures that child keys sort directly after parent)
         
         string:     <2> + <utf8 byte stream> + <0x00>
                     (<0x00> in <utf 8 byte stream> is encoded as <0x00> + <0xFF>
                     Terminator <0x00> ensures that child keys sort directly after parent)

         64 bit integer: (limited to [-Math.pow(2,53), Math.pow(2,53)-1] in JS)
                     <prefix> + <MSB first byte stream>
                     (<prefix> in range [13,27] depending on sign & magnitude)

         RangeEnd:   <0xFF>

*/


//----------------------------------------------------------------------
// Key encoding

// Heavily copied from the FoundationDB Node.js API, which has the
// following copyright notice:

/*
 * FoundationDB Node.js API
 * Copyright (c) 2012 FoundationDB, LLC
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
 */

__js {

  // sizeLimits[n] = number of bytes needed to store integer <= sizeLimits[n],
  // as per the encoding below
  var sizeLimits =
    [ 0,
      255,
      65535,
      16777215,
      4294967295,
      1099511627775,
      281474976710655,
      72057594037927940 ];

  // bounds for precisely representable integers in js:
  var maxInt = 9007199254740991; // = Math.pow(2,53)-1
  var minInt = -9007199254740992; // = -Math.pow(2,53)

  function findNullBytes(buf, pos, searchForTerminators) {
    var nullBytes = [];

    var found;
    for(pos; pos < buf.length; ++pos) {
      if(searchForTerminators && found && buf[pos] !== 0xff) {
        break;
      }

      found = false;
      if(buf[pos] === 0x00) {
        found = true;
        nullBytes.push(pos);
      }
    }

    if(!found && searchForTerminators) {
      nullBytes.push(buf.length);
    }

    return nullBytes;
  }

  var makeEncodingBuffer, encodeString, decodeString, copy, concat, encodedKeyEquals, encodedKeyCompare;

  if (hostenv === 'nodejs') {
    makeEncodingBuffer = Buffer.allocUnsafe;
    encodeString = str -> Buffer.from(str, 'utf8');
    decodeString = (buf, start, end) -> buf.toString('utf8', start, end);
    copy = function (from, to, to_start, from_start, from_end) {
      return from.copy(to, to_start, from_start, from_end);
    };
    concat = Buffer.concat;
    encodedKeyEquals = (k1,k2) -> k1.equals(k2);
    encodedKeyCompare = (k1,k2) -> k1.compare(k2);
  }
  else { // xbrowser or otherwise
    var UTF8Encoder = new TextEncoder();
    var UTF8Decoder = new TextDecoder();
    makeEncodingBuffer = n -> new Uint8Array(n);
    encodeString = str -> UTF8Encoder.encode(str);
    decodeString = function(buf, start, end) {
      if (start !== 0 || end !== buf.length)
        buf = buf.slice(start, end);
      return UTF8Decoder.decode(buf);
    };
    copy = function (from, to, to_start, from_start, from_end) {
      return to.set(from.subarray(from_start, from_end), to_start);
    };
    concat =  function(outer, len) {
      var output = new Uint8Array(len);
      var offset = 0;
      for (var i=0; i<outer.length; ++i) {
        output.set(outer[i], offset);
        offset += outer[i].length;
      }
      return output;
    };
    encodedKeyEquals = function(k1,k2) {
      if (k1.length != k2.length) return false;
      for (var i=0; i<k1.length; ++i)
        if (k1[i] !== k2[i]) return false;
      return true;
    };
    encodedKeyCompare = function(k1,k2) {
      var min_l = Math.min(k1.length, k2.length);
      
      for (var i=0;i<min_l;++i) {
        var diff = k1[i]-k2[i];
        if (diff > 0) return 1;
        if (diff < 0) return -1;
      }
      var diff = k1.length - k2.length;
      if (diff > 0) return 1;
      if (diff < 0) return -1;
      return 0;
    };
  }
  
  function single(x) {
    var out = makeEncodingBuffer(1);
    out[0] = x;
    return out;
  }

  var Byte00 = single(0x00);
  var ByteFF = single(0xFF);

  /**
     @variable RangeEnd
     @summary Symbol for constructing out-of-bounds [::TupleKey]s.
  */
  var RangeEnd = exports.RangeEnd = Symbol.for(Token(module,'obj','RangeEnd'));

  function encodeElement(item, last, allowOutOfBounds) {
    var encodedString;
    if(typeof item === 'undefined')
      throw new TypeError('Key component cannot be undefined');

    else if(item === null)
      return Byte00;

    //byte string or unicode
    else if(typeof item === 'string' || item instanceof Uint8Array) {
      var unicode = typeof item === 'string';

      if (unicode) {
        item = encodeString(item);
      }

      var nullBytes = findNullBytes(item, 0);

      encodedString = makeEncodingBuffer(2 + item.length + nullBytes.length);
      encodedString[0] = unicode ? 2 : 1;

      var srcPos = 0;
      var targetPos = 1;
      for(var i = 0; i < nullBytes.length; ++i) {
        copy(item, encodedString, targetPos, srcPos, nullBytes[i] + 1);
        targetPos += nullBytes[i] + 1 - srcPos;
        srcPos = nullBytes[i] + 1;
        encodedString[targetPos++] = 0xff;
      }

      copy(item, encodedString, targetPos, srcPos, item.length);
      encodedString[encodedString.length - 1] = 0x00;

      return encodedString;
    }

    //64-bit integer
    else if(typeof item === 'number' && item % 1 === 0) {
      var negative = item < 0;
      var posItem = Math.abs(item);

      var length = 0;
      for(; length < sizeLimits.length; ++length) {
        if(posItem <= sizeLimits[length])
          break;
      }

      if(item > maxInt || item < minInt)
        throw new RangeError('Cannot pack signed integer larger than 54 bits');

      var prefix = negative ? 20 - length : 20 + length;

      var outBuf = makeEncodingBuffer(length+1);
      outBuf[0] = prefix;
      for(var byteIdx = length-1; byteIdx >= 0; --byteIdx) {
        var b = posItem & 0xff;
        if(negative)
          outBuf[byteIdx+1] = ~b;
        else {
          outBuf[byteIdx+1] = b;
        }

        posItem = (posItem - b) / 0x100;
      }

      return outBuf;
    }
    else if (item === RangeEnd) {
      if (!last) throw new Error("Invalid key component: 'RangeEnd' is only allowed in last array position");
      if (!allowOutOfBounds) throw new Error("Out-of-bounds tuple key disallowed");
      return ByteFF;
    }
    else
      throw new TypeError("Invalid key component of type '#{typeof(item)}'. Key components must either be a string, Uint8Array, an integer, or null.");
  }

  /**
     @function encodeKey
     @summary Create an [::EncodedTupleKey] from a [::TupleKey]
     @param {::TupleKey} [key]
     @param {optional Boolean} [allowOutOfBounds=false] Whether to allow encoding of out-of-bounds keys
     @return {::EncodedTupleKey}
     @desc
       If `allowOutOfBounds` is `false` (the default), attempting to encode an out-of-bounds key that contains
       [::RangeEnd] will throw an exception.

   */
  function encodeKey(arr, allowOutOfBounds) {
    allowOutOfBounds = !!allowOutOfBounds;
    var totalLength = 0;
    var l = arr.length;
    if (l === 0) throw new TypeError('Key cannot be empty');
    var outArr = new Array(l);
    for (var i = 0; i < l; ++i) {
      outArr[i] = encodeElement(arr[i], i===l-1, allowOutOfBounds);
      totalLength += outArr[i].length;
    }

    return concat(outArr, totalLength);
  }
  exports.encodeKey = encodeKey;

  function decodeNumber(buf, offset, bytes) {
    var negative = bytes < 0;
    if (negative) 
      bytes = -bytes;

    bytes = bytes + offset - 1;;

    var num = 0;
    var mult = 1;
    var odd;
    for(var i = bytes; i >= offset; --i) {
      var b = buf[i];
      if(negative)
        b = -(~b & 0xff);

      if(i === bytes)
        odd = b & 0x01;

      num += b * mult;
      mult *= 0x100;
    }

    if(num > maxInt || num < minInt || (num === minInt && odd))
      throw new RangeError('Cannot unpack signed integers larger than 54 bits');

    return num;
  }

  function decodeElement(buf, pos) {
    var code = buf[pos];
    var value;

    if(code === 0) {
      value = null;
      pos++;
    }
    else if(code === 1 || code === 2) {
      var nullBytes = findNullBytes(buf, pos+1, true);

      var start = pos+1;
      var end = nullBytes[nullBytes.length-1];

      if(code === 2 && nullBytes.length === 1) {
        value = decodeString(buf, start, end);
      }
      else {
        value = makeEncodingBuffer(end-start-(nullBytes.length-1));
        var valuePos = 0;

        for(var i=0; i < nullBytes.length && start < end; ++i) {
          copy(buf, value, valuePos, start, nullBytes[i]);
          valuePos += nullBytes[i] - start;
          start = nullBytes[i] + 2;
          if(start <= end) {
            value[valuePos++] = 0x00;
          }
        }

        if(code === 2) {
          value = decodeString(value, 0, value.length);
        }
      }

      pos = end + 1;
    }
    else if(Math.abs(code-20) <= 7) {
      if(code === 20)
        value = 0;
      else
        value = decodeNumber(buf, pos+1, code-20);

      pos += Math.abs(20-code) + 1;
    }
    else if(Math.abs(code-20) <= 8)
      throw new RangeError('Cannot unpack signed integers larger than 54 bits');
    else if (code === 255) {
      value = RangeEnd;
      pos++;
    }
    else
      throw new TypeError('Unknown data type in DB: ' + buf + ' at ' + pos);

    return { pos: pos, value: value };
  }

  /**
     @function decodeKey
     @summary Decode an [::EncodedTupleKey] into a  [::TupleKey]
     @param {::EncodedTupleKey} [encoded_key]
    */
  function decodeKey(key) {
    var res = { pos: 0 };
    var arr = [];

    while(res.pos < key.length) {
      res = decodeElement(key, res.pos);
      arr.push(res.value);
    }

    return arr;
  }
  exports.decodeKey = decodeKey;

  /**
     @function encodedKeyEquals
     @summary Returns `true` if the two encoded keys are equal
     @param {::EncodedTupleKey} [k1]
     @param {::EncodedTupleKey} [k2]
   */
  exports.encodedKeyEquals = encodedKeyEquals;

  /**
     @function encodedKeyCompare
     @summary Returns -1 if k1 < k2, +1, if k1 > k2, 0 otherwise
     @param {::EncodedTupleKey} [k1]
     @param {::EncodedTupleKey} [k2]
   */
  exports.encodedKeyCompare = encodedKeyCompare;

} /* __js */
