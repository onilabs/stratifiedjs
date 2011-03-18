/*
 * Oni Apollo JS bootstrap code
 *
 * Part of the Oni Apollo Cross-Browser StratifiedJS Runtime
 * 0.11.0+
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

if (!__oni_rt.xhr) {

  //----------------------------------------------------------------------
  // js library functions required by bootstrap code
  // XXX some|all of this should move into apollo-sys-xbrowser.sjs

  __oni_rt.isArrayOrArguments = function(obj) {
    return Array.isArray(obj) || !!(obj && hasOwnProperty.call(obj, 'callee'));
  };

  // mirrored by apollo/modules/common.sjs:flatten
  __oni_rt.flatten = function(arr, rv) {
    var rv = rv || [];
    var l=arr.length;
    for (var i=0; i<l; ++i) {
      var elem = arr[i];
      if (__oni_rt.isArrayOrArguments(elem))
        __oni_rt.flatten(elem, rv);
      else
        rv.push(elem);
    }
    return rv;
  };
  
  
  // used by apollo/modules/common.sjs:mergeSettings,
  // apollo/src/apollo-sjs-bootstrap.sjs:xhr
  __oni_rt.accuSettings = function(accu, hashes) {
    hashes = __oni_rt.flatten(hashes);
    var hl = hashes.length;
    for (var h=0; h<hl; ++h) {
      var hash = hashes[h];
      for (var o in hash)
        accu[o] = hash[o];
    }
    return accu;
  };
  
  // mirrored by apollo/modules/http.sjs:constructQueryString
  __oni_rt.constructQueryString = function(/*hashes*/) {
    var hashes = __oni_rt.flatten(arguments);
    var hl = hashes.length;
    var parts = [];
    for (var h=0; h<hl; ++h) {
      var hash = hashes[h];
      for (var q in hash) {
        var l = encodeURIComponent(q) + "=";
        var val = hash[q];
        if (!__oni_rt.isArrayOrArguments(val))
          parts.push(l + encodeURIComponent(val));
        else {
          for (var i=0; i<val.length; ++i)
            parts.push(l + encodeURIComponent(val[i]));
        }
      }
    }
    return parts.join("&");
  };
  
  // mirrored by apollo/modules/http.sjs:constructURL
  __oni_rt.constructURL = function(/* url_spec */) {
    var url_spec = __oni_rt.flatten(arguments);
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
      var part = __oni_rt.constructQueryString(url_spec[i]);
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
  }
  
  // mirrored by apollo/modules/http.sjs:parseURL
  /*
    Implementation is taken from
    parseUri 1.2.2
    (c) Steven Levithan <stevenlevithan.com>
    MIT License
    http://blog.stevenlevithan.com/archives/parseuri
  */
  __oni_rt.parseURL = function(str) {
    var o = __oni_rt.parseURL.options,
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
  __oni_rt.parseURL.options = {
	  key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
	  q:   {
		  name:   "queryKey",
		  parser: /(?:^|&)([^&=]*)=?([^&]*)/g
	  },
    // We're only using the 'strict' mode parser:
	  parser: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/
  };
  
  
  // mirrored by apollo/modules/http.sjs:isSameOrigin
  __oni_rt.isSameOrigin = function(url1, url2) {
    var a1 = __oni_rt.parseURL(url1).authority;
    if (!a1) return true;
    var a2 = __oni_rt.parseURL(url2).authority;
    return  !a2 || (a1 == a2);
  };
  
  // mirrored by apollo/modules/http.sjs:canonicalizeURL
  __oni_rt.canonicalizeURL = function(url, base) {
    var a = __oni_rt.parseURL(url);
    
    // convert relative->absolute:
    if (!a.protocol && base) {
      base = __oni_rt.parseURL(base);
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
  
  // construct/retrieve xhr caps. Used by
  // some functions in apollo/modules/http.sjs, and by
  // apollo/src/apollo-sjs-bootstrap.sjs:xhr
  __oni_rt.getXHRCaps = function() {
    if (!__oni_rt.XHR_caps) {
      __oni_rt.XHR_caps = {};
      // set xhr ctor:
      if (window.XMLHttpRequest)
        __oni_rt.XHR_caps.XHR_ctor = function() { return new XMLHttpRequest(); };
      else
        __oni_rt.XHR_caps.XHR_ctor = function() {
          if (__oni_rt.activex_xhr_ver)
            return new ActiveXObject(__oni_rt.activex_xhr_ver);    
          for (var v in
               { "MSXML2.XMLHTTP.6.0":1,
                 "MSXML2.XMLHTTP.3.0":1,
                 "MSXML2.XMLHTTP":1
               }) {
            try {
              var req = new ActiveXObject(v);
              __oni_rt.activex_xhr_ver = v;
              return req;
            }
            catch (e) {}
          }
          throw new Error("Browser does not support XMLHttpRequest");
        };
      
      // determine CORS caps:
      __oni_rt.XHR_caps.XHR_CORS = ("withCredentials" in __oni_rt.XHR_caps.XHR_ctor());
      if (!__oni_rt.XHR_caps.XHR_CORS)
        __oni_rt.XHR_caps.XDR = (window.XDomainRequest !== undefined);
      __oni_rt.XHR_caps.CORS = __oni_rt.XHR_caps.XHR_CORS || __oni_rt.XHR_caps.XDR;
    }
    return __oni_rt.XHR_caps;
  }
  
  // used by apollo/modules/http.sjs:json
  __oni_rt.parseJSON = function(data) {
    // taken from jQuery
    if (typeof data !== "string" || !data) {
      return null;
    }
    
    // Make sure leading/trailing whitespace is removed (IE can't handle it)
    data = data.replace(/^(\s|\u00A0)+|(\s|\u00A0)+$/g, "");
    
    // Make sure the incoming data is actual JSON
    // Logic borrowed from http://json.org/json2.js
	  if ( /^[\],:{}\s]*$/.test(data.replace(/\\(?:[\"\\\/bfnrt]|u[0-9a-fA-F]{4})/g, "@")
		                          .replace(/\"[^\"\\\n\r]*\"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, "]")
		                          .replace(/(?:^|:|,)(?:\s*\[)+/g, "")) ) {
      
      // Try to use the native JSON parser first
      return window.JSON && window.JSON.parse ?
        window.JSON.parse(data) :
        (new Function("return " + data))();
      
    }
    else
      throw "Invalid JSON";
  };
  
  
  //----------------------------------------------------------------------
  // install SJS bootstrap code:
  
  window.eval(__oni_rt.c1.compile(__oni_rt.src_bootstrap,
                                  {filename:"apollo-sjs-bootstrap.sjs"}));
  delete __oni_rt.src_bootstrap;
  
  //----------------------------------------------------------------------
  // load inline SJS code:

  if (!window.__oni_rt_no_script_load) {
    if (document.readyState === "complete") {
      __oni_rt.runScripts();
    }
    else {
      // XXX maybe use DOMContentLoaded here, if available
      if (window.addEventListener)
        window.addEventListener("load", __oni_rt.runScripts, true);
      else
        window.attachEvent("onload", __oni_rt.runScripts);
    }
  }
}
