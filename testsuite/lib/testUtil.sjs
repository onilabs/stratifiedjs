var suite = require("sjs:test/suite");
var assert = suite.assert;
var isBrowser = exports.isBrowser = suite.isBrowser;

var isIE = exports.isIE = suite.isIE;
exports.at_least_IE = function(min_version) {
  if (!isIE()) return true;
  return IE_version() >= min_version;
}

var IE_version = exports.IE_version = suite.IE_version;

exports.test = function test(name, expected, f) {
  return suite.test(name) {||
    assert.eq(f(), expected);
  }
}

exports.testParity = function testParity(expr, f) {
  return suite.test("parity: " + expr) {||
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
    assert.eq(actual, expected);
  }
}

exports.time = function time(name, f) {
  return suite.test('time: ' + name) {||
    var start = new Date();
    f();
    var duration = (new Date()) - start;
    console.log(duration + "ms");
  }
}

exports.testCompilation = function testCompilation(name, src) {
  return suite.test('compile: ' + name) { ||
    var insize = src.length;
    var start = new Date();
    for (var i=0; i<10; ++i)
      var outsize = __oni_rt.c1.compile(src).length;
    var duration = (new Date()) - start;
    console.log("in: " + insize + " byte, out: " + outsize + " byte, duration(*10): " + duration + "ms");
  }
}
