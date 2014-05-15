/**
 @nodoc
 */

/*
a crypto store is a file with a single
initial line containing a JSON payload,
followed by binary data.
*/

@ = require(['../sequence', '../object', '../string']);
@assert = require('../assert');
@stream = require('../nodejs/stream');
@crypto = require('nodejs:crypto');

// XXX should write* calls call .end() on their ourput stream?

var newlineBuf = new Buffer("\n", "utf-8");

var StoreProto = {};
var Store = @Constructor(StoreProto);

// constructors
exports.Store = function(plaintext, settings) {
  @assert.object(settings, 'settings');
  return Store([plaintext], settings);
}

StoreProto._init = function(stream, settings) {
  this.settings = settings;
  this.stream = stream;
};

StoreProto.update = function(plaintext, opts) {
  @asset.ok(Buffer.isBuffer(plaintext), "plaintext must be a Buffer");
  if (!opts) opts = {};
  if (opts) this.settings = settings;
  this.stream = [plaintext];
}

StoreProto.writePlaintext = function(output) {
  this.stream .. @each {|chunk|
    output .. @stream.write(chunk);
  }
  output .. @stream.end();
}

StoreProto.writeEncrypted = function(output, passphrase) {
  this._encryptedStream(passphrase) .. @each {|chunk|
    output .. @stream.write(chunk);
  }
  output .. @stream.end();
}

StoreProto._encryptedStream = function(passphrase) {
  @assert.ok(Buffer.isBuffer(passphrase), 'passphrase must be a Buffer');

  var settings = this.settings;
  var stream = this.stream;

  return @Stream(function(emit) {
    emit(new Buffer(JSON.stringify(settings), "utf-8"));
    emit(newlineBuf);
    var cipher = @crypto.createCipher(settings .. @get('alg'), passphrase);
    waitfor {
      stream .. @each {|chunk|
        cipher .. @stream.write(chunk);
      }
      cipher .. @stream.end();
    } and {
      while (true) {
        var chunk = cipher .. @stream.read();
        if (chunk == null) break;
        emit(chunk);
      }
    }
  });
}

StoreProto.encrypted = function(passphrase) {
  return this._encryptedStream(passphrase) .. @toArray .. Buffer.concat;
}

StoreProto.plaintext = function() {
  return Buffer.concat(this.stream .. @toArray);
}

exports.Store.decryptStream = function(input, passphrase, opts) {
  if (!opts) opts = {};

  var reader = @stream.DelimitedReader(input);
  var header = reader.readUntil('\n').toString('utf-8');
  @assert.ok(header .. @endsWith('\n'));
  header = JSON.parse(header);

  var cipherChunks;

  if (opts.streaming !== true) {
    cipherChunks = [];
    while(true) {
      var chunk = reader.read();
      if (chunk == null) break;
      cipherChunks.push(chunk);
    }
  } else {
    var done = false;
    cipherChunks = @Stream(function(emit) {
      if (done) {
        throw new Error("Ciphertext stream is not replayable");
      } else {
        done = true;
      }

      while(true) {
        var chunk = reader.read();
        if (chunk == null) break;
        emit(chunk);
      }
    });
  }

  return cipherChunks .. decryptIntoStore(header, passphrase);
}

var decryptIntoStore = function(cipherChunks, settings, passphrase) {
  @assert.ok(Buffer.isBuffer(passphrase), 'passphrase must be a Buffer');
  var plaintextChunks = @Stream(function(emit) {
    var cipher = @crypto.createDecipher(settings .. @get('alg'), passphrase);
    waitfor {
      cipherChunks .. @each {|chunk|
        cipher .. @stream.write(chunk);
      }
      cipher .. @stream.end();
    } and {
      while(true) {
        var chunk = cipher .. @stream.read();
        if (chunk == null) break;
        emit(chunk);
      }
    }
  });

  return Store(plaintextChunks, settings);
};

exports.Store.decrypt = function(buf, passphrase) {
  @assert.ok(Buffer.isBuffer(buf), "buffer required");
  var header = null;
  var data = null;
  var nl = '\n'.charCodeAt(0);
  for (var i=0; i<buf.length; i++) {
    if(buf[i] == nl) {
      header = buf.slice(0, i+1);
      data = buf.slice(i+1);
    }
  }
  @assert.ok(header != null, "couldn't decrypt header");
  var settings = JSON.parse(header.toString("utf-8"));
  return [data] .. decryptIntoStore(settings, passphrase);
}

