/*
 * StratifiedJS 'regexp' module
 * Functions for working with Regular Expressions
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
   @module  regexp
   @summary Functions for working with regular expressions
   @home    sjs:regexp
*/

var { each, Stream } = require('./sequence');

/**
  @function isRegExp
  @summary  Test if a given value is a RegExp
  @param    {Object} [re]
  @return   {Boolean}
*/
exports.isRegExp = function(re) {
  return Object.prototype.toString.call(re) === '[object RegExp]';
}

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
  @function matches
  @summary  Return a [sequence::Stream] of all non-overlapping matches of a regexp in a given string.
  @param    {String} [str] String to search.
  @param    {RegExp} [regexp] Pattern to find.
  @return   {sequence::Stream} Stream of match objects.
  @desc
    `regexp` should always include the global (`/g`) flag.
    
    If this function detects an infinite loop (because `regexp` is missing the
    global flag or matches zero characters), an error will be thrown.
*/
exports.matches = function(str, re) {
  if (!re.global) throw new Error("regex must include the /g flag");
  return Stream(function(receiver) {
    var match;
    re.lastIndex = 0;
    while (match = re.exec(str)) {
      receiver(match);
      if (re.lastIndex === match.index) re.lastIndex++; // avoid infinite loop
    }
  })
};


/* Used internally by the string.split() function when a regexp split is required
 * Adapted from http://blog.stevenlevithan.com/archives/cross-browser-split:
 *   Cross-Browser Split 1.1.1
 *   Copyright 2007-2012 Steven Levithan <stevenlevithan.com>
 *   Available under the MIT License
 *   ECMAScript compliant, uniform cross-browser split method
 */
exports._splitRe = function(s, sep, limit) {
  var split = [];
  var lastLastIdx = 0;
  var lastLength, lastIdx;
  var indexes = [];
  var flags = (sep.ignoreCase ? "i" : "") +
              (sep.multiline  ? "m" : "") +
              (sep.extended   ? "x" : "") + // Proposed for ES6
              (sep.sticky     ? "y" : ""); // Firefox 3+
  // Make `global`
  sep = new RegExp(sep.source, flags + "g");
  s .. exports.matches(sep) .. each {|match|
    lastIdx = match.index + match[0].length;
    if (lastIdx > lastLastIdx) {
      split.push(s.slice(lastLastIdx, match.index));

      if (match.length > 1 && match.index < s.length)
        Array.prototype.push.apply(split, match.slice(1));

      lastLength = match[0].length;
      lastLastIdx = lastIdx;
      if (limit !== undefined) indexes.push([split.length, match]);
    }
  }
  if (lastLastIdx === s.length) {
    if (lastLength || !sep.test("")) split.push("");
  } else
    split.push(s.slice(lastLastIdx));

  return [indexes, split];
};
