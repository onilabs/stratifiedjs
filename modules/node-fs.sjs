/*
 * Oni Apollo 'node-fs' module
 * Stratified wrapper of nodejs filesystem functionality
 *
 * Part of the Oni Apollo Standard Module Library
 * Version: '0.13.2'
 * http://onilabs.com/apollo
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
  @module    node-fs
  @summary   Stratified wrapper of nodejs filesystem functionality. TO BE DOCUMENTED
  @hostenv   nodejs
*/

if (require('sjs:apollo-sys').hostenv != 'nodejs') 
  throw new Error('node-fs only runs in a nodejs environment');


var fs = require('fs'); // builtin fs
var events = require('./node-events');

var fs_binding = process.binding('fs');
var write = fs_binding.write;

//----------------------------------------------------------------------
// low-level:

exports.rename = function(path1, path2) {
  waitfor (var err) { fs.rename(path1, path2, resume); }
  if (err) throw err;
};

exports.truncate = function(fd, len) {
  waitfor (var err) { fs.truncate(fd, len, resume); }
  if (err) throw err;
};

exports.chmod = function(path, mode) {
  waitfor (var err) { fs.chmod(path, mode, resume); }
  if (err) throw err;
};

exports.stat = function(path) {
  waitfor (var err, stats) { fs.stat(path, resume); }
  if (err) throw err;
  return stats;
};

exports.lstat = function(path) {
  waitfor (var err, stats) { fs.lstat(path, resume); }
  if (err) throw err;
  return stats;
};

exports.fstat = function(fd) {
  waitfor (var err, stats) { fs.fstat(fd, resume); }
  if (err) throw err;
  return stats;
};

exports.link = function(srcpath, dstpath) {
  waitfor (var err) { fs.link(srcpath, dstpath, resume); }
  if (err) throw err;
};

exports.symlink = function(linkdata, path) {
  waitfor (var err) { fs.symlink(linkdata, path, resume); }
  if (err) throw err;
};

exports.readlink = function(path) {
  waitfor (var err, resolvedPath) { fs.readlink(path, resume); }
  if (err) throw err;
  return resolvedPath;
};

exports.realpath = function(path) {
  waitfor (var err, resolvedPath) { fs.realpath(path, resume); }
  if (err) throw err;
  return resolvedPath;
};

exports.unlink = function(path) {
  waitfor (var err) { fs.unlink(path, resume); }
  if (err) throw err;
};

exports.rmdir = function(path) {
  waitfor (var err) { fs.rmdir(path, resume); }
  if (err) throw err;
};

exports.mkdir = function(path, mode) {
  waitfor (var err) { fs.mkdir(path, mode, resume); }
  if (err) throw err;
};

exports.readdir = function(path) {
  waitfor (var err, files) { fs.readdir(path, resume); }
  if (err) throw err;
  return files;
};

exports.close = function(fd) {
  waitfor (var err) { fs.close(fd, resume); }
  if (err) throw err;
};

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

exports.write = function(fd, buffer, offset, length, position /*=null*/) {
  if (position === undefined) position = null;
  waitfor (var err, written) {
    write(fd, buffer, offset, length, position, resume);
  }
  if (err) throw err;
  return written;
};

exports.read = function(fd, buffer, offset, length, position /*=null*/) {
  if (position === undefined) position = null;
  waitfor (var err, bytesRead) {
    fs.read(fd, buffer, offset, length, position, resume);
  }
  if (err) throw err;
  return bytesRead;
};

exports.readFile = function(filename, /* opt */ encoding) {
  waitfor (var err, data) { fs.readFile(filename, encoding, resume); }
  if (err) throw err;
  return data;
};

exports.writeFile = function(filename, data, encoding /*='utf8'*/) {
  waitfor (var err) { fs.writeFile(filename, data, encoding, resume); }
  if (err) throw err;
};

// XXX watchFile/unwatchFile are a pretty bad interface, in the sense
// that it's not safe to watch/unwatch the same file from different
// places in the code at the same time. We work around that by doing
// our own bookkeeping on top of that in fs.js:
var watchers = {};

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

exports.isFile = function(path) {
  try {
    return exports.stat(path).isFile();
  }
  catch (e) {
    return false;
  }
};

exports.isDirectory = function(path) {
  try {
    return exports.stat(path).isDirectory();
  }
  catch (e) {
    return false;
  }
};
