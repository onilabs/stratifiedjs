/*
 * Oni Apollo 'nodejs/url' module
 * Utilities for converting between file:// URLs and filesystem paths
 *
 * Part of the Oni Apollo Standard Module Library
 * Version: 'unstable'
 * http://onilabs.com/apollo
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
  @module    nodejs/url
  @summary   Utilities for converting between file:// URLs and filesystem paths
  @hostenv   nodejs
  @home      sjs:nodejs/url
*/

var str = require('../string');
var sys = require('builtin:apollo-sys');
var pathMod = require('nodejs:path');

var PREFIX = 'file://';

/**
   @function toPath
   @summary Convert URL -> path
   @param {String} [url] file:// URL
   @return {String} The filesystem path.
   @desc
     The returned path will be absolute or relative,
     depending on the input path. An erorr will be thrown
     if `url` is not a file:// URL.
*/
exports.toPath = function(url) {
  var parsed = sys.parseURL(url)
  if (parsed.protocol.toLowerCase() != 'file') {
    throw new Error("Not a file:// URL: #{url}");
  }
  var path = decodeURIComponent(parsed.path);
  if (parsed.host) {
    // mis-parse of relative file:// URI
    return pathMod.join(decodeURIComponent(parsed.host), path);
  }
  return path;
}

/**
   @function fromPath
   @summary Convert path -> URL
   @param {String} [path] The input path (absolute or relative)
   @return {String} An absolute file:// URL
*/
exports.fromPath = function(path) {
  return PREFIX + encodeURIComponent(pathMod.resolve(path)).replace(/%2[fF]/g, '/');
}
