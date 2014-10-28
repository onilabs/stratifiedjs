/*
 * StratifiedJS 'type' module
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
  @module  type
  @summary Functions for creating and inspecting types.
  @home    sjs:type
*/
var toString = {}.toString;

/**
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
exports.type = type;

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
function isObject(x) {
  return Object(x) === x;
}
exports.isObject = isObject;

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
function isNaN(x) {
  return x !== x;
}
exports.isNaN = isNaN;


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


/**
  @function Interface
  @param {Module} [module]
  @param {String} [name]
  @return {Interface}
  @summary Returns a new unique interface for the module
  @desc
    Before you can use `Interface` you must use `module.setCanonicalId("...")`
    to give the current module a *unique* canonical ID.

    Then you call `Interface(module, "...")` where the second argument is the
    name of the interface.

    The reason for `setCanonicalId` is to ensure that every interface is *unique*,
    so that it does not collide with any other interface.

    What are interfaces good for? Consider this function:

        // Module foo.sjs

        function Foo() {}

        function Bar() {}

        exports.foo = function (x) {
          if (x instanceof Foo) {
            ...
          } else if (x instanceof Bar) {
            ...
          } else {
            throw new Error("unsupported type");
          }
        };

    The function `foo` does different things depending on the type of its argument,
    but it's not very flexible: if we want to add new types, we have to change the
    function `foo`.

    Instead, let's use an interface:

        // Module foo.sjs

        @ = require("sjs:type");

        module.setCanonicalId("http://mydomain.com/path/to/module/foo.sjs");

        exports.interface_foo = @Interface(module, "foo");

        exports.foo = function (x) {
          return x[exports.interface_foo](x);
        };

    Now *any* object that has the `interface_foo` property can work with the `foo`
    function:

        // Module bar.sjs

        @ = require("./foo.sjs");

        function Foo() {}
        Foo.prototype[@interface_foo] = function (x) { ... };

        function Bar() {}
        Bar.prototype[@interface_foo] = function (x) { ... };

    As you can see, we can create new data types and use `interface_foo` to "plug
    them in" so they work with the `foo` function, without needing to change the
    `foo` function at all!

    Some of the standard library functions in SJS have interfaces, so it's possible
    to create custom data types that work with SJS's functions.
 */
function Interface(module, name) {
  var id = module.getCanonicalId();
  if (id == null) {
    throw new Error("You must use module.setCanonicalId before you can use Interface");
  } else {
    return "__interface_" + id + "_" + name + "__";
  }
}
exports.Interface = Interface;
