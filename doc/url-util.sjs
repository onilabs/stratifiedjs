var regexp = require('sjs:regexp');
// : and / are valid within fragments, and they make our URLs more readable
// for paths, we want to keep "/" unescaped - we know that files won't have a slash in them.
var encodedSlash = new RegExp(regexp.escape(encodeURIComponent('/')), "g");
var encodedColon = new RegExp(regexp.escape(encodeURIComponent(':')), "g");

exports.encodeNonSlashes = (path) -> encodeURIComponent(path).replace(encodedSlash, '/');
exports.encodeFragment = (path) -> encodeURIComponent(path).replace(encodedSlash, '/').replace(encodedColon, ':');
