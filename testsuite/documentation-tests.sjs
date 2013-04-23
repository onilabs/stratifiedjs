var {context, test, assert} = require("sjs:test/suite");
context {|| // serverOnly

var seq = require('sjs:sequence');
var string = require('sjs:string');
var {toArray, each, map, filter, find, sort} = seq;
var url = require('sjs:nodejs/url');

var findAll = function(str, pattern) {
  var matches = [];
  var match;
  while((match = pattern.exec(str)) != null) {
    matches.push(match);
  }
  return matches;
}


context("module index files") {||

  var fs = require("sjs:nodejs/fs");
  var path = require("nodejs:path");
  var moduleRoot = path.join(url.toPath(module.id), '../../modules');

  function walk(root, emit) {
    var walkDir = function(base) {
      var expand = (f) -> path.join(base, f);
      var items = fs.readdir(base);
      var [dirs, files] = (items
        .. seq.partition(f -> fs.isDirectory(expand(f)))
        .. seq.map(toArray) .. toArray);

      emit([base, dirs, files]);
      dirs .. seq.each(d -> walkDir(expand(d)));
    }

    walkDir(root);
  }

  var indexFilename = "sjs-lib-index.txt";
  var dirsFound = 0;
  var isSJS = f -> f .. string.endsWith('.sjs');

  walk(moduleRoot) {|item|
    var [base, dirs, files] = item;
    var sjsFiles = files .. filter(isSJS) .. toArray;
    if (sjsFiles.length == 0) continue;

    dirsFound++;
    test(base) {||
      files .. assert.contains(indexFilename);
      var indexContents = fs.readFile(path.join(base, indexFilename)).toString();
      var listedDirs = indexContents .. findAll(/@dir\s+(\S+)/g) .. map(m -> m[1]) .. sort .. toArray;
      var listedFiles = indexContents .. findAll(/@module\s+(\S+)/g) .. map(m -> m[1] + '.sjs') .. sort .. toArray;

      var expectedDirs = dirs .. filter(function(d) {
        return fs.readdir(path.join(base, d)) .. find(isSJS);
      });

      listedDirs .. assert.eq(expectedDirs .. sort .. toArray);
      listedFiles .. assert.eq(sjsFiles .. sort .. toArray);
    }
  }

  test("sanity check") {||
    assert.ok(dirsFound > 5, "only traversed #{dirsFound} dirs - is this check working?");
  }
}

}.serverOnly();
