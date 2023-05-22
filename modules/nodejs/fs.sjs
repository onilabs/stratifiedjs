/*
 * StratifiedJS 'nodejs/fs' module
 * Stratified wrapper of nodejs filesystem functionality
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '1.0.0'
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2011-2016 Oni Labs, http://onilabs.com
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
  @module    nodejs/fs
  @summary   Stratified wrapper of [nodejs filesystem lib](http://nodejs.org/api/fs.html) and higher level file utilities
  @hostenv   nodejs
  @home      sjs:nodejs/fs
  @inlibrary sjs:std  as fs when nodejs
  @inlibrary mho:std  as fs when nodejs
  @desc
    Note that some of the functions in this module assume that we're being run on a linux-compatible system, with common system utilities (mv, etc) installed.
*/
'use strict';

if (require('builtin:apollo-sys').hostenv != 'nodejs') 
  throw new Error('The nodejs/fs module only runs in a nodejs environment');

@ = require([
  '../object',
  {id: './child-process', name: 'childProcess'}
]);

var fs = require('fs'); // builtin fs
var evt = require('../event');
var seq = require('../sequence');
var stream = require('./stream');
var { isString } = require('../string');
var { isBytes, toBuffer } = require('../bytes');

//----------------------------------------------------------------------
// low-level:

/**
   @function rename
   @summary Rename a file
   @param {String} [oldpath] Old pathname.
   @param {String} [newpath] New pathname.
   @param {Object} [settings]
   @setting {String} [method='mv'] 'mv': spawn a `mv` subprocess; 'rename': use `rename(2)` system call
   @desc
     Blocks until rename has been performed. Throws if there is an error.
     Note that the default method (spawning a `mv` subprocess works across filesystems, where `rename(2)` will fail).
*/
exports.rename = function(oldpath, newpath, options) {
  options = {
    method: 'mv'
  } .. @override(options);

  if (options.method === 'rename') {
    waitfor (var err) { fs.rename(oldpath, newpath, resume); }
    if (err) throw err;
  }
  else if (options.method === 'mv') {
    @childProcess.run('mv', ['-T', oldpath, newpath]);
  }
  else
    throw new Error("Unknown method '#{options.method}' in @fs.rename");
};

/**
   @function truncate
   @summary `ftruncate(2)` system call
   @param [fd] File descriptor.
   @param {Integer} [len] Length.
   @desc
     Blocks until truncate has been performed. Throws if there is an error.
*/
exports.truncate = function(fd, len) {
  waitfor (var err) { fs.truncate(fd, len, resume); }
  if (err) throw err;
};

/**
   @function chmod
   @summary `chmod(2)` system call
   @param {String} [path] Pathname.
   @param {Integer} [mode] Mode.
   @desc
     Blocks until chmod has been performed. Throws if there is an error.
*/
exports.chmod = function(path, mode) {
  waitfor (var err) { fs.chmod(path, mode, resume); }
  if (err) throw err;
};

/**
   @function chown
   @summary `chown(2)` system call
   @param {String} [path] Pathname.
   @param {Integer} [uid]
   @param {Integer} [gid]
   @desc
     Blocks until chown has been performed. Throws if there is an error.
*/
exports.chown = function(path, uid, gid) {
  waitfor (var err) { fs.chown(path, uid, gid, resume); }
  if (err) throw err;
};

/**
   @function stat
   @summary `stat(2)` system call
   @param {String} [path] Pathname.
   @return {Object}
   @desc
     Throws if there is an error.
     
     The returned
     [`fs.Stats`](http://nodejs.org/api/fs.html#fs_class_fs_stats)
     object looks like this:

         { dev: 2049,
           ino: 305352,
           mode: 16877,
           nlink: 12,
           uid: 1000,
           gid: 1000,
           rdev: 0,
           size: 4096,
           blksize: 4096,
           blocks: 8,
           atime: '2009-06-29T11:11:55Z',
           mtime: '2009-06-29T11:11:40Z',
           ctime: '2009-06-29T11:11:40Z' }

*/
exports.stat = function(path) {
  waitfor (var err, stats) { fs.stat(path, resume); }
  if (err) throw err;
  return stats;
};

/**
   @function utimes
   @summary `utimes(2)` system call
   @param {String} [path] Pathname.
   @param {Number} [atime]
   @param {Number} [mtime]
*/
exports.utimes = function(path, atime, mtime) {
  waitfor (var err) { fs.utimes(path, atime, mtime, resume); }
  if (err) throw err;
};

/**
   @function futimes
   @summary `futimes(2)` system call
   @param {Number} [fd] File Descriptor.
   @param {Number} [atime]
   @param {Number} [mtime]
*/
exports.futimes = function(fd, atime, mtime) {
  waitfor (var err) { fs.futimes(fd, atime, mtime, resume); }
  if (err) throw err;
};

/**
   @function lstat
   @summary `lstat(2)` system call
   @param {String} [path] Pathname.
   @return {Object}
   @desc
     Like [::stat] but doesn't follow symbolic links (i.e. it stats
     the link itself, rather than the file it points to.)
*/
exports.lstat = function(path) {
  waitfor (var err, stats) { fs.lstat(path, resume); }
  if (err) throw err;
  return stats;
};

/**
   @function fstat
   @summary `fstat(2)` system call
   @param [fd] File descriptor.
   @return {Object}
   @desc
     Like [::stat] but the file to be `stat`ed is specified by file descriptor.
*/
exports.fstat = function(fd) {
  waitfor (var err, stats) { fs.fstat(fd, resume); }
  if (err) throw err;
  return stats;
};

/**
   @function link
   @summary `link(2)` system call
   @param {String} [srcpath] Source pathname.
   @param {String} [dstpath] Destination pathname.
   @desc
     Blocks until chmod has been performed. Throws if there is an error.

*/
exports.link = function(srcpath, dstpath) {
  waitfor (var err) { fs.link(srcpath, dstpath, resume); }
  if (err) throw err;
};

/**
   @function symlink
   @summary `symlink(2)` system call
   @param {String} [target] 
   @param {String} [path]
   @desc
     Creates a symbolic link at `path` pointing to `target`.
*/
exports.symlink = function(target, path) {
  waitfor (var err) { fs.symlink(target, path, resume); }
  if (err) throw err;
};

/**
   @function readlink
   @summary `readlink(2)` system call
   @param {String} [path]
   @desc
     Reads the value of the symbolic link at `path`
*/
exports.readlink = function(path) {
  waitfor (var err, resolvedPath) { fs.readlink(path, resume); }
  if (err) throw err;
  return resolvedPath;
};

/**
   @function realpath
   @summary `realpath(2)` system call
   @param {String} [path]
   @desc
     Expand all symbolic links, resolve relative path components and superfluous '/' characters.
     May use `process.cwd` to resolve relative paths.
*/
exports.realpath = function(path) {
  waitfor (var err, resolvedPath) { fs.realpath(path, resume); }
  if (err) throw err;
  return resolvedPath;
};

/**
   @function unlink
   @summary `unlink(2)` system call
   @param {String} [path]
   @desc
     Deletes the name `path` from the filesystem and possibly the file it refers to.
*/
exports.unlink = function(path) {
  waitfor (var err) { fs.unlink(path, resume); }
  if (err) throw err;
};

/**
   @function rmdir
   @summary `rmdir(2)` system call
   @param {String} [path]
   @desc
     Deletes a directory, which must be empty.
*/
exports.rmdir = function(path) {
  waitfor (var err) { fs.rmdir(path, resume); }
  if (err) throw err;
};

/**
   @function mkdir
   @summary `mkdir(2)` system call
   @param {String} [path]
   @param {optional Integer} [mode=0o777]
*/
exports.mkdir = function(path, mode) {
  waitfor (var err) { fs.mkdir(path, mode===undefined ? 0o777 : mode, resume); }
  if (err) throw err;
};

/**
   @function readdir
   @summary `readdir(3)` system call. Reads the contents of a directory.
   @param {String} [path]
   @return {Array} Array of names of the files in the directory excluding `'.'` and `'..'`.
*/
exports.readdir = function(path) {
  waitfor (var err, files) { fs.readdir(path, resume); }
  if (err) throw err;
  return files;
};

/**
   @function close
   @summary `close(2)` system call
   @param {Integer} [fd] File descriptor
*/
exports.close = function(fd) {
  waitfor (var err) { fs.close(fd, resume); }
  // XXX sometimes node closes the file, but still returns an error "OK, closed"
  // see also https://www.bountysource.com/issues/104833-fs-close-passes-ok-error-message-to-callback
  if (err && !/^OK/.test(err.message)) throw err;
};

/**
   @function open
   @summary `open(2)` system call
   @param {String} [path] File path
   @param {String} [flags] Open flags ('r', 'r+', 'w', 'w+', 'a', or 'a+')
   @param {optional Integer} [mode=0o666] Open mode
   @return {Integer} File descriptor
*/
exports.open = function(path, flags, mode) {
  var retracted = false;
  waitfor (var err, fd) {
    fs.open(path, flags, mode,
            function(_err, _fd) {
              if (!retracted)
                resume(_err, _fd);
              else
                fs.close(_fd);
            });
  }
  retract {
    retracted = true;
  }
  if (err) throw err;
  return fd;
};

/**
   @function write
   @summary Write to the given file
   @param {Integer} [fd] File descriptor
   @param {bytes::Bytes}  [data] 
   @param {Integer} [offset] Byte offset into `data` from which to start writing
   @param {Integer} [length] Number of bytes to write
   @param {optional Integer} [position=null] Where to begin writing to the file (`null` = write to current position)
*/
exports.write = function(fd, buffer, offset, length, position /*=null*/) {
  if (!isBytes(buffer))
    throw new Error("binary data required");

  buffer = buffer .. toBuffer();

  if (position === undefined) position = null;

  waitfor (var err, written) {
    fs.write(fd, buffer, offset, length, position, resume);
  }
  if (err) throw err;
  return written;
};

/**
   @function writev
   @summary Write multiple buffers to the given file
   @param {Integer} [fd] File descriptor
   @param {Array of bytes::Bytes}  [data] 
   @param {optional Integer} [position=null] Where to begin writing to the file (`null` = write to current position)
*/
exports.writev = function(fd, buffers, position /*=null*/) {
  if (position === undefined) position = null;

  waitfor (var err, written) {
    fs.writev(fd, buffers, position, resume);
  }
  if (err) throw err;
  return written;
};


/**
   @function read
   @summary Read data from the given file descriptor
   @param {Integer} [fd] File descriptor
   @param {Buffer}  [buffer] [Nodejs Buffer](http://nodejs.org/docs/latest/api/buffer.html) that the data will be written to
   @param {Integer} [offset] Offset within the buffer where writing will start.
   @param {Integer} [length] Number of bytes to read
   @param {optional Integer} [position=null] Where to begin reading from in the file (`null` = read from current position)
   @desc
     Example:

         var fs     = require('sjs:nodejs/fs');
         var buffer = require('nodejs:buffer');

         // read 128 bytes from /dev/random:
         var f = fs.open('/dev/random', 'r');
         var buf = new (buffer.Buffer)(128);
         fs.read(f, buf, 0, 128);
         fs.close(f);
         console.log(buf.toString('hex'));

*/
exports.read = function(fd, buffer, offset, length, position /*=null*/) {
  if (position === undefined) position = null;
  waitfor (var err, bytesRead) {
    fs.read(fd, buffer, offset, length, position, resume);
  }
  if (err) throw err;
  return bytesRead;
};

/**
   @function readFile
   @summary Reads the entire contents of a file
   @param {String} [filename]
   @param {optional String} [encoding]
   @return {Buffer|String}
   @desc
     - If no encoding is specified, then the raw buffer is returned.
*/
exports.readFile = function(filename, /* opt */ encoding) {
  waitfor (var err, data) { fs.readFile(filename, encoding, resume); }
  if (err) throw err;
  return data;
};

/**
   @function fileContents
   @summary Return a [sequence::Stream] of the chunks in `filename`.
   @param {String} [filename]
   @param {optional String} [encoding]
   @return {sequence::Stream} Stream of [Nodejs buffers](http://nodejs.org/docs/latest/api/buffer.html) or strings
   @desc
     - If no encoding is specified, then raw data chunks will be emitted.
*/
exports.fileContents = function(path, encoding) {
  return seq.Stream(function(emit) {
    exports.withReadStream(path, {encoding: encoding},
      s -> s .. stream.contents .. seq.each(emit))
  });
};

/**
   @function writeFile
   @summary Write data to a file, replacing the file if it already exists
   @param {String} [filename]
   @param {String|bytes::Bytes|sequence::Stream|Array} [data]
   @param {optional String} [encoding='utf8']
   @desc
     If `data` is an Array or [sequence::Stream], its chunks will
     be written in sequence.

     The `encoding` parameter is only used when passing one or more
     strings as the `data` argument.
*/
exports.writeFile = function(filename, data, encoding /*='utf8'*/) {
  if(isString(data) || isBytes(data)) {
    // write file in one go if it's a single chunk
    if(!isString(data)) data = data .. toBuffer();
    waitfor (var err) { fs.writeFile(filename, data, encoding, resume); }
    if (err) throw err;
  } else {
    // Otherwise, stream it to the file
    exports.withWriteStream(filename, {encoding: encoding}) {|f|
      data .. stream.pump(f);
    }
  }
};

//----------------------------------------------------------------------
// high-level

/**
   @function exists
   @summary Check if the given path exists
   @param  {String} [path]
   @return {Boolean}
*/
exports.exists = function(path) {
  try {
    exports.stat(path);
    return true;
  }
  catch (e) {
    return false;
  }
};


/**
   @function isFile
   @summary Check if the given path is a file
   @param {String} [path]
   @return {Boolean}
*/
exports.isFile = function(path) {
  try {
    return exports.stat(path).isFile();
  }
  catch (e) {
    return false;
  }
};

/**
   @function isDirectory
   @summary Check if the given path is a directory
   @param {String} [path]
   @return {Boolean}
*/
exports.isDirectory = function(path) {
  try {
    return exports.stat(path).isDirectory();
  }
  catch (e) {
    return false;
  }
};


// withWriteStream and withReadStream pretty much do the same
// thing - the only difference is the constructor / destroy function.
function streamContext(ctor, dtor) {
  return function(path, opts, block) {
    if (arguments.length === 2) {
      block = opts;
      opts = {};
    }
    var f = fs[ctor](path, opts);
    waitfor {
      throw(f .. evt.wait('error'));
    } or {
      f .. evt.wait('open');
      waitfor {
        f .. evt.wait('close');
      } and {
        try {
          block(f);
        } finally {
          f[dtor]();
        }
      }
    }
  }
};
/**
   @function withWriteStream
   @summary Perform an action with a nodejs [WritableStream](http://nodejs.org/api/stream.html#stream_class_stream_writable) connected to a file
   @param {String} [path]
   @param {optional Settings} [opts]
   @param {Function} [block]
   @setting {String} [flags="w"]
   @setting {String} [encoding=null]
   @setting {Number} [mode=0o666]
   @desc
     This function calls the nodejs [fs.createWriteStream][]
     with the provided `path` and `opts`.

     Once obtaining a [WritableStream][] object, this function waits for its `open`
     event and then calls `block` with the stream as the first argument.

     When `block` completes, this function calls `stream.end()` and waits for the
     `finish` event on the stream before finally returning.
     
     [WritableStream]: http://nodejs.org/api/stream.html#stream_class_stream_writable
     [fs.createWriteStream]: http://nodejs.org/api/fs.html#fs_fs_createwritestream_path_options

     ### Example:

         var lines = ["hello", "world!"];
         fs.withWriteStream("/path/to/file") { |file|
            lines .. intersperse("\n") .. stream.pump(file);
         }
*/

exports.withWriteStream = streamContext('createWriteStream', 'end');
/**
   @function withReadStream
   @summary Perform an action with a nodejs [ReadableStream](http://nodejs.org/api/stream.html#stream_class_stream_writable) connected to a file
   @param {String} [path]
   @param {Settings} [opts]
   @param {Function} [block]
   @setting {String} [flags="w"]
   @setting {String} [encoding=null]
   @setting {Number} [mode=0o666]
   @desc
     This function calls nodejs' [fs.createReadStream][]
     with the provided `path` and `opts`.

     Once obtaining a [ReadableStream][] object, this function waits for its `open`
     event and then calls `block` with the stream as the first argument.

     When `block` completes, this function calls `stream.destroy()` and waits for the
     `end` event on the stream before finally returning.
     
     [ReadableStream]: http://nodejs.org/api/stream.html#stream_class_stream_readable
     [fs.createReadStream]: http://nodejs.org/api/fs.html#fs_fs_createreadstream_path_options

     ### Example:

         fs.withReadStream("/path/to/file") { |file|
           file .. stream.pump(process.stdout);
         }
*/
exports.withReadStream = streamContext('createReadStream', 'destroy');

/**
  @function createReadStream
  @param {String} [path]
  @param {Settings} [opts]
  @summary Wrapper for [nodejs:fs.createReadStream](http://nodejs.org/api/fs.html#fs_fs_createreadstream_path_options)
  @desc
    **Note**: In most cases, it's easier and less error-prone to use [::withReadStream]
*/
exports.createReadStream = fs.createReadStream;

/**
  @function createWriteStream
  @param {String} [path]
  @param {Settings} [opts]
  @summary Wrapper for [nodejs:fs.createWriteStream](http://nodejs.org/api/fs.html#fs_fs_createwritestream_path_options)
  @desc
    **Note**: In most cases, it's easier and less error-prone to use [::withWriteStream]
*/
exports.createWriteStream = fs.createWriteStream;

/**
   @function watch
   @summary Return an [event::EventStream] of changes (`[eventType, filename]`) on the given file or directory, where `eventType` is either `'rename'` or `'change'`, and `filename` is the name of the file which triggered the event
   @param {String} [path]
   @desc
     * This function uses [nodejs:fs.watch](https://nodejs.org/api/fs.html#fs_fs_watch_filename_options_listener) under the hood. All the caveats found there apply.

     * Because of limited OS support, the `recursive` option of nodejs:fs.watch is not supported.
     
*/
exports.watch = function(path) {
  return seq.Stream(function(r) {
    var watcher = fs.watch(path);
    waitfor {
      var error = watcher .. evt.wait('error');
      throw error;
    }
    or {
      watcher .. evt.events('change') .. seq.each(r);
    }
    finally {
      watcher.close();
    }
  });
};
