@ = require([
  'sjs:object',
  'sjs:array',
  'sjs:sequence',
  'sjs:string',
  'sjs:compare',
  {id:'sjs:assert', name:'assert'},
  {id:'sjs:logging', include:['print','debug','verbose','info','warn','error']},
  {id:'sjs:logging', name:'logging'},
  {id:'sjs:sys', include: ['argv', 'eval']},
  {id:'sjs:url', name: 'url'},
  {id:'nodejs:path', name: 'path'},
  {id:'sjs:nodejs/fs', name: 'fs'},
  {id:'sjs:nodejs/child-process', name: 'childProcess'},
]);

var @docutil = require('sjs:docutil');
@logging.setLevel(process.env['REDO_XTRACE'] ? @logging.VERBOSE : @logging.WARN);
if(process.env['REDO_TARGET']) {
  @childProcess.run('redo-ifchange', [module.id .. @url.toPath]);
}

exports.generateDocDescription = function(contents, description) {
  // eval stdlib with a mocked-out `require()`
  var realRequire = require('builtin:apollo-sys').require;
  @assert.ok(realRequire);

  var hostModules = {};
  HOSTENVS = ['nodejs', 'xbrowser'];
  HOSTENVS .. @each {|hostenv|
    var mockRequire = function(modules) {
      if (modules .. @startsWith('builtin:')) {
        // bootstrap part - return actual result
        var result = realRequire.apply(null, arguments);
        result.hostenv = hostenv;
        return result;
      }

      @assert.ok(Array.isArray(modules));
      hostModules[hostenv] = modules;
      return {}; // we don't actually use the results
    };
    global.require = mockRequire;

    var module = {exports:{}};
    @eval("(
    function(module, require) {
      #{contents};
    })")(module,mockRequire);
  }

  var requiredModulesUnion = @concat(HOSTENVS .. @map(h -> hostModules[h]));
  // build a list of [mod, hostenvs] from both hostenv sets:
  var requiredModules = [];
  requiredModulesUnion .. @each {|mod|

    // skip duplicates:
    if (requiredModules .. @find([m, env] -> @eq(m, mod))) continue;

    // find number of occurences for this module
    var hostenvs = HOSTENVS .. @filter(h -> hostModules[h] .. @find(m -> m .. @eq(mod))) .. @toArray;
    requiredModules.push([mod, hostenvs]);
  }


  var moduleSource = {};
  var generatedDocs = [];
  requiredModules .. @each {|[mod, hostenvs]|
    if (@isString(mod)) mod = { id: mod };

    var generatedDoc = generatedDocs .. @at(-1, null);
    if (!generatedDoc || generatedDoc[0] != mod.id) {
      generatedDoc = [mod.id, initModuleDoc(mod.id, hostenvs)];
      generatedDocs.push(generatedDoc);
    }
    var docs = generatedDoc[1];

    var claim = function(name, sym) {
      if (!name) throw new Error("can't claim symbol: #{name}");
      if (moduleSource[name]) throw new Error("conflict: #{name}");
      moduleSource[name] = mod.id;
      if (sym) {
        var type = moduleDocs.children[sym] .. @get('type');
        docs.push(" - **#{name}**: (#{type} [#{mod.id}::#{sym}])");
      } else {
        docs.push(" - **#{name}**: (module #{makeModuleLink(mod.id)})");
      }
    };
    var claimAll = function(syms, moduleDocs) {
      @info("#{mod.id} - claiming:\n  #{syms .. @join("\n  ")}");
      syms .. @each(s -> claim(s, s, moduleDocs));
    };

    if(mod.name) {
      @info("claiming #{mod.name}");
      claim(mod.name);
    } else {
      var moduleDocs = require.resolve(mod.id).path .. @url.toPath .. @fs.readFile .. @docutil.parseModuleDocs;
      if (mod.include) {
        mod.include .. claimAll(moduleDocs);
      } else {
        moduleDocs.children
          .. @ownKeys
          .. @toArray
          .. @difference(mod.exclude || [])
          .. claimAll(moduleDocs);
      }
    }
  }
  @assert.ok(generatedDocs.length > 0, "docs are empty!");

  function makeModuleLink(id) {
    if (id .. @startsWith("nodejs:")) {
      var mod = id.substr(7);
      return "[#{id}](http://nodejs.org/api/#{mod}.html)";
    } else {
      return "[#{id}::]";
    }
  };

  function initModuleDoc(id, hostenvs) {
    var link = makeModuleLink(id);
    var header = ["### From the #{link} module:"];
    if (hostenvs.length < HOSTENVS.length) {
      header.push("*(when in the #{hostenvs .. @join("/")} environment)*");
    }
    return header;
  };

  description += generatedDocs .. @transform(pair -> pair[1]) .. @concat .. @join("\n");

  // indent lines
  description = description.split("\n") .. @map(line -> "  #{line}") .. @join("\n");
  return "@desc\n#{description}\n";
};
