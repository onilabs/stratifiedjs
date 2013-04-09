var isBrowser = exports.isBrowser = require("builtin:apollo-sys").hostenv == 'xbrowser';
var _ = require("../lib/underscore.js");

var isIE = exports.isIE = function() {
  return isBrowser && navigator.appName == "Microsoft Internet Explorer";
}
var ieVersion = exports.at_least_IE = function(min_version) {
  if (!isIE()) return true;
  return IE_version() >= min_version;
}

var IE_version = exports.IE_version = function() {
  return parseInt(navigator.appVersion.match(/MSIE ([0-9]+)/)[1]);
}

var _currentRunner = null;
function currentRunner() {
  if(!_currentRunner) {
    throw("no suite defined yet!");
  };
  return _currentRunner;
};

var setRunner = exports.setRunner = function(runner) {
  _currentRunner = runner;
}

var eq = function(a, b) {
  return (_.isEqual(a, b));
};

exports.test = function test(name, expected, f) {
  return currentRunner().addCase(name, function() {
    var actual = f();

    if (eq(actual, expected))
      this.addSuccess(name, actual);
    else
      this.addFailure(name, expected, actual);
  });
}

exports.testParity = function testParity(expr, f) {
  return currentRunner().addCase(expr, function() {
    var expected;
    try {
      expected = eval(expr);
    }
    catch (e) {
      expected = e;
    }
    var actual;
    try {
      actual = f();
    }
    catch (e) {
      actual = e;
    }
    if (eq(actual, expected))
      this.addSuccess(expr, actual);
    else
      this.addFailure(expr, expected, actual);
  });
}

exports.time = function time(name, f) {
  return currentRunner().addCase(name, function() {
    try {
      var start = new Date();
      f();
      var duration = (new Date()) - start;
    }
    catch (e) {
      this.addFailure(name, "success", e);
      return;
    }
    this.addSuccess(name, duration + "ms");
    hold(0);
  });
}

exports.testCompilation = function testCompilation(name, src) {
  return currentRunner().addCase(name, function() {
    try {
      var insize = src.length;
      var start = new Date();
      for (var i=0; i<10; ++i)
        var outsize = __oni_rt.c1.compile(src).length;
      var duration = (new Date()) - start;
    }
    catch (e) {
      this.addFailure(name, "success", e);
      return;
    }
    this.addSuccess("Compiling "+name, "in: " + insize + " byte, out: " + outsize + " byte, duration(*10): " + duration + "ms");
    hold(0);
  });
}
