/*
 * Oni Apollo 'twitter' module
 * Stratified bindings to the Twitter API.
 *
 * Part of the Oni Apollo client-side SJS library
 * 0.9.1+
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
  @module    twitter
  @summary   Stratified bindings to the Twitter API.
*/
var http = require("http");
var common = require("common");

/**
  @function  getProfile
  @summary   Retrieve a Twitter profile.
  @param     {String} [name] Twitter profile id.
  @return    {Object}
*/
exports.getProfile = function(id) {
  return http.jsonp("http://api.twitter.com/1/users/show/" + id + ".json");
};

/**
  @function  get
  @summary   Retrieve tweets by the given user.
  @param     {String} [name] The Twitter profile id.
  @param     {optional Integer} [limit=10] Limit on the number of tweets to retrieve
  @return    {Object}
*/
exports.get = function(id, limit) {
  limit = limit || 10;
  return http.jsonp(["http://twitter.com/status/user_timeline/" + id + ".json",{count: limit}]);
};

/**
  @function  search
  @summary   Search the Twitter universe.
  @param     {String} [query] A string containing query arguments.
  @return    {Object}
*/
exports.search = function(query) {
  return http.jsonp(["http://search.twitter.com/search.json",{q:query}]);
};

//----------------------------------------------------------------------
// @anywhere API
/*

function wrap1(obj, f) {
  obj["$"+f] = function() {
    var a = Array.prototype.slice.call(arguments,0);
    waitfor(var rv) { a.push(resume); obj[f].apply(this, a); }
    wrap(rv);
    return rv;
  };
}

function wrap(obj) {
  if (!obj) return;
  if (common.isArray(obj)) return;
  for (var f in obj) {
    if (f[0] == "$") continue;
    if (typeof obj[f] == "function" && !obj["$"+f]) {
      wrap1(obj,f);
    }
    hold(0); wrap(obj[f]);
  }
}

var API;
var APIClient;
*/
/**
  at_function  loadAnywhereAPI
  at_summary   Loads the Twitter &#0064;Anywhere API.
  at_param     {String}  [key] API key
  at_param     {boolean} [wrap_api] Whether to install stratified bindings on window.twttr object.
*/
/*
exports.loadAnywhereAPI = function(key, wrap_api) {
  if (!window['twttr'] || !window.twttr.anywhere) {
    var url = "http://platform.twitter.com/anywhere.js?v=1.1.2";
    if (key) url += "&id="+key;
    require('http').script(url);
  }
  if (!API) {
    API = twttr.anywhere;
    exports.API = API;
  }
  if (!APIClient) {
    waitfor(APIClient) { twttr.anywhere(resume); }
    exports.APIClient = APIClient;
  }
  if (wrap_api) {
    wrap(APIClient);
    twttr.$anywhere = APIClient;
  }
};
*/
/**
  at_function  showConnectButton
  at_summary   Inserts a 'Connect to Twitter button' at the given location.
  at_param     {Selector}  [parent] JQuery-style selector
  at_description Requires a prior call to 'loadAnywhereAPI'
*/
/*
exports.showConnectButton = function(parent) {
  APIClient(parent).connectButton();
}
*/
/**
  at_function  signIn
  at_summary   Shows the Twitter &#0064;Anywhere Connect popup
  at_description Requires a prior call to 'loadAnywhereAPI'
*/
/*
exports.signIn = function() { APIClient.signIn(); };
*/
/**
  at_function  signOut
  at_summary   Signs out the connected user.
  at_description Requires a prior call to 'loadAnywhereAPI'
*/
/*
exports.signOut = function() { API.signOut(); };
*/
/**
  at_function  tweet
  at_summary   Tweets the given text
  at_param     {String} Text to tweet.
  at_description Requires a prior call to 'loadAnywhereAPI' and a signed in user.
*/
/*
exports.tweet = function(txt) { waitfor(rv) {APIClient.Status.update(txt, resume); } return rv; };
*/
/**
  at_function  isConnected
  at_summary   Returns true if a user is signed into the app.
  at_description Requires a prior call to 'loadAnywhereAPI'.
*/
/*
exports.isConnected = function() { return APIClient.isConnected(); }
*/
/**
  at_function  waitforConnected
  at_summary   Waits until a user is connected, or returns immediately if there is already a connected user.
  at_description Requires a prior call to 'loadAnywhereAPI'.
*/
/*
exports.waitforConnected = function() {
  if (exports.isConnected()) return;
  waitfor() {
    APIClient.bind("authComplete", resume);
  }
  finally {
    APIClient.unbind("authComplete", resume);
  }
};
*/
/**
  at_function  waitforDisconnected
  at_summary   Waits until the user is disconnected, or returns immediately if there is no connected user.
  at_description Requires a prior call to 'loadAnywhereAPI'.
*/
/*
exports.waitforDisconnected = function() {
  if (!exports.isConnected()) return;
  waitfor() {
    APIClient.bind("signOut", resume);
  }
  finally {
    APIClient.unbind("signOut", resume);
  }
};  
*/
