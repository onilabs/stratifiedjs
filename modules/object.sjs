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

var { map, Stream } = require('./sequence');

/**
   @function keys
   @param {Object} [obj]
   @return {sequence::Stream}
   @summary  Returns a [sequence::Stream] of the names of `obj`'s enumerable properties, including those defined on `obj`'s prototype chain.
   @desc     
      See also [::ownKeys].
*/
function keys(obj) {  
  return Stream(function(r) { for (var p in obj) r(p) });
}
exports.keys = keys;

/**
   @function ownKeys
   @param {Object} [obj]
   @return {sequence::Stream}
   @summary  Returns a [sequence::Stream] of the names of `obj`'s own enumerable properties, 
             i.e. excluding those defined on `obj`'s prototype chain.
   @desc     
       Note that you can also use the ECMA-263/5 function `Object.keys` - 
       on older JS engines Apollo adds a shim to emulate this function. 

       See also [::keys].
*/
function ownKeys(obj) {  
  return Stream(function(r) { for (var p in obj) { if (hasOwnProperty.call(obj, p)) r(p) } });
}
exports.ownKeys = ownKeys;


/**
  @function values
  @param    {Object} [obj]
  @return   {sequence::Stream}
  @summary  Returns a [sequence::Stream] of the values of `obj`'s enumerable properties,
            including those defined on `obj`'s prototype chain.
*/
function values(obj) {
  return keys(obj) .. map(k => obj[k]);
}
exports.values = values;

/**
  @function values
  @param    {Object} [obj]
  @return   {sequence::Stream}
  @summary  Returns a [sequence::Stream] of the values of `obj`'s enumerable properties,
            excluding those defined on `obj`'s prototype chain.
*/
function ownValues(obj) {
  return ownKeys(obj) .. map(k => obj[k]);
}
exports.ownValues = ownValues;

/**
  @function propertyPairs
  @param    {Object} [obj]
  @return   {sequence::Stream}
  @summary  Returns a [sequence::Stream] `[key1,val1], [key2,val2], ...` of `obj`'s 
            enumerable properties, including those defined on `obj`'s prototype chain.
*/
function propertyPairs(obj) {
  return keys(obj) .. map(k => [k,obj[k]]);
}
exports.propertyPairs = propertyPairs;

/**
  @function ownPropertyPairs
  @param    {Object} [obj]
  @return   {sequence::Stream}
  @summary  Returns a [sequence::Stream] `[key1,val1], [key2,val2], ...` of `obj`'s 
            enumerable properties, excluding those defined on `obj`'s prototype chain.
*/
function ownPropertyPairs(obj) {
  return ownKeys(obj) .. map(k => [k,obj[k]]);
}
exports.ownPropertyPairs = ownPropertyPairs;
