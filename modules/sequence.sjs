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
   @home      sjs:sequence
   @desc
     The sequence module contains building blocks for working with
     sequential data streams, such as arrays, strings, and more general, possibly
     infinite streams.

*/

var {isArrayLike, expandSingleArgument} = require('builtin:apollo-sys');

//----------------------------------------------------------------------

/**
   @class Sequence
   @summary An Array, array-like object (like `arguments` or `NodeList`), String or [::Stream]
   @desc
     A sequence is a datastructure that can be sequentially processed by [::each].
     Of the built-in JavaScript constructs, Arrays, the `arguments` object, 
     `NodeList`s (in the xbrowser hostenv) and Strings are sequences. Strings are treated 
     like Character arrays.
*/

/**
   @class Stream
   @summary Stratified stream abstraction
*/

/**
   @function Stream
   @summary Create a Stream from a streaming function
   @param {Function} [S] Streaming function
   @desc
     A streaming function `S` is a function with signature `S(r)`, where `r`, the *receiver function*, is a 
     function of a single argument.
     When called, `S(r)` must sequentially invokes `r(x)` with the stream's data elements 
     `x=x1,x2,x3,...` until the stream is empty.

     ### Example:
     
         // The stream 1,2,3,...,10 can be expressed by the streaming function:
         function S(r) { for (var i=1; i<=10; ++1) r(i) }
 
         // We then have:
         S(function(x) { console.log(x); }); // -> 1,2,3,...,10

         // blocklambda form:
         S { |x| console.log(x*x) }  // -> 1,4,9,...,100

*/
var STREAM_TOKEN = {};
var Stream = function(S) {
  S.__oni_stream = STREAM_TOKEN;
  return S;
}
exports.Stream = Stream;

/**
  @function toStream
  @param {::Sequence} [sequence]
  @return {::Stream}
  @summary return a Stream
  @desc
    If `sequence` is a stream, it is returned unmodified.
    Oterhwise, a new Stream is created that iterates over the
    given sequence.

    This function can be useful for example to create an
    immutable stream fron a mutable array. Note that any
    mutation to `sequence` after passing it in will be
    reflected in the resulting stream (i.e it merely
    references the original array, it does not duplicate it).
*/
var toStream = function(arr) {
  if (isStream(arr)) return arr;
  return Stream({|r| each(arr, r)});
}

/**
   @function isStream
   @param {Object} [s] Object to test
   @return {Boolean}
   @summary Returns `true` is `s` is a [::Stream], `false` otherwise.
*/
function isStream(s) {
  return s && s.__oni_stream == STREAM_TOKEN;
}
exports.isStream = isStream;

/**
   @function generate
   @param {Function} [generator_func] Generator Function.
   @return {::Stream}
   @summary Create a (infinite) stream of successive invocations of `generator_func`
*/
function generate(generator_func) {
  return Stream(function(r) { while(1) r(generator_func()) });
}
exports.generate = generate;

//----------------------------------------------------------------------

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
  else if (isArrayLike(sequence)) {
    for (var i=0,l=sequence.length; i<l; ++i)
      r(sequence[i]);
  }
  else if (typeof sequence == 'string')
    for (var i=0,l=sequence.length; i<l; ++i)
      r(sequence.charAt(i));
  else
    throw new Error("sequence::each: Unsupported sequence type '#{sequence}'");
}
exports.each = each;

/**
  @function exhaust
  @param {::Sequence} [seq]
  @summary Force the sequence to be fully evaluated
  @desc
    Blocks until the sequence has finished.
*/
var noop = function() {};
function exhaust(seq) {
  each(seq, noop);
}
exports.exhaust = exhaust;

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

/* 
   Support for parallel streams makes the 'iterate' implementation quite complicated.
   Here's what it would looks like if we disallowed parallel streams, i.e. 'each(stream,f)'
   would guarantee to never call 'f' reentrantly when 'f' blocks:

   function iterate_single_stratum_version(/ * sequence, [opt]eos, loop* /) {

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
*/
function iterate(/* sequence, [opt]eos, loop */) {
  var sequence, eos, loop;
  if (arguments.length > 2)
    [sequence, eos, loop] = arguments;
  else
    [sequence, loop] = arguments;

  var wants = []; // wants are issued by loops ready to receive their
                  // next value; for a n-parallel stream there can be n concurrent wants
  var waitfor_loop; // set by waitfor_all_loops
  var active_loops = 0;

  function waitfor_all_loops() {
    waitfor(var loop) { waitfor_loop = resume }
    waitfor {
      ++active_loops;
      loop.value();
      if (--active_loops == 0) return;
    }
    and {
      waitfor_all_loops();
    }
  }

  function runLoop(getNext, x) {
    var have_x = true;
    function next() {
      if (!have_x) {
        if (getNext) {
          waitfor(x, getNext) { wants.push(resume); getNext(); }
        }
        else
          return eos;
      }
      else
        have_x = false; // we use the getNext from the closure in the following next() call
      return x;
    }

    waitfor_loop(spawn loop(next));
  }

  waitfor {
    waitfor_all_loops()
  }
  or {
    sequence .. each {
      |x|
      // for a parallel stream this function will be called reentrantly!

      waitfor() {
        if (!wants.length)
          runLoop(resume, x);
        else
          wants.shift()(x, resume);
      }
    }
    // there should be at least one loop waiting
    // ASSERT(wants.length >= 1)
    while (wants.length)
      wants.shift()(eos);
    hold(); // we wait for all the loops to terminate
  }

}
exports.iterate = iterate;


/**
   @function toArray
   @altsyntax sequence .. toArray
   @param {::Sequence} [sequence] Input sequence
   @return {Array} 
   @summary Convert the given sequence `elem1, elem2, ...` to an array `[elem1, elem2, ...]`
   @desc
     * If `sequence` is already an Array, it will be returned unmodified (i.e. it will not be
     cloned).

     ### Example:

         var ints = toArray(integers(1,10)) // = [1,2,3,4,5,6,7,8,9,10]

         // same as above, using double dot call syntax:

         var ints = integers(1,10) .. toArray

*/
function toArray(sequence) {
  if (isArrayLike(sequence)) {
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

/**
  @class SequenceExhausted
  @summary Exception thrown when trying to get an element from an empty sequence
*/
function SequenceExhausted(msg) {
  this.message = msg;
}
SequenceExhausted.prototype = new Error();
exports.SequenceExhausted = SequenceExhausted;

/**
  @function first
  @param {::Sequence} [seq]
  @param {optional Object} [defaultValue]
  @summary Get the first item from a sequence
  @desc
    If `seq` is empty, `defaultValue` is returned if it was given.
    Otherwise, this function raises a [::SequenceExhausted] error.

    Note that if `seq` is a non-repeatable [::Stream],
    it doesn't just "peek" at the first item - it will consume
    (and return) it.
*/
function first(seq, defaultValue) {
  var args = arguments;
  seq .. each {|elem| return elem; }
  if (args.length > 1) return defaultValue;
  throw new SequenceExhausted('sequence exhausted');
}
exports.first = first;

/**
  @function at
  @param {::Sequence} [sequence]
  @param {Number} [index]
  @param {optional Object} [defaultValue]
  @summary returns the `index`th item from `sequence`.
  @desc
    This function acts similarly to the array index operator,
    but it works on sequences, and supports negative indexes
    (accessing elements relative to the end of the sequence).

    If there is no element at `index`, `defaultValue` will be returned
    (or a SequenceExhausted error thrown if no `defaultValue` was given).
    
    i.e for *positive* indexes, the code:
    
        sequence.at(seq, n)

    Is similar to:

        toArray(seq)[n]

    While:
    
        sequence.at(seq, -n);

    Is similar to:

        var arr = toArray(seq);
        arr[arr.length - n];

    The differences are:

    - If there is no element at `index`, `defaultValue` will be returned
      (or a SequenceExhausted error thrown if no `defaultValue` was given).
    - Evaluation stops as soon as the index is reached (i.e you
      can take the 10th item of an infinite sequence).
    - For a positive `index`, only one element is held in memory.
    - For a negative `index`, only `abs(index)` elements are held in memory.

*/
function at(seq, n, defaultValue) {
  var tail = seq;
  if (n < 0) {
    var size = -n;
    tail = padEnd(seq, size).tail();
    // if we accumulated less than `size`, there weren't enough elements:
    if (tail.length < size) tail = [];
  } else if (n>0) {
    tail = skip(seq, n);
  }
  var firstArgs = [tail];
  if (arguments.length > 2) firstArgs.push(defaultValue);
  return first.apply(null, firstArgs);
};
exports.at = at;

/**
  @function slice
  @summary Array.slice implementation for arbitrary sequences
  @param {::Sequence} [sequence]
  @param {Number} [start]
  @param {optional Number} [end]
  @return {::Stream}
  @desc
    This function operates exactly like [Array.slice][],
    except that it accepts any [::Sequence], and returns a [::Stream].

    The implementation only evaluates as many elements as required, for example
    you can take the slice of an infinite sequence if both `start` and `end`
    are positive:

        seq.integers() .. seq.slice(2, 8) .. seq.toArray();
        // [ 2, 3, 4, 5, 6, 7 ]

    [Array.slice]: https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Array/slice
*/
function slice(sequence, start, end) {
  // drop leading values:
  var dropped = 0;
  if (start !== undefined && start !== 0) {
    if (start > 0) {
      sequence = skip(sequence, start);
      dropped = start;
    } else {
      var pad = padEnd(sequence, -start);
      sequence = pad.tail();
      dropped = pad.count();
    }
  }

  // then trailing
  if (end !== undefined) {
    if (end >= 0) {
      sequence = take(sequence, Math.max(0, end-dropped));
    } else {
      // end is negative; so we drop from the end.
      // Note that `padEnd` is non-replayable, so we make a stream that
      // replays it each time.
      var orig = sequence;
      sequence = Stream {|r| padEnd(orig, -end) .. each(r) };
    }
  }

  // slice(-n) will end up setting `sequence` to an Array, but we
  // want to return a stream from all code paths for consistency
  return toStream(sequence);
};
exports.slice = slice;

// NOTE: padEnd is a single-shot sequence,
// as it maintains state (available via the `tail` method).
// Users of `padEnd` should not return it directly,
// since we want all library functions to be restartable.
var padEnd = function(seq, padding) {
  var started = false;
  var buf = [];
  var count = 0;
  var s = Stream(function(r) {
    if (started) throw new Error("Can't restart single-shot stream");
    started = true;
    seq .. each {|e|
      buf.push(e);
      if(buf.length > padding) {
        count++;
        r(buf.shift());
      }
    }
  });
  s.tail = function() {
    if (!started) exhaust(s);
    return buf;
  }
  s.count = function() {
    if (!started) exhaust(s);
    return count;
  }
  return s;
}


/**
   @function join
   @altsyntax sequence .. join(separator)
   @param {::Sequence} [sequence] Input sequence
   @param {optional String} [separator=''] 
   @return {String} 
   @summary Convert all elements of the sequence to strings and joins them into one string
*/
function join(sequence, separator) {
  separator = separator || '';
  return (sequence .. toArray).join(separator);
}
exports.join = join;

/**
   @function sort
   @altsyntax sequence .. sort([compare])
   @param {::Sequence} [sequence] Input sequence
   @param {optional Function} [compare] Function determining sort order; see below
   @return {Array}
   @summary Sort the sequence elements into an Array
   @desc
      * If a `compare` function is not supplied, elements are sorted by converting them to strings
      and comparing them in lexicographic order.

      * If a `compare` function is supplied, elements are sorted according to the return value
      of the compare function. If `a` and `b` are two elements being compared, then:

         * If `compare(a,b)` is less than 0, sort `a` to a lower index than `b`.
         * If `compare(a,b)` is greater than 0, sort `b` to a lower index than `a`.

      * `compare` must be a **non-blocking** function.

      * If `sequence` is an Array, it will be destructively sorted in-place.

      See also [::sortBy].
*/
function sort(sequence, compare) {
  var arr = (sequence .. toArray);
  return arr.sort.apply(arr, Array.prototype.slice.call(arguments, 1));
}
exports.sort = sort;

/**
  @function sortBy
  @param {::Sequence} [sequence] Input sequence
  @param {Function|String} [key] Function or property name which determines sort order.
  @return {Array}
  @summary Sort the sequence elements into an Array
  @desc
    Sorts the input sequence according to the ordering obtained by
    calling `key` on each input.

    If `key` is a string, it will be converted into a property acessor. i.e
    passing `'length'` is equivalent to passing `(x) -> x.length`.

    Example:

        ['five', 'four', 'three', 'two', 'one'] .. seq.sortBy('length');
        // -> [ 'two', 'one', 'five', 'four', 'three' ]
    
    If `sequence` is an array, it will be sorted in-place (and returned).

    The sort operation is stable if the runtime's Array.sort implementation
    is stable.

    Keys are evaluated once per input element, and the `key` function may
    be blocking (unlike the comparison function given to [::sort]).
*/

function sortBy(sequence, key) {
  key = keyFn(key);
  var arr = sequence .. toArray();
  var expanded = new Array(arr.length);
  for (var i=0; i<arr.length; i++) {
    expanded[i] = [arr[i], key(arr[i])];
  }
  expanded.sort(function(a,b) {
    // grab the result of `key(item)` for both pairs:
    a = a[1];
    b = b[1];
    return ((a < b) ? -1 : ((a > b) ? 1 : 0));
  });
  // copy sorted elements into original array
  for (var i=0; i<arr.length; i++) {
    arr[i] = expanded[i][0];
  }
  return arr;
};
exports.sortBy = sortBy;

// helpers for key functions
var identity = (x) -> x;
var keyFn = function(key) {
  if (key == null) return identity;
  if ((typeof key) == 'string') return (x) -> x[key];
  return key;
}

/**
   @function reverse
   @altsyntax sequence .. reverse
   @param {::Sequence} [sequence] Input sequence
   @return {Array}
   @summary Convert the given sequence `elem1, ..., elemN-1, elemN` to an array `[elemN, elemN-1, ..., elem1]`
   @desc
     * If `sequence` is an Array, it will be reversed destructively in-place.
*/
function reverse(sequence) {
  if (Array.isArray(sequence))
    return sequence.reverse();
  //else
  var rv = [];
  sequence .. each { |x| rv.unshift(x) }
  return rv;
}
exports.reverse = reverse;

/**
   @function count
   @altsyntax sequence .. count
   @param {::Sequence} [sequence] Input sequence
   @return {Integer}
   @summary Count number of elements in the sequence
*/
function count(sequence) {
  var n = 0;
  sequence .. each { || ++n }
  return n;
}
exports.count = count;

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
   @function take
   @altsyntax sequence .. take(count)
   @param {::Sequence} [sequence] Input sequence
   @param {Integer} [count] Number of items to take
   @return {::Stream}
   @summary  Takes `count` items from `sequence`
   @desc
      Generates a stream that contains at most the first `count` items from
      `sequence` (or fewer, if `sequence` contains fewer items).

      ### Example:

          each(take(integers(), 10), function(x) { console.log(x) })

          // same as above, with double dot and blocklamdba syntax:

          integers() .. take(10) .. each { |x| console.log(x) }
*/
function take(sequence, count) {
  return Stream(function(r) {
    var n = count;
    if (n > 0) sequence .. each { |x| r(x); if (--n <= 0) return }
  });
}
exports.take = take;

/**
  @fucntion takeWhile
  @param {::Sequence} [sequence]
  @param {Function} [predicate]
  @return {::Stream}
  @summary Emit leading elements where `predicate(x)` returns true.
  @desc
    Returns a {::Stream} which will emit only the leading
    elements in [sequence] which satisfy `predicate`.

    ### Example:

        var even = (x) -> x%2 == 0;
        [0, 2, 4, 5, 6, 7, 8] .. seq.takeWhile(even) .. seq.toArray();
        // -> [0, 2, 4]
*/
function takeWhile(seq, fn) {
  return Stream(function(r) {
    seq .. each {|item|
      if (fn(item)) r(item);
      else return;
    }
  });
};
exports.takeWhile = takeWhile;

/**
   @function skip
   @altsyntax sequence .. skip(count)
   @param {::Sequence} [sequence] Input sequence
   @param {Integer} [count] Number of items to skip
   @return {::Stream}
   @summary  Skip `count` items from `sequence`
   @desc
      Generates a stream that contains all items from
      `sequence` starting from the `count+1`th item.

      ### Example:

          each(skip([1,2,3,4,5], 3), function(x) { console.log(x) }) // -> 4,5


          [1,2,3,4,5] .. skip(3) .. each { |x| console.log(x) }
*/
function skip(sequence, count) {
  // XXX could special-case this for array sequences for better performance
  return Stream(function(r) {
    var n = count;
      sequence .. each {
        |x|
        if (n > 0) { --n; continue; }
        r(x)
      }
  });
}
exports.skip = skip;

/**
  @fucntion skipWhile
  @param {::Sequence} [sequence]
  @param {Function} [predicate]
  @return {::Stream}
  @summary Skip leading elements where `predicate(x)` returns true.
  @desc
    Returns a {::Stream} which will skip the leading
    elements in [sequence] which satisfy `predicate`.

    ### Example:

        var even = (x) -> x%2 == 0;
        [0, 2, 4, 5, 6, 7, 8] .. seq.skipWhile(even) .. seq.toArray();
        // -> [5, 6, 7, 8]
*/
function skipWhile(seq, fn) {
  return Stream {|emit|
    var done = false;
    seq .. each {|item|
      if(done) emit(item);
      else {
        if (!fn(item)) {
          done = true;
          emit(item);
        }
      }
    }
  }
};
exports.skipWhile = skipWhile;

/**
   @function filter
   @altsyntax sequence .. filter(predicate)
   @param {::Sequence} [sequence] Input sequence
   @param {Function} [predicate] Predicate function
   @return {::Stream}
   @summary  Create a stream of elements of `sequence` that satisfy `predicate`
   @desc
      Generates a stream that contains all items `x` from `sequence` for which
      `predicate(x)` is truthy.

      ### Example:

          // print first 10 odd integers:

          each(take(filter(integers(), x=>x%2), 10), function(x) { console.log(x) })

          // same as above, with double dot and blocklamdba syntax:

          integers() .. filter(x=>x%2) .. take(10) .. each { |x| console.log(x) }
*/
function filter(sequence, predicate) {
  return Stream(function(r) {
    sequence .. each {
      |x|
      if (predicate(x))
        r(x);
    }
  });
}
exports.filter = filter;

/**
   @function partition
   @altsyntax sequence .. partition(predicate)
   @param {::Sequence} [sequence] Input sequence
   @param {Function} [predicate] Predicate function
   @return {[::Stream]} A pair of streams.
   @summary  Create a pair of [passes, fails] streams from an input stream and a predicate.
   @desc
      The first is all the elements that satisfy `predicate`, the second is those that don't.
      Generates two streams. The first contains all items `x` from `sequence` for which
      `predicate(x)` is truthy, the second contains items where it is falsy. The
      order of the original sequence is maintained in each output stream.

      ### Example:

          // print first 10 odd integers:

          var [odds, evens] = integers(1,10) .. partition(x->x%2);
          console.log("Odds: ", odds .. toArray);
          console.log("Evens: ", evens .. toArray);
          
          // will print:
          // Odds:  [ 1, 3, 5, 7, 9]
          // Evens: [ 2, 4, 6, 8, 10]
*/
function partition(sequence, predicate) {

  var buffers = [[], []];
  var emitters = [null, null]
  var drainer = null;
  var noop = -> null;
  var _resume = noop;

  var streams = [0,1] .. map((idx) -> Stream(function(r) {
    while(buffers[idx].length > 0) {
      r(buffers[idx].shift());
    }
    emitters[idx] = r;
    _resume();
    drainer.waitforValue();
  })) .. toArray;

  drainer = spawn(function() {
    // wait until one side wants results
    waitfor() {
      _resume = resume;
    }
    _resume = noop;

    sequence .. each {|item|
      var idx = predicate(item) ? 0 : 1;
      var emitter = emitters[idx];
      if (emitter) emitter(item);
      else buffers[idx].push(item);
    }
  }());

  return streams;
}
exports.partition = partition;

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

          each(take(map(integers(), x=>x*x), 10), function(x) { console.log(x) })

          // same as above, with double dot and blocklamdba syntax:

          integers() .. map(x=>x*x) .. take(10) .. each { |x| console.log(x) }
*/
function map(sequence, f) {
  return Stream(function(r) {
    sequence .. each { |x| r(f(x)) }
  });
}
exports.map = map;

/**
  @function concat
  @summary Concatenate multiple sequences into a single sequence.
  @param   {::Sequence} [sequence...] Multiple Sequence arguments or a single array of Sequences
  @return  {::Stream} A stream sequentially combining all elements of each input sequence.
                    This method acts like the builtin Array.prototype.concat method,
                    but operating on arbitrary sequences rather than only arrays.
*/
function concat(/* sequences ... */) {
  var sequences = expandSingleArgument(arguments);
  return Stream(function(r) {
    sequences .. each { |seq|
      seq .. each { |x| r(x); }
    }
  });
}
exports.concat = concat;

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
  return Stream(function(r) {
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
  });
}
exports.pack = pack;

/**
   @function combine
   @param {::Stream} [stream...] One or more streams
   @return {::Stream}
   @summary  Combines multiple streams into a single output stream.
   @desc
      Elements appear in the output stream as soon as they are received.

      ### Example:

          // build a drum loop:

          var drum = generate(function(emit) { emit("boom"); hold(400); });
          var cymbal = generate(function(emit) {
            hold(100);
            emit("tsh");
            hold(100);
            emit("tsh");
            hold(100);
            emit("tsh");
            hold(100);
          });

          var beats = combine(drum, cymbal);

          // `beats` will emit a new element every 100ms, following the pattern:
          // ['boom', 'tsh', 'tsh', 'tsh', 'boom', 'tsh', 'tsh' ... ]
*/
function combine(/* streams ... */) {
  var cutil = require('./cutil');
  var streams = arguments;
  return Stream(function(emit) {
    var include_stream = function(s) {
      s .. each(emit);
    }
    cutil.waitforAll(include_stream, streams);
  });
}
exports.combine = combine;

/**
   @function eventStream
   @param {cutil::Event} [event] An event.
   @return {::Stream}
   @summary  Builds a continuous stream from `cutil::Event` emissions.
   @desc
      Elements will appear in the output stream as soon as they are received.

      **Note**: the generated stream will never complete - it will continue waiting
      for futher events until retracted. It will also only buffer events once iteration of
      the stream has begun - i.e it will drop any events that occur between creation
      of the stream and passing it to `each` (or another iterating function).

      ### Example:

          // Assume dataStore.recordAdded is a `cutil.Event` object
          // which emits the record each time a new record is added.
          
          var newRecord = dataStore.recordAdded;
          
          var people = eventStream(newRecord) .. filter(p -> p.isPerson());
          var firstTenPeople = people .. take(10);
*/
var eventStream = function(eventEmitter) {
  return Stream(function(emit) {
    var buffer = [];
    var noop = () -> null;
    var collect = noop;
    waitfor {
      // buffer is synchronous, so we won't miss any events
      while(true) {
        buffer.push(eventEmitter.wait());
        spawn(collect());
      }
    } and {
      while(true) {
        collect = noop;
        while(buffer.length > 0) {
          emit(buffer.shift());
        }
        waitfor() {
          collect = resume
        }
      }
    }
  });
}
exports.eventStream = eventStream;

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
  return Stream(function(r) {
    sequence .. each { 
      |x| 
      u(x) .. each { |y| r(y) } 
    }
  })
}
exports.unpack = unpack;

/**
  @function groupBy
  @param {::Sequence} [seq]
  @param {optional Function|String} [key] Function or property name to group by.
  @summary Group sequential elements by their key.
  @return {::Stream}
  @desc
    Return a stream that emits groups of sequential elements
    with the same key (the result of passing each element to the
    provided `key` function).

    Each emitted group has two elements: the key value, and the
    array of matched elements.
    

    ### Example:
    
        // group numbers by their remainder modulo 3:

        [3,6,9,11,2,3] .. seq.groupBy(n->n%3) .. seq.each(console.log)
        // will print:
        // [ 0, [ 3, 6, 9 ] ]
        // [ 2, [ 11, 2 ] ]
        // [ 0, [ 3 ] ]

    Note that the last `3` forms a new group with the key `0` - if
    you want to only have each key appear once, you'll need to
    pass in a sequence that is already sorted by `key`
    (see [::sortBy]).
*/
function groupBy(seq, key) {
  key = keyFn(key);
  return Stream(function(r) {
    var group = [];
    var groupKey = {};
    var currentKey = {};
    var emit = function(empty) {
      if (group.length === 0) return;
      r([groupKey, group]);
      group = [];
    };

    seq .. each {|item|
      currentKey = key(item);
      if (currentKey !== groupKey) {
        emit();
        groupKey = currentKey;
      }
      group.push(item);
    }
    emit();
  });
};
exports.groupBy = groupBy;

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

          zip(integers(1), "This is a string") .. each { |x| console.log("#{x[0]}:#{x[1]}") }

          // -> 1:T, 2:h, 3:i, 4:s, 5: , 6:i, 7:s, ...
*/
function zip(/* sequences... */) {
  var sequences = arguments;
  return Stream(function(r) {
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
  });
}
exports.zip = zip;

/**
  @function zipLongest
  @summary like [::zip], but continues for as long as the longest input.
  @desc
    See [::zip].

    While `zip` stops at the end of the shortest input sequence,
    `zipLongest` emits items until all sequences have ended.
    `undefined` is used where there are no more input elements in a given
    position.

    ### Example:

        zipLongest([1,2,3,4], ['one','two']) .. toArray()

        // -> [[1, 'one'], [2, 'two'], [3, undefined], [4, undefined]]
*/
function zipLongest(/* sequences... */) {
  var sequences = arguments;
  return Stream(function(r) {
    var iterators = sequences .. map(seq => makeIterator(seq)) .. toArray;
    try {
      var done = false;
      while (!done) {
        var x = [];
        var done = true;
        iterators .. each {
          |iter|
          var item;
          if (iter.hasMore()) {
            done = false;
            item = iter.next();
          }
          x.push(item);
        }
        if (!done) r(x);
      }
    }
    finally {
      iterators .. each { |iter| iter.destroy() }
    }
  });
};
exports.zipLongest = zipLongest;

/**
   @function indexed
   @param {::Sequence} [sequence]
   @param {Optional Integer} [start]
   @return {::Stream}
   @summary  Generate an indexed stream of pairs [index, val] with `index` beginning from
             `start` (or 0 if no start given) and incrementing for each successive value.
   @desc
      Example usage:

          indexed(["one", "two", "three"], 1) .. toArray()
          // returns [[1, "one"], [2, "two"], [3, "three"]]

*/
function indexed(sequence, start) {
  return Stream(function(r) {
    var i = start || 0;
    sequence .. each { |x| r([i++, x]) }
  });
}
exports.indexed = indexed;

/**
   @function reduce
   @altsyntax sequence .. reduce(initial, f)
   @param {::Sequence} [sequence] Input sequence
   @param {Object} [initial] Initial value
   @param {Function} [f] Reducer function
   @return {Object} 
   @summary Cumulatively combine elements of a sequence given an initial value
   @desc
     Also known as `foldl` or `inject`.

     Initializes an accumulator `accu` to `initial`, executes
     `accu = f(accu, x)` for each element `x` in `sequence`, and yields the
     final value of `accu` as return value.

     ### Example:

         // sum integers from 1 to 100:

         integers(1,100) .. reduce(0, (sum, x) => sum + x)
*/
function reduce(sequence, initial, f) {
  var accu = initial;
  sequence .. each { |x| accu = f(accu, x) }
  return accu;
}
exports.reduce = reduce;

/**
   @function reduce1
   @altsyntax sequence .. reduce1(f, [default_val])
   @param {::Sequence} [sequence] Input sequence
   @param {Function} [f] Reducer function
   @param {optional Object} [default_val=undefined] Value to return if `sequence` is empty
   @return {Object} 
   @summary Cumulatively combine elements of a sequence
   @desc
     Same as [::reduce], but using the first element of `sequence` as initial value.

     ### Example:

         // sum integers from 1 to 100:

         integers(1,100) .. reduce((sum, x) => sum + x)
*/
function reduce1(sequence, f, default_val) {
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
  return first ? default_val : accu;
}
exports.reduce1 = reduce1;

/**
   @function find
   @altsyntax sequence .. find(p, defval)
   @param {::Sequence} [sequence] Input sequence
   @param {Function} [p] Predicate function
   @param {optional Object} [defval=undefined] Default value to return if no match is found
   @return {Object} Matching element or `defval` if no match was found
   @summary Find first element `x` of `sequence` for which `p(x)` is truthy.
*/
function find(sequence, p, defval) {
  sequence .. each { |x| if (p(x)) return x }
  return defval;
}
exports.find = find;

/**
   @function all
   @altsyntax sequence .. all(p)
   @param {::Sequence} [sequence] Input sequence
   @param {Function} [p] Predicate function
   @return {Boolean} 
   @summary Returns `true` if `p(x)` is truthy for all elements in `sequence`, `false` otherwise.
*/
function all(sequence, p) {
  sequence .. each { |x| if (!p(x)) return false }
  return true;
}
exports.all = all;

/**
   @function any
   @altsyntax sequence .. any(p)
   @param {::Sequence} [sequence] Input sequence
   @param {Function} [p] Predicate function
   @return {Boolean} 
   @summary Returns `true` if `p(x)` is truthy for any elements in `sequence`, `false` otherwise.
*/
function any(sequence, p) {
  sequence .. each { |x| if (p(x)) return true }
  return false;
}
exports.any = any;

/**
   @function parallelize
   @altsyntax sequence .. parallelize([max_strata])
   @param {::Sequence} [sequence] Input sequence
   @param {optional Integer} [max_strata=10] Maximum number of parallel strata to spawn
   @return {::Stream}
   @summary  Parallelize a sequence
   @desc
      Generates a parallelized stream from `sequence`.
*/
function parallelize(sequence, max_strata) {
  max_strata = max_strata || 10;
  return Stream(function(r) {
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
        and {
          // by adding another dispatch() call clause here, we ensure
          // that we don't build a long linear chain of dispatch
          // calls, but a tree. this greatly aids scaling with large
          // parallelism
          if (count < max_strata) dispatch();
        }
      }
      dispatch();
    }
  })
}
exports.parallelize = parallelize;


/* NOT PART OF DOCUMENTED API YET
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


//----------------------------------------------------------------------
// Utility sequences:

var MAX_PRECISE_INT = 9007199254740992; // 2^53
/**
   @function integers
   @param {optional Integer} [start=0] Start integer
   @param {optional Integer} [end=2^53] End integer
   @return {::Stream}
   @summary Generate a stream of integers from `start` to `end`
   @desc
     ### Example:
     
         // print integers from 1 to 100:
         integers(1,100) .. each { |x| console.log(x) }
*/
function integers(start, end) {
  if (start == undefined) start = 0;
  if (end == undefined) end = MAX_PRECISE_INT;
  return Stream(function(r) { for (var i=start;i<= end;++i) r(i) });
}
exports.integers = integers;

/**
   @function fib
   @return {::Stream}
   @summary Generate a stream of [Fibonacci numbers](http://en.wikipedia.org/wiki/Fibonacci_number) beginning with 1
   @desc
     ### Example:
     
         // print first 10 Fibonacci numbers
         fib() .. take(10) .. each { |x| console.log(x) }
*/
function fib() {
  return Stream(function(r) {
    var [i1, i2] = [1,1];
    while (1) {
      r(i1);
      [i1,i2] = [i2, i1+i2];
    }
  })
}
exports.fib = fib;

