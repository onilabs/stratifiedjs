/*
 * StratifiedJS 'array' module
 * Functions for working with arrays
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '1.0.0'
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2013-2022 Oni Labs, http://onilabs.com
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
   @module  array
   @summary Functions for working with arrays
   @home    sjs:array
   @inlibrary sjs:std
   @inlibrary mho:std
   @eslint  { "rules": { "no-labels": 0 } }
*/
'use strict';

var { Stream } = require('./sequence');
var { isArrayLike, flatten } = require('builtin:apollo-sys');

/**
   @function isArrayLike
   @summary  Tests if an object is an array, `arguments` object, TypedArray or, in an xbrowser hostenv, a NodeList, HTMLCollection, FileList, StaticNodeList, or DataTransferItemList
   @param    {anything} [testObj] Object to test.
   @return   {Boolean}
*/
__js exports.isArrayLike = isArrayLike;

/**
   @function remove
   @altsyntax arr .. remove(elem)
   @param {Array} [arr]
   @param {Object} [elem] Element to remove
   @return {Boolean} `true` if the element was removed, `false` if `elem` is not in `arr`.
   @summary Removes the first element in the array equal (under `===`) to `elem`.
*/
__js {
function remove(arr, elem) {
  var idx = arr.indexOf(elem);
  if (idx == -1) return false;
  arr.splice(idx, 1);
  return true;
}
exports.remove = remove;
}

/**
   @function kCombinations
   @summary Produce the k-combinations (without repetition) of an array
   @param {Array} [arr]
   @param {Integer} [k] Number of elements in each combination
   @return {sequence::Stream} Stream of k-sized arrays 
*/
exports.kCombinations = (arr, k) -> Stream(function(receiver) {
  function recurse(reservoir, data) {
    if (data.length === k) {
      receiver(data);
      return;
    }
    var l = reservoir.length + data.length;
    if ( l >= k) {
      var elem = reservoir[0];
      reservoir = reservoir.slice(1);
      recurse(reservoir, data.concat([elem]));
      if (l>k)
        recurse(reservoir, data);
    }
  }
  recurse(arr, []);
});

/**
   @function permutations
   @summary Produce the permutations of an array
   @param {Array} [arr]
   @return {sequence::Stream} Stream of permuted arrays 
*/
exports.permutations = (arr) -> Stream(function(receiver) {
  function recurse(reservoir, data) {
    if (reservoir.length === 0) {
      receiver(data);
      return;
    }
    for (var i=0; i<reservoir.length;++i) {
      recurse(reservoir.slice(0,i).concat(reservoir.slice(i+1)),
              data.concat([reservoir[i]]));
    }
  }

  recurse(arr, []);
});

/**
   @function shuffle
   @summary Randomly shuffles the elements of `arr` in place
   @param {Array} [arr]
   @return {Array} the shuffled input array
   @desc
     Uses Fisher-Yates algorithm and default JS random number generator
*/
__js exports.shuffle = function(arr) {
  for (var i=arr.length-1; i>0; --i) {
    var j = Math.floor(Math.random() * (i+1));
    var tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
};

/**
   @function cycle
   @param {Array} [arr]
   @return {sequence::Stream}
   @summary Returns an infinite [sequence::Stream] of values `arr[0], arr[1], ..., arr[arr.length-1], arr[0], arr[1], ...`
   @desc
     * Throws an exception is the array is empty
*/
function cycle(arr) {
  __js if (arr.length == 0) throw new Error('Cannot cycle an empty array');
  return Stream(function(r) { var idx = 0; while (1) { r(arr[idx]); ++idx; idx%=arr.length; } });
}
__js exports.cycle = cycle;

/**
  @function flatten
  @summary Create a recursively flattened version of an array.
  @param   {Array} [arr] The array to flatten.
  @return  {Array} Flattend version of *arr*, consisting of the elements
                   of *arr*, but with elements that are arrays replaced by
                   their elements (recursively).
  @desc
     ###Example:

         var a = [1,2,[3,4,[5,6]],[[7,8]],[9],10];
         var b = flatten(a);
         // b is now [1,2,3,4,5,6,7,8,9,10]
*/
__js exports.flatten = flatten;

/**
  @function array_union
  @param    {Array} [a] Set of unique elements
  @param    {Array} [b] Set of unique elements
  @return   {Array} New set containing union of sets `a` and `b`.
  @summary  Union of `a` and `b`, with duplicate elements (under `===`) appearing only once.
  @desc

    See also [./set::union]

    ###Notes:

    * This is a general but naive implementation with a running time `O(size(a)*size(b))`.
    For more specific datatypes (strings or numbers, or objects with unique id's) there are
    more scalable algorithms.

    * `a` and `b` are assumed to be sets, in the sense that they individually don't contain
    duplicate elements.

    * The resulting set will be an Array beginning with all elements in `a` (in the same order
    as they appeared in `a`) and continuing with all elements in `b` not present in `a`. The
    relative order of elements in `b` will be preserved.


    #### Behaviour if `a` or `b` is not a set:

    * If `a` contains duplicate elements, they will also appear in the resulting array. If `b`
    contains duplicate elements, they will appear in the resulting array, unless there is an
    equal (`===`) element in `a`.
*/
__js function array_union(a, b) {
  var rv = a.slice();
  var i=0;
  outer:
  for (; i<b.length; ++i) {
    var e_b = b[i];
    for (var j=0; j<a.length; ++j) {
      if (a[j] === e_b)
        continue outer;
    }
    rv.push(e_b);
  }
  return rv;
}
__js exports.array_union = array_union;

/**
  @function array_difference
  @param    {Array} [a]
  @param    {Array} [b]
  @return   {Array} New array containing all elements of `a` that are not in `b` (under `===`)
  @summary  Create an array of elements in `a` that are not in `b` (under `===`).
  @desc
    The elements in the returned array will be in the same order as in array `a`.
  
    See also [./set::difference].
*/
__js function array_difference(a, b) {
  var rv = [];
  for (var i=0; i<a.length; ++i) {
    if (b.indexOf(a[i]) == -1)
      rv.push(a[i]);
  }
  return rv;
}
__js exports.array_difference = array_difference;

/**
  @function haveCommonElements
  @param {Array} [a] Set of elements
  @param {Array} [b] Set of elements
  @return {Boolean} True if `a` and `b` have at least one common element; false otherwise.
  @summary Checks if two sets have common elements (under `===`).
  @desc
    ###Notes:

    * This is a general but naive implementation with a running time `O(size(a)*size(b))`.
    For more specific datatypes (strings or numbers, or objects with unique id's) there are
    more scalable algorithms.
*/
__js exports.haveCommonElements = function(a, b) {
  for (var i=0; i<a.length; ++i) {
    for (var j=0; j<b.length; ++j) {
      if (a[i] === b[j]) return true;
    }
  }
  return false;
};

/**
  @function cmp
  @param {Array} [a]
  @param {Array} [b]
  @summary Compare two arrays by their corresponding elements.
  @return {Number} -1, 0 or 1
  @desc
    The return value is -1 if `a` is less than `b`,
    1 if it is greater than, and 0 otherwise.

    Elements are compared with their native ordering (i.e `<` and `>`).
    Arrays are equal if their elements are all equal (and have the same length).
    Otherwise, they are ordered according to the first differing element. If
    one array ends before a differing element is found, it is considered
    less than the longer array.
*/
__js var cmp = exports.cmp = function cmp(a,b) {
  var i=0;
  var ai, bi;
  var al = a.length;
  var bl = b.length;
  var minl = Math.min(al, bl);
  for (var i=0; i<minl; i++) {
    ai = a[i];
    bi = b[i];
    if (ai < bi) return -1;
    else if (ai > bi) return 1;
  }
  if (al === bl) return 0;
  return al < bl ? -1 : 1;
};
