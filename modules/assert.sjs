/*
 * StratifiedJS 'assert' module
 * Assertion functions for use in tests and to validate runtime assumptions
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
  @module  assert
  @summary Assertion functions, primarily for use in tests.
  @home    sjs:assert

  @desc
    Each of the assertion functions throws an [::AssertionError] if its given assertion fails.

    The optional `desc` argument to each assertion method will be included in the error
    message on failure. This can be either a String or a [quasi::Quasi].
    If `desc` is a [quasi::Quasi] quote, all interpolated objects (except for those that
    are already strings) will be passed through [debug::inspect]. This is done lazily -
    no formatting is done unless the assertion actually fails.


    In addition to the functions listed here, this module exports some self-explanatory
    type checking functions which test whether their `arg` is of the given type:

    * string(arg, [desc])
    * bool(arg, [desc])
    * func(arg, [desc])
    * number(arg, [desc])
    * object(arg, [desc])

    For each of these types, there is also a version that accepts an optional
    argument (may be `null` or `undefined`), or an array of such elements, or an
    optional array of such elements.

    * optionalString(arg, [desc])
    * arrayOfString(arg, [desc])
    * optionalArrayOfString(arg, [desc])
    * (etc ... )

*/

var object = require('./object');
var {each, all, find, toArray, hasElem, join} = require('./sequence');
var compare = require('./compare');
var string = require('./string');
var {inspect} = require('./debug');
var {isQuasi, mapQuasi} = require('./quasi');


// string arguments are not inspected (for easy concatentation of messages); everything else is.
var inspectNonString = (v) -> string.isString(v) ? v : inspect(v);

/**
  @class AssertionError
  @inherit Error
  @summary Error type thrown by assertion failures.
  @constructor AssertionError
  @summary Create an AssertionError object
  @param {String} [msg] Error message
  @param {String|quasi::Quasi} [desc] Descriptive text to include in the error message
  @param {optional Object} [attrs] Additional properties to set on the error instance
*/
var AssertionError = exports.AssertionError = function(msg, desc, attrs) {
  if (attrs) this .. object.extend(attrs);
  this.message = msg;
  if (desc) {
    if (isQuasi(desc)) {
      desc = desc .. mapQuasi(inspectNonString) .. join();
    }
    this.message += " (#{desc})";
  }
}
exports.AssertionError.prototype = new Error();
exports.AssertionError.prototype.__assertion_error = true;


/**
  @function ok
  @summary Assert that the argument is truthy
  @param [arg]
  @param {optional String|quasi::Quasi} [desc] Description to add to the error message on failure.
  @return {Object} the `arg` that was passed in

  @function truthy
  @summary Alias for [::ok]
*/
exports.ok = exports.truthy = function(val, desc) {
  if (!val) throw new AssertionError("Not OK: #{val}", desc);
  return val;
}

/**
  @function notOk
  @summary Assert that the argument is falsy
  @param [arg]
  @param {optional String|quasi::Quasi} [desc] Description to add to the error message on failure.
  @return {Object} the `arg` that was passed in

  @function falsy
  @summary Alias for [::notOk]
*/
exports.notOk = exports.falsy = function(val, desc) {
  if (val) throw new AssertionError("Not falsey: #{val}", desc);
  return val;
}

/**
  @function fail
  @summary Unconditionally raise an AssertionError
  @param {optional String|quasi::Quasi} [desc] Description to add to the error message.
*/
exports.fail = function(desc) {
  throw new AssertionError("Failed", desc);
}

var raisesFilters = {
  inherits: function(proto) {
    if (typeof(proto) == 'function') proto = proto.prototype;
    if (!proto) throw new Error("inherits must be passed a prototype object or constructor function");
    return function(err) {
      return proto.isPrototypeOf(err);
    }
  },
  filter: function(filt) { return filt },
  message: function(expected_message) {
    if (expected_message.test) {
      // support regexes
      return (err) -> expected_message.test(err.message);
    }
    return (err) -> expected_message == err.message;
  },
};


/**
  @function raises
  @summary Assert that the function call `fn()` throws an exception.
  @param {optional Object} [opts] Hash of settings
  @param {Function} [fn]
  @setting {Object|Function} [inherits] Only match exceptions that inherit from the given prototype or constructor function.
  @setting {String|Regex} [message] Only match exceptions whose `.message` property equals `message` (or matches, in the case of a Regex).
  @setting {Function} [filter] Only match exceptions where `filter(exc)` returns true.
  @setting {String|quasi::Quasi} [desc] Description to add to the error message on failure.
  @return  {Object} Error object thrown by `fn()`
  @function throwsError
  @summary Alias for [::raises]
*/
exports.raises = exports.throwsError = function(opts /* (optional) */, fn) {
  var description;
  if (arguments.length == 1) {
    fn = arguments[0];
    opts = {};
  } else if (arguments.length > 2) {
    throw new Error("Too many arguments to assert.raises()");
  }

  var checks = [];
  opts .. object.ownPropertyPairs() .. each {|pair|
    var [k,v] = pair;
    if (k == 'desc') {
      description = v;
      continue;
    }
    if (!raisesFilters.hasOwnProperty(k)) {
      throw new Error("Unknown option: " + k);
    }
    checks.push(raisesFilters[k](v));
  }
    
  try {
    fn();
  } catch(e) {
    if (checks .. all((check) -> check(e))) {
      // if all checks pass, it successfully raised the error we wanted
      return e
    } else {
      require('./logging').info("assert.raises: ignoring thrown #{e}");
    }
  }
  throw new AssertionError("Expected exception not thrown", description);
}

/**
  @function catchError
  @summary Catch (and return) the error thrown by `fn()`, if any
  @param {Function} [fn]
  @return {Object} Exception object thrown by `fn()` or `null`
  @desc
    Returns `null` if no exception is thrown.
*/
exports.catchError = function(fn) {
  try {
    fn();
  } catch(e) {
    return e;
  }
  return null;
};
  
var _eq = function(actual, expected, desc, deep) {
  var [eq, difference] = compare.describeEquals(actual, expected, deep);
  if (!eq) {
    var msg = "Expected #{expected .. inspect}, got #{actual .. inspect}"
    if (difference) msg += "\n[#{difference}]";
    throw new AssertionError(msg, desc, {expected: expected, actual: actual});
  }
};

/**
  @function equal
  @summary Assert that `actual` and `expected` are deep-equal
  @param {Object} [actual]
  @param {Object} [expected]
  @param {optional String|quasi::Quasi} [desc] Descriptive text to include in the error message
  @desc
    Equality is deep and strict, see [compare::equals] for the full semantics.

    In the case of unequal objects, a specific reason for their inequality will be included
    in the error thrown if possible (e.g "Objects differ at property 'foo'").
    See [compare::describeEquals].

  @function eq
  @summary Alias for [::equal]
*/
exports.eq = exports.equal = function(actual, expected, desc) {
  return _eq(actual, expected, desc, true);
};

/**
  @function shallowEqual
  @summary Assert that `actual` and `expected` are shallow-equal
  @param {Object} [actual]
  @param {Object} [expected]
  @param {optional String|quasi::Quasi} [desc] Descriptive text to include in the error message
  @desc
    Just like [::equal], except that child properties / elements of `actual` and
    `expected` are compared with `===`, not deep equality.

  @function shallowEq
  @summary Alias for [::shallowEqual]
*/
exports.shallowEq = exports.shallowEqual = function(actual, expected, desc) {
  return _eq(actual, expected, desc, false);
};

/**
  @function notEqual
  @summary Assert that `actual` and `expected` are not deep-equal
  @param {Object} [actual]
  @param {Object} [expected]
  @param {optional String|quasi::Quasi} [desc] Descriptive text to include in the error message
  @desc
    Equality is deep and strict, see [compare::equals] for the full semantics.

  @function notEq
  @summary Alias for [::notEqual]
*/
var _notEq = function(actual, expected, desc, deep) {
  var eq = compare.eq(actual, expected, deep);
  if (eq) {
    var msg = "Arguments are equal: #{expected .. inspect}"
    throw new AssertionError(msg, desc);
  }
};

exports.notEq = exports.notEqual = function(actual, expected, desc) {
  return _notEq(actual, expected, desc, true);
};

/**
  @function notShallowEq
  @summary Assert that `actual` and `expected` are not shallow-equal
  @param {Object} [actual]
  @param {Object} [expected]
  @param {optional String|quasi::Quasi} [desc] Descriptive text to include in the error message
  @desc
    Equality is shallow and strict, like [::shallowEq].

  @function notShallowEqual
  @summary Alias for [::notShallowEqual]
*/
exports.notShallowEq = exports.notShallowEqual = function(actual, expected, desc) {
  return _notEq(actual, expected, desc, false);
};

var _contains = function(container, expected) {
  var result = [container];

  if (string.isString(container)) {
    result[1] = string.contains(container, expected);
  } else {
    container = result[0] = container .. toArray();
    // quick check:
    if (container .. hasElem(expected)) result[1] = true;
    else {
      var NONE = {};
      var found = container .. find(elem -> compare.equals(elem, expected), NONE);
      result[1] = (found !== NONE);
    }
  }
  return result;
}

/**
  @function contains
  @summary Assert that `container` contains `item`
  @param {sequence::Sequence|String} [container]
  @param {Object} [item]
  @param {optional String|quasi::Quasi} [desc] Descriptive text to include in the error message
  @desc
    If `container` is a sequence or array, this method asserts
    that `item` is an element of it (using [compare::equals] to compare
    elements with deep equality).

    If `container` is a string, this function asserts that `item`
    appears within it (i.e is a substring).
*/
exports.contains = function(seq, expected, desc) {
  var [arr, contains] = _contains(seq, expected);
  if (!contains) {
    throw new AssertionError("#{arr .. inspect} does not contain #{expected .. inspect}", desc);
  }
}

/**
  @function notContains
  @summary Assert that `container` does not contain `item`
  @param {sequence::Sequence|String} [container]
  @param {Object} [item]
  @param {optional String|quasi::Quasi} [desc] Descriptive text to include in the error message
  @desc
    The opposite of [::contains]
*/
exports.notContains = function(seq, expected, desc) {
  var [arr, contains] = _contains(seq, expected);
  if (contains) {
    throw new AssertionError("#{arr .. inspect} contains #{expected .. inspect}", desc);
  }
}

/**
  @function atomic
  @summary Assert that `fn()` completes without suspending
  @param {optional String|quasi::Quasi} [desc] Descriptive text to include in the error message
  @param {Function} [fn] 
*/
exports.atomic = function(desc /* (optional) */, fn) {
  if (arguments.length == 1) {
    fn = desc;
    desc = undefined;
  }
  waitfor {
    return fn();
  } or {
    throw new AssertionError("Function is not atomic", desc);
  }
}

/**
  @function suspends
  @summary Assert that `fn()` suspends before completing (opposite of [::atomic])
  @param {optional String|quasi::Quasi} [desc] Descriptive text to include in the error message
  @param {Function} [fn]
*/
exports.suspends = function(desc /* (optional) */, fn) {
  if (arguments.length == 1) {
    fn = desc;
    desc = undefined;
  }
  var suspended = false;
  var rv;
  waitfor {
    rv = fn();
  } or {
    suspended=true;
  }
  if (!suspended) {
    throw new AssertionError("Function did not suspend", desc);
  }
  return rv;
}

/**
  @function is
  @summary Asserts that `actual` === `expected`
  @param {Object} [actual]
  @param {Object} [expected]
  @param {optional String|quasi::Quasi} [desc] Descriptive text to include in the error message
  @desc
    Uses the `===` operator. For deep equality, use [::equal]
*/
exports.is = function(actual, expected, desc) {
  if (actual !== expected) throw new AssertionError("Expected #{expected .. inspect}, got #{actual .. inspect}", desc);
};

/**
  @function isNot
  @summary Asserts that `actual` !== `expected`
  @param {Object} [actual]
  @param {Object} [expected]
  @param {optional String|quasi::Quasi} [desc] Descriptive text to include in the error message
  @desc
    Uses the `!==` operator. For deep equality, use [::notEqual]
*/
exports.isNot = function(actual, expected, desc) {
  if (actual === expected) throw new AssertionError("Both arguments equal: #{expected .. inspect}", desc);
};


(function() {
  // This block adopted from the `assert-plus` nodejs library,
  // Copyright (c) 2012, Mark Cavage. All rights reserved.
  // Distributed under the MIT licence

  ///--- Internal

  function capitalize(str) {
    return (str.charAt(0).toUpperCase() + str.slice(1));
  }

  function uncapitalize(str) {
    return (str.charAt(0).toLowerCase() + str.slice(1));
  }

  function _assert(arg, type, desc) {
    var t = typeof (arg);
    if (t !== type) {
      throw new AssertionError("#{type} required", desc);
    }
  }

  ///--- API

  function array(arr, type, desc) {
    if (!Array.isArray(arr)) {
      throw new AssertionError("[#{type}] required", desc);
    }

    for (var i = 0; i < arr.length; i++) {
      _assert(arr[i], type, desc, array);
    }
  }

  var exportedSymbols = ['bool', 'func', 'number', 'object', 'string'];
  exportedSymbols.slice() .. each {|k|
    var type = k;
    if (k === 'bool') type = 'boolean';
    if (k === 'func') type = 'function';
    exports[k] = function(arg, desc) { _assert(arg, type, desc); }
  
    var name = 'arrayOf' + capitalize(k);

    exports[name] = function (arg, name) {
      array(arg, k, name);
    };
    exportedSymbols.push(name);
  }

  exportedSymbols .. each {|k|
    var _name = 'optional' + capitalize(k);
    var s = uncapitalize(k.replace('arrayOf', ''));
    if (s === 'bool') s = 'boolean';
    if (s === 'func') s = 'function';

    if (k.indexOf('arrayOf') !== -1) {
      exports[_name] = function (arg, name) {
        if (arg != null) {
          array(arg, s, name);
        }
      };
    } else {
      exports[_name] = function (arg, name) {
        if (arg != null) {
          _assert(arg, s, name);
        }
      };
    }
  }
})();

