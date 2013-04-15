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

var AssertionError = exports.AssertionError = function(msg, desc) {
  this.message = msg;
  if (desc) this.message += " (#{desc})";
}
exports.AssertionError.prototype = new Error();

exports.ok = function(val, desc) {
  if (!val) throw new AssertionError("Not truthy: #{val}", desc);
}

exports.not_ok = function(val, desc) {
  if (val) throw new AssertionError("Truthy: #{val}", desc);
}

exports.raises = function(fn, desc) {
  try {
    fn();
  } catch(e) {
    return e;
  }
  throw new AssertionError("Nothing raised", desc);
}

exports.catchError = function(fn) {
  try {
    fn();
  } catch(e) {
    return e;
  }
  return null;
}
  
exports.eq = exports.equal = function(val, expected, desc) {
  // TODO: use proper (and strict) equality
  if (String(val) != String(expected)) throw new AssertionError("Expected #{expected}, got #{val}", desc);
}
