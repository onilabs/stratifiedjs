/*
 * StratifiedJS 'projection' module
 * Type-preserving manipulating of streams and observables 
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
   @module    projection
   @deprecated Module scheduled to be removed
   @summary   Type preserving manipulating of streams and observables 
   @home      sjs:projection
   @inlibrary sjs:std
   @inlibrary mho:std
*/
'use strict';

@ = require([
  'sjs:sequence',
  'sjs:observable',
  'sjs:array',
  'sjs:object'
]);

/**
   @function project
   @altsyntax sequence .. project(f)
   @deprecated Use [sequence::transform]
   @param {sequence::Sequence} [sequence] Input sequence
   @param {Function} [f] Transformation function to apply to each element of `sequence`
   @return {sequence::Sequence} 
   @summary  Apply a function to each sequence element in a type preserving way
   @desc
      Performs a stream transformation that preserves the type of the input sequence,
      returning a sequence of the same stream sub-type.

      In particular `sequence .. project(f)` is equivalent to

       * `arr .. @transform(f) .. @toArray` if `arr` is array-like.
       * `str .. @transform(f) .. @join('')` if  `str` is a string.
       * `sequence .. @transform(f)` if `sequence` is a generic [sequence::Stream].

*/

// helpers
var projectString = (str, f) -> str .. @transform(f) .. @join('');

__js {
  function project(sequence, f) {
    if (@isStream(sequence)) {
      return @transform(sequence, f);
    }
    else if (@isArrayLike(sequence)) {
      return @map(sequence, f);
    }
    else if (typeof sequence === 'string' || sequence instanceof String) {
      return projectString(sequence, f);
    }
    else 
      throw new Error("Don't know how to project this sequence");
  }
  exports.project = project;
} // __js


/**
   @function projectInner
   @altsyntax sequence .. projectInner(f)
   @deprecated Use [sequence::transform.map]
   @param {sequence::Sequence} [sequence] Input sequence
   @param {Function} [f] Function to map over `sequence` elements
   @return {sequence::Sequence}
   @summary  Project a function over each element of a sequence
   @desc
     `seq .. projectInner(f)` is equivalent to 
     `seq .. @project(elems -> elems .. @project(f))`.
*/


__js {
  function projectInner(sequence, f) {
    return sequence .. project(elems -> elems .. project(f));
  }
  exports.projectInner = projectInner;
} // __js

//----------------------------------------------------------------------
/**
   @function dereference
   @altsyntax sequence .. dereference(obj)
   @deprecated Use `transform(->obj[p])`
   @summary Project a sequence into property lookups in a type preserving way
   @param {sequence::Sequence} [sequence] Input sequence of property names
   @param {Object} [obj] Object whose properties are being accessed
   @return {sequence::Sequence} Type-preserved ([::project]ed) sequence.
   @desc
     Shorthand for:

         sequence .. @project(p -> obj[p])
*/
exports.dereference = (seq,obj) -> seq .. project(p -> obj[p]);
