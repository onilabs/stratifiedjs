/*
 * StratifiedJS 'regexp' module
 * Functions for working with Regular Expressions
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.14.0-1-development'
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
   @module  regexp
   @summary Functions for working with regular expressions
   @home    sjs:regexp
*/

/**
  @function escape
  @summary  Make a string safe for insertion into a regular expression.
  @param    {String} [str] String to escape.
  @return   {String} Escaped string.
  @desc
    Returns sanitized string with regexp-special characters escaped.

    This is useful when embedding literal strings in a compiled
    regular expression.

    ### Example:

        function startsWith(str, prefix) {
          return new RegExp('^' + regexp.escape(prefix)).test(str);
        }

        ".txt" .. startsWith(".");
        // true
        
        "index.txt" .. startsWith(".");
        // false

    This example is illustrative only - the existing [string::startsWith]
    function is much more efficient for this purpose.
*/

exports.escape = function(str) {
  return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
};


/**
  @function findAll
  @summary  Find all non-overlapping matches of a regexp in a given string.
  @param    {String} [str] String to search.
  @param    {RegExp} [regexp] Pattern to find.
  @return   {Array} Array of match objects.
  @desc
    `regexp` should always include the global (`/g`) flag.
    
    If this function detects an infinite loop (because `regexp` is missing the
    global flag or matches zero characters), an error will be thrown.
*/
exports.findAll = function(str, re) {
  var rv = [];
  var match;
  while (match = re.exec(str)) {
    if (rv.length == 1 && match.index == rv[0].index) {
      // detect infinite loop
      throw new Error("invalid regexp (zero-width match or missing /g flag)");
    }
    rv.push(match);
  }
  return rv;
};

