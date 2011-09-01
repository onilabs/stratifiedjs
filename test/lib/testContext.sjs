var http = require('apollo:http');
var testUtil = require('../lib/testUtil');
exports.baseURL = "http://localhost:7070/test/run.sjs";

var relativeURL = exports.relativeURL = function(relativePath) {
  if(testUtil.isBrowser) return relativePath;
  // node can't resolve relative paths, assume server location:
  return http.canonicalizeURL(relativePath, exports.baseURL);
};
