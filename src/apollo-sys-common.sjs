/*
 * Oni Apollo SJS system module ('sjs:__sys') common part
 *
 * Part of the Oni Apollo StratifiedJS Runtime
 * 0.12+
 * http://onilabs.com/apollo
 *
 * (c) 2010-2011 Oni Labs, http://onilabs.com
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

/*

   The system module is spread over two parts: the 'common' part, and the
   'hostenv' specific part. 
   hostenv is one of : 'xbrowser' | 'nodejs' 

   The hostenv-specific file must provide the following functions:

   jsonp_hostenv
   getXDomainCaps_hostenv
   request_hostenv

   (we also export these for use by other libraries; see below for signatures)

*/


//----------------------------------------------------------------------
// helper functions that we use internally and export for use by other
// libraries; accessible through require('sjs:__sys')

/**
   @object global
   @summary Global object (i.e. window or global, depending on host environment)
*/
exports.global = __oni_rt.G;

/**
   @function isArrayOrArguments
   @summary  Tests if an object is an array or arguments object.
   @param    {anything} [testObj] Object to test.
   @return   {Boolean}
*/
exports.isArrayOrArguments = function(obj) {
  return Array.isArray(obj) || 
    !!(obj && Object.prototype.hasOwnProperty.call(obj, 'callee'));
};

/**
  @function flatten
  @summary Create a recursively flattened version of an array.
  @param   {Array} [arr] The array to flatten.
  @return  {Array} Flattend version of *arr*, consisting of the elements
                   of *arr*, but with elements that are arrays replaced by
                   their elements (recursively).
  @desc
    See modules/common.sjs:flatten
*/
exports.flatten = function(arr, rv) {
  var rv = rv || [];
  var l=arr.length;
  for (var i=0; i<l; ++i) {
    var elem = arr[i];
    if (exports.isArrayOrArguments(elem))
      exports.flatten(elem, rv);
    else
      rv.push(elem);
  }
  return rv;
};

/**
   @function accuSettings
   @desc 
     See modules/common.sjs:mergeSettings
*/
exports.accuSettings = function(accu, hashes) {
  hashes = exports.flatten(hashes);
  var hl = hashes.length;
  for (var h=0; h<hl; ++h) {
    var hash = hashes[h];
    for (var o in hash)
      accu[o] = hash[o];
  }
  return accu;
};


/**
  @function parseURL
  @summary Parses the given URL into components.
  @param {String} [url] URL to parse.
  @return {Object} Parsed URL as described at <http://stevenlevithan.com/demo/parseuri/js/> (using 'strict' mode).
  @desc
     Uses the parseuri function from <http://blog.stevenlevithan.com/archives/parseuri>.
*/
/*
  Implementation is taken from
  parseUri 1.2.2
  (c) Steven Levithan <stevenlevithan.com>
  MIT License
  http://blog.stevenlevithan.com/archives/parseuri
*/
exports.parseURL = function(str) {
  var o = exports.parseURL.options,
  m = o.parser.exec(str),
  uri = {},
  i = 14;
  
  while (i--) uri[o.key[i]] = m[i] || "";
  
  uri[o.q.name] = {};
  uri[o.key[12]].replace(o.q.parser, function($0, $1, $2) {
    if ($1) uri[o.q.name][$1] = $2;
  });
  
  return uri;
};
exports.parseURL.options = {
	key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
	q:   {
		name:   "queryKey",
		parser: /(?:^|&)([^&=]*)=?([^&]*)/g
	},
  // We're only using the 'strict' mode parser:
	parser: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/
};

/**
  @function  constructQueryString
  @summary Build a URL query string.
  @param {QUERYHASHARR} [hashes] Object(s) with key/value pairs.
         See below for full syntax.
  @return {String}
  @desc
    See [http.constructQueryString](#http/constructQueryString)
*/
exports.constructQueryString = function(/*hashes*/) {
  var hashes = exports.flatten(arguments);
  var hl = hashes.length;
  var parts = [];
  for (var h=0; h<hl; ++h) {
    var hash = hashes[h];
    for (var q in hash) {
      var l = encodeURIComponent(q) + "=";
      var val = hash[q];
      if (!exports.isArrayOrArguments(val))
        parts.push(l + encodeURIComponent(val));
      else {
        for (var i=0; i<val.length; ++i)
          parts.push(l + encodeURIComponent(val[i]));
      }
    }
  }
  return parts.join("&");
};

/**
  @function constructURL
  @summary Build a URL string.
  @param {URLSPEC} [urlspec] Base string and optional path strings
                   and query hashes. See docs in http module for full syntax.
  @return {String}
*/
exports.constructURL = function(/* url_spec */) {
  var url_spec = exports.flatten(arguments);
  var l = url_spec.length;
  var rv = url_spec[0];
  
  // path components:
  for (var i=1; i<l; ++i) {
    var comp = url_spec[i];
    if (typeof comp != "string") break;
    if (rv.charAt(rv.length-1) != "/") rv += "/";
    rv += comp.charAt(0) == "/" ? comp.substr(1) :comp;
  }
  
  // query string:
  var qparts = [];
  for (;i<l;++i) {
    var part = exports.constructQueryString(url_spec[i]);
    if (part.length)
      qparts.push(part);
  }
  var query = qparts.join("&");
  if (query.length) {
    if (rv.indexOf("?") != -1)
      rv += "&";
    else
      rv += "?";
    rv += query;
  }
  return rv;
};

/**
  @function isSameOrigin
  @summary Checks if the given URLs have matching authority parts.
  @param {String} [url1] First URL.
  @param {String} [url2] Second URL.
*/
exports.isSameOrigin = function(url1, url2) {
  var a1 = exports.parseURL(url1).authority;
  if (!a1) return true;
  var a2 = exports.parseURL(url2).authority;
  return  !a2 || (a1 == a2);
};


/**
  @function canonicalizeURL
  @summary Convert relative to absolute URLs and collapse '.' and '..' path
           components.
  @param {String} [url] URL to canonicalize.
  @param {String} [base] URL which will be taken as a base if *url* is relative.
  @return {String} Canonicalized URL.
*/
exports.canonicalizeURL = function(url, base) {
  var a = exports.parseURL(url);
  
  // convert relative->absolute:
  if (!a.protocol && base) {
    base = exports.parseURL(base);
    a.protocol = base.protocol;
    if (!a.authority) {
      a.authority = base.authority;
      if (!a.directory.length || a.directory.charAt(0) != '/') {
        // a is relative to base.directory
        a.directory = base.directory + a.directory;
      }
    }
  }
  
  // collapse "." & "..":
  var pin = a.directory.split("/");
  var l = pin.length;
  var pout = [];
  for (var i=0; i<l; ++i) {
    var c = pin[i];
    if (c == ".") continue;
    if (c == ".." && pout.length>1)
      pout.pop();
    else
      pout.push(c);
  }
  a.directory = pout.join("/");
  
  // build return value:
  var rv = "";
  if (a.protocol) rv += a.protocol + ":";
  if (a.authority) rv += "//" + a.authority;
  rv += a.directory + a.file;
  if (a.query) rv += "?" + a.query;
  if (a.anchor) rv += "#" + a.anchor;
  return rv;
};

/**
   @function  jsonp
   @summary   Perform a cross-domain capable JSONP-style request. 
   @param {URLSPEC} [url] Request URL (in the same format as accepted by [http.constructURL](#http/constructURL))
   @param {optional Object} [settings] Hash of settings (or array of hashes)
   @return    {Object}
   @setting {QUERYHASHARR} [query] Additional query hash(es) to append to url. Accepts same format as [http.constructQueryString](#http/constructQueryString).
   @setting {String} [cbfield="callback"] Name of JSONP callback field in query string.
   @setting {String} [forcecb] Force the name of the callback to the given string. 
*/
exports.jsonp = jsonp_hostenv; // to be implemented in hostenv-specific part


/**
   @function getXDomainCaps
   @summary Returns the cross-domain capabilities of the host environment ('CORS'|'none'|'any')
   @return {String}
*/
exports.getXDomainCaps = getXDomainCaps_hostenv; // to be implemented in hostenv-specific part


/**
   @function request
   @summary Performs a HTTP request.
   @param {URLSPEC} [url] Request URL (in the same format as accepted by [http.constructURL](#http/constructURL))
   @param {optional Object} [settings] Hash of settings (or array of hashes)
   @return {String}
   @setting {String} [method="GET"] Request method.
   @setting {QUERYHASHARR} [query] Additional query hash(es) to append to url. Accepts same format as [http.constructQueryString](#http/constructQueryString).
   @setting {String} [body] Request body.
   @setting {Object} [headers] Hash of additional request headers.
   @setting {String} [username] Username for authentication.
   @setting {String} [password] Password for authentication.
   @setting {String} [mime] Override mime type.
   @setting {Boolean} [throwing=true] Throw exception on error.
*/
exports.request = request_hostenv;

//----------------------------------------------------------------------
// $eval

if (__oni_rt.UA == "msie" && __oni_rt.G.execScript) {
  // IE hack. On IE, 'eval' doesn't fill the global scope.
  // And execScript doesn't return a value :-(
  // We use waitfor/resume & catchall foo to get things working anyway.
  // Note: it is important to check for msie above. Other browsers (chrome)
  // implement execScript too, and we don't want them to take this suboptimal
  // path.
  var IE_resume_counter = 0;
  __oni_rt.IE_resume = {};
  
  __oni_rt.G.$eval = function(code, settings) {
    var filename = (settings && settings.filename) || "'$eval_code'";
    var mode = (settings && settings.mode) || "balanced";
    try {
      waitfor(var rv, isexception) {
        var rc = ++IE_resume_counter;
        __oni_rt.IE_resume[rc]=resume;
        var js = __oni_rt.c1.compile(
          "try{"+code+
            "\n}catchall(rv) { spawn(hold(0),__oni_rt.IE_resume["+rc+"](rv[0],rv[1])) }", {filename:filename, mode:mode});
        __oni_rt.G.execScript(js);
      }
      if (isexception) throw rv;
    }
    finally {
      delete __oni_rt.IE_resume[rc];
    }
    return rv;
  };
}
else {
  // normal, sane eval
  __oni_rt.G.$eval = function(code, settings) {
    var filename = (settings && settings.filename) || "'$eval_code'";
    var mode = (settings && settings.mode) || "balanced";
    var js = __oni_rt.c1.compile(code, {filename:filename, mode:mode});
    return __oni_rt.G.eval(js);
  };
}

//----------------------------------------------------------------------
// require mechanism

var pendingLoads = {};


// require.alias, require.path are different for each
// module. makeRequire is a helper to construct a suitable require
// function that has access to these variables:
function makeRequire(parent) {
  // make properties of this require function accessible in requireInner:
  var rf = function(module) {
    return requireInner(module, rf, parent);
  };
  rf.path = ""; // default path is empty
  rf.alias = {};
  return rf;
}

// helper to resolve aliases
function resolveAliases(module, aliases) {
  var ALIAS_REST = /^([^:]+):(.*)$/;
  var alias_rest, alias;
  var rv = module;
  var level = 10; // we allow 10 levels of aliasing
  while ((alias_rest=ALIAS_REST.exec(rv)) &&
         (alias=aliases[alias_rest[1]])) {
    if (--level == 0)
      throw "Too much aliasing in modulename '"+module+"'";
    rv = alias + alias_rest[2];
  }
  return rv;
}

// helper to resolve hubs
function resolveHubs(module, hubs) {
  var path = module;
  var loader = default_loader;
  var level = 10; // we allow 10 levels of rewriting indirection
  for (var i=0,hub; hub=hubs[i++]; ) {
    if (path.indexOf(hub[0]) == 0) {
      // we've got a match
      if (typeof hub[1] == "string") {
        path = hub[1] + path.substring(hub[0].length);
        i=0; // start resolution from beginning again
        if (--level == 0)
          throw "Too much indirection in hub resolution for module '"+module+"'";
      }
      else {
        // assert(typeof hub[1] == "function")
        loader = hub[1];
        // that's it; no more indirection
        break;
      }
    }
  }
  return {path:path, loader:loader};
}

// default module loader
function default_loader(path) {
  if (getXDomainCaps_hostenv() != 'none' ||
      exports.isSameOrigin(path, document.location))
    src = request_hostenv(path, {mime:"text/plain"});
  else {
    // browser is not CORS capable. Attempt modp:
    path += "!modp";
    src = jsonp_hostenv(path,
                        {forcecb:"module",
                         cbfield:null});
  }
  return { src: src, loaded_from: path };
}

// loader that loads directly from github
function github_loader(path) {
  var user, repo, tag;
  try {
    [,user,repo,tag,path] = /github:([^\/]+)\/([^\/]+)\/([^\/]+)\/(.+)/.exec(path);
  } catch(e) { throw "Malformed module id '"+path+"'"; }
  
  var github_api = "http://github.com/api/v2/json/";
  var github_opts = {cbfield:"callback"};
  // XXX maybe some caching here
  var tree_sha;
  /* XXX we really want the parallel-or operator here (|@|) to recode this as:
 
  var tree_sha = 
    (jsonp_hostenv([github_api, 'repos/show/', user, repo, '/tags'], 
                   github_opts).tags 
     |@| 
     jsonp_hostenv([github_api, 'repos/show/', user, repo, '/branches'],
                   github_opts).branches)[tag];
  */
  waitfor {
    (tree_sha = jsonp_hostenv([github_api, 'repos/show/', user, repo, '/tags'],
                              github_opts).tags[tag]) || hold();
  }
  or {
    (tree_sha = jsonp_hostenv([github_api, 'repos/show/', user, repo, '/branches'],
                              github_opts).branches[tag]) || hold();
  }
  or {
    hold(5000);
    throw new Error("Github timeout");
  }

  waitfor {
    var src = jsonp_hostenv([github_api, 'blob/show/', user, repo, tree_sha, path],
                            github_opts).blob.data;
  }
  or {
    hold(5000);
    throw new Error("Github timeout");
  }
  
  return {
    src: src,
    loaded_from: "http://github.com/"+user+"/"+repo+"/blob/"+tree_sha+"/"+path
  };
}

// requireInner: workhorse for require
function requireInner(module, require_obj, parent) {
  var path;
  // apply path if module is relative
  if (module.indexOf(":") == -1) {
    if (require_obj.path && require_obj.path.length)
      path = exports.constructURL(require_obj.path, module);
    else
      path = module;
    path = exports.canonicalizeURL(path, parent ? parent : document.location);
  }
  else
    path = module;

  if (parent == __oni_rt.G.__oni_rt_require_base)
    parent = "[toplevel]";

  // apply default extension; determine if path points to js file
  var matches, is_js = false;
  if (!(matches=/.*\.(js|sjs)$/.exec(path)))
    path += ".sjs";
  else if (matches[1] == "js")
    is_js = true;
  
  // apply local aliases
  path = resolveAliases(path, require_obj.alias);
  // apply global aliases
  var loader;
  ({path,loader}) = resolveHubs(path, __oni_rt.G.require.hubs);
  
  var descriptor;
  if (!(descriptor = __oni_rt.G.require.modules[path])) {
    // we don't have this module cached -> load it
    var pendingHook = pendingLoads[path];
    if (!pendingHook) {
      pendingHook = pendingLoads[path] = spawn (function() {
        var src, loaded_from;
        try {
          if (path in __oni_rt.modsrc) {
            // a built-in module
            loaded_from = "[builtin]";
            src = __oni_rt.modsrc[path];
            delete __oni_rt.modsrc[path];
            // xxx support plain js modules for built-ins?
          }
          else {
            ({src, loaded_from}) = loader(path);
          }
          var f;
          var descriptor = {
            id: path,
            exports: {},
            loaded_from: loaded_from,
            loaded_by: parent,
            required_by: {}
          };
          if (is_js) {
            f = new Function("module", "exports", src);
            f(descriptor, descriptor.exports);
          }
          else {
            f = $eval("(function(module, exports, require){"+src+"})",
                      {filename:"module '"+path+"'"});
            f(descriptor, descriptor.exports, makeRequire(path));
          }
          // It is important that we only set __oni_rt.G.require.modules[module]
          // AFTER f finishes, because f might block, and we might get
          // reentrant calls to require() asking for the module that is
          // still being constructed.
          __oni_rt.G.require.modules[path] = descriptor;
        }
        catch (e) {
          var mes = "Cannot load module '"+path+"'. "+
            "(Underlying exception: "+e+")";
          throw new Error(mes);
        }
        finally {
          delete pendingLoads[path];
        }
        return descriptor;
      })();
    }
    var descriptor = pendingHook.waitforValue();
  }
  
  if (!descriptor.required_by[parent])
    descriptor.required_by[parent] = 1;
  else
    ++descriptor.required_by[parent];
  
  return descriptor.exports;  
}

// global require function:
__oni_rt.G.require = makeRequire(__oni_rt.G.__oni_rt_require_base);

require.hubs = [
  ["apollo:", "http://code.onilabs.com/apollo/unstable/modules/" ],
  ["github:", github_loader ]
];
require.modules = {};

// require.APOLLO_LOAD_PATH: path where this oni-apollo.js lib was
// loaded from, or "" if it can't be resolved:
require.APOLLO_LOAD_PATH = "";

__oni_rt.G.require.modules['sjs:__sys.sjs'] = {
  id: 'sys:__sys.sjs',
  exports: exports,
  loaded_from: "[builtin]",
  loaded_by: "[toplevel]",
  required_by: { "[toplevel]":1 }
};
