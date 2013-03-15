/*
 * Oni Apollo 'webapi/twitter' module
 * Stratified bindings to the client-side Twitter API.
 *
 * Part of the Oni Apollo Standard Module Library
 * Version: 'unstable'
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
/**
  @module    webapi/twitter
  @summary   Stratified bindings to the Twitter API.
  @home      sjs:webapi/twitter
*/

var sys = require('builtin:apollo-sys');

var http = require("../http");

/**
  @function  getProfile
  @summary   Retrieve a Twitter profile.
  @param     {String} [name] Twitter profile id.
  @return    {Object}
*/
exports.getProfile = function(id) {
  return http.jsonp(["http://api.twitter.com/1/users/show.json", {user_id:id}]);
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
  @param     {optional Object} [params] Key/value hash with optional request parameters. See <http://apiwiki.twitter.com/Twitter-Search-API-Method:-search>
  @return    {Object}
*/
exports.search = function(query, params) {
  return http.jsonp(["http://search.twitter.com/search.json",{q:query}, params]);
};

