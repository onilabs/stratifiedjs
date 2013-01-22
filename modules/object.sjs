/*
 * Oni Apollo 'object' module
 * Functions for working with objects
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
   @module  object
   @summary Functions for working with objects
   @home    sjs:object
*/

var { each, map, toArray } = require('./sequence');

/**
   @function keys
   @param {Object} [obj]
   @return {Array}
   @summary  Returns an array containing the names of `obj`'s own properties.
   @desc     The property names are returned with no consistent order.
             Note that you can also use the ECMA-263/5 function `Object.keys` - 
             on older JS engines Apollo adds a shim to emulate this function. 
*/
function keys(obj) {
  return Object.keys(obj);
}
exports.keys = keys;

/**
  @function values
  @param    {Object} [obj]
  @return   {Array}  [values]
  @summary  Returns an array containing the values of `obj`'s own properties.
  @desc     The property values are returned in no consistent order.
*/
function values(obj) {
  return obj .. keys .. map(k => obj[k]) .. toArray;
}
exports.values = values;

