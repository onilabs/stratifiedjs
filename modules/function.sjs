/*
 * Oni Apollo 'function' module
 * Function composition helpers
 *
 * Part of the Oni Apollo Standard Module Library
 * Version: 'unstable'
 * http://onilabs.com/apollo
 *
 * (c) 2012 Oni Labs, http://onilabs.com
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
   @module  function
   @summary Function composition helpers
   @home    apollo:function
*/

var coll = require('./collection');

/**
   @function seq
   @summary Sequential function composition
   @param   {Function} [f1, f2, ...] Functions to compose
   @return  {Function} Sequential composition of f1, f2, ...
   @desc
      The composed function `c = seq(f,g)` will apply its arguments first 
      to `f`, then to `g`, and return the result of evaluating `g`.

      `f` and `g` will be called with the same `this` pointer that `c` is called with.
*/
exports.seq = function(/*f1,f2,...*/) {
  var fs = arguments;
  return function() { 
    var rv;
    for (var i=0; i<fs.length; ++i)
      rv = fs[i].apply(this, arguments); 
    return rv;
  }
};


/**
   @function par
   @summary Parallel function composition
   @param   {Function} [f1, f2, ...] Functions to compose
   @return  {Function} Parallel composition of f1, f2, ...
   @desc
      A call `c(a1,a2,...)` to the composed function `c = par(f,g)`
      executes as
      `waitfor{ f(a1,a2,...) } and { g(a1,a2,...) }`.

      `f` and `g` will be called with the same `this` pointer that `c` is called with.

*/
exports.par = function(/*f1,f2,...*/) {
  var fs = Array.prototype.slice.call(arguments);
  return function() {
    return coll.par.waitforAll(fs, arguments, this);
  }
};

// XXX alt, compose (f o g), curry
