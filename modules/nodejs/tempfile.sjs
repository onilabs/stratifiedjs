/*
 * StratifiedJS 'nodejs/tempfile' module
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
  @module    nodejs/tempfile
  @summary   Temporary file / directory creation
  @home      sjs:nodejs/tempfile
  @hostenv   nodejs
  @desc
    The functionality in this module is similar to that of the
    [python tempfile module](https://docs.python.org/3/library/tempfile.html).

    Specifically, none of the functions in this module are
    subject to race conditions during tempfile creation (which
    could be a security vulnerability).

    By default, all files and directories are created readable,
    writable and executable (for directories) _only_ by the current user.
*/

@ = require(['../function', '../object', '../sequence']);
@fs = require('./fs');
@path = require('nodejs:path');
@os = require('nodejs:os');
@crypto = require('nodejs:crypto');

var mk = function(opts, constructor) {
  // keeps trying `constructor` on newly-generated random
  // filenames, until EEXIST is not raised.
  var dir = @fs.realpath(opts.base || exports.tmp());
  var prefix = opts.prefix || "tmp-";
  var suffix = opts.suffix || "";
  while(true) {
    var rand = @crypto.randomBytes(4).toString('hex');
    var path = @path.join(dir, "#{prefix}#{rand}#{suffix}");
    //console.log("Trying: #{path}");
    try {
      var rv = constructor(path);
    } catch(e) {
      // if file exists, just try again
      if (e.code == 'EEXIST') {
        continue;
      }
      throw e;
    }
    return [path, rv];
    break;
  }
};

exports.tmp = function() {
  return @os.tmpDir ? @os.tmpDir() : (
    process.env.TMPDIR ||
    process.env.TMP ||
    process.env.TEMP ||
    '/tmp');
};

/**
  @class File
  @summary A temporary file
  @function File.close
  @summary close the underlying file, as well as any related streams created by [::File::readStream] or [::File::writeStream].
  @desc
    This does not delete the file.

  @function File.readStream
  @param {Settings} [opts] settings (as for [./fs::createReadStream])
  @summary create a readable nodejs Stream for this file

  @function File.writeStream
  @param {Settings} [opts] settings (as for [./fs::createWriteStream])
  @summary create a writable nodejs Stream for this file

  @variable File.file
  @type Number
  @summary The underlying file descriptor

  @variable File.path
  @type String
  @summary The full path to the file

  @function TemporaryFile
  @param {optional Settings} [opts]
  @param {optional Function} [block]
  @setting {Number} [mode=0600] file creation mode
  @setting {Boolean} [delete=true] delete file on block completion
  @setting {String} [prefix="tmp-"] filename prefix
  @setting {String} [suffix=""] filename suffix
  @setting {String} [base=os.tmpDir()] basedir in which to create temporary files
  @summary Create a temporary file
  @return {::File}
  @desc
    The file will be opened to be both readable and writable.

    If `block` is given, it will be called with the [::File] (which
    is also returned). Once `block` has finished, the file will be closed
    and deleted (if `delete` is `true`).
    
    **Note:** If you use [::File::readStream] or [::File::writeStream], there will be
    multiple open file descriptors pointing to the same file. The
    [::File::close] method will close all such streams (as well as the actual file),
    so you should use this instead of just claling [./fs::close].
*/
exports.TemporaryFile = function(opts, block) {
  if (arguments.length == 1 && @isFunction(opts)) {
    block = opts;
    opts = {};
  } else if (!opts) opts = {};
  var mode = opts.mode || 0600;
  var del = opts['delete'] !== false;
  var flags = 'wx+';

  var [ path, fd ] = mk(opts, path -> @fs.open(path, flags, mode));
  var closed = false;

  var streams = [];
  var rv =  {
    file: fd,
    path: path,
    readStream: function(opts) {
      var rv = @fs.createReadStream(path, opts);
      streams.push(rv);
      return rv;
    },
    writeStream: function(opts) {
      var rv = @fs.createWriteStream(path, opts);
      streams.push(rv);
      return rv;
    },
    close: function () {
      if (!closed) {
        @fs.close(fd);
        closed = true;
      }
      streams .. @each.par(s -> s.destroy());
    },
  };

  if (block) {
    try {
      block(rv);
      return rv;
    } finally {
      rv.close();
      if(del) {
        try {
          @fs.unlink(path);
        } catch(e) {
          if (e.code !== 'ENOENT') {
            throw e;
          }
        }
      }
    }
  } else {
    return rv;
  }
}

/**
  @function TemporaryDir
  @param {optional Settings} [opts]
  @param {optional Function} [block]
  @setting {Number} [mode=0700] directory creation mode
  @setting {Boolean} [delete=true] recursively delete dir on block completion
  @setting {String} [prefix="tmp-"] directory prefix
  @setting {String} [suffix=""] directory suffix
  @setting {String} [base=os.tmpDir()] basedir in which to create temporary directories
  @summary Create a temporary directory
  @return {String} directory path
  @desc
    If `block` is given, it will be called with the full path to the created directory (which
    is also returned). Once `block` has finished, the directory will be recursively removed
    (using [./rimraf::rimraf]) if `delete` is `true`.
*/
exports.TemporaryDir = function(opts, block) {
  if (arguments.length == 1 && @isFunction(opts)) {
    block = opts;
    opts = {};
  } else if (!opts) opts = {};
  var del = opts['delete'] !== false;
  var mode = opts.mode || 0700;
  var [ path ] = mk(opts, path -> @fs.mkdir(path, mode));
  if (block) {
    try {
      block(path);
      return path;
    } finally {
      if(del) {
        require('./rimraf').rimraf(path);
      }
    }
  } else {
    return path;
  }
}
