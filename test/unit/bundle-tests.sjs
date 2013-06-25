var {test, context, assert} = require('sjs:test/suite');

context {||

  var fs = require('sjs:nodejs/fs');
  var object = require('sjs:object');
  var url = require('sjs:url');
  var seq = require('sjs:sequence');
  var { each } = seq;

  var bundle = require('sjs:bundle');
  var modulesPath = url.normalize('../../modules/', module.id) .. url.toPath;

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

  test("includes module dependencies") {||
    var modules = createBundle({
      alias: ["#{modulesPath}=/apollo/"],
      sources: ['sjs:xbrowser/console'],
    });

    var exportedKeys = object.ownKeys(modules) .. seq.sort();
    // unfortunately brittle based on what xbrowser/console actually imports...
    assert.eq(exportedKeys, [
      'HOST/apollo/array.sjs',
      'HOST/apollo/object.sjs',
      'HOST/apollo/sequence.sjs',
      'HOST/apollo/string.sjs',
      'HOST/apollo/xbrowser/console.sjs',
    ]);
  }

  test("alias sources are expanded") {||
    var modules = createBundle({
      alias: ["sjs:=/apollo/"],
      sources: ['sjs:string'],
      compile: true,
    });

    modules .. object.ownKeys .. assert.contains('HOST/apollo/string.sjs');
  }

  test("precompilation produces JS function sources") {||
    var modules = createBundle({
      alias: ["#{modulesPath}=/apollo/"],
      sources: ['sjs:xbrowser/console'],
      compile: true,
    });

    modules .. object.ownValues .. each {|mod|
      String(typeof(mod)) .. assert.eq('function');
    }
  }

}.serverOnly();
