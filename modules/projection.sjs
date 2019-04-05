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
   @summary   Type preserving manipulating of streams and observables 
   @home      sjs:projection
   @inlibrary sjs:std
   @inlibrary mho:std
*/
'use strict';

@ = require([
  'sjs:sequence',
  'sjs:observable',
  'sjs:structured-observable',
  'sjs:array',
  'sjs:object'
]);

/**
   @function project
   @altsyntax sequence .. project(f)
   @param {sequence::Sequence} [sequence] Input sequence
   @param {Function} [f] Transformation function to apply to each element of `sequence`
   @return {sequence::Sequence} Sequence of same type as input sequence
   @summary  Apply a function to each sequence element in a type preserving way
   @desc
      Performs a stream transformation that preserves the type of the input sequence,
      returning a sequence of the same stream sub-type.

      In particular `sequence .. project(f)` is equivalent to

       * `@Observable(obs .. @transform(f) .. @dedupe)` if `obs` is an [observable::Observable].
       * `arr .. @transform(f) .. @toArray` if `arr` is array-like.
       * `str .. @transform(f) .. @join('')` if  `str` is a string.
       * `sequence .. @transform(f)` if `sequence` is a generic [sequence::Stream].

      For [sequence::BatchedStream]s, `sequence .. project(f)` will return a 
      [sequence::BatchedStream] with the same batching as `sequence`.

      For the projection behavior of [structured-observable::StructuredObservable]s,
      see the documentation of the individual structured observable.
*/

// helpers
function projectObservable(upstream, transformer) {
  return @Observable :: upstream .. @transform(transformer) .. @dedupe;
}
function projectObservableArray(upstream, transformer) {
  return @ObservableArray :: upstream .. @reconstitute .. @transform(transformer) .. @dedupe;
}

var projectString = (str, f) -> str .. @transform(f) .. @join('');
function projectBatchedStream(seq, f) {
  return @BatchedStream(function(r) {
    // note: must not use 'each' here, because we want to operate on batches
    seq {
      |batch|
      r(batch .. @map(f));
    }
  });
}

__js {
  function project(sequence, f) {
    if (@isObservableArray(sequence))
      return projectObservableArray(sequence, f);
    else if (@isStructuredObservable(sequence))
      throw new Error("Don't know how to project this structured observable");
    if (@isObservable(sequence))
      return projectObservable(sequence, f);
    else if (@isBatchedStream(sequence)) {
      return projectBatchedStream(sequence, f);
    }
    else if (@isStream(sequence)) {
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
   @param {sequence::Sequence} [sequence] Input sequence
   @param {Function} [f] Function to map over `sequence` elements
   @return {sequence::Sequence} Sequence of same type as input sequence
   @summary  Project a function over each element of a sequence
   @desc
     `seq .. projectInner(f)` is equivalent to 
     `seq .. @project(elems -> elems .. @project(f))`.

      For many [structured-observable::StructuredObservable]s, such as 
      [structured-observable::ObservableArray], calling `projectInner` is more
      efficient than calling `project(elems -> elems .. @project)`. 
      E.g. for [structured-observable::ObservableArray] streams, instead of projecting
      each array element for every mutation, only new items have to be projected.
      For details,
      see the documentation of the individual structured observable.

*/

function projectInnerObservableArray(upstream, transformer) {
  return @ObservableArray(
    upstream .. 
      @transform(function(item) {
        if (item.mutations) {
          return {mutations: 
                  item.mutations .. 
                  project(function(delta) {
                    switch (delta.type) {
                    case 'set':
                    case 'ins':
                      delta = delta .. @merge({val: transformer(delta.val)});
                      break;
                    case 'del':
                      break;
                    default:
                      throw new Error("Unknown operation in ObservableArray stream");
                    }
                    return delta;
                  })
                 };
        }
        else {
          // we have a copy of the full array
          return item .. project(transformer);
        }
      }));
};

__js {
  function projectInner(sequence, f) {
    if (@isObservableArray(sequence))
      return projectInnerObservableArray(sequence, f);
    else
      return sequence .. project(elems -> elems .. project(f));
  }
  exports.projectInner = projectInner;
} // __js

//----------------------------------------------------------------------
/**
   @function dereference
   @altsyntax sequence .. dereference(obj)
   @summary Project a sequence into property lookups in a type preserving way
   @param {sequence::Sequence} [sequence] Input sequence of property names
   @param {Object} [obj] Object whose properties are being accessed
   @return {sequence::Sequence} Type-preserved ([::project]ed) sequence.
   @desc
     Shorthand for:

         sequence .. @project(p -> obj[p])
*/
exports.dereference = (seq,obj) -> seq .. project(p -> obj[p]);
