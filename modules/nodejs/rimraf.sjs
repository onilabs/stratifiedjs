/*
 * StratifiedJS 'nodejs/rimraf' module
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.19.0'
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2013 Oni Labs, http://onilabs.com
 *
 *
 *   ***************************************************************
 *   *    DO NOT EDIT rimraf.sjs - IT IS A GENERATED FILE!       *
 *   *    EDIT THE SOURCE CODE UNDER stratifiedjs/src/deps AND RUN *
 *   *    stratifiedjs/src/build/make-sjs                          *
 *   ***************************************************************
 *
 *
 * This file is derived from the "rimraf" project
 * (https://github.com/isaacs/rimraf),
 * which is available under the terms of the MIT License.
 *
 * Original License Text:
 *
 * Copyright 2009, 2010, 2011 Isaac Z. Schlueter.
 * All rights reserved.
 * 
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 * 
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
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
__js {
module.exports = rimraf
rimraf.sync = rimrafSync

var assert = require("assert")
var path = require("path")
var fs = require("fs")

// for EMFILE handling
var timeout = 0
exports.EMFILE_MAX = 1000
exports.BUSYTRIES_MAX = 3

var isWindows = (process.platform === "win32")

function defaults (options) {
  var methods = [
    'unlink',
    'chmod',
    'stat',
    'rmdir',
    'readdir'
  ]
  methods.forEach(function(m) {
    options[m] = options[m] || fs[m]
    m = m + 'Sync'
    options[m] = options[m] || fs[m]
  })
}

function rimraf (p, options, cb) {
  if (typeof options === 'function') {
    cb = options
    options = {}
  }
  assert(p)
  assert(options)
  assert(typeof cb === 'function')

  defaults(options)

  if (!cb) throw new Error("No callback passed to rimraf()")

  var busyTries = 0
  rimraf_(p, options, function CB (er) {
    if (er) {
      if (isWindows && (er.code === "EBUSY" || er.code === "ENOTEMPTY") &&
          busyTries < exports.BUSYTRIES_MAX) {
        busyTries ++
        var time = busyTries * 100
        // try again, with the same exact callback as this one.
        return setTimeout(function () {
          rimraf_(p, options, CB)
        }, time)
      }

      // this one won't happen if graceful-fs is used.
      if (er.code === "EMFILE" && timeout < exports.EMFILE_MAX) {
        return setTimeout(function () {
          rimraf_(p, options, CB)
        }, timeout ++)
      }

      // already gone
      if (er.code === "ENOENT") er = null
    }

    timeout = 0
    cb(er)
  })
}

// Two possible strategies.
// 1. Assume it's a file.  unlink it, then do the dir stuff on EPERM or EISDIR
// 2. Assume it's a directory.  readdir, then do the file stuff on ENOTDIR
//
// Both result in an extra syscall when you guess wrong.  However, there
// are likely far more normal files in the world than directories.  This
// is based on the assumption that a the average number of files per
// directory is >= 1.
//
// If anyone ever complains about this, then I guess the strategy could
// be made configurable somehow.  But until then, YAGNI.
function rimraf_ (p, options, cb) {
  assert(p)
  assert(options)
  assert(typeof cb === 'function')

  options.unlink(p, function (er) {
    if (er) {
      if (er.code === "ENOENT")
        return cb(null)
      if (er.code === "EPERM")
        return (isWindows)
          ? fixWinEPERM(p, options, er, cb)
          : rmdir(p, options, er, cb)
      if (er.code === "EISDIR")
        return rmdir(p, options, er, cb)
    }
    return cb(er)
  })
}

function fixWinEPERM (p, options, er, cb) {
  assert(p)
  assert(options)
  assert(typeof cb === 'function')
  if (er)
    assert(er instanceof Error)

  options.chmod(p, 666, function (er2) {
    if (er2)
      cb(er2.code === "ENOENT" ? null : er)
    else
      options.stat(p, function(er3, stats) {
        if (er3)
          cb(er3.code === "ENOENT" ? null : er)
        else if (stats.isDirectory())
          rmdir(p, options, er, cb)
        else
          options.unlink(p, cb)
      })
  })
}

function fixWinEPERMSync (p, options, er) {
  assert(p)
  assert(options)
  if (er)
    assert(er instanceof Error)

  try {
    options.chmodSync(p, 666)
  } catch (er2) {
    if (er2.code === "ENOENT")
      return
    else
      throw er
  }

  try {
    var stats = options.statSync(p)
  } catch (er3) {
    if (er3.code === "ENOENT")
      return
    else
      throw er
  }

  if (stats.isDirectory())
    rmdirSync(p, options, er)
  else
    options.unlinkSync(p)
}

function rmdir (p, options, originalEr, cb) {
  assert(p)
  assert(options)
  if (originalEr)
    assert(originalEr instanceof Error)
  assert(typeof cb === 'function')

  // try to rmdir first, and only readdir on ENOTEMPTY or EEXIST (SunOS)
  // if we guessed wrong, and it's not a directory, then
  // raise the original error.
  options.rmdir(p, function (er) {
    if (er && (er.code === "ENOTEMPTY" || er.code === "EEXIST" || er.code === "EPERM"))
      rmkids(p, options, cb)
    else if (er && er.code === "ENOTDIR")
      cb(originalEr)
    else
      cb(er)
  })
}

function rmkids(p, options, cb) {
  assert(p)
  assert(options)
  assert(typeof cb === 'function')

  options.readdir(p, function (er, files) {
    if (er)
      return cb(er)
    var n = files.length
    if (n === 0)
      return options.rmdir(p, cb)
    var errState
    files.forEach(function (f) {
      rimraf(path.join(p, f), options, function (er) {
        if (errState)
          return
        if (er)
          return cb(errState = er)
        if (--n === 0)
          options.rmdir(p, cb)
      })
    })
  })
}

// this looks simpler, and is strictly *faster*, but will
// tie up the JavaScript thread and fail on excessively
// deep directory trees.
function rimrafSync (p, options) {
  options = options || {}
  defaults(options)

  assert(p)
  assert(options)

  try {
    options.unlinkSync(p)
  } catch (er) {
    if (er.code === "ENOENT")
      return
    if (er.code === "EPERM")
      return isWindows ? fixWinEPERMSync(p, options, er) : rmdirSync(p, options, er)
    if (er.code !== "EISDIR")
      throw er
    rmdirSync(p, options, er)
  }
}

function rmdirSync (p, options, originalEr) {
  assert(p)
  assert(options)
  if (originalEr)
    assert(originalEr instanceof Error)

  try {
    options.rmdirSync(p)
  } catch (er) {
    if (er.code === "ENOENT")
      return
    if (er.code === "ENOTDIR")
      throw originalEr
    if (er.code === "ENOTEMPTY" || er.code === "EEXIST" || er.code === "EPERM")
      rmkidsSync(p, options)
  }
}

function rmkidsSync (p, options) {
  assert(p)
  assert(options)
  options.readdirSync(p).forEach(function (f) {
    rimrafSync(path.join(p, f), options)
  })
  options.rmdirSync(p, options)
}
}

module.exports = {
	rimraf: function() {
		var args = Array.prototype.slice.call(arguments);
		waitfor(var err, rv) {
			// call original (JS) function with callback
			rimraf.apply(this, args.concat([resume]));
		}
		if(err) throw err;
		return rv;
	},
};

