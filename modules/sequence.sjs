/*
 * StratifiedJS 'sequence' module
 * Constructs for manipulating sequence structures (arrays, strings and more general streams)
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.20.0-development'
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

var {isArrayLike, isQuasi, streamContents } = require('builtin:apollo-sys');
var { waitforAll, Queue, Semaphore, Condition, _Waitable } = require('./cutil');
var { Interface, hasInterface, Token } = require('./type');
var sys = require('builtin:apollo-sys');

module.setCanonicalId('sjs:sequence');

// identity function:
__js {
  var identity = (x) -> x;
  function isString(obj) {
    return typeof obj == 'string' || obj instanceof String;
  }
  var nope = -> false;
  var isBuffer = nope;
  if (sys.hostenv == 'nodejs') {
      isBuffer = Buffer.isBuffer.bind(Buffer);
  }
}

// XXX `sequential` is from the 'function.sjs' module - we can't
// import that because that would it would lead to a dependency
// cycle. We also don't want to lazily import it, because that can
// unexpectedly asynchronize code.
function sequential(f) {
  var permits = Semaphore(1);
  return function() {
    permits.synchronize {
      ||
      return f.apply(this, arguments);
    }
  };
}

//----------------------------------------------------------------------

/**
   @class Sequence
   @summary
    An Array, array-like object (like `arguments`, `NodeList`, `TypedArray`, etc),
    String,
    [bytes::Bytes]
    or [::Stream]
   @desc
     A sequence is a datastructure that can be sequentially processed by [::each].

     # Concrete sequences:

     A concrete sequence is one where:
     
      - all elements are already known and present in memory
      - iteration will not mutate the sequence
      - iteration will not suspend between successive elements
      - the sequence object has a `length` member containing the number of elements
      - elements are accessible using bracket notation (i.e. `seq[index]`)

     # Concrete sequence types:

     - Array
     - String (treated as a Character array)
     - nodejs Buffer (treated as an Integer array; nodejs only)
     - TypedArray (treated as an Integer array)
     - any `arguments` object
     - NodeList (xbrowser only)

     You can use [::isConcreteSequence] to check if a sequence is concrete.

     # Non-concrete sequences types:

     - [::Stream]

     There are no particular guarantees about the behaviour of non-concrete
     sequences. In particular, each individual sequence _may or may not_ be:

     - infinite
     - arbitrarily large
     - non-replayable (i.e. you may only iterate over the sequence once)
     - intermittent (successive items may be separated by long periods of time)

     Whether or not a given sequence has any of these traits depends
     on its implementation, and cannot be tested programmatically.
*/

/**
   @class Stream
   @summary Stratified stream abstraction
*/

/**
   @function Stream
   @summary Mark a streaming function as a Stream
   @param {Function} [S] Streaming function
   @desc
     A streaming function `S` is a function with signature `S(emit)`, where `emit`, is a
     function of a single argument.
     When called, `S(emit)` must sequentially invoke `emit(x)` with the stream's data elements
     `x=x1,x2,x3,...` until the stream is empty. `S` must not invoke `emit` reentrantly.

     ### Example:

          // The stream 1,2,3,...,10 can be expressed by:
          var s = Stream(function(emit) {
            for (var i=1; i<=10; ++i) emit(i);
          });

          // We can then use it with `each`:
          each(s, console.log); // -> 1,2,3,...,10

          // or, using a blocklambda:
          s .. each { |x| console.log(x*x) }  // -> 1,4,9,...,100

*/
__js {
  var stream_toString = function() {
    return "[object Stream]";
  };
  var Stream = function(S) {
    S.__oni_is_Stream = true;
    S.toString = stream_toString;
    return S;
  }
  exports.Stream = Stream;
}

/**
   @class BatchedStream
   @inherit ::Stream
   @summary Stratified stream abstraction
*/

/**
   @function BatchedStream
   @summary Create a BatchedStream from a streaming function
   @param {Function} [S] Streaming function
   @desc
     A streaming function `S` is a function with signature `S(emit)`, where `emit`, is a
     function of a single argument.
     When called, `S(emit)` must sequentially invoke `emit(x)` with the stream's data elements
     `x=x1,x2,x3,...` until the stream is empty. `S` must not invoke `emit` reentrantly.

     For a batched stream the individual data items are **arrays**. The downstream receiver
     will see an unbatched version of the stream, with individual elements of the array flattend
     into the stream when [::each] is called on the stream.

     Batched streams are useful when remoting streams over the
     network: A 'normal' unbatched stream makes a return trip over the
     network for every single stream item. Sometimes this is what we
     want, e.g. if the stream is an
     [observable::Observable]. However, when the streams contains
     non-temporal data - e.g. if it consists of a number of records
     retrieved for a database query - then it makes sense to send those 
     records in batches.

     To create a batched stream from an existing stream, use [::batchN].
     
*/
__js {
  var batchedStream_toString = function() {
    return "[object BatchedStream]";
  };
  var BatchedStream = function(S) {
    S.__oni_is_Stream = true;
    S.__oni_is_BatchedStream = true;
    S.toString = batchedStream_toString;
    return S;
  }
  exports.BatchedStream = BatchedStream;
}


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
__js var toStream = exports.toStream = function(arr) {
  if (isStream(arr)) return arr;
  return Stream(function(r) { return each(arr, r)});
}

/**
   @function isStream
   @param {Object} [s] Object to test
   @return {Boolean}
   @summary Returns `true` if `s` is a [::Stream], `false` otherwise.
*/
__js var isStream = exports.isStream = (s) -> s && s.__oni_is_Stream === true;

/**
   @function isBatchedStream
   @param {Object} [s] Object to test
   @return {Boolean}
   @summary Returns `true` if `s` is a [::BatchedStream], `false` otherwise.
*/
__js var isBatchedStream = exports.isBatchedStream = s ->
    s && s.__oni_is_BatchedStream === true;

/**
   @function isConcreteSequence
   @param {Object} [s] Object to test
   @return {Boolean}
   @summary Returns `true` if `s` is a concrete sequence
   
   @desc
    See [::Sequence] for a description of concrete sequences;
*/
__js var isConcrete = exports.isConcreteSequence = (s) ->
    isArrayLike(s) || isString(s) || isBuffer(s);

/**
   @function isSequence
   @param {Object} [s] Object to test
   @return {Boolean}
   @summary Returns `true` if `s` is a [::Sequence], `false` otherwise.
*/
__js var isSequence = exports.isSequence = (s) ->
  isConcrete(s) ||
  isStream(s) || hasInterface(s, ITF_EACH);

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
//

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

/*
slightly non-trivial implementation to optimize performance in the
non-synchronous case:
*/
__js {
var ITF_EACH = Interface(module, 'each');
exports.ITF_EACH = ITF_EACH;

function each(sequence, r) {
  var fn = sequence[ITF_EACH];
  if (fn != null) {
    return fn(sequence, r);

  }
  else if (isBatchedStream(sequence)) {
    return iterate_batched_stream(sequence, r);
  }
  else if (isStream(sequence)) {
    return sequence(r);

  } 
  else {
    if (isConcrete(sequence)) {
      for (var i=0, l=sequence.length; i<l; ++i) {
        var res = r(sequence[i]);
        if (__oni_rt.is_ef(res))
          return async_each(sequence, r, i, res);
      }
    }
    else
      throw new Error("Unsupported sequence type '#{typeof sequence}'");
  }
}
exports.each = each;
}

function async_each(arr, r, i, ef) {
  ef.wait();
  var l = arr.length;
  for (++i; i<l; ++i)
    r(arr[i]);
}

function iterate_batched_stream(sequence, r) {
  sequence({
    |arr|
    arr .. each(r);
  })
}


//----------------------------------------------------------------------
// projection



__js {
  /*
    @variable ITF_PROJECT
    XXX TO BE DOCUMENTED
  */
  var ITF_PROJECT = Interface(module, 'project');
  exports.ITF_PROJECT = ITF_PROJECT;
  

  /*
    @variable knownProjectionMethods
    XXX TO BE DOCUMENTED
  */
  var METHOD_ObservableArray_project = Token(module, 'method', 'ObservableArray_project');
  exports.METHOD_ObservableArray_project = METHOD_ObservableArray_project;

  var knownProjectionMethods = {};
  exports.knownProjectionMethods = knownProjectionMethods;
}

knownProjectionMethods[METHOD_ObservableArray_project] = (s,t) -> require('sjs:observable').ObservableArray_project(s,t);

__js {
  /**
    @function project
    @altsyntax sequence .. project(f)
    @param {::Sequence} [sequence] Input sequence
    @param {Function} [f] Function to map over `sequence`
    @return {::Sequence} Sequence of same type as input sequence
    @summary  Map a function over a sequence in a type-preserving way
    @desc

      Performs a type-preserving map transformation. 
      `sequence .. project(f)` is equivalent to

       * `sequence .. @transform(f)` if `sequence` is a generic [::Stream].
       * `arr .. @transform(f) .. @toArray` if `arr` is array-like.
       * `str .. @transform(f) .. @join('')` if  `str` is a string.


      For [observable::ObservableArray], `sequence .. project(f)`
      returns an [observable::ObservableArray] where each element
      `e` of the array is transformed to `f(e)`. 
  */
  function project(sequence, f) {
    var method = sequence[ITF_PROJECT];
    if (typeof method === 'function') {
      return method(sequence, f);
    }
    else if (typeof method === 'string') {
      method = knownProjectionMethods[method];
      if (!method) throw new Error('unknown projection method');
      return method(sequence, f);
    }
    // else if (isBatchedStream(sequence)) //XXX
    else if (isStream(sequence)) {
      return transform(sequence, f);
    }
    else if (isArrayLike(sequence)) {
      return map(sequence, f);
    }
    else if (isString(sequence)) {
      return project_string(sequence, f);
    }
    else 
      throw new Error("Don't know how to project this sequence");
  }
  exports.project = project;
}

var project_string = (str, f) -> str .. transform(f) .. join('');



__js var noop = function() {};
__js function exhaust(seq) { return each(seq, noop); }

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

__js function consume(/* sequence, [opt]eos, loop */) {

  var sequence, eos, loop;
  if (arguments.length > 2) {
    sequence = arguments[0];
    eos = arguments[1];
    loop = arguments[2];
  }
  else {
    sequence = arguments[0];
    loop = arguments[1];
  }

  if (isConcrete(sequence)) 
    return consumeConcreteSequence(sequence, eos, loop);
  else
    return consumeStream(sequence, eos, loop);
}

__js function consumeConcreteSequence(sequence, eos, loop) {
  var i = 0, l = sequence.length;

  function next() {
    if (i<l)
      return sequence[i++];
    else
      return eos;
  } 

  return loop(next);
}

function consumeStream(sequence, eos, loop) {
  var emit_next, want_next;

  // Note: it is *not* safe to call `next` concurrently from multiple
  // strata! We could guard against that by wrapping the function in
  // [function::sequential], but since it's an uncommon thing, let's
  // leave the responsibility with the caller.
  var next = function() {
    if (emit_next) throw new Error("Must not make concurrent calls to a `consume` loop's `next` function.");
    waitfor(var rv, is_error) {
      emit_next = resume;
      want_next();
    }
    finally { emit_next = undefined; }
    if (is_error) throw rv;
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
    try {
      sequence .. each {
        |x|
        // Emit x to the user loop, and wait for the next element to be
        // requested. Note how we *first* set up the 'want_next'
        // listener and then emit x. This ensures that everything works
        // in the synchronous case, where 'emit_next' causes 'want_next'
        // to be called synchronously.

        if (!emit_next) {
          // our emit_next function has been retracted while the
          // upstream generated its value 'x'. we need to wait until
          // the next item is requested:
          waitfor() { want_next = resume; }
        }
        
        waitfor() {
          want_next = resume;
          emit_next(x);
        }
      }
    }
    catch (e) {
      // Propagate the exception to our 'loop' block

      if (!emit_next) {
        // our emit_next function has been retracted while the
        // upstream generated the exception. we need to wait until
        // the next item is requested:
        waitfor() { want_next = resume; }
      }

      // we need to do this in a loop to account for the case where we
      // are being called repeatedly through e.g. a cached Iterator
      while (1) {
        waitfor() {
          want_next = resume;
          emit_next(e, true);
        }
      }
    }

    // The sequence has finished. Emit 'eos' until exiting of the
    // user loop pulls down the waitfor-or:

    if (!emit_next) {
      // our emit_next function has been retracted while the
      // upstream finished. we need to wait until
      // the next item is requested:
      waitfor() { want_next = resume; }
    }
    
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
   @function consumeMultiple
   @altsyntax consumeMultiple(sequences, [eos]) { |next| ... }
   @param {Array} [sequences] Array of input [::Sequence]s
   @param {optional Object} [eos=undefined] End of sequence marker
   @param {Function} [loop] Iteration loop
   @summary Execute an iteration loop for multiple sequences
   @desc
     Calls function `loop` with one parameter, an array of functions [`next1`, `next2`, ...] which,
     when called within the scope of `loop`, will return successive
     elements from the respective sequence in `sequences`. If there are no more elements in a 
     the nth sequence, calls to its corresponding `next` function will yield `eos`.

     `consumeMultiple` is equivalent to a nested invocation of [::consume]. Note the concurrency
     limitations regarding the `next` function listed there.
*/
// XXX recursive implementation doesn't scale well with large streams.count
function consumeMultiple(streams, eos, block) {

  if (arguments.length === 2) {
    block = eos;
    eos = undefined;
  }

  var nexts = [];
  consumeMultiple_inner(streams);

  function consumeMultiple_inner(streams) {
    if (streams.length) {
      consume(streams[0], eos) { 
        |next|
        nexts.push(next);
        consumeMultiple_inner(streams.slice(1));
      }
    }
    else {
      block(nexts);
    }
    
  }
}
exports.consumeMultiple = consumeMultiple;



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
    sequence .. each(__js function(x) { rv.push(x) });
    return rv;
  }
}
exports.toArray = toArray;

/**
  @class SequenceExhausted
  @summary Exception thrown by [::first] and [::at] when accessing a non-existent element,
           and by [::find] if a matching element isn't found before the sequence is exhausted.
*/
function SequenceExhausted(msg) {
  this.message = msg;
}
SequenceExhausted.prototype = new Error();
exports.SequenceExhausted = SequenceExhausted;

/**
  @function first
  @param {::Sequence} [sequence]
  @param {optional Object} [defaultValue]
  @summary Get the first item from a sequence
  @desc
    If `sequence` is empty, `defaultValue` is returned if it was given.
    Otherwise, this function raises a [::SequenceExhausted] error.

    Note that if `sequence` is a non-repeatable [::Stream]
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
  @function last
  @param {::Sequence} [sequence]
  @param {optional Object} [defaultValue]
  @summary Get the last item from a sequence
  @desc
    If `sequence` is empty, `defaultValue` is returned if it was given.
    Otherwise, this function raises a [::SequenceExhausted] error.

    Note that if `sequence` is a non-repeatable [::Stream]
    (e.g. a stream such as `generate(Math.random)`),
    it will consume the entire stream.
*/
exports.last = (seq, defaultValue) -> (arguments.length == 1) ? at(seq, -1) : at(seq, -1, defaultValue);

/**
  @function slice
  @summary Array.slice implementation for arbitrary sequences
  @param {::Sequence} [sequence]
  @param {Number} [start]
  @param {optional Number} [end]
  @return {::Sequence}
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

    Calling `slice` with a concrete [::Sequence] will always return an Array.

    Otherwise, the return value will be a [::Sequence] - the exact type is
    implementation-dependent (it will currently be a [::Stream] or Array).
    You should pass the result through [::toArray] if your code depends
    on Array-specific behaviour.
*/
function slice(sequence, start, end) {
  if(isString(sequence) || isBuffer(sequence)) return sequence.slice(start, end);
  if(isArrayLike(sequence)) {
    var m = (sequence.slice || Array.prototype.slice);
    // TypedArray `slice` method is buggy if you pass `undefined` as second argument.
    return (end === undefined) ? m.call(sequence, start) : m.call(sequence, start, end);
  }

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
   @altsyntax sequence .. join([separator, [final_separator]])
   @param {::Sequence} [sequence] Input sequence
   @param {optional String|Array|bytes::Bytes|Uint8Array|quasi::Quasi} [separator='']
   @param {optional String|Array|bytes::Bytes|Uint8Array|quasi::Quasi} [final_separator]
   @return {String|Buffer|Uint8Array|quasi::Quasi}
   @summary Joins all elements of the sequence with the given separator. If `final_separator` is given, the final two elements in the sequence will be joined with it, rather than `separator`.
   @desc
     By default, all elements in `sequence` are coerced into a String.

     If the separator is a [quasi::Quasi], then all elements in
     `sequence` are coerced into quasis using [quasi::toQuasi], and
     the sequence with interspersed separators will be joined using [quasi::joinQuasis].

     If the first element of `sequence` is a nodejs Buffer, a TypedArray or plain Array, then
     all items will be joined into a single return value of the same type, rather than
     a string. In this case, `separator` (and `final_separator`, if given) should be a concrete sequence of the appropriate
     element type.
*/
function join(sequence, separator, final_separator) {
  separator = separator || '';

  if (separator .. isQuasi) {
    if (final_separator !== undefined) {
      return sequence .. transform(x -> isQuasi(x) ? x : `$x`) .. 
        intersperse_n_1(separator, isQuasi(final_separator) ? final_separator : `$final_separator`) .. join._joinQuasis;
    }
    // else ... just one separator
    return sequence .. transform(x -> isQuasi(x) ? x : `$x`) .. intersperse(separator) .. join._joinQuasis;
  }
  var arr = sequence .. toArray;
  if (arr.length == 0) return '';
  if (arr[0] .. isBuffer || arr[0] .. isArrayLike) {
    if (separator.length > 0) {
      // XXX we silently ignore separators of wrong type here - is that a good idea?
      if (final_separator !== undefined && separator.length > 0)
        arr = arr .. intersperse_n_1(separator, final_separator) .. toArray;
      else
        arr = arr .. intersperse(separator) .. toArray;
    }
    if (arr[0] .. isBuffer) {
      return Buffer.concat(arr);
    } else if (arr[0] .. isArrayLike) {
      var len=0;
      arr .. each(__js function(i) { len += i.length});
      var cons = arr[0].constructor || Array;
      var rv = new cons(len);
      var offset = 0;
      if(rv.set) {
        arr .. each( __js function(a) {
          rv.set(a, offset);
          offset += a.length;
        });
      } else { // bytewise
        arr .. each {|a|
          a .. each( __js function(b) {
            rv[offset++] = b;
          });
        }
      }
      return rv;
    }
  }
  // else
  if (final_separator !== undefined)
    return (arr .. intersperse_n_1(separator, final_separator) .. toArray).join('');
  else
    return arr.join(separator);
}
exports.join = join;

// helper for joining quasis (exposed in quasi.sjs module as 'joinQuasis'):
// this is here and not in quasi.sjs, so that we don't need a
// lazy (or cyclic) import
join._joinQuasis = function(/*arguments*/) {
  var quasis = arguments.length == 1 ? arguments[0] : arguments;
  return quasis ..
    reduce(``, function(accu, quasi) {
      var l = accu.parts.length;
      if (l%2) {
        // last part of accu is a literal string
        var end = accu.parts.pop();
        if (!quasi.parts.length) quasi.parts.push('');
        accu.parts = accu.parts.concat(quasi.parts);
        accu.parts[l-1] = end + accu.parts[l-1];
      }
      else {
        // last part of accu is an interpolated value
        accu.parts = accu.parts.concat(quasi.parts);
      }
      return accu;
    });
};


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
  @function unique
  @altsyntax sequence .. unique
  @param {::Sequence} [sequence] input
  @param {optional Function} [eq] Equality function
  @return {Array}
  @summary Return an Array of elements from `input` with duplicate values omitted
  @desc
    If `eq` is provided, it should be a function like [compare::eq] - i.e
    accept two arguments, and return `true` if they are equal, `false` otherwise.

    If an `eq` function is not provided, regular `===` equality will be used.
*/
function unique(sequence, eq) {
  var rv = [];
  if (eq) {
    var sn = {};
    each(sequence) {|x| if (rv .. find(y -> eq(x, y), sn) === sn) rv.push(x); }
  } else {
    each(sequence) {|x| if (rv.indexOf(x) === -1) rv.push(x); }
  }
  return rv;
};
exports.unique = unique;

/**
  @function dedupe
  @altsyntax sequence .. dedupe
  @param {::Sequence} [sequence] input
  @param {optional Function} [eq] Equality function
  @return {Stream}
  @summary Return a stream of elements from `input` with _adjacent_ duplicate values omitted.
  @desc
    This function is similar to [::unique]. But while [::unique] reads in the
    entire sequence and outputs an array with all duplicates suppressed, [::dedupe] reads
    only one element at a time, and only suppresses _adjacent_ duplicate elements.

    ### Example:

      [1, 2, 2, 3, 3, 2, 2, 1] .. dedupe .. toArray
      // -> [1, 2, 3, 2, 1]

    If `eq` is provided, it should be a function like [compare::eq] - i.e
    accept two arguments, and return `true` if they are equal, `false` otherwise.

    If an `eq` function is not provided, regular `===` equality will be used.
*/
function dedupe(sequence, eq) {
  var sn = {};
  __js if (!eq) eq = (a,b) -> a === b;
  return Stream(function(emit) {
    var last = sn;
    sequence .. each {|x|
      if (x !== sn && !eq(x,last)) {
        last=x;
        emit(x);
      }
    }
  });
};
exports.dedupe = dedupe;

/**
  @function uniqueBy
  @altsyntax sequence .. uniqueBy
  @param {::Sequence} [sequence] input
  @param {Function|String} [key] Function or property name which determines uniqueness.
  @return {Array}
  @summary Return an Array of elements from `input` with duplicate values (compared by `key`) omitted
  @desc
    Two elements `a` and `b` are considered duplicates by this
    function if `key(a) === key(b)`.

    If `key` is a string, it will be converted into a property accessor. i.e
    passing `'length'` is equivalent to passing `(x) -> x.length`.
*/
function uniqueBy(sequence, key) {
  key = keyFn(key);
  var rv = [], keys = [];
  each(sequence) {|x|
    var k = key(x);
    if (keys.indexOf(k) === -1) {
      rv.push(x);
      keys.push(k);
    }
  }
  return rv;
};
exports.uniqueBy = uniqueBy;

/**
  @function sortBy
  @param {::Sequence} [sequence] Input sequence
  @param {Function|String} [key] Function or property name which determines sort order.
  @return {Array}
  @summary Sort the sequence elements into an Array
  @desc
    Sorts the input sequence according to the ordering obtained by
    calling `key(value, index)` on each input.

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
    expanded[i] = [arr[i], key(arr[i], i)];
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

// helper for key functions
var keyFn = function(key) {
  if (key == null) return identity;
  if (isString(key)) return (x) -> x[key];
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
  sequence .. each(__js function(x) { rv.unshift(x); });
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
__js function count(sequence) {
  if (isConcrete(sequence)) 
    return sequence.length;
  else
    return countStream(sequence);
}

function countStream(sequence) {
  var n = 0;
  sequence .. each(__js function() { ++n });
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
   @param {optional Function} [predicate=Id] Predicate function
   @return {::Stream}
   @summary  Create a stream of elements of `sequence` that satisfy `predicate`
   @desc
      Generates a stream that contains all items `x` from `sequence` for which
      `predicate(x)` is truthy.

      If `predicate` is not given, the identity function is used - that is, the
      result will include all truthy items.

      ### Example:

          // print first 10 odd integers:

          each(take(filter(integers(), x->x%2), 10), function(x) { console.log(x) })

          // same as above, with double dot and blocklamdba syntax:

          integers() .. filter(x->x%2) .. take(10) .. each { |x| console.log(x) }
*/
function filter(sequence, predicate) {
  if (!predicate) predicate = identity;
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
  if (isConcrete(sequence)) {
    sequence .. each {|item|
      buffers[predicate(item) ? 0 : 1].push(item);
    }
    return buffers;
  } else {
    var emitters = [null, null]
    var drainer = null;
    var _resume = noop;

    var streams = [0,1] .. map((idx) -> Stream(function(r) {
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
}
exports.partition = partition;

/**
   @function map
   @altsyntax sequence .. map(f)
   @param {::Sequence} [sequence] Input sequence
   @param {Function} [f] Function to apply to each element of `sequence`
   @return {Array}
   @deprecated Usually you want to use [::transform] or [::project]
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

          each(map(take(integers(), 10), x->x*x), function(x) { console.log(x) })

          // same as above, with double dot and blocklamdba syntax:

          integers() .. take(10) .. map(x->x*x) .. each { |x| console.log(x) }
*/
/*
  equivalent, but sometimes slower implementation:
  var map = (seq,f) -> seq .. transform(f) .. toArray;
*/

function map(sequence, f) {
  var rv = [];
  map_inner(rv, sequence, f);
  return rv;
}
exports.map = map;

__js {
  function map_inner(rv, sequence, f) {
    return each(sequence, function(x) {
      var res = f(x);
      if (__oni_rt.is_ef(res))
        return async_map_value(rv, res);
      rv.push(res);
    });
  }

}

function async_map_value(rv, val) {
  val = val.wait();
  rv.push(val);
}

/**
   @function map.filter
   @altsyntax sequence .. map.filter([predicate])
   @param {::Sequence} [sequence] Input sequence
   @param {Function} [fn] mapping function
   @return {::Stream}
   @summary Like [::map], but skips items where `fn(x)` returns `null`/`undefined`.
*/
map.filter = (sequence, fn) -> transform.filter(sequence, fn) .. toArray;

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

          each(take(transform(integers(), x->x*x), 10), function(x) { console.log(x) })

          // same as above, with double dot and blocklamdba syntax:

          integers() .. transform(x->x*x) .. take(10) .. each { |x| console.log(x) }

      Note that, because `transform` is lazy, if you iterate over the
      resulting stream more than once, the results will be re-computed
      each time:

          var squares = [1,2,3,4] .. transform(x->x*x);

          squares .. each { |x| ... } // squares will be calculated as we iterate
          ...
          squares .. each { |x| ... } // squares will be calculated *again*

      This is in contrast to [::map], which generates an array:

          var squares = [1,2,3,4] .. map(x->x*x);
          // squares have now been calculated and put into an array

          squares .. each { |x| ... } // no recalculation here
          ...
          squares .. each { |x| ... } // neither here

*/

/*
  equivalent but sometimes slower implementation:
  var transform = (seq,f) -> Stream(r -> seq .. each { |x| r(f(x)) })
*/
__js function transform(sequence, f) {
  return Stream(function(r) {
    function rf(x) {
      var inner = f(x);
      if (__oni_rt.is_ef(inner))
        return async_rf(inner, r);
      return r(inner);
    }
    return each(sequence, rf);
  });
}

exports.transform = transform;

function async_rf(fx, r) {
  fx = fx.wait();
  return r(fx);
}

/**
   @function transform.filter
   @altsyntax sequence .. transform.filter([predicate])
   @param {::Sequence} [sequence] Input sequence
   @param {Function} [fn] mapping function
   @return {::Stream}
   @summary Like [::transform], but skips items where `fn(x)` returns `null`/`undefined`.
*/
transform.filter = (sequence, fn) -> transform(sequence, fn) .. filter(x -> x != null);

/**
   @function scan
   @altsyntax sequence .. scan([predicate])
   @param {::Sequence} [sequence] Input sequence
   @param {Function} [fn] accumulator function
   @return {::Stream}
   @summary Emits successive combinations of `fn(accum, item)`.
   @desc
     `scan` is similar to [::reduce], in that it combines successive
     elements with an accumulator value (the result being the new
     accumulator value). While [::reduce] returns only
     the final value, [::scan] emits each accumulator value as
     it is calculated. Scan does not emit anything until the first two
     elements have been consumed, and from then on it emits one item per input.

     ### Example:

       // sum integers from 1 to 10, printing out the intermediate sums
       integers(1, 10) .. scan((sum,x) -> sum + x) .. each(console.log);
       // 3
       // 6
       // 10
       // 15
       // 21
       // 28
       // 36
       // 45
       // 55

*/
var scan = exports.scan = function(sequence, fn) {
  return Stream(function(emit) {
    var accum;
    var first = true;
    sequence .. each {|elem|
      if(first) {
        first = false;
        accum = elem;
        continue;
      }
      else emit(accum = fn(accum, elem));
    }
  });
};

/**
   @function monitor
   @altsyntax sequence .. monitor(f)
   @param {::Sequence} [sequence] Input sequence
   @param {Function} [f] Function to execute for each element of `sequence`
   @return {::Stream}
   @summary  Execute a function `f(x)` for each element `x` of a sequence while it is being traversed
   @desc
      Acts like [::transform], but passes `x` through unmodified:

          seq .. monitor(f) .. each { |x| ... }

      is equivalent to

          seq .. transform(function(x) { f(x); return x; }) .. each { |x| ... }
*/
function monitor(sequence, f) {
  return Stream(function(r) { sequence .. each { |x| f(x); r(x); } });
}

exports.monitor = monitor;


/**
  @function concat
  @summary Concatenate multiple sequences into a single sequence.
  @param   {::Sequence} [sequence...] Multiple Sequence arguments or a single Sequence of Sequences
  @return  {::Stream} A stream sequentially combining all elements of each input sequence.
  @desc
      This method acts like the builtin Array.prototype.concat method,
      but operating on arbitrary sequences rather than only arrays.
*/
function concat(/* sequences ... */) {
  var sequences = arguments.length == 1 ? arguments[0] : arguments;
  return Stream(function(r) {
    sequences .. each { |seq|
      seq .. each { |x| r(x); }
    }
  });
}
exports.concat = concat;

/**
   @function pack
   @altsyntax sequence .. pack(count)
   @altsyntax sequence .. pack(packing_func, [pad])
   @param {::Sequence} [sequence] Input sequence
   @param {Object} [settings] Settings object.
   @setting {Integer} [count] Number of input elements to pack into one element of the output.
   @setting {Function} [packing_func] Packing function
   @setting {Integer} [interval] Interval in ms over which to pack elements
   @setting {Object} [pad=undefined] Padding object (used in conjunction with `packing_func`)
   @return {::Stream}
   @summary  Collect multiple elements of `sequence` into a single element of the output stream
   @desc
      ### Simple use:

      When `count` is given and `packing_func` is not, `interval` will be ignored and `pack`
      generates a stream of arrays, each containing `count` adjacent
      elements of the input sequence. The last element of the output
      stream might contain fewer than `count` elements, if the input
      sequence is prematurely exhausted.

      #### Example:

          // create a stream of adjacent integer pairs:

          pack(integers(), 2) // -> [1,2], [3,4], [5,6], ...

          // same as above, with double dot call syntax:

          integers() .. pack(2)

      ### Use with an interval:
      
      When `interval` is given and `count` and `packing_func` are not, `pack`
      generates a stream of arrays, each containing at least one element from
      the input sequence as well as all subsequent elements received from the input sequence 
      within `interval` milliseconds.

      ### Use with a packing function:

      If `packing_func` is given, `count` and `interval` will be ignored and
      `packing_func(next)` will be called until there are no
      further elements in `sequence`. The return values of
      `packing_func(next)` form the elements of the sequence generated by `pack`.

      `next` is a function that, when called within the scope of `p`
      returns the next element of `sequence`, or `pad` if there are
      no further elements.

      To indicate that a return value from a `packing_func(next)` invocation should not be
      put into the output sequence, `packing_func` can return the special value [::PACK_OMIT].

      #### Example:

          // create a stream of adjacent integer pairs:

          pack(integers(), next -> [next(),next()]) // -> [1,2], [3,4], [5,6], ...

          // same as above, with double dot call syntax:

          integers() .. pack(next -> [next(),next()])
*/
var pack_no_next_item_sentinel = {}; // helper, see below

function pack(sequence, settings) {
  // untangle settings:
  var count, packing_func, pad, interval;
  if (typeof settings === 'number') {
    count = settings;
  }
  else if (typeof settings === 'function') {
    packing_func = settings;
    pad = arguments[2];
  }
  else {
    ({count, packing_func, pad, interval}) = settings;
  }

  if (packing_func) {
    return Stream(function(r) {
      var eos = {}, next_item = pack_no_next_item_sentinel;

      sequence .. consume(eos) {
        |next_upstream|

        function next() {
          var x;
          if (next_item === pack_no_next_item_sentinel)
            x = next_upstream();
          else {
            x = next_item;
            next_item = pack_no_next_item_sentinel;
          }
          if (x === eos) x = pad;
          return x;
        }

        while ((next_item = next_upstream()) !== eos) {
          var candidate = packing_func(next);
          if (candidate !== PACK_OMIT)
            r(candidate);
        }
      }
    });
  }
  else if (count !== undefined) {
    if (count < 1) throw new Error("Invalid count ('#{count}')");
    return Stream(function(r) {
      var accu = [], l=0;
      sequence .. each {
        |x|
        accu.push(x);
        if (++l===count) {
          r(accu);
          l=0, accu = [];
        }
      }
      if (l>0)
        r(accu);
    });
  }
  else if (interval !== undefined) {
    return sequence .. packDt(interval);
  }
  else
    throw new Error("sequence::pack: missing a count, interval or packing_func argument")
}
exports.pack = pack;

// packDt: helper for temporal packing:

var packDt_endSentinel = {};

var packDt = (upstream, dt) ->
  upstream .. pack(function(next) {
    var rv = [];
    var elem = next();
    if (elem === packDt_endSentinel) return PACK_OMIT;
    rv.push(elem);
    waitfor {
      while (1) {
        var elem = next();
        if (elem === packDt_endSentinel) break;
        rv.push(elem);
      }
    }
    or {
      hold(dt);
    }
    return rv;
  },
                   packDt_endSentinel);

/**
   @variable PACK_OMIT
   @summary Value to be returned by a packing function in [::pack] to indicate that the return value should be omitted from the output sequence
*/
var PACK_OMIT = exports.PACK_OMIT = {};



/**
   @function unpack
   @altsyntax sequence .. unpack([u])
   @param {::Sequence} [sequence] Input sequence
   @param {optional Function} [u=Id] Unpacking function
   @return {::Stream}
   @summary  For a single elements of `sequence`, emit multiple values into the output stream
   @desc
      Calls `u(x)` for each element `x` of `sequence`. `u(x)` is assumed to return a [::Sequence]
      which will be flattened into the output stream.

      If `u` is not provided, the identity function `Id = x -> x` will be used, i.e.
      each item of `sequence` is assumed to be a sequence itself which will be
      flattened into the output stream.

      ### Example:

          // unpack a stream of pair objects:

          var pairs = [ {a:1, b:2}, {a:3, b:4}, {a:5, b:6} ];

          unpack(pairs, {a,b} -> [a,b]) // -> 1,2,3,4,5,6 ...

          // same as above, with double dot call syntax:

          pairs .. unpack({a,b} -> [a,b])


          // create a stream 1, 1,2, 1,2,3, 1,2,3,4, 1,2,3,4,5, ...:

          integers() .. unpack(n -> integers(1,n))
*/
function unpack(sequence, u) {
  if (!u) u = identity;
  return Stream(function(r) {
    sequence .. each {
      |x|
      u(x) .. each(r);
    }
  })
}
exports.unpack = unpack;

/**
   @function combine
   @param {::Stream} [stream...] One or more streams, typically [./event::EventStream]s
   @return {./event::EventStream}
   @summary  Combines multiple (event) streams into a single event stream.
   @desc
      All input streams will be concurrently iterated and elements appear
      in the output stream as soon as they are received. The input streams are never blocked
      and no buffering is performed:
      if an element is received while the downstream receiver is blocked, the element
      will be silently ignored.

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
  var streams = arguments;
  return Stream(function(emit) {

    var send_event, done = false;

    waitfor {
      while (1) {
        waitfor (var value) {
          send_event = resume;
        }
        finally {
          send_event = undefined;
        }
        if (done) return;
        emit(value);
        if (done) return;
      }
    }
    and {
      waitforAll(
        function(s) {
          s .. each {
            |x|
            if (send_event)
              send_event(x);
            // else .. silently ignore event
          }
        },
        streams);
      done = true;
      if (send_event) send_event();
    }
  });
}
exports.combine = combine;

/**
   @function combineSort
   @param {Array} [sequences] Array of [::Sequence]s
   @param {Function} [pick] Function picking next element
   @return {::Stream}
   @summary  Combines and sorts the elements from multiple sequences into a single stream.
   @desc
     Each of the input sequences will be concurrently iterated. 

     The first iteration blocks until 
     a full set of values `[v1, v2, ...]` from each of the (non-ended) sequences `s1, s2, ...` has
     been gathered. The value array `[v1, v2, ...]` will be passed to `pick()`, which is expected to return 
     an index `N` into the value array. The item `vN = [v1, v2, ...][N]` will then be passed to the downstream and removed from the value array.

     In the next and subsequent iterations, a new value will be obtained from the sequence from which the 
     most recently picked `vN` originated, and - provided the sequence has not ended - merged into the value 
     array, which will again be presented to the `pick` function, and so forth. 

     The stream ends when all elements of the input sequences have been consumed and passed to the downstream.

     #### Notes

     Note that the order in which values are arranged in the value array should not be relied upon by the
     `pick` function.
*/
function combineSort(sequences, pick) {
  var eos = {};
  return Stream(function(receiver) {
    consumeMultiple(sequences, eos) { 
      |nexts|
      var vals = [];
      for (var i=nexts.length-1;i>=0;--i) {
        var val = nexts[i]();
        if (val === eos)
          nexts.splice(i,1);
        else
          vals.unshift(val);
      }
      
      while (nexts.length) {
        var idx = pick(vals);
        receiver(vals[idx]);
        var val = nexts[idx]();
        if (val === eos) {
          nexts.splice(idx, 1);
          vals.splice(idx, 1);
        }
        else
          vals[idx] = (val);
      }
    }
  });
}
exports.combineSort = combineSort; 

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
__js function zip(/* sequences... */) {
  var sequences = arguments;
  var max_l;
  for (var i=0; i<sequences.length;++i) {
    var seq = sequences[i];
    if (!isConcrete(seq))
      return zipStreams(sequences);
    else if (!isSequence(seq))
      throw new Error("Invalid argument passed to sequence::zip (#{seq})");
    else if (i===0 || max_l > seq.length)
      max_l = seq.length;
  }
  // all our sequences are concrete:
  return zipConcrete(sequences, max_l);
}

function zipConcrete(sequences, max_l) {
  __js var sequence_count = sequences.length;
  return Stream(function(r) {
    for (var i=0; i<max_l; ++i) {
      __js {
        var item = new Array(sequence_count);
        for (var s=0; s<sequence_count; ++s) {
          item[s] = sequences[s][i];
        }
      }
      r(item);
    }
  });
}

function zipStreams(sequences) {
  return Stream(function(r) {
    var iterators = sequences .. map(seq -> makeIterator(seq));
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
    var iterators = sequences .. map(seq -> makeIterator(seq));
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
}
exports.zipLongest = zipLongest;

/**
   @function product
   @param {::Sequence} [sequence...] One or more sequences
   @return {::Stream}
   @summary  Builds a stream of the Cartesian product of the input sequences
   @desc
      Builds a Cartesian product stream 
      `[x1,y1,z1,...],[x1,y1,z2,...],...,[x1,y2,z1,...],...,[x2,y1,z1,...]` where `x_n, y_n, z_n, ...` are
      elements of the input sequences `x, y, z, ...`.

      The input sequences y, z, ... will be iterated multiple and must therefore be repeatable. E.g. 
      `generate(Math.random)` is a non-repeatable sequence; `generate(Math.random) .. take(100) .. toArray` is
      a repeatable one.

      ### Example:

          product(['timid', 'bloodthirsty'], 
                  ['wild', 'domesticated'],
                  ['cat', 'dog', 'shark']) .. map(tuple -> tuple .. join(' '));

          // -> ['timid wild cat', 'timid wild dog', 'timid wild shark',
          //     'timid domesticated cat', 'timid domesticated dog', 
          //     'timid domesticated shark', 'bloodthristy wild cat', 
          //     'bloodthirsty wild dog', 'bloodthirsty wild shark',
          //     'bloodthirsty domesticated cat', 'bloodthirsty domesticated dog', 
          //     'bloodthirsty domesticated shark'] 
*/
function product(/* arguments */) {
  var args = arguments;
  if (args.length === 1)
    return args[0] .. transform(x->[x]);
  else
    return Stream(function(r) {
      args[0] .. each {
        |head|
        product.apply(null, args .. skip(1) .. toArray()) .. each {
          |tail|
          r(concat([head], tail) .. toArray);
        }
      }
    })
}
exports.product = product;

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
__js {
  function indexed(sequence, start) {
    return Stream(function(r) {
      var i = start || 0;
      /* because we're in js, the returns are important here */
      return sequence .. each(function(x) { 
        return r([i++, x]) 
      });
    });
  }
  exports.indexed = indexed;
}

/**
  @function intersperse
  @altsyntax sequence .. intersperse(elem)
  @param {::Sequence} [sequence]
  @param {Object} [elem] Element to intersperse
  @summary Generate a stream with `elem` inserted in between adjacent elements of `sequence`.
  @desc
    ### Example:

        ['a','b','c'] .. intersperse('-')

        // -> 'a', '-', 'b', '-', 'c'
*/
function intersperse(sequence, elem) {
  return Stream(function(r) {
    var first = true;
    sequence .. each {
      |x|
      if (first) {
        r(x);
        first = false;
      }
      else {
        r(elem);
        r(x);
      }
    }
  });
}
exports.intersperse = intersperse;

/**
  @function intersperse_n_1
  @altsyntax sequence .. intersperse_n_1(elem_n, elem_1)
  @param {::Sequence} [sequence]
  @param {Object} [elem_n] Element to intersperse between the first and second to last stream elements
  @param {Object} [elem_1] Element to intersperse between the second to last and last stream elements
  @summary Generate a stream with `elem_n` inserted in between the first n-1 adjacent elements of `sequence`, and
           `elem_1` inserted between the final two elements.
  @desc
    ### Note:
    If there are only two elements in the stream, `elem_1` will be inserted between them.

    ### Example:

        ['a','b','c'] .. intersperse(',', 'and')

        // -> 'a', ',', 'b', 'and', 'c'
*/
function intersperse_n_1(sequence, elem_n, elem_1) {
  return Stream(function(r) {
    var eos = {};
    sequence .. consume(eos) {
      |next|
      var n = next();
      if (n === eos) return;
      r(n);
      n = next();
      if (n === eos) return;

      while (1) {
        var m = next();
        if (m === eos)
          break;
        r(elem_n);
        r(n);
        n = m;
      }
      r(elem_1);
      r(n);
    }
  });
}
exports.intersperse_n_1 = intersperse_n_1;

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

         integers(1,100) .. reduce(0, (sum, x) -> sum + x)
     
     See also [::scan].
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

         integers(1,100) .. reduce1((sum, x) -> sum + x)
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
   @altsyntax sequence .. find(p, [defaultValue])
   @param {::Sequence} [sequence] Input sequence
   @param {Function} [p] Predicate function
   @param {optional Object} [defaultValue] Default value to return if no match is found
   @summary Find first element `x` of `sequence` for which `p(x)` is truthy.
   @desc
     If the sequence is exhausted before a matching element is found,
     `defaultValue` is returned if it was given. Otherwise, this function
     raises a [::SequenceExhausted] error.
*/
function find(sequence, p /*, [defval]*/) {
  sequence .. each { |x| if (p(x)) return x }
  if (arguments.length > 2)
    return arguments[2];
  else
    throw new SequenceExhausted('sequence exhausted');

}
exports.find = find;

/**
   @function hasElem
   @altsyntax sequence .. hasElem(elem)
   @param {::Sequence} [sequence]
   @param {Object} [elem] Element to check for
   @return {Boolean} `true` if the element is in the sequence, `false` otherwise.
   @summary Checks whether the given element is in the sequence.
   @desc
     Sequentially iterates the stream until `elem` is found (using `===`) or the stream is exhausted.
*/
function hasElem(sequence, elem) {
  if (Array.isArray(sequence)) return (sequence.indexOf(elem) != -1);
  sequence .. each { |x| if (x === elem) return true }
  return false;
}
exports.hasElem = hasElem;

/**
   @function all
   @altsyntax sequence .. all(p)
   @param {::Sequence} [sequence] Input sequence
   @param {optional Function} [p=identity] Predicate function
   @return {Boolean}
   @summary Returns `true` if `p(x)` is truthy for all elements in `sequence`, `false` otherwise.
*/
function all(sequence, p) {
  if(!p) p = identity;
  sequence .. each { |x| if (!p(x)) return false }
  return true;
}
exports.all = all;

/**
   @function any
   @altsyntax sequence .. any(p)
   @param {::Sequence} [sequence] Input sequence
   @param {optional Function} [p=identity] Predicate function
   @return {Boolean}
   @summary Returns `true` if `p(x)` is truthy for any elements in `sequence`, `false` otherwise.
*/
function any(sequence, p) {
  if(!p) p = identity;
  sequence .. each { |x| if (p(x)) return true }
  return false;
}
exports.any = any;

/* NOT PART OF DOCUMENTED API YET
   @function makeIterator
   @summary To be documented
*/
function makeIterator(sequence) {
  if (!isSequence(sequence)) throw new Error("Invalid sequence type '#{sequence}'");
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

/**
   @function integers
   @param {optional Integer} [start=0] Start integer
   @param {optional Integer} [end=2^53] End integer
   @param {optional Integer} [skip=1] Amount to increment each number
   @return {::Stream}
   @summary Generate a stream of integers from `start` to `end`
   @desc
     ### Example:

         // print integers from 1 to 100:
         integers(1,100) .. each { |x| console.log(x) }

         // print even integers from 0 to 100:
         integers(0,100,2) .. each { |x| console.log(x) }
*/
/*
slightly non-trivial implementation to optimize performance in the
non-synchronous case:
*/
__js {
  var MAX_PRECISE_INT = 9007199254740992; // 2^53

  function integers(start, end, skip) {
    if (start === undefined) start = 0;
    if (end === undefined) end = MAX_PRECISE_INT;
    if (skip === undefined) skip = 1;
    return Stream(function(r) {
      for (var i=start;i<= end;i+=skip) {
        var res = r(i);
        if (__oni_rt.is_ef(res))
          return stream_async_integers(res, r, i, end, skip);
      }
    });
  }
  exports.integers = integers;
}

function stream_async_integers(ef, r, i, end, skip) {
  ef.wait();
  for (i+=skip;i<=end;i+=skip)
    r(i);
}

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
   @function buffer
   @altsyntax sequence .. buffer(count, [settings])
   @param {::Sequence} [sequence] Input sequence
   @param {Integer} [count] Maximum number of elements of input stream to buffer
   @param {optional Object} [settings] Object with optional settings.
   @setting {Boolean} [drop=false] Determines the behaviour when the buffer is full and a new upstream value is available. If `true`, the oldest element in the buffer will be dropped to make room for the new element. If `false`, the input will be blocked until the downstream retrieves the next buffered element.
   @return {::Stream}
   @summary Create a buffered stream from a given input sequence
   @desc
      The returned stream will buffer up to `count` elements from the input stream if
      the downstream receiver is not fast enough to retrieve elements.
      Buffering will only begin when the stream is being iterated.

      ### Example:

          integers() ..
          take(10) ..
          transform(x->(hold(0),console.log("Sent: #{x}"),x)) ..
          buffer(5) ..
          each { |x|
            console.log("Received: #{x}");
            hold(100);
          }
          // prints:
          //   Sent: 0, Received: 0, Sent: 1, Sent: 2, Sent: 3, Sent: 4, Sent: 5,
          //   Received: 1, Sent: 6, Received: 2, Sent: 7, Received: 3, Sent: 8,
          //   Received: 4, Sent: 9, Received: 5, Received: 6, Received: 7, Received: 8,
          //   Received: 9
*/
function buffer(seq, count, options) {
  options = options || {};

  // If we run with blocking semantics, we only need a Queue of
  // capacity count-1. This is because when the Queue is full, our
  // upstream iteration loop will block on a Queue.put(). The pending
  // put() call effectively adds another slot to our buffer.
  if (!options.drop) count -= 1;

  return Stream(function(r) {
    var Q = Queue(count, true), eos = {};

    waitfor {
      while (1) {
        var x = Q.get();
        if (x === eos) return;
        r(x);
      }
    }
    and {
      seq .. each {
        |x|
        if (options.drop && Q.isFull()) {
          // drop the oldest value to make room for the put():
          Q.get();
        }
        Q.put(x);
      }
      Q.put(eos);
    }
  });
}
exports.buffer = buffer;

/**
   @function tailbuffer
   @altsyntax sequence .. tailbuffer(count)
   @param {::Sequence} [sequence] Input sequence
   @param {optional Integer} [count=1] Maximum number of elements of input stream to buffer
   @return {::Stream}
   @summary Create a stream that buffers the last element(s) of the input sequence
   @desc
     `sequence .. tailbuffer(count)` is equivalent to
     `sequence .. buffer(count, { drop:true })`.

     The returned stream will buffer up to `count` of the most recent elements emitted by the input stream if the downstream receiver is not fast enough to retrieve elements.
     Buffering will only begin when the stream is being iterated.
*/
var tb_settings = { drop:true };
exports.tailbuffer = (seq,count) -> seq .. buffer(count||1, tb_settings);

/**
   @function each.par
   @altsyntax sequence .. each.par([max_strata]) { |item| ... }
   @param {::Sequence} [sequence] Input sequence
   @param {optional Integer} [max_strata=undefined] Maximum number of concurrent invocations of `f`. (undefined == unbounded)
   @param {Function} [f] Function to execute for each `item` in `sequence`
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

      ++depth;

      waitfor {
        waitfor() { var async_trigger = resume; }
        async = true;
        inner();
      }
      and {
        while (1) {
          waiting_for_next = true;
          // the hold(0) is necessary to put us into
          // tail-recursive mode, so that we don't blow the stack
          // when next() generates data without blocking.  For
          // performance reasons we only do this only after having
          // built the tree to a certain depth:
          if (depth % 10 === 0) {
            hold(0);
          }
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
              async_trigger();
            }
            break;
          }
        }
        if (max_strata === 1 && !waiting_for_next) {
          // we're operating at the strata limit; process the next
          // item from upstream:
          inner();
        }
      }
    }
    // kick things off:
    inner();
  }
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
      The order of the resulting array will be determined by the order of items in the
      input sequence.
*/
map.par = function(/* sequence, max_strata, f */) {
  var sequence, max_strata, f;
  if (arguments.length === 2)
    [sequence, f] = arguments;
  else /* arguments.length == 3 */
    [sequence, max_strata, f] = arguments;

  var r=[];
  sequence .. indexed .. each.par(max_strata) {|[i,x]| r[i] = f(x); }
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
      The order of the resulting array will be determined by the order of items in the
      input sequence. See [::transform.par.unordered] for an alternative implementation that
      generates an output stream in the order in which the concurrent calls to `f` complete.
*/
transform.par = function(/* sequence, max_strata, f */) {
  var sequence, max_strata, f;
  if (arguments.length === 2)
    [sequence, f] = arguments;
  else /* arguments.length == 3 */
    [sequence, max_strata, f] = arguments;

  var G = [i,x] -> [i,f(x)];

  return Stream(function(r) {
    var next_index = 0;
    var buf = {};
    transform.par.unordered(sequence .. indexed, max_strata, G) .. each {
      |[i,x]|
      if (i !== next_index) {
        buf[i] = {val:x};
      }
      else {
        r(x);
        while(buf[++next_index] !== undefined) {
          r(buf[next_index].val);
          delete buf[next_index];
        }
      }
    }
  });
};

/**
   @function transform.par.unordered
   @altsyntax sequence .. transform.par.unordered([max_strata], f)
   @param {::Sequence} [sequence] Input sequence
   @param {optional Integer} [max_strata=undefined] Maximum number of concurrent invocations of `f`. (undefined == unbounded)
   @param {Function} [f] Function to apply to each element of `sequence`
   @return {::Stream}
   @summary  Create a stream `f(x)` of elements `x` of `sequence`, making up to `max_strata` concurrent calls to `f` at any one time.
   @desc
      The order of the resulting stream will be determined by the order in
      which the concurrent calls to `f` complete, i.e.
      *the order of the original stream will not be maintained*. See [::transform.par] for an
      alternative implementation that maintains order.
*/
transform.par.unordered = function(/* sequence, max_strata, f */) {
  var sequence, max_strata, f;
  if (arguments.length === 2)
    [sequence, f] = arguments;
  else /* arguments.length == 3 */
    [sequence, max_strata, f] = arguments;

  return Stream(function(r) {
    r = sequential(r);
    sequence .. each.par(max_strata) { |x| r(f(x)) }
  });
};


/**
   @function find.par
   @altsyntax sequence .. find.par([max_strata], p, [defaultValue])
   @param {::Sequence} [sequence] Input sequence
   @param {optional Integer} [max_strata=undefined] Maximum number of concurrent invocations of `p`. (undefined == unbounded)
   @param {Function} [p] Predicate function
   @param {optional Object} [defaultValue] Default value to return if no match is found
   @summary Find first element `x` of `sequence` for which `p(x)` is truthy. Up to `max_strata` concurrent calls to `f` will be performed at any one time.
   @desc
     If the sequence is exhausted before a matching element is found, `defaultValue` is returned if it was given.
     Otherwise, this function raises a [::SequenceExhausted] error.
*/
find.par = function(/* sequence, max_strata, p, defval */) {
  var sequence, max_strata, p, defval, have_defval;
  if (typeof arguments[1] == 'function') {
    have_defval = (arguments.length > 2);
    [sequence, p, defval] = arguments;
  }
  else {
    have_defval = (arguments.length > 3);
    [sequence, max_strata, p, defval] = arguments;
  }

  sequence .. each.par(max_strata) { |x| if (p(x)) return x }

  if (have_defval)
    return defval;
  else
    throw new SequenceExhausted('sequence exhausted');
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

  if (!predicate) predicate = identity;

  return Stream(function(r) {
    r = sequential(r);
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

//----------------------------------------------------------------------
// tracking sequence operations

/**
   @function each.track
   @altsyntax sequence .. each.track { |item| ... }
   @param {::Sequence} [sequence] Input sequence
   @param {Function} [f] Function to execute for each `item` in `sequence`
   @summary Like [::each], but aborts execution of a blocked `f(item)` call when a new item is emitted.
   @desc
     This function is useful for tracking the most recent state of
     time-varying values. E.g. to display a notice every time the user
     pauses with moving the mouse for longer than 100ms:

         window .. @events('mousemove') .. @each.track {
           |ev|
           hold(100);
           console.log('You paused the mouse');
         }

     #### Edge case behavior:

     Usually `f` will see every value of the upstream sequence, no matter how quickly the
     upstream generates values: If `f` happens to be blocked when a new upstream sequence arrives, 
     then it will be aborted and started again with the new value. 

     If, however, `f` happens to be *blocked in a finally clause* while a free-running upstream sequence generates a number of values `X1, ..., Xn`, then `f` will only see the last of those values `Xn`.

     In other words, `each.track` is usually robust for use with [./event::EventStream]s, unless `f` contains logic that might block in a `finally{}` clause. In the latter case `each.track` is still robust under [observable::Observable] semantics.

*/
each.track = function(seq, r) {
  var stratum;

  try {
    seq .. each {
      |x|
      stratum = spawn (stratum ? stratum.abort(), r(x));
    }
    // wait for stratum to complete
    if (stratum)
      stratum.value();
  }
  finally {
    if (stratum)
      stratum.abort();
  }
};

/*
Old implementation which had the disadvantage of not nesting DynVarContexts correctly. 

each.track = function(seq, r) {
  var val, have_new_value=false, prod, done=false, executing_downstream=false;
  waitfor {
    waitfor() { prod = resume; }
    while (true) {
      waitfor {
        waitfor() { prod = resume; }
      }
      or { 
        executing_downstream = true;
        // this while-loop is to support the edge case where
        // values are generated while `r` is blocked in a finally clause.
        // we want to make sure r always gets the most recent value
        while (have_new_value) {
          have_new_value = false;
          r(val);
        }
        executing_downstream = false;
        if (done) return;
        hold();
      }
    }
  }
  and {
    seq .. each { |x| have_new_value = true; val = x; prod(x); }
    done = true;
    if (!executing_downstream) return;
  }
};
*/

/**
   @function mirror
   @param {::Stream} [stream] Source stream
   @summary Create a copy of `stream` for multiple concurrent iterators
   @param {optional Boolean} [latest=true] Whether to emit the most recent value
   @return {::Stream}
   @desc
     [::Stream]s generate items on-demand. Depending on the type of stream,
     iterating over a stream `n` times concurrently will generally cause its
     elements to be recalculated `n` times.

     Most of the time, this is not a problem - if you're iterating over
     a result multiple times you'll typically convert it to an array
     (with [::toArray]) to ensure repeatability.

     But for time-varying streams whose items are:

      - ephemeral (e.g an event stream), or
      - expensive to iterate over multiple times (e.g a remote stream)

     you can use [::mirror] to generate a single [::Stream] which can be iterated
     over by multiple consumers concurrently, but which will only cause at most a
     single iteration over the source stream (for as long as there is at least one
     consumer of the resulting stream).

     **Note**: `mirror` is intended for time-varying data. When you start
     iterating over the result, you will receive:

      - the most recent value (if one has been seen, and only if `latest` is true)
      - all future values

     `mirror` will _not_ store or emit values that occurred in the past,
     aside from the most recently seen value (which will only be set
     if another consumer is concurrently iterating over the output Stream).
*/
exports.mirror = function(stream, latest) {
  var emitter = Object.create(_Waitable); emitter.init();
  var listeners = 0;
  var done = false;
  var current, current_version = 0;
  var loop;

  return Stream(function(emit) {
    var have_version = 0;
    var catchupLoop = latest === false ? (->null) : function() {
      while (have_version !== current_version) {
        have_version = current_version;
        emit(current);
      }
    };

    waitfor {
      ++listeners;
      catchupLoop();
      while(true) {
        emitter.wait();
        if (done) return;
        have_version = current_version;
        emit(current);
        catchupLoop();
        if (done) return;
      }
    } and {
      if (listeners === 1) {
        // start the loop
        loop = spawn(function() {
          stream .. each {|item|
            current = item;
            ++current_version;
            emitter.emit();
          }
          done = true;
          emitter.emit();
        }());
      }
    } and {
      loop.value() .. console.log;
    } finally {
      if (--listeners === 0) {
        // last one out: stop the loop
        // the check for 'loop' is important here, because of a
        // possible exception thrown in the spawned stratum before it
        // gets reified
        if (loop) loop.abort();
        current = undefined;
        current_version = 0;
        done = false;
      }
    }
  });
};


//----------------------------------------------------------------------

/**
   @function batchN
   @altsyntax sequence .. batchN(count)
   @param {::Sequence} [sequence] Input sequence
   @param {Integer} [count] Maximum number of input elements to batch.
   @return {::BatchedStream}
   @summary  Create a [::BatchedStream] with batches of size `count`
   @desc
     `batchN` creates a [::BatchedStream] from given [::Sequence] that is more efficient to send
     over the network: Instead of one roundtrip for every element in `sequence`, a roundtrip will
     only be made for every `count` elements (or when `sequence` is exhausted).
*/

function batchN(s, n) {
  return BatchedStream(function(r) {
    var batch = [];
    s .. each {
      |x|
      batch.push(x);
      if (batch.length === n) {
        r(batch);
        batch = [];
      }
    }
    if (batch.length)
      r(batch);
  });
}
exports.batchN = batchN;
