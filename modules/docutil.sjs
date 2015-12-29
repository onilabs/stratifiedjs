/*
 * StratifiedJS 'docutil' module
 * Utility functions for extracting JS-style comments from source code 
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
   @module  docutil
   @summary Utility functions for extracting JS-style comments from source code.
   @home    sjs:docutil
   @desc    Work-in-progress
   @nodoc
*/

var { merge, hasOwn, ownPropertyPairs } = require('./object');
var { each } = require('./sequence');
var { unindent, startsWith } = require('./string');
var normalizeNewlines = function(str) {
  return str.toString().replace(/\r\n?/g, '\n');
}

// comment regexps for parseSource
var PAT_NBCOMMENT = "\\/\\/.*|#!.*";
var PAT_BCOMMENT =  "\\/\\*(?:.|\\n|\\r)*?\\*\\/";
var PAT_COMMENT = "(" + PAT_NBCOMMENT + "|" + PAT_BCOMMENT + ")";

// patterns that might contain something that _looks_ like a comment:
// e.g. " /* */ " <-- a string, not a comment
//      /\/* .*/  <-- a regexp, not a comment
var PAT_REGEXLIT = "\\/(?:\\\\.|\\[(?:\\\\.|[^\\n\\]])*\\]|[^\\[\\/\\n])+\\/[gimy]*";
var PAT_ML_STRLIT_SGL = "'(?:\\\\.|[^\\'\\\\])*'";
var PAT_ML_STRLIT_DBL = '"(?:\\\\.|[^\\"\\\\])*"';
var PAT_ML_STRLIT = PAT_ML_STRLIT_SGL+"|"+PAT_ML_STRLIT_DBL;
var PAT_COMMENT_SHADOW = PAT_REGEXLIT + "|" + PAT_ML_STRLIT;

// safe, non-shadowing pattern:
var PAT_SAFE = "(?:[^\'\"\\/]+|(?:\\/))";

var SOURCE_SPLITTER = new RegExp(PAT_COMMENT + "|(" + 
                                 PAT_COMMENT_SHADOW + "|" + PAT_SAFE + ")", "g");

function dummy(x) {};

function trimLeadingNewlineAndTrailingSpace(str) {
  return str.replace(/\s+$/,'').replace(/^\n+/, '');
}

/**
   @function  parseSource
   @summary   Parse SJS into comments and code
   @param     {String} [src] Source to parse.
   @param     {optional Function} [handle_comment] Function that will be
              executed for each comment encountered.
   @param     {optional Function} [handle_code] Function that will be executed 
              for each piece of code encountered between comments.
*/
var parseSource = exports.parseSource = function(src, handle_comment, handle_code) {
  src = src .. normalizeNewlines();
  handle_comment = handle_comment || dummy;
  handle_code = handle_code || dummy;
  SOURCE_SPLITTER.lastIndex = 0;
  var matches;
  while ((matches = SOURCE_SPLITTER.exec(src))) {
    // save the lastIndex, in case SOURCE_SPLITTER gets run
    // reentrantly with different source code during invocations of
    // handle_comment/handle_code.
    var lastIndex = SOURCE_SPLITTER.lastIndex;
    if (matches[1]) {
      handle_comment(matches[1]);
    }
    else {
      handle_code(matches[2]);
    }
    SOURCE_SPLITTER.lastIndex = lastIndex;
  }
};

/**
   @function parseCommentedJSON
   @summary  Like JSON.parse, but allows comments in JSON file.
   @param {String} [src] JSON string with comments allowed
   @desc
     Note: Will not work on old browsers without JSON support (IE6,7).
*/
exports.parseCommentedJSON = function(src) {
  // collect uncommented src:
  var json = "";
  parseSource(src,null,function(x) { json += x; });

  return JSON.parse(json);
};

/**
   @function extractDocComments
   @summary Extract documentation comments from SJS source.
   @param   {String} [src] SJS source string
   @return {Array}
   @desc TODO: document markup format
*/
var extractDocComments = exports.extractDocComments = function(src) {
  var comments = [];
  
  parseSource(src, function(c) {
    var matches;
    // extract only comments beginning with '/**'
    if (!(matches = /^\/\*\*((?:.|\n|\r)*)\*\/$/.exec(c))) return;
    var contents = matches[1];
    // "*/" within doc-comments is escaped as "*\/"
    contents = contents.replace(/\*\\\//g, '*/');
    comments.push(contents);
  });
    
  return comments;
};

/**
   @function extractDocFields
   @summary Extract documentation fields from documentation string array.
   @param   {Array} [docs] SJS documents strings
   @return {Array}
   @desc TODO: document markup format
*/
var fieldRE = /(?:^|\n)@([-a-zA-Z0-9]+)[\t ]*((?:.|[\n\r]+[\t ]+[^\r\n]*)*)/g;

var extractDocFields = exports.extractDocFields = function(docs) {
  var fields = [], matches, docsoff = 0;
  for (var i = 0; i<docs.length; ++i) {
    var doc = docs[i] .. trimLeadingNewlineAndTrailingSpace .. unindent;
    while ((matches = fieldRE.exec(doc))) {
      if (matches[1] == 'docson')
        --docsoff;
      else if (matches[1] == 'docsoff')
        ++docsoff;
      else if (docsoff<=0) {
        var val = unindent(trimLeadingNewlineAndTrailingSpace(matches[2]));
        if (!val.length) val = 'true';
        fields.push([matches[1], val]);
      }
    }
  }
  return fields;
};

/**
   @function parseSJSLibDocs
   @summary TODO: document me
*/
exports.parseSJSLibDocs = function(src) {
  src = src .. normalizeNewlines();
  var lib = { type: "lib", children: {} };
  var fields = extractDocFields([src]);
  var prop, value, matches;
  for (var i=0; i<fields.length; ++i) {
    [prop,value] = fields[i];
    switch (prop) {
    case "module":
      if (!(matches = /^([^ \t]+)(?:[ \t]+(.+))?[ \t]*$/.exec(value))) break;
      lib.children[matches[1]] = {type:"module", summary:matches[2]};
      break;
    case "dir":
      if (!(matches = /^([^ \t]+)(?:[ \t]+(.+))?[ \t]*$/.exec(value))) break;
      lib.children[matches[1] + '/'] = {type:"dir", summary:matches[2]};
      break;
    default:
      lib[prop] = value;
    }
  }
  return lib;
};

/**
   @function parseModuleDocs
   @summary TODO: document me
*/

// param: @param {type} [name=default] description
var paramRE = /^(?:\{([^\}]+)\})?(?:[\t ]*\[([^\]=]+)(?:\=((?:[^\[\]]|\[[^\[\]]*\])+))?\])?(?:[\t ]*\n?\r?(.(?:.|\n|\r)*))?$/;
var paramType = 1, paramName = 2, paramDefault = 3, paramDescription = 4;

var leadingVowel = /^[aeiou]/i;
var english_a = function(word) {
  if (leadingVowel.test(word)) return "an #{word}";
  return "a #{word}";
};

exports.parseModuleDocs = function(src, module) {
  var module = merge({ type: "module", children: {}, }, module);
  var curr = module; // 'curr' determines where 'param', 'return', 'setting', 'attrib' are appended to
  var fields = extractDocFields(extractDocComments(src));

  for (var i=0; i<fields.length; ++i) {
    var prop, value;
    [prop,value] = fields[i];
    switch (prop) {
    case "class":
      curr = { type: "class", children: {} };
      module.children[value] = curr;
      break;
    case "function":
    case "variable":
    case "syntax":
    case "feature":
    case "constructor":
    case "directive":
      // append to existing symbol for a dotted name
      var matches = /(.+)\.([^.]+)/.exec(value);
      // class member?
      if (matches && module.children[matches[1]] && module.children[matches[1]].children) {
        curr = module.children[matches[1]].children[matches[2]] = { type: prop };
      }
      else if (module.children[value]) {
        if (!module.children[value].children) {
          throw new Error("symbol #{value} (#{prop}) defined twice");
        }
        // add class members
        if (prop == 'function') {
          // creation function: a ctor that isn't being called with 'new'
          curr = module.children[value].children[value] = { type: "ctor",
                                                            nonew: true,
                                                            "return": {type:"return", valtype:"::"+value},
                                                            summary: "Create #{english_a(value)} object."
                                                          };
        }
        else if (prop == 'constructor') {
          // constructor
          curr = module.children[value].children[value] = { type: "ctor",
                                                            "return": {type:"return", valtype:"::"+value},
                                                            summary: "Constructor for "+english_a(value)+" object."};
        }
        else {
          // prototype
          curr = module.children[value].children[value] = { type: "proto",
                                                            summary: "Prototype for [::"+value+"] objects."};
        }
          
      }
      else {
        // top-level symbol
        curr= module.children[value] = { type: prop };
      }
      break;
    case "param":
    case "setting":
    case "attrib":
      // these get parsed & put into arrays on curr
      var matches = paramRE.exec(value);
      if (!curr[prop]) curr[prop] = [];
      curr[prop].push({
        type: prop,
        name: matches[paramName],
        valtype: matches[paramType], // value type
        defval: matches[paramDefault],
        summary: matches[paramDescription]
      });
      break;
    case "return":
      var matches = paramRE.exec(value);
      curr[prop] = {
        type: prop,
        valtype: matches[paramType],
        summary: matches[paramDescription]
      };
      break;
    case "type":
      // overwrite existing value for the toplevel module
      if (curr === module) {
        curr[prop] = value;
      } else {
        curr['valtype'] = value;
      }
      break;
    case "summary":
      curr[prop] = value;
      break;
    case "require":
    case "altsyntax":
      if (!curr[prop]) curr[prop] = [];
      curr[prop].push(value);
      break;
    default:
      // By default we set prop=val.
      // When we encounter a duplicate key, we upgrade
      // the existing property to an array and append to it.
      var old = curr[prop];
      if (!old) {
        curr[prop] = value;
      } else if (Array.isArray(old)) {
        old.push(value);
      } else {
        curr[prop] = [old, value];
      }
    }
  }
  
  return module;
};


var dashToCamel = function(s) {
  return s.replace(/-+(\w)/g, function(_, m) { return m.toUpperCase(); })
};

exports.getPrefixedProperties = function(docs, ns) {
  var root;
  var props = {};
  var prefix = ns + '-';
  docs
    .. ownPropertyPairs
    .. each {|[key, val]|
      if (key === ns) {
        root = val;
      } else if (key .. startsWith(prefix)) {
        key = key.slice(prefix.length) .. dashToCamel();
        props[key] = val;
      }
    };
  return [root, props];
}

// Coerce a value to a proper boolean
//
// Since docutil has no type information, we can't
// tell "true" apart from `true`, so we rely on
// callers to use `toBool` for properties they
// expect to be a boolean.
exports.toBool = function(b) {
  if (b === true || b === 'true') return true;
  if (b === false || b === 'false') return false;
  return undefined;
}

