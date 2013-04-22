/*
 * Oni Apollo 'test/reporter' module
 * Reporter objects for outputting test suite results
 *
 * Part of the Oni Apollo Standard Module Library
 * Version: 'unstable'
 * http://onilabs.com/apollo
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
var { map, join, each, skip } = require('../sequence');
var logging = require('../logging');
var debug = require('../debug');
var object = require('../object');
var func = require('../function');
var dom;

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

var formatLogArgs = function(args) {
  if (args.length == 0 ) return '';
  var msg = args[0];
  if (args.length > 1) {
    msg += (args .. skip(1) .. map(debug.inspect) .. join(" "))
  }
  return msg;
}

ConsoleBuffer.prototype.log = function(m) {
  var msg = formatLogArgs(arguments);
  msg.split("\n") .. each {|line|
    this.messages.push(line);
  }
}

ReporterMixins = {
  init: function(opts) {
    if (opts.logCapture) {
      this.logCapture = new ConsoleBuffer();
    }
    this.fmt = new Formatter(opts, this);
  },
  run: function(results) {
    var oldConsole = logging.getConsole();
    if (this.logCapture) logging.setConsole(this.logCapture);
    try {
      waitfor {
        this.fmt.reset();
        while(true) {
          waitfor {
            var result = results.testStart.wait();
            if (this.logCapture) this.logCapture.drain();
            this.fmt.beginTest(result);
            result = results.testFinished.wait();
            this.fmt.endTest(result, this.logCapture && this.logCapture.messages);
            if (this.logCapture) this.logCapture.reset();
          } or {
            var context = results.contextStart.wait();
            this.fmt.contextStart(context);
          } or {
            var ctx = results.contextEnd.wait();
            this.fmt.contextEnd(ctx);
          }
        }
      } or {
        results.end.wait();
        this.print();
        this.report(results);
      }
    } finally {
      if (this.logCapture) logging.setConsole(oldConsole);
    }
  },

  mixInto: function (cls) {
    cls.prototype.run = this.run;
    cls.prototype.init = func.seq(cls.prototype.init, this.init);
  }
};

/** Responsible for formatting / printing test results.
 */
var Formatter = function(opts, printer) {
  this.color = printer.color.bind(printer);
  this.print = printer.print.bind(printer);
}

Formatter.prototype.reset = function() {
  this.indentLevels = 0;
  this.indent = '  ';
  this.prefix = '';
}

Formatter.prototype.contextStart = function(context) {
  if (this.indentLevels == 0) {
    this.print();
  }
  var skipping = context.shouldSkip();
  this.print(this.color({attribute: 'bright'}, "#{this.prefix}- #{context.description}: "), !skipping);
  if (skipping) this.printSkip(context.skipReason);
  this.indentLevels++;
  this.prefix = repeatStr(this.indent, this.indentLevels);
}

Formatter.prototype.contextEnd = function(context) {
  this.indentLevels--;
  this.prefix = repeatStr(this.indent, this.indentLevels);
}

Formatter.prototype.beginTest = function(result) {
    this.print(this.prefix + result.test.description + ' ... ', false);
}

Formatter.prototype.printSkip = function(reason) {
  var msg = "SKIP";
  if (reason) msg = "#{msg} (#{reason})"
  this.print(this.color('blue', msg));
}

Formatter.prototype.endTest = function(result, capturedLogs) {
  if (result.skipped) {
    this.printSkip(result.reason);
  } else if (result.ok) {
    this.print(this.color('green', "OK"));
  } else {
    this.print(this.color('red', "FAILED"));
    var prefix = this.prefix;
    this.print(this.color('yellow', String(result.error).split("\n") .. map((line) -> prefix + "| " + line) .. join("\n")));
    if (capturedLogs && capturedLogs.length > 0) {
      this.print(prefix, false);
      this.print(this.color('yellow', '-- Captured logging ---'));
      capturedLogs .. each {|m|
        this.print(prefix, false);
        this.print(this.color('yellow', m));
      }
    }
  }
}

var HtmlOutput = exports.HtmlOutput = function() {
  this.prepareStyles();
  this.output = document.createElement('div');
  this.output.setAttribute('id', HtmlOutput.elementId);
  document.body.appendChild(this.output);
}
HtmlOutput.instance = null;
HtmlOutput.elementId = 'console-output';

HtmlOutput.prototype.prepareStyles = function() {
  var css = "
  body {
    background: #232230;
    color:#ccc;
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
  .green { color: #6d6; }
  .cyan { color: #6ce; }
  .blue { color: #38e; }
  .yellow { color: #ed6; }
  .dim { color: #888; }
  ";
  dom.addCSS(css);
};

HtmlOutput.prototype._log = function(level, args) {
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
  if (!dom.isHtmlElement(msg)) {
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

var HtmlReporter = function() {
  this.init.apply(this, arguments);
}

HtmlReporter.prototype.init = function(opts) {
  if (!exports.HtmlOutput.instance) {
    throw new Error("HtmlReporter instantiated before HtmlOutput.instance set");
  }
  this.console = exports.HtmlOutput.instance;
  this.print = this.console.print.bind(this.console);
  this.fmt = new Formatter(opts, this);
}

HtmlReporter.prototype.loading = function(module) {
  this.print(this.color({attribute: 'dim'}, " [ loading #{module} ]"));
};

HtmlReporter.prototype.color = function(col, text, endl) {
  var e = document.createElement('span');
  if (typeof col != 'string') {
    col = object.ownValues(col) .. join(' ');
  }
    
  e.setAttribute('class', col);
  if ('className' in e) e.className = col; // IE<8
  e.appendChild(document.createTextNode(text));
  return e;
}
ReporterMixins.mixInto(HtmlReporter);


HtmlReporter.prototype.report = function(results) {
  var parts = [];
  if (results.failed > 0)    parts.push(this.color('red',   "#{results.failed} failed"));
  if (results.skipped > 0)   parts.push(this.color('cyan',  "#{results.skipped} skipped"));
  if (results.succeeded > 0) parts.push(this.color('green', "#{results.succeeded} passed"));
  this.print(this.color({attribute: 'bright'}, "Ran #{results.count()} tests. "), false);
  var first = true;
  parts .. each {|part|
    if (!first) {
      this.print(", ", false)
    }
    first = false;
    this.print(part, false);
  }
  exports.exit(results.ok() ? 0 : 1);
}


var NodejsReporter = function() {
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

ReporterMixins.mixInto(NodejsReporter);

var repeatStr = function(str, levels) {
  return new Array(levels+1).join(str);
}
  
NodejsReporter.prototype.print = function(msg, endl) {
  if (msg === undefined) msg = '';
  process.stdout.write(String(msg));
  if (endl !== false) process.stdout.write('\n');
}

NodejsReporter.prototype.report = function(results) {
  var parts = [];
  if (results.failed > 0)    parts.push(this.color('red',   "#{results.failed} failed"));
  if (results.skipped > 0)   parts.push(this.color('cyan',  "#{results.skipped} skipped"));
  if (results.succeeded > 0) parts.push(this.color('green', "#{results.succeeded} passed"));
  console.log("Ran #{results.count()} tests. #{parts.join(", ")}");
  process.exit(results.ok() ? 0 : 1);
}

NodejsReporter.prototype.loading = function(module) {
  console.log(this.color({attribute: 'dim'}, " [ loading #{module} ]"));
};

// initialization should only be performed once globally, so we 
// use a module-level var to prevent double-initialization.
var INITIALIZED = false;

/**
 * Set up all hostenv-specific exports
 */
switch(sys.hostenv) {
  case "xbrowser":
    dom = require('../xbrowser/dom');
    exports.DefaultReporter = HtmlReporter;

    exports.die = function(e) {
      window.onerror = -> true; // silence uncaught error reporting
      throw e;
    };

    exports.init = function() {
      if (INITIALIZED) return;
      INITIALIZED = true;
      window .. dom.addListener("hashchange", -> window.location.reload(), false);
      var cls = exports.HtmlOutput;
      if (!document.getElementById(cls.elementId)) {
        var instance = cls.instance = new cls();
        // TODO: should we make this configurable?
        sys.getGlobal().console = instance;
      }
      window.onerror = function(err) {
        console.error(err); return true;
      };
    }

    exports.exit = -> null;

    break;
  case "nodejs":
    exports.DefaultReporter = NodejsReporter;

    exports.exit = (code) -> process.exit(code);

    exports.die = -> exports.exit(1);

    exports.init = function() {
      if (INITIALIZED) return;
      INITIALIZED = true;
      process.on('uncaughtException', function(err) {
        console.error(err);
        exports.exit(1);
        return true;
      });
    }
    break;
  default:
    logging.warn("unknown hostenv: #{sys.hostenv}");
    break;
}
