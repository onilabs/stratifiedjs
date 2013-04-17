/*
 * Oni Apollo 'array' module
 * Functions for working with arrays
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
   @module  array
   @summary Functions for working with arrays
   @home    sjs:array
*/

var { Stream } = require('./sequence');
var { isArrayLike, flatten } = require('builtin:apollo-sys');

/**
   @function isArrayLike
   @summary  Tests if an object is an array, `arguments` object or, in an xbrowser 
             hostenv of Apollo, a NodeList.
   @param    {anything} [testObj] Object to test.
   @return   {Boolean}
*/
exports.isArrayLike = isArrayLike;

/**
   @function remove
   @altsyntax arr .. remove(elem)
   @param {Array} [arr] 
   @param {Object} [elem] Element to remove
   @return {Boolean} `true` if the element was removed, `false` if `elem` is not in `arr`.
   @summary Removes the first element in the array equal (under `===`) to `elem`. 
*/
function remove(arr, elem) {
  var idx = arr.indexOf(elem);
  if (idx == -1) return false;
  arr.splice(idx, 1);
  return true;
}
exports.remove = remove;

/**
   @function cycle
   @param {Array} [arr]
   @return {sequence:Stream}
   @summary Returns an infinite [sequence:Stream] of values `arr[0], arr[1], ..., arr[arr.length-1], arr[0], arr[1], ...`
   @desc
     * Throws an exception is the array is empty
*/
function cycle(arr) {
  if (arr.length == 0) throw new Error('Cannot cycle an empty array');
  return Stream(function(r) { var idx = 0; while (1) { r(arr[idx]); ++idx; idx%=arr.length; } });
}
exports.cycle = cycle;

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
exports.flatten = flatten;

/**
  @function union
  @param    {Array} [a] Set of unique elements
  @param    {Array} [b] Set of unique elements
  @return   {Array} New set containing union of sets `a` and `b`.
  @summary  Union of `a` and `b`, with duplicate elements (under `===`) appearing only once.
  @desc
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
__js function union(a, b) {
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
exports.union = union;

/**
  @function difference
  @param    {Array} [a] 
  @param    {Array} [b] 
  @return   {Array} New array containing all elements of `a` that are not in `b` (under `===`)
  @summary  Create an array of elements in `a` that are not in `b` (under `===`).
*/
__js function difference(a, b) {
  var rv = [];
  for (var i=0; i<a.length; ++i) {
    if (b.indexOf(a[i]) == -1)
      rv.push(a[i]);
  }
  return rv;
}
exports.difference = difference;

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
