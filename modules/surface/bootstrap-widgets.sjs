/*
 * Oni Apollo 'surface/bootstrap-widgets' module
 * High-level Twitter Bootstrap Widgets
 *
 * Part of the Oni Apollo Standard Module Library
 * Version: 'unstable'
 * http://onilabs.com/apollo
 *
 * (c) 2012-2013 Oni Labs, http://onilabs.com
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
   @module  surface/bootstrap-widgets
   @summary High-level Twitter Bootstrap Widgets
   @home    sjs:surface/bootstrap-widgets
   @hostenv xbrowser
   @desc
      * High-level widgets for use with the [bootstrap::] module
      * Work-in-progress     
*/

var surface = require('./base');
var { map, join } = require('../sequence');
var str = require('../string');

exports.ButtonDropdown = function(title, items) {

  var menu = items .. 
    map(item ->
        "<li><a href='#' data-command='#{item[1]}'>#{str.sanitize(item[0])}</a></li>") ..
    join('');

  var ui = surface.Html("
    <div class='btn-group'>
      <a class='btn dropdown-toggle' data-toggle='dropdown' href='#'>
        #{str.sanitize(title)}
      <span class='caret'></span>
      </a>
      <ul class='dropdown-menu'>
        #{menu}
      </ul>
    </div>
");
  surface.mixinCommandAPI(ui);
  return ui;
};
