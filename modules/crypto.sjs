/*
 * StratifiedJS 'crypto' module
 * Cryptography-related utilities
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.20.0-development'
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2012-2016 Oni Labs, http://onilabs.com
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
   @module  crypto
   @summary Cryptography-related utilities
   @home    sjs:crypto
*/


'use strict';

var { hostenv } = require('builtin:apollo-sys');

var imports;

if (hostenv === 'nodejs') {
  imports = [ {id:'nodejs:crypto', name:'crypto'},
              'sjs:string'
            ];
}
else if (hostenv === 'xbrowser') {
  imports = [ 'sjs:string' ];
}
else
  throw new Error("Unsupported host environment #{hostenv}");

@ = require(imports);


/**
   @function randomID
   @summary Returns a cryptographically strong ID
   @param {optional Integer} [words=4] Number of 32bit random words to use for constructing the id 
   @return {String}
   @desc
     * The returned string is the base64 encoding of `words` 32bit random numbers.
     * The character set used for the encoding is `A`-`Z`, `a`-`z`, `0`-`9`, `-`, `_`.
*/
exports.randomID = function(words) {
  words = words || 4;

  var byte_count = words * 4;

  var bytes;
  if (hostenv === 'nodejs') {
    waitfor (var err, bytes) {
      @crypto.randomBytes(byte_count, resume);
    }
    if (err) throw new Error(err);
  }
  else { // hostenv 'xbrowser' implied
    bytes = new Uint8Array(byte_count);
    window.crypto.getRandomValues(bytes);
  }

  return (bytes .. @arrayBufferToOctets .. @octetsToBase64).replace(/\//g,'_').replace(/\+/g, '-').replace(/=/g, '');
};
