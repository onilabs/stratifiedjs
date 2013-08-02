/*
 * StratifiedJS 'compile/doc' module
 * Utility functions and constructs for concurrent stratified programming
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.14.0-1-development'
 * http://onilabs.com/stratifiedjs
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
  @module    compile/doc
  @summary   Utility for generating documentation indexes
  @home      sjs:compile/doc
  @hostenv   nodejs
*/

var fs = require('../nodejs/fs');
var Path = require('nodejs:path');
var { ownValues, ownPropertyPairs, pairsToObject, hasOwn, ownKeys, merge } = require('../object');
var str = require('../string');
var docutil = require('../docutil');
var { each, map } = require('../sequence');
var logging = require('../logging');
var array = require('../array');
var assert = require('../assert');

var INDEX_BASENAME = 'sjs-lib-index';
var INDEX_FILENAME = "#{INDEX_BASENAME}.txt";
var OUTPUT_FILENAME = "#{INDEX_BASENAME}.json";
var EXT = '.sjs';

exports.compile = function(root, outputPath) {
  var info = exports.scanDirectory(root);
  if (!info) {
    console.error("No modules found");
    process.exit(1);
  }
  if (outputPath === undefined) {
    outputPath = Path.join(root, OUTPUT_FILENAME);
  }
  fs.writeFile(outputPath, JSON.stringify(info), 'utf-8');
  logging.print("Wrote: #{outputPath}");
};


var summarizeSymbols = function(symbols) {
  ret = {};
  symbols .. ownValues .. each {|sym|
    assert.ok(sym.name);
    ret[sym.name] = {
      type: sym.type,
    };
  }
  return ret;
};

var moduleSymbols = function(module) {
  var ret = summarizeSymbols(module.symbols);

  // add classes and their symbols
  module.classes .. ownValues .. each {|cls|
    ret[cls.name] = {
      type: 'class',
      children: summarizeSymbols(cls.symbols),
    };
  }
  return ret;
};

exports.scanDirectory = function(dir) {
  logging.info("Scanning: #{dir}");
  var entries = fs.readdir(dir);
  var symbols = {};
  var dirs = [];

  if (!( entries .. array.contains(INDEX_FILENAME))) {
    logging.info("directory #{dir} has no #{INDEX_FILENAME}, skipping...");
    return null;
  }

  entries .. each {|ent|
    var path = Path.join(dir, ent);
    if (fs.stat(path).isDirectory()) {
      symbols[ent] = {
        type: "directory",
        children: exports.scanDirectory(path),
        summary: "TODO: default summary",
      };
      dirs.push(ent);
    } else {
      if (ent .. str.startsWith(INDEX_BASENAME + '.')) {
        continue;
      } else {
        var mod = exports.readModule(path);
        if (mod) {
          assert.ok(mod.name);
          symbols[mod.name] = {
            type: "module",
            children: moduleSymbols(mod),
          };
        }
      }
    }
  }

  return symbols;
};

exports.readModule = function(path) {
  logging.info("Reading: #{path}");
  if (! (path .. str.endsWith(EXT))) {
    logging.debug("Skipping non-SJS file");
    return null;
  } else {
    var name = Path.basename(path, EXT);
    var mod = docutil.parseModuleDocs(fs.readFile(path));
    mod.name = name;
    return mod;
  }
};

if (require.main === module) {
  var args = require('sjs:sys').argv();
  if (args.length == 0) {
    throw new Error("need more arguments");
  }
  if (args.length > 2) {
    throw new Error("too many arguments");
  }
  exports.compile.apply(null, args);
}
