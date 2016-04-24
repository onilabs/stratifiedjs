@ = require('sjs:test/std');
@regexp = require('sjs:regexp');
@docutil = require('sjs:docutil');

var isSJS = f -> f .. @endsWith('.sjs');
var removeSJS = f -> f.replace(/\.sjs$/, '');
var appendSJS = f -> f + '.sjs';

if (@sys.hostenv === 'nodejs') {
  exports.walk = function(root, emit) {
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
  };
}

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

    var indexFilename = "sjs-lib-index.txt";

    exports.walk(moduleRoot) {|item|
      var [base, dirs, files] = item;
      var sjsFiles = files .. @filter(isSJS) .. @sort;
      if (sjsFiles.length == 0) continue;
      var modules = sjsFiles .. @map(removeSJS);

      dirsFound++;
      @context() {||
        try {
          var indexContents = @fs.readFile(@path.join(base, indexFilename)).toString();
        } catch(e) {
          @test("contains #{indexFilename}", -> @assert.fail(e.message));
          continue;
        }
        var indexDoc = @docutil.parseSJSLibDocs(indexContents);

        sjsFiles .. @each {|filename|

          var fullPath = @path.join(base, filename);
          var moduleSrc = @fs.readFile(fullPath).toString();

          var module = filename .. removeSJS();
          var modulePath = @path.relative(moduleRoot, @path.join(base, module)).replace(/\\/g,'/');
          testModule(moduleSrc, modulePath);
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
        var expand = (f) -> prefix+f;
        if(!prefix) expand = f -> f;

        var [dirs, files] = children .. @ownPropertyPairs
          .. @partition([k,v] -> k .. @endsWith('/'));

        emit([prefix, files..@map(fst)]);
        dirs .. @each([key, child] -> walkDir(child, expand(key)));
      }
      walkDir(root, null);
    }

    walk(moduleIndex) {|item|
      var [dir, modules] = item;
      dirsFound++;
      //var sjsFiles = modules .. @map(appendSJS);
      var ctx = dir ? dir .. @split('/') .. @at(-2) : undefined;
      @context(ctx) {||
        modules .. @each {|module|
          var modulePath = (dir||'') + module;

          var relativeUrl = modulePath.split('/') .. @map(encodeURIComponent) .. @join('/') .. appendSJS();

          try {
            var moduleSrc = @http.get([moduleRoot, relativeUrl, {format:"src"}]);
          } catch(e) {
            @test(modulePath) {||
              @assert.fail(e);
            }
            continue;
          }
          testModule(moduleSrc, modulePath);
        }
      }
    }
  }

  @test("sanity check") {||
    @assert.ok(dirsFound > 3, "only traversed #{dirsFound} dirs - is this check working?");
  }

  function testModule(moduleSrc, modulePath) {
    var moduleDoc = @docutil.parseModuleDocs(moduleSrc);

    var topLevel = sym -> !@contains(sym, '.');
    var isMetadataModule = moduleDoc.type === 'doc';

    var documentedSymbols = moduleDoc .. @get('children') .. @ownKeys;
    if (!isMetadataModule) {
      documentedSymbols = documentedSymbols .. @filter(topLevel);
    }
    documentedSymbols = documentedSymbols .. @sort;

    var home = hub + modulePath;

    var moduleTests = @context(modulePath) {||
      @context{||
        var err = null;
        var moduleExports;
        var objectKeys = {} .. @keys .. @toArray;
        try {
          moduleExports = require(home.replace(/#/g, escape))
            .. @keys .. @toArray .. @difference(objectKeys)
            .. @sort;
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
              var doc = moduleDoc.children[sym];
              if (['class','feature'] .. @hasElem(doc.type)) {
                // these types aren't actually runtime symbols
                return false;
              }
              var hostenv = doc.hostenv;
              return (hostenv == null || hostenv === @sys.hostenv);
            }

            var hostenvSymbols = documentedSymbols .. @filter(shouldBeImportable) .. @toArray;
            @info("documentedSymbols = #{hostenvSymbols..@join(",")}");
            @info("moduleExports = #{moduleExports..@join(",")}");
            hostenvSymbols .. @difference(moduleExports) .. @assert.eq([]);
          }
          .skipIf(isMetadataModule, 'metadata module')
          .skipIf(modulePath .. @contains('doc-template'), 'whitelisted')
          ;

          @test("documents at least one symbol") {|s|
            @info('Docs:', moduleDoc);
            @assert.ok(documentedSymbols.length > 0);
          }
          .skipIf(['module-guidelines', 'std', 'dom-shim', 'moment', 'moment-timezone'] .. @hasElem(modulePath .. @split('/') .. @at(-1)), 'whitelisted')
          .skipIf(['google_api'] .. @hasElem(modulePath .. @split('/') .. @at(-2, false)), 'whitelisted')
          .skipIf(['app'] .. @hasElem(modulePath), 'whitelisted')
          .skipIf(moduleDoc.executable, "executable module")
          ;

          //TODO?
          //@test("documents all exported symbols") {|s|
          //  moduleExports .. @difference(documentedSymbols) .. @assert.eq([]);
          //}.skipIf(['numeric',] .. @hasElem(modulePath), "whitelisted")
        }
      }.skipIf(moduleDoc.hostenv && moduleDoc.hostenv !== @sys.hostenv, moduleDoc.hostenv)

      if (moduleDoc.home !== undefined) {
        // we just check for invalid home paths - missing ones are OK
        @test('has the correct `home` path') {||
          @assert.eq(moduleDoc.home, home);
        }
      }

      @test("documentation is valid") {|s|
        if (moduleDoc.hostenv) {
          ['nodejs','xbrowser'] .. @assert.contains(moduleDoc.hostenv);
        }
        @info("documented exports: #{documentedSymbols .. @join(", ")}");
        documentedSymbols .. @each {|sym|
          var symdoc = moduleDoc.children[sym];

          var metaTypes = ['syntax','feature','directive'];
          if (!metaTypes .. @hasElem(symdoc.type)) {
            @assert.ok(/^[a-zA-Z][._a-zA-Z0-9]*$/.test(sym), "Invalid symbol: #{sym}");
          }
          @assert.ok(symdoc.summary, "missing summary for #{sym}");

          // general known keys across all symbols
          var knownKeys = [
                'name',
                'type',
                'summary',
                'desc',
                'hostenv',
                'demo',
          ];

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
              knownKeys = knownKeys.concat([
                'valtype',
              ]);
              break;
            case 'class':
              knownKeys = knownKeys.concat([
                'children',
                'inherit',
              ]);
              break;
            case 'syntax':
            case 'feature':
            case 'directive':
              break;
            default:
              @assert.fail("unknown type: #{symdoc.type}", sym);
              break;
          }
          var unknownKeys = symdoc .. @ownKeys .. @toArray .. @difference(knownKeys);
          @assert.eq(unknownKeys, [], "unknown documentation keys for #{sym}");

          symdoc .. @ownPropertyPairs .. @each {|[key, value]|
            if (!@isString(value)) continue;
            var mistakenReferences = value .. @regexp.matches(/\{[^}]*::.*}/g) .. @toArray;
            if (mistakenReferences.length > 0) {
              @assert.fail("Mistaken references in #{sym}@#{key}?\n    #{mistakenReferences .. @join("\n    ")}\n(use `[]`, not `{}`)");
            }

            var todos = value .. @regexp.matches(/TODO|XXX|FIXME/g) .. @toArray;
            if (todos.length > 0) {
              @assert.fail("TODO in documentation for #{sym}@#{key}:\n    #{value}");
            }
          };

        }
      }
    }

    // if there's a "TODO: document" in the module, skip these tests.
    if (/TODO:( \([a-z]+\))? document/.test(moduleSrc)) {
      moduleTests.skip("TODO");
    }

    if (moduleDoc.nodoc) {
      moduleTests.skip("@nodoc");
    }
  }
};

