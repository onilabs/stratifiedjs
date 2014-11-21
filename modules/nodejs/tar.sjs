/*
 * StratifiedJS 'nodejs/tar' module
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
  @module    nodejs/tar
  @summary   Create & extract tar archives
  @hostenv   nodejs
  @desc
    This module wraps the [tar](https://github.com/npm/node-tar) npm module.
*/

var zlib = require('nodejs:zlib');
var tar = require('nodejs:tar');
var fstream = require('nodejs:fstream');
@ = require(['../sequence', './stream', '../event']);
@fs = require('./fs');
var Readable = require('nodejs:stream').Readable;

/**
  @function gunzip
  @summary  gzip (decompress) stream transformer
  @param    {sequence::Stream} [src] compressed stream
  @return   {sequence::Stream} decompressed stream
*/
exports.gunzip = function(stream) {
  return @Stream(function(emit) {
    var gunzipStream = zlib.createGunzip();
    waitfor {
      stream .. @pump(gunzipStream) .. @end;
    } and {
      gunzipStream .. @contents .. @each(emit);
    }
  });
}

/**
  @function gzip
  @summary  gzip (compress) stream transformer
  @param    {sequence::Stream} [src] data stream
  @return   {sequence::Stream} compressed stream
*/
exports.gzip = function(stream) {
  return @Stream(function(emit) {
    var gzipStream = zlib.createGzip();
    waitfor {
      stream .. @pump(gzipStream) .. @end;
    } and {
      gzipStream .. @contents .. @each(emit);
    }
  });
}

/**
  @function pack
  @summary  create a tar stream from a location on disk
  @param    {String} [path]
  @param    {optional Object} [props] tar file properties
  @return   {sequence::Stream} stream of tar formatted chunks
*/
exports.pack = function(dir, props) {
  return @Stream(function(emit) {
    var input = fstream.Reader(dir);
    var pack = tar.Pack(props);
    pack = new Readable().wrap(pack);
    waitfor {
      // NOTE: `input` is supposedly a stream, but:
      // - it uses a custom API when you call .pipe()
      // - stream.pump doesn't work on it, for unknown reasons
      // - it doesn't catch errors, so any failure will be fatal
      //   (see https://github.com/npm/fstream/issues/31)
      input.pipe(pack);
      input .. @wait('end');
      // also, pack .. @end doesn't work, but that's OK
      // because the below branch will always wait for its completion
      pack.end();
    } and {
      pack .. @contents .. @each(emit);
    }
  });
}

/**
  @function extract
  @summary  extract a tar stream
  @param    {sequence::Stream} [pack] stream of tar format data
  @param    {Settings} [opts] stream of tar format data
  @setting  {String} [path] Destination path
  @setting  {Number} [strip] How many leading components to strip
*/
exports.extract = function(stream, opts) {
  var tarStream = tar.Extract(opts);

  // workaround for https://github.com/npm/node-tar/issues/47
  var dummyHandler = function() {
    hold(0);
    tarStream.removeListener('error', dummyHandler);
  }
  tarStream.on('error', dummyHandler);

  stream .. @pump(tarStream) .. @end();
};
