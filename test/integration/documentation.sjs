var {context, test, assert} = require("sjs:test/suite");

exports.testLibrary = function(hub) {
  context {|| // serverOnly

    var seq = require('sjs:sequence');
    var sys = require('builtin:apollo-sys');
    var {ownKeys} = require('sjs:object');
    var string = require('sjs:string');
    var array = require('sjs:array');
    var {toArray, each, map, filter, find, sort, join, hasElem} = seq;
    var url = require('sjs:url');
    var logging = require('sjs:logging');
    var docutil = require('sjs:docutil');
    var moduleRoot = require.resolve(hub).path .. url.toPath;

    var findAll = function(str, pattern) {
      var matches = [];
      var match;
      while((match = pattern.exec(str)) != null) {
        matches.push(match);
      }
      return matches;
    }

    var fs = require("sjs:nodejs/fs");
    var path = require("nodejs:path");
    var isSJS = f -> f .. string.endsWith('.sjs');
    var removeSJS = f -> f.replace(/\.sjs$/, '');

    function walk(root, emit) {
      var walkDir = function(base) {
        var expand = (f) -> path.join(base, f);
        var items = fs.readdir(base);
        var [dirs, files] = (items
          .. seq.partition(f -> fs.isDirectory(expand(f)))
          .. seq.map(toArray));

        emit([base, dirs, files]);
        dirs .. seq.each(d -> walkDir(expand(d)));
      }

      walkDir(root);
    }


    var indexFilename = "sjs-lib-index.txt";
    var dirsFound = 0;

    walk(moduleRoot) {|item|
      var [base, dirs, files] = item;
      var sjsFiles = files .. filter(isSJS) .. sort;
      if (sjsFiles.length == 0) continue;
      var modules = sjsFiles .. map(removeSJS);

      dirsFound++;
      context(path.basename(base)) {||
        try {
          var indexContents = fs.readFile(path.join(base, indexFilename)).toString();
        } catch(e) {
          test("contains #{indexFilename}", -> assert.fail(e.message));
          continue;
        }
        var indexDoc = docutil.parseSJSLibDocs(indexContents);

        seq.zip(sjsFiles, modules) .. each {|[filename, module]|

          var fullPath = path.join(base, filename);
          var relativePath = path.relative(moduleRoot, fullPath);
          var moduleSrc = fs.readFile(fullPath).toString();
          var moduleDoc = docutil.parseModuleDocs(moduleSrc);

          var topLevel = sym -> !string.contains(sym, '.');
          var documentedSymbols = moduleDoc.symbols .. ownKeys .. filter(topLevel) .. sort;

          var home = hub + fullPath.slice(moduleRoot.length).replace(/\.sjs$/,'').replace(/\\/g,'/');

          var moduleTests = context(filename) {||
            context{||
              var err = null;
              var moduleExports;
              try {
                moduleExports = require(home.replace(/#/g, escape)) .. ownKeys .. sort;
              } catch(e) {
                err = e;
              }

              if (err) {
                test("should be importable") {||
                  assert.fail(err);
                }
              } else {
                test("documents only exported symbols") {|s|
                  logging.info("documentedSymbols = #{documentedSymbols..join(",")}");
                  logging.info("moduleExports = #{moduleExports..join(",")}");
                  documentedSymbols .. array.difference(moduleExports) .. assert.eq([]);
                }

                //TODO?
                //test("documents all exported symbols") {|s|
                //  moduleExports .. array.difference(documentedSymbols) .. assert.eq([]);
                //}.skipIf(['numeric',] .. hasElem(module), "whitelisted")
              }
            }.skipIf(moduleDoc.hostenv && moduleDoc.hostenv != sys.hostenv, moduleDoc.hostenv)

            if (moduleDoc.home !== undefined) {
              // we just check for invalid home paths - missing ones are OK
              test('has the correct `home` path') {||
                assert.eq(moduleDoc.home, home);
              }
            }

            test("documentation is valid") {|s|
              logging.info("documented exports: #{documentedSymbols .. join(", ")}");
              documentedSymbols .. each {|sym|
                var symdoc = moduleDoc.symbols[sym];

                assert.ok(/^[a-zA-Z][_a-zA-Z0-9]*$/.test(sym), "Invalid symbol: #{sym}");
                assert.ok(symdoc.summary, "missing summary for #{sym}");

                // general known keys across all symbols
                var knownKeys = [
                      'name',
                      'type',
                      'summary',
                      'desc',
                      'hostenv',
                ];
                switch(symdoc.type) {
                  case 'function':
                    if (symdoc.param) {
                      var params = Array.isArray(symdoc.param) ? symdoc.param : [symdoc.param];
                      params .. each {|p|
                        assert.ok(p.name, "#{sym} param name");
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
                      assert.ok(returnDoc.valtype, "#{sym} return type");
                    }
                    break;
                  case 'variable':
                    break;
                  default:
                    assert.fail("unknown type: #{symdoc.type}", sym);
                    break;
                }
                var unknownKeys = symdoc .. ownKeys .. toArray .. array.difference(knownKeys);
                assert.eq(unknownKeys, [], "unknown function keys for #{sym}");
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
      }
    }

    test("sanity check") {||
      assert.ok(dirsFound > 3, "only traversed #{dirsFound} dirs - is this check working?");
    }

  }.serverOnly();
};
