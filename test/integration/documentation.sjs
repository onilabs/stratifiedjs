@ = require('sjs:test/std');
@regexp = require('sjs:regexp');
@docutil = require('sjs:docutil');

var isSJS = f -> f .. @endsWith('.sjs');
var removeSJS = f -> f.replace(/\.sjs$/, '');
var appendSJS = f -> f + '.sjs';

exports.testLibrary = function(hub) {
  var moduleRoot = require.resolve(hub).path .. removeSJS;
  var dirsFound = 0;

  if (@sys.hostenv === 'nodejs') {
    moduleRoot = moduleRoot .. @url.toPath;

    var findAll = function(str, pattern) {
      var matches = [];
      var match;
      while((match = pattern.exec(str)) != null) {
        matches.push(match);
      }
      return matches;
    }


    var walk = function(root, emit) {
      var walkDir = function(base) {
        var expand = (f) -> @path.join(base, f);
        var items = @fs.readdir(base);
        var [dirs, files] = (items
          .. @partition(f -> @fs.isDirectory(expand(f)))
          .. @map(@toArray));

        emit([base, dirs, files]);
        dirs .. @each(d -> walkDir(expand(d)));
      }

      walkDir(root);
    }

    var indexFilename = "sjs-lib-index.txt";

    walk(moduleRoot) {|item|
      var [base, dirs, files] = item;
      var sjsFiles = files .. @filter(isSJS) .. @sort;
      if (sjsFiles.length == 0) continue;
      var modules = sjsFiles .. @map(removeSJS);

      dirsFound++;
      @context(@path.basename(base)) {||
        try {
          var indexContents = @fs.readFile(@path.join(base, indexFilename)).toString();
        } catch(e) {
          @test("contains #{indexFilename}", -> @assert.fail(e.message));
          continue;
        }
        var indexDoc = @docutil.parseSJSLibDocs(indexContents);

        @zip(sjsFiles, modules) .. @each {|[filename, module]|

          var fullPath = @path.join(base, filename);
          var moduleSrc = @fs.readFile(fullPath).toString();

          var relativePath = @path.relative(moduleRoot, @path.join(base, module));
          testModule(moduleSrc, relativePath);
        }
      }
    }
  } else {
    // xbrowser hostenv:
    // use sjs-lib-index.json to walk library
    var moduleIndex = @http.json([moduleRoot, 'sjs-lib-index.json']);
    var fst = v -> v[0];
    var walk = function(root, emit) {
      var walkDir = function(node, prefix) {
        var children = node .. @get('children');
        var expand = (f) -> "#{prefix}/#{f}";
        if(!prefix) expand = f -> f;

        var [dirs, files] = children .. @ownPropertyPairs
          .. @partition([k,v] -> k .. @endsWith('/'));

        emit([prefix, files..@map(fst)]);
        dirs .. @each([key, child] -> walkDir(child, key));
      }
      walkDir(root, null);
    }

    walk(moduleIndex) {|item|
      var [dir, modules] = item;
      dirsFound++;
      var sjsFiles = modules .. @map(appendSJS);
      var ctx = (dir || hub) .. @strip('/');
      ctx = ctx.replace(/^.*\//, '');
      @context((dir || hub) .. @strip('/')) {||
        @zip(sjsFiles, modules) .. @each {|[filename, module]|
          var relativePath = (dir||'') + filename;
          var relativeUrl = relativePath.split('/') .. @map(encodeURIComponent) .. @join('/');
          var moduleSrc = @http.get([moduleRoot, relativeUrl, {format:"src"}]);
          testModule(moduleSrc, relativePath);
        }
      }
    }
  }

  @test("sanity check") {||
    @assert.ok(dirsFound > 3, "only traversed #{dirsFound} dirs - is this check working?");
  }

  function testModule(moduleSrc, relativePath) {
    var moduleDoc = @docutil.parseModuleDocs(moduleSrc);

    var topLevel = sym -> !@contains(sym, '.');
    var documentedSymbols = moduleDoc .. @get('children') .. @ownKeys .. @filter(topLevel) .. @sort;

    var home = hub + relativePath.replace(/\.sjs$/,'').replace(/\\/g,'/');

    var moduleTests = @context(relativePath) {||
      @context{||
        var err = null;
        var moduleExports;
        try {
          moduleExports = require(home.replace(/#/g, escape)) .. @ownKeys .. @sort;
        } catch(e) {
          err = e;
        }

        if (err) {
          @test("should be importable") {||
            @assert.fail(err);
          }
        } else {
          @test("documents only exported symbols") {|s|
            // filter out symbols that are specifically unavailable in this hostenv
            function shouldBeImportable(sym) {
              var hostenv = moduleDoc.children[sym].hostenv;
              return (hostenv == null || hostenv === @sys.hostenv);
            }

            var hostenvSymbols = documentedSymbols .. @filter(shouldBeImportable) .. @toArray;
            @info("documentedSymbols = #{hostenvSymbols..@join(",")}");
            @info("moduleExports = #{moduleExports..@join(",")}");
            hostenvSymbols .. @difference(moduleExports) .. @assert.eq([]);
          }
          @test("documents at least one symbol") {|s|
            @assert.ok(documentedSymbols.length > 0);
          }

          //TODO?
          //@test("documents all exported symbols") {|s|
          //  moduleExports .. @difference(documentedSymbols) .. @assert.eq([]);
          //}.skipIf(['numeric',] .. @hasElem(relativePath), "whitelisted")
        }
      }.skipIf(moduleDoc.hostenv && moduleDoc.hostenv != @sys.hostenv, moduleDoc.hostenv)

      if (moduleDoc.home !== undefined) {
        // we just check for invalid home paths - missing ones are OK
        @test('has the correct `home` path') {||
          @assert.eq(moduleDoc.home, home);
        }
      }

      @test("documentation is valid") {|s|
        @info("documented exports: #{documentedSymbols .. @join(", ")}");
        documentedSymbols .. @each {|sym|
          var symdoc = moduleDoc.children[sym];

          @assert.ok(/^[a-zA-Z][_a-zA-Z0-9]*$/.test(sym), "Invalid symbol: #{sym}");
          @assert.ok(symdoc.summary, "missing summary for #{sym}");

          // general known keys across all symbols
          var knownKeys = [
                'name',
                'type',
                'summary',
                'desc',
                'hostenv',
          ];

          symdoc .. @ownPropertyPairs .. @each {|[key, value]|
            if (!@isString(value)) continue;
            var mistakenReferences = value .. @regexp.matches(/\{[^}]*::.*}/g) .. @toArray;
            if (mistakenReferences.length > 0) {
              @assert.fail("Mistaken references in #{sym}@#{key}?\n    #{mistakenReferences .. @join("\n    ")}\n(use `[]`, not `{}`)");
            }
          };

          switch(symdoc.type) {
            case 'function':
              if (symdoc.param) {
                var params = Array.isArray(symdoc.param) ? symdoc.param : [symdoc.param];
                params .. @each {|p|
                  @assert.ok(p.name, "#{sym} param name");
                }
              }
              // known keys for functions
              knownKeys = knownKeys.concat([
                'param',
                'return',
                'valtype',
                'setting',
                'deprecated',
                'altsyntax',
                'shortcut',
              ]);

              var returnDoc = symdoc['return'];
              if (returnDoc) {
                @assert.ok(returnDoc.valtype, "#{sym} return type");
              }
              break;
            case 'variable':
              break;
            default:
              @assert.fail("unknown type: #{symdoc.type}", sym);
              break;
          }
          var unknownKeys = symdoc .. @ownKeys .. @toArray .. @difference(knownKeys);
          @assert.eq(unknownKeys, [], "unknown function keys for #{sym}");
        }

        // if there's a "TODO: document" in the module, skip these tests.
        if (/TODO:( \([a-z]+\))? document/.test(moduleSrc)) {
          moduleTests.skip("TODO");
        }

        if (moduleDoc.nodoc) {
          moduleTests.skip("@nodoc");
        }

      }
    }
  }
};

