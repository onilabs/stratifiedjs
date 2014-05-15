@ = require('sjs:test/std');
// XXX streaming crypto interface appears new to 0.10. Fix this if we need to support this module on <0.10
@context {||
  @ .. @extend(require(['sjs:nodejs/tempfile', 'sjs:nodejs/rimraf']));
  @store = require('sjs:crypto/store');

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

