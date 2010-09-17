/*
 * Oni Apollo 'http' module
 * Stratified XHR and JSONP request methods
 *
 * Part of the Oni Apollo client-side SJS library
 * 0.9.1
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
/**
  @module    http
  @summary   The stratified functions defined in this API can be used to transmit data
             from/to servers without page refreshing. In addition to
             'ajax-style' interactions with the home domain of an app, these
             functions also form the basis of cross-domain access to many
             public web APIs.

  @desc
    Note: functions that are marked not to work cross-domain might 
    work it if the browser has 
    implemented [access-control](http://www.w3.org/TR/access-control/).
*/

var common = require("common");


/*
 OPTIONHASH : null |
              [ OPTIONHASH, ... ] |
              { option: value }
*/
function consolidateOpts(/*option-hash,...*/) {
  return accuOpts({}, arguments);
}

function accuOpts(accu /*,option-hash,...*/) {
  for (var a=1; a<arguments.length; ++a) {
    var arg = arguments[a];
    if (common.isArray(arg)) {
      for (var i=0; i<arg.length; ++i)
        accuOpts(accu, arg[i]);
    }
    else {
      for (var o in arg)
        accu[o] = arg[o];
    }
  }
  return accu;
}

//----------------------------------------------------------------------
// url functions

/**
  @function  constructQueryString
  @summary Build a URL query string.
  @param {QUERYHASHARR} [hashes] Object(s) with key/value pairs. See below for full syntax.
  @return {String}
  @desc
    *hashes* can be a simple object with key/values or an arbitrarily nested
    array of (arrays of) key/value objects.

    Furthermore, if the value in a key/value pair is an array [a,b,c], then
    a key=value query will be encoded for each of the array elements.

    ###Examples:

        http.constructQueryString({a:1,b:"foo&bar"}); // -> "a=1&b=foo%26bar"

        http.constructQueryString([[null,[{a:1,b:['x','y']},{c:3}],[[]]]]);
        // -> "a=1&b=x&b=y&c=3"`

    Full syntax for *hashes*:

        QUERYHASHARR :  QUERYHASH       |
                        [ QUERYHASHES ]

        QUERYHASHES  :  QUERYHASH                |
                        QUERYHASHES, QUERYHASHES |
                        [ QUERYHASHES ]

        QUERYHASH    : { }        |
                       null       |
                       undefined  |
                       { QUERIES }

        QUERIES      : QUERY          |
                       QUERIES, QUERY

        QUERY        : SIMPLE_QUERY |
                       MULTI_QUERY

        SIMPLE_QUERY : "field" : "value"

        MULTI_QUERY  : "field" : [ "value1", ... ]

*/

function constructQueryString(hashes) {
  var parts = [];
  if (common.isArray(hashes)) {
    for (var i=0; i<hashes.length; ++i) {
      var part = constructQueryString(hashes[i]);
      if (part.length)
        parts.push(part);
    }
  }
  else {
    for (var q in hashes) {
      var l = encodeURIComponent(q) + "=";
      var val = hashes[q];
      if (!common.isArray(val))
        parts.push(l + encodeURIComponent(val));
      else {
        for (var i=0; i<val.length; ++i)
          parts.push(l + encodeURIComponent(val[i]));
      }
    }
  }
  return parts.join("&");
}
exports.constructQueryString = constructQueryString;

/**
  @function constructURL
  @summary Build a URL string.
  @param {URLSPEC} [urlspec] String and optional query hashes. See below for full syntax.
  @return {String}
  @desc
    *urlspec* can be a simple string or an (arbitrarily nested) array composed
    of a base string and a number of QUERYHASHES (as accepted by
    [http.constructQueryString](#http/constructQueryString)).

    ###Examples:

        http.constructURL("foo.txt"); // -> "foo.txt"

        http.constructURL("foo?a=b"); // -> "foo?a=b"

        http.constructURL("foo?a=b", {b:1}); // -> "foo?a=b&b=1"

        http.constructURL("foo?a=b", {b:[1,2]}); // -> "foo?a=b&b=1&b=2"

        http.constructURL("foo?a=b", [{b:[1,2]}]); // -> "foo?a=b&b=1&b=2"

        http.constructURL(["http://foo", {bar:"x", zz:"w"}, {foo:[1,2,3]}]);
        // -> "http://foo?bar=x&zz=w&foo=1&foo=2&foo=3"

        http.constructURL([["http://foo", {bar:"x", zz:"w"}], [{foo:[1,2,3]}]]);
        // -> "http://foo?bar=x&zz=w&foo=1&foo=2&foo=3"

    Full syntax for *urlspec*:

        URLSPEC   :  BASE                     |
                     BASE, QUERYHASHES        |
                     [ URLSPEC ]

        QUERYHASHES   :  QUERYHASH                |
                         QUERYHASHES, QUERYHASHES |
                         [ QUERYHASHES ]

        QUERYHASH  : { }        |
                     null       |
                     undefined  |
                     { QUERIES }

        QUERIES    : QUERY          |
                     QUERIES, QUERY

        QUERY      : SIMPLE_QUERY |
                     MULTI_QUERY

        SIMPLE_QUERY : "field" : "value"

        MULTI_QUERY  : "field" : [ "value1", ... ]

        BASE       : url string (may contain a query string already)
  
*/
function constructURL(url_spec /* ,query_hashes, ... */) {
  var base;
  var qparts = [];
  if (!common.isArray(url_spec))
    base = url_spec;
  else {
    if (common.isArray(url_spec[0]))
      base = constructURL(url_spec[0]);
    else
      base = url_spec[0];
    for (var hs = 1; hs<url_spec.length; ++hs) {
      var part = constructQueryString(url_spec[hs]);
      if (part.length)
        qparts.push(part);
    }
  }
  for (var q = 1; q<arguments.length; ++q) {
    var part = constructQueryString(arguments[q]);
    if (part.length)
      qparts.push(part);
  }
  var query = qparts.join("&");
  if (query.length) {
    if (base.indexOf("?") != -1)
      base += "&";
    else
      base += "?";
    base += query;
  }
  return base;
}
exports.constructURL = constructURL;

//----------------------------------------------------------------------
// XHR

function createXMLHttpRequest() {
  try {
    return new XMLHttpRequest();
  } catch(e) {}
  try {
    return new ActiveXObject("Msxml2.XMLHTTP");
  } catch(e) {}
  throw "XMLHttpRequest not supported by your browser";
}

/**
  @function xhr
  @summary Performs an XMLHttpRequest.
  @param {URLSPEC} [url] Request URL (in the same format as accepted by [http.constructURL](#http/constructURL))
  @param {optional Object} [settings] Hash of settings (or array of hashes)
  @return {XMLHttpRequest object}
  @setting {String} [method="GET"] Request method.
  @setting {QUERYHASHARR} [query] Additional query hash(es) to append to url. Accepts same format as [http.constructQueryString](#http/constructQueryString).
  @setting {String} [body] Request body.
  @setting {Object} [headers] Hash of additional request headers.
  @setting {String} [username] Username for authentication.
  @setting {String} [password] Password for authentication.
  @setting {Boolean} [throwing=true] Throw exception on error.
  @setting {XMLHttpRequest} [req] XMLHttpRequest object to (re-)use for this request.
  @desc
    If the request is unsuccessful, and the call is configured to throw
    exceptions (setting {"throwing":true}; the default), an exception will
    be thrown which has a 'status' member set to the request status, and a
    'req' member set to the XMLHttpRequest object.

    *This request does **not** work cross-domain.*

    ###Example:

        try { 
          alert(http.xhr("foo.txt").responseText);
        }
        catch (e) {
          alert("Error! Status="+e.status);
        }

*/
function xhr(url, settings) {
  var opts = consolidateOpts({
    method   : "GET",
//    query    : undefined,
    body     : null,
//    headers  : undefined,
//    user     : undefined,
//    password : undefined,
    throwing   : true,
//    req      : null
  }, settings);
  url = constructURL(url, opts.query);
  var req = opts.req;
  if (!req)
    req = createXMLHttpRequest();
  req.open(opts.method, url, true, opts.username, opts.password);
  waitfor() {
    req.onreadystatechange = function(evt) {
      if (req.readyState != 4)
        return;
      else
        resume();
    };
    if (opts.headers)
      for (var h in opts.headers)
        req.setRequestHeader(h, opts.headers[h]);
    req.send(opts.body);
  }
  retract {
    req.abort();
  }

  if (opts.throwing) {
    // file urls will return a success code '0', not '2'!
    if (!(req.status.toString().charAt(0) in {'0':1,'2':1})) {
      var err = new Error(req.statusText+" ("+req.status+")");
      err.status = req.status;
      err.req = req;
      throw err;
    }
  }
  return req;
}
exports.xhr = xhr;


/**
  @function  get
  @summary   Perform a HTTP GET request and return the response text.
  @param {URLSPEC} [url] Request URL (in the same format as accepted by [http.constructURL](#http/constructURL))
  @param {optional Object} [settings] Hash of settings (or array of hashes) as accepted by [http.xhr](#http/xhr).
  @return    {String}
  @shortcut  xhr
  @desc
    An alias for

        http.xhr(url,settings).responseText

    *This request does **not** work cross-domain.*

    ### Example:
    
    `console.log(
      require("http").get("data.txt")
    );`
    
    ### Example: timeout
    
    `var http = require("http");
    waitfor {
      var data = http.get("data.txt");
    } or {
      hold(1000);
    }
    if (!data) {
      throw "Server too slow...";
    }`
*/
function get(/*url,settings*/) {
  return xhr.apply(this, arguments).responseText;
};
exports.get = get;

/** 
  @function  post
  @summary   Perform a HTTP POST request and return the response text.
  @param {URLSPEC} [url] Request URL (in the same format as accepted by [http.constructURL](#http/constructURL))
  @param     {String|null} [body] Request body.
  @param {optional Object} [settings] Hash of settings (or array of hashes) as accepted by [http.xhr](#http/xhr).
  @return    {String} 
  @shortcut  xhr
  @desc
    *This request does **not** work cross-domain.*

    ### Example:    
    `var http = require("http");
    var response = http.post("/service", "some raw data");
    console.log("server replied:", response)`
    
    ### Example: posting data in the url, not the body
    `var http = require("http");
    var rv = http.post("/service", null,
                       { query: {
                              name: "ford",
                              lastname: "prefect"
                                }
                       });
    // sends an HTTP POST to /service 
    // with payload: name=ford&lastname=prefect
    console.log(require("json").parse(rv).id);`
*/
exports.post = function(url, body, settings) {
  return xhr(url, [{method:"POST", body:body}, settings]).responseText;
};


/**
  @function  json
  @summary   Perform a HTTP GET request and parse the response text as a JSON object.
  @param {URLSPEC} [url] Request URL (in the same format as accepted by [http.constructURL](#http/constructURL))
  @param {optional Object} [settings] Hash of settings (or array of hashes) as accepted by [http.xhr](#http/xhr).
  @shortcut  get
  @return    {Object}
  @desc
    *This request does **not** work cross-domain.*

    ### Example:
    `var http = require("http");
    var animals = http.json("/animals.php?type=cats").animals;
    for (var i = 0, cat; cat = animals[i]; i++) {
      console.log(cat.name);
    }`
*/
exports.json = function(/*url, settings*/) {
  return require("json").parse(get.apply(this, arguments));
};

/**
  @function  xml
  @summary   Perform a HTTP GET request and return the response XML.
  @param {URLSPEC} [url] Request URL (in the same format as accepted by [http.constructURL](#http/constructURL))
  @param {optional Object} [settings] Hash of settings (or array of hashes) as accepted by [http.xhr](#http/xhr).
  @return    {Object}
  @shortcut  xhr
  @desc
    An alias for

        http.xhr(url,settings).responseXML

    *This request does **not** work cross-domain.*

    ### Example:

    `var http = require("http");
    var root = http.xml("data.xml").documentElement;
    console.log("Items in document: ", root.children.length)`
*/
exports.xml = function(/* url, settings */) {
  return xhr.apply(this, arguments).responseXML;
};

//----------------------------------------------------------------------
// jsonp

/**
  @function  jsonp
  @summary   Perform a cross-domain capable JSONP-style request. 
  @param {URLSPEC} [url] Request URL (in the same format as accepted by [http.constructURL](#http/constructURL))
  @param {optional Object} [settings] Hash of settings (or array of hashes)
  @return    {Object}
  @setting {Boolean} [iframe=false] Perform the request in a temporary iframe.
  @setting {QUERYHASHARR} [query] Additional query hash(es) to append to url. Accepts same format as [http.constructQueryString](#http/constructQueryString).
  @setting {String} [cbfield="callback"] Name of JSONP callback field in query string.
  @setting {String} [forcecb] Force the name of the callback to the given string. Note: setting this value automatically forces the setting *iframe*=*true*.
  @desc
    *This request **works** cross-domain.*

    ### Example:

    `var http = require("http");
    var url = "http://api.flickr.com/services/feeds/photos_public.gne?" +
              "tags=cat&tagmode=any&format=json";
    var data = http.jsonp(url, {cbfield:"jsoncallback"});
    for (var i = 0, item; item = data.items[i]; i++) {
       c.log("src=", item.media.m);
    };`
*/
exports.jsonp = function(url, settings) {
  var opts = consolidateOpts({
    iframe : false,
//    query : undefined,
    cbfield : "callback",
//    forcecb : undefined,
  }, settings);

  url = constructURL(url, opts.query);
  if (opts.iframe || opts.forcecb)
    return jsonp_iframe(url, opts);
  else
    return jsonp_indoc(url, opts); 
};

function jsonp_iframe(url, opts) {
  var cb = opts.forcecb || "R";
  var cb_query = {};
  cb_query[opts.cbfield] = cb;
  url = constructURL(url, cb_query);
  var iframe = document.createElement("iframe");
  document.getElementsByTagName("head")[0].appendChild(iframe);
  var doc = iframe.contentWindow.document
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
}

var jsonp_req_count = 0;
var jsonp_cb_obj = "_oni_jsonpcb";
function jsonp_indoc(url, opts) {
  if (!window[jsonp_cb_obj])
    window[jsonp_cb_obj] = {};
  var cb = "cb" + (jsonp_req_count++);
  var cb_query = {};
  cb_query[opts.cbfield] = jsonp_cb_obj + "." + cb;
  url = constructURL(url, cb_query);
  var elem = document.createElement("script");
  elem.setAttribute("src", url);
  elem.setAttribute("async", "async"); //XXX ?
  elem.setAttribute("type", "text/javascript");
  waitfor (var rv) {
    window[jsonp_cb_obj][cb] = resume;
    document.getElementsByTagName("head")[0].appendChild(elem);

    require("dom").waitforEvent(elem, "error");
    // this line never reached unless there is an error
    throw new Error("Could not complete JSONP request to '"+url+"'");
  }
  finally {
    elem.parentNode.removeChild(elem);
    delete window[jsonp_cb_obj][cb];
  }
  return rv;
}

/**
  at function css
  at summary Load a CSS file into the current document.
  at param {URLSPEC} [url] Request URL (in the same format as accepted by [http.constructURL](#http/constructURL))
  at desc
    *This request **works** cross-domain.*
*/
// XXX should be more robust: http://yui.yahooapis.com/2.8.1/build/get/get.js
/*
exports.css = function (url) {
  var url = constructURL(arguments);
  var elem = document.createElement("link");
  elem.setAttribute("rel", "stylesheet");
  elem.setAttribute("type", "text/css");
  elem.setAttribute("href", "url");
  document.getElementsByTagName("head")[0].appendChild(elem);
};
*/

var _pendingScripts = {};
var _loadedScripts = {};

/**
  @function  script
  @summary   Load and execute a plain JavaScript file.
  @param {URLSPEC} [url] Request URL (in the same format as accepted by [http.constructURL](#http/constructURL))
  @desc
    *This request **works** cross-domain.*

    It is safe to call this function simultaneously from several strata,
    even for the same URL: The given URL will only be loaded **once**, and
    all callers will block until it is loaded.

    ### Example:

    `var http = require("http");
    http.script("http://code.jquery.com/jquery.js");
    jQuery("body").css({background:"red"});`
*/
exports.script = function(/*url, queries*/) {
  var url = constructURL(arguments);
  if (_loadedScripts[url])
  return;
  var hook = _pendingScripts[url];
  if (hook != null) {
    waitfor() {
      hook.push(resume);
    }
    //    retract {
    // XXX could remove resume function from hook here
    //    }
  }
  else {
    // we're the initial requester
    waitfor() {
      var elem = document.createElement("script");
      var hook = [];
      _pendingScripts[url] = hook;
      
      function listener(e) {
        resume();
      }
      
      function listenerIE(e) {
        if (e.srcElement.readyState == "loaded" ||
            e.srcElement.readyState == "complete")
          resume();
      }
      
      if (elem.addEventListener)
        elem.addEventListener("load", listener, false);
      else {
        // IE
        elem.attachEvent("onreadystatechange", listenerIE);
      }
      
      // kick off the load:
      elem.src = url;
      document.getElementsByTagName("head")[0].appendChild(elem);
    }
    retract {
      _pendingScripts[url] = null;
    }
    finally {
      if (elem.removeEventListener)
      elem.removeEventListener("load", listener, false);
      else
      elem.detachEvent("onreadystatechange", listenerIE);
    }

    _pendingScripts[url] = null;
    _loadedScripts[url] = true;
    for (var i = 0; i < hook.length; ++i)
    hook[i]();
  }
};
