var {test, context, assert} = require('sjs:test/suite');

context {||

  var fs = require('sjs:nodejs/fs');
  var object = require('sjs:object');
  var url = require('sjs:url');
  var seq = require('sjs:sequence');
  var { each } = seq;

  var bundle = require('sjs:bundle');
  var basePath = url.normalize('./', module.id) .. url.toPath;

  var createBundle = function(settings) {
    var tmpfile = '/tmp/sjs-test-bundle.js';
    bundle.create(settings .. object.merge({"bundle":tmpfile}));
    var contents = fs.readFile(tmpfile).toString();

    // set up some "globals"
    var __oni_rt_bundle = {};
    var document = {
      location: {
        origin: 'HOST'
      }
    };

    eval(contents);
    return __oni_rt_bundle;
  }

  var bundledModuleNames = function(bundle) {
    var rv = object.ownPropertyPairs(bundle.h) .. seq.sortBy(h -> h[0]) .. seq.map([name, entries] -> [name, entries .. seq.map(e -> e[0])]);
    var modules = object.ownKeys(bundle.m) .. seq.toArray();
    if (modules.length > 0) {
      rv.push([null, modules]);
    }
    return rv;
  };

  var fixtureUrl = url.normalize('./fixtures/utf8.sjs', module.id);

  test("includes module dependencies") {||
    var bundle = createBundle({
      resources: ["#{basePath}=/"],
      sources: ['sjs:xbrowser/console', fixtureUrl],
    });

    bundle .. bundledModuleNames .. assert.eq([
      [ 'sjs:', ['array.sjs', 'object.sjs','sequence.sjs', 'string.sjs', 'xbrowser/console.sjs']],
      [ null,   ['HOST/fixtures/utf8.sjs']]
    ]);
  }

  test("only root (non-alias) hubs are included in the result") {||
    var deps = createBundle({
      hubs: ["foo:=sjs:"],
      sources: ['foo:sys'],
      compile: true,
    }) .. bundledModuleNames();
    deps.map(d -> d[0]) .. assert.eq(['sjs:']);
    deps[0][1] .. assert.contains('sys.sjs');
  }

  test("resources can be given as object properties") {||
    var resources = {};
    resources[basePath] = "/";
    var [hub, modules] = createBundle({
      resources: resources,
      sources: [fixtureUrl],
    }) .. bundledModuleNames() .. seq.at(0);

    modules .. assert.contains('HOST/fixtures/utf8.sjs');
  }

  test("precompilation produces JS function sources") {||
    var modules = createBundle({
      sources: ['sjs:xbrowser/console'],
      compile: true,
    }).h['sjs:'];

    assert.ok(modules.length > 0);

    modules.map(m -> m[1]) .. each {|mod|
      String(typeof(mod)) .. assert.eq('function');
    }
  }

}.serverOnly();
