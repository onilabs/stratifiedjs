var AssertionError = exports.AssertionError = function(msg, desc) {
  this.message = msg;
  if (desc) this.message += " (#{desc})";
}
exports.AssertionError.prototype = new Error();

exports.ok = function(val, desc) {
  if (!val) throw new AssertionError("Not truthy: #{val}", desc);
}

exports.not_ok = function(val, desc) {
  if (val) throw new AssertionError("Truthy: #{val}", desc);
}

exports.raises = function(fn, desc) {
  try {
    fn();
  } catch(e) {
    return e;
  }
  throw new AssertionError("Nothing raised", desc);
}

exports.catchError = function(fn) {
  try {
    fn();
  } catch(e) {
    return e;
  }
  return null;
}
  
exports.eq = exports.equal = function(val, expected, desc) {
  if (val !== expected) throw new AssertionError("Expected #{expected}, got #{val}", desc);
}
