/*
 * StratifiedJS 'url' module
 * Functions for manipulating URLs
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.20.0-development'
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2013 Oni Labs, http://onilabs.com
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
*/

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
  @param {URLSPEC} [urlspec] Base string and optional path strings
                   and query hashes. See below for full syntax.
  @return {String}
  @desc
    ###Notes:

    *urlspec* can be a simple string or an (arbitrarily nested) array composed
    of one base strings, and optionally a number of path strings and/or a
    number of QUERYHASH objects (as accepted by
    [::buildQuery]).

    Instead of passing an array, the individual array components can also
    be passed as individual parameters to [::build].
    E.g. the following two calls are equivalent:

         url.build("foo", "bar", "baz");
         // is equivalent to
         url.build(["foo", "bar", "baz"]);

    Base & path strings will be concatenated in such a way that there is
    exactly one '/' character between each component.

    The base string may contain a '?' character. In this case no path strings
    should be given, but query hashes can be specified and will be appended
    correctly (using '&' instead of '?').

    ###Examples:

        url.build("foo.txt"); // -> "foo.txt"

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
                    [ BASESTR , PATHSTR* , QUERYHASH* ]

        BASESTR   : string with url base (e.g. "http://onilabs.com/foo")

        PATHSTR   : string with directory component

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
  @return {Object} Parsed URL as described at <http://stevenlevithan.com/demo/parseuri/js/> (using 'strict' mode).
  @desc
     Uses the parseuri function from <http://blog.stevenlevithan.com/archives/parseuri>.

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
*/
exports.isSameOrigin = sys.isSameOrigin;

/**
  @function normalize
  @summary Convert relative to absolute URLs and collapse '.' and '..' path
           components.
  @param {String} [url] URL to canonicalize.
  @param {optional String} [base] URL which will be taken as a base if *url* is relative.
  @return {String} Canonicalized URL.
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

*/
exports.normalize = sys.canonicalizeURL;

/**
   @function encode
   @summary Alias for encodeURIComponent
   @param {String} [uri] The component to encode
   @return {String} An encoded URI component
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
   @param {String} [url] file:// URL
   @return {String} The filesystem path.
   @hostenv nodejs
   @desc
     The returned path will be absolute or relative,
     depending on the input path. An error will be thrown
     if `url` is not a file:// URL.
*/
exports.toPath = sys.fileUrlToPath;

/**
   @function fileURL
   @summary Convert a filesystem path into a file:// URL
   @param {String} [path] The input path (absolute or relative)
   @return {String} An absolute file:// URL
   @hostenv nodejs
   @desc
      If the path is relative, it will be canonicalized (against process.cwd())
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
      a file:// URL using [::fileURL].
      
      This is often useful for command line tools which accept a
      URLs for generality, but which are often used with local paths
      for convenience.
*/
exports.coerceToURL = sys.coerceToURL;
