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
@logging.setLevel(process.env['GUP_XTRACE'] == '1' ? @logging.VERBOSE : @logging.WARN);
function dependUpon(path) {
  if(process.env['GUP_TARGET']) {
    @childProcess.run('gup', ['-u', path]);
  }
}
dependUpon(module.id .. @url.toPath);

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
      modules = modules .. @map(mod -> @isString(mod) ? {id: mod} : mod);
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

    // skip plain duplicates:
    if (requiredModules .. @any([m, env] -> @eq(m, mod))) continue;

    // find number of occurences for this module
    var hostenvs = HOSTENVS .. @filter(h -> hostModules[h] .. @any(m -> m.id === mod.id)) .. @toArray;

    // extend any existing entry (e.g `sys` is imported in both nodejs and xbrowser):
    var existing = requiredModules .. @filter([m, env] -> @eq(m.id, mod.id)) .. @toArray;
    if (existing.length) {
      // we can combine "include" module specifications:
      var isMergeable = (m) -> m .. @ownKeys .. @sort .. @toArray .. @eq(['id', 'include']);
      var target;
      if (mod .. isMergeable) {
        target = existing .. @find(isMergeable, undefined);
      }
      if (target) {
        // extend previous module
        target[0].include = target[0].include .. @union(mod.include);
        target[1] = target[1] .. @union(hostenvs);
      } else {
        // group duplicate modile entries together
        requiredModules.splice(requiredModules.indexOf(existing .. @at(-1)), 0, [mod, hostenvs]);
      }
    } else {
      // add new module
      requiredModules.push([mod, hostenvs]);
    }
  }


  var moduleSource = {};
  var generatedDocs = [];
  var moduleAliases = {};

  requiredModules
  .. @sortBy([mod, ] -> mod.id.toLowerCase())
  .. @each {|[mod, hostenvs]|
    var generatedDoc = generatedDocs .. @at(-1, null);
    if (!generatedDoc || generatedDoc[0] != mod.id) {
      generatedDoc = [mod.id, hostenvs, []];
      generatedDocs.push(generatedDoc);
    }
    var moduleSymbolDocs = {};

    var claim = function(name, sym, moduleDocs) {
      if (!name) throw new Error("can't claim symbol: #{name}");
      if (moduleSource[name] === mod.id) return;

      var symbolDocs = moduleDocs ? moduleDocs.children[sym] : null;

      if (symbolDocs && symbolDocs.type == 'class' && !symbolDocs.children[sym]) {
        // It's just a class - there's no runtime symbol of the same name, so we can ignore it.
        @info("skipping non-symbol class #{sym} (#{mod.id})");
        return;
      }

      if (moduleSource[name]) throw new Error("conflict: #{name} (in both #{moduleSource[name]} and #{mod.id})");
      moduleSource[name] = mod.id;
      if (sym) {
        var type = symbolDocs .. @get('type');
        moduleSymbolDocs[name] = " - **#{name}**: (#{type} [#{mod.id}::#{sym}])";
      } else {
        moduleAliases[name] = " - **#{name}**: (module #{makeModuleLink(mod.id)})";
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
      var modulePath = require.resolve(mod.id).path .. @url.toPath;
      dependUpon(modulePath);
      var moduleDocs = modulePath .. @fs.readFile .. @docutil.parseModuleDocs;
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

    // append (sorted) symbols to this module's list of symbol docs
    moduleSymbolDocs
    .. @ownPropertyPairs
    .. @sortBy([key, val] -> key.toLowerCase())
    .. @each {|[key,val]|
      generatedDoc[2].push(val);
    }
  }
  @assert.ok(generatedDocs.length > 0, "docs are empty!");

  function makeModuleLink(id) {
    if (id .. @startsWith("nodejs:")) {
      var mod = id.substr(7);
      return "[#{id}](http://nodejs.org/api/#{mod}.html)";
    } else {
      return "[#{id}](##{encodeURIComponent(id)})";
    }
  };

  function initModuleDoc(id, hostenvs) {
    var link = makeModuleLink(id);
    var header = ["\n\n### Symbols from the #{link} module:"];
    if (hostenvs.length < HOSTENVS.length) {
      header.push("*(when in the #{hostenvs .. @join("/")} environment)*");
    }
    header.push(""); // blank line
    return header;
  };

  moduleAliases = moduleAliases
    .. @ownPropertyPairs
    .. @sortBy([key, val] -> key.toLowerCase());

  if(moduleAliases.length) {
    description += "\n\n### Module aliases:\n\n";
    description += moduleAliases .. @transform(pair -> pair[1]) .. @join("\n");
  }

  description += generatedDocs
    .. @filter([id, hostenvs, docs] -> docs.length > 0)
    .. @transform([id, hostenvs, docs] -> initModuleDoc(id, hostenvs).concat(docs))
    .. @concat
    .. @join("\n");

  // indent lines
  description = description.split("\n") .. @map(line -> "  #{line}") .. @join("\n");
  return "@desc\n#{description}\n";
};
