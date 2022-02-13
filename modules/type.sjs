/*
 * StratifiedJS 'type' module
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
  @module  type
  @summary Functions for creating and inspecting types.
  @home    sjs:type
*/
'use strict';

var toString = {}.toString;

/*
  @function type
  @param {Any} [x]
  @return {String} The type of `x`
  @summary Returns the type of `x`
  @desc
    This function can reliably detect *all* of the built-in JavaScript types:

        @type("foo")          -> "string"
        @type(5)              -> "number"
        @type([])             -> "array"
        @type({})             -> "object"
        @type(undefined)      -> "undefined"
        @type(null)           -> "null"
        @type(arguments)      -> "arguments"
        @type(true)           -> "boolean"
        @type(new Date())     -> "date"
        @type(new Error())    -> "error"
        @type(function () {}) -> "function"
        @type(JSON)           -> "json"
        @type(Math)           -> "math"
        @type(/|/)            -> "regexp"

    However, custom types will always return `"object"`.
 */
function type(x) {
  return toString.call(x).replace(/^\[object ([^\]]+)\]$/, "$1").toLowerCase();
}

/**
  @function isCallable
  @param {Any} [x]
  @return {Boolean} Whether `x` is callable or not
  @summary Returns whether `x` is callable or not
  @desc
    Returns `true` for functions.

    Might be extended to return `true` for other things in future
    versions of StratifiedJS, if they are callable.
 */
__js {
  function isCallable(x) {
    return typeof x === "function";
  }
  exports.isCallable = isCallable;
}
/**
  @function isObject
  @param {Any} [x]
  @return {Boolean} Whether `x` is an object or not
  @summary Returns whether `x` is an object or not
  @desc
    An object is anything that is not:

        string
        number
        boolean
        null
        undefined
 */
__js {
  function isObject(x) {
    return Object(x) === x;
  }
  exports.isObject = isObject;
}

/**
  @function isNaN
  @param {Any} [x]
  @return {Boolean} Whether `x` is NaN or not
  @summary Returns whether `x` is NaN or not
  @desc
    JavaScript already has a built-in `isNaN` function,
    but it coerces its argument to a number, so `isNaN("foo")`
    returns `true`.

    This function will only return `true` if its argument is
    `NaN`.
 */
__js {
  function isNaN(x) {
    return x !== x;
  }
  exports.isNaN = isNaN;
}

/**
  @function isNumber
  @param {Any} [x]
  @return {Boolean} Whether `x` is a number or not
  @summary Returns whether `x` is a number or not
  @desc
    This function returns `true` for numbers.
    It returns `false` for `NaN`.
 */
__js {
  function isNumber(x) {
    return typeof x === "number" && !isNaN(x);
  }
  exports.isNumber = isNumber;
}

/**
  @function isString
  @param {Any} [x]
  @return {Boolean} Whether `x` is a string or not
  @summary Returns whether `x` is a string or not
  @desc
    This function returns `true` for strings.
 */
__js {
  function isString(x) {
    return typeof x === "string";
  }
  exports.isString = isString;
}

/**
  @function isArray
  @param {Any} [x]
  @return {Boolean} Whether `x` is an array or not
  @summary Returns whether `x` is an array or not
  @desc
    This function returns `true` for `Array` objects.
 */
__js {
  function isArray(x) {
    return Array.isArray(x);
  }
  exports.isArray = isArray;
}

/**
  @function isBoolean
  @param {Any} [x]
  @return {Boolean} Whether `x` is a boolean or not
  @summary Returns whether `x` is a boolean or not
  @desc
    This function returns `true` for booleans.
 */
__js {
  function isBoolean(x) {
    return typeof x === "boolean";
  }
  exports.isBoolean = isBoolean;
}

function isSamePrototype(x, y) {
  return is(Object.getPrototypeOf(x), Object.getPrototypeOf(y));
}

function isSameProperties(x, y) {
  var ax = Object.getOwnPropertyNames(x);
  var ay = Object.getOwnPropertyNames(y);
  if (ax.length === ay.length) {
    for (var i = 0, len = ax.length; i < len; ++i) {
      var s = ax[i];
      if (s in y) {
        if (!is(x[s], y[s])) {
          return false;
        }
      } else {
        return false;
      }
    }
    return true;
  } else {
    return false;
  }
}

function isSameSymbols(x, y) {
  // TODO Object.getOwnPropertySymbols
  return true;
}

function isImmutableObject(x) {
  return isObject(x) && Object.isFrozen(x);
}

/**
  @function is
  @param {Any} [x]
  @param {Any} [y]
  @return {Boolean} Whether `x` is equal to `y` or not
  @summary Returns whether `x` is equal to `y` or not
  @desc
    JavaScript already has the `===` operator, but it
    doesn't work for `NaN`. It also doesn't work for
    detecting the difference between `-0` and `0`.

    This function will work with `NaN`, `0`, and `-0`.
    It also compares frozen objects using value equality,
    rather than reference equality.
 */
function is(x, y) {
  if (x === y) {
    // 0 === -0, but they are not identical
    return x !== 0 || (1 / x) === (1 / y);
  } else {
    if (isImmutableObject(x) && isImmutableObject(y)) {
      return isSamePrototype(x, y) &&
             isSameProperties(x, y) &&
             isSameSymbols(x, y);
    } else {
      return isNaN(x) && isNaN(y);
    }
  }
}
exports.is = is;

__js function escape(x) {
  return x.replace(/[\\ ]/g, function (s) {
    return "\\" + s;
  });
}

/**
  @function Token
  @summary Create a string unique across all loaded modules
  @param {Module} [module]
  @param {String} [type] Token type (such as 'interface')
  @param {String} [name]
  @return {String}
  @desc
    Before you can use `Token` you must use [#language/builtins::module.setCanonicalId]
    to give the current module a unique canonical ID.

    For a given `(type, name)` tuple unique within the current module,
    `Token(module, type, name)` generates a string that is guaranteed
    to be unique across all loaded modules, i.e. it will not collide
    with a token with the same `(name,type)` tuple defined in other modules.

    ### Behavior across system boundaries

    Tokens are "transportable" across system boundaries in the sense
    that Tokens with the same `(type, name)` tuple are identical
    strings if they are defined in modules that have identical
    canonical ids.
*/
function Token(module, type, name) {
  var id = module.getCanonicalId();
  if (id == null) {
    throw new Error("You must use module.setCanonicalId before you can use Token(.)");
  } else {
    return "(#{type} " + escape(id) + " " + escape(name) + ")";
  }
}
exports.Token = Token;


/**
  @function Interface
  @param {Module} [module]
  @param {String} [name]
  @return {String}
  @summary Create a string indentifier uniquely naming an interface across all loaded modules
  @desc
    Before you can use `Interface` you must use [#language/builtins::module.setCanonicalId]
    to give the current module a unique canonical ID.

    Then you call `Interface(module, "...")` where the second argument is the
    name of the interface. The returned string for a given `(module,name)` tuple is
    guaranteed to be unique across all loaded modules, i.e. it will not collide with an
    interface with the same `name` defined in other modules.

    `Interface(module, name)` is equivalent to calling `Token(module, 'interface', name)`.

    ----

    What are interfaces good for? Consider these modules:

        // Module book.sjs

        exports.Book = function () {
          return {
            read: function () {
              ...
            }
          };
        };


        // Module file.sjs

        exports.File = function () {
          return {
            read: function () {
              ...
            }
          };
        };


        // Module foo.sjs

        @ = require(['./book', './file']);

        @Book().read();
        @File().read();

    We can `read` from a `Book`, or `read` from a `File`, but these are two *very*
    different things! If we end up confusing one with the other, we will cause a
    bug.

    Even worse, it's now impossible for something to be both a `Book` *and* a `File`
    at the same time, because the `read` method would collide!

    Interfaces completely solve both of these problems. Here are the same modules,
    but this time using `Interface`:

        // Module book.sjs

        @ = require('sjs:type');

        module.setCanonicalId('http://mydomain.com/path/to/book.sjs');

        exports.ITF_READ = @Interface(module, 'read');

        exports.Book = function () {
          var o = {};

          o[exports.ITF_READ] = function () {
            ...
          };

          return o;
        };

        exports.read = function (book) {
          return book[exports.ITF_READ](book);
        };


        // Module file.sjs

        @ = require('sjs:type');

        module.setCanonicalId('http://mydomain.com/path/to/file.sjs');

        exports.ITF_READ = @Interface(module, 'read');

        exports.File = function () {
          var o = {};

          o[exports.ITF_READ] = function () {
            ...
          };

          return o;
        };

        exports.read = function (file) {
          return file[exports.ITF_READ](file);
        };


        // Module foo.sjs

        @ = require([
          { id: './book', name: 'book' },
          { id: './file', name: 'file' }
        ]);

        @book.Book() ..@book.read();
        @file.File() ..@file.read();

    The above code is more verbose and complicated, but it's no longer possible to
    confuse `Book` and `File`, because they use two separate `read` functions.

    In addition, an object can easily implement `ITF_READ` from both modules,
    and thus be treated as both a `Book` and a `File` at the same time:

        // Module filebook.sjs

        @ = require([
          { id: './book', name: 'book' },
          { id: './file', name: 'file' }
        ]);

        exports.FileBook = function () {
          var o = {};

          o[book.ITF_READ] = function () {
            ...
          };

          o[file.ITF_READ] = function () {
            ...
          };

          return o;
        };

    This gives the same flexibility as mixins or traits in other languages.

    Some of the standard library functions in SJS have interfaces, so it's possible
    to create custom data types that work with SJS's functions.
 */
function Interface(module, name) {
  return Token(module, 'interface', name);
}
exports.Interface = Interface;

/**
  @function hasInterface
  @param {Any} [x]
  @param {::Interface} [interface]
  @return {Boolean} `true` if `x` implements `interface`
  @summary Returns whether `x` implements `interface`
  @desc
    `x` 'implementing' an interface `itf` means that `x` is an object and has a property called `itf`
 */
function hasInterface(x, interface_) {
  return isObject(x) && x[interface_] != null;
}
exports.hasInterface = hasInterface;
