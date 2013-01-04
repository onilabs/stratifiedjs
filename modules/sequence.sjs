/*
 * Oni Apollo 'sequence' module
 * Constructs for manipulating sequence structures (arrays, strings and more general streams)
 *
 * Part of the Oni Apollo Standard Module Library
 * Version: 'unstable'
 * http://onilabs.com/apollo
 *
 * (c) 2013 Oni Labs, http://onilabs.com
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
   @module    sequence
   @summary   Constructs for manipulating sequence structures (arrays, strings and more general streams)
   @home      apollo:sequence
   @desc
     The sequence module contains building blocks for working with
     sequential data streams, such as arrays, strings, and more general, possibly
     infinite streams.

*/

var {isArrayOrArguments} = require('sjs:apollo-sys');


/**
   @function each
   @altsyntax sequence .. each { |item| ... }
   @param {::Sequence} [sequence] Input sequence
   @param {Function} [f] Function to execute for each `item` in `sequence`
   @summary Executes `f(item)` for each `item` in `sequence`
   @desc
     ### Example:

         each([1,2,3,4], function(x) { console.log(x) })

         // same as above, but using "double dot" call syntax: 
         [1,2,3,4] .. each(function(x) { console.log(x) })

         // same as above, but using block lambda call syntax:
         each([1,2,3,4]) { |x| console.log(x) }

         // using double dot & blocklambda call syntax:
         [1,2,3,4] .. each { |x| console.log(x) }
*/
function each(sequence, r) {
  if (typeof sequence == 'function')
    sequence(r);
  else if (isArrayOrArguments(sequence)) {
    for (var i=0,l=sequence.length; i<l; ++i)
      r(sequence[i]);
  }
  else if (typeof sequence == 'string')
    for (var i=0,l=sequence.length; i<l; ++i)
      r(sequence.charAt(i));
  else
    throw "sequence::each: Unsupported sequence type '#{sequence}'";
}
exports.each = each;

/**
   @function iterate
   @altsyntax sequence .. iterate([eos]) { |next| ... }
   @param {::Sequence} [sequence] Input sequence
   @param {optional Object} [eos=undefined] End of sequence marker
   @param {Function} [loop] Iteration loop
   @summary Execute an iteration loop for the given sequence
   @desc
     Calls function `loop` with one parameter, a `next` function which,
     when called within the scope of `loop`, will return successive 
     elements from `sequence`. If there are no more elements in `sequence`, 
     calls to `next()` will yield `eos`.

     ### Example:

         iterate([1,2,3,4], function(next) { 
           var x;
           while ((x = next()) !== undefined)
             console.log(x);
         })

         // same as above, using double dot & blocklambda call syntax:
         
         [1,2,3,4] .. iterate { 
           |next|
           var x;
           while ((x = next()) !== undefined)
             console.log(x);
         }
     
*/
function iterate(/* sequence, [opt]eos, loop*/) {

  var sequence, eos, loop;
  if (arguments.length > 2)
    [sequence, eos, loop] = arguments;
  else
    [sequence, loop] = arguments;

  var emit_next,want_next;

  function next() {
    waitfor(var rv) {
      emit_next = resume;
      want_next();
    }
    return rv;
  }

  waitfor {
    waitfor() { want_next = resume }
    sequence .. each { 
      |x|
      waitfor() { 
        want_next = resume;
        emit_next(x);
      }
    }
    while (1) {
      waitfor() {
        want_next = resume;
        emit_next(eos);
      }
    }
  }
  or {
    loop(next);
  }
}
exports.iterate = iterate;


/**
   @function toArray
   @altsyntax sequence .. toArray
   @param {::Sequence} [sequence] Input sequence
   @return {Array} 
   @summary Convert the given sequence to an array
   @desc
     ### Example:

         var ints = toArray(integers(1,10)) // = [1,2,3,4,5,6,7,8,9,10]

         // same as above, using double dot call syntax:

         var ints = integers(1,10) .. toArray

*/
function toArray(sequence) {
  if (isArrayOrArguments(sequence)) {
    if (Array.isArray(sequence)) 
      return sequence;
    else
      return Array.prototype.slice.call(sequence);
  }
  else {
    var rv = [];
    sequence .. each { |x| rv.push(x) }
    return rv;
  }
}
exports.toArray = toArray;

/*
   @function toStream
  
   XXX not sure we need this

function toStream(sequence) {
  if (typeof sequence == 'function') 
    return sequence;
  else 
    return function(r) {
      each(sequence, r);
    }
  }
}
exports.toStream = toStream;
*/

/**
   @function pick
   @altsyntax sequence .. pick(count)
   @param {::Sequence} [sequence] Input sequence
   @param {Integer} [count] Number of items to pick
   @return {::Stream}
   @summary  Picks `count` items from `sequence`
   @desc
      Generates a stream that contains at most the first `count` items from 
      `sequence` (or fewer, if `sequence` contains fewer items).

      ### Example:

          each(pick(integers(), 10), function(x) { console.log(x) })

          // same as above, with double dot and blocklamdba syntax:

          integers() .. pick(10) .. each { |x| console.log(x) }
*/
function pick(sequence, count) {
  return function(r) {
    var n = count;
      sequence .. each { |x| if (--count < 0) return; r(x) }
  }
}
exports.pick = pick;

/**
   @function filter
   @altsyntax sequence .. filter(predicate)
   @param {::Sequence} [sequence] Input sequence
   @param {Function} [predicate] Predicate function
   @return {::Stream}
   @summary  Create a stream of elements of `sequence` that satisfy `predicate`
   @desc
      Generates a stream that contains all items `x` from `sequence` for which
      `prdicate(x)` is truthy.

      ### Example:

          // print first 10 odd integers:

          each(pick(filter(integers(), x=>x%2), 10), function(x) { console.log(x) })

          // same as above, with double dot and blocklamdba syntax:

          integers() .. filter(x=>x%2) .. pick(10) .. each { |x| console.log(x) }
*/
function filter(sequence, predicate) {
  return function(r) {
    sequence .. each { 
      |x| 
      if (predicate(x)) 
        r(x);
    }
  }
}
exports.filter = filter;

/**
   @function map
   @altsyntax sequence .. map(f)
   @param {::Sequence} [sequence] Input sequence
   @param {Function} [f] Function to apply to each element of `sequence`
   @return {::Stream}
   @summary  Create a stream `f(x)` of elements `x` of `sequence`
   @desc
      Generates a stream of elements `f(x1), f(x2), f(x3),...` where `x1, x2, x3, ..` 
      are successive elements from `sequence`.

      ### Example:

          // print first 10 squares:

          each(pick(map(integers(), x=>x*x), 10), function(x) { console.log(x) })

          // same as above, with double dot and blocklamdba syntax:

          integers() .. map(x=>x*x) .. pick(10) .. each { |x| console.log(x) }
*/
function map(sequence, f) {
  return function(r) {
    sequence .. each { |x| r(f(x)) }
  }
}
exports.map = map;

/**
   @function pack
   @altsyntax sequence .. pack(p, [pad])
   @param {::Sequence} [sequence] Input sequence
   @param {Function} [p] Packing function
   @param {optional Object} [pad=undefined] Padding object
   @return {::Stream}
   @summary  Collect multiple elements of `sequence` into a single element of the output stream
   @desc
      Calls `p(next)` until there are no further elements in `sequence`. 
      `next` is a function that, when called within the scope of `p` returns the next 
      element of `sequence`, or `pad` if there are no further elements.
      Creates an output stream of return values from `p`.

      ### Example:

          // create a stream of adjacent integer pairs:

          pack(integers(), next => [next(),next()]) // -> [1,2], [3,4], [5,6], ... 

          // same as above, with double dot call syntax:

          integers() .. pack(next => [next(),next()])
*/
function pack(sequence, p, pad) {
  return function(r) {
    var eos = {}, next_item;

    sequence .. iterate(eos) { 
      |next_upstream| 

      function next() {
        var x = next_item;
        if (x === eos) x = pad;
        next_item = next_upstream();
        return x;
      }

      next_item = next_upstream();
      while (next_item !== eos)
        r(p(next));
    }
  }
}
exports.pack = pack;

/**
   @function unpack
   @altsyntax sequence .. unpack(u)
   @param {::Sequence} [sequence] Input sequence
   @param {Function} [u] Unpacking function
   @return {::Stream}
   @summary  For a single elements of `sequence`, emit multiple values into the output stream
   @desc
      Calls `u(x)` for each element `x` of `sequence`. `u(x)` is assumed to return a [::Sequence]
      which will be flattened into the output stream.

      ### Example:

          // unpack a stream of pair objects:

          var pairs = [ {a:1, b:2}, {a:3, b:4}, {a:5, b:6} ];

          unpack(pairs, {a,b} => [a,b]) // -> 1,2,3,4,5,6 ... 

          // same as above, with double dot call syntax:

          pairs .. unpack({a,b} => [a,b])


          // create a stream 1, 1,2, 1,2,3, 1,2,3,4, 1,2,3,4,5, ...:
          
          integers() .. unpack(n => integers(1,n))
*/
function unpack(sequence, u) {
  return function(r) {
    sequence .. each { 
      |x| 
      u(x) .. each { |y| r(y) } 
    }
  }
}
exports.unpack = unpack;


/**
   @function zip
   @param {::Sequence} [sequence...] One or more sequences
   @return {::Stream}
   @summary  Builds a stream composed of arrays of elements of the input sequences
   @desc
      Builds a stream `[x1,y1,z1,...],[x2,y2,z2,...],...` where `x_n, y_n, z_n, ...` are
      elements of the input sequences `x, y, z, ...`.
      The output stream will have the same number of elements as the shortest input sequence.

      ### Example:

          // zip a character sequence with the corresponsing character position:

          zip(integers(), "This is a string") .. each { |x| console.log("#{x[0]}:#{x[1]}") }

          // -> 1:T, 2:h, 3:i, 4:s, 5: , 6:i, 7:s, ...
*/
function zip(/* sequences... */) {
  var sequences = arguments;
  return function(r) {
    var iterators = sequences .. map(seq => makeIterator(seq)) .. toArray;
    try {
      while (1) {
        var x = [];
        iterators .. each { 
          |iter| 
          if (!iter.hasMore()) return;
          x.push(iter.next());
        }
        r(x);
      }
    }
    finally {
      iterators .. each { |iter| iter.destroy() }
    }
  }
}
exports.zip = zip;


/**
   @function reduce
   @summary To be documented
*/
function reduce(sequence, initial, f) {
  var accu = initial;
  sequence .. each { |x| accu = f(accu, x) }
  return accu;
}
exports.reduce = reduce;

/**
   @function reduce1
   @summary To be documented
*/
function reduce1(sequence, f) {
  var accu;
  var first = true;
  sequence .. each { 
    |x| 
    if (first) {
      accu = x;
      first = false;
    }
    else
      accu = f(accu, x) 
  }
  if (first) throw new Error("reduce1 on empty sequence");
  return accu;
}
exports.reduce1 = reduce1;

/**
   @function find
   @summary To be documented
*/
function find(sequence, t) {
  sequence .. each { |x| if (t(x)) return x }
  return undefined;
}
exports.find = find;

/**
   @function all
   @summary To be documented
*/
function all(sequence, t) {
  sequence .. each { |x| if (!t(x)) return false }
  return true;
}
exports.all = all;

/**
   @function any
   @summary To be documented
*/
function any(sequence, t) {
  sequence .. each { |x| if (t(x)) return true }
  return false;
}
exports.any = any;


/**
   @function makeIterator
   @summary To be documented
*/   
function makeIterator(sequence) {
  var eos = {}, next_upstream;
  var stratum = spawn (function() {
    sequence .. iterate(eos) {
      |next|
      next_upstream = next;
      hold();
    }
  })();
  
  var x;
  var have_peeked = false;
  return {
    hasMore: function() { 
      if (!have_peeked) 
        x = next_upstream();
      have_peeked = true;
      return x !== eos;
    },
    next: function() {
      if (!have_peeked)
        x = next_upstream();
      have_peeked = false;
      return x;
    },
    destroy: function() {
      stratum.abort();
    }
  };             
}
exports.makeIterator = makeIterator;

/**
   @function parallel
   @summary To be documented
*/
function parallel(sequence, max_strata) {
  max_strata = max_strata || 10;
  return function(r) {
    var eos = {}, count = 0;
    sequence .. iterate(eos) {
      |next|
      function dispatch() {
        var x = next();
        if (x === eos) return;
        waitfor {
          ++count;
          r(x);
          if (count-- == max_strata) dispatch();
        }
        and {
          if (count < max_strata) dispatch();
        }
      }
      dispatch();
    }
  }
}
exports.parallel = parallel;

//----------------------------------------------------------------------
// Utility sequences:

var MAX_PRECISE_INT = 9007199254740992; // 2^53
/**
   @function integers
   @summary To be documented
*/
function integers(start, end) {
  if (start == undefined) start = 0;
  if (end == undefined) end = MAX_PRECISE_INT;
  return function(r) { for (var i=start;i<= end;++i) r(i) };
}
exports.integers = integers;

/**
   @function fib
   @summary To be documented
*/
function fib() {
  return function(r) {
    var [i1, i2] = [1,1];
    while (1) {
      r(i1);
      [i1,i2] = [i2, i1+i2];
    }
  }
}
exports.fib = fib;

