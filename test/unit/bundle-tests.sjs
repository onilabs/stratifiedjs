var {test, context, assert} = require('sjs:test/suite');

context {||

  var fs = require('sjs:nodejs/fs');
  var path = require('nodejs:path');
  var object = require('sjs:object');
  var url = require('sjs:url');
  var seq = require('sjs:sequence');
  var arr = require('sjs:array');
  var { each, map, hasElem } = seq;

  var bundle = require('sjs:bundle');
  var basePath = url.normalize('./', module.id) .. url.toPath;

  var tmpfile = path.join(process.env['TEMP'] || '/tmp', 'sjs-test-bundle.js');
  var createdBundles = [];
  test.afterAll {||
    createdBundles .. each {|f|
      if(fs.exists(f)) fs.unlink(f);
    }
  }

  var createBundle = function(settings) {
    settings = {"output":tmpfile} .. object.merge(settings);
    var output = settings.output;
    if(output && !createdBundles .. hasElem(settings.output)) {
      createdBundles.push(settings.output);
    }

    var contents = bundle.create(settings);
    if(output) {
      contents = fs.readFile(settings.output).toString();
    } else {
      contents = contents .. seq.join('\n');
    }

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

  var fixtureUrl = url.normalize('./fixtures/', module.id);
  var fixtureDependencies = [
    '/fixtures/annotated_child1.sjs',
    '/fixtures/annotated_child2.sjs',
    '/fixtures/bundle_parent.sjs',
    '/fixtures/child1.sjs',
    '/fixtures/merge_child1.sjs',
    '/fixtures/merge_child2.sjs',
  ];

  var fixtureDependencyUrls = fixtureDependencies .. map(d -> 'HOST' + d);

  test("includes module dependencies") {||
    var bundle = createBundle({
      resources: ["#{basePath}=/"],
      sources: [
        'sjs:xbrowser/console',
        fixtureUrl + 'bundle_parent.sjs'
      ],
    });

    bundle .. bundledModuleNames .. assert.eq([
      [ 'sjs:', ['array.sjs', 'cutil.sjs', 'object.sjs','sequence.sjs', 'string.sjs', 'xbrowser/console.sjs']],
      [ null, fixtureDependencyUrls]
    ]);
  }

  test("can exclude hubs") {||
    var bundle = createBundle({
      resources: ["#{basePath}=/"],
      sources: [
        'sjs:xbrowser/console',
        fixtureUrl + 'bundle_parent.sjs'
      ],
      exclude: ['sjs:'],
    });

    bundle .. bundledModuleNames .. assert.eq([
      [ null, fixtureDependencyUrls]
    ]);
  }

  test("can ignore hubs") {||
    var bundle = createBundle({
      resources: ["#{basePath}=/"],
      sources: [
        'sjs:xbrowser/console',
        fixtureUrl + 'bundle_parent.sjs'
      ],
      ignore: ['sjs:'],
    });

    bundle .. bundledModuleNames .. assert.eq([
      [ null, fixtureDependencyUrls]
    ]);
  }

  test("modules included in a test condition") {||
    var bundle = createBundle({
      resources: ["#{basePath}=/"],
      sources: [
        fixtureUrl + 'hostenv_detect.sjs'
      ],
    });

    bundle .. bundledModuleNames .. assert.eq([
      [ 'sjs:', ['sys.sjs']],
      [ null, ['HOST/fixtures/hostenv_detect.sjs']]
    ]);
  }

  context("multiple bundles") {||
    test("excludes modules that are present in an existing bundle") {||
      var settings = {
        resources: ["#{basePath}=/"],
        output: tmpfile,
        sources: [ fixtureUrl + 'child1.sjs' ],
      };
      var bundle = createBundle(settings) .. bundledModuleNames;
      var bundle2 = createBundle(settings .. object.merge({
        output: null,
        excludeFrom:[tmpfile],
        sources: [fixtureUrl + 'bundle_parent.sjs']})) .. bundledModuleNames;

      var expectedDeps = fixtureDependencyUrls.slice();
      expectedDeps .. arr.remove('HOST/fixtures/child1.sjs') .. assert.ok();
      bundle2 .. assert.eq([[null, expectedDeps]]);
    }.skip("Not yet implemented");

    test("can load existing bundles") {||
      bundle.create({
        sources: ['sjs:sys', fixtureUrl + 'bundle_parent.sjs'],
        resources: ["#{basePath}=/"],
        output: tmpfile,
      });

      var contents = bundle.contents(tmpfile);
      contents .. assert.eq([ 'sjs:sys.sjs' ].concat(fixtureDependencies));
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
  }

  test("resources can be given as object properties") {||
    var resources = {};
    resources[basePath] = "/";
    var [hub, modules] = createBundle({
      resources: resources,
      sources: [fixtureUrl + 'utf8.sjs'],
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
