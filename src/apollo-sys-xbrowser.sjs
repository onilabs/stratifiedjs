/*
 * Oni Apollo SJS cross-browser system module ('sjs:__sys')
 *
 * Part of the Oni Apollo Cross-Browser StratifiedJS Runtime
 * 0.11.0+
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
  
*/
exports.jsonp = function(url, settings) {
  var opts = common.mergeSettings({
    iframe : false,
//    query : undefined,
    cbfield : "callback",
//    forcecb : undefined,
  }, settings);

  url = __oni_rt.constructURL(url, opts.query);
  if (opts.iframe || opts.forcecb)
    return __oni_rt.jsonp_iframe(url, opts);
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
