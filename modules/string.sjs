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
__js function isString(obj) {
  return typeof obj == 'string' || obj instanceof String;
}
exports.isString = isString;

__js function isRegExp(re) {
  // copied from ./regexp to reduce imports
  return Object.prototype.toString.call(re) === '[object RegExp]';
}

/**
  @function sanitize
  @summary  Make a string safe for insertion into most html locations.
  @param    {String} [str] String to sanitize.
  @return   {String} Sanitized string.
  @desc
    Returns sanitized string with **<**,**>**, **"**, **'** and **&** replaced by their corresponding html entities.

    **Note:** HTML has a number of special-cased locations where this encoding is not correct, and may
    still lead to code injection. For example, `<script>` and `<style>` tags both have unique encoding rules. If you
    try to use [::sanitize] for data in these special tags, it will *not* always be correct and *will* be possible
    to inject code into your page. Where possible, you should use a template mechanism which can perform the
    appropriate escaping for you (such as the `surface` module in Conductance).
*/

__js var replacements = {
  '&':'&amp;',
  '>':'&gt;',
  '<':'&lt;',
  '\'':'&#39;',
  '"':'&quot;',
};

__js exports.sanitize = function(str) {
  str = str === undefined ? "" : str.toString();
  return str.replace(/['"<>&]/g, function(c) {
    return replacements[c];
  })
};

/**
  @function supplant
  @summary  Performs variable substitution on a string.
  @param    {String} [template] A string holding variable names enclosed in **{ }** braces.
  @param    {Object} [replacements] Hash of key/value pairs that will be replaced in *template*.
  @param    {optional Function} [filter] Function to apply to values before substitution
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
exports.supplant = function(str, o, filter) {
  return str.replace(/\\[{\\]|{([^{} ]*)}/g,
    function(text, key) {
      if(text.charAt(0) == '\\') return text.charAt(1);
      var replacement = o[key];
      if(replacement === undefined) throw new Error("No substitution found for \"" + key + "\"");
      if(replacement instanceof Function) { replacement = replacement.call(o); };
      if (filter) replacement = filter(replacement);
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
__js exports.repeat = function(str, times) {
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
__js exports.startsWith = function(str, prefix) {
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
__js exports.endsWith = function(str, suffix) {
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
__js exports.contains = function(str, substr) {
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
__js exports.strip = function(s, ch){
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
__js exports.lstrip = function(s, ch){
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
__js exports.rstrip = function(s, ch){
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
__js exports.padRight = function(s, len, ch) {
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
__js exports.padLeft = function(s, len, ch) {
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
__js exports.padBoth = function(s, len, ch) {
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
__js exports.unindent = function(s, c) {
  if (!c) {
    var matches = /^([ \t]+)/.exec(s);
    if (!matches) return s;
    c = matches[1].length;
  }
  return s.replace(new RegExp("^[ \\t]{#{c}}", "mg"), '');
};

/**
   @function prefixLines
   @summary Add a prefix to all lines in a string
   @param   {String} [s]
   @param   {String} [prefix]
   @return  {String} String with every line prefixed with `prefix`
*/
__js exports.prefixLines = function(s, prefix) {
  var lines = s.split('\n');
  for(var i=0; i<lines.length; ++i)
    lines[i] = prefix + lines[i];
  return lines.join('\n');
};

/**
   @function capitalize
   @summary  Capitalize first character of the string
   @param    {String} [s]
   @return   {String} Capitalized string
*/
__js exports.capitalize = function(s) {
  if (s.length == 0) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/**
  @class Octets
  @summary Byte sequence implemented as a String
  @desc
    Octets are opaque sequences of bytes. While they happen to be implemented
    as strings, you should generally only use the functions in the [sjs:string::] module to
    convert them to other useful types.

    **Notes:**

      * Octets strings are implemented as JS strings where the upper half of
        each 16-bit 'character' is set to 0.
*/

/**
   @function stringToUtf8
   @summary  Encode a String into UTF-8 [::Octets].
   @param    {String} [s]
   @return   {::Octets} UTF-8 encoded octets.
   @desc
     See also [::utf8ToString].

     **Notes:**

       * This function is only tested for characters in the [BMP](http://en.wikipedia.org/w/index.php?title=Basic_Multilingual_Plane).
       * JS strings are natively encoded as a sequence of 16-bit words. (Inside the
         BMP this is equivalent to UTF-16 encoding.)
       * See http://mathiasbynens.be/notes/javascript-encoding for a
         good discussion on JS string encoding.
*/
__js exports.stringToUtf8 = exports.utf16ToUtf8 = function(s) {
  return unescape(encodeURIComponent(s));
};

/**
   @function utf8ToString
   @summary  Decode UTF-8 octets into a String.
   @param    {::Octets} [octets] UTF-8 octets
   @return   {String}
   @desc
     See also [::stringToUtf8].

     **Notes:**

       * This function is only tested for characters in the [BMP](http://en.wikipedia.org/w/index.php?title=Basic_Multilingual_Plane).
       * JS strings are natively encoded as a sequence of 16-bit words. (Inside the
         BMP this is equivalent to UTF-16 encoding.)
       * See http://mathiasbynens.be/notes/javascript-encoding for a
         good discussion on JS string encoding.
*/
__js exports.utf8ToString = exports.utf8ToUtf16 = function(s) {
  return decodeURIComponent(escape(s));
};

/**
   @function octetsToBase64
   @summary  Convert [::Octets] into a Base64 encoded string
   @param    {::Octets} [octets]
   @return   {String}
   @desc
      **Notes:**

        * On modern browsers, this function is equivalent to `window.atob`.
        * This function will produce incorrect output or throw an error if any
          character code of the input
          falls outside the range 0-255.
        * You should encode native JS strings representing
          textual data (== UTF-16 or UCS-2 string) as UTF-8 octets
          before converting to Base64 (see [::stringToUtf8]).
        * This function appends padding characters ('=') if the input string
          length is not a multiple of 3.
        * No line breaks will be inserted into the output string.
*/
__js var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

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
   @summary  Convert a Base64 encoded string into an octet string
   @param    {String} [s] Base64 encoded string
   @return   {::Octets}
   @desc
      **Notes:**

        * On modern browsers, this function is equivalent to `window.atob`.
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
  @desc
    Use [::base64ToOctets] and [::octetsToArrayBuffer].
*/
__js exports.base64ToArrayBuffer = (s) -> s .. exports.base64ToOctets .. exports.octetsToArrayBuffer;

/**
   @function octetsToArrayBuffer
   @summary Write [::Octets] to an ArrayBuffer
   @param {::Octets} [octets]
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
   @return {::Octets}
*/

__js exports.arrayBufferToOctets = function(src, offset, length) {
  var view;
  if (length)
    view = new Uint8Array(src, offset, length);
  else
    view = new Uint8Array(src, offset);

  // workaround for 'apply' call stack size limits. see
  // e.g. https://code.google.com/p/chromium/issues/detail?id=56588
  var rv = '', length = view.byteLength;
  for (var i=0; i<length; /**/) {
    // Phantomjs requires a limit of 50000 here; other browsers work fine with 
    // higher limits, although 100000 caused occasional errors in the conductance bridge code.
    var j = Math.min(i+50000, length);
    rv += String.fromCharCode.apply(null, view.subarray(i,j));
    i = j;
  }
  return rv;
};

__js {
  if (sys.hostenv === 'nodejs') {
    /**
      @function encode
      @hostenv nodejs
      @param {optional String} [data]
      @param {String} [encoding]
      @summary Encode string -> bytes
      @desc
        If both arguments are provided, returns the
        encoded string.

        If only one argument is provided, returns a partially-applied
        function which accepts a string and encodes it.

      @function decode
      @hostenv nodejs
      @param {optional Buffer} [data]
      @param {String} [encoding]
      @summary Decode bytes -> string
      @desc
        If both arguments are provided, returns the
        decoded buffer.

        If only one argument is provided, returns a partially-applied
        function which accepts a buffer and decodes it.
    */

    var decode = function(buf, enc) {
      if(!Buffer.isBuffer(buf)) throw new Error("Not a buffer");
      return buf.toString(enc);
    };

    var encode = function(str, enc) {
      if(!exports.isString(str)) throw new Error("Not a string");
      return new Buffer(str, enc);
    };

    exports.decode = function(arg) {
      if (arguments.length < 2)
        return data -> decode(data, arg);
      return decode(arg, arguments[1]);
    }

    exports.encode = function(arg) {
      if (arguments.length < 2)
        return data -> encode(data, arg);
      return encode(arg, arguments[1]);
    }
  }
}
