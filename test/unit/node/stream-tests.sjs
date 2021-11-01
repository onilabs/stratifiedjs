var testUtil = require('../../lib/testUtil');
var test = testUtil.test;
@ = require('sjs:test/std');
var sys = require('sjs:sys');

@context(function() {
  var s = @stream = require("sjs:nodejs/stream");

  @context("contents", function() {
    @test("returns a stream of buffers", function() {
      @fs.withReadStream(module.id .. @url.toPath) {|stream|
        var contents = s.contents(stream);
        contents .. @isStream .. @assert.ok();
        contents .. @first .. Buffer.isBuffer .. @assert.ok();
      }
    })

    @test("returns a stream of strings if encoding is given", function() {
      @fs.withReadStream(module.id .. @url.toPath) {|stream|
        var contents = s.contents(stream, 'utf-8');
        contents .. @isStream .. @assert.ok();
        contents .. @first .. @isString .. @assert.ok();
      }
    })

    function testRetractWhileReading(src) {
      var retracted = false;
      waitfor {
        try {
          src .. s.contents .. @each {|chunk|
            console.log("CHUNK #{chunk.length}");
          };
          throw new Error("End of stream reached before retraction");
        } retract {
          retracted = true;
        }
      } or {
        hold(0);
      }
      retracted .. @assert.eq(true, "expected read to be retracted");
    };

    @test("retraction while reading stdin", function() {
      testRetractWhileReading(process.stdin);
    }).skip("BUG - see https://github.com/joyent/node/issues/17204");

    @test("retraction while reading fs.ReadableStream", function() {
      @fs.withReadStream(module.id .. @url.toPath) {|stream|
        testRetractWhileReading(stream);
      }
    })
  })

  @context("pump", function() {
    @test.beforeEach:: function(s) {
      s.dest = @stream.WritableStringStream();
    }

    @test("accepts a nodejs stream", function(s) {
      @stream.ReadableStringStream('data', 'ascii') .. @stream.pump(s.dest);
      s.dest.data .. @assert.eq("data");
    })

    @test("allows data transformation (deprecated API)", function(s) {
      @stream.ReadableStringStream('data', 'ascii') .. @stream.pump(s.dest, d -> d.toUpperCase());
      s.dest.data .. @assert.eq("DATA");
    })

    @test("accepts a sequence::Stream", function(s) {
      ["one", "two", "three"] .. @toStream .. @stream.pump(s.dest);
      s.dest.contents() .. @assert.eq("onetwothree");
    })

    @test("accepts an array", function(s) {
      ["one", "two", "three"] .. @stream.pump(s.dest);
      s.dest.contents() .. @assert.eq("onetwothree");
    })

    @test("accepts a buffer", function() {
      var dest = new @stream.WritableStream();
      Buffer.from("onetwothree") .. @stream.pump(dest);
      dest.contents() .. @assert.eq(Buffer.from("onetwothree"));
    })

    @test("accepts a string", function(s) {
      "onetwothree" .. @stream.pump(s.dest);
      s.dest.contents() .. @assert.eq("onetwothree");
    })

    @context("pumping a large, buffering duplex stream", function() {
      var { BufferingStream } = require('./buffering_stream.js');
      var build = function(size) {
        var b = Buffer.alloc(size);
        b.fill("x");
        return b.toString('ascii');
      };

      var result = [];
      var expectedSize = 1024;

      var input = build(expectedSize);

      @test("ReadableStream.pipe()", function() {
        // This test is a canary - if it fails, it probably means that our
        // BufferingStream implementation is wrong, rather than the stream module.
        require('sjs:nodejs/tempfile').TemporaryFile {|f|
          var output = f.writeStream();
          var s = new BufferingStream();
          s.pipe(output);
          input .. @toArray .. @each {|chunk|
            if(!s.write(chunk)) {
              s .. @wait('drain');
            }
          }
          s.end();
          output .. @wait('finish');
          @fs.readFile(f.path, 'ascii').length .. @assert.eq(input.length);
        }
      })

      @test("@stream.pump()", function() {
        var duplex = new BufferingStream();
        waitfor {
          input .. @toStream .. @stream.pump(duplex);
        } and {
          duplex .. @stream.contents .. @each {|chunk|
            result.push(chunk);
          }
        }
        var totalSize = result.reduce(function(size, chunk) { return size + chunk.length; }, 0);
        totalSize .. @assert.eq(expectedSize);
      })
    })//.skip("BROKEN");
  })

  // ReadableStringStream:
  test("ReadableStringStream is a readable stream", true, function() {
    var stream = new s.ReadableStringStream("data");
    return stream .. @stream.isReadableStream();
  });

  test("ReadableStringStream emits data", "data", function() {
    var stream = new s.ReadableStringStream("data");
    var data = '';
    stream.on('data', function(newData) {
      data += newData;
    });
    waitfor() {
      stream.on('end', resume);
    }
    return data;
  });

  test("ReadableStringStream supports pause/resume", "[pause] [resume] data", function() {
    var stream = new s.ReadableStringStream("data", 'ascii');
    stream.pause();
    var data = '';
    stream.on('data', function(newData) {
      data += newData;
    });
    data += "[pause] ";
    hold(100);
    stream.resume();
    data += "[resume] ";
    waitfor() {
      stream.on('end', resume);
    }
    return data;
  });

  test("WritableStringStream", "[data][end]", function() {
    var stream = new s.WritableStringStream();
    waitfor {
      waitfor() { stream.on('finish', resume); }
    }
    and {
      stream.write('[data]');
      stream.end('[end]');
    }
    return stream.data;
  });

  ;[true, false] .. @each {|byteMode|
    var wrap = s.DelimitedReader;
    var chunkyStream = function(chunks) {
      var chunks = (chunks .. @toArray()).slice();
      var rv = new (require('nodejs:events').EventEmitter)();
      var running = true;
      rv.readable = true;
      var ended = false;

      var getChunk = function() {
        if (chunks.length == 0) return null;
        var chunk = chunks.shift();
        if (byteMode) chunk = Buffer.from(chunk);
        if (chunks.length == 0) rv.readable = false;
        return chunk;
      };

      rv.resume = function() {
        running = true;
        while(running) {
          var chunk = getChunk();
          if (chunk === null) {
            //console.log("emitting null");
            if(!ended) {
              this.emit('end');
              ended = true;
            }
            break;
          } else {
            //console.log("emitting chunk: #{chunks[0]}");
            this.emit('data', chunk);
          }
          hold(0);
        }
      };
      rv.pause = function() {
        running = false;
      };

      rv.read = function() {
        var rv = getChunk();
        var self = this;
        if(rv == null) {
          if(!ended) {
            ended = true;
            sys.spawn(function() {
              hold(0);
              self.emit('end');
            });
          }
        }
        return rv;
      };

      return rv;
    }

    @context("DelimitedReader on #{byteMode ? 'byte' : 'string'} streams", function() {

      @test("reads up to a given character", function() {
        var reader = wrap(chunkyStream(['12345', '678']));
        reader.readUntil('4').toString('utf-8') .. @assert.eq('1234');
        reader.read().toString('utf-8') .. @assert.eq('5');
        reader.read().toString('utf-8') .. @assert.eq('678');
        reader.read() .. @assert.eq(null);
      })

      @test("buffers multiple chunks until sentinel is reached", function() {
        var reader = wrap(chunkyStream(['12', '345', '678']));
        reader.readUntil('7').toString('utf-8') .. @assert.eq('1234567');
        reader.read().toString('utf-8') .. @assert.eq('8');
        reader.read() .. @assert.eq(null);
      })

      @test("sentinel at the end of a chunk", function() {
        var reader = wrap(chunkyStream(['12', '345', '678']));
        reader.readUntil('2').toString('utf-8') .. @assert.eq('12');
        reader.read().toString('utf-8') .. @assert.eq(''); // could be omitted
        reader.read().toString('utf-8') .. @assert.eq('345');
        reader.read().toString('utf-8') .. @assert.eq('678');
        reader.read() .. @assert.eq(null);
      })

      @test("readUntil returns empty sequence for multiple sentinels", function() {
        var reader = wrap(chunkyStream(['12\n\n']));
        reader.readUntil('\n').toString('utf-8') .. @assert.eq('12\n');
        reader.readUntil('\n').toString('utf-8') .. @assert.eq('\n');
        reader.readUntil('\n') .. @assert.eq(null);
      })

      @test("doesnt skip sentinels that appear in th same chunk", function() {
        var reader = wrap(chunkyStream(['123543678']));
        reader.readUntil('3').toString('utf-8') .. @assert.eq('123');
        reader.readUntil('3').toString('utf-8') .. @assert.eq('543');
        reader.read().toString('utf-8') .. @assert.eq('678');
        reader.read() .. @assert.eq(null);
      })

      @test("changing sentinel", function() {
        var reader = wrap(chunkyStream(['123454321']));
        reader.readUntil('4').toString('utf-8') .. @assert.eq('1234');
        reader.readUntil('2').toString('utf-8') .. @assert.eq('5432');
        reader.read().toString('utf-8') .. @assert.eq('1');
        reader.read() .. @assert.eq(null);
      })

      @test("returns all data if sentinel is not found", function() {
        var reader = wrap(chunkyStream(['123', '456']));
        reader.readUntil('8').toString('utf-8') .. @assert.eq('123456');
        reader.read() .. @assert.eq(null);
      })

      @test("lines", function() {
        chunkyStream(['123\n456','78\n910'])
          .. s.lines
          .. @map(b -> b.toString('utf-8'))
          .. @assert.eq(['123\n','45678\n','910']);
      })
    }).skipIf(byteMode && (process.versions.node.split('.') .. @map(i -> parseInt(i, 10)) .. @cmp([0, 8]) < 0), "nodejs 0.6 lacks Buffer.concat")
  }
}).serverOnly();
