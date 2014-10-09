/*
 * StratifiedJS 'collection/list' module
 * Functions for manipulating finite ordered sequences
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
   @module    collection/list
   @summary   Functions for manipulating finite ordered sequences
   @home      sjs:collection/list
   @desc
     The collection/list module contains generic functions for working with
     [::List] data structures.
*/

/**
   @class List
   @summary A data structure that contains a finite number of elements in order.

            Lists supports getting, adding, and removing elements from a particular index.

            Lists are *not* sparse: they do not have gaps.
   @desc
     New data types can be created and plugged into the system, so that SJS will recognize
     them as a [::List].
*/

// Generated using http://www.generateuuid.com/
var interface_length     = '__symbol_length_50A60F7E-9701-4E4B-A8F8-C62D15979FCF__';
var interface_nth        = '__symbol_nth_77F5FDA5-1DFC-47DA-B580-A4C650C37CA5__';
var interface_nth_insert = '__symbol_nth_insert_162C7E7E-336E-4775-A3FF-1B366F03647C__';
var interface_nth_set    = '__symbol_nth_set_01326BF6-140A-467B-A5E7-E8599145E16B__';
var interface_nth_remove = '__symbol_nth_remove_12951CE1-0753-4763-9511-0BA6AD4DF4A3__';

exports.interface_length     = interface_length;
exports.interface_nth        = interface_nth;
exports.interface_nth_insert = interface_nth_insert;
exports.interface_nth_set    = interface_nth_set;
exports.interface_nth_remove = interface_nth_remove;


function getIndex(list, index, offset) {
  if (index < 0) {
    index = length(list) + index + offset;
    if (index < 0) {
      throw new RangeError("index #{index} is below 0");
    }
  }
  return index;
}

/**
   @function length
   @param {::List} [list]
   @return {Number} The number of elements in `list`
 */
function length(list) {
  if (interface_length in list) {
    return list[interface_length](list);
  // TODO isArrayLike
  } else if (Array.isArray(list)) {
    return list.length;
  } else {
    throw new Error("Cannot length: object #{list} is not a list");
  }
}

/**
   @function nth_has
   @param {::List} [list]
   @param {Number} [index] Index to check in `list`
   @return {Boolean} `true` if `index` is in `list`
   @desc
     If `index` is negative, it is treated as starting from the end
     of `list`. e.g. `-1` means the last element of `list`, `-2` means
     the second from last element, etc.
 */
function nth_has(list, index) {
  index = getIndex(list, index, 0);
  return index < length(list);
}
exports.nth_has = nth_has;

/**
   @function nth
   @param {::List} [list]
   @param {Number} [index] Index to retrieve from `list`
   @param {optional Object} [def] Value to return if `index` is not in `list`
   @return {Object} The element at `index` in `list`, or `def` if `index` is not in `list`
   @desc
     If `index` is negative, it is treated as starting from the end
     of `list`. e.g. `-1` means the last element of `list`, `-2` means
     the second from last element, etc.

     If `index` is not in `list` and `def` is not provided, it will throw an error
 */
function nth(list, index, def) {
  index = getIndex(list, index, 0);

  if (nth_has(list, index)) {
    if (interface_nth in dict) {
      return list[interface_nth](list, index);
    // TODO isArrayLike
    } else if (Array.isArray(list)) {
      return list[index];
    } else {
      throw new Error("Cannot nth: object #{list} is not a list");
    }
  } else {
    if (arguments.length === 3) {
      return def;
    } else {
      // TODO is RangeError the right Error to use?
      throw new RangeError("Cannot nth: index #{index} is not in list #{list}");
    }
  }
}
exports.nth = nth;

/**
   @function nth_insert
   @function {::List} [list]
   @function {Number} [index] Index to insert into `list`
   @function {Object} [value] Value to insert at `index` in `list`
   @desc
     Inserts `value` at `index`.

     It does not overwrite existing elements, instead elements are
     shifted to the right to make room for the new element.

     If `index` is negative, it is treated as starting from the end
     of `list`. e.g. `-1` means to insert at the end of `list`, `-2`
     means to insert before the last element of `list`, etc.
 */
function nth_insert(list, index, value) {
  index = getIndex(list, index, 1);

  if (index > length(list)) {
    throw new Error("Cannot nth_insert: index #{index} is greater than the length of #{list}")
  }

  if (interface_nth_insert in list) {
    list[interface_nth_insert](list, index, value);
  // TODO isArrayLike
  } else if (Array.isArray(list)) {
    // Optimization to make it go a lot faster
    // http://jsperf.com/array-push-splice-unshift
    if (index === list.length) {
      list.push(value);
    } else {
      list.splice(index, 0, value);
    }
  } else {
    throw new Error("Cannot nth_insert: object #{list} is not a list");
  }
}
exports.nth_insert = nth_insert;

/**
   @function nth_set
   @param {::List} [list]
   @param {Number} [index] Index to set in `list`
   @param {Object} [value] Value to set at `index` in `list`
   @desc
     Changes `index` in `list` to `value`.

     If `index` does not exist in `list`, it will throw an error.

     If `index` is negative, it is treated as starting from the end
     of `list`. e.g. `-1` means to change the last element of `list`,
     `-2` means to change the second from last element, etc.
 */
function nth_set(list, index, value) {
  index = getIndex(list, index, 0);

  if (nth_has(list, index)) {
    if (interface_nth_set in list) {
      list[interface_nth_set](list, index, value);
    // TODO isArrayLike
    } else if (Array.isArray(list)) {
      list[index] = value;
    } else {
      throw new Error("Cannot nth_set: object #{list} is not a list");
    }
  } else {
    // TODO is RangeError the right Error to use?
    throw new RangeError("Cannot nth_set: index #{index} is not in list #{list}");
  }
}
exports.nth_set = nth_set;

/**
   @function nth_remove
   @function {::List} [list]
   @function {Number} [index] Index to remove from `list`
   @desc
     Removes the element at `index` from `list`.

     Any elements after `index` are shifted so that there aren't any gaps.

     If `index` is negative, it is treated as starting from the end
     of `list`. e.g. `-1` means to remove the last element of `list`, `-2`
     means to remove the second from last element, etc.
 */
function nth_remove(list, index) {
  index = getIndex(list, index, 0);

  if (nth_has(list, index)) {
    if (interface_nth_remove in list) {
      list[interface_nth_remove](list, index);
    // TODO isArrayLike
    } else if (Array.isArray(list)) {
      // Optimization to make it go a lot faster
      // http://jsperf.com/array-push-splice-unshift
      if (index === 0) {
        list.shift();
      } else if (index === list.length - 1) {
        list.pop();
      } else {
        list.splice(index, 1);
      }
    } else {
      throw new Error("Cannot nth_remove: object #{list} is not a list");
    }
  } else {
    // TODO is RangeError the right Error to use?
    throw new RangeError("Cannot nth_remove: index #{index} is not in list #{list}");
  }
}
exports.nth_remove = nth_remove;

/**
   @function indexOf
   @param {::List} [list]
   @param {Object} [value] Value to search for in `list`
   @return {Number} Index of `value` in `list`, or `-1` if `value` is not in `list`
   @desc
     Searches `list` for `value`:

     * If `value` is in `list`, then this will return the index of `value`
     * If `value` is not in `list`, then this will return `-1`
 */
function indexOf(list, value) {
  for (var i = 0, len = length(list); i < len; ++i) {
    if (nth_get(list, i) === value) {
      return i;
    }
  }
  return -1;
}
exports.indexOf = indexOf;

/**
   @function modify
   @param {::List} [list]
   @param {Number} [index] Index to modify in `list`
   @param {Function} [f] Function that returns the new value for `index`
   @summary Modifies an existing `index` in `list`.
   @desc
     The `index` must exist in `list`.

     This function calls `f` with the current value for `index`:

     * If `f` returns the same value that it was given, then it will do
     nothing.

     * If `f` returns a different value, then it will set `index` to whatever
     `f` returned.

     Unlike using [::nth_get] followed by [::nth_set], this is safe even if
     [::modify] is called from multiple stratum concurrently.
 */
function modify(list, index, f) {
  // TODO code duplication with sjs:collection/dictionary
  var before = nth_get(list, index);
  var value  = f(before);
  var after  = nth_get(list, index);
  // This is to prevent multiple concurrent modifies from clobbering each other
  if (before === after) {
    if (value !== after) {
      nth_set(list, index, value);
    }
  } else {
    throw new Error("Cannot modify: concurrency failure: #{before} does not match #{after}");
  }
}
exports.modify = modify;
