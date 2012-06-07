/*
 * Oni Apollo 'string' module
 * Functions for working with strings
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
   @module  string
   @summary Functions for working with strings
   @home    apollo:string
   @desc    Work-in-progress
*/

/**
   @function format
   @summary Format a string using the first argument as a printf-like format.
   @param   {String} [format_string] Format string
   @param   {optional Objects} [...] 
   @desc
      This function is an almost literal copy of the nodejs's [util.format](http://nodejs.org/api/util.html#util_util_format). 
*/
var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j': return JSON.stringify(args[i++]);
      default:
        return x;
    }
  });
  return str;
};

/**
  @function sanitize
  @summary  Make a string safe for insertion into html.
  @param    {String} [str] String to sanitize.
  @return   {String} Sanitized string.
  @desc
    Returns sanitized string with **<**,**>**, and **&** replaced by their corresponding html entities.
**/

var replacements = {
  '&':'&amp;',
  '>':'&gt;',
  '<':'&lt;'
};

exports.sanitize = function(str) {
  return str.replace(/[<>&]/g, function(c) {
    return replacements[c];
  })
};

/**
  @function supplant
  @summary  Performs variable substitution on a string.
  @param    {String} [template] A string holding variable names enclosed in **{ }** braces.
  @param    {Object} [replacements] Hash of key/value pairs that will be replaced in *template*.
  @return   {String} String with placeholders replaced by variables.
  @desc
    An error will be thrown if any substitution can't be found
    
    ###Example:

        var rv = common.supplant("Hello {who}", { who: "world"});
        // rv will equal "Hello world"
*/
//XXX how should you escape {foo}? {{foo}}? \{foo\}?
exports.supplant = function(str, o) {
  return str.replace(/{([^{} ]*)}/g,
    function(text, key) {
      var replacement = o[key];
      if(replacement === undefined) throw new Error("No substitution found for \"" + key + "\"");
      if(replacement instanceof Function) { replacement = replacement.call(o); };
      return replacement;
    }
  );
};
