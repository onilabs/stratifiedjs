/*
 * Oni StratifiedJS system module ('builtin:apollo-sys') hostenv-specific part
 *
 * NodeJS-based ('nodejs') version
 *
 * Part of the StratifiedJS Runtime
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2011 Oni Labs, http://onilabs.com
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

   See apollo-sys-common.sjs for the functions that the
   hostenv-specific part must provide.


*/

var isWindows = process.platform === 'win32';
__js var pathMod = (function() {
  var np = __oni_rt.nodejs_require('path');
  var sep = np.sep || (isWindows ? '\\' : '/'); // `sep` introduced in nodejs 0.8
  return {
    join: np.join,
    resolve: function(p) {
      // nodejs strips trailing slash, which we wanted to keep
      var result = np.resolve.apply(this, arguments);
      if (/[\\\/]$/.test(p)) result += sep;
      return result;
    }
  }
})();

__js var pathToFileUrl = exports.pathToFileUrl = function(path) {
  var initialPath = path;
  var prefix = 'file://';
  path = pathMod.resolve(path);
  if (isWindows) {
    path = path.replace(/\\/g, '/');
    if (path.lastIndexOf('//', 0) === 0)
      // UNC path
      prefix='file:';
    else
      prefix='file:///';
  }
  // XXX we're using encodeURIComponent and back-converting : and / characters,
  // which seems hacky.
  return prefix + encodeURIComponent(path).replace(/%(2f|3a)/gi, unescape);
};

__js var fileUrlToPath = exports.fileUrlToPath = function(url) {
  var parsed = exports.parseURL(url);
  if (parsed.protocol.toLowerCase() != 'file') {
    throw new Error("Not a file:// URL: #{url}");
  }
  var path = parsed.path;
  // ignore localhost hostname
  if (parsed.host === 'localhost') parsed.host = '';
  if (isWindows) {
    path = path.replace(/\//g, '\\');
    if (parsed.host) {
      // UNC path
      path = '\\\\' + pathMod.join(parsed.host, path);
    } else {
      // windows absolute paths end up as "/C:/Windows/",
      // so strip the leading slash
      path = path.replace(/^\\/, '');
    }
  } else {
    if (parsed.host) {
      // mis-parse of relative file:// URI
      path = pathMod.join(parsed.host, path);
    }
  }
  return decodeURIComponent(path);
};

__js var coerceToURL = exports.coerceToURL = function(path) {
  // Check for scheme. This will be wrong when the scheme
  // is 1 letter long, because that's much more likely to
  // just be a drive prefix on windows.
  if (path.indexOf(':', 2) !== -1) return path;
  return pathToFileUrl(path);
};


/**
   @function  jsonp_hostenv
   @summary   Perform a cross-domain capable JSONP-style request. 
   @param {URLSPEC} [url] Request URL (in the same format as accepted by [url.build](#url/build))
   @param {optional Object} [settings] Hash of settings (or array of hashes)
   @return    {Object}
   @setting {QUERYHASHARR} [query] Additional query hash(es) to append to url. Accepts same format as [url.buildQuery](#url/buildQuery).
   @setting {String} [cbfield="callback"] Name of JSONP callback field in query string.
   @setting {String} [forcecb] Force the name of the callback to the given string. 
*/
function jsonp_hostenv(url, settings) {
  var opts = exports.mergeObjects(
    {
      // query : undefined,
      cbfield : "callback",
      forcecb : "jsonp"
    },
    settings);
  var query = {};
  query[opts.cbfield] = opts.forcecb;
  // XXX should be cleverer about this 
  var parser = /^[^{]*({[^]+})[^}]*$/;
  var data = parser.exec(request_hostenv([url, opts.query, query]));
  
  // JSON.parse doesn't accept Latin-1 hex escapes (\xXX), but some
  // services (google dictionary) use them. Let's convert to unicode
  // escapes (\u00XX):
  data[1] = data[1].replace(/([^\\])\\x/g, "$1\\u00");

  try {
    return JSON.parse(data[1]);
  }
  catch (e) {
    throw new Error("Invalid jsonp response from "+exports.constructURL(url)+" ("+e+")");
  }
}

/**
   @function getXDomainCaps_hostenv
   @summary Returns the cross-domain capabilities of the host environment ('CORS'|'none'|'*')
   @return {String}
*/
function getXDomainCaps_hostenv() {
  return "*";
}

/**
   @function getTopReqParent_hostenv
   @summary Return top-level require parent (for converting relative urls in absolute ones)
*/
var req_base_descr;
function getTopReqParent_hostenv() {
  if (!req_base_descr) {
    var base = pathToFileUrl(process.mainModule.filename);
    req_base_descr = {
      id: base,
      loaded_from: base,
      required_by: { "[system]":1 }
    };
  }
  return req_base_descr;
}

/**
   @function resolveSchemelessURL_hostenv
   @summary Resolve a scheme-less URL (for the require-mechanism)
   @param {String} [url_string] Scheme-less URL to be converted
   @param {Object} [req_obj] require-object
   @param {Object} [parent] parent descriptor 
   @return {String} Absolute URL
*/
function resolveSchemelessURL_hostenv(url_string, req_obj, parent) {
  if (/^\.\.?\//.test(url_string))
    return exports.canonicalizeURL(url_string, parent.id);
  else if (!isWindows && /^\//.test(url_string))
    // We *could* allow this, but it would break whenever URL semantics != path semantics
    // (e.g windows).
    // Instead, we enforce using using file:// URLs for absolute paths.
    throw new Error("Absolute path passed to require.resolve: #{url_string}");
  return "nodejs:"+url_string;
}


// reads data from a stream; returns null if the stream has ended;
// throws if there is an error
var readStream = exports.readStream = function readStream(stream, size) {
  if(stream.readable === false) return null;
  var data = stream.read(size);
  if(data !== null) return data;

  waitfor {
    waitfor (var exception) {
      stream.on('error', resume);
      stream.on('end', resume);
    }
    finally {
      stream.removeListener('error', resume);
      stream.removeListener('end', resume);
    }
    if (exception) throw exception;
    return null;
  }
  or {
    waitfor () {
      stream.on('readable', resume);
    }
    finally {
      stream.removeListener('readable', resume);
    }
    // XXX If two readers are watching for `data`, this could
    // signal EOF prematurely. Don't use two readers.
    return stream.read(size);
  }
}

/**
   @function request
   @summary See [sjs:http::request] for docs
*/
function request_hostenv(url, settings) {
  var opts = exports.mergeObjects({
                                     method : "GET",
                                     // query : undefined
                                     // body : undefined,
                                     headers : {},
                                     // username : undefined
                                     // password : undefined
                                     // response : 'string',
                                     throwing : true,
                                     max_redirects : 5
                                     // agent : undefined
                                     // ca : undefined
                                  },
                                  settings);
  
  // extract & remove options that are meant for me (not http.request)
  var pop = function(k) {
    var rv = opts[k];
    delete opts[k];
    return rv;
  };
  var responseMode = pop('response') || 'string';
  var body = pop('body');
  var throwing = pop('throwing');
  var max_redirects = pop('max_redirects');
  var username = pop('username');
  var password = pop('password');
  var query = pop('query');

  var url_string = exports.constructURL(url, opts.query);
  //console.log('req '+url_string);
  // XXX ok, it sucks that we have to take this URL apart again :-/
  var url = exports.parseURL(url_string);
  var protocol = url.protocol;
  if(!(protocol === 'http' || protocol === 'https')) {
    throw new Error('Unsupported protocol: ' + protocol);
  }
  opts.host = url.host;
  opts.port = url.port || (protocol === 'https' ? 443 : 80);
  opts.path = url.relative || '/';

  if (!opts.headers['Host'])
    opts.headers.Host = url.authority;

  if (!opts.headers['User-Agent'])
    opts.headers['User-Agent'] = "Oni Labs StratifiedJS engine"; //XXX should have a version here

  if (body && !opts.headers['Transfer-Encoding']) {
    // opts.headers['Transfer-Encoding'] = 'chunked';
    // Some APIs (github, here's looking at you) don't accept chunked encoding, 
    // so for maximum compatibility we determine the content length:
    body = new Buffer(body);
    opts.headers['Content-Length'] = body.length;
  }
  else {
    opts.headers['Content-Length'] = 0;
  }
  if (username != null && password != null)
    opts.auth = username + ":" + password;

  var request = __oni_rt.nodejs_require(protocol).request(opts);
  request.end(body);

  waitfor {
    waitfor (var err) {
      request.on('error', resume);
    }
    finally {
      request.removeListener('error', resume);
    }
    if (throwing) {
      err.request = request;
      err.response = null;
      err.status = 0;
      throw new Error(err);
    }
    else if (responseMode === 'string') {
      return '';
    }
    else if (responseMode === 'full') {
      return {
        status: 0,
        content: '',
      }
    }
    else if (responseMode === 'arraybuffer') {
      return {
        status: 0,
        content: new ArrayBuffer()
      }
    }
    else {
      // raw
      // construct a dummy response:
      return {
        readable: false,
        statusCode: 0,
        error: String(err)
      }
    }
  }
  or {
    waitfor (var response) {
      request.on('response', resume);
    }
    finally {
      request.removeListener('response', resume);
    }
  }
  retract {
    // XXX we need this dummy error listener to prevent nodejs from
    // throwing a socket hangup exception to top level:
    request.on('error', function(){}); 
    request.abort();
  }

  if (response.statusCode < 200 || response.statusCode >= 300) {
    switch (response.statusCode) {
    case 300: case 301: case 302: case 303: case 307:
      if (max_redirects > 0) {
        //console.log('redirect to ' + response.headers['location']);
        opts.headers.host = null;
        --max_redirects;
        // we use canonicalizeURL here, because some sites
        // (e.g. dailymotion) use a relative url in the Location
        // header (which is forbidden according to RFC1945)
        return request_hostenv(
          exports.canonicalizeURL(response.headers['location'],url_string), 
          opts);
      }
      // else fall through
    default:
      if (throwing) {
        var txt = "Failed " + opts.method + " request to '"+url_string+"'";
        txt += " ("+response.statusCode+")";
        var err = new Error(txt);
        // XXX add status text
        err.status = response.statusCode;
        err.request = request;
        err.response = response;
        // XXX support for returning streambuffer
        response.setEncoding('utf8');
        response.data = "";
        var data;
        while (data = readStream(response)) {
          response.data += data;
        }
        err.data = response.data;
        throw err;
      } else if (responseMode === 'string') {
        // if we don't let the response drain, it can prevent node from exiting
        response.resume();
        return "";
      }
      // else fall through
    }
  }
  
  if (responseMode === 'raw') {
    return response;
  }
  else if (responseMode === 'arraybuffer') {
    
    var buf = new Buffer(0);
    var data;
    while (data = readStream(response)) {
      buf = Buffer.concat([buf, data]);
      // XXX should we have some limit on the size here?
    }

    // see http://stackoverflow.com/questions/8609289/convert-a-binary-nodejs-buffer-to-javascript-arraybuffer
    __js {
      var array_buf = new ArrayBuffer(buf.length);
      var view = new Uint8Array(array_buf);
      for (var i=0,l=buf.length;i<l;++i) {
        view[i] = buf[i];
      }
    }

    return {
      status: response.statusCode,
      content: array_buf,
      getHeader: name -> response.headers[name.toLowerCase()]
    };
  }
  else {
    // responseMode === 'string' || responseMode === 'full'
    response.setEncoding('utf8');
    response.data = "";
    var data;
    while (data = readStream(response)) {
      response.data += data;
      // XXX should we have some limit on the size here?
    }
    
    if (responseMode === 'string')
      return response.data;
    else {
      // response == 'full'
      return {
        status: response.statusCode,
        content: response.data,
        getHeader: name -> response.headers[name.toLowerCase()]
      };
    }
  }
};

function file_src_loader(path) {
  waitfor (var err, data) {
    // asynchronously load file at file:// URL
    __oni_rt.nodejs_require('fs').readFile(fileUrlToPath(path), resume);
  }
  if (err) throw err;
  return { src: data.toString(), loaded_from: path };
}

function resolve_file_url (spec) {
  if (!spec.ext) {
    var ext = "." + spec.type;
    var path = fileUrlToPath(spec.path);
    // for extensionless require()s, resolve to `[path].[type]` only if it exists
    waitfor (var err) {
      __oni_rt.nodejs_require('fs').lstat(path + ext, resume);
    }
    if(!err) spec.path += ext;
  }
}

function nodejs_mockModule(parent) {
  var base;
  if (!(/^file:/.exec(parent.id))) // e.g. we are being loaded from a http module
    base = getTopReqParent_hostenv().id;
  else
    base = parent.id;
  base = fileUrlToPath(base);

  return {
    paths: __oni_rt.nodejs_require('module')._nodeModulePaths(base)
  };
};

// load a builtin nodejs module:
function nodejs_loader(path, parent, dummy_src, opts, spec) {
  if (spec.type == 'js') {
    return __oni_rt.nodejs_require(path);
  }
  return default_loader(pathToFileUrl(path), parent, file_src_loader, opts, spec);
}

__js nodejs_loader.resolve = function resolve_nodejs(spec, parent) {
  // resolve using node's require mechanism

  var path = spec.path.substr(7); // strip nodejs:
  var mockModule = nodejs_mockModule(parent || getTopReqParent_hostenv());
  var mod = __oni_rt.nodejs_require('module');
  function tryResolve(path) {
    try {
      var resolved = mod._resolveFilename(path, mockModule);
      // compatibility with older nodejs (e.g. v0.7.0):
      if (resolved instanceof Array) resolved = resolved[1];
      spec.path = resolved;
      return true;
    } catch(e) {
      return false;
    }
  };

  var ok = tryResolve(path);
  if (!spec.ext) {
    if (ok) {
      spec.type = 'js'; // must be a builtin nodejs module
    } else {
      // if the require() call lacked an extension, try resolving [path].[type]
      ok = tryResolve(path + "." + spec.type);
    }
  }

  if (!ok) throw new Error("nodejs module at '"+path+"' not found");
}


function getHubs_hostenv() {
  return [
    ["sjs:", pathToFileUrl(__oni_rt.nodejs_sjs_lib_dir) ],
    ["github:", {src: github_src_loader} ],
    ["http:", {src: http_src_loader} ],
    ["https:", {src: http_src_loader} ],
    ["file:", {src: file_src_loader, resolve: resolve_file_url} ],
    ["nodejs:", {loader: nodejs_loader} ]
  ];
}

function getExtensions_hostenv() {
  return {
    // normal sjs modules
    'sjs': default_compiler,

    // api files
    'api': default_compiler,

    // conductance configuration files
    'mho': default_compiler,

    // plain non-sjs js modules (note: for 'nodejs' scheme we bypass this)
    'js': function(src, descriptor) {
      var vm = __oni_rt.nodejs_require("vm");
      var sandbox = vm.createContext(global);
      sandbox.module = descriptor;
      sandbox.exports = descriptor.exports;
      sandbox.require = descriptor.require;
      vm.runInNewContext(src, sandbox, "module " + descriptor.id);
    },
    'html': html_sjs_extractor
  };
}

//----------------------------------------------------------------------
// eval_hostenv

function eval_hostenv(code, settings) {
  var filename = (settings && settings.filename) || "sjs_eval_code";
  filename = "'#{filename.replace(/\'/g,'\\\'')}'";
  var mode = (settings && settings.mode) || "normal";
  var js = __oni_rt.c1.compile(code, {filename:filename, mode:mode});
  return __oni_rt.G.eval(js);
}


//----------------------------------------------------------------------
// Called once sjs itself is initialized.
//  - Loads any user-defined init scripts from $SJS_INIT.
var _sjs_initialized = false;
function init_hostenv() {
  // init exactly once
  if (_sjs_initialized) return;
  _sjs_initialized = true;

  var init_path = process.env['SJS_INIT'];
  if(init_path) {
    var node_fs = __oni_rt.nodejs_require('fs');
    var files = init_path.split(isWindows ? ';' : ':');
    for(var i=0; i<files.length; i++) {
      var path = files[i];
      if(!path) continue;
      try {
        exports.require(pathToFileUrl(path));
      } catch(e) {
        console.error("Error loading init script at " + path + ": " + e);
        throw e;
      }
    }
  }
};

exports.runMainExpression = function(ef) {
  // runs expression `ef` as the main expression - i.e
  // turn it into a waitfor/or branch which retracts the main
  // expression on process termination (exit or a fatal signal)
  if (!__oni_rt.is_ef(ef)) return ef; // fully synchronous, nothing to do
  var sig;

  // On Windows, we add a dummy handler to SIGBREAK every time we remove
  // a SIG* handler, otherwise libuv dies with an assertion the next time we
  // remove one. We pick SIGBREAK because it's otherwise unused, and it
  // has to be one of BREAK/HUP/INT.
  // see https://github.com/joyent/node/issues/7701
  var dummy_handler, noop;
  if (process.platform === 'win32') {
    noop = function() {};
    dummy_handler = function() {
      console.error('[SIGBREAK caught; killing process immediately due to libuv bug]');
      process.exit(1);
    };
  }

  var await = function(evt) {
    waitfor() {
      process.on(evt, resume);
    } finally {
      process.removeListener(evt, resume);
      if (dummy_handler && evt.lastIndexOf('SIG', 0) === 0) {
        process.on("SIGBREAK", dummy_handler);
        dummy_handler = noop;
      }
    }
  };

  waitfor {
    try {
      ef.wait();
    } catch(e) {
      e = e.toString().replace(/^Error: Cannot load module/, "Error executing");
      e = e.replace(/\(in apollo-sys-common.sjs:\d+\)$/, "");
      console.error(e.toString());
      process.exit(1);
    }
  } or {
    await('SIGINT');
    sig = 'SIGINT';
  } or {
    await('SIGHUP');
    sig = 'SIGHUP';
  } or {
    await('exit');
  }
  if(sig) {
    waitfor {
      await('exit');
    } and {
      process.kill(process.pid, sig);
    }
  }
};
