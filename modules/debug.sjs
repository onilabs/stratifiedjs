/*
 * StratifiedJS 'debug' module
 * Helpers for debugging
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '1.0.0'
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2012-2016 Oni Labs, http://onilabs.com
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
   @module  debug
   @summary Helpers for debugging
   @home    sjs:debug
   @inlibrary sjs:std
   @inlibrary mho:std
*/
'use strict';

var { map, reduce, join, toArray } = require('./sequence');
var { padRight } = require('./string');
var { isSet } = require('./set');
var { isMap } = require('./map');
var { isQuasi } = require('./quasi');
var sys = require('builtin:apollo-sys');
var isDOMNode = sys.hostenv == 'xbrowser' ? require('sjs:xbrowser/dom').isDOMNode : -> false;


/**
  @function inspect
  @summary Returns a formatted version of a value. Tries to format the value
  in the best way possible given the different types.
 
  @param {Object} [obj] The object to print out.
  @param {Boolean} [showHidden] Flag that shows hidden (not enumerable)
     properties of objects.
  @param {Number} [depth] Depth in which to descend in object. Default is 2.
  @param {Boolean} [colors=false] Flag to turn on ANSI escape codes to color the
     output. Default is false (no coloring).
  @desc
     This is pretty much a straight copy of nodejs's [util.inspect](http://nodejs.org/api/util.html#util_util_inspect_object_showhidden_depth_colors) function atm.

*/
function inspect(obj, showHidden, depth, colors) {
  var ctx = {
    showHidden: showHidden,
    seen: [],
    stylize: colors ? stylizeWithColor : stylizeNoColor
  };
  return formatValue(ctx, obj, (typeof depth === 'undefined' ? 2 : depth));
}
exports.inspect = inspect;

/**
  @function prompt
  @summary Prompt the user for input
  @param {String} [message] The message to display when asking for input.
  @return {String} The user's response
  @desc
    In a browser, this delegates to the builtin `window.prompt` method.
    In nodejs, this uses the `readline` module to get user input
    from `process.stdin`.

    An error will be thrown if the user cancels the prompt or if
    process.stdin cannot be read (because it is closed or has ended).
*/
var prompt = exports.prompt = (function() {
  var fail = function() { throw new Error("stdin closed"); }
  switch (sys.hostenv) {
    case 'nodejs':
      return function(msg) {
        var stdin = process.stdin;
        if (stdin.destroyed) fail();
        var event = require('sjs:event');
        var seq   = require('sjs:sequence');
        var iface = require("nodejs:readline").createInterface(stdin, process.stdout);
        try {
          var answer = null;
          waitfor {
            waitfor (answer) {
              iface.question(msg, resume);
            }
          } or {
            // documentation claims close happens on `iface`, but
            // it seems to occur on `stdin` in pracice. So we wait for either:
            event.wait([iface, stdin], 'close');
          }
          if (answer == null) fail()
        } finally {
          iface.close();
        }
        return answer.replace(/\n$/, '');
      };
    case 'xbrowser':
      return function(msg) {
        var answer = window.prompt(msg);
        if (answer == null) {
          fail();
        }
      }
  }
})();


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
var colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
var styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = styles[styleType];

  if (style) {
    return '\u001b[' + colors[style][0] + 'm' + str +
           '\u001b[' + colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


__js function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (value && typeof value.inspect === 'function' &&
      // Filter out the debug module; its inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    return value.inspect(recurseTimes);
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var visibleKeys = Object.keys(value);
  var keys = ctx.showHidden ? Object.getOwnPropertyNames(value) : visibleKeys;

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (typeof value === 'function') {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make Sets say that they are Sets
  if (isSet(value)) {
    array = true;
    base = " [Set] ";
    //braces = ['[', ']'];
    value = value .. toArray;
    visibleKeys = Object.keys(value);
    keys = ctx.showHidden ? Object.getOwnPropertyNames(value) : visibleKeys;
  }

  // Make Maps say that they are Maps
  if (isMap(value)) {
    array = true; 
    base = " [Map] ";
    value = value .. toArray;
    visibleKeys = Object.keys(value);
    keys = ctx.showHidden ? Object.getOwnPropertyNames(value) : visibleKeys;
  }

  // Make Quasis say that they are Quasis
  if (isQuasi(value)) {
    base = " [Quasi] ";
  }

  // Make functions say that they are functions
  if (typeof value === 'function') {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys .. map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isDOMNode(value)) {
    return '[DOM: ' + (value.outerHTML || value.data) + ']';
  }
  switch (typeof value) {
    case 'undefined':
      return ctx.stylize('undefined', 'undefined');

    case 'string':
      var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                               .replace(/'/g, "\\'")
                                               .replace(/\\"/g, '"') + '\'';
      return ctx.stylize(simple, 'string');

    case 'number':
      return ctx.stylize('' + value, 'number');

    case 'boolean':
      return ctx.stylize('' + value, 'boolean');
  }
  // For some reason typeof null is "object", so special case here.
  if (value === null) {
    return ctx.stylize('null', 'null');
  }
  // XXX THIS IS A QUICK HACK TO IDENTIFY BIG NUMBERS:
  if (typeof value == 'object' && value.s !== undefined && value.e !== undefined && value.c !== undefined) {
    return ctx.stylize('@big(' + value + ')', 'number');
  }
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (Object.prototype.hasOwnProperty.call(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  for (var i=0; i<keys.length; i++) {
    var key = keys[i];
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  };
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  if (Object.getOwnPropertyDescriptor) {
    try {
      desc = Object.getOwnPropertyDescriptor(value, key);
    } catch(e) { /* IE8 only supports getOwnPropertyDescriptor on HTML elements */ }
  }
  if (!desc) {
    try {
      desc = { value: value[key] };
    } catch(e) {
      desc = { };
      str = '[Error accessing property]';
    }
  }
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (visibleKeys.indexOf(key) < 0) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (recurseTimes === null) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        str = str.split('\n')..map(function(line) {
          return '  ' + line;
        })..join('\n');
        if (array) {
          str = str.substr(2);
        } else {
          str = '\n' + str;
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (typeof name === 'undefined') {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output .. reduce(0, function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.length + 1;
  });

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}

__js {
  // NOTE: These type checking functions intentionally don't use `instanceof`
  // because it is fragile and can be easily faked with `Object.create()`.

  // XXX we should use the function in the sjs:type module here.

  function isArray(ar) {
    return Array.isArray(ar) ||
    (typeof ar === 'object' && objectToString(ar) === '[object Array]');
  }
  //exports.isArray = isArray;
  
  
  function isRegExp(re) {
    return typeof re === 'object' && objectToString(re) === '[object RegExp]';
  }
  //exports.isRegExp = isRegExp;
  
  
  function isDate(d) {
    return typeof d === 'object' && objectToString(d) === '[object Date]';
  }
  //exports.isDate = isDate;
  
  
  function isError(e) {
    return typeof e === 'object' && objectToString(e) === '[object Error]';
  }
  //exports.isError = isError;
  
  
  function objectToString(o) {
    return Object.prototype.toString.call(o);
  }
}

//----------------------------------------------------------------------
// Timing

/**
   @class Stopwatch
   @summary A timer for measuring code execution time 
   @function Stopwatch
   @param {optional String} [stopwatch_name]
   @summary Creates and starts a stopwatch
*/
__js {

  function formatStopwatchDelta(start, end) {
    var delta = end-start;
    return "#{delta/1000}s" .. padRight(8);
  }

  function Stopwatch(name) {
    if (!name) name = '';

    var start, lap;
    var rv = {
      /**
         @function Stopwatch.snapshot
         @param {optional String} [snapshot_name]
         @param {optional Boolean} [omit_total=false] 
         @return {String}
         @summary Generate a snapshot string of the form
                  'stopwatch_name/snapshot_name: delta, total', where delta is
                  the time since the last snapshot and total is the time since
                  starting of the stopwatch.
      */
      snapshot: function(sname, omitTotal) {
        if (arguments.length === 1 && typeof sname === 'boolean') {
          omitTotal = sname;
          sname='';
        }
        if (!sname) 
          sname = name;
        else if (name)
          sname = name+'/'+sname;
        if (sname.length) sname+=': ';

        var old_lap = lap;
        lap = new Date();
        return "#{sname}+#{formatStopwatchDelta(old_lap, lap)}#{omitTotal ? '' :", TOTAL:#{formatStopwatchDelta(start, lap)}"}";
      }
    }
    start = lap = new Date();
    return rv;
  }
  exports.Stopwatch = Stopwatch;
}
