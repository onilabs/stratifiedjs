/*
 * StratifiedJS 'map' module
 * Functions for working with maps
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
   @module  map
   @summary Functions for working with maps
   @home    sjs:map
   @inlibrary sjs:std
   @inlibrary mho:std
*/
'use strict';

@ = require('./sequence');

/**
   @class Map
   @inherit ./sequence::Sequence
   @summary Abstraction of JS [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) datatype
   @desc
     * A Map object holds key-value pairs and maintains the original insertion of the keys. 
     * Any values, whether primitive or object references, may be used as keys and values.
     * Maps are semi-concrete [./sequence::Sequence]s.
     * When iterated with [./sequence::each], maps produce [key,value] pair elements.

   @function Map
   @summary Construct a new map
   @param {optional ./sequence::Sequence} [initial_elements] Initial elements in the map. Sequence elements must be [key,value] pairs.
   @return {::Map}
   @desc
     Note: A map itself is a sequence of [key,value] pair elements, so `Map` can be called with a map as `initial_arguments` (which would produce a clone of the map).

   @function Map.clear
   @summary Remove all elements from the map

   @function Map.delete
   @summary Remove the element with the given key from the map.
   @param {Any} [key] Key of element to remove
   @return {Boolean} Returns `true` if the element was removed from the map, `false` if the map didn't contain an element with the given key.

   @function Map.get
   @summary Returns the value associated with the given key, or `undefined` if the map doesn't contain an element under `key`.
   @param {Any} [key] Key of value to retrieve
   @return {Any} 

   @function Map.has
   @summary Test if the map contains an element under the given key.
   @param {Any} [key] 
   @return {Boolean} Returns `true` if the map contains an element under the given key, `false` otherwise.

   @function Map.set
   @summary Set the given `key` in the map to `value`
   @param {Any} [key]
   @param {Any} [value]
   @return {::Map} Returns the map object

   @variable Map.size
   @summary Integer representing the number of elements currently in the map

*/
function _Map(initial) {
  return new Map(initial ? (isMap(initial) ? initial : initial .. @toArray))
}
exports.Map = _Map;

/**
   @function isMap
   @param {Any} [x]
   @summary Returns whether `x` is a [::Map] object or not
   @return {Boolean} Whether `x` is a [::Map] object or not
*/
__js {
  function isMap(obj) {
    return obj instanceof Map;
  }
  exports.isMap = isMap;
} // __js
