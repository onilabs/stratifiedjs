/*
 * StratifiedJS 'nodejs/mkdirp' module
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '1.0.0'
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2014-2016 Oni Labs, http://onilabs.com
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

//----------------------------------------------------------------------
// XXX backfill as 'await' in the VM
function AWAIT(val) {
  if (val instanceof Promise) {
    waitfor(var rv, except) {
      val.then(x->resume(x, false), x->resume(x,true));
    }
    if (except) throw rv;
    return rv;
  }
  return val;
}



/**
  @module    mkdirp
  @summary   Recursively make directories (tracking the [mkdirp library](https://github.com/substack/node-mkdirp))
  @home      sjs:nodejs/mkdirp
  @hostenv   nodejs
*/
'use strict';

/**
  @function mkdirp
  @param {String} [path]
  @summary Ensure `path` (and any parent directories) exist
  @desc
    If `path` already exists and is a directory, `mkdirp` returns successfully.
*/
var dep = require('nodejs:mkdirp');
exports.mkdirp = function(...args) {
  return AWAIT:: dep.apply(null,args);
}
