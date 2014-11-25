/*
 * StratifiedJS 'nodejs/gzip' module
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
  @module    nodejs/gzip
  @summary   Gzip compression / decompression for SJS streams.
  @hostenv   nodejs
*/

var zlib = require('nodejs:zlib');
@ = require(['../sequence', './stream', '../event']);

/**
  @function decompress
  @summary  gunzip (decompress) stream transformer
  @param    {sequence::Stream} [src] compressed stream
  @param    {optional Settings} [opts] opts for [./stream::pump]
  @return   {sequence::Stream} decompressed stream
*/
exports.decompress = function(stream, opts) {
  return @Stream(function(emit) {
    var gunzipStream = zlib.createGunzip();
    waitfor {
      stream .. @pump(gunzipStream);
    } and {
      gunzipStream .. @contents .. @each(emit);
    }
  });
}

/**
  @function compress
  @summary  gzip (compress) stream transformer
  @param    {sequence::Stream} [src] data stream
  @param    {optional Settings} [opts] opts for [./stream::pump]
  @return   {sequence::Stream} compressed stream
*/
exports.compress = function(stream, opts) {
  return @Stream(function(emit) {
    var gzipStream = zlib.createGzip();
    waitfor {
      stream .. @pump(gzipStream);
    } and {
      gzipStream .. @contents .. @each(emit);
    }
  });
}
