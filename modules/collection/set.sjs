/*
 * StratifiedJS 'collection/set' module
 * Functions for manipulating data structures as a mathematical set
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
   @module    collection/set
   @summary   Functions for manipulating data structures as a mathematical set
   @home      sjs:collection/set
   @desc
     The collection/set module contains generic functions for working with
     data structures as if they were mathematical sets.
*/

var dictionary = require('./dictionary');

/**
   @class Set
   @summary A data structure that supports getting, adding, and removing a value,
            without any duplicates.
   @desc
     Any [collection/dictionary::Dictionary] can be used as a [::Set].

     Any [collection/list::List] can be used as a [::Set].

     New data types can be created and plugged into the system, so that SJS will recognize
     them as a [::Set].
*/

// Generated using http://www.generateuuid.com/
var interface_has    = '__symbol_has_9EB9D66B-DA10-43D5-A367-89A61FA54ADC__';
var interface_add    = '__symbol_add_40F719CC-766A-4105-AEE9-B6C9DE102027__';
var interface_remove = '__symbol_remove_9731B90D-96CE-429D-A5D1-65A0AB485D2B__';

exports.interface_has = interface_has;
exports.interface_add = interface_add;
exports.interface_remove = interface_remove;

/**
   @function has
   @param {::Set} [set]
   @param {Object} [value] Value to check in `set`
   @return {Boolean}
   @summary Returns `true` if `value` is in `set`.
 */
function has(set, value) {
  if (interface_has in set) {
    return set[interface_has](set, value);
  // TODO replace with List stuff
  } else if (Array.isArray(set)) {
    return set.indexOf(value) !== -1;
  } else {
    return dictionary.has(set, value);
  }
}
exports.has = has;

/**
   @function add
   @param {::Set} [set]
   @param {Object} [value] Value to add to `set`
   @summary Adds `value` to `set`. Throws an error if `value` is already in `set`.
 */
function add(set, value) {
  if (has(set, value)) {
    throw new Error("Cannot add: set #{set} already has value #{value}");
  }

  if (interface_add in set) {
    set[interface_add](set, value);
  // TODO replace with List stuff
  } else if (Array.isArray(set)) {
    set.push(value);
  } else {
    dictionary.set(set, value, true);
  }
}
exports.add = add;

/**
   @function remove
   @param {::Set} [set]
   @param {Object} [value] Value to remove from `set`
   @summary Removes `value` from `set`. Throws an error if `value` is not in `set`.
 */
function remove(set, value) {
  if (!has(set, value)) {
    // TODO is RangeError the right Error to use ?
    throw new RangeError("Cannot remove: set #{set} does not have value #{value}");
  }

  if (interface_remove in set) {
    set[interface_remove](set, value);
  } else if (Array.isArray(set)) {
    var index = set.indexOf(value);
    set.splice(index, 1);
  } else {
    dictionary.del(set, value);
  }
}
exports.remove = remove;

/**
   @function union
   @param {::Set} [a]
   @param {::Set} [b]
   @return {::Set} A new [::Set] that contains all the elements
                   from `a` and `b`, without duplicates
   @summary Returns the mathematical union of the two sets.
 */
function union(a, b) {
  // TODO more efficient data type
  var output = [];
  a ..@each(function (value) {
    add(output, value);
  });
  b ..@each(function (value) {
    if (!has(output, value)) {
      add(output, value);
    }
  });
  return output;
}
exports.union = union;

/**
   @function difference
   @param {::Set} [a]
   @param {::Set} [b]
   @return {::Set} A new [::Set] that contains all the elements
                   from `a` that are not in `b`
   @summary Returns the set-theoretic difference of the two sets.
 */
function difference(a, b) {
  // TODO more efficient data type
  var output = [];
  a ..@each(function (value) {
    if (!has(b, value)) {
      add(output, value);
    }
  });
  return output;
}
exports.difference = difference;
