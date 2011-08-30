var testCounter = exports.testCounter = 0;
var _currentSuite = null;
function currentSuite() {
  if(!_currentSuite) {
    throw("no suite defined yet!");
  };
  return _currentSuite;
};

var setSuite = exports.setSuite = function(suite) {
  _currentSuite = suite;
}

//TODO: move NodeSuite into separate module
var NodeSuite = exports.NodeSuite = function NodeSuite() {
  this.testCounter = 0;
  this.testGroups = [];
};
NodeSuite.prototype.puts = function(s) { process.stderr.write(s + "\n"); };
NodeSuite.prototype.dumpSuccess = function(name, a) {
  this.puts("   OK: " + name);
};
NodeSuite.prototype.dumpFailure = function(name, a, b) {
  this.puts("   FAILURE: " + name + ", expected " + b + " but got " + a);
};
NodeSuite.prototype.dumpError = function(name, e) {
  this.puts("   ERROR: " + name + ": " + e);
};
NodeSuite.prototype.load = function(filename) {
  setSuite(this);
  var fileCases = [];
  this.addCase = function(name, f) {
    fileCases.push([name, f]);
  };
  try {
    result = require("file:" + filename);
    if(fileCases.length == 0) {
      fileCases.push(["(load error)", function() { throw "no tests found!"; }]);
    }
  } catch (e) {
    fileCases.push(["(load error)", function() { throw e; }]);
  }
  this.testGroups.push([filename, fileCases]);
  this.addCase = NodeSuite.prototype.addCase;
};
NodeSuite.prototype.startGroup = function(name) {
  this.puts("\n - " + name);
};

NodeSuite.prototype.run = function() {
  this.testCounter = 0;
  this.success = true;
  for(var i=0; i<this.testGroups.length; i++) {
    var group = this.testGroups[i];
    var filename = group[0];
    var tests = group[1];
    this.startGroup(filename);
    for(var j=0; j<tests.length; j++) {
      var test = tests[j];
      var testName = test[0];
      var testFn = test[1];
      ++this.testCounter;
      try{
        testFn.call(this);
      } catch (e) {
        this.dumpError(testName, e);
      }
    }
  }
  return this.success;
};

NodeSuite.prototype.report = function() {
  this.puts("ran " + this.testCounter + " tests");
};



// -- actual testing API, used by suites
exports.test = function test(name, expected, f) {
  currentSuite().addCase(name, function() {
    try {
      var a = f();
    } catch (e) {
      var error = e;
    }
    if (a === expected)
      this.dumpSuccess(name, a);
    else
      this.dumpFailure(name, a + (error?" (Exception: "+error+")":""), expected);
  });
}

exports.testParity = function testParity(exp, f) {
  currentSuite().addCase(exp, function() {
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
      this.dumpSuccess(++testCounter, exp, a);
    else
      this.dumpFailure(++testCounter, exp, a, b);
  });
}

exports.time = function time(name, f) {
  try {
    var start = new Date();
    f();
    var duration = (new Date()) - start;
  }
  catch (e) {
    reporter.dumpFailure(++testCounter, name, e, "success");
    return;
  }
  reporter.dumpSuccess(++testCounter, name, duration + "ms");
  hold(0);
}

