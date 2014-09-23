/*
 * StratifiedJS 'test/reporter' module
 * Reporter objects for outputting test suite results
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
   @module  test/reporter
   @summary Reporter objects for outputting test suite results
   @home    sjs:test/reporter
*/

// TODO: (tjc) document

var sys = require('builtin:apollo-sys');
var seq = require('../sequence');
var { map, transform, join, each, reverse, skip, filter, toArray } = seq;
var logging = require('../logging');
var debug = require('../debug');
var object = require('../object');
var func = require('../function');
var string = require('../string');
var {padLeft} = string;
var shell_quote = require('../shell-quote');
var diff;
try {
  diff = require('./diff');
} catch(e) { }

var dom;
var SJS_ROOT_URI = require.url('sjs:');

var UsageError = exports.UsageError = function(m) {
  this.message = m;
}
UsageError.prototype = new Error();


var ConsoleBuffer = exports.ConsoleBuffer = function() {
  this.reset();
}
ConsoleBuffer.prototype.reset = function() {
  this.messages = [];
}

ConsoleBuffer.prototype.drain = function() {
  this.messages .. each(m -> console.log(m));
  this.reset();
}

var consoleInspect = function(s) {
  if (string.isString(s)) return s;
  if (s instanceof Error) return String(s);
  return debug.inspect(s);
}

var formatLogArgs = exports._formatLogArgs = function(args) {
  if (args.length == 0 ) return '';
  return args .. map(consoleInspect) .. join(" ");
}

ConsoleBuffer.prototype.log = function(m) {
  var msg = formatLogArgs(arguments);
  msg.split("\n") .. each {|line|
    this.messages.push(line);
  }
}

var fnseq = function() {
  // like function.seq, but ignoring null / undefined values
  var fns = arguments .. filter(x -> x != null) .. toArray;
  if (fns.length == 1) return fns[0]; // no need to invoke `seq` in this case
  return func.seq.apply(null, fns);
}

var repeatStr = function(str, levels) {
  return new Array(levels+1).join(str);
}
  
var ReporterMixins = {
  init: function(opts) {
    this.opts = opts;
    if (opts.logCapture) {
      this.logCapture = new ConsoleBuffer();
    }
    this.failures = [];
  },

  listTest: function(test) {
    console.log(test.fullDescription());
  },

  formatSkip: function(reason) {
    var msg = "SKIP";
    if (reason) msg = "#{msg} (#{reason})"
    return msg;
  },

  suiteBegin: function(results) {
    if (this.logCapture) {
      this.originalConsole = logging.getConsole();
      logging.setConsole(this.logCapture);
    }
  },

  suiteEnd: function(results) {
    if (this.logCapture) {
      logging.setConsole(this.originalConsole);
      this.logCapture.drain();
    }
  },

  mixInto: function (cls) {
    this .. object.ownKeys .. each { |k|
      if (k == 'mixInto') continue;
      cls.prototype[k] = fnseq(this[k], cls.prototype[k]);
    }
  },
}

var LogReporterMixins = {
  init: function(opts) {
    this.activeContexts = [];
    this.printedContexts = [];
    
    this.quiet = !opts.showAll;

    this.indent = '  ';
    this.updateIndent(0);
  },

  loading: function(module) {
    if (this.opts.listOnly) return;
    this.print(this.color({attribute: 'dim'}, " [ loading #{module} ]"));
  },

  suiteBegin: function(results) {
    this.updateIndent(0);
  },

  suiteEnd: function(results) {
    this.updateIndent(0);
    this.print();
    var ok = results.ok();
    this.print(this.color({attribute: 'dim'}, '--------------------------------------------------------'));
    if (!ok) {
      this.print(this.color({attribute: 'dim'}, '# Failed tests:'));
      this.failures .. each {|result| this.linkToTest(result.test.fullDescription(), false) };
      this.print();
    }
    this.report(results);

    if (!ok) {
      this.print(this.color('red', 'FAILED'));
      throw new Error();
    }
  },

  contextBegin: function(context, force) {
    if (this.quiet && !force) {
      this.activeContexts.push(context);
      return;
    }

    if (this.indentLevels == 0) {
      this.print();
    }
    var skipping = context.shouldSkip();
    this.print(this.color({attribute: 'bright'}, "#{this.prefix}- #{context.description}: "), !skipping);
    if (skipping) this.printSkip(context.skipReason);
    this.updateIndent(this.indentLevels + 1);
  },

  contextEnd: function(context, force) {
    if (this.quiet && !force) {
      this.activeContexts.pop();
      return;
    }
    this.updateIndent(this.indentLevels - 1);
  },

  testBegin: function(result, force) {
    if (this.logCapture && !force) this.logCapture.reset();
    if (this.quiet && !force) return;
    this.print(this.prefix + result.test.description + ' ... ', false);
  },

  testEnd: function(result) {
    if (this.quiet && !(result.ok)) {
      // need to print any missing context:
      this.printPendingContexts();
      this.testBegin(result, true);
    }

    if (result.skipped) {
      if (!this.quiet) this.printSkip(result.reason);
    } else if (result.ok) {
      if (!this.quiet) this.print(this.color('green', "OK"));
    } else {
      this.failures.push(result);
      this.print(this.color('red', "FAILED"), false);
      this.linkToTest(result.test.fullDescription(), true);
      this.printError(result.error);
      this.printCapturedLogging();
    }

    if (this.logCapture) this.logCapture.reset();
  },

  printSkip: function(reason) {
    this.print(this.color('blue', this.formatSkip(reason)));
  },

  printDiff: function(err) {
    if (!diff) return;
    if (!this.opts.diff) return;
    var {actual, expected} = err;
    var inspected = false;
    try {
      var aString = string.isString(err.actual);
      var eString = string.isString(err.expected);
      if (aString != eString) {
        // incomparable types
        return;
      }

      if (!aString) {
        actual = JSON.stringify(actual, null, 2);
        expected = JSON.stringify(expected, null, 2);
        inspected = true;
      }
    } catch(e) {
      // not JSON serializable
      return;
    }
    if (actual == expected) {
      // no visible difference
      return;
    }

    var addedColor = {background: 'red'};
    var removedColor = {background: 'green'};
    var lineno = 1;
    var diffs = diff.diffWords(expected, actual);

    // if there are no non-whitespace diffs, add markers and perform character-wise diff
    var hasVisibleChars = (d) -> /[^\n]/.test(d.value);
    var isChange = (d) -> (d.added || d.removed);
    if (!seq.any(diffs, d -> isChange(d) && hasVisibleChars(d))) {
      var showNewlines = x -> x.replace(/\n/g, '<nl>\n');
      diffs = diff.diffChars(showNewlines(expected) , showNewlines(actual));
    }
    
    // exclude noisy diffs:
    var common = diffs .. filter(d -> !(d.added || d.removed)) .. toArray();
    if (
      // no common parts
      common.length == 0
      ||
      // small number of tiny common parts:
      (common.length < 4 && !(common .. seq.any(d -> d.value.length > 3)))
    ) {
      return;
    }

    var pieces = seq.Stream {|emit|
      diffs .. seq.indexed .. each {|[diffIdx, str]|
        var col = 'normal';
        if (str.added) col = addedColor;
        else if (str.removed) col = removedColor;
        str.value.split('\n') .. each {|line|
          emit([lineno++, this.color(col, line)]);
        }
        lineno--; // last list elem didn't actually end with a newline
      }
    } .. toArray();

    var snd = x -> x[1];
    var lines = pieces
      .. seq.groupBy([lineno, _] -> lineno)
      .. map([lineno, chunks] -> [lineno, chunks .. map(snd)]);
    if (lines.length > 4) {
      var gutterWidth = String(lines.length).length;
      lines = lines .. transform(function([lineno, line]) {
        var gutter = this.color({attribute:'dim'}, padLeft(lineno, gutterWidth) + ' | ');
        return [lineno, [gutter].concat(line)];
      }.bind(this));
    }

    this.print();
    this.print(this.color('cyan', this.prefix + "[diff: "), false);
    this.print(this.color(addedColor, "actual"), false);
    this.print(' ',false);
    this.print(this.color(removedColor, "expected"), false);
    this.print(this.color('cyan', "]\n"));

    lines .. each {|[lineno, chunks]|
      this.print(this.prefix,false);
      chunks .. each(c => this.print(c, false));
      this.print();
    }
    this.print();
  },

  printError: function(err) {
    if (err.actual !== undefined && err.expected !== undefined) {
      this.printDiff(err);
    }
    String(err).split("\n") .. each {|line|
      var col = {foreground: 'yellow', attribute: 'bright'};
      if (line.trim() .. string.startsWith("at module " + SJS_ROOT_URI)) {
        // internal module, make it dimmer
        delete col.attribute;
      }
      line = this.prefix + "| " + line;
      this.print(this.color(col, line));
    }
  },

  printCapturedLogging: function() {
    if (!this.logCapture || this.logCapture.messages.length == 0) return;
    this.print(this.prefix, false);
    this.print(this.color('yellow', '-- Captured logging ---'));
    this.logCapture.messages .. each {|m|
      this.print(this.prefix, false);
      this.print(this.color('yellow', m));
    }
  },

  printPendingContexts: function() {
    var printedContexts = this.printedContexts;
    var pending = this.activeContexts;

    // skip already-printed contexts
    printedContexts .. reverse .. each {|ctx|
      var idx = this.activeContexts.indexOf(ctx);
      if (idx != -1) {
        pending = this.activeContexts.slice(idx+1);
        break;
      }
    }

    this.updateIndent(this.activeContexts.length - pending.length);
    pending .. each {|ctx|
      this.contextBegin(ctx, true);
    }

    // update printed state
    this.printedContexts = this.activeContexts.slice();
  },

  updateIndent: function(levels) {
    this.indentLevels = levels;
    this.prefix = repeatStr(this.indent, this.indentLevels);
  },

  mixInto: function (cls) {
    this .. object.ownKeys .. each { |k|
      if (k == 'mixInto') continue;
      cls.prototype[k] = fnseq(this[k], cls.prototype[k]);
    }
    ReporterMixins.mixInto(cls);
  },
};


var HtmlOutput = exports.HtmlOutput = function() {
  this.prepareStyles();
  this.output = document.createElement('div');
  this.output.setAttribute('id', HtmlOutput.elementId);
  document.body.appendChild(this.output);
}
HtmlOutput.instance = null;
HtmlOutput.elementId = 'console-output';

// Static init method, sets global `console` variable
HtmlOutput.init = function() {
  if (!document.getElementById(this.elementId)) {
    var instance = this.instance = new this();
    // TODO: should we make this configurable?
    sys.getGlobal().console = instance;
  }
}

HtmlOutput.prototype.prepareStyles = function() {
  var css = "
  body {
    background: #232230;
    color:#eee;
    font-family: monospace;
    white-space: pre-wrap;
    font-size: 12pt;
  }
  .log { color: #fff; }
  .log.error, .red { color: #e66; }
  .bright {
    color: #ddd;
    font-weight: bold;
  }

  .bg-red { background: #b44; }
  .bg-green { background: #494; }
  .green { color: #6d6; }
  .cyan { color: #6ce; }
  .blue { color: #38e; }
  .yellow { color: #dc6; }
  .yellow.bright { color: #fe7; }
  .dim { opacity: 0.6; }
  a { text-decoration: none; font-weight:bold; color: inherit;}
  ";
  dom.addCSS(css);
};

HtmlOutput.prototype._log = function(level, args) {
  if(args.length == 1
     && args[0] .. dom.isDOMNode()
     && args[0].nodeName.toLowerCase() == 'canvas')
  {
    // shortcut: allow printing single `canvas` objects directly to the output
    this.print(args[0]);
    return;
  }
  var msg = formatLogArgs(args);
  var elem = document.createElement('span');
  if (level != 'log') level = 'log ' + level
  elem.setAttribute('class', level);
  elem.appendChild(document.createTextNode(msg));
  this.print(elem);
}

var getScrollBottom = -> (window.pageYOffset || document.documentElement.scrollTop) + window.innerHeight;
var getDocumentHeight = -> Math.max(document.documentElement.offsetHeight, document.body.offsetHeight);

HtmlOutput.prototype.print = function(msg, endl) {
  var scrollBottom = getScrollBottom();
  var followOutput = getDocumentHeight() <= scrollBottom;
  if (msg === undefined) msg = '';
  if (!dom.isDOMNode(msg)) {
    msg = document.createTextNode(msg);
  }
  this.output.appendChild(msg);
  if (endl !== false) this.output.appendChild(document.createElement('br'));
  if (followOutput) {
    var documentHeight = getDocumentHeight();
    if (documentHeight > scrollBottom) window.scrollTo(window.pageXOffset, documentHeight);
  }
}

var makeLogger = (lvl) -> function() { this._log.call(this, lvl, arguments); }

HtmlOutput.prototype.log = makeLogger('log');
HtmlOutput.prototype.info = makeLogger('info');
HtmlOutput.prototype.error = makeLogger('error');
HtmlOutput.prototype.warning = makeLogger('warning');

var HtmlReporter = exports.HtmlReporter = function() {
  this.init.apply(this, arguments);
}

HtmlReporter.prototype.init = function(opts) {
  if (opts.headless === true) return; // used in tests, we construct a reporter not connected to the actual console
  if (!exports.HtmlOutput.instance) {
    throw new Error("HtmlReporter instantiated before HtmlOutput.instance set");
  }
  this.console = exports.HtmlOutput.instance;
  this.print = this.console.print.bind(this.console);
}

HtmlReporter.prototype.color = function(col, text, endl) {
  var e = document.createElement('span');
  if (typeof col != 'string') {
    col = object.ownPropertyPairs(col)
      .. map([attr, val] -> attr == 'background'?'bg-'+val:val)
      .. join(' ');
  }
    
  e.setAttribute('class', col);
  if ('className' in e) e.className = col; // IE<8
  e.appendChild(document.createTextNode(text));
  return e;
}
LogReporterMixins.mixInto(HtmlReporter);


HtmlReporter.prototype.report = function(results) {
  var parts = [];
  if (results.failed > 0)  parts.push(this.color('red',   "#{results.failed} failed"));
  if (results.skipped > 0) parts.push(this.color('cyan',  "#{results.skipped} skipped"));
  if (results.passed > 0)  parts.push(this.color('green', "#{results.passed} passed"));
  this.print(this.color({attribute: 'bright'}, "Ran #{results.count()} tests. "), false);
  var first = true;
  parts .. each {|part|
    if (!first) {
      this.print(", ", false)
    }
    first = false;
    this.print(part, false);
  }
  this.print(this.color({attribute: 'dim'}, " (in #{results.durationSeconds()}s)"), false);
  if (document.location.hash) {
    var elem = document.createElement("a");
    elem.appendChild(document.createTextNode("#"));
    elem.setAttribute("class", "dim");
    elem.setAttribute("href", "#");
    this.print(" ", false);
    this.print(elem, false);
  }
  this.print();
}

HtmlReporter.prototype.linkToTest = function(testId, inline) {
  this.print(" ",false);
  var elem = document.createElement("a");
  testId = shell_quote.quote([testId]);
  elem.setAttribute("href", "#" + encodeURIComponent(testId));
  if (inline) {
    elem.innerHTML = "&para;";
  } else {
    elem.appendChild(document.createTextNode(testId));
  }
  elem.setAttribute("class", "dim");
  this.print(elem);
}

/** Karma Reporter **/
var KarmaReporter = exports.KarmaReporter = function() {
  this.init.apply(this, arguments);
}

KarmaReporter.prototype.init = function(opts) {
  this.ctx = window.__karma__;
}

KarmaReporter.prototype.suiteBegin = function(results) {
  this.ctx.info({total:results.total});
};

KarmaReporter.prototype.suiteEnd = function(results) {
  if (!results.ok()) {
    throw new Error();
  }
};

KarmaReporter.prototype.testBegin = function(result) {
  if (this.logCapture) this.logCapture.drain();
  this.testStartTime = new Date();
}

KarmaReporter.prototype.testEnd = function(result) {
  var fullDescription = result.test.fullDescription();
  var report = {
    description: fullDescription,
    suite: [],
    success: result.ok,
    time: new Date().getTime() - this.testStartTime.getTime(),
    log: []
  };
  if (result.skipped) {
    report.log = this.formatSkip(result.test.skipReason).split("\n");
  } else if (result.ok) {
    // noop
  } else {
    this.failures.push(result);
    var log = ["# " + this.linkToTest(fullDescription)];
    log = log.concat(String(result.error).split("\n"));
    if (this.logCapture && this.logCapture.messages.length > 0) {
      log.push('-- Captured logging ---');
      log = log.concat(this.logCapture.messages);
    }
    report.log = log;
  }
  this.ctx.result(report);

  if (this.logCapture) this.logCapture.reset();
};

KarmaReporter.prototype.linkToTest = function(testId) {
  return shell_quote.quote([testId]);
}


ReporterMixins.mixInto(KarmaReporter);


/** NodeJS Reporter **/

var NodejsReporter = exports.NodejsReporter = function() {
  this.init.apply(this, arguments);
};

NodejsReporter.prototype.init = function(opts) {
  var color_pref = opts.color;
  var color_noop = function(col, text) { return text; }
  if (color_pref === false) {
    this.color = color_noop;
  } else if (color_pref === true) {
  } else if (color_pref === 'auto' || color_pref == null) {
    if (! require('nodejs:tty').isatty(process.stdout.fd)) {
      this.color = color_noop;
    }
  } else {
    throw new Error("Unknown color pref: #{color_pref}");
  }

  if(!this.color) {
    // if color has not been set (to color_noop), set it:
    var terminal = require('../nodejs/terminal');
    this.color = function(col, text) { return terminal._color(col) + text + terminal.reset_code; };
  }
}

LogReporterMixins.mixInto(NodejsReporter);

NodejsReporter.prototype.linkToTest = function(testId, inline) {
  var base = this.opts.base;
  if (base == null) return; // can't formulate a command line without knowing the base module
  if (inline) this.print(); // we can't print inline on the console, make a new line

  var url = require('sjs:url');
  base = base..url.toPath();
  base = require('nodejs:path').relative(process.cwd(), base);
  var args = ['sjs', base, testId];
  this.print(this.color({attribute:'dim'}, this.prefix + "# " + shell_quote.quote(args)));
}

NodejsReporter.prototype.print = function(msg, endl) {
  if (msg === undefined) msg = '';
  process.stdout.write(String(msg));
  if (endl !== false) process.stdout.write('\n');
}

NodejsReporter.prototype.report = function(results) {
  var parts = [];
  if (results.failed > 0)  parts.push(this.color('red',   "#{results.failed} failed"));
  if (results.skipped > 0) parts.push(this.color('cyan',  "#{results.skipped} skipped"));
  if (results.passed > 0)  parts.push(this.color('green', "#{results.passed} passed"));
  var durationDesc = this.color({attribute: 'dim'}, "(in #{results.durationSeconds()}s)");
  console.log("Ran #{results.count()} tests. #{parts.join(", ")} #{durationDesc}");
}

// initialization should only be performed once globally, so we 
// use a module-level var to prevent double-initialization.
var INITIALIZED = false;

/**
 * Set up all hostenv-specific exports
 */
switch(sys.hostenv) {
  case "xbrowser":
    dom = require('../xbrowser/dom');

    var consoleCls = null;
    if (Object.prototype.hasOwnProperty.call(window, '__karma__')) {
      exports.DefaultReporter = KarmaReporter;
    } else {
      exports.DefaultReporter = HtmlReporter;
      consoleCls = HtmlOutput;
    }

    var onHashChange = -> window.location.reload();
    exports.init = function() {
      if (INITIALIZED) return;
      INITIALIZED = true;
      window .. dom.addListener("hashchange", onHashChange, false);
      consoleCls && consoleCls.init();
    }

    break;
  case "nodejs":
    exports.DefaultReporter = NodejsReporter;
    exports.init = function() { /* noop */ }
    break;
  default:
    logging.warn("unknown hostenv: #{sys.hostenv}");
    break;
}
