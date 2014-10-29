/*
 * StratifiedJS 'string' module
 * Functions for working with strings
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.20.0-development'
 * http://onilabs.com/stratifiedjs
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

var sys = require('builtin:apollo-sys');
var global = sys.getGlobal();

/**
   @function isString
   @summary Tests if an object is a string
   @param   {anything} [testObj] Object to test.
   @return  {Boolean}
*/
function isString(obj) {
  return typeof obj == 'string' || obj instanceof String;
}
exports.isString = isString;

function isRegExp(re) {
  // copied from ./regexp to reduce imports
  return Object.prototype.toString.call(re) === '[object RegExp]';
}

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

      * You can include a literal '{' or '\' by prefixing it with a backslash
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
  return str.replace(/\\[{\\]|{([^{} ]*)}/g,
    function(text, key) {
      if(text.charAt(0) == '\\') return text.charAt(1);
      var replacement = o[key];
      if(replacement === undefined) throw new Error("No substitution found for \"" + key + "\"");
      if(replacement instanceof Function) { replacement = replacement.call(o); };
      return replacement;
    }
  );
};

/**
  @function repeat
  @summary  Repeats a string.
  @param    {String} [str] String to repeat.
  @param    {Number} [times] Repeat the string this many times.
  @return   {String} `str` repeated `times` times.
  @desc
    `" " ..@repeat(5)` returns `"     "`.
 */
exports.repeat = function(str, times) {
  // TODO check that `times` is greater than or equal to 0
  return new Array(times + 1).join(str);
};

/**
  @function startsWith
  @summary  Returns whether a string starts with another.
  @param    {String} [string] The subject.
  @param    {String} [prefix] The prefix to check for.
  @return   {Boolean} Whether `string` starts with `prefix`.
  @desc
        ### Example:

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

        endsWith("abcd", "cd")
        // true

        endsWith("abcd", "bc")
        // false
*/
exports.endsWith = function(str, suffix) {
  var endPos = str.length - suffix.length;
  if (endPos < 0) return false;
  return str.indexOf(suffix, endPos) == endPos;
}

/**
  @function contains
  @summary  Returns whether a string contains another.
  @param    {String} [string] The subject.
  @param    {String} [substring] The substring to check for.
  @return   {Boolean} Whether `string` contains `substring`.
  @desc
        // example:

        contains("abcd", "bc")
        // true

        contains("abcd", "abd")
        // false
*/
exports.contains = function(str, substr) {
  if (!isString(str)) throw new Error('contains() expects a string');
  return str.indexOf(substr) != -1;
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
  @function split
  @summary  Split a string on a separator
  @param    {String} [string] The string to split
  @param    {String|RegExp} [sep] The separator to split on
  @param    {optional Number} [limit] The maximum number of times to split
  @return   {Array} Array of strings
  @desc
    This function is similar to the Javascript
    [String.prototype.split method](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/split).

    The main changes are:

    ### Consistent behaviour when `sep` is a RegExp:

    If the underlying implementation deals improperly with a RegExp `sep`,
    (commonly the case on older webkits and IE), a fallback is used to ensure
    operation in accordance with the ECMAScript spec.

    ### Different interpretation of `limit`

    If `limit` is provided, the remainder of the string after `limit` splits have
    occurred will be returned as an additional element, rather than discarded
    (which is the behaviour of Javascript's builtin `split` method).

    ### Example:

        split("a.b.c.d", ".")
        // ['a','b','c','d']

        split("one=two=three", "=", 1)
        // ['one', 'two=three']
*/

/**
  @function rsplit
  @summary  Split a string on a separator (starting from the end)
  @param    {String} [string] The string to split
  @param    {String|RegExp} [sep] The separator to split on
  @param    {optional Number} [limit] The maximum number of times to split
  @return   {Array} Array of strings
  @desc
    Just like [::split], except when `limit` is given the splits
    at the end of the string are performed, rather than the start.

    ### Example:

        rsplit("one=two=three", "=", 1)
        // ['one=two', 'three']
*/
(function() {
  // when first required, we check the runtime for correctness with regexp splits. If it's
  // incorrect, we fallback to our own implementation
  var _checked = false, _goodImpl;
  function goodImpl() {
    if (!_checked) {
      _goodImpl = 'ax'.split(/()|(x)/).length === 4;
      exports.split.useNative = _goodImpl;
      _checked = true;
    }
    return _goodImpl;
  };

  exports.split = function(s, sep, limit) {
    var split;
    if (sep .. isRegExp) {
      if (limit === undefined && goodImpl()) {
        split = s.split(sep)
      } else {
        var [indexes, split] = require('./regexp')._splitRe(s, sep, limit);
        if (limit !== undefined && indexes.length > limit) {
          var [elems, {index: offset, 0: {length}}] = indexes[limit-1];
          split.splice(elems, split.length, s.slice(offset + length));
        }
      }
    } else {
      split = s.split(sep);
      if (limit !== undefined && split.length > limit + 1) {
        split.splice(limit, split.length, split.slice(limit).join(sep));
      }
    }
    return split;
  };

  exports.rsplit = function(s, sep, limit) {
    var split;
    if (sep .. isRegExp) {
      if (limit === undefined && goodImpl()) {
        split = s.split(sep)
      } else {
        var [indexes, split] = require('./regexp')._splitRe(s, sep, limit);
        if (limit !== undefined && indexes.length > limit) {
          var [elems, {length: splitElems, index: offset}] = indexes[indexes.length - limit];
          split.splice(0, elems - (splitElems - 1), s.slice(0, offset));
        }
      }
    } else {
      split = s.split(sep);
      if (limit !== undefined && split.length > limit + 1) {
        var excess = split.length - limit;
        split.splice(0, excess, split.slice(0, excess).join(sep));
      }
    }
    return split;
  }

})();

/**
  @function padRight
  @summary  Pad a string (on the right) to a minimum length
  @param    {String} [string]
  @param    {Number} [len] The target string length
  @param    {optional String} [pad] The padding character to use (default: `' '`)
  @return   {String} String at least `len` characters long
  @desc
    Extends the input string by appending the `pad` character until
    the string is `len` characters long.

    Inputs that are already larger than `pad` are not changed.

    ### Example:

        padRight("str", 5);
        // 'str  '

        padRight("str", 5, '-');
        // 'str--'
*/
exports.padRight = function(s, len, ch) {
  if (!ch) ch = ' ';
  s = String(s);
  while(s.length < len) s += ch;
  return s;
}

/**
  @function padLeft
  @summary  Pad a string (on the left) to a minimum length
  @param    {String} [string]
  @param    {Number} [len] The target string length
  @param    {optional String} [pad] The padding character to use (default: `' '`)
  @return   {String} String at least `len` characters long
  @desc
    Extends the input string by prepending the `pad` character until
    the string is `len` characters long.

    Inputs that are already larger than `pad` are not changed.

    ### Example:

        padLeft("str", 5);
        // '  str'

        padLeft("x", 5, '-');
        // '--str'
*/
exports.padLeft = function(s, len, ch) {
  if (!ch) ch = ' ';
  s = String(s);
  while(s.length < len) s = ch + s;
  return s;
}

/**
  @function padBoth
  @summary  Pad a string (on both sides) to a minimum length
  @param    {String} [string]
  @param    {Number} [len] The target string length
  @param    {optional String} [pad] The padding character to use (default: `' '`)
  @return   {String} String at least `len` characters long
  @desc
    Extends the input string to length `len` by adding `pad`
    characters to the beginning and end of a string.

    Inputs that are already larger than `pad` are not changed.

    ### Example:

        padBoth("str", 5);
        // ' str '

        padBoth('uneven string', 20, '-')
        // '----uneven string---'

*/
exports.padBoth = function(s, len, ch) {
  if (!ch) ch = ' ';
  s = String(s);
  var t = len - s.length;
  for(var lp = Math.ceil(t/2); lp > 0; lp--) s = ch + s;
  for(var rp = Math.floor(t/2); rp > 0; rp--) s += ch;
  return s;
}

/**
   @function unindent
   @summary  Remove leading whitespace from every line in the given string.
   @param    {String} [s]
   @param    {optional Integer} [c=0] Number of whitespace characters to
             remove from every line (spaces and tabs both count as one
             whitespace character). If `c==0`, remove as many leading
             whitespace characters as found on the first line.
   @return   {String} Unindented string
   @desc
     Note: If a line in `s` does not contain `c` leading whitespace characters,
           this particular line will be left untouched by `unindent`.
*/
exports.unindent = function(s, c) {
  if (!c) {
    var matches = /^([ \t]+)/.exec(s);
    if (!matches) return s;
    c = matches[1].length;
  }
  return s.replace(new RegExp("^[ \\t]{#{c}}", "mg"), '');
};

/**
   @function capitalize
   @summary  Capitalize first character of the string
   @param    {String} [s]
   @return   {String} Capitalized string
*/
exports.capitalize = function(s) {
  if (s.length == 0) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
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

        * On modern browsers, this function is equivalent to `window.atob`.
        * Octet strings are equivalent to JS strings where the upper half of
          each 16-bit 'character' is set to 0.
        * This function will produce incorrect output or throw an error if any
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

__js {

if (global.btoa) {
  exports.octetsToBase64 = s -> global.btoa(s);
}
else {
  // fallback for IE9 and below
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
}

} // __js

/**
   @function base64ToOctets
   @summary  Convert a Base64 encoded string into a sequence of octets
   @param    {String} [s] Base64 encoded string
   @return   {String}
   @desc
      **Notes:**

        * On modern browsers, this function is equivalent to `window.atob`.
        * Octet strings are equivalent to JS strings where the upper half of
          each 16-bit 'character' is set to 0.
        * This function will silently ignore characters in the input that
          outside of the Base64 range (A-Z, a-z, 0-9, +, /, =)
        * The input function needs to contain padding characters ('=') if the
          encoded string length is not a multiple of 3.
*/
__js {
var atob_ignore = /[^A-Za-z0-9\+\/\=]/g;
if (global.atob) {
  exports.base64ToOctets = s -> global.atob(s.replace(atob_ignore, ""));
}
else {
  // fallback for IE9 and below
  exports.base64ToOctets = function(s) {
    var rv = "";
    s = s.replace(atob_ignore, "");
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
}
} // __js

/**
  @function base64ToArrayBuffer
  @summary  **Deprecated** Convert a Base64 encoded string to an ArrayBuffer
  @param    {String} [s] Base64 encoded string
  @return   {ArrayBuffer}
*/
__js exports.base64ToArrayBuffer = function(s) {
  var octets = exports.base64ToOctets(s);
  var rv = new ArrayBuffer(octets.length);
  var view = new Uint8Array(rv);
  for (var i=0; i<view.length; ++i)
    view[i] = octets.charCodeAt(i);

  return rv;
};

/**
   @function octetsToArrayBuffer
   @summary Write a string of octets to an ArrayBuffer
   @param {String} [s] Octet string (upper half of each 'character' will be ignored)
   @param {optional ArrayBuffer} [buffer] ArrayBuffer to write to; if not provided, a new one will be created
   @param {optional Integer} [offset] Offset at where to start writing into `buffer`
   @return {ArrayBuffer}
*/
__js exports.octetsToArrayBuffer = function(s, buffer, offset) {
  var rv = buffer || new ArrayBuffer(s.length);
  var view = new Uint8Array(rv, offset);
  for (var i=0,l=view.length;i<l;++i)
    view[i] = s.charCodeAt(i);

  return rv;
};

/**
   @function arrayBufferToOctets
   @summary Extract a string of octets from an ArrayBuffer
   @param {ArrayBuffer} [src]
   @param {optional Integer} [offset] Byte offset into `src`
   @param {optional Integer} [length] Byte length
   @return {String} Octet string (upper half of each 'character' set to 0)
*/
__js (function() {
  var workaround = false;
  var fn = function(src, offset, length) {
    var view;
    if (length)
      view = new Uint8Array(src, offset, length);
    else
      view = new Uint8Array(src, offset);

    // workaround for 'apply' call stack size limits. see
    // e.g. https://code.google.com/p/chromium/issues/detail?id=56588
    var rv = '', length = view.byteLength;
    for (var i=0; i<length; /**/) {
      var j = Math.min(i+100000, length);
      if (workaround) {
        // workaround for https://github.com/ariya/phantomjs/issues/11172
        // XXX should get rid of this when phantomjs sort out the problem
        for (var k = i; k<j; ++k)
          rv += String.fromCharCode.call(null, view[k]);
      }
      else {
        rv += String.fromCharCode.apply(null, view.subarray(i,j));
      }
      i = j;
    }
    return rv;
  };

  try {
    String.fromCharCode.apply(null, new Uint8Array(1));
  } catch(e) {
    workaround = true;
  }
  exports.arrayBufferToOctets = fn;
})();
