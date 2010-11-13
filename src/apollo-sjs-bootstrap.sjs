/*
 * Oni Apollo SJS bootstrap code
 *
 * Part of the Oni Apollo Cross-Browser StratifiedJS Runtime
 * 0.9.2+
 * http://onilabs.com/apollo
 *
 * (c) 2010 Oni Labs, http://onilabs.com
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

//----------------------------------------------------------------------
// sjs library functions required by bootstrap code

// mirrored by apollo/modules/http.sjs:xhr
__oni_rt.xhr = function xhr(url, settings) {
  var opts = __oni_rt.accuSettings({},
                                   [
                                     {
                                       method   : "GET",
                                       //    query    : undefined,
                                       body     : null,
                                       //    headers  : undefined,
                                       //    username : undefined,
                                       //    password : undefined,
                                       throwing   : true
                                     },
                                     settings
                                   ]);
  url = __oni_rt.constructURL(url, opts.query);

  var caps = __oni_rt.getXHRCaps();
  if (!caps.XDR || __oni_rt.isSameOrigin(url, document.location)) {
    var req = caps.XHR_ctor();
    req.open(opts.method, url, true, opts.username || "", opts.password || "");
  }
  else {
    // A cross-site request on IE, where we have to use XDR instead of XHR:
    req = new XDomainRequest();
    req.open(opts.method, url);
  }
  
  waitfor(var error) {
    if (req.onerror !== undefined) {
      req.onload = function() { resume(); };
      req.onerror = function() { resume(true); };
    }
    else { // IE
      req.onreadystatechange = function(evt) {
        if (req.readyState != 4)
          return;
        else
          resume();
      };
    }

    if (opts.headers)
      for (var h in opts.headers)
        req.setRequestHeader(h, opts.headers[h]);
    if (opts.mime && req.overrideMimeType)
      req.overrideMimeType(opts.mime);
    req.send(opts.body);
  }
  retract {
    req.abort();
  }

  if (opts.throwing) {
    // file urls will return a success code '0', not '2'!
    if (error ||
        (req.status !== undefined && // req.status is undefined for IE XDR objs
         !(req.status.toString().charAt(0) in {'0':1,'2':1}))) {
      var txt = "Failed " + opts.method + " request to '"+url+"'";
      if (req.statusText) txt += ": "+req.statusText;
      if (req.status) txt += " ("+req.status+")";
      var err = new Error(txt);
      err.status = req.status;
      err.req = req;
      throw err;
    }
  }
  return req;
};

// used by apollo/modules/http.sjs:jsonp & require mechanism, below:
__oni_rt.jsonp_iframe = function(url, opts) {
  var cb = opts.forcecb || "R";
  var cb_query = {};
  if (opts.cbfield)
    cb_query[opts.cbfield] = cb;
  url = __oni_rt.constructURL(url, cb_query);
  var iframe = document.createElement("iframe");
  document.getElementsByTagName("head")[0].appendChild(iframe);
  var doc = iframe.contentWindow.document;
  waitfor (var rv) {
    doc.open();
    iframe.contentWindow[cb] = resume;
    // This hold(0) is required in case the script is cached and loads
    // synchronously. Alternatively we could spawn() this code:
    hold(0);
    doc.write("\x3Cscript type='text/javascript' src=\""+url+"\">\x3C/script>");
    doc.close();
  }
  finally {
    iframe.parentNode.removeChild(iframe);
  }
  // This hold(0) is required to prevent a security (cross-domain)
  // error under FF, if the code continues with loading another iframe:
  hold(0);
  return rv; 
};

//----------------------------------------------------------------------
// $eval
var $eval;

if (__oni_rt.UA == "msie" && window.execScript) {
  // IE hack. On IE, 'eval' doesn't fill the global scope.
  // And execScript doesn't return a value :-(
  // We use waitfor/resume & catchall foo to get things working anyway.
  // Note: it is important to check for msie above. Other browsers (chrome)
  // implement execScript too, and we don't want them to take this suboptimal
  // path.
  __oni_rt.IE_resume_counter = 0;
  __oni_rt.IE_resume = {};
  
  $eval = function(code, filename) {
    filename = filename || "'$eval code'";
    try {
      waitfor(var rv, isexception) {
        var rc = ++__oni_rt.IE_resume_counter;
        __oni_rt.IE_resume[rc]=resume;
        var js = __oni_rt.c1.compile(
          "try{"+code+
            "\n}catchall(rv) { spawn(function(){__oni_rt.IE_resume["+rc+"](rv[0],rv[1]);}) }", {filename:filename});
        window.execScript(js);
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
  $eval = function(code, filename) {
    filename = filename || "'$eval code'";
    var js = __oni_rt.c1.compile(code, {filename:filename});
    return window.eval(js);
  };
}

//----------------------------------------------------------------------
// require mechanism

__oni_rt.pendingLoads = {};


// require.alias, require.path are different for each
// module. makeRequire is a helper to construct a suitable require
// function that has access to these variables:
__oni_rt.makeRequire = function(hub, module) {
  // make properties of this require function accessible in requireInner:
  var rf = function(modulespec) {
    return __oni_rt.requireInner(modulespec, rf, hub, module || "[toplevel]");
  };
  rf.path = ".";
  rf.alias = {};
  return rf;
}

// helper returning [hub,module] for a given modulespec, aliashash
__oni_rt.resolveHubModule = function(modulespec, aliases) {
  var MS = /^(?:(?:([^:]+)|<(.+)>):)?([^:]+)$/;
  var matches = MS.exec(modulespec);
  if (!matches) throw "Invalid modules name '"+modulespec+"'";
  var rv = [matches[1] || matches[2], matches[3]];
  var alias;
  var level = 10;
  while (rv[0] && (alias = aliases[rv[0]])) {
    if (--level == 0) throw "Too much aliasing in modulename '"+modulespec+"'";
    if ((matches = MS.exec(alias)) && matches[1]) {
      // alias is of the form 'hub:moduleprefix':
      rv = [matches[1] || matches[2], __oni_rt.constructURL(matches[3], rv[1])];
    }
    else {
      // alias is of the form 'hub':
      rv[0] = alias;
    }
  }
  rv[1] = __oni_rt.canonicalizeURL(rv[1], null);
  return rv;
};

// requireInner: workhorse for require
__oni_rt.requireInner = function(modulespec, require_obj, default_hub, loader) {
  var hub_module = __oni_rt.resolveHubModule(modulespec, require_obj.alias);
  var hub = hub_module[0] || default_hub || window.require.path;
  var module = hub_module[1];
  var canonical_name = "<" + hub + ">" + ":" + module;
  
  var descriptor, exception;
  if (!(descriptor = window.require.modules[canonical_name])) {
    // we don't have this module cached -> load it
    var pendingHook = __oni_rt.pendingLoads[canonical_name];
    if (!pendingHook) {
      pendingHook = __oni_rt.pendingLoads[canonical_name] = [];
      var src, loaded_from;
      try {
        if (canonical_name in __oni_rt.modsrc) {
          // a built-in module
          loaded_from = "built-in";
          src = __oni_rt.modsrc[canonical_name];
          delete __oni_rt.modsrc[canonical_name];
        }
        else {
          // a remote module
          loaded_from = __oni_rt.constructURL(window.require.hubs[hub] || hub,
                                              module+".sjs");
          if (__oni_rt.getXHRCaps().CORS ||
              __oni_rt.isSameOrigin(loaded_from, document.location))
            src = __oni_rt.xhr(loaded_from, {mime:"text/plain"}).responseText;
          else {
            // browser is not CORS capable. Attempt modp:
            loaded_from += "!modp";
            src = __oni_rt.jsonp_iframe(loaded_from,
                                        {forcecb:"module",
                                         cbfield:null});
          }
              
        }
        var f = $eval("(function(exports, require){"+src+"})",
                      "module '"+canonical_name+"'");
        var exports = {};
        f(exports, __oni_rt.makeRequire(hub, canonical_name));
        // It is important that we only set window.require.modules[module]
        // AFTER f finishes, because f might block, and we might get
        // reentrant calls to require() asking for the module that is
        // still being constructed.
        descriptor = window.require.modules[canonical_name] =
          { exports: exports,
            loaded_from: loaded_from,
            loaded_by:   loader,
            required_by: {}
          };
      }
      catch (e) {
        exception = e;
        delete window.require.modules[canonical_name];
      }
      delete __oni_rt.pendingLoads[canonical_name];
      
      for (var i=0; i<pendingHook.length; ++i)
        pendingHook[i](descriptor, exception);
    }
    else {
      // there is already a pending load for this module; add ourselves
      // to the hook:
      waitfor(descriptor, exception) {
        pendingHook.push(resume);
      }
    }
  }
  if (exception) {
    var mes = "Cannot load module '"+canonical_name+"'. "+
      "(Underlying exception: "+exception+")";
    throw new Error(mes);
  }
  
  if (!descriptor.required_by[loader])
    descriptor.required_by[loader] = 1;
  else
    ++descriptor.required_by[loader];
  
  return descriptor.exports;  
};

// global require function:
var require = __oni_rt.makeRequire(require);

require.hubs = {};
require.hubs.apollo = "http://code.onilabs.com/apollo/0.9.2+/modules/"; 
require.modules = {};

// require.APOLLO_LOAD_PATH: path where this oni-apollo.js lib was
// loaded from, or "" if it can't be resolved:
require.APOLLO_LOAD_PATH = "";

//----------------------------------------------------------------------
// script loading:

__oni_rt.runScripts = function() {
  var scripts = document.getElementsByTagName("script");
  // if there is something like a require('google').load() call in
  // one of the scripts, our 'scripts' variable will change. In some
  // circumstances this can lead to scripts being executed twice. To
  // prevent this, we select text/sjs scripts and eval them in two passes:
  
  // this doesn't work on IE: ("JScript object expected")
  //var ss = Array.prototype.slice.call(scripts, 0);
  var ss = [];
  for (var i=0; i<scripts.length; ++i) {
    var matches;
    if (scripts[i].type == "text/sjs") {
      var s = scripts[i];
      ss.push(s);
    }
    else if ((matches = /(.*)oni-apollo.js$/.exec(scripts[i].src)))
      require.APOLLO_LOAD_PATH = matches[1];
  }
  
  for (var i=0; i<ss.length; ++i) {
    var s = ss[i];
    var m = s.getAttribute("module");
    if (m)
      __oni_rt.modsrc[m] = s.innerHTML;
    else
      $eval(s.innerHTML, "inline script "+(i+1));
  }
};
