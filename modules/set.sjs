/*
 * StratifiedJS 'set' module
 * Functions for working with arrays
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '1.0.0'
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
   @module  set
   @summary Functions for working with sets
   @home    sjs:set
   @inlibrary sjs:std
   @inlibrary mho:std
*/
'use strict';

@ = require('./sequence');

/**
   @class Set
   @summary Abstraction of JS [Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set) datatype
   @desc 
     * A Set object lets you store unique values of any type, whether primitive values, or object references.
     * Sets are semi-concrete [./sequence::Sequence]s.
   @function Set
   @summary Construct a new set
   @param {optional ./sequence::Sequence} [initial_elements] Initial elements to copy into the set
   @function Set.add
   @summary Add an element to the set
   @param {Any} [element] Element to insert into the set
   @return {::Set}
   @function Set.clear
   @summary Remove all elements from the set
   @function Set.delete
   @summary Remove an element from the set
   @param {Any} [element] Element to remove from the set
   @return {Boolean} Returns `true` if the element was removed from the set, `false` if the set didn't contain the element
   @function Set.has
   @summary Test if the set contains the given `element`
   @param {Any} [element]
   @return {Boolean} Returns `true` if the set contains `element`, `false` otherwise.
   @variable Set.size
   @summary Integer representing the number of elements currently in the set
*/
function _Set(initial) {
  return new Set(initial ? (isSet(initial) ?  initial : initial .. @toArray));
}
exports.Set = _Set;

/**
   @function toSet
   @param {./sequence::Sequence} [sequence]
   @summary Convert the given sequence to a [::Set]
   @return {::Set}
   @desc
     If `sequence` is already a [::Set], it will be returned unmodified (i.e. it will not be cloned)
*/
__js {
  var toSet = seq -> isSet(seq) ? seq : _Set(seq);
  exports.toSet = toSet;
}

/**
   @function isSet
   @param {Any} [x]
   @summary Returns whether `x` is a [::Set] object or not
   @return {Boolean} Whether `x` is a [::Set] object or not
*/
__js {
  function isSet(obj) {
    return obj instanceof Set;
  }
  exports.isSet = isSet;
} // __js

/**
   @function union
   @param {Array} [sets] Array of [./sequence::Sequence]s
   @summary Create a set containing the elements of all [./sequence::Sequence]s in `sets`
   @return {::Set}
*/
var union = sets -> _Set(sets .. @concat);
exports.union = union;

/**
   @function intersection
   @param {Array} [sets] Array of [./sequence::Sequence]s
   @summary Create a set containing the elements common to all [./sequence::Sequence]s in `sets`
   @return {::Set}
*/
function intersection(sequences) {
  var sets = sequences .. @transform(s -> s .. toSet) .. @sortBy('size');
  if (sets.length === 0) return _Set(); // empty set

  __js {
    var I = _Set(sets.shift());
    sets .. @each {
      |S|
      I .. @each {
        |elem|
        if (!S.has(elem)) I.delete(elem);
      }
    }
  }

  return I;
}
exports.intersection = intersection;

/**
   @function difference
   @param {./sequence::Sequence} [a]
   @param {./sequence::Sequence} [b]
   @summary Create a set containing the elements in `a` that are not in `b`
   @return {::Set}
*/
function difference(a,b) {
  var D = _Set(a);
  b = b .. toSet;
  __js {
    D .. @each {
      |elem|
      if (b.has(elem)) D.delete(elem);
    }
  }
  return D;
}
exports.difference = difference;

/**
   @function isSubset
   @param {./sequence::Sequence} [a]
   @param {./sequence::Sequence} [b]
   @summary Returns true if `a` is a proper subset of `b` or equal to `b`
*/
function isSubset(a,b) {
  a = a .. toSet;
  b = b .. toSet;
  return _isSubset(a,b);
}
exports.isSubset = isSubset;

__js function _isSubset(a,b) {
  if (a.size > b.size) return false;
  for (var x of a) {
    if (!b.has(x)) return false;
  }
  return true;
}
