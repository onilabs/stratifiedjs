var str = require('sjs:string');
var BaseRunner = require("./baseRunner").BaseRunner;

var BrowserRunner = exports.BrowserRunner = function() {
  this.init.apply(this, arguments);
};

BrowserRunner.prototype = new BaseRunner();
///XXX surely there's a better way to get at `super` methods?
BrowserRunner.prototype._super = new BaseRunner();

BrowserRunner.prototype.output = function() {
  return document.getElementById("output");
};
BrowserRunner.prototype.status = function() {
  return document.getElementById("status");
};

BrowserRunner.prototype.result = function(status, message) {
  this.updateProgress();

  if (this.newGroup) {
    this.groupOffset = this.testCounter-1;
    var node = document.createElement("div");
    node.innerHTML = str.sanitize(this.newGroup);
    node.setAttribute("class", "test file-header");
    this.newGroup = null;
    this.output().appendChild(node);
  }

  var node = document.createElement("div");
  if (status !== null) {
    message = "#{this.pad(this.testCounter-this.groupOffset,5)} #{this.pad(status.toUpperCase(),8)} #{message}";
  }
  node.innerHTML = str.sanitize(message);
  node.setAttribute("class", "test " + "test-" + status);
  this.output().appendChild(node);
};

BrowserRunner.prototype.dumpSkip = function(msg) {
  this.result('skip', msg);
};
BrowserRunner.prototype.dumpSuccess = function(msg) {
  this.result('success', msg);
};
BrowserRunner.prototype.dumpFailure = function(msg) {
  this.result('failure', msg);
};
BrowserRunner.prototype.dumpError = function(msg) {
  this.result('error', msg);
};
BrowserRunner.prototype.puts = function(s) {
  this.result(null, s);
};

BrowserRunner.prototype.reset = function() {
  this._super.reset.apply(this, arguments);
  this.updateProgress();
  this.output().innerHTML = "";
};

BrowserRunner.prototype.report = function(src) {
  var summary = "";
  summary += "Ran " + this.testCounter + " tests from " + this.testGroups.length + " files.\n";
  summary += (this.numSuccess + " passed");
  if(this.numError > 0) {
    summary += (", " + this.numError + " errors");
  }
  if(this.numFailure > 0) {
    summary += (", " + this.numFailure + " failures");
  }
  summary += ".";
  this.status().innerHTML = str.sanitize(summary);
};

BrowserRunner.prototype.updateProgress = function() {
  document.getElementById("bar").innerHTML = "<div class='progress' style='width:" +
    (this.fractionRun() * 100) + "%'><div class='failed' style='width:"+
    (this.fractionFailed() * 100)+"%'></div></div>";
};

BrowserRunner.prototype.load = function(src) {
  this.status().innerHTML = str.sanitize("loading: " + src);
  this._super.load.apply(this, arguments);
};

BrowserRunner.prototype.run = function() {
  this.status().innerHTML = str.sanitize("running tests...");
  this._super.run.apply(this, arguments);
};
