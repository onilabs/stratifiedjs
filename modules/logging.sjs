/*
 * StratifiedJS 'logging' module
 * Logging utilities
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.20.0-development'
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2010-2013 Oni Labs, http://onilabs.com
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
  @module    logging
  @summary   Simple cross-environment logging framework
  @home      sjs:logging
  @desc
    This module exposes a simple logging API, and is useable
    across environments.
    
    Logging events will be sent to the global `console`
    object, when defined. If your browser has no native
    `console` object, no logging will occur. In that case,
    you can either use a tool like Firebug Lite
    (http://getfirebug.com/firebuglite) to emulate a console,
    or create an sjs console using the [xbrowser/console::]
    module.

    Note that where possible, an appropriate `console` method
    will be used. e.g if you use logging.error() and your
    console has an `error` method, it will be used. This can
    be useful for browsers that distinguish errors by color,
    for example. If no specific `error` method is available,
    `log` will be used instead.
*/

var { merge, hasOwn } = require('./object');
var { supplant, isString } = require('./string');
var quasi = require('./quasi');
var sys = require('builtin:apollo-sys');
var debug = require('./debug');

/**
  @variable DEBUG
  @summary debug log level constant
*/
exports.DEBUG = 50;
/**
  @variable VERBOSE
  @summary verbose log level constant
*/
exports.VERBOSE = 40;
/**
  @variable INFO
  @summary info log level constant
*/
exports.INFO = 30;
/**
  @variable WARN
  @summary warning log level constant
*/
exports.WARN = 20;
/**
  @variable ERROR
  @summary error log level constant
*/
exports.ERROR = 10;
/**
  @variable OFF
  @summary constant used to disable all logging (except `print`)
*/
exports.OFF = 0;

//XXX should we document this? it's a pretty uncommon case that people need to add
// their own levels
exports.levelNames = {};
var levels = ['DEBUG', 'VERBOSE', 'INFO', 'WARN', 'ERROR'];
for (var i=0; i<levels.length; i++) {
  var name = levels[i];
  exports.levelNames[exports[name]] = name;
};

var currentLevel = exports.INFO;
var currentFormatter = (rec) -> [rec.level + ":"].concat(rec.args);

/**
  @function getLevel
  @summary Get the current logging level
  @return {Integer} [level] the currently active log level
*/
exports.getLevel = function() { return currentLevel; }

exports.getFormatter = function() { return currentFormatter; }

/**
  @function setLevel
  @param {Integer} [level] the desired log level (typically one of DEBUG, VERBOSE, INFO, etc).
  @summary Set the current logging level
  @desc
    This is a global setting, so it will affect all `logging`
    performed throughout the current stratifiedjs runtime.
*/
exports.setLevel = function(lvl) {
  if(lvl === undefined) {
    throw new Error("Invalid level: " + lvl);
  }
  currentLevel = lvl;
};

/**
  @function setFormatter
  @param {Function} [newFormat] the new formater.
  @summary Set the output format of log messages
  @desc
    A formatter function receives a single argument, `logRecord`.
    It must return an array. This array will be passes as individual
    arguments to the underlying console logging function.

    The fields of the logRecord are:

     * `level`: the level name of the call
     * `args`: the arguments passed to the log call (an Array)

    You should not perform expansion of non-string objects
    (e.g using JSON.stringify) unless you have a good reason to - many
    host `console` objects will show non-string arguments as an interactive
    widget, which is more useful to the user than a plain JSON dump.

    The default formatter is:
    
        function(record) {
          return [record.level + ":"].concat(record.args);
        }

    This has the effect of turning a call like `logging.info("test!")`
    into the output:

        INFO: test!

    You might want to add the date to the end of each call. You could do
    that using:

        logging.setFormatter(function(record) {
          return [new Date().toLocaleTimeString(), record.level + ':'].concat(record.args);
        });
        
*/
exports.setFormatter = function(fmt) {
  if (!fmt instanceof Function) throw new Error("formatter must be a function");
  // TODO: is this check too extreme? It could have side-effects
  if (!Array.isArray(fmt({args: ['test'], level:'DEBUG'}))) throw new Error("Inavlid formatter (must return an array)");
  currentFormatter = fmt;
};

/**
  @function isEnabled
  @summary  Test whether a message at the given level would be logged based on the current log level.
  @return   {Boolean} [enabled]
*/
exports.isEnabled = function(lvl) { return currentLevel >= lvl; };

// string arguments are not inspected (for easy concatentation of messages); everything else is.
var inspect = function(v) {
   if (isString(v)) return v;
   return debug.inspect(v);
}

exports.formatMessage = function(lvl, args) {
  args = Array.prototype.slice.call(args);
  for (var i=0; i<args.length; i++) {
    var message = args[i];
    if (quasi.isQuasi(message)) {
      args[i] = quasi.mapQuasi(message, inspect).join("");
    }
  }

  var fields = {
    level: exports.levelNames[lvl],
    args: args
  };
  var rv = currentFormatter(fields);
  return rv;
};

exports.log = function(lvl, args, preferred_console_method) {
  if (!lvl instanceof Number) throw new Error("Not a valid log level: #{lvl}");
  if(!exports.isEnabled(lvl)) return;
  args = exports.formatMessage(lvl, args);
  getPrinter(preferred_console_method).apply(null, args);
};

var printfn = function(lvl, preferred_console_method) {
  return function() {
    return exports.log(lvl, arguments, preferred_console_method);
  }
};

/**
  @function print
  @summary  Print the given message to the console (if defined), regardless
            of the current log level.
  @desc
    Does not format or process its arguments in any way, unlike other `log` methods.
  @param    {Object ...} [message]
*/
exports.print = function() { getPrinter('log').apply(null, arguments); };

/**
  @function debug
  @summary  Print the given message to the console when the current log level is DEBUG or higher
  @param    {Object ...} [message] The objects to log
  @desc
    Typically `message` will be a string, but any objects are allowed. The appearance
    of non-string objects will be up to the underlying `console` method. For example, most browsers
    will render an interactive widget for Objects.

    If any argument is a [quasi::Quasi] quote, all interpolated objects (except for those that
    are already strings) will be passed through [debug::inspect]. e.g:

        var name = "Bob"
        var props = {
          age: 29,
          likes: "Ice cream"
        };
        logging.info(`Hello, ${name} - what nice properties you have: ${props}`);
        
        // prints:
        // INFO: Hello Bob, what nice properties you have: { age: 29, likes: 'Ice cream' }
*/
exports.debug = printfn(exports.DEBUG, 'debug');

/**
  @function verbose
  @summary  Print the given message to the console when the current log level is VERBOSE or higher.
            See [::debug] for more details.
  @param    {Object ...} [message]
*/
exports.verbose = printfn(exports.VERBOSE, 'debug');

/**
  @function info
  @summary  Print the given message to the console when the current log level is INFO or higher.
            See [::debug] for more details.
  @param    {Object ...} [message]
*/
exports.info = printfn(exports.INFO,'info');

/**
  @function warn
  @summary  Print the given message to the console when the current log level is WARN or higher.
            See [::debug] for more details.
  @param    {Object ...} [message]
*/
exports.warn = printfn(exports.WARN,'warn');
/**
  @function error
  @summary  Print the given message to the console when the current log level is ERROR or higher.
            See [::debug] for more details.
  @param    {Object ...} [message]
*/
exports.error = printfn(exports.ERROR,'error');


/**
  @function logContext
  @summary  A content manager to temporarily modify the logging configuration.
  @desc
    Once the context has ended, all settings will be reverted to the values
    they had when `logContext()` was invoked.

    Note that this function affects global settings, so any other strata currently
    running will use these settings until the context ends.

    Example usage:

        using(logging.logContext({level:logging.WARN}) {
          // some code that logs too much at INFO level
        }
  @param    {Object} [settings] Settings for the context. Valid keys are `level`, `console`, and `formatter`.
*/
exports.logContext = function(settings) {
  var oldLevel = currentLevel;
  var oldFormatter = currentFormatter;
  var oldConsole = consoleOverride;
  if (settings.level != undefined) exports.setLevel(settings.level);
  if (settings.formatter != undefined) exports.setFormatter(settings.formatter);
  if (settings.console != undefined) exports.setConsole(settings.console);

  var ret = {
    __finally__: function() {
      if (settings.level != undefined) exports.setLevel(oldLevel);
      if (settings.formatter != undefined) exports.setFormatter(oldFormatter);
      if (settings.console != undefined) exports.setConsole(oldConsole);
    }
  };
  return ret;
}

/**
  @function setConsole
  @param    {optional Object} [console] the new `console` object
  @summary  Override the `console` object that this module will print to
  @desc
    This method is used by the [xbrowser/console::] module to redirect logging
    to any console created with `receivelog = true`.

    If `console` is null or not provided, the global `console` object will
    be used instead.
*/
exports.setConsole = function(console) {
  consoleOverride = console;
  // clear printer cache so that getPrinter() will use the new console
  printerCache = {};
};

// -------------------------------------------------------------
// helpers to construct & cache printer objects for each
// possible preferred_console_method
var printerCache = {};
var consoleOverride = null;

var getPrinter = function(preferred_console_method) {
  // only generate the printer once per preferred_console_method,
  // and cache it for further use
  if (!printerCache[preferred_console_method]) {
    printerCache[preferred_console_method] = makePrinter(preferred_console_method);
  }
  return printerCache[preferred_console_method];
};

/**
  @function getConsole
  @return   {Object}
  @summary  Returns the current console object in use by this module.
  @desc
    The returned object will be either the global `console` object,
    or the most recent value given to [::setConsole].
*/
var getConsole = exports.getConsole = function() {
  if(consoleOverride) {
    return consoleOverride;
  }
  return defaultConsole();
};

var bind = function(fn, ctx) {
  if (!fn.apply) {
    // Probably IE's crippled console object.
    return function() {
      return Function.prototype.apply.call(fn, ctx, arguments);
    }
  }
  return Function.prototype.bind.call(fn, ctx);
  
}

var makePrinter = function(preferred_console_method) {
  // find a print function for the preferred_console_method,
  // falling back to whatever we can get
  var c = getConsole();
  if(c) {
    if(c[preferred_console_method]) {
      return bind(c[preferred_console_method], c);
    }
    if(c.log) {
      return bind(c.log, c);
    }
  }
  return function() {};
};

var defaultConsole = -> sys.getGlobal().console;
if (__oni_rt.hostenv == 'nodejs') {
  // On nodejs, the default console prints to both stdout & stderr depending on the level.
  // We want all `logging` to go to stderr, so we make a fake console that always calls
  // console.warn or console.error
  defaultConsole = -> {
    log: console.warn,
    warn: console.warn,
    error: console.error,
  };
}
