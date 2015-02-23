@ = require('sjs:test/std');

@context {||
  @stream = require('sjs:nodejs/stream');
  
  // appveyor runs as admin, so there's no place we can't create a file :/
  var isAdministrator = Boolean(@isWindows && process.env.APPVEYOR);
  var nonexistentFile = (@isWindows ? "C:\\" : "/") + "cant_access_this_file";

  @test.beforeAll {|s|
    s.root = @path.join(process.env['TEMPDIR'] || process.env['TEMP'] || '/tmp', 'sjs-fs-tests');
    if (!@fs.isDirectory(s.root)) {
      @fs.mkdir(s.root);
    }
    s.path = -> @path.join.apply(null, [s.root].concat(arguments .. @toArray));
  }

  @test.afterAll {|s|
    @childProcess.run('rm', ['-r', s.root], {stdio:'inherit'});
  }
    
  @context("WriteStream") {||
    @test("works") {|s|
      @fs.withWriteStream(s.path('output')) {|f|
        'data' .. @stream.pump(f, {end:false});
      }
      @fs.readFile(s.path('output'), 'utf-8') .. @assert.eq('data');
    }

    @test("it's OK to call end() twice") {|s|
      @fs.withWriteStream(s.path('output')) {|f|
        'data' .. @stream.pump(f, {end:true});
        f.end();
      }
      @fs.readFile(s.path('output'), 'utf-8') .. @assert.eq('data');
    }

    @test("throws error creating file with insufficient permissions") {||
      @assert.raises({filter: e -> e.code === 'EACCES' || e.code === 'EPERM' }) {||
        @fs.withWriteStream(nonexistentFile, -> null);
      }
    }.skipIf(isAdministrator);
  }

  @context("ReadStream") {||
    @test.beforeAll() {|s|
      @fs.writeFile(s.path('data'), 'Hello world', 'utf-8');
    }

    @test("works") {|s|
      var contents;
      @fs.withReadStream(s.path('data'), {encoding:'utf-8'}) {|f|
        contents = f .. @stream.contents .. @join();
      }
      contents .. @assert.eq('Hello world');
    }

    @test("it's OK to call destroy() twice") {|s|
      @fs.withReadStream(s.path('output')) {|f|
        f.destroy();
      }
    }

    @test("throws error opening nonexistent file") {||
      @assert.raises({filter: e -> e.code === 'ENOENT'}) {||
        @fs.withReadStream(nonexistentFile, -> null);
      }
    }
  }

  @context("reading / writing sequence::Streams") {||
    @test("writeFile") {|s|
      var numbers = @integers(0, 10);
      var contents = numbers .. @transform(String).. @intersperse('\n');
      contents .. @isStream .. @assert.ok('contents is not a stream');
      s.path('data') .. @fs.writeFile(contents, 'utf-8');
      @fs.readFile(s.path('data'), 'utf-8') .. @assert.eq(numbers .. @join('\n'));
    }

    @test("fileContents") {|s|
      var numbers = @integers(0, 10);
      s.path('data') .. @fs.writeFile(numbers .. @join('\n'));
      var contents = @fs.fileContents(s.path('data'), 'utf-8');
      contents .. @isStream .. @assert.ok('contents is not a stream');
      contents .. @join() .. @assert.eq(numbers .. @join('\n'));
    }
  }
}.serverOnly();
