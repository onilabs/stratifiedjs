/*
 * StratifiedJS 'http' module
 * Functions for performing HTTP requests and working with URLs
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.20.0-development'
 * http://onilabs.com/stratifiedjs
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
/**
  @module    http
  @summary   Functions for performing HTTP requests and working with URLs
  @home      sjs:http
*/

var sys = require('builtin:apollo-sys');

//----------------------------------------------------------------------


//----------------------------------------------------------------------

exports.xhr = function() { throw "http.xhr() is obsolete. Please use http.request()"; };
exports.xml = function() { throw "http.xml() is obsolete."; };

/**
   @function getXDomainCaps
   @summary Returns the cross-domain capabilities of the host environment ('CORS'|'none'|'any')
   @return {String}
   @desc
     See also [::request].
*/
exports.getXDomainCaps = sys.getXDomainCaps;


/**
   @function request
   @summary Performs an [XMLHttpRequest](https://developer.mozilla.org/en/XMLHttpRequest)-like HTTP request.
   @param {URLSPEC} [url] Request URL (in the same format as accepted by [url::build])
   @param {optional Object} [settings] Hash of settings (or array of hashes)
   @return {String|Object}
   @setting {String} [method="GET"] Request method.
   @setting {QUERYHASHARR} [query] Additional query hash(es) to append to url. Accepts same format as [url::buildQuery].
   @setting {String} [body] Request body.
   @setting {Object} [headers] Hash of additional request headers.
   @setting {String} [username] Username for authentication.
   @setting {String} [password] Password for authentication.
   @setting {String} [mime] xbrowser hostenv only: Override mime type. 
   @setting {String} [response='string'] One of 'string', 'full', 'arraybuffer', 'raw'; see below
   @setting {Boolean} [throwing=true] Throw exception on error.
   @setting {Integer} [max_redirects=5] nodejs hostenv only: Maximum number of redirects to follow.
   @setting {Object}  [agent=undefined] nodejs hostenv only: [Agent](http://nodejs.org/api/http.html#http_class_http_agent) to use for the connection pooling

   @desc
     ### Response types:

     The return value depends on the value of the `response` setting:

     `response`&nbsp;&nbsp;&nbsp;    | return value
     --------------------------------|-------------------------------------------------------------------
     'string'                        | string with response text
     'full'                          | object `{status: number, content: string, getHeader: string->string}`
     'arraybuffer'&nbsp;&nbsp;&nbsp; | object `{status: number, content: ArrayBuffer, getHeader: string->string}`
     'raw'                           | nodejs hostenv only: nodejs request object

     ### Request failure:

     If the request is unsuccessful, and the call is configured to
     throw exceptions (setting `throwing=true`; the default), an
     exception will be thrown which has a `status` member set to the
     request status and a `data` member which contains any response body that
     the server might have sent.
     If the call is configured to not throw, this will be indicated by 
     the `status` member in the return value being unequal to 200. If `response` is 
     set to 'string' and `throwing` to false, there is no way to detect failure: the 
     response will just be an empty string in this case.

     ### Limitations:

     This method exposes similar functionality to that provided by browsers' 
     [XMLHttpRequest](https://developer.mozilla.org/en/XMLHttpRequest), and as such has
     a number of builtin features and limitations:

     * Redirects will automatically be followed, and there is no way to discover
       the value of the final URL in a redirection chain.

     * Cross-origin restrictions might apply; see below.

     ### Cross-site requests:

     The success of cross-domain requests depends on the cross-domain
     capabilities of the host environment, see
     [::getXDomainCaps]. If this function
     returns "CORS" then success of cross-domain requests depends on
     whether the server allows the access (see
     <http://www.w3.org/TR/cors/>).

     In the xbrowser host environment, the standard
     XMLHttpRequest can handle cross-domain requests on compatible
     browsers (any recent Chrome, Safari, Firefox). On IE8+,
     [::request] will automatically fall back to using MS's
     XDomainRequest object for cross-site requests.

     In the nodejs host environment, we can always perform cross-domain requests

 
     ### Example:

         try { 
           alert(http.request("foo.txt"));
         }
         catch (e) {
           alert("Error! Status="+e.status);
         }

*/
exports.request = sys.request;


/**
  @function  get
  @summary   Perform a HTTP GET request and return the response text.
  @param {URLSPEC} [url] Request URL (in the same format as accepted by [url::build])
  @param {optional Object} [settings] Hash of settings (or array of hashes) as accepted by [::request].
  @return    {String}
  @shortcut  request
  @desc
    An alias for `http.request(url,settings)`.

    ### Example:
    
        console.log(
          require("sjs:http").get("data.txt")
        );
    
    ### Example: timeout
    
        var http = require("sjs:http");
        waitfor {
          var data = http.get("data.txt");
        } or {
          hold(1000);
        }
        if (!data) {
          throw "Server too slow...";
        }
*/
exports.get = exports.request;

/**
  @function  post
  @summary   Perform a HTTP POST request and return the response text.
  @param {URLSPEC} [url] Request URL (in the same format as accepted by [url::build])
  @param     {String|null} [body] Request body.
  @param {optional Object} [settings] Hash of settings (or array of hashes) as accepted by [::request].
  @return    {String} 
  @shortcut  request
  @desc
    ### Example:
    
        var http = require("sjs:http");
        var response = http.post("/service", "some raw data");
        console.log("server replied:", response);
    
    ### Example: posting data in the url, not the body

        var http = require("sjs:http");
        var rv = http.post("/service", null,
                           { query: {
                                  name: "ford",
                                  lastname: "prefect"
                                    }
                           });
        // sends an HTTP POST to /service 
        // with payload: name=ford&lastname=prefect
*/
exports.post = function(url, body, settings) {
  return sys.request(url, sys.mergeObjects({method:"POST", body:body}, settings));
};


/**
  @function  json
  @summary   Perform a HTTP GET request and parse the response text as a JSON object.
  @param {URLSPEC} [url] Request URL (in the same format as accepted by [url::build])
  @param {optional Object} [settings] Hash of settings (or array of hashes) as accepted by [::request].
  @shortcut  get
  @return    {Object}
  @desc
    ### Example:
    
        var http = require("sjs:http");
        var animals = http.json("/animals.php?type=cats").animals;
        for (var i = 0, cat; cat = animals[i]; i++) {
          console.log(cat.name);
        }
*/

// helper taken from jquery
function parseJSON(data) {
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
    var global = sys.getGlobal();
    return global.JSON && global.JSON.parse ?
      global.JSON.parse(data) :
      (new Function("return " + data))();
    
  }
  else
    throw "Invalid JSON";
};


exports.json = function(/*url, settings*/) {
  return parseJSON(exports.get.apply(this, arguments));
};

//----------------------------------------------------------------------
// jsonp

/**
  @function  jsonp
  @summary   Perform a cross-domain capable JSONP-style request. 
  @param {URLSPEC} [url] Request URL (in the same format as accepted by [url::build])
  @param {optional Object} [settings] Hash of settings (or array of hashes)
  @return    {Object}
  @setting {QUERYHASHARR} [query] Additional query hash(es) to append to url. Accepts same format as [url::buildQuery].
  @setting {String} [cbfield="callback"] Name of JSONP callback field in query string.
  @setting {String} [forcecb] Force the name of the callback to the given string.
  @desc
    ### Example:

        var http = require("sjs:http");
        var url = "http://api.flickr.com/services/feeds/photos_public.gne?" +
                  "tags=cat&tagmode=any&format=json";
        var data = http.jsonp(url, {cbfield:"jsoncallback"});
        for (var i = 0, item; item = data.items[i]; i++) {
           c.log("src=", item.media.m);
        };
*/
exports.jsonp = sys.jsonp;

