/*
 * Oni Apollo 'facebook' module
 * Bindings to the facebook API 
 *
 * Part of the Oni Apollo Standard Module Library
 * 0.10.0+
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
  @module   facebook
  @summary  Loads the Facebook JS SDK and installs stratified functions for it.
  @desc
    

        require("facebook").install();
        
        FB.init({ appId : '125343570841606', status : true, cookie : true });
        
        var fbstatus = FB.$getLoginStatus();
        FB.$login({perms: 'publish_stream,read_stream'});

        console.log(FB.$api("/me").name);
        console.log(FB.$api('/me/feed'));
        
        var friend10 = FB.$api('/me/friends')[10];
        console.log(FB.$api(friend10.id + '/feed'));
        
        // post a message to 'my' wall
        FB.$api('/me/feed', 'post', {
          message: "test message"
        });


    ### Functions that get a stratified version

    <table cellspacing=0>
      <tr><td style='width:13em'>FB</td><td>
      api login logout ui getLoginStatus
      </td></tr>
    </table>
*/
function defaultPrefix(name) {
  //return "waitFor" + name[0].toUpperCase() + name.substring(1);
  return "$" + name;
}


/**
  @function  install
  @param    {optional Object} [settings] A set of key/value pairs configuring the library.
  @setting {Boolean} [autoload=true] Load the JS library if it's not included yet.
  @summary   Load the Facebook JS API and Installs the stratified functions.
  @return    {FB} The FB global object.
*/

exports.install = function (opts) {
  opts = opts || {};
  if (opts.autoload === undefined) opts.autoload = true;
  var prefix = opts.prefix || defaultPrefix;

  if (!window['FB'] && opts.autoload) {
    this.load(opts);
  }

  FB.Data[prefix("query")] = function(fql, data) {
    waitfor(var rv) {
      var q = FB.Data.query(fql, data);
      q.wait(resume)
    }
    return rv;
  };
  var fbfn = "api login logout ui getLoginStatus".split(" ");
  for (var i = 0, fn; fn = fbfn[i]; i++) {
    FB[prefix(fn)] = function(fn) {
      return function() {
        var args = arguments;
        waitfor(var rv) {
          if (fn == "login") args.unshift(resume);
          else args.push(resume);
          FB[fn].apply(FB, args);
        }
        if (fn == "api") {
          if (!rv || rv.error) throw rv.error.message;
          return rv.data || rv;
        } else {
          return rv;
        }
      };
    } (fn);
  }
};

exports.load = function (opts) {
  if (!window['FB']) {
    require("http").script("http://connect.facebook.net/en_US/all.js");
  }
};
