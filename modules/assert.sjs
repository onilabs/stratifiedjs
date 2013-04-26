/*
 * Oni Apollo 'assert' module
 * Assertion functions for use in tests and to validate runtime assumptions
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
   @module  assert
   @summary Assertion functions for use in tests and to validate runtime assumptions
   @home    sjs:assert
*/

// TODO: (tjc) document

var object = require('./object');
var {each, all, find, toArray} = require('./sequence');
var compare = require('./compare');
var {inspect} = require('./debug');


var AssertionError = exports.AssertionError = function(msg, desc, attrs) {
  if (attrs) this .. object.extend(attrs);
  this.message = msg;
  if (desc) this.message += " (#{desc})";
}
exports.AssertionError.prototype = new Error();
exports.AssertionError.prototype.__assertion_error = true;

exports.ok = exports.truthy = function(val, desc) {
  if (!val) throw new AssertionError("Not OK: #{val}", desc);
}

exports.notOk = exports.falsy = function(val, desc) {
  if (val) throw new AssertionError("Not falsey: #{val}", desc);
}

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

exports.catchError = function(fn) {
  try {
    fn();
  } catch(e) {
    return e;
  }
  return null;
}
  
exports.eq = exports.equal = function(actual, expected, desc) {
  var [eq, difference] = compare.describeEquals(actual, expected);
  if (!eq) {
    var msg = "Expected #{expected .. inspect}, got #{actual .. inspect}"
    if (difference) msg += "\n[#{difference}]";
    throw new AssertionError(msg, desc, {expected: expected, actual: actual});
  }
}

exports.notEq = exports.notEqual = function(actual, expected, desc) {
  var eq = compare.eq(actual, expected);
  if (eq) {
    var msg = "Arguments are equal: #{expected .. inspect}"
    throw new AssertionError(msg, desc);
  }
}

exports.contains = function(seq, expected, desc) {
  var arr = seq..toArray;
  if (arr.indexOf(expected) == -1) {
    throw new AssertionError("Array #{arr .. inspect} does not contain #{expected .. inspect}", desc);
  }
}

exports.containsEq = function(seq, expected, desc) {
  var arr = seq..toArray;
  var NONE = {};
  var found = arr .. find(elem -> compare.equals(elem, expected), NONE);
  if (found === NONE) {
    throw new AssertionError("Array #{arr .. inspect} does not contain #{expected .. inspect}", desc);
  }
}

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

exports.is = function(actual, expected, desc) {
  if (actual !== expected) throw new AssertionError("Expected #{expected .. inspect}, got #{actual .. inspect}", desc);
};

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

