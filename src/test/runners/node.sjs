var testUtil = require("../testUtil");

//TODO: this only works by renaming .js -> .sjs. That can't be right...
var term = require("./terminal");

var NodeRunner = exports.NodeRunner = function NodeRunner(opts) {
  this.testCounter = 0;
  this.testGroups = [];
  this.verbose = opts.verbose;

  this.numFailure = 0;
  this.numSuccess = 0;
  this.numError = 0;
};
NodeRunner.prototype.puts = function(s) { process.stderr.write(s + "\n"); };

NodeRunner.prototype.addSuccess = function() {
  ++this.numSuccess;
  this.dumpSuccess.apply(this,arguments);
};
NodeRunner.prototype.addFailure = function() {
  ++this.numFailure;
  this.dumpFailure.apply(this,arguments);
};
NodeRunner.prototype.addError = function() {
  ++this.numError;
  this.dumpError.apply(this,arguments);
};

NodeRunner.prototype.dumpSuccess = function(name, a) {
  if(!this.verbose) return;
  this.dumpResult("%gOK:%n", name);
};
NodeRunner.prototype.dumpFailure = function(name, actual, expected) {
  this.dumpResult("%rFAILURE:%n", name + ", expected " + expected + " but got " + actual);
};
NodeRunner.prototype.dumpError = function(name, e) {
  this.dumpResult("%yERROR:%n", name + ": " + e);
};
NodeRunner.prototype.load = function(filename) {
  testUtil.setRunner(this);
  var fileCases = [];
  this.addCase = function(name, f) {
    fileCases.push([name, f]);
  };
  try {
    if(this.verbose) this.puts("requiring: " + filename);
    result = require(filename);
  } catch (e) {
    fileCases.push(["(load error)", function() { throw e; }]);
  }
  if(fileCases.length > 0) {
    this.testGroups.push([filename, fileCases]);
  }
  this.addCase = NodeRunner.prototype.addCase;
};

NodeRunner.prototype.dumpResult = function(status, message) {
  if(this.newGroup) {
    this.puts("\n - " + this.newGroup);
    this.newGroup = null;
  }
  this.puts("   " + term._colorize(status) + " " + message);
};

NodeRunner.prototype.startGroup = function(name) {
  this.newGroup = name;
};

//TODO: share this impl? allow parallel tests?
NodeRunner.prototype.run = function() {
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

NodeRunner.prototype.report = function() {
  var summary = "--------------\n";
  summary += "Ran " + this.testCounter + " tests from " + this.testGroups.length + " files.\n";
  summary += term._colorize("%g" + this.numSuccess + " passed%n");
  if(this.numError > 0) {
    summary += term._colorize(", %y" + this.numError + " errors%n");
  }
  if(this.numFailure > 0) {
    summary += term._colorize(", %r" + this.numFailure + " failures%n.");
  }
  this.puts(summary);
};


NodeRunner.prototype.success = function() {
  return (this.numError + this.numFailure) == 0;
};
