#!/usr/bin/env sjs
/*
 * StratifiedJS 'bundle' module
 *
 * Part of the StratifiedJS Standard Module Library
 * Version: '0.20.0-development'
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2013 Oni Labs, http://onilabs.com
 *
 * This file is licensed under the terms of the MIT License:
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */

/**
  @module  bundle
  @summary Create SJS code bundles
  @home    sjs:bundle
  @executable
  @hostenv nodejs
  @desc
    StratifiedJS' module system encourages you to break your code into
    individual modules. This is good for code maintainability, but can
    slow the load time of an application that uses many modules if each
    module is requested serially over a HTTP connection with high latency.

    The bundle module provides a way to package up all the modules your
    application needs into a single javascript file. This reduces the
    number of requests made while loading your application, and allows the
    module sources to be downloaded in parallel with the SJS runtime itself.
    It also strips comments from source code, to reduce file size.

    **Note**: since SJS code is dynamic, it is impossible to fully determine
    which modules your application imports. The dependency resolver will
    *only* include modules that it can statically determine will *always* be
    used - this generally only covers `require("moduleName")` statements
    at the top-level of your module. For dynamically-required modules that you
    want to include in your bundle, you will need to explicitly include them
    as inputs to the bundle.

    This module can be imported from SJS code, but it can also be directly
    invoked from the command line by running e.g:

        sjs sjs:bundle --help

    ### Creating bundles

    Although multiple functions are exported from this module, most users
    will only need to use [::create]. See the [::create] docs for information
    on creating a bundle (whether via the API or command-line).

    ### Using bundles

    To use a module bundle, add it like any other javascript file in
    your HTML header:
    
        <script src="/bundle.js"></script>

    Once the bundle has been downloaded by your browser,
    require(moduleName) will load `moduleName` from the bundle,
    rather than requesting the module file over HTTP. Normally you
    should place this file before `stratified.js`, so that the
    bundled modules will be ready by the time your inline SJS is
    executed.

    Any modules not present in the bundle will be loaded in the usual
    way over HTTP - the bundle is just a cache to speed things up.

    You can include multiple bundle files in a single HTML document,
    for example to use one bundle for your third-party dependencies
    and another bundle for just your application code. Bundles will
    add to the existing set of cached module sources.
*/

var compiler = require('./compile/deps.js');

var fs = require('sjs:nodejs/fs');
var url = require('sjs:url');
var { coerceToURL } = url;
var seq = require('sjs:sequence');
var { each, toArray, map, transform, filter, concat, sort, any } = seq;
var str = require('sjs:string');
var regexp = require('sjs:regexp');
var { split, rsplit, startsWith } = str;
var object = require('sjs:object');
var { hasOwn, ownKeys, ownValues, ownPropertyPairs, pairsToObject } = object;
var docutil = require('sjs:docutil');
var assert = require('sjs:assert');
var logging = require('sjs:logging');
var { isArrayLike } = require('builtin:apollo-sys');
@path = require('nodejs:path');

var fst = pair -> pair[0];
var snd = pair -> pair[1];

var stringToPrefixRe = function(s) {
  if (str.isString(s)) return new RegExp('^' + regexp.escape(s));
  else return s;
};

var shouldExcude = function(path, patterns) {
  return patterns .. seq.any(function(pat) {
    if (pat.test(path)) {
      logging.verbose("Excluding: #{path}");
      return true;
    }
    return false;
  });
}

/**
  @function findDependencies
  @summary scan source modules for static dependencies
  @param {Array} [sources] Module paths (array of strings)
  @param {Settings} [settings]
  @return {Object}
  @desc
    Returns a structure suitable for passing to [::generateBundle].
    
    Most code should not need to use this function directly - see [::create].
*/
function findDependencies(sources, settings) {
  settings = sanitizeOpts(settings);
  var deps = {};
  var resources = settings.resources;
  var hubs = settings.hubs;
  var excludes = settings.ignore;
  var strict = settings.strict;
  logging.verbose("resources:", resources);

  var getId = function(id) {
    // rationalize full paths *back* into hub shorthand using only
    // explicitly-referenced hubs (and then those in aliases), assuming that all
    // such hubs will be configured on the client
    var aliases = usedHubs .. ownPropertyPairs .. concat(resources);
    var depth=0;
    aliases .. each {|[name, path]|
      logging.debug("checking if #{id} startswith #{path}");
      if (id .. str.startsWith(path)) {
        id = name + id.substr(path.length);
        logging.debug("Shortened -> #{id}");
      }
    }
    if (!(id .. str.startsWith('file://'))) return id;
    throw new Error("No module ID found for #{id} (missing a resource mapping?)");
  }

  var usedHubs = {};

  function addRequire(requireName, parent) {
    if (shouldExcude(requireName, excludes)) return;

    logging.verbose("Processing: " + requireName);
    var module = {
      deps: [],
      loaded: false,
    };

    var src;
    var resolved;

    // resolve relative require names & builtin hubs
    requireName = resolveHubs(requireName, hubs, usedHubs);
    if (requireName.indexOf(':', 2) === -1) {
      requireName = url.normalize(requireName, parent.path);
      logging.debug("normalized to " + requireName);
    }
    if (shouldExcude(requireName, excludes)) return;


    // resolve with builtin hubs
    try {
      resolved = require.resolve(requireName);
      logging.verbose("Resolved: ", resolved);
    } catch (e) {
      throw new Error("Error resolving " + requireName + ":\n" + e);
    }

    if (shouldExcude(requireName, excludes)) return;
    if (parent && parent.deps) parent.deps.push(resolved.path);

    if (deps .. object.hasOwn(resolved.path)) {
      logging.debug("(already processed)");
      return;
    }
    module.path = resolved.path;
    module.id = getId(resolved.path);
    deps[module.path] = module;

    try {
      src = resolved.src(resolved.path).src;
    } catch (e) {
      throw new Error("Error loading " + resolved.path + ":\n" + e);
    }

    var calls;
    try {
      calls = compiler.compile(src);
    } catch (e) {
      throw new Error("Error compiling " + resolved.path + ":\n" + e);
    }
    module.loaded = true;

    calls .. seq.each {|[name, args]|
      if (name === 'require') {
        if (!isArrayLike(args[0])) {
          addRequire(args[0], module);
        }
        else {
          args[0] .. each {|arg|
            if (typeof(arg) === 'string') {
              addRequire(arg, module);
            } else {
              if (arg && arg.id) {
                addRequire(arg.id, module);
              }
            }
          }
        }
      }
    };

    var docs = docutil.parseModuleDocs(src);
    if(docs.require) {
      docs.require .. each {|req|
        addRequire(req, module);
      }
    }
  }

  if (!strict) {
    addRequire = relax(addRequire);
  }

  var root = {
    path: url.fileURL(process.cwd()) + "/",
  };
  logging.debug("ROOT:", root);
  sources .. each {|mod|
    logging.debug("Adding source: #{mod}");
    addRequire(mod, root);
  }

  // filter out usedHubs that didn't end up with any modules under them
  usedHubs = usedHubs .. withoutUnusedHubs(deps .. ownValues .. toArray);

  return {
    hubs: usedHubs,
    modules: deps,
  };
}
exports.findDependencies = findDependencies;

var withoutUnusedHubs = function(hubs, modules) {
  // filter out hubs that didn't end up with any modules under them
  return hubs .. ownPropertyPairs .. seq.filter(function([hub,_]) {
    return modules .. any(mod -> mod.id .. startsWith(hub));
  }) .. pairsToObject;
};

var relax = function(fn) {
  // wraps `fn`, but turns exceptions into warnings
  return function() {
    try {
      return fn.apply(this, arguments);
    } catch(e) {
      logging.warn(e.message || String(e));
    }
  }
}

/**
  @function generateBundle
  @summary generate a .js bundle file from the given module sources
  @param {Object} [deps] The result of [::findDependencies]
  @param {Settings} [settings]
  @return {sequence::Stream} Stream of Strings
  @desc
    Generates a stream of bundle file content lines.
    
    Most code should not need to use this function directly - see [::create].
*/
function generateBundle(deps, settings) {
  settings = sanitizeOpts(settings);
  var compile;
  if (settings.compile) { 
    var compiler = require('./compile/sjs');
    var stringifier = require('./compile/stringify');
    compile = function(src, path) {
      if (@path.extname(path) === '.js')
        return stringifier.compile(src, {keeplines:true});
      else {
        var js = compiler.compile(src, {globalReturn:true, filename: "'#{path.replace(/\'/g,'\\\'')}'"});
        return "function(#{require.extensions['sjs'].module_args.join(',')}) {
          #{js}
        }";
      }
    };
  } else {
    var stringifier = require('./compile/stringify');
    compile = (src, path) -> stringifier.compile(src, {keeplines: true});
  }

  var strict = settings.strict;
  var excludes = settings.exclude;

  var rv = seq.Stream {|write|
    write("(function() {");
    write("if(typeof(__oni_rt_bundle) == 'undefined')__oni_rt_bundle={};");
    write("var o = document.location.origin, b=__oni_rt_bundle;");
    write("if(!b.h) b.h={};");
    write("if(!b.m) b.m={};");

    var isNotExcluded = ([path, mod]) ->
      !(shouldExcude(path, excludes) || (mod.id && shouldExcude(mod.id, excludes)));

    var usedModules = deps.modules .. ownPropertyPairs
      .. seq.filter(isNotExcluded)
      .. seq.sortBy(fst);

    var hubNames = deps.hubs
      .. withoutUnusedHubs(usedModules .. map(snd))
      .. ownKeys
      .. sort;

    hubNames .. each {|name|
      logging.debug("Adding hub: #{name}");
      var nameExpr = JSON.stringify(name);
      // ensure bundle.hubs[name] is an array
      write("if(!b.h[#{nameExpr}])b.h[#{nameExpr}]=[];");
    }

    var addDep = function([path,dep]) {
      logging.debug("Adding path #{path}");
      var id = dep.id;
      if (!id) {
        throw new Error("No ID for #{dep.path}");
      }

      var setContents;
      var idExpr = JSON.stringify(id);
      if (id .. str.startsWith('/')) {
        idExpr = "o+#{idExpr}";
      }

      hubNames .. each {|name|
        if (id .. str.startsWith(name)) {
          // if ID starts with a known hub, add it to the appropriate hub array
          setContents = (c) -> write("b.h[#{JSON.stringify(name)}].push([#{JSON.stringify(id.substr(name.length))}, #{c}]);");
          break;
        }
      }
      if (!setContents) {
        // if ID is not hub-based, write it as an absolute module ID
        setContents = (c) -> write("b.m[#{idExpr}]=#{c};");
      }

      var resolved = require.resolve(dep.path);
      var contents = resolved.src(dep.path).src;

      var initialSize = contents.length;
      logging.verbose("Compiling: #{dep.path}");
      contents = compile(contents, dep.path);
      var minifiedSize = contents.length;
      var percentage = ((minifiedSize/initialSize) * 100).toFixed(2);
      logging.info("Bundled #{id} [#{percentage}%]");

      setContents(contents);
    }.bind(this);

    if (!strict) addDep = relax(addDep);

    usedModules .. each(addDep);

    // support for sjs script's 'wait-for-bundle' attribute; see apollo-sys-xbrowser.sjs:
    write("if(typeof(__oni_rt_bundle_hook) === 'function') __oni_rt_bundle_hook();");

    write("})();");
  }
  return rv;
}
exports.generateBundle = generateBundle;

/**
  @function contents
  @summary List the modules defined in a given bundle
  @param {String|Object} [bundle] Bundle source
  @return {Array} The module URLs defined in the bundle
  @desc
    The `bundle` argument should be one of:

      - a string
      - an object with a `file` property
      - an object with a `contents` property

    In the first two cases, the contents will be loaded
    from the given file path.

    The returned URLs will be however ths bundle defines them.
    At present, bundles contain all of the following
    URL types when needed:

      - unresolved hub-based URLs, e.g "sjs:sequence.sjs"
      - path-only URLs, e.g "/lib/foo.sjs"
      - full URLs, e.g "http://example.com/lib/foo.sjs"
*/
exports.contents = function(bundle) {
  if (str.isString(bundle)) {
    bundle = { file: bundle }
  };
  var bundleContents = bundle.file ? fs.readFile(bundle.file) : bundle.contents;
  assert.ok(bundleContents, "bundle contents are empty");
  // In order to load arbitrary bundles, we emulate the browser vars
  // that the bundle code uses, then eval() that and see what modules
  // got defined
  var loader = eval("
    (function(__oni_rt_bundle, document) {
      #{bundleContents};
    })"
  );
  var bundle = {}, document = {location: { origin: '' }};
  loader(bundle, document);
  var urls = [];
  bundle.h .. ownPropertyPairs .. each {|[hub, modules]|
    modules .. each {|[path, contents]|
      urls.push(hub + path);
    }
  }
  urls = urls.concat(bundle.m .. ownKeys .. toArray);
  return urls;
};

/**
  @function create
  @summary Generate a module bundle from the given sources (including dependencies)
  @param {Settings} [settings]
  @setting {Array} [sources] **Required:** Array of source module names to scan
  @setting {Object} [resources] **Usually required:** Resource locations (a mapping of server-side path to client-side URL)
  @setting {String} [output] **Usually required:** File path of bundle file to write
  @setting {Object} [hubs] Additional hub locations
  @setting {Bool} [compile] Precompile to JS (larger file size but quicker startup)
  @setting {Bool} [skipFailed] Skip modules that can't be resolved / loaded
  @setting {Array} [ignore] Array of ignored paths (to skip entirely)
  @setting {Array} [exclude] Array of excluded paths (will be processed, but omitted from bundle)
  @desc
    The settings provided to this function match the options given
    to this module when run from the command line.

    If `output` is given, the file will be written and the
    dependency information (as from [::findDependencies]) will be returned.

    Otherwise, the resulting bundle wil be returned as a [sequence::Stream] of
    (JavaScript) source code strings (as from [::generateBundle]).

    Run `sjs sjs:bundle --help` to see a full
    description of what these options do.

    ### Required options:

    Most of the time, you will need to at least provide:

     - `sources` (inputs)
     - `resources` (mapping of on-disk locations to runtime URLs)
     - `output` (bundle destination path)

    If you are only bundling modules that already appear in `require.hubs`, you won't need
    to specify any `resources`.

    ### Example:

        bundle.create({
          output:"bundle.js",
          resources: {
            # the current working directory (on the server) corresponds to /static/ (in a browser)
            "./": "/static/"
          },
          hubs: {
            # the dependency analyser should look for "lib:foo" under "components/foo"
            # (this is only required for hubs that are not already in `require.hubs`)
            "lib:": "components/"
          },
          sources: [
            "app/main.sjs",
            "sjs:sequence"
          ]
        });

        // wrote "bundle.js"
*/

var resolveHubs = function(path, localAliases, usedHubs) {
  // resolve up to one hub alias
  // if usedHubs is provided, its keys will be populated
  // with any aliases used
  var changed = true;
  var depth = 0;
  var aliases = require.hubs .. filter(h -> h[1] .. str.isString());
  if (localAliases) aliases = localAliases .. concat(aliases);
  while(changed) {
    if(depth++ > 10) throw new Error("Too much hub recursion");
    changed = false;
    aliases .. each {|[prefix, dest]|
      logging.debug("checking if #{path} startswith #{prefix}");
      if (path .. str.startsWith(prefix)) {
        if (usedHubs && !usedHubs .. hasOwn(prefix)) {
          usedHubs[prefix] = dest;
        }
        path = dest + path.slice(prefix.length);
        logging.verbose("resolved -> #{path}");
        changed = true;
        break;
      }
    }
  }
  return path;
};

var toPairs = function(obj, splitter, name) {
  // yields ownPropertyPairs if `obj` is an object
  // returns unmodified obj if it is already a nested array
  // calls `splitter` on each value if `obj` is an array of strings
  // (this assumes elements of `obj` are all strings)
  if (obj === undefined) return [];
  if (Array.isArray(obj)) {
    if (Array.isArray(obj[0])) {
      return obj;
    }
    return obj .. transform(function(s) {
      var rv = splitter(s);
      if (rv.length !== 2) {
        throw new Error("Invalid format for #{name} setting (expected \"key=value\"): #{s}");
      }
      return rv;
    });
  } else {
    return obj .. object.ownPropertyPairs;
  }
};

var TRAILING_SLASH_PATH = /[\\\/]$/;
var TRAILING_SLASH_URL = /\/$/;
var normalizeAliasSlashes = function(pair) {
  var [url, path] = pair;
  if(TRAILING_SLASH_URL.test(url) && !TRAILING_SLASH_PATH.test(path)) {
    pair[1] += @path.sep;
  } else if(!TRAILING_SLASH_URL.test(url) && TRAILING_SLASH_PATH.test(path)) {
    pair[0] += '/';
  }
  return pair;
};


var InternalOptions = function() { };
var sanitizeOpts = function(opts) {
  // sanitizes / canonicalizes opts.
  // Used by very function in this module so that they can
  // assume sane opts.
  opts = opts || {};
  if (opts instanceof(InternalOptions)) return opts;
  var rv = new InternalOptions();

  // require no processing:
  rv.compile = opts.compile;
  rv.sources = opts.sources;
  rv.output = opts.output;
  rv.dump = opts.dump;
  rv.strict  = !opts.skipFailed;  // srtict should be true by default

  // convert resources & hubs to array pairs with expanded paths:
  rv.resources = opts.resources
    .. toPairs(s -> s .. rsplit('=', 1), 'resources')
    .. map([path, alias] -> [alias, coerceToURL(path)])
    .. map(normalizeAliasSlashes);

  rv.hubs = opts.hubs
    .. toPairs(s -> s .. split('=', 1), 'hubs')
    .. map([prefix, path] -> [prefix, coerceToURL(path)]);

  // expand ignore / exclude paths
  rv.exclude = (opts.exclude || []) .. map(coerceToURL) .. map(stringToPrefixRe);
  rv.ignore  = (opts.ignore  || []) .. map(coerceToURL) .. concat([/^builtin:/, /\.api$/]) .. map(stringToPrefixRe);
  return rv;
};

exports.create = function(opts) {
  opts = sanitizeOpts(opts);

  var commonSettings = {
    compile: opts.compile,
  };

  var deps = findDependencies(opts.sources, opts);

  if (opts.dump)
    return deps;

  var contents = generateBundle(deps, opts);

  if (opts.output) {
    var write = function(output) {
      var {Buffer} = require('nodejs:buffer');
      contents .. each { |line|
        var buf = new Buffer(line + "\n");
        fs.write(output, buf, 0, buf.length);
      }
      logging.info("wrote #{opts.output}");
    };

    if (opts.output == '-') {
      write(process.stdout.fd);
    } else {
      var output = fs.open(opts.output, 'w');
      try {
        write(output);
      }
      finally {
        fs.close(output);
      }
    }
    return deps;
  } else {
    return contents;
  }
}

exports.main = function(args) {
  var parser = require('sjs:dashdash').createParser({
    options: [
      {
        names: ['help','h'],
        help: 'Print this help',
        type: 'bool',
      },
      {
        names: ['verbose','v'],
        help: 'Increase log level',
        type: 'arrayOfBool',
      },
      {
        names: ['quiet','q'],
        help: 'Decrease log level',
        type: 'arrayOfBool',
      },
      {
        name: 'resource',
        type: 'arrayOfString',
        help: (
          'Set the runtime URL (or server path) for an on-disk location, e.g: ' +
          '--resource components=/static/sjs/components ' +
          '--resource /lib/nodejs/sjs=http://example.org/sjs ' +
          "NOTE: The URLs used here must match the URLs used by your running application, " +
          "otherwise the bundled version will be ignored."
        ),
      },
      {
        name: 'hub',
        type: 'arrayOfString',
        help: (
          'Add a compile-time require.hub alias - only used to resolve ' +
          'files at bundle-time (see `--resource` for configuring runtime URLs). e.g.: ' +
          '--hub lib:=components/'
        ),
      },
      {
        names: ['config', 'c'],
        type: 'string',
        helpArg: 'FILE',
        help: "Extend command line options with JSON object from FILE",
      },
      {
        name: 'compile',
        type: 'bool',
        help: "Precompile to JS (larger filesize, quicker execution)",
      },
      {
        name: 'dump',
        type: 'bool',
        help: "Print dependency info (JSON)",
      },
      {
        name: 'output',
        type: 'string',
        helpArg: 'FILE',
        help: "Write bundle to FILE",
      },
      {
        name: 'skip-failed',
        type: 'bool',
        help: "skip any modules that can't be resolved / loaded, instead of failing",
      },
      {
        name: 'ignore',
        type: 'arrayOfString',
        helpArg : 'BASE',
        help: "ignore all modules under BASE",
      },
      {
        name: 'exclude',
        type: 'arrayOfString',
        helpArg : 'BASE',
        help: "exclude modules under BASE from bundle output (they are still parsed for dependencies, but omitted from the bundle. Use --ignore to skip modules entirely)",
      },
    ]
  });

  var opts = parser.parse(args);

  var usage = function() {
    process.stderr.write("Usage: #{@path.basename(process.argv[0])} #{process.argv[1]} [OPTIONS] [SOURCE [...]]\n\n");
    process.stderr.write(parser.help());
  };

  if (opts.help) {
    usage();
    process.exit(0);
  }

  var verbosity = (opts.verbose ? opts.verbose.length : 0)
                - (opts.quiet   ? opts.quiet.length   : 0);
  if (verbosity) {
    logging.setLevel(logging.getLevel() + (verbosity * 10));
  }

  // pluralize "resource" and "hub" config keys from dashdash
  ;[ ['resource', 'resources'], ['hub', 'hubs' ] ] .. each {|[orig,plural]|
    if (opts .. object.hasOwn(orig)) {
      opts[plural] = opts[orig];
    }
  };
  
  opts.sources = opts._args;

  if (opts.config) {
    var config = fs.readFile(opts.config).toString() .. JSON.parse();
    opts = object.merge(opts, config);
  }

  if (!(opts.dump || opts.output)) {
    usage();
    console.error();
    console.error("Error: One of --output or --dump options are required");
    process.exit(1);
  }

  if (opts.dump) opts.output = null;

  var deps = exports.create(opts);

  if (opts.dump) {
    console.log(JSON.stringify(deps, null, '  '));
    process.exit(0);
  }
};

if (require.main === module) {
  exports.main();
}

