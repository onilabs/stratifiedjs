/*
 * StratifiedJS 'sys' module
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
  @module    sys
  @summary   SJS runtime utilities
  @home      sjs:sys
*/

var s = require('builtin:apollo-sys');
module.exports = {

/**
  @variable hostenv
  @summary Host environment that we're running in (currently one of 'nodejs' or 'xbrowser')
*/
  hostenv: s.hostenv,

/**
  @function getGlobal
  @summary Returns the global object (i.e. window or global, depending on [::hostenv])
*/
  getGlobal:s.getGlobal,

/**
  @function eval
  @param {String} [code]
  @param {optional Settings} [settings]
  @setting {optional String} [filename]
  @return {Object}
  @summary Dynamically evaluate SJS code
  @desc
    Returns the last expression from `code`.
*/
  eval: s.eval,

/**
  @variable version
  @summary The current SJS version string
  @desc
    The version string returned will include the text "-development" if using
    a non-released version (i.e from the git repo, or loaded from
    an unstable branch of code.onilabs.com.

    If SJS is installed by a package manager (e.g. npm),
    this will match the package version string.
*/
  // NOTE: version property is in double-quotes so
  // the buildscript treats it like JSON
  "version" : "0.14.0-1-development",
};
