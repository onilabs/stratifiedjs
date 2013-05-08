var suite = require("sjs:test/suite");
var seq = require("sjs:sequence");
var assert = suite.assert;
var isBrowser = exports.isBrowser = suite.isBrowser;

// TODO: do we need a public API for printing to the results line?
var print = isBrowser ? (s) -> require('sjs:test/reporter').HtmlOutput.instance.print(s, false) : (s) -> process.stdout.write(s);

var isIE = exports.isIE = suite.isIE;
exports.at_least_IE = function(min_version) {
  if (!isIE()) return true;
  return IE_version() >= min_version;
}

var IE_version = exports.IE_version = suite.ieVersion;

/*
 * TODO: remove uses of this function, or at least rename it to `testEq`
 */
exports.test = function test(name, expected, f) {
  return suite.test(name) {||
    assert.eq(f(), expected);
  }
}

/**
 * Test the return value of `fn` (ctx[method]) against an expected value
 * If args is not an array, it's taken as a single argument. Otherwise, an array of arguments.
 *
 * If ctx is not given, `method` should be a function object (rather than a propety name).
 */
exports.testFn = function(ctx /* optional */, method, args, expected) {
  var fn;
  if (arguments.length < 4) {
    // no ctx provided, methodName is the function
    [fn, args, expected] = arguments;
    ctx = null;
    method = null;
  } else {
    fn = ctx[method];
  }
  if (!Array.isArray(args)) args = [args];
  var args_desc = args .. seq.map(JSON.stringify) .. seq.join(", ");
  var desc = method ? "#{method}(#{args_desc})" : args_desc;
  return suite.test(desc) {||
    assert.eq(fn.apply(ctx, args), expected);
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
    print(duration + "ms ");
  }
}

exports.testCompilation = function testCompilation(name, src) {
  return suite.test('compile: ' + name) { ||
    var insize = src.length;
    var start = new Date();
    for (var i=0; i<10; ++i)
      var outsize = __oni_rt.c1.compile(src).length;
    var duration = (new Date()) - start;
    print("in: " + insize + " byte, out: " + outsize + " byte, duration(*10): " + duration + "ms ");
  }
}
