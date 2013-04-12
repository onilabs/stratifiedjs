var sys = require('builtin:apollo-sys');
var { map, join, each, skip } = require('../sequence');
var logging = require('../logging');
var debug = require('../debug');

var ConsoleBuffer = exports.ConsoleBuffer = function() {
  this.reset();
}
ConsoleBuffer.prototype.reset = function() {
  this.messages = [];
}
ConsoleBuffer.prototype.log = function(m) {
  if (arguments.length > 1) {
    m = m + (arguments .. skip(1) .. map(debug.inspect) .. join(" "))
  }
  m.split("\n") .. each {|line|
    this.messages.push(line);
  }
}

var HtmlReporter = function() {
}

var NodejsReporter = function(opts) {
  if (opts.logCapture) {
    this.logCapture = new ConsoleBuffer();
  }

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
};

var repeatStr = function(str, levels) {
  return new Array(levels+1).join(str);
}
  
NodejsReporter.prototype.loading = function(module) {
  console.log(this.color({attribute: 'dim'}, " [ loading #{module} ]"));
};

NodejsReporter.prototype.run = function(results) {
  if (this.logCapture) logging.setConsole(this.logCapture);
  waitfor {
    var indentLevels = 0;
    var indent = '  ';
    var prefix = '';
    while(true) {
      waitfor {
        var result = results.testStart.wait();
        if (this.logCapture) this.logCapture.reset();
        process.stderr.write(prefix + result.test.description + ' ... ');
        result = results.testFinished.wait();
        if (result.skipped) {
          var msg = "SKIP";
          if (result.reason) msg = "#{msg} (#{result.reason})"
          console.log(this.color('blue', msg));
        } else if (result.ok) {
          console.log(this.color('green', "OK"));
        } else {
          console.log(this.color('red', "FAILED"));
          console.log(this.color('yellow', String(result.error).split("\n") .. map((line) -> prefix + "| " + line) .. join("\n")));
          if (this.logCapture && this.logCapture.messages.length > 0) {
            console.log(prefix + this.color('yellow', '-- Captured logging ---'));
            this.logCapture.messages .. each {|m|
              console.log(prefix + this.color('yellow', m));
            }
          }
        }
      } or {
        var context = results.contextStart.wait();
        if (indentLevels == 0) {
          console.log();
        }
        console.log(this.color({attribute: 'bright'}, "#{prefix}- #{context.description}:"));
        indentLevels++;
        prefix = repeatStr(indent, indentLevels);
      } or {
        results.contextEnd.wait();
        indentLevels--;
        prefix = repeatStr(indent, indentLevels);
      }
    }
  } or {
    results.end.wait();
    console.log();
    this.report(results);
  }
  if (this.logCapture) logging.setConsole(null);
}
NodejsReporter.prototype.report = function(results) {
  var parts = [];
  if (results.failed > 0)    parts.push(this.color('red',   "#{results.failed} failed"));
  if (results.skipped > 0)   parts.push(this.color('cyan',  "#{results.skipped} skipped"));
  if (results.succeeded > 0) parts.push(this.color('green', "#{results.succeeded} passed"));
  console.log("Ran #{results.count()} tests. #{parts.join(", ")}");
  process.exit(results.ok() ? 0 : 1);
}

switch(sys.hostenv) {
  case "xbrowser":
    exports.DefaultReporter = HtmlReporter;
    break;
  case "nodejs":
    exports.DefaultReporter = NodejsReporter;
    break;
  default:
    logging.warn("unknown hostenv: #{sys.hostenv}");
    break;
}
