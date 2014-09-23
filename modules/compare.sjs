/*
 * StratifiedJS 'compare' module
 * Functions for coparing objects for equality
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.20.0-development'
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2013 Oni Labs, http://onilabs.com
 *
 * Adapted from undescore.js' `eq` function. underscore.js is
 * (c) 2009-2013 Jeremy Ashkenas, DocumentCloud Inc.
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
   @module  compare
   @summary Deep or shallow object equality comparisons
   @home    sjs:compare
*/

var isNode = require('builtin:apollo-sys').hostenv === 'nodejs';

__js {

  /**
    @function equals
    @param {Object} [a]
    @param {Object} [b]
    @param {optional Boolean} [deep=true]
    @return {Boolean} whether the given objects are equal.
    @summary Compares two objects for equality.
    @desc
      The rules for two objects to be considered equal here are:

      * For simple types (i.e not an object or array), the strict
        equality operator is used (===)

      * Two arrays are equal if they have the same number of
        elements and the respective elements from each array
        are also equal.

      * Two objects are equal if they have the same prototype,
        the same keys, and the values of each key are also equal.
      
      Child objects (elements of an array and properties of an object)
      are recursively compared with `eq` if `deep` is true (or not given).
      If `deep` is false, child elements will be compared with `===`,

      This function is adapted from the `isEqual` function
      in the [underscore library](http://underscorejs.org/#isEqual),
      and has the same semantics.
  */

  /**
    @function eq
    @summary alias for [::equals]
  */
  exports.eq = exports.equals = function(actual, expected, deep) {
    return eq(actual, expected, [], [], deep !== false, false)[0];
  }

  /**
    @function shallowEquals
    @param {Object} [a]
    @param {Object} [b]
    @return {Boolean} whether the given objects are shallow-equal.
    @summary Shortcut for `eq(a, b, false)`
    @desc
      see [::eq]
  */

  /**
    @function shallowEq
    @summary alias for [::shallowEquals]
  */
  exports.shallowEq = exports.shallowEquals = function(actual, expected) {
    return eq(actual, expected, [], [], false, false)[0];
  };

  /**
    @function describeEquals
    @param {Object} [a]
    @param {Object} [b]
    @param {optional Boolean} [deep=true]
    @summary Compare (and describe differences between) two objects.
    @return {Array} Whether the given objects are equal, and a description if they are not.
    @desc
      The return value is an array of two elements. The first
      is a boolean, and is the same value that [::equals] would return.
      The second is an object that (when coerced to a string), describes
      a reason the objects are not equal. The second argument will always
      be null if the objects are equal, and may be null if no specific reason
      is found (e.g for unequal primitives).

      This function is mostly useful in tests, as the returnd
      `description` gives the user a concrete reason why the
      objects differ.

      ### Examples:

          var [eq, reason] = compare.describeEquals({a:1, b:2, c:3}, {a:1, b:2, c:33});
          console.log("#{eq}, #{reason}");
          >> false, objects differ at property 'c'

          compare.describeEquals({a:1, b:2, c:3}, {a:1, b:2, c:3});
          >> --> [true, null];

          compare.describeEquals("one", "two");
          >> --> [false, null];
  */
  exports.describeEquals = function(actual, expected, deep) {
    var result = eq(actual, expected, [], [], deep !== false, true);
    if (result[0]) result[1] = null; // `eq` difference messages are only meaningful in the negative case
    return result;
  }

  // recursive comparison function for `exports.eq`.
  var toString = Object.prototype.toString;
  if (isNode) toString = function() {
    if (Buffer.isBuffer(this)) return '[object Buffer]';
    return Object.prototype.toString.call(this);
  };
  var cleanObjectName = function(n) { return n.replace(/^\[object |\]$/g, ''); }
  var simpleEq = function(a, b) {
    // takes the same args as `eq`, but only does trivial comparison (used for shallow eq)
    return [a === b, null];
  };
  var eq = function(a, b, aStack, bStack, deep, describe) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return [true, null];
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return [false, describe && ('expected is a ' + cleanObjectName(toString.call(b)) + ', actual is a ' + cleanObjectName(className))];
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return [a == String(b), null];
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return [a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b), null];
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return [+a == +b, null];
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return [(a.source == b.source &&
                 a.global == b.global &&
                 a.multiline == b.multiline &&
                 a.ignoreCase == b.ignoreCase), null];
    }
    if (typeof a != 'object' || typeof b != 'object') {
      return [false, describe && ('expected is a ' + (typeof b) + ', actual is a ' + (typeof a))];
    }

    if (isNode && className == '[object Buffer]') {
      if (b.length !== a.length) return [false, describe && ('expected has ' + b.length + ' elements, actual has ' + a.length)];
      for (var i=0; i<a.length; i++)
        if (a[i] !== b[i]) return [false, describe && new FieldDifference(i)];
      return [true, null];
    }

    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return [bStack[length] == b, null];
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);

    var childEq = deep ? eq : simpleEq;
    var size = 0, result = [true, null];
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = [size == b.length, describe && ('expected has ' + b.length + ' elements, actual has ' + size)];
      if (result[0]) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          result = childEq(a[size], b[size], aStack, bStack, deep, describe);
          if (!result[0]) {
            if (describe) result[1] = new FieldDifference(size, result[1]);
            break;
          }
        }
      }
    } else {
      if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) {
        return [false, 'prototypes differ'];
      }
      // Deep compare objects.
      for (var key in a) {
        if (a.hasOwnProperty(key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!b.hasOwnProperty(key)) {
            result = [false, 'properties differ']
          } else {
            result = childEq(a[key], b[key], aStack, bStack, deep, describe);
            if(describe && !result[0]) {
              result[1] = new FieldDifference(key, result[1]);
            }
          }
          if (!result[0]) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result[0]) {
        for (key in b) {
          if (b.hasOwnProperty(key) && !(size--)) break;
        }
        result = [!size, 'properties differ'];
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  var FieldDifference = function(field, desc) {
    this.field = field;
    this.desc = desc;
    
  }
  var isNum = (n) -> typeof(n) === 'number';

  FieldDifference.prototype.toString = function() {
    var desc = this.desc;
    var ret = "objects differ at " + (
      (!(desc instanceof FieldDifference) && isNum(this.field)) ? 'index' : 'property'
    ) + ' `' + this.field;
    while (desc instanceof FieldDifference) {
      if (isNum(desc.field))
        ret += "[#{desc.field}]";
      else
        ret += "." + desc.field;
      desc = desc.desc;
    }
    ret += '`';
    if (desc != null) ret += ": " + desc;
    return ret;
  }

}
