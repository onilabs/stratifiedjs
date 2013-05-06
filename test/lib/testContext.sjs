var url = require('sjs:url');
var testUtil = require('./testUtil');

var baseURL = null;

var setBaseURL = exports.setBaseURL = function(base) {
  baseURL = base;
};

var getHttpURL = exports.getHttpURL = function(relativePath) {
  if(testUtil.isBrowser) return url.normalize(relativePath, url.normalize('../', module.id));
  // node can't resolve relative paths, use server location:
  require("assert").notEqual(baseURL, null, "please call testContext.setBaseURL()");
  return url.normalize(relativePath, baseURL);
};
