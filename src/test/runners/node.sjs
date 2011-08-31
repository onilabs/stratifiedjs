var BaseRunner = require("./baseRunner").BaseRunner;

//TODO: this only works by renaming .js -> .sjs. That can't be right...
var term = require("./terminal");

var NodeRunner = exports.NodeRunner = function() {
  this.init.apply(this, arguments);
};

NodeRunner.prototype = new BaseRunner();
NodeRunner.prototype.super = new BaseRunner();

NodeRunner.prototype.puts = function(s) { process.stderr.write(s + "\n"); };

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
NodeRunner.prototype.dumpResult = function(status, message) {
  if(this.newGroup) {
    this.puts("\n - " + this.newGroup);
    this.newGroup = null;
  }
  this.puts("   " + term._colorize(status) + " " + message);
};


NodeRunner.prototype.report = function() {
  var summary = "--------------\n";
  summary += "Ran " + this.testCounter + " tests from " + this.testGroups.length + " files.\n";
  summary += term._colorize("%g" + this.numSuccess + " passed%n");
  if(this.numError > 0) {
    summary += term._colorize(", %y" + this.numError + " errors%n");
  }
  if(this.numFailure > 0) {
    summary += term._colorize(", %r" + this.numFailure + " failures%n");
  }
  summary += ".";
  this.puts(summary);
};

