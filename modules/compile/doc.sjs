/*
 * StratifiedJS 'compile/doc' module
 * Utility functions and constructs for concurrent stratified programming
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.20.0-development'
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
  @executable
  @summary   Utility for generating documentation indexes
  @home      sjs:compile/doc
  @hostenv   nodejs
*/

var fs = require('../nodejs/fs');
var Path = require('nodejs:path');
var { ownValues, ownPropertyPairs, pairsToObject, hasOwn, ownKeys, merge } = require('../object');
var str = require('../string');
var docutil = require('../docutil');
var { each, map, transform, hasElem, sortBy, sort } = require('../sequence');
var logging = require('../logging');
var array = require('../array');
var assert = require('../assert');

var INDEX_BASENAME = 'sjs-lib-index';
var INDEX_FILENAME = "#{INDEX_BASENAME}.txt";
var OUTPUT_FILENAME = "#{INDEX_BASENAME}.json";
var EXTS = {'sjs':true, 'api':true, 'app':true};

exports.compile = function(root, outputPath) {
  var info = exports.summarizeLib(root);
  if (!info) {
    console.error("No modules found");
    process.exit(1);
  }
  if (outputPath === undefined) {
    outputPath = Path.join(root, OUTPUT_FILENAME);
  }
  fs.writeFile(outputPath, JSON.stringify(info, null, '  '), 'utf-8');
  logging.print("Wrote: #{outputPath}");
};


var summarizeSymbols = function(children) {
  return children
    .. ownPropertyPairs
    .. transform(function([name, sym]) {
        var obj = {type: sym.type};
        if (sym.children) {
          obj.children = summarizeSymbols(sym.children);
        }
        return [name, obj];
    }) .. sortBy([k,v] -> k) .. pairsToObject();
};

var summarizeModule = function(module) {
  return {
    type: 'module',
    children: module.noindex ? {} : summarizeSymbols(module.children),
    summary: module.summary,
  };
};

exports.summarizeLib = function(dir) {
  logging.debug("Scanning: #{dir}");
  var entries = fs.readdir(dir) .. sort;
  var children = {};

  if (!( entries .. hasElem(INDEX_FILENAME))) {
    logging.info("SKIP: #{dir}");
    return null;
  }

  var dirInfo = readDirectory(dir);
  if (dirInfo.nodoc) {
    logging.info("SKIP: #{dir}");
    return null;
  }

  entries .. each {|ent|
    var path = Path.join(dir, ent);
    if (fs.stat(path).isDirectory()) {
      var lib = exports.summarizeLib(path);
      if (lib) {
        children[ent + '/'] = lib;
      }
    } else {
      if (ent .. str.startsWith(INDEX_BASENAME + '.')) {
        continue;
      } else {
        var mod = exports.readModule(path);
        if (mod) {
          var [name, mod] = mod;
          children[name] = summarizeModule(mod);
        }
      }
    }
  }

  var rv = {
    type: "lib",
    children: children,
  };

  ['summary', 'version'] .. each {|key|
    if (dirInfo .. hasOwn(key)) rv[key] = dirInfo[key];
  };

  return rv;
};

exports.readModule = function(path) {
  var ext = Path.extname(path).slice(1);
  if (!EXTS[ext]) {
    logging.debug("Skipping non-doc file #{path} (#{ext})");
    return null;
  }

  logging.debug("Reading: #{path}");
  var name = Path.basename(path);
  if (ext == 'sjs') 
    name = name.slice(0, -(ext.length+1));
  try {
    var mod = docutil.parseModuleDocs(fs.readFile(path, 'utf-8'));
  } catch(e) {
    e.message = "Failed to process module #{path}: #{e.message}";
    throw e;
  }
  if (mod.nodoc) {
    logging.debug('@nodoc found, omitting...');
    return null;
  }
  return [name, mod];
};

var readDirectory = function(path) {
  path = Path.join(path, INDEX_FILENAME);
  logging.debug("Reading: #{path}");
  return docutil.parseSJSLibDocs(fs.readFile(path, 'utf-8'));
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
