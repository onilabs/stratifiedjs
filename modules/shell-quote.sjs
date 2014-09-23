/*
 * StratifiedJS 'shell-quote' module
 * Quote and parse shell commands
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.20.0-development'
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2013 Oni Labs, http://onilabs.com
 *
 *
 * This file is derived from the "node-shell-quote" project
 * (https://github.com/substack/node-shell-quote),
 * which is available under the terms of the MIT License:
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 * 
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/**
  @module    shell-quote
  @summary   Quote and parse shell commands
  @home      sjs:shell-quote
  @desc
    This module provides methods for parsing a string into multiple arguments, and for
    encoding an array of arguments into a single string. It uses POSIX-like
    syntax.
    
    **NOTE**: [::quote] is *not guaranteed* to safely sanitize data for use with any
    specific shell. You should not rely on it for protecting against shell-injection.
*/

var { map, join, toArray } = require('./sequence');
var { isArrayLike } = require('builtin:apollo-sys');
var DQ_SPECIAL_CHARS = '["\\\\$`]';
var NAKED_SPECIAL_CHARS = '[;# \t\r\n\'\0{}()&|*?<>!' + DQ_SPECIAL_CHARS.slice(1);


/**
  @function quote
  @param {Array} [args]
  @return {String}
  @summary Quote an array of arguments.
  @desc
    **NOTE**: this function is *not guaranteed* to safely sanitize data for use with any
    specific shell. You should not rely on it for protecting against shell-injection.
    
    In general, you should not spawn new processes using any shell-like syntax. You should
    instead use a function that accepts an array of arguments, as passing arguments in
    this way prevents any chance of shell-injection.

    ### Example:

        console.log(quote([ 'a', 'b c d', '$f', '"g"' ]));
        // a 'b c d' \$f '"g"'
*/
exports.quote = function (xs) {
  if (!isArrayLike(xs)) {
    xs = [xs];
  }

  var dqSpecial = new RegExp('(' + DQ_SPECIAL_CHARS + ')', 'g');
  var nakedSpecial = new RegExp('(' + NAKED_SPECIAL_CHARS + ')');
  return xs .. map(function (s) {
    if ((s.length > 0) && (!nakedSpecial.test(s)))
      return s;
    if (!/'/.test(s)) // no single quotes
      return "'" + s + "'";
    return '"' + s.replace(dqSpecial, '\\$1') + '"';
  })..join(' ');
};

/**
  @function parse
  @param {String} [commandLine]
  @param {optional Object} [env]
  @return {Array}
  @summary Parse a string into an array of arguments.
  @desc
    if `env` is provided, its values will be used as substitutions for any
    variable references found.

    ### Example:

        parse('beep --boop="$PWD"', { PWD: '/home/robot' });
        // --> [ 'beep', '--boop=/home/robot' ]
*/
exports.parse = function(s, env) {
  var BARE_TOKEN = "((?:\\\\.|[^\\s'\"])+)";
  var REF_CHARS = '(\\w+|[*@#?$!0_-])';
  var REF = '\\$\\{' + REF_CHARS + '\\}|\\$' + REF_CHARS + '';
  var DOUBLE_QUOTE_CONTENT = '(?:\\\\(' + DQ_SPECIAL_CHARS + ')|([^"$])|' + REF + ')';
  var SINGLE_QUOTE = "(?:'([^']*)')";
  var DOUBLE_QUOTE = '(?:"((?:' + DOUBLE_QUOTE_CONTENT + ')*)")';
  var QUOTED = SINGLE_QUOTE + '|' + DOUBLE_QUOTE;

  var doubleQuoteReplace = new RegExp('\\\\(' + DQ_SPECIAL_CHARS + ')|' + REF, 'g');
  var bareReplace = new RegExp('\\\\(.)|' + REF, 'g');

  var CHUNK = BARE_TOKEN + '|' + QUOTED;
  var chunk = new RegExp(CHUNK, 'g');
  // multiple sequential chunks are treated as one output token
  var chunker = new RegExp('(?:' + CHUNK + ')+' , 'g');

  var match = s.match(chunker);
  if (!match) return [];
  if (!env) env = {};

  return match..map(function (s) {
    s = s.replace(chunk, function(m, bare, single, dbl) {
      var start = m.charAt(m.offst);
      switch(start) {
        case "'": return single;
        case '"': return dbl.replace(doubleQuoteReplace, replaceContent);
        default: return bare.replace(bareReplace, replaceContent);
      }
    });
    return s;
  });

  function replaceContent(match, escaped, ref1, ref2) {
    if (escaped) return escaped;
    return getVar(ref1 || ref2);
  };
  
  function getVar (key) {
    var r = typeof env === 'function' ? env(key) : env[key];
    if (r === undefined) r = '';
    return String(r);
  }
};

