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
    var base = "file://"+process.mainModule.filename;
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
  if (/^\.?\.?\//.exec(url_string))
    return exports.canonicalizeURL(url_string, parent.id);
  else
    return "nodejs:"+url_string;
}


// reads data from a stream; returns null if the stream has ended;
// throws if there is an error
var readStream = exports.readStream = function readStream(stream) {
  //XXX 2.X doesn't implement readable on some streams (http
  //responses, maybe others), so we gotto be careful what exactly we
  //test here:
  if (stream.readable === false) return null;
  var data = null;

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
  }
  or {
    waitfor (data) {
      stream.on('data', resume);
    }
    finally {
      stream.removeListener('data', resume);
    }
  }
  or {
    // we resume *after* setting the data listener, just in case a 
    // data event is coming synchronously after the resume
    stream.resume();
    hold();
  }
  finally {
    if (stream.readable)
      stream.pause();
  }
  
  return data;
}


/**
   @function request
   @summary Performs an [XMLHttpRequest](https://developer.mozilla.org/en/XMLHttpRequest)-like HTTP request.
   @param {URLSPEC} [url] Request URL (in the same format as accepted by [url.build](#url/build))
   @param {optional Object} [settings] Hash of settings (or array of hashes)
   @return {String|Object}
   @setting {String} [method="GET"] Request method.
   @setting {QUERYHASHARR} [query] Additional query hash(es) to append to url. Accepts same format as [url.buildQuery](#url/buildQuery).
   @setting {String} [body] Request body.
   @setting {Object} [headers] Hash of additional request headers.
   @setting {String} [username] Username for authentication.
   @setting {String} [password] Password for authentication.
   @setting {String} [response='string'] whether to return the response text only ('string'), an object `{ status, getHeader, content }` ('full') or the underlying request object ('raw' - supported in nodejs only)
   @setting {Boolean} [throwing=true] Throw exception on error.
   @setting {Integer} [max_redirects=5] Maximum number of redirects to follow.
   @setting {Object} [agent=undefined] nodejs hostenv only: [Agent](http://nodejs.org/api/http.html#http_class_http_agent) to use for the connection pooling
*/
function request_hostenv(url, settings) {
  var opts = exports.mergeObjects({
                                     method : "GET",
                                     // query : undefined
                                     // body : undefined,
                                     headers : {},
                                     // username : undefined
                                     // password : undefined
                                     response : 'string',
                                     throwing : true,
                                     max_redirects : 5
                                     // agent : undefined
                                  },
                                  settings);
  var url_string = exports.constructURL(url, opts.query);
  //console.log('req '+url_string);
  // XXX ok, it sucks that we have to take this URL apart again :-/
  var url = exports.parseURL(url_string);
  var protocol = url.protocol;
  if(!(protocol === 'http' || protocol === 'https')) {
    throw new Error('Unsupported protocol: ' + protocol);
  }
  var secure = (protocol == "https");
  var port = url.port || (secure ? 443 : 80);

  if (!opts.headers['Host'])
    opts.headers.Host = url.authority;

  if (!opts.headers['User-Agent'])
    opts.headers['User-Agent'] = "Oni Labs StratifiedJS engine"; //XXX should have a version here

  if (opts.body && !opts.headers['Transfer-Encoding']) {
    // opts.headers['Transfer-Encoding'] = 'chunked';
    // Some APIs (github, here's looking at you) don't accept chunked encoding, 
    // so for maximum compatibility we determine the content length:
    opts.body = new Buffer(opts.body);
    opts.headers['Content-Length'] = opts.body.length;
  }
  else {
    opts.headers['Content-Length'] = 0;
  }
  var auth;
  if (typeof opts.username != 'undefined' && typeof opts.password != 'undefined')
    auth = opts.username + ":" + opts.password;
  var request = __oni_rt.nodejs_require(protocol).request({
    method: opts.method,
    host: url.host,
    port: port,
    path: url.relative || '/',
    headers: opts.headers,
    auth: auth,
    agent: opts.agent
  });
  request.end(opts.body); 

  waitfor {
    waitfor (var err) {
      request.on('error', resume);
    }
    finally {
      request.removeListener('error', resume);
    }
    throw new Error(err);
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
      if (opts.max_redirects > 0) {
        //console.log('redirect to ' + response.headers['location']);
        opts.headers.host = null;
        --opts.max_redirects;
        // we use canonicalizeURL here, because some sites
        // (e.g. dailymotion) use a relative url in the Location
        // header (which is forbidden according to RFC1945)
        return request_hostenv(
          exports.canonicalizeURL(response.headers['location'],url_string), 
          opts);
      }
      // else fall through
    default:
      if (opts.throwing) {
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
      } else if (opts.response == 'string') {
        // if we don't let the response drain, it can prevent node from exiting
        response.resume();
        return "";
      }
      // else fall through
    }
  }
  
  if (opts.response == 'raw')
    return response;

  response.setEncoding('utf8');
  response.data = "";
  var data;
  while (data = readStream(response)) {
    response.data += data;
  }

  if (opts.response == 'string')
    return response.data;
  else {
    // response == 'full'
    return {
      status: response.statusCode,
      content: response.data,
      getHeader: name -> response.headers[name.toLowerCase()]
    };
  }
};

function file_src_loader(path) {
  waitfor (var err, data) {
    // asynchronously load file at path (removing 'file://' prefix first):
    __oni_rt.nodejs_require('fs').readFile(path.substr(7), resume);
  }
  if (err) {
    // XXX this is a hack to allow us to load sjs scripts without .sjs extension, 
    // e.g. hash-bang scripts
    var matches;
    if ((matches = /(.*)\.sjs$/.exec(path))) {
      try {
        return file_src_loader(matches[1]);
      } catch (e) { throw new Error(String(err.message || err) + "\nand then\n"+ String(e.message || e)); }
    }
    else
      throw err;
  }
  return { src: data.toString(), loaded_from: path };
}

function nodejs_mockModule(parent) {
  var base;
  if (!(/^file:/.exec(parent.id))) // e.g. we are being loaded from a http module
    base = getTopReqParent_hostenv().id;
  else
    base = parent.id;
  // strip 'file://'
  base = base.substr(7);

  return {
    paths: __oni_rt.nodejs_require('module')._nodeModulePaths(base)
  };
};

// load a builtin nodejs module:
function nodejs_loader(path, parent, dummy_src, opts, spec) {
  // resolve using node's require mechanism in this order:
  //  native nodejs module, sjs-native module (based on known extensions), other nodejs module

  var resolved=spec._resolved; // nodejs-resolved module path, or "" if nodejs couldn't resolve it
  if (resolved && resolved.indexOf('.') == -1) return __oni_rt.nodejs_require(resolved); // native module

  var mockModule = spec._mockModule;
  // if the url doesn't have an extension, try .sjs (even if we already resolved a module):
  var matches;
  if (!(matches = /.+\.([^\.\/]+)$/.exec(path))) {
    try {
      // now try .sjs
      resolved = __oni_rt.nodejs_require('module')._resolveFilename(path+".sjs", mockModule);
      // compatibility with older nodejs (e.g. v0.7.0):
      if (resolved instanceof Array) resolved = resolved[1];

      // ok, success. load as a file module:
      return default_loader("file://"+resolved, parent, file_src_loader, opts);
    }
    catch (e) {}
  }
  else if (resolved && matches[1]!="js") {
    // see if this is an sjs-known extension (but NOT js!)
    if (exports.require.extensions[matches[1]]) // yup; load as sjs-native module
      return default_loader("file://"+resolved, parent, file_src_loader, opts);
  }

  if (!resolved) throw new Error("nodejs module at '"+path+"' not found");
  return __oni_rt.nodejs_require(resolved);
}

__js nodejs_loader.resolve = function(spec, parent) {
  var path = spec.path.substr(7); // strip nodejs:
  spec._mockModule = nodejs_mockModule(parent || getTopReqParent_hostenv());
  try {
    path = __oni_rt.nodejs_require('module')._resolveFilename(path, spec._mockModule);
    // compatibility with older nodejs (e.g. v0.7.0):
    if (path instanceof Array) path = path[1];
    spec._resolved = path;
  } catch(e) {
    // TODO: should really throw here, but there are cases where nodejs can't
    // resolve a module but we can still load it
    // (e.g if it's on the nodejs path but with a .sjs extension)
    spec._resolved = "";
  }
  spec.path = path;
}


function getHubs_hostenv() {
  return [
    ["sjs:", "file://"+__oni_rt.nodejs_sjs_lib_dir ],
    ["github:", {src: github_src_loader} ],
    ["http:", {src: http_src_loader} ],
    ["https:", {src: http_src_loader} ],
    ["file:", {src: file_src_loader} ],
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
    var files = init_path.split(':');
    for(var i=0; i<files.length; i++) {
      var path = files[i];
      if(!path) continue;
      try {
        path = node_fs.realpathSync(path); // file:// URIs need an absolute path
        exports.require('file://' + path);
      } catch(e) {
        console.error("Error loading init script at " + path + ": " + e);
        throw e;
      }
    }
  }
};

