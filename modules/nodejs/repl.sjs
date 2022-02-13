/*
 * StratifiedJS 'nodejs/repl' module
 * Read-eval-print loop
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
  @module  nodejs/repl
  @summary Stratified read-eval-print loop
  @home    sjs:nodejs/repl
  @hostenv nodejs
*/
'use strict';

var sys = require('builtin:apollo-sys');
if (sys.hostenv != 'nodejs') 
  throw new Error('The nodejs/repl module only runs in a nodejs environment');

var event = require('../event');
var seq   = require('../sequence');
var debug = require('../debug');
var Url = require('../url');

var disableColors = true;
if (process.platform != 'win32') {
  disableColors = process.env.NODE_DISABLE_COLORS ? true : false;
}

//----------------------------------------------------------------------
// main repl entry point

// one global repl interface
var itf;

/**
   @function runREPL
   @summary Runs a global stdin/stdout read-eval-print-loop.
   @desc
     Note: This function is used internally by the `sjs` and `conductance shell`
     commandlines. To provide REPL functionality in your own application,
     take a look at [sjs:sys::withEvalContext] instead.
*/
exports.runREPL = function() {
  if (itf) throw new Error("REPL already running");

  // XXX repl will be operating on global scope; place a cwd-relative
  // `require` function there:
  var cwdModule = {
    id: Url.fileURL(process.cwd() + '/'),
  };
  sys.getGlobal().require = __oni_rt.sys._makeRequire(cwdModule);

  // patch up module.id to point to the current directory, so that 
  // relative requires work as expected:
  module.id = cwdModule.id;

  // and our alternative identifier namespace:
  if (sys.getGlobal().__oni_altns === undefined)
    sys.getGlobal().__oni_altns = {};

  var stdin = process.openStdin();

  try {
    itf = require('readline').createInterface(stdin, process.stdout);
    event.events(itf, 'SIGINT') .. seq.tailbuffer(3) .. seq.consume {
      |waitfor_interrupt|
      event.events(itf, 'line') .. seq.tailbuffer(10) .. seq.consume {
        |get_line|
        while (1) {
          switchPrompt('input');
          itf.prompt();
          waitfor {
            var cl = get_line();
          }
          or {
            waitfor_interrupt();
            write("<^C again to quit>");
            itf.prompt();
            waitfor_interrupt();
            return;
          }
          switchPrompt('busy');
          evalCommandLine(cl, waitfor_interrupt);
        }
      }
    }
  }
  finally {
    abortBgStrata();
    write("");
    if(itf.close) {
      itf.close(); 
      stdin.destroy();
    }
    else itf.pause();
  }
};

function evalCommandLine(cl, waitfor_interrupt) {

  var stratum = sys.spawn(function(S) { 
    try {
      S.rv = require('builtin:apollo-sys').eval(cl, {filename:'repl'});
    }
    catch(e) {
      S.rv = e;
      S.isException = true;
    }
  });

  waitfor {
    stratum.wait();
    if (stratum.isException) writeErr(stratum.rv);
    else writeVal(stratum.rv);
  }
  or {
    // when the user enters CTRL-C, we push into background:
    waitfor_interrupt();
    trackInBackground(stratum);
  }
}

//----------------------------------------------------------------------
// prompt

var promptType;
var inputPrompt = 'sjs> ';

function switchPrompt(type) {
  if (type == promptType) return;
  promptType = type;
  switch (promptType) {
  case "input":
    itf.setPrompt(inputPrompt);
    break;
  case "busy":
    itf.setPrompt("");
    break;
  default:
    throw "unknown prompt";
  }
}

function updatePrompts() {
  // we show the numbe of background strata in our input prompt:
  inputPrompt = 'sjs'+(bgStrata.length ? '['+bgStrata.length+']> ' : '> ');

  // if we currently show the input prompt, update it:
  if (promptType == 'input') {
    itf.setPrompt(inputPrompt);
    itf._refreshLine();
  }
}

function setInputPrompt() {

}

//----------------------------------------------------------------------
// background strata

// array of background strata
var bgStrata = [];

function trackInBackground(s) {
  s.id = bgStrata.length ? bgStrata[bgStrata.length-1].id+1 : 1;
  s.handler = sys.spawn(-> bgStratumHandler(s));
  bgStrata.push(s);
  write('<pushed to background>', s.id);
  updatePrompts();
}

// handler for background strata; displays result, clears from array
function bgStratumHandler(s) {
  s.wait();
  if (s.isException) writeErr(s.rv, s.id);
  else writeVal(s.rv);

  bgStrata.splice(bgStrata.indexOf(s), 1);
  updatePrompts();
}

function abortBgStrata() {
  var strata = bgStrata.slice(0);
  for (var i=0; i<strata.length; ++i)
    strata[i].abort().wait();
}

//----------------------------------------------------------------------
// output

function write(str, id) {
  process.stdout.cursorTo(0);
  process.stdout.clearLine(1);
  if (id) process.stdout.write('['+id+'] ');
  process.stdout.write(str+'\n');
}

function writeErr(e, id) {
  write(String(e), id);
}

function writeVal(val, id) {
  if (val === undefined) return;
  write(debug.inspect(val, false, 2, itf.enabled && !disableColors), id);
}

if (require.main === module) {
  exports.runREPL();
}
