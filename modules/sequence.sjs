/*
 * StratifiedJS 'sequence' module
 * Constructs for manipulating sequence structures (arrays, strings and more general streams)
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.14.0'
 * http://onilabs.com/stratifiedjs
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
     When called, `S(r)` must sequentially invoke `r(x)` with the stream's data elements 
     `x=x1,x2,x3,...` until the stream is empty. `S` must not invoke `r` reentrantly.

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
  @summary Return a Stream
  @desc
    If `sequence` is a [::Stream], it is returned unmodified.
    Otherwise, it returns a new [::Stream] that iterates over the
    given sequence, like so:

        return Stream(function (emit) {
          seq .. each(emit);
        });

    This function is not often necessary, but can help in tests or
    other cases where you have an array but want to ensure that your
    code works when given a [::Stream].

    You can also use this function to give some code access to an
    array's elements but not the ability to modify the array,
    without the overhead of copying the array.

    ### Example
        
        var arr = [1,2,3,4];
        someFn(arr .. toStream());

        // someFn can iterate over the elements in `arr`,
        // but it cannot modify `arr` directly.

    */
var toStream = function(arr) {
  if (isStream(arr)) return arr;
  return Stream({|r| each(arr, r)});
}
exports.toStream = toStream;

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
   @desc
     `generate(f)` is a shorthand for `Stream(function(r) { while(true) r(f()) })`.

     ### Example:

         var rand = generate(Math.random);

         rand .. take(10) .. toArray; // -> [... 10 random numbers ...]

     Note that, in general, a generated stream will be non-replayable. E.g. 
     subsequent playbacks of the `rand` stream will (in general) yield 
     different results:

         rand .. take(10) .. toArray; // -> [... 10 random numbers ...]
         rand .. take(10) .. toArray; // -> [... 10 different random numbers ...]
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
   @return {::Sequence} The `sequence` that was passed in.
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
  return sequence;
}
exports.each = each;

var noop = function() {};
function exhaust(seq) { each(seq, noop); }

/**
   @function consume
   @altsyntax sequence .. consume([eos]) { |next| ... }
   @param {::Sequence} [sequence] Input sequence
   @param {optional Object} [eos=undefined] End of sequence marker
   @param {Function} [loop] Iteration loop
   @summary Execute an iteration loop for the given sequence
   @desc
     Calls function `loop` with one parameter, a `next` function which,
     when called within the scope of `loop`, will return successive
     elements from `sequence`. If there are no more elements in `sequence`,
     calls to `next()` will yield `eos`.

     It is *not* safe to call `next()` concurrently from multiple
     strata. If you need to do that, sequentialize access to `next`
     using e.g. [function::sequential].

     ### Example:

         consume([1,2,3,4], function(next) {
           var x;
           while ((x = next()) !== undefined)
             console.log(x);
         })

         // same as above, using double dot & blocklambda call syntax:
         
         [1,2,3,4] .. consume {
           |next|
           var x;
           while ((x = next()) !== undefined)
             console.log(x);
         }
     
*/

function consume(/* sequence, [opt]eos, loop */) {
  
  var sequence, eos, loop;
  if (arguments.length > 2)
    [sequence, eos, loop] = arguments;
  else
    [sequence, loop] = arguments;
  
  var emit_next, want_next;
  
  // Note: it is *not* safe to call `next` concurrently from multiple
  // strata! We could guard against that by wrapping the function in
  // [function::sequential], but since it's an uncommon thing, let's
  // leave the responsibility with the caller.
  var next = function() {
    if (emit_next) throw new Error("Must not make concurrent calls to a `consume` loop's `next` function.");
    waitfor(var rv) {
      emit_next = resume;
      want_next();
    }
    finally { emit_next = undefined; }
    return rv;
  };

  // We do two things at the same time:
  // - retrieve elements from sequence 's' using 'each'
  // - run the user provided 'loop'
  // element retrieval is paced by calls the user makes to 'next' in 'loop'
  waitfor {
    // Element retrieval
    
    // First wait until the user loop requests the first element:
    waitfor() { want_next = resume }

    // Now play the sequence:
    sequence .. each { 
      |x|
      // Emit x to the user loop, and wait for the next element to be
      // requested. Note how we *first* set up the 'want_next'
      // listener and then emit x. This ensures that everything works
      // in the synchronous case, where 'emit_next' causes 'want_next'
      // to be called synchronously.
      waitfor() {
        want_next = resume;
        emit_next(x);
      }
    }

    // The sequence has finished. Emit 'eos' until exiting of the
    // user loop pulls down the waitfor-or:
    while (1) {
      waitfor() {
        want_next = resume;
        emit_next(eos);
      }
    }
  }
  or {
    // User loop; this also dictates the lifetime of the whole
    // waitfor-or: When the user loop exits, the whole waitfor-or gets
    // torn down.
    loop(next);
  }
}
exports.consume = consume;


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
  @summary Exception thrown by [::first] and [::at] when accessing a non-existent element.
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

    Note that if `seq` is a non-repeatable [::Stream] 
    (e.g. a stream such as `generate(Math.random)`),
    it doesn't just "peek" at the first item - it will consume (and return) it.
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
    (or a [::SequenceExhausted] error thrown if no `defaultValue` was given).
    
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
    except that it accepts any [::Sequence] as input and returns
    a [::Sequence] as output.

    The implementation only evaluates as many elements as required, for example
    you can take the slice of an infinite sequence if both `start` and `end`
    are positive:

        seq.integers() .. seq.slice(2, 8) .. seq.toArray();
        // [ 2, 3, 4, 5, 6, 7 ]

    [Array.slice]: https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Array/slice

    Note that you must not rely on this function returning an array,
    even though it will do so from some code paths. If you need an array,
    you should always call [::toArray] on the result.
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
  return sequence;
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
  @function takeWhile
  @param {::Sequence} [sequence]
  @param {Function} [predicate]
  @return {::Stream}
  @summary Emit leading elements where `predicate(x)` returns true.
  @desc
    Returns a [::Stream] which will emit only the leading
    elements in `sequence` which satisfy `predicate`.

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
  @function skipWhile
  @param {::Sequence} [sequence]
  @param {Function} [predicate]
  @return {::Stream}
  @summary Skip leading elements where `predicate(x)` returns true.
  @desc
    Returns a [::Stream] which will skip the leading
    elements in `sequence` which satisfy `predicate`.

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
   @altsyntax sequence .. filter([predicate])
   @param {::Sequence} [sequence] Input sequence
   @param {optional Function} [predicate] Predicate function
   @return {::Stream}
   @summary  Create a stream of elements of `sequence` that satisfy `predicate`
   @desc
      Generates a stream that contains all items `x` from `sequence` for which
      `predicate(x)` is truthy.

      If `predicate` is not given, the identity function is used - that is, the
      result will include all truthy items.

      ### Example:

          // print first 10 odd integers:

          each(take(filter(integers(), x=>x%2), 10), function(x) { console.log(x) })

          // same as above, with double dot and blocklamdba syntax:

          integers() .. filter(x=>x%2) .. take(10) .. each { |x| console.log(x) }
*/
var id = (x) -> x;
function filter(sequence, predicate) {
  if (!predicate) predicate = id;
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
   @return {::Stream} A pair of streams.
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
  var _resume = noop;

  var streams = [0,1] .. map((idx) -> Stream(function(r) {
    while(buffers[idx].length > 0) {
      r(buffers[idx].shift());
    }
    emitters[idx] = r;
    _resume();
    drainer.waitforValue();
  }));

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
   @return {Array}
   @summary  Create an array `f(x)` of elements `x` of `sequence`
   @desc
      Generates an array of elements `[f(x1), f(x2), f(x3),...]` where `x1, x2, x3, ..` 
      are successive elements from `sequence`.

      This function is eager - it will fully consume the input sequence before returning
      its result. If you want a lazy version which returns a stream of
      items and doesn't perform operations until they are required, use [::transform]. 
      
      `seq .. map(f)` is in effect equivalent to `seq .. transform(f) .. toArray`.

      ### Example:

          // print first 10 squares:

          each(map(take(integers(), 10), x=>x*x), function(x) { console.log(x) })

          // same as above, with double dot and blocklamdba syntax:

          integers() .. take(10) .. map(x=>x*x) .. each { |x| console.log(x) }
*/
function map(sequence, f) {
  var r=[];
  sequence .. each {|x| r.push(f(x)) }
  return r;
}
exports.map = map;

/**
   @function transform
   @altsyntax sequence .. transform(f)
   @param {::Sequence} [sequence] Input sequence
   @param {Function} [f] Function to apply to each element of `sequence`
   @return {::Stream}
   @summary  Create a stream `f(x)` of elements `x` of `sequence`
   @desc
      Acts like [::map], but lazily - it returns a [::Stream] instead of an Array.

      ### Example:

          // print first 10 squares:

          each(take(transform(integers(), x=>x*x), 10), function(x) { console.log(x) })

          // same as above, with double dot and blocklamdba syntax:

          integers() .. transform(x=>x*x) .. take(10) .. each { |x| console.log(x) }

      Note that, because `transform` is lazy, if you iterate over the
      resulting stream more than once, the results will be re-computed
      each time:

          var squares = [1,2,3,4] .. transform(x=>x*x);

          squares .. each { |x| ... } // squares will be calculated as we iterate
          ...
          squares .. each { |x| ... } // squares will be calculated *again* 
          
      This is in contrast to [::map], which generates an array:

          var squares = [1,2,3,4] .. map(x=>x*x);
          // squares have now been calculated and put into an array
          
          squares .. each { |x| ... } // no recalculation here
          ...
          squares .. each { |x| ... } // neither here

*/
function transform(sequence, f) {
  return Stream(function(r) {
    sequence .. each { |x| r(f(x)) }
  });
}
exports.transform = transform;

/**
  @function concat
  @summary Concatenate multiple sequences into a single sequence.
  @param   {::Sequence} [sequence...] Multiple Sequence arguments or a single array of Sequences
  @return  {::Stream} A stream sequentially combining all elements of each input sequence.
  @desc                  
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

    sequence .. consume(eos) { 
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
   @function combine
   @param {::Stream} [stream...] One or more streams
   @return {::Stream}
   @summary  Combines multiple streams into a single output stream.
   @desc
      Elements appear in the output stream as soon as they are received.

      ### Example:

          // build a drum loop:

          var drum = Stream(function(emit) { 
            while (true) { 
              emit("boom"); 
              hold(400); 
            }
          });

          var cymbal = Stream(function(emit) {
            while (true) { 
              hold(100);
              emit("tsh");
              hold(100);
              emit("tsh");
              hold(100);
              emit("tsh");
              hold(100);
            }
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
  @function groupBy
  @altsyntax sequence .. groupBy([key])
  @param {::Sequence} [seq]
  @param {optional Function|String} [key] Function or property name to group by.
  @summary Group sequential elements by their key.
  @return {::Stream}
  @desc
    Return a stream that emits groups of adjacent elements
    with the same key (the result of passing each element to the
    provided `key` function, or if `key` is a string, 
    the result of applying `elem[key]`, or if no `key` is provided, 
    the element itself). Keys will be compared with `===`.

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

          zip(integers(1), "This is a string") .. each { 
            |x| 
            console.log("#{x[0]}:#{x[1]}") 
          }

          // -> 1:T, 2:h, 3:i, 4:s, 5: , 6:i, 7:s, ...
*/
function zip(/* sequences... */) {
  var sequences = arguments;
  return Stream(function(r) {
    var iterators = sequences .. map(seq => makeIterator(seq));
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
  @param {::Sequence} [sequence...] One or more sequences
  @summary like [::zip], but continues for as long as the longest input.
  @desc
    See [::zip].

    While [::zip] stops at the end of the shortest input sequence,
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
    var iterators = sequences .. map(seq => makeIterator(seq));
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
   @altsyntax sequence .. indexed([start])
   @param {::Sequence} [sequence]
   @param {optional Integer} [start=0]
   @return {::Stream}
   @summary  Generate an indexed stream of pairs [index, val] with `index` beginning from
             `start` (or 0 if no start given) and incrementing for each successive value.
   @desc
      Example usage:

          ["one", "two", "three"] .. indexed(1) .. toArray()
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
   @altsyntax sequence .. find(p, [defval])
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

/* NOT PART OF DOCUMENTED API YET
   @function makeIterator
   @summary To be documented
*/
function makeIterator(sequence) {
  var eos = {};
  var next_upstream = -> eos;
  var stratum = spawn (function() {
    sequence .. consume(eos) {
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

//----------------------------------------------------------------------
// parallel sequence operations

/**
   @function each.par
   @altsyntax sequence .. each.par([max_strata]) { |item| ... }
   @param {::Sequence} [sequence] Input sequence
   @param {optional Integer} [max_strata=undefined] Maximum number of concurrent invocations of `f`. (undefined == unbounded)
   @param {Function} [f] Function to execute for each `item` in `sequence`
   @return {::Sequence} The `sequence` that was passed in.
   @summary Executes `f(item)` for each `item` in `sequence`, making up to `max_strata` concurrent calls to `f` at any one time.
*/
each.par = function(/* seq, max_strata, r */) {
  var seq, max_strata, r;
  if (arguments.length === 2)
    [seq, r] = arguments;
  else /* arguments.length == 3 */
    [seq, max_strata, r] = arguments;

  if (!max_strata) max_strata = -1;

  var eos = {};
  seq .. consume(eos) {
    |next|

    // flag shared between all `inner` calls that indicates whether
    // one of them is currently in a (blocking) call to `next`. `next`
    // must not be called from multiple strata concurrently.
    var waiting_for_next = false;

    // depth counter for asynchronising the generation of our `inner`
    // nodes; see below
    var depth = 0;

    /* 
       inner() operates in two modes: If `r` doesn't block, then
       we stay in a loop ('sync' mode)

           while (1) { var x = next(); r(x); }

       If `r` blocks and we haven't exhausted our maximum number of
       strata, then we run a concurrent call to `inner` (see
       `async_trigger`), effectively building a tree of waitfor/and
       `inner` nodes. This also puts the current `inner` node into
       'async' mode: We break out of the 'sync' mode loop when r() is
       done to give the node a chance to drop out of the tree (by
       tail-call machinery). 

       Note: It appears that this function could be written in a much
       simpler way, e.g. replacing the async_trigger call with a
       direct call to `inner`, or removing the while()-loop and just
       always building a recursive tree. There are reasons though why
       the function is structured in the way it is:

         - We want it to be tail-call safe, so that we can run in
           bounded memory.

         - It needs to perform well even when both the upstream and
           downstream are non-blocking (and all combinations of
           blocking/non-blocking)
    */
    function inner() { 
      var async = false;
      waitfor {
        waitfor() { var async_trigger = resume; }
        async = true;
        inner();
      }
      and {
        while (1) {
          waiting_for_next = true;
          var x = next();
          if (x === eos) return;
          waiting_for_next = false;

          if (--max_strata === 0) {
            r(x);
            ++max_strata;
            if (waiting_for_next) return;
          }
          else {  
            waitfor {
              r(x);
              ++max_strata;
              if (!async && !waiting_for_next) continue;
            }
            and {
              // the hold(0) is necessary to put us into
              // tail-recursive mode, so that we don't blow the stack
              // when next() generates data without blocking.  for
              // performance reasons we only do this only after having
              // built the tree to a certain depth:
              if (++depth % 100 == 0)
                hold(0); 
              if (!waiting_for_next) {
                async_trigger();
              }
            }
            break;
          }
        }
        if (max_strata === 1) {
          // we're operating at the strata limit; process the next
          // item from upstream:
          inner();
        }
      }
    }
    // kick things off:
    inner();
  }
  return seq;
};

/**
   @function map.par
   @altsyntax sequence .. map.par([max_strata], f)
   @param {::Sequence} [sequence] Input sequence
   @param {optional Integer} [max_strata=undefined] Maximum number of concurrent invocations of `f`. (undefined == unbounded)
   @param {Function} [f] Function to apply to each element of `sequence`
   @return {Array}
   @summary  Create an array `f(x)` of elements `x` of `sequence`, making up to `max_strata` concurrent calls to `f` at any one time.
   @desc
      The order of the resulting array will be determined by the order in 
      which the concurrent calls to `f` complete.
*/
map.par = function(/* sequence, max_strata, f */) {
  var sequence, max_strata, f;
  if (arguments.length === 2)
    [sequence, f] = arguments;
  else /* arguments.length == 3 */
    [sequence, max_strata, f] = arguments;

  var r=[];
  sequence .. each.par(max_strata) {|x| r.push(f(x)) }
  return r;
};

/**
   @function transform.par
   @altsyntax sequence .. transform.par([max_strata], f)
   @param {::Sequence} [sequence] Input sequence
   @param {optional Integer} [max_strata=undefined] Maximum number of concurrent invocations of `f`. (undefined == unbounded)
   @param {Function} [f] Function to apply to each element of `sequence`
   @return {::Stream}
   @summary  Create a stream `f(x)` of elements `x` of `sequence`, making up to `max_strata` concurrent calls to `f` at any one time.
   @desc
      The order of the resulting stream will be determined by the order in 
      which the concurrent calls to `f` complete.
*/
transform.par = function(/* sequence, max_strata, f */) {
  var sequence, max_strata, f;
  if (arguments.length === 2)
    [sequence, f] = arguments;
  else /* arguments.length == 3 */
    [sequence, max_strata, f] = arguments;

  return Stream(function(r) {
    sequence .. each.par(max_strata) { |x| r(f(x)) }
  });
};

/**
   @function find.par
   @altsyntax sequence .. find.par([max_strata], p, [defval])
   @param {::Sequence} [sequence] Input sequence
   @param {optional Integer} [max_strata=undefined] Maximum number of concurrent invocations of `p`. (undefined == unbounded)
   @param {Function} [p] Predicate function
   @param {optional Object} [defval=undefined] Default value to return if no match is found
   @return {Object} Matching element or `defval` if no match was found
   @summary Find first element `x` of `sequence` for which `p(x)` is truthy. Up to `max_strata` concurrent calls to `f` will be performed at any one time.
*/
find.par = function(/* sequence, max_strata, p, defval */) {
  var sequence, max_strata, p, defval;
  if (typeof arguments[1] == 'function')
    [sequence, p, defval] = arguments;
  else
    [sequence, max_strata, p, defval] = arguments;

  sequence .. each.par(max_strata) { |x| if (p(x)) return x }
  return defval;
};

/**
   @function filter.par
   @altsyntax sequence .. filter.par([max_strata], [predicate])
   @param {::Sequence} [sequence] Input sequence
   @param {optional Integer} [max_strata=undefined] Maximum number of concurrent invocations of `predicate`. (undefined == unbounded)
   @param {optional Function} [predicate] Predicate function (default = identity function).
   @return {::Stream}
   @summary  Create a stream of elements of `sequence` that satisfy `predicate`. Up to `max_strata` concurrent calls to `predicate` will be performed at any one time.
   @desc
      The order of the resulting stream will be determined by the order in 
      which the concurrent calls to `predicate` complete.
*/
filter.par = function(/* sequence, max_strata, predicate */) {
  var sequence, max_strata, predicate;
  if (arguments.length == 1)
    [sequence] = arguments;
  else if (arguments.length == 2) {
    if (typeof arguments[1] == 'function')
      [sequence, predicate] = arguments;
    else
      [sequence, max_strata] = arguments;
  }
  else
    [sequence, max_strata, predicate] = arguments;
      
  if (!predicate) predicate = id;

  return Stream(function(r) {
    sequence .. each.par(max_strata) {
      |x|
      if (predicate(x))
        r(x);
    }
  });
};


/**
   @function all.par
   @altsyntax sequence .. all.par([max_strata], p)
   @param {::Sequence} [sequence] Input sequence
   @param {optional Integer} [max_strata=undefined] Maximum number of concurrent invocations of `p`. (undefined == unbounded)
   @param {Function} [p] Predicate function
   @return {Boolean} 
   @summary Returns `true` if `p(x)` is truthy for all elements in `sequence`, `false` otherwise. Up to `max_strata` concurrent calls to `p` will be performed at any one time.
*/
all.par = function(/* sequence, max_strata, p */) {
  var sequence, max_strata, p;
  if (arguments.length == 2) 
    [sequence, p] = arguments;
  else
    [sequence, max_strata, p] = arguments;

  sequence .. each.par(max_strata) { |x| if (!p(x)) return false }
  return true;
};

/**
   @function any.par
   @altsyntax sequence .. any.par([max_strata], p)
   @param {::Sequence} [sequence] Input sequence
   @param {optional Integer} [max_strata=undefined] Maximum number of concurrent invocations of `p`. (undefined == unbounded)
   @param {Function} [p] Predicate function
   @return {Boolean} 
   @summary Returns `true` if `p(x)` is truthy for any elements in `sequence`, `false` otherwise. Up to `max_strata` concurrent calls to `p` will be performed at any one time.
*/
any.par = function(/* sequence, max_strata, p */) {
  var sequence, max_strata, p;
  if (arguments.length == 2) 
    [sequence, p] = arguments;
  else
    [sequence, max_strata, p] = arguments;

  sequence .. each.par(max_strata) { |x| if (p(x)) return true }
  return false;
};

