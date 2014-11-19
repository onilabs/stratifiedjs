@ = require('sjs:test/std');
@context("tar") {||
  @stream = require('sjs:nodejs/stream');
  var { @TemporaryDir } = require('sjs:nodejs/tempfile');
  var fixtureDir = @url.normalize('../fixtures', module.id) .. @url.toPath();
  var fixtures = @fs.readdir(fixtureDir) .. @sort;
  @assert.ok(fixtures.length > 5, JSON.stringify(fixtures));

  @tar = require('sjs:nodejs/tar');

  ;[false, true] .. @each {|compress|
    var desc = compress?" (gzip)":"";
    var tarFlag = compress?'z':'';
    @test("create" + desc) {||
      @TemporaryDir {|dest|
        @fs.readdir(dest) .. @assert.eq([])
        var input = @tar.pack(fixtureDir);
        if(compress) input = input .. @tar.gzip;
        var proc = @childProcess.launch('tar', ['x'+tarFlag, '--strip=1'], {stdio:['pipe', 1, 2], cwd:dest});
        waitfor {
          input .. @stream.pump(proc.stdin);
          @info("ending tar");
          proc.stdin.end();
        } and {
          proc .. @childProcess.wait({throwing:true});
        }

        @fs.readdir(dest) .. @sort .. @assert.eq(fixtures)
      }
    }

    @test("extract"+desc) {||
      @TemporaryDir {|dest|
        @fs.readdir(dest) .. @assert.eq([])
        var proc = @childProcess.launch('tar',
          ['c'+tarFlag, @path.basename(fixtureDir)],
          {stdio:['ignore', 'pipe', 2], cwd:@path.dirname(fixtureDir)}
        );
        waitfor {
          var contents = proc.stdout .. @stream.contents();
          if(compress) contents = contents .. @tar.gunzip;
          contents .. @tar.extract({path: dest, strip:1});
          @fs.readdir(dest) .. @sort .. @assert.eq(fixtures)
        } and {
          proc .. @childProcess.wait({throwing:true});
        }
      }
    }
  }
}.serverOnly();
