/*
 * Oni Apollo 'stream' module
 * Stratified stream and iterator constructs
 *
 * Part of the Oni Apollo Standard Module Library
 * Version: 'unstable'
 * http://onilabs.com/apollo
 *
 * (c) 2012 Oni Labs, http://onilabs.com
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
   @module    stream
   @summary   Stratified stream and iterator constructs
   @home      apollo:stream
*/

var sys  = require('sjs:apollo-sys');

//----------------------------------------------------------------------

/**
   @class Stream
   @summary Stratified stream abstraction
   @desc
     A stream `S` is a function with signature `S(f)`, where `f`, the *receiver function*, is a 
     function of a single argument.
     When called, `S(f)` sequentially invokes `f(x)` with the stream's data elements 
     `x=x1,x2,x3,...` until the stream is empty.

     ### Example:
     
         // assuming S is the stream 1,2,3,...,10
 
         S(function(x) { console.log(x); }); // -> 1,2,3,...,10

         // blocklambda form:
         S { |x| console.log(x*x) }  // -> 1,4,9,...,100

*/

//----------------------------------------------------------------------

/** 
    @class Iterator
    @summary Iterator abstraction

    @function Iterator.next
    @summary Fetches next data item in the structure being iterated

    @function Iterator.hasMore
    @summary Check if the iterator has more data items
    @return {Boolean}

    @function Iterator.close
    @summary Close the iterator
*/

//----------------------------------------------------------------------
/**
   @function  stream
   @altsyntax stream(iterable) { |x| ...  process stream items ... }
   @summary Obtain a stream for an [::Iterator] or Array
   @param {Array|::Iterator} [iterable]
   @param {optional Function} [f] Receiver function
   @return {::Stream|undefined}
   @desc
      - This function is partially curried. If parameter `f` is omitted, a [::Stream] will
        be returned. If `f` is given (e.g. implicitly, by using the blocklambda form), then
        the stream will be pumped to `f` immediately and the return value will be undefined.
*/
function stream(iterable, f) {
  if (f===undefined) return stream.bind(this, iterable);
  if (sys.isArrayOrArguments(iterable)) {
    for (var i=0; i<iterable.length; ++i)
      f(iterable[i]);
  }
  else if (iterable && iterable.next && iterable.hasMore) {
    while (iterable.hasMore())
      f(iterable.next());
  }
  else
    throw new Error("Unsupported iterable");
}
exports.stream = stream;

//----------------------------------------------------------------------
/**
   @function iterator
   @summary Create an iterator for the given stream
   @param {::Stream} [s] Input stream
   @return {::Iterator}
*/
var end_token = {};
function iterator(s) {
  // XXX there is probably a cleverer implementation than using a full-blown queue
  var Q = new (require('./cutil').Queue)(1,true);
  var S = spawn ({
    || 
    try { 
      s { |x| Q.put(x) } 
      Q.put(end_token);
    } 
    retract { 
      // we've been aborted; clear anything on queue, put our end_token there instead
      if (Q.count())  
        Q.get();
      Q.put(end_token);
    } 
  })();
  return {
    hasMore: -> Q.peek() !== end_token,
    next: function() { 
      if (Q.peek() == end_token) throw new Error("End of stream"); 
      return Q.get(); 
    },
    close: -> S.abort()
  }
}
exports.iterator = iterator;

//----------------------------------------------------------------------
/**
   @function collect
   @summary Collect stream `s` into an array
   @param {::Stream} [s] Input stream
   @return {Array}
*/
function collect(s) {
  var rv = [];
  s { |x| rv.push(x) }
  return rv;
}
exports.collect = collect;

//----------------------------------------------------------------------
/**
   @function  pick
   @altsyntax pick(count, s) { |x| ...  process stream items ... }
   @summary Create a stream containing the first `count` elements of stream `s`
   @param {Integer} [count]
   @param {::Stream} [s] Input stream
   @param {optional Function} [f] Receiver function
   @return {::Stream|undefined}
   @desc
      - This function is partially curried. If parameter `f` is omitted, a [::Stream] will
        be returned. If `f` is given (e.g. implicitly, by using the blocklambda form), then
        the stream will be pumped to `f` immediately and the return value will be undefined.
*/
function pick(count, s, f) {
  if (f === undefined) return pick.bind(this, count, s);
  s { |x| f(x); if (--count <= 0) return; }
}
exports.pick = pick;

//----------------------------------------------------------------------
/**
   @function  filter
   @altsyntax filter(predicate, s) { |x| ...  process stream items ... }
   @summary Create a stream of elements of stream `s` that satisfy `predicate`
   @param {Function} [predicate] Function `f(x)` that will be called for each element `x` of `s`. If `f(x)` returns `true`, `x` will be part of the filtered stream
   @param {optional ::Stream} [s] Input stream
   @param {optional Function} [f] Receiver function
   @return {Function(s,f)|::Stream|undefined}
   @desc
      - This function is fully curried. E.g. the following code creates a filter for even numbers:

              var even = filter({|x| x%2==0});
              pick(10, even(integers())) { |x| console.log(x) } // 0,2,4,6,8,10,12,14,16,18

*/
function filter(predicate, s, f) {
  if (arguments.length<3) {
    var args = Array.prototype.slice.call(arguments);
    args.unshift(this);
    return filter.bind.apply(filter, args);
  }
  s { |x| if (predicate(x)) f(x) }
}
exports.filter = filter;

//----------------------------------------------------------------------
/**
   @function  map
   @altsyntax map(g, s) { |x| ...  process stream items ... }
   @summary Create a stream `g(x)` of elements `x` of stream `s` 
   @param {Function} [g] Function `g(x)` that will be applied to each element `x` of `s`
   @param {optional ::Stream} [s] Input stream
   @param {optional Function} [f] Receiver function
   @return {Function(s,f)|::Stream|undefined}
   @desc
      - This function is fully curried. E.g. the following code creates a 
        map function for squaring numbers:

              var squared = map({|x| x*x});
              pick(10, squared(integers())) { |x| console.log(x) } // 0,1,4,9,16,25,36,49,64,81

*/
function map(g, s, f) {
  if (arguments.length<3) {
    var args = Array.prototype.slice.call(arguments);
    args.unshift(this);
    return map.bind.apply(map, args);
  }

  s { |x| f(g(x)) }
}
exports.map = map;

//----------------------------------------------------------------------
/**
   @function  unpack
   @altsyntax unpack(u, s) { |x| ...  process stream items ... }
   @summary Create a flattened stream out of elements of streams `u(x)` of elements `x` of stream `s` 
   @param {Function} [u] Unpacking function `u(x,f)` that will be applied to each element `x` of `s` to extract a stream out of `x` into `f`
   @param {optional ::Stream} [s] Input stream
   @param {optional Function} [f] Receiver function
   @return {Function(s,f)|::Stream|undefined}
   @desc
      - This function is fully curried. E.g. the following code creates an extractor of
        characters for a stream of strings: 
        
              var chars = unpack({|x,f| for (var i=0;i<x.length;++i) f(x.charAt(i)) })
              chars(stream(["Foo","Bar"])) { |x| console.log(x) } // F,o,o,B,a,r

     - `unpack` is similar to LINQ's `SelectMany` function
     - The inverse/complement of `unpack` is [::pack]
*/
function unpack(u, s, f) {
  if (arguments.length<3) {
    var args = Array.prototype.slice.call(arguments);
    args.unshift(this);
    return unpack.bind.apply(unpack, args);
  }

  s { |x| u(x,f) }
}
exports.unpack = unpack;

//----------------------------------------------------------------------
/**
   @function  pack
   @altsyntax pack(p, s) { |x| ...  process stream items ... }
   @summary Create a stream by combining elements of an input stream  
   @param {Function} [p] Packing function `p(iter, f)` 
   @param {optional ::Stream} [s] Input stream
   @param {optional Function} [f] Receiver function
   @return {Function(s,f)|::Stream|undefined}
   @desc
      - This function is fully curried. E.g. the following code creates a transformer that packs
        a stream into a stream of pairs: 

              var pairs = pack({|iter,f| while (iter.hasMore()) f([iter.next(),iter.next()]) })
              pairs(stream([1,2,3,4,5,6])) { |x| console.log(x) } // [1,2],[3,4],[5,6]

      - The inverse/complement of `pack` is [::unpack]
*/
function pack(p, s, f) {
  if (arguments.length<3) {
    var args = Array.prototype.slice.call(arguments);
    args.unshift(this);
    return pack.bind.apply(pack, args);
  }

  var iter = iterator(s);
  try {
    p(iter, f)
  }
  finally {
    iter.close();
  }
}
exports.pack = pack;



//----------------------------------------------------------------------
/**
   @function integers
   @altsyntax integers([start]) { |x| ... process stream items ... }
   @summary Create an infinite stream of integers beginning with `start` (default: 0)
   @param {optional Integer} [start=0]
   @param {optional Function} [f] Receiver function
   @desc
      - This function is partially curried. If parameter `f` is omitted, a [::Stream] will
        be returned. If `f` is given (e.g. implicitly, by using the blocklambda form), then
        the stream will be pumped to `f` immediately and the return value will be undefined.
*/
function integers(/* [opt] start, f */) {
  var start = 0, f;
  for (var i=0; i<arguments.length; ++i) {
    if (typeof arguments[i] == 'function')
      f = arguments[i];
    else
      start = parseInt(arguments[i]);
  }
  if (f === undefined) return integers.bind(this, start);

  while (1) 
    f(start++);
}
exports.integers = integers;
