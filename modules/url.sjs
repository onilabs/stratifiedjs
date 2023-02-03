/*
 * StratifiedJS 'url' module
 * Functions for manipulating URLs
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '1.0.0'
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2013-2016 Oni Labs, http://onilabs.com
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
  @module    url
  @summary   Functions for manipulating URLs
  @home      sjs:url
  @inlibrary sjs:std as url
  @inlibrary mho:std as url
*/
'use strict';

var sys = require('builtin:apollo-sys');
var {startsWith, endsWith} = require('sjs:string');

/**
  @function  buildQuery
  @summary Build a URL query string.
  @param {QUERYHASHARR} [hashes] Object(s) with key/value pairs.
         See below for full syntax.
  @return {String}
  @desc
    ###Notes:

    *hashes* can be a simple object with key/values or an arbitrarily nested
    array of (arrays of) key/value objects.

    Instead of passing an array, the individual array components can also
    be passed as individual parameters to [::build].
    E.g. the following two calls are equivalent:

         url.buildQuery({a:1}, {b:1});
         // is equivalent to
         url.buildQuery([{a:1}, {b:1}]);


    If the value in a key/value pair is an array [a,b,c], then
    a key=value query will be encoded for each of the array elements.

    ###Examples:

        url.buildQuery({a:1}, {b:1}); // -> "a=1&b=1"

        url.buildQuery({a:1,b:"foo&bar"}); // -> "a=1&b=foo%26bar"

        url.buildQuery([[null,[{a:1,b:['x','y']},{c:3}],[[]]]]);
        // -> "a=1&b=x&b=y&c=3"`

    Full syntax for *hashes*:

        QUERYHASHARR :  arbitraily nested array of [ QUERYHASH* ]

        QUERYHASH : { QUERY* } | undefined

        QUERY      : SIMPLE_QUERY | MULTI_QUERY

        SIMPLE_QUERY : "field" : "value"

        MULTI_QUERY  : "field" : [ "value1", ... ]

*/
exports.buildQuery = sys.constructQueryString;

/**
  @function build
  @summary Build a URL string.
  @param {URLSPEC} [urlspec] Base string/quasi and optional path strings/quasis
                   and query hashes. See below for full syntax.
  @return {String}
  @desc
    ###Notes:

    *urlspec* can be a simple string or quasi or an (arbitrarily nested) array composed
    of one base string/quasi, and optionally a number of path strings/quasis and/or a
    number of QUERYHASH objects (as accepted by
    [::buildQuery]).

    Instead of passing an array, the individual array components can also
    be passed as individual parameters to [::build].
    E.g. the following two calls are equivalent:

         url.build("foo", "bar", "baz");
         // is equivalent to
         url.build(["foo", "bar", "baz"]);

    Base & path strings/quasis will be concatenated in such a way that there is
    exactly one '/' character between each component.

    Quasis are useful to construct URLs with arbitrary content that needs to be encoded. The interpolated elements 
    of quasis will be encoded with [::encodeURIComponentRFC3986].

    The base string/quasi may contain a '?' character. In this case no path strings
    should be given, but query hashes can be specified and will be appended
    correctly (using '&' instead of '?').

    ###Examples:

        url.build("foo.txt"); // -> "foo.txt"

        url.build(`dir/${"foo/bar"}.txt`); // -> "dir/foo%2Fbar.txt"

        url.build("foo", "bar", "foo.txt"); // -> "foo/bar/foo.txt"

        url.build("foo/", "/bar/"); // -> "foo/bar/"

        url.build("foo?a=b"); // -> "foo?a=b"

        url.build("foo?a=b", {b:1}); // -> "foo?a=b&b=1"

        url.build("foo?a=b", {b:[1,2]}); // -> "foo?a=b&b=1&b=2"

        url.build("foo?a=b", [{b:[1,2]}]); // -> "foo?a=b&b=1&b=2"

        url.build(["http://foo", {bar:"x", zz:"w"}, {foo:[1,2,3]}]);
        // -> "http://foo?bar=x&zz=w&foo=1&foo=2&foo=3"

        url.build([["http://foo", {bar:"x", zz:"w"}], [{foo:[1,2,3]}]]);
        // -> "http://foo?bar=x&zz=w&foo=1&foo=2&foo=3"

    Full syntax for *urlspec*:

        URLSPEC   : arbitrarily nested array
                    [ BASESTR_OR_QUASI , PATHSTR_OR_QUASI* , QUERYHASH* ]

        BASESTR   : string or quasi with url base (e.g. "http://onilabs.com/foo")

        PATHSTR   : string or quasi with directory component

        QUERYHASH : { QUERY* } | undefined

        QUERY      : SIMPLE_QUERY | MULTI_QUERY

        SIMPLE_QUERY : "field" : "value"

        MULTI_QUERY  : "field" : [ "value1", ... ]
*/
exports.build = sys.constructURL;

/**
  @function parse
  @summary Parses the given URL into components.
  @param {String} [url] URL to parse.
  @return {Object} Parsed URL as described below.
  @desc
     Uses the parseuri function from <http://blog.stevenlevithan.com/archives/parseuri> in 'strict' mode, with an additional bug fix that corrects a parsing issue with '@' characters, as well as an amendment that correctly parses IPV6 addresses.

     A url such as `http://www.onilabs.com/foo/bar?x=y&z=a%20b#anchor%201` will be parsed to an object:

         {
           anchor: "anchor%201",
           authority: "www.onilabs.com",
           directory: "/foo/",
           file: "bar",
           host: "www.onilabs.com",
           password: "",
           path: "/foo/bar",
           port: "",
           protocol: "http",
           query: "x=y&z=a%20b",
           relative: "/foo/bar?x=y&z=a%20b#anchor%201",
           source: "http://www.onilabs.com/foo/bar?x=y&z=a%20b#anchor%201"
           user: ""
           userInfo: ""
           ipv6: false
         }

     **Note:** this function does *NOT* decode the URL components.

     For example, `parse('http://example.com/file%20name').file`
     will return `'file%20name'`, not 'file name'.

     In addition to the above description of the `parseuri` function, the
     object returned also has the following methods:

      * `toString()` -> returns the string representation of the URL.

      * `params()` -> returns an object populated from the query string.
        Unlike the keys of the parsed URL, both keys & values are URL-decoded.

        The behaviour when a key is specified more than once is for the last
        value to override previous values.

        The presence of invalid (non-UTF-8) escape sequences in a query string
        will cause this function to throw an error, since this is the behaviour
        of decodeURIComponent.

        A call to `params()` on the example object above would return `{x: "y", z: "a b"}`.
*/
exports.parse = sys.parseURL;

/**
  @function isSameOrigin
  @summary Checks if the given URLs have matching authority parts.
  @param {String} [url1] First URL.
  @param {String} [url2] Second URL.
  @desc
    If either URL is missing an authority part (i.e. it is a relative URL),
    the function returns true as well.

    Note that default ports (such as '80' for 'http' and '443' for 'https') will not be automatically inferred. E.g.
    the URL `http://foo.com` will not be identified as being the same origin as `http://foo.com:80`.
*/
exports.isSameOrigin = sys.isSameOrigin;

/**
  @function normalize
  @summary Convert relative to absolute URLs and collapse '.' and '..' path
           components as well as multiple consecutive slashes.
  @param {String} [url] URL to normalize.
  @param {optional String} [base] URL which will be taken as a base if *url* is relative.
  @return {String} Normalized URL.
  @desc
    ###Examples:

         url.normalize("/foo/bar.txt", "http://a.b/c/d/baz.txt");
         // --> "http://a.b/foo/bar.txt"

         url.normalize("foo/bar.txt", "http://a.b/c/d/baz.txt");
         // --> "http://a.b/c/d/foo/bar.txt"

         url.normalize("././foo/./bar.txt", "http://a.b/c/d/");
         // --> "http://a.b/c/d/foo/bar.txt"

         url.normalize(".././foo/../bar.txt", "http://a.b/c/d/");
         // --> "http://a.b/c/bar.txt"

    Note: If there are not enough path components to collapse a '..', it will be silently 
    ignored, i.e. the normalized url will never contain '..':

        url.normalize("../../../../../baz.txt", "http://example.com/foo/bar");
        // --> "http://example.com/baz.txt"

*/
exports.normalize = sys.normalizeURL;

/**
   @function canonicalize
   @summary Decode all percent-encoded unreserved characters in a url
   @param {String} [url] URL to canonicalize
   @return {String} Canonicalized URL
   @desc
     URIs that differ only by whether an unreserved character (as defined in RFC 3986)
     is percent-encoded or appears literally are equivalent by definition.
     
     `canonicalize` idempotently decodes all percent-encoded unreserved 
     characters to their literal representation.
*/
__js {

  function replaceUnreserved(p_encoded) {
    var charcode = p_encoded.substring(1) .. parseInt(16);

    // unreserved are A-Z a-z 0-9 '-' '_' '.' '~'
    if ( (charcode >= 65 && charcode <= 90) || // A-Z
         (charcode >= 97 && charcode <= 122) || // a-z
         (charcode === 45) || // -
         (charcode === 95) || // _
         (charcode === 46) || // .
         (charcode === 126) // ~
       )
      return String.fromCharCode(charcode);
    else
      return p_encoded;
  }
  
  exports.canonicalize = function(url) {
    return url.replace(/\%[A-Fa-f0-9][A-Fa-f0-9]/g, replaceUnreserved); 
  };
}

/**
   @function encodeURIComponentRFC3986
   @summary Stricter version of encodeURIComponent which also escapes !, ', (, ), and *.
   @param {String} [uri_component]
   @desc
     See also https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent
*/
exports.encodeURIComponentRFC3986 = sys.encodeURIComponentRFC3986;

/**
   @function encode
   @summary Alias for encodeURIComponent
   @param {String} [uri] The component to encode
   @return {String} An encoded URI component
   @desc
      See also [::encodeURIComponentRFC3986]
*/
exports.encode = encodeURIComponent;

/**
   @function decode
   @summary Alias for decodeURIComponent
   @param {String} [uri] The component to decode
   @return {String} A decoded URI component
*/
exports.decode = decodeURIComponent;

/**
   @function toPath
   @summary Convert URL -> path
   @param {String} [url] file: URL
   @return {String} The filesystem path.
   @hostenv nodejs
   @desc
     The returned path will be absolute or relative,
     depending on the input path. An error will be thrown
     if `url` is not a file: URL.
*/
exports.toPath = sys.fileUrlToPath;

/**
   @function coerceToPath
   @param {String} [pathOrUrl] A 'file:' URL or filesystem path
   @return {String} A URL
   @summary Coerce `pathOrUrl` to a local file path
   @hostenv nodejs
   @desc
      If `pathOrUrl` doesn't start with 'file:', it is returned unchanged otherwise it will be
      converted to file path using [::toPath].
*/
__js exports.coerceToPath = function(pathOrUrl) {
  if (pathOrUrl.indexOf('file:') === 0)
    return sys.fileUrlToPath(pathOrUrl);
  else
    return pathOrUrl;
};

/**
   @function fileURL
   @summary Convert a filesystem path into a 'file:' URL
   @param {String} [path] The input path (absolute or relative)
   @return {String} An absolute 'file:' URL
   @hostenv nodejs
   @desc
      If the path is relative, it will be normalized (against process.cwd())
      in the nodejs environment. Relative paths will be left as-is in an xbrowser
      environment, since there is no concept of a working directory there.
*/
exports.fileURL = sys.pathToFileUrl;

/**
   @function coerceToURL
   @param {String} [pathOrUrl] A URL or filesystem path
   @return {String} A URL
   @summary Coerce `pathOrUrl` to a URL
   @hostenv nodejs
   @desc
      If `pathOrUrl` is already a URL, it is returned unchanged. If it doesn't
      look like a URL, it's assumed to be a local file path and converted to
      a 'file:' URL using [::fileURL].
      
      This is often useful for command line tools which accept a
      URLs for generality, but which are often used with local paths
      for convenience.
*/
exports.coerceToURL = sys.coerceToURL;
