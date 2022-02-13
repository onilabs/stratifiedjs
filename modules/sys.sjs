/*
 * StratifiedJS 'sys' module
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '1.0.0'
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2013-2022 Oni Labs, http://onilabs.com
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
  @module    sys
  @summary   SJS runtime utilities
  @home      sjs:sys
  @inlibrary sjs:std as sys
  @inlibrary mho:std as sys
*/
/* cannot use 'use strict'; because of withEvalContext, which needs 'eval' to add variables to enclosing scope */

// EvaluatorContext for withEvalContext:
// we use a constructor instead of function* directly so that the generated
// closure is in global scope instead of this module
__raw_until RAW_END
var GeneratorFunction = Object.getPrototypeOf(function*(){}).constructor;
var EvaluatorContext = new GeneratorFunction('__oni_eval_ctx_ctx_id', '__oni_eval_ctx_imports', "var require = __oni_rt.sys._makeRequire({id:__oni_eval_ctx_ctx_id}); var __oni_altns = {}; for (k in __oni_eval_ctx_imports) {eval('var '+k+'=__oni_eval_ctx_imports.'+k+';')} var __oni_eval_src = yield null;while (true) {var __oni_eval_val;try {__oni_eval_val = [false,eval(__oni_rt.c1.compile(__oni_eval_src[0], {filename:__oni_eval_src[1]}))];}catch (e) {__oni_eval_val = [true,e];} __oni_eval_src = yield __oni_eval_val;}");
RAW_END
var eval_context_counter = 0;

var s = require('builtin:apollo-sys');
module.exports = {

/**
  @variable hostenv
  @summary Host environment that we're running in (currently one of 'nodejs' or 'xbrowser')
*/
  hostenv: s.hostenv,

/**
   @variable VMID
   @summary Human-readable VM ID (64bit randomness), prefixed 'N' for nodejs hostenv, 'X' for xbrowser
   @desc
     * The character set used for the encoding of the random bytes is `A`-`Z`, `a`-`z`, `0`-`9`, `-`, `_`.

*/
  VMID: __oni_rt.VMID,

/**
  @function getGlobal
  @summary Returns the global object (i.e. window or global, depending on [::hostenv])
*/
  getGlobal:s.getGlobal,

/**
   @function spawn
   @summary Execute a function in the background
   @param {Function} [f]
   @desc
     Strata spawned via this global spawn function will route any exceptions to the global
     process. Unless an error handler is set, these will terminate the process in the nodejs hostenv.
*/
  spawn: s.spawn,

/**
  @function eval
  @inlibrary sjs:std
  @inlibrary mho:std
  @param {String} [code]
  @param {optional Settings} [settings]
  @setting {optional String} [filename]
  @return {Object}
  @summary Dynamically evaluate SJS code in global scope
  @desc
    Returns the last expression from `code`.

    See also [::withEvalContext].
*/
  eval: s.eval,

/**
  @function withEvalContext
  @altsyntax withEvalContext { |eval| ... }
  @altsyntax withEvalContext({name:'my sourcecode'}) { |eval| ... }
  @summary Dynamically evaluate SJS code in an empty context
  @param {optional Settings} [settings]
  @param {Function} [session_f]
  @setting {optional String} [id] Id of the context - see description below
  @setting {optional Object} [imports] Optional hash of objects that should be imported into the context.
  @desc
    Creates an empty evaluation context in global object scope and calls `session_f` with a single argument: A function `eval(src, [filename])` that compiles and executes the SJS code `src` and returns the result of evaluation.
    Note that stacktraces will mention the context's `id`. This can be overriden for the source code passed to a particular `eval` call by passing the optional `filename` argument to `eval`.

    Any variable & function declarations in `src` will be bound in the evaluation context and are only available in code executed in (possibly multiple) invocations of the `eval` function. In particular, they are neither seen in the global scope nor in the scope of `session_f`.

    ### Context Id

    The `id` setting is used in the `require` module resolution process. If `id` is not provided, or `id` is not a URL, 
    then require calls with relative URLs (such as `require('./foo')`) will be converted to absolute URLs based off
    the 'top request parent'. In the xbrowser host environment, this will be the URL of the StratifiedJS library. In 
    the nodejs host environment it will be the directory of the Conductance executable.
    
    One (maybe) unexpected effect of this behavior is that requests to 
    *relative* [sjs:#language/builtins::require.hubs] will also, by default, 
    resolve to the StratifiedJS or Conductance directory. 
    In particular, requests to nodejs modules 
    (e.g. `require('nodejs:foo')`) will be resolved in Conductance's node_modules directory and not your local
    application's directory.
    If you want these requests to resolve to your local application's directory, 
    you need to set `id` to a (file) URL located in your application's directory tree . E.g.:

        // in foo.sjs:

        @sys.withEvalContext({id: require.url('./')}) {
          |eval|
          eval("require('nodejs:some_node_module');"); // resolves to your app's node_modules
          eval("require('./bar')"); // resolves to [location of foo.sjs]/bar
        }


    ### Example

        @sys.withEvalContext {
          |eval|
          eval('var a = 1;');
          console.log :: eval('hold(1000),a'); // logs '1' after a second

          // console.log(a); // this would throw: 'a' is not defined in block's scope
        }

        console.log(a); // throws error: 'a' is not defined in this scope

*/
  withEvalContext: function(settings, block) {
    if (arguments.length === 1) {
      block = settings;
      settings = undefined;
    }
    if (!settings) settings = {};

    if (!settings.id)
      settings.id = "eval-context-#{++eval_context_counter}";

    try {
      var E = EvaluatorContext(settings.id, settings.imports || {});
      E.next();

      return block(function(src, file_name) {
        var [is_thrown, val]  = E.next([src, 
                                        "'#{(file_name||settings.id).replace(/\'/g, '\\\'')}'"]
                                      ).value;
        if (is_thrown) throw val;
        return val;
      });
    }
    finally {
      E.return();
    }
    
  },

/**
   @function isStratum
   @summary  Tests if an object is a reified [sjs:#language/builtins::Stratum]
   @param    {anything} [testObj] Object to test.
   @return   {Boolean}
*/
  isStratum: s.isReifiedStratum,

/**
   @function withDynVarContext
   @altsyntax withDynVarContext([proto_context]) { || ... }
   @summary  Execute code in a new dynamic variable context
   @param {optional Object} [proto_context] Should usually be omitted
   @param {Function} [block]
   @desc
      `withDynVarContext(block)` executes `block` with a new dynamic variable context
      in which variables can be set, cleared and retrieved 
      using [::setDynVar], [::clearDynVar] and [::getDynVar], respectively.

      In most cases, `withDynVarContext` should be called without the `proto_context` argument.
      If `proto_context` is omitted, a new nested context object will be created with its prototype 
      set to the current context. This is usually what is wanted - see the section on nested contexts below. 
      The purpose of `proto_context` is mainly as a building block for advanced control flow structures 
      (such as the Conductance bridge) in conjunction with [::getCurrentDynVarContext].

      #### Nested contexts

      Nested dynamic variable contexts behave like prototype-chained JS objects:
      [::setDynVar] and [::clearDynVar] always operate on the inner-most context only, 
      whereas [::getDynVar] retrieves values from the closest context in which the variable 
      is defined.

      ####  Spawned strata and adopted strata
      
      A stratum spawned in a given context via [sjs:sys::spawn] or [sjs:#language/builtins::Stratum::spawn] 
      maintains affinity to this context, even if the context has been exited on the original stratum:

          @sys.withDynVarContext {
            ||
            @sys.setDynVar('foo', 'bar');
            reifiedStratum.spawn(function() {
                     hold(1000);
                     @assert.is(@sys.getDynVar('foo'), 'bar'); // true
                   })();
          }
          // context exited
          // ... 1s later the assert is executed on the spawned stratum

      #### Special considerations for remote function calls
 
      Dynamic variable contexts work across remote function calls over the Conductance bridge, 
      but some limitations apply:

      - A particular dynamic variable context is specific to *one* server, and when making a call to another 
        server, will not be 'seen' there. However,
      - dynamic variable contexts *do* tunnel through the Conductance bridge, i.e. if a server S1 calls another server S2 which in turn calls back S1, then the original context will be restored on S1.
      - This context restoration only works if the original call from S1 to S2 is still active when the S2->S1 call is being made. I.e. if S2 spawns a call S2->S1, S1's context will only be restored if the original call S1->S2 hasn't returned yet.
      
      For illustration, consider two servers S1 and S2:

      - When calling S2.foo() from S1 with a dynamic variable context C1, C1 will not be seen on S2 while executing S2.foo().

      - If, in the course of executing S2.foo(), S2 calls S1.bar(), context C1 will be restored on S1 when executing S1.bar().

      - If, in the course of executing S2.foo(), S2 spawns a new stratum that calls S1.bar(), context restoration on S1 depends on whether S2.foo() is still being executed or not: If S2.foo() is still active, C1 will be restored, otherwise it will not.

*/
  withDynVarContext: s.withDynVarContext,

/**
   @function getCurrentDynVarContext
   @summary Retrieves the current dynamic variable context
   @desc
     Returns the current dynamic variable context, or
     `null` if there is no current dynamic variable context.

     Note that the context is an *opaque object*. To manipulate variables in the context, use
     [::setDynVar], [::getDynVar], etc), 

     The purpose of this function is as a building block for advanced control flow 
     structures (such as the Conductance bridge) that need to save a context for 
     later reinstatement.
*/
  getCurrentDynVarContext: s.getCurrentDynVarContext,

/**
   @function setDynVar
   @summary  Set a variable in the current dynamic variable context
   @param {String} [name]
   @param {Object} [value]
   @desc
     See [::withDynVarContext].
*/
  setDynVar: s.setDynVar,

/**
   @function clearDynVar
   @summary Clear a variable in the current dynamic variable context
   @param {String} [name]
   @desc
     See [::withDynVarContext].
*/
  clearDynVar: s.clearDynVar,

/**
   @function getDynVar
   @summary Retrieve a variable value from the current dynamic variable context
   @param {String} [name]
   @param {optional Object} [default_val]
   @desc
     Retrieves a variable value from the current dynamic variable context or the closest
     ancestor context that has the variable defined.

     If no enclosing context defines the variable, returns `default_val` or throws
     if no `default_val` has been provided.

     See also [::withDynVarContext].
*/
  getDynVar: s.getDynVar,

  
/**
  @variable version
  @summary The current SJS version string
  @desc
    The version string returned will include the text "-development" if using
    a non-released version (i.e from the git repo, or loaded from
    an unstable branch of code.onilabs.com.

    If SJS is installed by a package manager (e.g. npm),
    this will match the package version string.
*/
  // NOTE: version property is in double-quotes so
  // the buildscript treats it like JSON
  "version" : "1.0.0",
};


/**
  @variable executable
  @summary The path to the running `sjs` script.
  @hostenv nodejs
  @desc
    When combined with `process.execPath` (the path to nodejs), you
    can consistently launch a new process running the same SJS version.

    ### Example:

        var childProcess = require('sjs:nodejs/child-process');
        var sys = require('sjs:sys');
        var nodePath = process.execPath;
        var sjsPath = sys.executable;
        childProcess.run(nodePath, [sjsPath,  ... ]);
*/

/**
  @function argv
  @inlibrary sjs:std when nodejs
  @inlibrary mho:std when nodejs
  @summary Return the current command line arguments.
  @hostenv nodejs
  @desc
    **Note**: This function returns only the actual command line
    arguments passed to your script, unlike the builtin `process.argv`
    which contains:

        [
          'path/to/node',
          'path/to/main-module.sjs',
          ... // actual arguments
        ]

    This allows `sys.argv()` to be independent of a particular runtime's choice
    of `argv` format.
*/
if (s.hostenv === 'nodejs') {
  module.exports.executable = s.normalizeURL("../sjs", module.id) .. require('sjs:url').toPath();
  module.exports.argv = -> process.argv.slice(2); // remove `node` and main SJS module
}

