/*
 * StratifiedJS 'collection/dictionary' module
 * Functions for manipulating dictionary data structures (JavaScript objects, hash tables, binary search trees, etc.)
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
   @module    collection/dictionary
   @summary   Functions for manipulating dictionary data structures (JavaScript objects, hash tables, binary search trees, etc.)
   @home      sjs:collection/dictionary
   @desc
     The collection/dictionary module contains generic functions for working with
     [::Dictionary] data structures.
*/

/**
   @class Dictionary
   @summary A data structure that supports getting, setting, and removing key/value pairs.
   @desc
     Examples include (but are not limited to) JavaScript objects, hash tables, and binary
     search trees.

     New data types can be created and plugged into the system, so that SJS will recognize
     them as a [::Dictionary].
*/

// Generated using http://www.generateuuid.com/
var interface_has = '__symbol_has_565DA62E-EFAF-4D86-9FF8-6D7428344D00__';
var interface_get = '__symbol_get_3857C414-456E-4C5D-AEEB-C5D53DFC6E8F__';
var interface_set = '__symbol_set_D6C87277-3CC6-47B2-A81C-3D246B41CEBF__';
var interface_del = '__symbol_del_EECC85D1-409B-4D90-B73B-789434F7EA59__';

exports.interface_has = interface_has;
exports.interface_get = interface_get;
exports.interface_set = interface_set;
exports.interface_del = interface_del;

var toString = {}.toString;

// TODO generic sjs:types module for this
// TODO what about [object Date], [object Error], [object JSON], [object Math], and [object RegExp] ?
function isObject(x) {
  return toString.call(x) === '[object Object]';
}

// JS Objects only allow for string keys
function assertJSKey(key) {
  if (typeof key !== 'string') {
    throw new TypeError("JavaScript objects may only have string keys: #{key}");
  }
}

/**
   @function has
   @param {::Dictionary} [dict]
   @param {Object} [key] Key to check in `dict`
   @return {Boolean}
   @summary Returns `true` if the `key` is in `dict`.
 */
function has(dict, key) {
  var interface_fn = dict[interface_has];
  if (interface_fn != null) {
    return interface_fn(dict, key);
  } else if (isObject(dict)) {
    assertJSKey(key);
    return key in dict;
  } else {
    throw new Error("Cannot has: object #{dict} is not a dictionary");
  }
}
exports.has = has;

/**
   @function get
   @param {::Dictionary} [dict]
   @param {Object} [key] Key to retrieve from `dict`
   @param {optional Object} [def] Value to return if the key is not in `dict`
   @return {Object}
   @summary Retrieves the value for `key` in `dict`.
   @desc
     If `key` is not in `dict`:

     * If `def` is provided, it will be returned.

     * If `def` is not provided, it will throw an error.
 */
function get(dict, key, def) {
  if (has(dict, key)) {
    var interface_fn = dict[interface_get];
    if (interface_fn != null) {
      return interface_fn(dict, key);
    } else if (isObject(dict)) {
      assertJSKey(key);
      return dict[key];
    } else {
      throw new Error("Cannot get: object #{dict} is not a dictionary");
    }
  } else {
    if (arguments.length === 3) {
      return def;
    } else {
      // TODO is RangeError the right Error type to use?
      throw new RangeError("Cannot get: dictionary #{dict} does not have the key #{key}");
    }
  }
}
exports.get = get;

/**
   @function set
   @param {::Dictionary} [dict]
   @param {Object} [key] Key to set in `dict`
   @param {Object} [value] Value to use for `key` in `dict`
   @summary Sets the `key` in `dict` to `value`.
   @desc
     If `key` is in `dict` then it is overwritten.

     If `key` is not in `dict` then it is created.
 */
function set(dict, key, value) {
  var interface_fn = dict[interface_set];
  if (interface_fn != null) {
    interface_fn(dict, key, value);
  } else if (isObject(dict)) {
    assertJSKey(key);
    dict[key] = value;
  } else {
    throw new Error("Cannot set: object #{dict} is not a dictionary");
  }
}
exports.set = set;

/**
   @function del
   @param {::Dictionary} [dict]
   @param {Object} [key] Key to delete from `dict`
   @summary Deletes the `key` from `dict`.
   @desc
     If `key` is in `dict` then it is deleted.

     If `key` is not in `dict` then this function does nothing.
 */
function del(dict, key) {
  if (has(dict, key)) {
    var interface_fn = dict[interface_del];
    if (interface_fn != null) {
      interface_fn(dict, key);
    } else if (isObject(dict)) {
      // Does not need `assertJSKey`, because `has` already calls it
      delete dict[key];
    } else {
      throw new Error("Cannot del: object #{dict} is not a dictionary");
    }
  }
}
exports.del = del;

/**
   @function insert
   @param {::Dictionary} [dict]
   @param {Object} [key] Key to set in `dict`
   @param {Object} [value] Value to use for `key` in `dict`
   @summary The same as [::set], except that if `key` already exists
            in `dict` then it will throw an error.
 */
function insert(dict, key, value) {
  // TODO Maybe, it should only throw an error if the key already exists *and*
  //      the value is different. That way calling insert twice with the same value
  //      is a no-op, rather than an error.
  if (has(dict, key)) {
    throw new Error("Cannot insert: dictionary #{dict} already has the key #{key}");
  }
  set(dict, key, value);
}
exports.insert = insert;

/**
   @function modify
   @param {::Dictionary} [dict]
   @param {Object} [key] Key to modify in `dict`
   @param {Function} [f] Function that returns the new value for `key`
   @summary Modifies an existing `key` in `dict`.
   @desc
     The `key` must exist in `dict`.

     This function calls `f` with the current value for `key`:

     * If `f` returns the same value that it was given, then it will do
     nothing.

     * If `f` returns a different value, then it will set `key` to whatever
     `f` returned.

     Unlike using [::get] followed by [::set], this is safe even if
     [::modify] is called from multiple stratum concurrently.
 */
function modify(dict, key, f) {
  var before = get(dict, key);
  var value  = f(before);
  var after  = get(dict, key);
  // This is to prevent multiple concurrent modifies from clobbering each other
  if (before === after) {
    if (value !== after) {
      set(dict, key, value);
    }
  } else {
    throw new Error("Cannot modify: concurrency failure: #{before} does not match #{after}");
  }
}
exports.modify = modify;

/**
   @function remove
   @param {::Dictionary} [dict]
   @param {Object} [key] Key to remove from `dict`
   @summary The same as [::del], except that if `key` does not exist
            in `dict` then it will throw an error.
 */
function remove(dict, key) {
  if (!has(dict, key)) {
    // TODO is RangeError the right Error type to use?
    throw new RangeError("Cannot remove: dictionary #{dict} does not have the key #{key}");
  }
  del(dict, key)
}
exports.remove = remove;
