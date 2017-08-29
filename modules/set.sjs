/*
 * StratifiedJS 'set' module
 * Functions for working with arrays
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.20.0-development'
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

/**
   @class Set
   @summary Abstraction of JS [Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set) datatype
   @desc 
     * A Set object lets you store unique values of any type, whether primitive values, or object references.
     * Sets are semi-concrete [./sequence::Sequence]s.
   @function Set
   @summary Construct a new set
   @param {optional ::Set|Array} [initial_elements] Initial elements to copy into the set
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
__js {
  function _Set(initial) {
    return new Set(initial);
  }
  exports.Set = _Set;
} // __js

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

