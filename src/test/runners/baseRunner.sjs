var testUtil = require("../testUtil");
var BaseRunner = exports.BaseRunner = function() {
};

BaseRunner.prototype.init = function(opts) {
  this.opts = opts;
  this.testCounter = 0;
  this.testGroups = [];
  this.verbose = opts.verbose;
  this.numTests = 0;

  this.numFailure = 0;
  this.numSuccess = 0;
  this.numError = 0;
};

BaseRunner.prototype.reset = function() {
  this.init(this.opts);
}

BaseRunner.prototype.addSuccess = function() {
  ++this.numSuccess;
  if(!this.verbose) return;
  this.dumpSuccess.apply(this,arguments);
};
BaseRunner.prototype.addFailure = function() {
  ++this.numFailure;
  this.dumpFailure.apply(this,arguments);
};
BaseRunner.prototype.addError = function() {
  ++this.numError;
  this.dumpError.apply(this,arguments);
};

BaseRunner.prototype.startGroup = function(name) {
  this.newGroup = name;
};

BaseRunner.prototype.allTests = function() {
  var tests = [];
  for(var i=0; i<this.testGroups.length; i++) {
    var group = this.testGroups[i];
    var tests = group[1];
    tests = tests.concat(tests);
  }
  return tests;
};

BaseRunner.prototype.run = function() {
  this.testCounter = 0;
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
        this.addError(testName, e);
      }
    }
  }
};


BaseRunner.prototype.totalTestCount = function() {
  return this.unsuccessfulTestCount + this.numSuccess;
};

BaseRunner.prototype.unsuccessfulTestCount = function() {
  return (this.numError + this.numFailure);
};

BaseRunner.prototype.fractionRun = function() {
  if(this.numTests == 0) return 0;
  return this.testCounter / this.numTests;
};
BaseRunner.prototype.fractionFailed = function() {
  if(this.numTests == 0) return 0;
  return this.unsuccessfulTestCount() / this.testCounter;
};
BaseRunner.prototype.success = function() {
  return this.unsuccessfulTestCount() == 0;
};

BaseRunner.prototype.load = function(filename) {
  testUtil.setRunner(this);
  var fileCases = [];
  this.addCase = function(name, f) {
    fileCases.push([name, f]);
  };
  try {
    result = require(filename);
  } catch (e) {
    fileCases.push(["(load error)", function() { throw e; }]);
  }
  if(fileCases.length > 0) {
    this.numTests += fileCases.length;
    this.testGroups.push([filename, fileCases]);
  }
  this.addCase = function() { throw "no test load in progress!"; };
};


BaseRunner.prototype.pad = function pad (id) {
  var rv="";
  var l = 6 - (""+id).length;
  for (;l--;) rv+=" ";
  return id+rv;
}
