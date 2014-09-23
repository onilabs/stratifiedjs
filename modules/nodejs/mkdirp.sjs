/*
 * StratifiedJS 'nodejs/mkdirp' module
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.19.0'
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2013 Oni Labs, http://onilabs.com
 *
 *
 *   ***************************************************************
 *   *    DO NOT EDIT nodejs/mkdirp.sjs - IT IS A GENERATED FILE!       *
 *   *    EDIT THE SOURCE CODE UNDER stratifiedjs/src/deps AND RUN *
 *   *    stratifiedjs/src/build/make-sjs                          *
 *   ***************************************************************
 *
 *
 * This file is derived from the "mkdirp" project
 * (https://github.com/substack/node-mkdirp),
 * which is available under the terms of the MIT/X11 License.
 *
 * Original License Text:
 *
 * Copyright 2010 James Halliday (mail@substack.net)
 * 
 * This project is free software released under the MIT/X11 license:
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
 */

/**
  @module    mkdirp
  @summary   Recursively make directories (tracking the [mkdirp library](https://github.com/substack/node-mkdirp))
  @home      sjs:nodejs/mkdirp
  @hostenv   nodejs

  @function mkdirp
  @param {String} [path]
  @summary Ensure `path` (and any parent directories) exist
  @desc
    If `path` already exists and is a directory, `mkdirp` returns successfully.
*/
__js {
var path = require('path');
var fs = require('fs');

module.exports = mkdirP.mkdirp = mkdirP.mkdirP = mkdirP;

function mkdirP (p, opts, f, made) {
    if (typeof opts === 'function') {
        f = opts;
        opts = {};
    }
    else if (!opts || typeof opts !== 'object') {
        opts = { mode: opts };
    }
    
    var mode = opts.mode;
    var xfs = opts.fs || fs;
    
    if (mode === undefined) {
        mode = 0777 & (~process.umask());
    }
    if (!made) made = null;
    
    var cb = f || function () {};
    p = path.resolve(p);
    
    xfs.mkdir(p, mode, function (er) {
        if (!er) {
            made = made || p;
            return cb(null, made);
        }
        switch (er.code) {
            case 'ENOENT':
                mkdirP(path.dirname(p), opts, function (er, made) {
                    if (er) cb(er, made);
                    else mkdirP(p, opts, cb, made);
                });
                break;

            // In the case of any other error, just see if there's a dir
            // there already.  If so, then hooray!  If not, then something
            // is borked.
            default:
                xfs.stat(p, function (er2, stat) {
                    // if the stat fails, then that's super weird.
                    // let the original error be the failure reason.
                    if (er2 || !stat.isDirectory()) cb(er, made)
                    else cb(null, made);
                });
                break;
        }
    });
}

mkdirP.sync = function sync (p, opts, made) {
    if (!opts || typeof opts !== 'object') {
        opts = { mode: opts };
    }
    
    var mode = opts.mode;
    var xfs = opts.fs || fs;
    
    if (mode === undefined) {
        mode = 0777 & (~process.umask());
    }
    if (!made) made = null;

    p = path.resolve(p);

    try {
        xfs.mkdirSync(p, mode);
        made = made || p;
    }
    catch (err0) {
        switch (err0.code) {
            case 'ENOENT' :
                made = sync(path.dirname(p), opts, made);
                sync(p, opts, made);
                break;

            // In the case of any other error, just see if there's a dir
            // there already.  If so, then hooray!  If not, then something
            // is borked.
            default:
                var stat;
                try {
                    stat = xfs.statSync(p);
                }
                catch (err1) {
                    throw err0;
                }
                if (!stat.isDirectory()) throw err0;
                break;
        }
    }

    return made;
};
}

module.exports = {
	mkdirp: function() {
		var args = Array.prototype.slice.call(arguments);
		waitfor(var err, rv) {
			// call original (JS) function with callback
			mkdirP.apply(this, args.concat([resume]));
		}
		if(err) throw err;
		return rv;
	},
};

