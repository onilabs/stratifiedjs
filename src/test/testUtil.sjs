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

exports.test = function test(name, expected, f) {
  currentRunner().addCase(name, function() {
    var a = f();
    if (a === expected)
      this.addSuccess(name, a);
    else
      this.addFailure(name, a, expected);
  });
}

exports.testParity = function testParity(exp, f) {
  currentRunner().addCase(exp, function() {
    try {
      var a = eval(exp);
    }
    catch (e) {
      a = e;
    }
    try {
      var b = f();
    }
    catch (e) {
      b = e;
    }
    if (a === b)
      this.addSuccess(exp, a);
    else
      this.addFailure(exp, a, b);
  });
}

exports.time = function time(name, f) {
  currentRunner().addCase(name, function() {
    try {
      var start = new Date();
      f();
      var duration = (new Date()) - start;
    }
    catch (e) {
      this.addFailure(name, e, "success");
      return;
    }
    this.addSuccess(name, duration + "ms");
    hold(0);
  });
}

