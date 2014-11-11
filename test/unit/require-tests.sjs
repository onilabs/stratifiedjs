var testUtil = require('../lib/testUtil');
var testEq = testUtil.test;
var global = require('sjs:sys').getGlobal();
var http = require('sjs:http');
var logging = require('sjs:logging');
var { find, sort, toArray, each } = require('sjs:sequence');
var { merge, ownKeys } = require('sjs:object');
var { startsWith, endsWith } = require('sjs:string');
var {test, assert, context} = require('sjs:test/suite');
var Url = require('sjs:url');

var dataRoot = './fixtures';

test.beforeEach {||
  require.modules .. ownKeys .. toArray() .. each {|id|
    if(id .. startsWith(Url.normalize('./fixtures', module.id))) {
      delete require.modules[id];
    }
  }
}


testEq('force extension/sjs', "a=1&b=2", function() {
  return Url.buildQuery({a:1},{b:2});
});

testEq('force extension/js', 42, function() {
  return require(dataRoot + '/testmodule.js').foo(1);
});

testEq('"this" object in modules', this, function() {
  return require(dataRoot + '/testmodule.js').bar.apply(global);
});

context("server-side") {||
  var child_process = require('sjs:nodejs/child-process');
  var path = require('nodejs:path');
  var fs = require('sjs:nodejs/fs');

  var modulePath = path.join(Url.toPath(module.id), '../');
  var sjsPath = require('sjs:sys').executable;
  var dataPath = path.join(modulePath, dataRoot);

  var run_with_env = function(args, env)
  {
    try {
      var rv = child_process.run(process.execPath, [sjsPath].concat(args), {
        env: merge(process.env, env || process.env)
      });
      return {stdout: rv.stdout, stderr: rv.stderr};
    } catch(e) {
      logging.warn(e.stderr);
      throw e;
    }
  }
  
  test('sjs -e') {|s|
    var result = run_with_env(['-e', 'console.log("hi");'], null);
    result .. assert.eq({stdout: 'hi\n', stderr: ''})
  }
  
  test('hub resolution via $SJS_INIT') {|s|
    var hub_path = path.join(dataPath, 'literal-hub.sjs');
    var script = 'console.log(require("literal:exports.hello=\'HELLO!\'").hello);';
    var result = run_with_env(['-e', script], {SJS_INIT: hub_path});
    result .. assert.eq({stdout: 'HELLO!\n', stderr: ''});
  }

  test('loading .sjs from NODE_PATH') {|s|
    var script = 'try{}or{}; console.log(require("nodejs:child1.sjs").child1_function1());';
    var result = run_with_env(['-e', script], {NODE_PATH: dataPath});
    result .. assert.eq({stdout: '42\n', stderr: ''});
  }

  test('loading relative module from cwd()') {|s|
    var script = 'console.log(require("./fixtures/child1").child1_function1())';
    var orig = process.cwd();
    try {
      process.chdir(Url.normalize('./', module.id) .. Url.toPath);
      var result = run_with_env(['-e', script]);
    } finally {
      process.chdir(orig);
    }
    result .. assert.eq({stdout: '42\n', stderr: ''});
  }

  test('loading .sjs (without an extension) from NODE_PATH') {|s|
    var script = 'waitfor{}or{}; console.log(require("nodejs:child1").child1_function1());';
    var result = run_with_env(['-e', script], {NODE_PATH: dataPath});
    result .. assert.eq({stdout: '42\n', stderr: ''});
  }

  test('export to "this" (when requiring a nodeJS module)') {|s|
    var script = 'require("nodejs:testmodule", {copyTo: this}); console.log(foo(1));';
    var result = run_with_env(['-e', script], {NODE_PATH: dataPath});
    result .. assert.eq({stdout: '42\n', stderr: ''});
  }

  test('require.resolve() on valid nodejs modules') {||
    // at least one of these will be installed (either it's a dev environment or a self-install bundle)
    var packages = [
      ['karma-sjs-adapter', path.join('karma-sjs-adapter', 'index.js')],
      ['tar',               path.join('tar', 'tar.js')],
    ];
    var found = 0;
    packages .. each {|[name, tail]|
      var requireName = "nodejs:" + name;
      var resolved;
      try {
        resolved = require.resolve(requireName).path;
      } catch(e) {
        logging.warn("Couldn't resolve #{requireName}");
      }

      if (resolved) {
        logging.info("resolved #{requireName} -> #{resolved}");
        found++;
        assert.ok(fs.exists(resolved), "Doesn't exist: #{resolved}");
        assert.ok(resolved .. endsWith(tail), resolved);
      }
    }
    assert.ok(found > 0, "didn't find any nodejs packages");
  }

  test('require.resolve() on missing nodejs modules') {||
    assert.raises({message: "nodejs module at 'this_module_intentionally_missing' not found"}) {||
      require.resolve('nodejs:this_module_intentionally_missing');
    }
  }

  test('require inside a .js file is synchronous') {||
    require('./fixtures/testmodule.js').dynamicRequire() .. assert.eq(1);
  }.skip('BROKEN');

  test('require.resolve on sjs file without .sjs extension') {||
    ['sjs-module','app-module.app'] .. each {|filename|
      var path = require.resolve("./fixtures/#{filename}").path;
      path .. endsWith(filename) .. assert.ok(path);
      require("./fixtures/#{filename}").ok() .. assert.ok("module self-check");
    }
  }

  test("relative node_modules resolution") {||
    var dep = require(dataRoot + '/npm_dep');
    dep.js.name .. assert.eq("dep1");
    dep.js.child.name .. assert.eq("dep2");

    dep.sjs.name .. assert.eq("dep1");
    dep.sjs.child().name .. assert.eq("dep2");
  }

}.serverOnly();

test('require.resolve() on sjs modules') {||
  var sjsRoot = (require.hubs .. find(h -> h[0] === 'sjs:'))[1];
  assert.ok(sjsRoot);
  require.resolve('sjs:test/suite').path .. assert.eq(Url.normalize(sjsRoot + 'test/suite.sjs', module.id));
}

testEq('export to "this"', 42, function() {
  return require(dataRoot + '/parent').export_to_this;
}).ignoreLeaks('child1_function1');

testEq('utf8 characters in modules: U+00E9', 233, function() {
  var data = require(dataRoot + '/utf8').test1();
  return data.charCodeAt(data.length-1);
});

testEq('utf8 characters in modules: U+0192', 402, function() {
  var data = require(dataRoot + '/utf8').test2();
  return data.charCodeAt(data.length-1);
});

test('circular reference returns the unfinished module') {||
  var mod = require('./fixtures/circular_a');
  mod .. assert.eq({
    start: 1,
    end: 1,
    b_module: {
      c_module: {
        a_module: {
          start: 1,
        }
      }
    },
  });
};

test('circular reference (loaded in parallel) returns the unfinished module') {||
  waitfor {
    var mod = require('./fixtures/circular_a');
  } and {
    require('./fixtures/circular_c');
  }
  mod .. assert.eq({
    start: 1,
    end: 1,
    b_module: {
      c_module: {
        a_module: {
          start: 1,
        }
      }
    },
  });
}.skip("BROKEN");

test('non-circular reference waits for the full module') {||
  var path = require.resolve('./fixtures/slow_exports').path;
  waitfor {
    require(path) .. ownKeys .. sort .. assert.eq(['fast_export', 'slow_export']);
  } and {
    while(true) {
      hold(0);
      var mod = require.modules[path];
      if (mod && mod.exports.fast_export) break;
    }
    // the module should appear eagerly in require.modules, but
    // not returned from require() until it's fully loaded
    require.modules[path].exports .. ownKeys .. toArray .. assert.eq(['fast_export']);
    require(path) .. ownKeys .. sort .. assert.eq(['fast_export', 'slow_export']);
  }
};

test('failed module does not end up in require.paths') {||
  var path = require.resolve('./fixtures/slow_error').path;
  waitfor {
    assert.raises({message: "intentional error"}, -> require(path));
    assert.ok(require.modules[path] === undefined);
  } and {
    while(true) {
      hold(0);
      var mod = require.modules[path];
      if (mod && mod.exports.fast_export) break;
    }
    // the module should appear eagerly in require.modules, but
    // not returned from require() until it's fully loaded
    require.modules[path].exports .. ownKeys .. toArray .. assert.eq(['fast_export']);
    assert.raises({message: "intentional error"}, -> require(path));
  }
};

context('hubs.defined()') {||
  test('sjs:', -> require.hubs.defined("sjs:") .. assert.eq(true));
  test('github:', -> require.hubs.defined("github:") .. assert.eq(true));
  test('sj', -> require.hubs.defined("sj") .. assert.eq(true));
  test('sjs:somemod', -> require.hubs.defined("sjs:somemod") .. assert.eq(true));
  test('sjs_', -> require.hubs.defined("sjs_") .. assert.eq(false));
}

context('hubs.addDefault()') {||
  test.beforeEach {|s|
    s.hubs = require.hubs.slice();
    s.hublen = require.hubs.length;
  }
  test.afterEach {|s|
    // reset require.hubs content
    // (but not the object itself, as it has methods not present on Array)
    require.hubs.splice.apply(require.hubs, [0, require.hubs.length].concat(s.hubs));
    require.hubs.length .. assert.eq(s.hubs.length); // sanity check
  }

  test('for new hub') {|s|
    require.hubs.addDefault(['newhub:', 'file:///']) .. assert.ok();
    require.hubs.length .. assert.eq(s.hublen + 1);
  }

  test('for existing hub') {|s|
    require.hubs.addDefault(['sjs:somemod', 'file:///']) .. assert.notOk();
    require.hubs.addDefault(['sj', 'file:///']) .. assert.notOk();
    require.hubs.length .. assert.eq(s.hublen);
  }
}
