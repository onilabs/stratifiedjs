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

var {isArrayLike} = require('builtin:apollo-sys');

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
function Stream(S) {
  S.__oni_stream = STREAM_TOKEN;
  return S;
}
exports.Stream = Stream;

/**
   @function isStream
   @param {Object} [s] Object to test
   @returns {Boolean}
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
*/
function sort(sequence, compare) {
  return (sequence .. toArray).sort(compare);
}
exports.sort = sort;

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
      sequence .. each { |x| r(x); if (--n <= 0) return }
  });
}
exports.take = take;

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

          // same as above, with double dot and blocklamdba syntax:

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
   @function indexed
   @param {Sequence} [sequence]
   @param {Optional Integer} [start]
   @return {Stream}
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

