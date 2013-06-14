var {context, test, assert} = require("sjs:test/suite");

context {|| // serverOnly

  var seq = require('sjs:sequence');
  var sys = require('builtin:apollo-sys');
  var {ownKeys} = require('sjs:object');
  var string = require('sjs:string');
  var array = require('sjs:array');
  var {toArray, each, map, filter, find, sort, join} = seq;
  var url = require('sjs:url');
  var logging = require('sjs:logging');
  var docutil = require('sjs:docutil');

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
  var moduleRoot = path.join(url.toPath(module.id), '../../../modules');
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
      var indexContents = fs.readFile(path.join(base, indexFilename)).toString();
      var indexDoc = docutil.parseSJSLibDocs(indexContents);

      test("module index includes all modules") {|s|
        
        // modules we intentionally aren't documenting yet
        var HIDDEN = ['docutil'];

        indexDoc.type .. assert.eq('lib');

        var expectedDirs = dirs .. filter(function(d) {
          return fs.readdir(path.join(base, d)) .. find(isSJS);
        }) .. sort;

        var expectedModules = modules .. filter(m -> !(HIDDEN .. array.contains(m)));

        indexDoc.dirs .. ownKeys .. sort .. assert.eq(expectedDirs, "directory list");
        indexDoc.modules .. ownKeys .. sort .. assert.eq(expectedModules .. sort, "module list");
      }

      seq.zip(sjsFiles, modules) .. each {|pair|
        var [filename, module] = pair;

        var fullPath = path.join(base, filename);
        var relativePath = path.relative(moduleRoot, fullPath);
        var moduleSrc = fs.readFile(fullPath).toString();
        var moduleDoc = docutil.parseModuleDocs(moduleSrc);

        var topLevel = sym -> !string.contains(sym, '.');
        var documentedSymbols = moduleDoc.symbols .. ownKeys .. filter(topLevel) .. sort;

        var moduleIndexDoc = indexDoc.modules[module];

        var moduleTests = context(filename) {||
          test("matches module index") {|s|
            moduleDoc.module .. assert.eq(relativePath .. removeSJS, 'module ID');
            moduleDoc.home .. assert.eq("sjs:#{moduleDoc.module}", 'module home');
            if (moduleIndexDoc.summary) {
              moduleDoc.summary .. assert.eq(moduleIndexDoc.summary, 'module summary');
            }
          }

          context{||
            var err = null;
            var moduleExports;
            try {
              moduleExports = require(moduleDoc.home) .. ownKeys .. sort;
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
              //}.skipIf(['numeric',] .. array.contains(module), "whitelisted")
            }
          }.skipIf(moduleDoc.hostenv && moduleDoc.hostenv != sys.hostenv, moduleDoc.hostenv)

          test("documentation is valid") {|s|
            logging.info("documented exports: #{documentedSymbols .. join(", ")}");
            documentedSymbols .. each {|sym|
              var symdoc = moduleDoc.symbols[sym];

              assert.ok(/^[a-zA-Z][_a-zA-Z0-9]*$/.test(sym), "Invalid symbol: #{sym}");
              assert.eq(symdoc.name, sym);
              assert.ok(symdoc.summary, "missing summary for #{sym}");

              // general known keys across all symbols
              var knownKeys = [
                    'name',
                    'type',
                    'summary',
                    'desc',
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
                    'hostenv',
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
      }
    }
  }

  test("sanity check") {||
    assert.ok(dirsFound > 5, "only traversed #{dirsFound} dirs - is this check working?");
  }

}.serverOnly();
