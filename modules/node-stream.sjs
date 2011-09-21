// Stratified helpers for dealing nodejs's async streams

// reads data from a stream; returns null if the stream has ended;
// throws if there is an error
//TODO: combine this with the impl in apollo-sys
exports.read = function(stream) {
  //XXX 2.X doesn't implement readable on some streams (http
  //responses; maybe others), so we gotto be careful what exactly we
  //test here:
  if (stream.readable === false) return null;
  var data = null;
  
  stream.resume();
  try {
    waitfor (var exception) {
      stream.on('error', resume);
      stream.on('end', resume);
    } finally {
      stream.removeListener('error', resume);
      stream.removeListener('end', resume);
    }
    if (exception) throw exception;
  } or {
    waitfor (data) {
      stream.on('data', resume);
    } finally {
      stream.removeListener('data', resume);
    }
  } finally {
    stream.pause();
  }
  
  return data;
};

exports.readAll = function(stream) {
  var result = [];
  var data;
  while((data = exports.read(stream)) !== null) {
    result.push(data);
  }
  return result.join('');
};

exports.write = function(dest, data/*, ...*/) {
  var wrote = dest.write.apply(dest, Array.prototype.slice.call(arguments, 1));
  if(!wrote) {
    waitfor() {
      dest.on('drain', resume);
    } finally {
      dest.removeListener('drain', resume);
    }
  }
};

exports.pump = function(src, dest, fn) {
  var data;
  while((data = exports.read(src)) !== null) {
    if(fn) data = fn(data);
    exports.write(dest, data);
  }
};

var ReadableStringStream = exports.ReadableStringStream = function(data) {
  this.data = data;
  this.paused = false;
  this.done = false;
  this.resume();
};

// TODO: do this lazily or manually so this module is importable from the browser (if that's useful)
require('util').inherits(ReadableStringStream, require('stream').Stream);

ReadableStringStream.prototype.toString = function() {
  return "#<ReadableStringStream ...>";
};
ReadableStringStream.prototype.pause = function() {
  this.paused = true;
};
ReadableStringStream.prototype.resume = function() {
  this.paused = false;
  // delayed in order to give the creator a chance to pause()
  // this stream before it emits anything
  spawn((function() {
    hold(0);
    if(this.paused) return;
    this.emit('data', this.data);
    if(!this.done) {
      this.destroy();
    }
  }).call(this));
};
ReadableStringStream.prototype.destroy = function() {
  this.emit('end');
  this.done = true;
  this.data = null;
};
ReadableStringStream.prototype.setEncoding = function() {
  throw new Error("Can't set encoding on ReadableStringStream");
};
