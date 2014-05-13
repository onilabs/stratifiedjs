@ = require('sjs:test/std');
// XXX streaming crypto interface appears new to 0.10. Fix this if we need to support this module on <0.10
@context {||
  @ .. @extend(require(['sjs:nodejs/tempfile', 'sjs:nodejs/rimraf']));
  @store = require('sjs:crypto/store');

  @context("sentinelReader") {||
    var wrap = @store._sentinelReader;
    var chunkyStream = function(chunks) {
      var chunks = (chunks .. @toArray()).slice();
      var rv = new (require('nodejs:events').EventEmitter)();
      var running = true;
      rv.readable = true;
      rv.resume = function() {
        running = true;
        while(running) {
          if (chunks.length == 0) {
            //console.log("emitting null");
            this.emit('end');
          } else {
            //console.log("emitting chunk: #{chunks[0]}");
            this.emit('data', new Buffer(chunks.shift()));
          }
          hold(0);
        }
      };
      rv.pause = function() {
        running = false;
      };

      return rv;
    }

    @test("reads up to a given character") {||
      var reader = wrap(chunkyStream(['12345', '678']));
      reader.readUntil('4').toString('utf-8') .. @assert.eq('1234');
      reader.read().toString('utf-8') .. @assert.eq('5');
      reader.read().toString('utf-8') .. @assert.eq('678');
      reader.read() .. @assert.eq(null);
    }

    @test("buffers multiple chunks until sentinel is reached") {||
      var reader = wrap(chunkyStream(['12', '345', '678']));
      reader.readUntil('7').toString('utf-8') .. @assert.eq('1234567');
      reader.read().toString('utf-8') .. @assert.eq('8');
      reader.read() .. @assert.eq(null);
    }

    @test("sentinel at the end of a chunk") {||
      var reader = wrap(chunkyStream(['12', '345', '678']));
      reader.readUntil('2').toString('utf-8') .. @assert.eq('12');
      reader.read().toString('utf-8') .. @assert.eq(''); // could be omitted
      reader.read().toString('utf-8') .. @assert.eq('345');
      reader.read().toString('utf-8') .. @assert.eq('678');
      reader.read() .. @assert.eq(null);
    }

    @test("doesnt skip sentinels that appear in th same chunk") {||
      var reader = wrap(chunkyStream(['123543678']));
      reader.readUntil('3').toString('utf-8') .. @assert.eq('123');
      reader.readUntil('3').toString('utf-8') .. @assert.eq('543');
      reader.read().toString('utf-8') .. @assert.eq('678');
      reader.read() .. @assert.eq(null);
    }

    @test("changing sentinel") {||
      var reader = wrap(chunkyStream(['123454321']));
      reader.readUntil('4').toString('utf-8') .. @assert.eq('1234');
      reader.readUntil('2').toString('utf-8') .. @assert.eq('5432');
      reader.read().toString('utf-8') .. @assert.eq('1');
      reader.read() .. @assert.eq(null);
    }

    @test("returns all data if sentinel is not found") {||
      var reader = wrap(chunkyStream(['123', '456']));
      reader.readUntil('8').toString('utf-8') .. @assert.eq('123456');
      reader.read() .. @assert.eq(null);
    }
  }

  @context("encrypted store") {||

    @test.beforeEach {|s|
      s.secret = "the game is afoot!";
      s.passphrase = new Buffer('letmein');
      s.opts = {alg:'aes256'};
      s.memoryStore = @store.Store(new Buffer(s.secret), s.opts);

      s.root = @TemporaryDir();

      s.path = @path.join(s.root, "enc");
      @fs.withWriteStream(s.path) {|f|
        s.memoryStore.writeEncrypted(f, s.passphrase);
      }
    }

    @test.afterEach { |s|
      @rimraf(s.root);
    }

    @test('encryption') {|s|
      var expectedCiphertext = [
        new Buffer(JSON.stringify(s.opts)),
        new Buffer("\n"),
        new Buffer([
          4, 47, 15, 55, 20, 218, 248, 19, 207,
          33, 109, 242, 180, 218, 165, 180, 134,
          79, 198, 116, 165, 225, 221, 253, 125,
          37, 141, 51, 25, 8, 39, 129
        ])
      ] .. Buffer.concat;

      // to file
      @fs.readFile(s.path) .. @assert.eq(expectedCiphertext);

      // to buffer
      s.memoryStore.encrypted(s.passphrase) .. @assert.eq(expectedCiphertext);
    }

    @test('in-memory decryption') {|s|
      // from file
      var decrypted = null;
      @fs.withReadStream(s.path) {|stream|
        var store = @store.Store.decryptStream(stream, s.passphrase);
        decrypted = store.plaintext();
      }
      decrypted.toString('utf-8') .. @assert.eq(s.secret);

      // from buffer
      var cipherText = @fs.readFile(s.path);
      @store.Store.decrypt(cipherText, s.passphrase)
        .plaintext()
        .toString('utf-8')
        .. @assert.eq(s.secret);
    }

    @test('decryption to a file') {|s|
      // from file
      var plaintextPath = @path.join(s.root, 'plain');
      @fs.withReadStream(s.path) {|stream|
        var store = @store.Store.decryptStream(stream, s.passphrase);
        @fs.withWriteStream(plaintextPath) {|output|
          store.writePlaintext(output)
        }
      }
      @fs.readFile(plaintextPath, 'utf-8') .. @assert.eq(s.secret);

      // from buffer
      @fs.unlink(plaintextPath);
      @fs.withWriteStream(plaintextPath) {|output|
        s.memoryStore.writePlaintext(output)
      }
      @fs.readFile(plaintextPath, 'utf-8') .. @assert.eq(s.secret);
    }

    @test("streaming decryption can't be replayed") {|s|
      @fs.withReadStream(s.path) {|stream|
        var store = @store.Store.decryptStream(stream, s.passphrase, {streaming:true});
        store.plaintext().toString('utf-8') .. @assert.eq(s.secret);
        @assert.raises({message: /Ciphertext stream is not replayable/}, -> store.plaintext());
      }
    }

    @test("decrypting from a stream is eager (and replayable) by default") {|s|
      @fs.withReadStream(s.path) {|stream|
        var store = @store.Store.decryptStream(stream, s.passphrase);
        store.plaintext().toString('utf-8') .. @assert.eq(s.secret);
        store.plaintext().toString('utf-8') .. @assert.eq(s.secret);
      }
    }
  }
}.skipIf(@isBrowser || (process.versions.node.split('.') .. @map(i -> parseInt(i, 10)) .. @cmp([0, 10]) < 0));

