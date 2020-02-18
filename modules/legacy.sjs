/*
 * StratifiedJS 'legacy' module
 * Deprecated legacy functions
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.20.0-development'
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2012-2021 Oni Labs, http://onilabs.com
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
   @module  legacy
   @summary Deprecated legacy functions
   @home    sjs:legacy
*/
'use strict';

@ = require([
  './cutil',
  './sequence',
  {id:'./function', name:'fn'}
]);

exports.fn = {};
/**
   @function fn.par
   @summary Parallel function composition
   @deprecated This is a legacy function
   @param   {Function} [f1, f2, ...] Functions to compose
   @return  {Function} Parallel composition of f1, f2, ...
   @desc
      A call `c(a1,a2,...)` to the composed function `c = par(f,g)`
      executes as
      `waitfor{ f(a1,a2,...) } and { g(a1,a2,...) }`.

      `f` and `g` will be called with the same `this` pointer that `c` is called with.

*/
exports.fn.par = function(/*f1,f2,...*/) {
  var fs = Array.prototype.slice.call(arguments);
  return function() {
    return @waitforAll(fs, arguments, this);
  }
};

/**
   @function fn.tryfinally
   @summary try-finally function composition
   @deprecated This is a legacy function
   @param   {Function} [try_func] 
   @param   {Function} [finally_func]
   @return  {Function} Composition try { try_func } finally { finally_func }
   @desc
      A call `c(a1,a2,...)` to the composed function `c = tryfinally(f,g)`
      executes as
      `try{ return f(a1,a2,...) } finally { g(a1,a2,...) }`.

      `f` and `g` will be called with the same `this` pointer that `c` is called with.

*/
exports.fn.tryfinally = function(try_func, finally_func) {
  return function() {
    try     { return try_func.apply(this, arguments); }
    finally { finally_func.apply(this, arguments); }
  }
};


/**
   @function partition
   @deprecated This is a legacy function
   @altsyntax sequence .. partition(predicate)
   @param {::Sequence} [sequence] Input sequence
   @param {Function} [predicate] Predicate function
   @return {Array} A pair of sequences.
   @summary  Create a pair of [passes, fails] streams from an input stream and a predicate.
   @desc
      Generates two sequences. The first contains all items `x` from `sequence` for which
      `predicate(x)` is truthy, the second contains items where it is falsy. The
      order of the original sequence is maintained in each output sequence.

      If the input is an Array or other concrete sequence, the output will be a pair of Arrays. Otherwise,
      the output will be a pair of [::Stream]s which consume the input on demand.

      Note that if you pass a [::Stream] to this function and then consume the
      first result before iterating over the second, `partition` will be internally buffering
      all items destined for the second stream in order to produce the first.
      So it generally only makes sense to pass a [::Stream] as input when you
      are planning to iterate over both result streams concurrently.

      ### Example:

          // print first 10 odd integers:

          var [odds, evens] = integers(1,10) .. toArray .. partition(x->x%2);
          console.log("Odds: ", odds);
          console.log("Evens: ", evens);

          // will print:
          // Odds:  [ 1, 3, 5, 7, 9]
          // Evens: [ 2, 4, 6, 8, 10]
*/
function partition(sequence, predicate) {
  var buffers = [[], []];
  if (@isConcreteSequence(sequence)) {
    sequence .. @each {|item|
      buffers[predicate(item) ? 0 : 1].push(item);
    }
    return buffers;
  } else {
    var emitters = [null, null]
    var drainer = null;
    var _resume = @fn.nop;

    var streams = [0,1] .. @map((idx) -> @Stream(function(r) {
      while(buffers[idx].length > 0) {
        r(buffers[idx].shift());
      }
      emitters[idx] = r;
      _resume();
      drainer.value();
    }));

    drainer = spawn(function() {
      // wait until one side wants results
      waitfor() {
        _resume = resume;
      }
      _resume = @fn.nop;

      sequence .. @each {|item|
        var idx = predicate(item) ? 0 : 1;
        var emitter = emitters[idx];
        if (emitter) emitter(item);
        else buffers[idx].push(item);
      }
    }());
    return streams;
  }
}
exports.partition = partition;

