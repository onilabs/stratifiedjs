/*
 * Oni Apollo SJS cross-browser system module ('sjs:__sys')
 *
 * Part of the Oni Apollo Cross-Browser StratifiedJS Runtime
 * 0.12.0
 * http://onilabs.com/apollo
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

/**
   @function isArrayOrArguments
   @summary  Tests if an object is an array or arguments object.
   @param    {anything} [testObj] Object to test.
   @return   {Boolean}
*/
exports.isArrayOrArguments = __oni_rt.isArrayOrArguments;

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
*/
exports.jsonp = function(url, settings) {
  var opts = __oni_rt.accuSettings({}, [
    {
      iframe : false,
      //    query : undefined,
      cbfield : "callback",
      //    forcecb : undefined,
    }, 
    settings
  ]);

  url = __oni_rt.constructURL(url, opts.query);
  if (opts.iframe || opts.forcecb)
    return jsonp_iframe(url, opts);
  else
    return jsonp_indoc(url, opts);
};

var jsonp_req_count = 0;
var jsonp_cb_obj = "_oni_jsonpcb";
function jsonp_indoc(url, opts) {
  if (!window[jsonp_cb_obj])
    window[jsonp_cb_obj] = {};
  var cb = "cb" + (jsonp_req_count++);
  var cb_query = {};
  cb_query[opts.cbfield] = jsonp_cb_obj + "." + cb;
  url = __oni_rt.constructURL(url, cb_query);
  var elem = document.createElement("script");
  elem.setAttribute("src", url);
  elem.setAttribute("async", "async"); //XXX ?
  elem.setAttribute("type", "text/javascript");
  waitfor (var rv) {
    window[jsonp_cb_obj][cb] = resume;
    document.getElementsByTagName("head")[0].appendChild(elem);

    waitfor() {
      if (elem.addEventListener)
        elem.addEventListener("error", resume, false);
      else // IE
        elem.attachEvent("onerror", resume);
    }
    finally {
      if (elem.removeEventListener)
        elem.removeEventListener("error", resume, false);
      else // IE
        elem.detachEvent("onerror", resume);
    }
    // this line never reached unless there is an error
    throw new Error("Could not complete JSONP request to '"+url+"'");
  }
  finally {
    elem.parentNode.removeChild(elem);
    delete window[jsonp_cb_obj][cb];
  }
  return rv;
}

function jsonp_iframe(url, opts) {
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

/**
  @function isCORSCapable
  @summary Checks if we can perform cross-origin requests to CORS-capable
           servers (see <http://www.w3.org/TR/cors/>)
  @return {Boolean}
*/
exports.isCORSCapable = function() {
  return __oni_rt.getXHRCaps().CORS;
};


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
   @desc
     ### Cross-site requests:

     The success of cross-site requests depends on whether the
     server allows the access (see <http://www.w3.org/TR/cors/>) and on whether
     the we are capable of issuing cross-site requests. This can be checked with
     [__sys.isCORSCapable](#__sys/isCORSCapable).

     For the apollo-xbrowser implementation, the standard
     XMLHttpRequest can handle cross-site requests on compatible
     browsers (any recent Chrome, Safari, Firefox). On IE8+,
     [__sys.request](#__sys/request) will automatically fall back to using MS's
     XDomainRequest object for cross-site requests.

     ### Request failure:

     If the request is unsuccessful, and the call is configured to
     throw exceptions (setting {"throwing":true}; the default), an
     exception will be thrown which has a 'status' member set to the
     request status. If the call is configured to not throw, an empty
     string will be returned.  
*/
exports.request = function(url, settings) {
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

  // file urls will return a success code '0', not '2'!
  if (error ||
      (req.status !== undefined && // req.status is undefined for IE XDR objs
       !(req.status.toString().charAt(0) in {'0':1,'2':1}))) {
    if (opts.throwing) {
      var txt = "Failed " + opts.method + " request to '"+url+"'";
      if (req.statusText) txt += ": "+req.statusText;
      if (req.status) txt += " ("+req.status+")";
      var err = new Error(txt);
      err.status = req.status;
      throw err;
    }
    else
      return "";
  }
  return req.responseText;
};
