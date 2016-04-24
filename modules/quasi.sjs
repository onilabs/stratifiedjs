/*
 * StratifiedJS 'object' module
 * Functions for working with quasis
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
   @module  quasi
   @summary Functions for working with quasis (see also [sjs:#language/syntax::quasi-quote])
   @home    sjs:quasi
*/

/**
   @class Quasi
   @summary A datastructure consisting of alternating literal strings and interpolated values
   @desc  
     A quasi is a datastructure consisting of an array, accessible through the 
     `parts` member. Elements at even (0,2,4,6,...) indices of this array are strings, 
     whereas elements at odd (1,3,5,7,...) indices can be any object type. 

     Usually a quasi is constructed using the quasi literal syntax, e.g.:

         `foo${bar}baz`

     This is the literal syntax for the quasi with `parts` equal to `['foo', bar, 'baz']`.
     I.e. elements of `parts` at even indices (0,2,4,6,...) will contain the literal string
     parts of the quasi literal, whereas the elements at odd indices (1,3,5,7,...) will
     contain the interpolated parts.

     Quasis are useful for constructing safe template grammars for HTML, SQL, 
     or similar textual language. 

     E.g. a common source of security sensitive bugs in web applications stems 
     from the mixing of literal and user supplied content to create HTML:
    
         var user_comment = retrieve_user_comment_from_db();
         var comment_html = "<pre>" + user_comment + "</pre>";
         showHtml(comment_html);

     Here, if `user_comment` has not been properly escaped, we have a classic attack 
     vector for a script injection attack. 

     Note that by the time `showHtml()` sees the HTML string it is to late to 
     escape the sensitive parts of the string: All that `showHtml()` sees is a 
     flat string; we have lost the information that the `"<pre>"`
     and `"</pre>"` parts are programmer supplied literals, whereas `user_comment` is 
     a potentially unsafe interpolated value.

     Quasi literals give us a way of retaining this information:

         var user_comment = retrieve_user_comment_from_db();
         var comment_html = `<pre>$user_comment</pre>`;
         showHtml(comment_html);

     Here, `showHtml()` will see a quasi with `parts` equal to 
     `['<pre>', user_comment, '</pre>']`. Before concatenating the parts into a final
     HTML string, it can thus make sure that the interpolated elements (at odd indices) are
     properly escaped:

         function showHtml(html) {
           var html_str = '';
           for (var i=0; i<html.parts.length; ++i) {
             if (i%2) 
               html_str += escape_for_html(html.parts[i]);
             else
               html_str += html.parts[i];
           }
           showHtmlString(html_str);
         }
*/

var { Quasi, isQuasi } = require('builtin:apollo-sys');
var { join } = require('sjs:sequence');

/**
   @function isQuasi
   @summary  Tests if an object is a Quasi
   @param    {anything} [testObj] Object to test.
   @return   {Boolean}
*/
exports.isQuasi = isQuasi;

/**
   @function Quasi
   @summary Create a Quasi from an array
   @param {Array} [parts] Array of alternating literal strings (parts[0], parts[2], ...) and interpolated (parts[1], parts[3], ...) values.
   @return {::Quasi}
   @desc
     * To create a valid quasi, elements at even array indices (0,2,4,6,...) should be strings. They correspond to the literal string parts of a quasi literal. 

     ### Example:

         Quasi(['<h1>', heading, '</h1>'])

     is equivalent to the literal quasi

         `<h1>$heading</h1>`
*/
exports.Quasi = Quasi;

/**
   @function joinQuasis
   @param {::Quasi|Array} [quasi...] An array of quasis or multiple quasi arguments
   @return {::Quasi}
   @summary Concatenate several quasis
   @desc
     ### Example:
     
         joinQuasis(`a${b}c`, `d${e}f`, `${g}h`)

     results in

         `a${b}cd${e}f${g}h`

*/
exports.joinQuasis = join._joinQuasis;

/**
   @function mapQuasi
   @param {::Quasi} [quasi] A quasi
   @param {Function} [fn] A converter function
   @return {Array}
   @summary Replaces each embedded (interpolated) value in quasi with the result of `fn(value)`,
            and returns these values interleaved with the literals from the quasi
            (i.e. a copy of `quasi.parts`, but with every second value processed with `fn`).
   @desc
     ### Example:
     
         var user_input = "<script>";
         mapQuasi(`Making html safe, one ${user_input} at a time!`, require("sjs:string").sanitize);

     results in:

         ["Making html safe, one ", "&lt;script&gt;", " at a time!"]

*/
function mapQuasi(quasi, fn) {
  if (!isQuasi(quasi)) throw new Error("Not a quasi: #{quasi}");
  var result = quasi.parts.slice();
  for (var i=1; i<quasi.parts.length; i+=2) {
    result[i] = fn(result[i]);
  }
  return result;
};
exports.mapQuasi = mapQuasi;

/**
   @function toQuasi
   @param {Object} [val]
   @return {::Quasi}
   @summary Wrap a value in a quasi if it is not already one.
   @desc
     If `val` is not a quasi, it is wrapped as an interpolated value,
     i.e \`${val}\`.

*/
exports.toQuasi = function(val) {
  if (exports.isQuasi(val)) return val;
  return `$val`;
};
