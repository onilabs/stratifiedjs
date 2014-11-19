/*
 * StratifiedJS 'nodejs/fs' module
 * Stratified wrapper of nodejs filesystem functionality
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.20.0-development'
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2011 Oni Labs, http://onilabs.com
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
  @summary   Stratified wrapper of [nodejs filesystem lib](http://nodejs.org/api/fs.html)
  @hostenv   nodejs
  @home      sjs:nodejs/fs
*/

if (require('builtin:apollo-sys').hostenv != 'nodejs') 
  throw new Error('The nodejs/fs module only runs in a nodejs environment');


var fs = require('fs'); // builtin fs
var evt = require('../event');
var seq = require('../sequence');
var stream = require('./stream');

//----------------------------------------------------------------------
// low-level:

/**
   @function rename
   @summary `rename(2)` system call
   @param {String} [oldpath] Old pathname.
   @param {String} [newpath] New pathname.
   @desc
     Blocks until rename has been performed. Throws if there is an error.
*/
exports.rename = function(oldpath, newpath) {
  waitfor (var err) { fs.rename(oldpath, newpath, resume); }
  if (err) throw err;
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
   @summary To be documented
*/
exports.symlink = function(linkdata, path) {
  waitfor (var err) { fs.symlink(linkdata, path, resume); }
  if (err) throw err;
};

/**
   @function readlink
   @summary To be documented
*/
exports.readlink = function(path) {
  waitfor (var err, resolvedPath) { fs.readlink(path, resume); }
  if (err) throw err;
  return resolvedPath;
};

/**
   @function realpath
   @summary To be documented
*/
exports.realpath = function(path) {
  waitfor (var err, resolvedPath) { fs.realpath(path, resume); }
  if (err) throw err;
  return resolvedPath;
};

/**
   @function unlink
   @summary To be documented
*/
exports.unlink = function(path) {
  waitfor (var err) { fs.unlink(path, resume); }
  if (err) throw err;
};

/**
   @function rmdir
   @summary To be documented
*/
exports.rmdir = function(path) {
  waitfor (var err) { fs.rmdir(path, resume); }
  if (err) throw err;
};

/**
   @function mkdir
   @summary `mkdir(2)` system call
   @param {String} [path]
   @param {optional Integer} [mode=0777]
*/
exports.mkdir = function(path, mode) {
  waitfor (var err) { fs.mkdir(path, mode===undefined ? 0777 : mode, resume); }
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
  if (err) throw err;
};

/**
   @function open
   @summary `open(2)` system call
   @param {String} [path] File path
   @param {String} [flags] Open flags ('r', 'r+', 'w', 'w+', 'a', or 'a+')
   @param {optional Integer} [mode=0666] Open mode
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
   @summary Write a buffer to the given file
   @param {Integer} [fd] File descriptor
   @param {Buffer}  [buffer] [Nodejs Buffer](http://nodejs.org/docs/latest/api/buffer.html) from which data will be written
   @param {Integer} [offset] Offset into buffer from where data will be read
   @param {Integer} [length] Number of bytes to write
   @param {optional Integer} [position=null] Where to begin writing to the file (`null` = write to current position)
*/
exports.write = function(fd, buffer, offset, length, position /*=null*/) {
  if (!Buffer.isBuffer(buffer))
    throw new Error("buffer required");

  if (position === undefined) position = null;

  waitfor (var err, written) {
    fs.write(fd, buffer, offset, length, position, resume);
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
   @return {Buffer|String}
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
   @param {String|Buffer|sequence::Stream|Array} [data]
   @param {optional String} [encoding='utf8']
   @desc
     If `data` is an Array or [sequence::Stream], its chunks will
     be written in sequence.

     The `encoding` parameter is ignored if `data` is a
     [Buffer](http://nodejs.org/docs/latest/api/buffer.html)
     (or a sequence of buffers).
*/
exports.writeFile = function(filename, data, encoding /*='utf8'*/) {
  // we can't use isSequence, as that would catch strings / buffers too
  if(Array.isArray(data) || seq.isStream(data)) {
    exports.withWriteStream(filename, {encoding: encoding}) {|f|
      data .. stream.pump(f);
    }
  } else {
    // write one big string / data chunk
    waitfor (var err) { fs.writeFile(filename, data, encoding, resume); }
    if (err) throw err;
  }
};

// XXX watchFile/unwatchFile are a pretty bad interface, in the sense
// that it's not safe to watch/unwatch the same file from different
// places in the code at the same time. We work around that by doing
// our own bookkeeping on top of that in fs.js:
var watchers = {};

/**
   @function waitforChange
   @summary To be documented
*/
exports.waitforChange = function(filename, interval /*=0*/) {
  waitfor (var curr, prev) {
    if (!watchers[filename])
      watchers[filename] = 1;
    else
      ++watchers[filename];
    fs.watchFile(filename,
                 { persistent:true, interval:interval||0},
                 resume);
  }
  finally {
    if (--watchers[filename] <= 0) {
      delete watchers[filename];
      fs.unwatchFile(filename);
    }
  }
  
  return { curr: curr, prev: prev }; 
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
   @param {Settings} [opts]
   @setting {String} [flags="w"]
   @setting {String} [encoding=null]
   @setting {Number} [mode=0666]
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
            lines .. each {|line|
              file .. stream.write(file, line + "\n");
            }
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
   @setting {Number} [mode=0666]
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

