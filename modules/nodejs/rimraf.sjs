/*
 * StratifiedJS 'nodejs/rimraf' module
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.20.0-development'
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2014 Oni Labs, http://onilabs.com
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
  @module    rimraf
  @summary   `rm -rf` for node (tracking the [rimraf library](https://github.com/isaacs/rimraf))
  @home      sjs:nodejs/rimraf
  @hostenv   nodejs
  @desc
    This module tracks the [rimraf](https://github.com/isaacs/rimraf) library by Isaac Z. Schlueter.

  @function rimraf
  @param {String} [path]
  @summary Recursively remove the given `path`
*/

var dep = require('nodejs:rimraf');
exports.rimraf = function() {
  var args = Array.prototype.slice.call(arguments);
  waitfor(var err, rv) {
    // call original (JS) function with callback
    dep.apply(null, args.concat([resume]));
  }
  if(err) throw err;
  return rv;
};

