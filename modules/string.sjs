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
   @home    sjs:string
*/

/**
   @function isString
   @summary Tests if an object is a string
   @param   {anything} [testObj] Object to test.
   @return  {Boolean}
*/
function isString(obj) {
  return typeof obj == 'string';
}
exports.isString = isString;

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
  str = str === undefined ? "" : str.toString();
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
    ###Notes:

      * An error will be thrown if any substitution can't be found.
      * Consider using SJS's builtin string interpolation functionality instead.

    ###Example:
        
        var obj = { who: "world" };

        var rv = supplant("Hello {who}", obj);
        // rv will equal "Hello world"
        
        // alternatively, this can be expressed with builtin string interpolation:
        var rv = "Hello #{obj.who}";
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

/**
  @function startsWith
  @summary  Returns whether a string starts with another.
  @param    {String} [string] The subject.
  @param    {String} [prefix] The prefix to check for.
  @return   {Boolean} Whether `string` starts with `prefix`.
  @desc
        // example:

        startsWith("abcd", "ab")
        // true
        
        startsWith("abcd", "bc")
        // false
*/
exports.startsWith = function(str, prefix) {
  return str.lastIndexOf(prefix, 0) === 0;
}

/**
  @function endsWith
  @summary  Returns whether a string ends with another.
  @param    {String} [string] The subject.
  @param    {String} [prefix] The suffix to check for.
  @return   {Boolean} Whether `string` ends with `suffix`.
  @desc
        // example:

        startsWith("abcd", "cd")
        // true
        
        startsWith("abcd", "bc")
        // false
*/
exports.endsWith = function(str, suffix) {
  var endPos = str.length - suffix.length;
  return str.indexOf(suffix, endPos) == endPos;
}

/**
  @function strip
  @summary  Strips a string of leading and trailing characters.
  @param    {String} [string] The string to strip.
  @param    {String} [optional ch] The character to remove.
  @return   {String} String with leading and trailing `ch` removed.
  @desc
    ### Notes:

    If no `ch` argument is provided, `strip()` acts exactly like `str.trim()`,
    removing all whitespace characters.

        // example:

        strip("\t abc ")
        // "abc"
        
        strip("||a|b||c|", "|")
        // "a|b||c"
*/
exports.strip = function(s, ch){
  if (ch == undefined) return s.trim();
  return s .. exports.lstrip(ch) .. exports.rstrip(ch);
};

/**
  @function lstrip
  @summary  Strips a string of leading characters.
  @param    {String} [string] The string to strip.
  @param    {String} [optional ch] The character to remove.
  @return   {String} String with leading `ch` removed.
  @desc
    ### Notes:

    If no `ch` argument is provided, `lstrip()` removes all leading whitespace.

        // example:

        strip("\t abc ")
        // "abc "
        
        strip("||a|b||c|", "|")
        // "a|b||c|"
*/
exports.lstrip = function(s, ch){
  if (ch == undefined) return s.replace(/^\s+/,'');
  while(s.charAt(0) == ch) {
    s = s.slice(1);
  }
  return s;
};

/**
  @function rstrip
  @summary  Strips a string of trailing characters.
  @param    {String} [string] The string to strip.
  @param    {String} [optional ch] The character to remove.
  @return   {String} String with trailing `ch` removed.
  @desc
    ### Notes:

    If no `ch` argument is provided, `lstrip()` removes all trailing whitespace.

        // example:

        strip(" abc \t\n")
        // " abc"
        
        strip("|a|b||c||", "|")
        // "|a|b||c"
*/
exports.rstrip = function(s, ch){
  if (ch == undefined) return s.replace(/\s+$/,'');
  while(s.charAt( s.length-1 ) == ch) {
    s = s.slice(0, -1)
  }
  return s;
};


/**
   @function utf16ToUtf8
   @summary  Convert a UTF-16 string to a UTF-8 string.
   @param    {String} [s] UTF-16 encoded string
   @return   {String}
   @desc
     **Notes:**

       * This function is only tested for characters in the [BMP](http://en.wikipedia.org/w/index.php?title=Basic_Multilingual_Plane).
       * JS strings are natively encoded as a sequence of 16-bit words. (Inside the 
         BMP this is equivalent to UTF-16 encoding.)
       * UTF-8 is mapped into JS strings as a sequence of octets, with the upper half
         of each 16-bit 'character' set to 0.
       * See http://mathiasbynens.be/notes/javascript-encoding for a 
         good discussion on JS string encoding.
*/
exports.utf16ToUtf8 = function(s) {
  return unescape(encodeURIComponent(s));
};

/**
   @function utf8ToUtf16
   @summary  Convert a UTF-8 string to a UTF-16 string.
   @param    {String} [s] UTF-8 encoded string
   @return   {String}
   @desc
     **Notes:**

       * This function is only tested for characters in the [BMP](http://en.wikipedia.org/w/index.php?title=Basic_Multilingual_Plane).
       * JS strings are natively encoded as a sequence of 16-bit words. (Inside the 
         BMP this is equivalent to UTF-16 encoding.)
       * UTF-8 is mapped into JS strings as a sequence of octets, with the upper half
         of each 16-bit 'character' set to 0.
       * See http://mathiasbynens.be/notes/javascript-encoding for a 
         good discussion on JS string encoding.
*/
exports.utf8ToUtf16 = function(s) {
  return decodeURIComponent(escape(s));
};

/**
   @function octetsToBase64
   @summary  Convert a sequence of octets into a Base64 encoded string
   @param    {String} [s] Octet string
   @return   {String}
   @desc
      **Notes:**
      
        * Octet strings are equivalent to JS strings where the upper half of
          each 16-bit 'character' is set to 0.
        * This function will produce incorrect output if any 
          character code of the input 
          falls outside the range 0-255.
        * You probably want to encode native JS strings representing 
          textual data (== UTF-16 or UCS-2 string) as UTF-8 strings 
          before converting to Base64 (see [::utf16ToUtf8]).
        * This function appends padding characters ('=') if the input string
          length is not a multiple of 3.
        * No line breaks will be inserted into the output string.
*/
var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

exports.octetsToBase64 = function(s) {
  var rv = "";
  var i = 0, l = s.length;
  while (i<l) {
    var c1 = s.charCodeAt(i++);
    var c2 = s.charCodeAt(i++);
    var c3 = s.charCodeAt(i++);
    
    var e1,e2,e3,e4;
    var e1 = c1 >> 2;
    if (isNaN(c2)) {
      e2 = (c1 & 3) << 4;
      e3 = e4 = 64;
    }
    else {
      e2 = ((c1 & 3) << 4)  | (c2 >> 4);
      if (isNaN(c3)) {
        e3 = (c2 & 15) << 2;
        e4 = 64;
      }
      else {
        e3 = ((c2 & 15) << 2) | (c3 >> 6);
        e4 = c3 & 63;
      }
    }
    rv += keyStr.charAt(e1) + keyStr.charAt(e2) + keyStr.charAt(e3) + keyStr.charAt(e4);
  }
  return rv;
};

/**
   @function base64ToOctets
   @summary  Convert a Base64 encoded string into a sequence of octets
   @param    {String} [s] Base64 encoded string
   @return   {String}
   @desc
      **Notes:**
      
        * Octet strings are equivalent to JS strings where the upper half of
          each 16-bit 'character' is set to 0.
        * This function will silently ignore characters in the input that 
          outside of the Base64 range (A-Z, a-z, 0-9, +, /, =)
        * The input function needs to contain padding characters ('=') if the
          encoded string length is not a multiple of 3.
*/
exports.base64ToOctets = function(s) {
  var rv = "";
  s = s.replace(/[^A-Za-z0-9\+\/\=]/g, "");
  var i=0, l=s.length;

  while (i<l) {
    var e1,e2,e3,e4;
    e1 = keyStr.indexOf(s.charAt(i++));
    e2 = keyStr.indexOf(s.charAt(i++));
    e3 = keyStr.indexOf(s.charAt(i++));
    e4 = keyStr.indexOf(s.charAt(i++));
    
    rv += String.fromCharCode((e1 << 2) | (e2 >> 4));
    if (e3 != 64) {
      rv += String.fromCharCode(((e2 & 15) << 4) | (e3 >> 2));
      if (e4 != 64)
        rv += String.fromCharCode(((e3 & 3) << 6) | e4);
    }
  }
  return rv;
};
