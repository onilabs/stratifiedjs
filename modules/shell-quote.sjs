/*
 * Oni Apollo 'shell-quote' module
 * Quote and parse shell commands
 *
 * Part of the Oni Apollo Standard Module Library
 * Version: 'unstable'
 * http://onilabs.com/apollo
 *
 * (c) 2013 Oni Labs, http://onilabs.com
 *
 *
 *   **************************************************************
 *   *    DO NOT EDIT shell-quote.sjs - IT IS A GENERATED FILE!   *
 *   *    EDIT THE SOURCE CODE UNDER apollo/src/deps AND RUN      *
 *   *    apollo/src/build/make-apollo                            *
 *   **************************************************************
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
             This module tracks the [node-shell-quote](https://github.com/substack/node-shell-quote) library by James Halliday.

             It provides methods for parsing a string into multiple arguments, and for
             encoding an array of arguments into a single string. It uses POSIX-like
             syntax.
             
             **NOTE**: [::quote] is *not guaranteed* to safely sanitize data for use with any
             specific shell. You should not rely on it for protecting against shell-injection.

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

/**
  turn off docs from this point onwards:
  @docsoff
*/

var { map, join, toArray } = require('./sequence');
var quote = exports.quote = function (xs) {
    return xs .. map(function (s) {
        if (/["\s]/.test(s) && !/'/.test(s)) {
            return "'" + s.replace(/(['\\])/g, '\\$1') + "'";
        }
        else if (/["'\s]/.test(s)) {
            return '"' + s.replace(/(["\\$`(){}!#&*|])/g, '\\$1') + '"';
        }
        else {
            return s.replace(/([\\$`(){}!#&*|])/g, '\\$1');
        }
    }) .. join(' ');
};

var parse = exports.parse = function parse (s, env) {
    var chunker = /(['"])((\\\1|[^\1])*?)\1|(\\ |\S)+/g;
    var match = s.match(chunker);
    if (!match) return [];
    if (!env) env = {};
    return match .. map(function (s) {
        if (/^'/.test(s)) {
            return s
                .replace(/^'|'$/g, '')
                .replace(/\\(["'\\$`(){}!#&*|])/g, '$1')
            ;
        }
        else if (/^"/.test(s)) {
            return s
                .replace(/^"|"$/g, '')
                .replace(/(^|[^\\])\$(\w+)/g, getVar)
                .replace(/(^|[^\\])\${(\w+)}/g, getVar)
                .replace(/\\([ "'\\$`(){}!#&*|])/g, '$1')
            ;
        }
        else return s.replace(
            /(['"])((\\\1|[^\1])*?)\1|[^'"]+/g,
            function (s, q) {
                if (/^['"]/.test(s)) return parse(s, env);
                return parse('"' + s + '"', env);
            }
        );
    }) .. toArray;
    
    function getVar (_, pre, key) {
        return pre + String(env[key] || '');
    }
};

