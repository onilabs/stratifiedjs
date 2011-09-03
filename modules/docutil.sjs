/*
 * Oni Apollo 'docutil' module
 * Utility functions for extracting JS-style comments from source code 
 *
 * Part of the Oni Apollo Standard Module Library
 * Version: 'unstable'
 * http://onilabs.com/apollo
 *
 * (c) 2010-2011 Oni Labs, http://onilabs.com
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
   @module    docutil
   @summary   Utility functions for extracting JS-style comments from source code.
   @limitations Will not work on old browsers without JSON support (IE6,7).
*/

// comment regexps for parseSource
var PAT_NBCOMMENT = "\\/\\/.*|#!.*";
var PAT_BCOMMENT =  "\\/\\*(?:.|\\n|\\r)*?\\*\\/";
var PAT_COMMENT = "(" + PAT_NBCOMMENT + "|" + PAT_BCOMMENT + ")";

// patterns that might contain something that _looks_ like a comment:
// e.g. " /* */ " <-- a string, not a comment
//      /\/* .*/  <-- a regexp, not a comment
var PAT_REGEXLIT = "\\/(?:\\\\.|\\[(?:\\\\.|[^\\n\\]])*\\]|[^\\/\\n])+\\/[gimy]*";
var PAT_ML_STRLIT_SGL = "'(?:\\\\.|[^\\'])*'";
var PAT_ML_STRLIT_DBL = '"(?:\\\\.|[^\\"])*"';
var PAT_ML_STRLIT = PAT_ML_STRLIT_SGL+"|"+PAT_ML_STRLIT_DBL;
var PAT_COMMENT_SHADOW = PAT_REGEXLIT + "|" + PAT_ML_STRLIT;

// safe, non-shadowing pattern:
var PAT_SAFE = "[^\'\"^\\/]+|(?:\\/[^\/*])";

var SOURCE_SPLITTER = new RegExp(PAT_COMMENT + "|(" + 
                                 PAT_COMMENT_SHADOW + "|" + PAT_SAFE + ")", "g");

function dummy(x) {};

/**
   @function  parseSource
   @summary   Parse SJS into a comments and code
   @param     {String} [src] Source to parse.
   @param     {optional Function} [handle_comment] Function that will be executed for each 
              comment encountered.
   @param     {optional Function} [handle_code] Function that will be executed for each piece
              of code encountered between comments.
       
*/
var parseSource = exports.parseSource = function(src, handle_comment, handle_code) {
  handle_comment = handle_comment || dummy;
  handle_code = handle_code || dummy;

  var matches;
  while ((matches = SOURCE_SPLITTER.exec(src))) {
    // save the lastIndex, in case SOURCE_SPLITTER gets run
    // reentrantly with different source code during invocations of
    // handle_comment/handle_code.
    var lastIndex = SOURCE_SPLITTER.lastIndex;
    if (matches[1])
      handle_comment(matches[1]);
    else
      handle_code(matches[2]);
    SOURCE_SPLITTER.lastIndex = lastIndex;
  }
};

/**
   @function parseCommentedJSON
   @summary  Like JSON.parse, but allows comments in JSON file.
   @param {String} [src] JSON string with comments allowed
*/
exports.parseCommentedJSON = function(src) {
  // collect uncommented src:
  var json = "";
  parseSource(src,null,function(x) { json += x; });
  return JSON.parse(json);
};
