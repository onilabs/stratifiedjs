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

var { map, toArray } = require('../sequence');
var { Html, CSS } = require('./base');
var { defaultLookAndFeel, Mixins, darken, scale } = require('./bootstrap');
var { getOffset } = require('../xbrowser/dom');
var { override } = require('../object');

//----------------------------------------------------------------------
// ButtonDropdown

function ButtonDropdown(title, items) {

  var menu = items .. 
    map(item ->
        `<li><a href='#' data-command='${item[1]}'>${item[0]}</a></li>`) ..
    toArray;

  return `
    <div class='btn-group' style='border:1px solid green'>
      <a class='btn dropdown-toggle' data-toggle='dropdown' href='#'>
        $title
      <span class='caret'></span>
      </a>
      <ul class='dropdown-menu'>
        $menu
      </ul>
    </div>
    `;
}
exports.ButtonDropdown = ButtonDropdown;


//----------------------------------------------------------------------
// Pop-Overs

// Port of bootstrap's popovers.less, split into 4:

__js var CSSPopover = function() {
  var vars = defaultLookAndFeel; // XXX how to get custom lookandfeel into this?
  var mixins = Mixins(vars);
 
  // XXX cache
  return CSS("
/* Popovers */
/* -------------------------------------------------- */

{
  position: absolute;
  top: 0;
  left: 0;
  z-index: #{vars.zindexPopover()};
  display: block;
  width: 236px;
  padding: 1px;
  text-align: left; /* Reset given new insertion method */
  background-color: #{vars.popoverBackground()};
  -webkit-background-clip: padding-box;
     -moz-background-clip: padding;
          background-clip: padding-box;
  border: 1px solid #ccc;
  border: 1px solid rgba(0,0,0,.2);
  #{mixins.border_radius('6px')}
  #{mixins.box_shadow('0 5px 10px rgba(0,0,0,.2)')}

  /* Overrides for proper insertion */
  white-space: normal;

  /* Offset the popover to account for the popover arrow */
}

.popover-title {
  margin: 0; /* reset heading margin */
  padding: 8px 14px;
  font-size: 14px;
  font-weight: normal;
  line-height: 18px;
  background-color: #{vars.popoverTitleBackground()};
  border-bottom: 1px solid #{darken(vars.popoverTitleBackground(), .05) };
  #{mixins.border_radius('5px 5px 0 0')}
}

.popover-content {
  padding: 9px 14px;
}

/* Arrows */

/* .arrow is outer, .arrow:after is inner */

.arrow,
.arrow:after {
  position: absolute;
  display: block;
  width: 0;
  height: 0;
  border-color: transparent;
  border-style: solid;
}
.arrow {
  border-width: #{vars.popoverArrowOuterWidth()};
}
.arrow:after {
  border-width: #{vars.popoverArrowWidth()};
  content: '';
}
");
};

__js var CSSPopoverLeft = function() {
  var vars = defaultLookAndFeel; // XXX how to get custom lookandfeel into this?
  var mixins = Mixins(vars);
  
  // XXX cache
  return CSS("
{ margin-left: -10px; }
.arrow {
    top: 50%;
    right: #{vars.popoverArrowOuterWidth() .. scale(-1) };
    margin-top: #{vars.popoverArrowOuterWidth() .. scale(-1) };
    border-right-width: 0;
    border-left-color: #999; // IE8 fallback
    border-left-color: #{vars.popoverArrowOuterColor()};
  }
.arrow:after {
      right: 1px;
      border-right-width: 0;
      border-left-color: #{vars.popoverArrowColor()};
      bottom: #{vars.popoverArrowWidth() .. scale(-1)};
    }
");
}

__js var CSSPopoverRight = function() {
  var vars = defaultLookAndFeel; // XXX how to get custom lookandfeel into this?
  var mixins = Mixins(vars);
  
  // XXX cache
  return CSS("
{ margin-left: 10px; }
.arrow {
    top: 50%;
    left: #{vars.popoverArrowOuterWidth() .. scale(-1) };
    margin-top: #{vars.popoverArrowOuterWidth() .. scale(-1)};
    border-left-width: 0;
    border-right-color: #999; // IE8 fallback
    border-right-color: #{vars.popoverArrowOuterColor()};
  }
.arrow:after {
      left: 1px;
      bottom: #{vars.popoverArrowWidth() .. scale(-1)};
      border-left-width: 0;
      border-right-color: #{vars.popoverArrowColor()};
    }
");
}

__js var CSSPopoverTop = function() {
  var vars = defaultLookAndFeel; // XXX how to get custom lookandfeel into this?
  var mixins = Mixins(vars);
  
  // XXX cache
  return CSS("
{ margin-top: -10px; }
.arrow {
    left: 50%;
    margin-left: #{scale(vars.popoverArrowOuterWidth(), -1)};
    border-bottom-width: 0;
    border-top-color: #999; // IE8 fallback
    border-top-color: #{vars.popoverArrowOuterColor()};
    bottom: #{scale(vars.popoverArrowOuterWidth(), -1)};
  }
.arrow:after {
      bottom: 1px;
      margin-left: #{vars.popoverArrowWidth() .. scale(-1)};
      border-bottom-width: 0;
      border-top-color: #{vars.popoverArrowColor()};
    }
");
}

__js var CSSPopoverBottom = function() {
  var vars = defaultLookAndFeel; // XXX how to get custom lookandfeel into this?
  var mixins = Mixins(vars);
  
  // XXX cache
  return CSS("
{ margin-top: 10px; }
.arrow {
    left: 50%;
    margin-left: #{scale(vars.popoverArrowOuterWidth(), -1)};
    border-top-width: 0;
    border-bottom-color: #999; // IE8 fallback
    border-bottom-color: #{vars.popoverArrowOuterColor()};
    top: #{scale(vars.popoverArrowOuterWidth(), -1)};
  }
.arrow:after {
      top: 1px;
      margin-left: #{vars.popoverArrowWidth() .. scale(-1)};
      border-top-width: 0;
      border-bottom-color: #{vars.popoverArrowColor()};
    }
");
}

/**
   @function withPopover
   @altsyntax anchor .. withPopover(settings) { |popover| ... }
   @summary Display a popover
   @param {base::UIElement} [anchor] Element to which popover will be anchored
   @param {Object} [settings] Object with popover settings
   @param {Function} [block] Function which bounds the lifetime of the popover
   @setting {optional String} [placement='right'] Where to display the popover relative to the anchor ('left', 'right', 'top', 'bottom')
   @setting {optional base::UIElement|String|Quasi} [title=undefined] Popover title
   @setting {optional base::UIElement|String|Quasi} [content=''] Popover content
*/
function withPopover(anchor, settings, block) {
  settings = {
    placement: 'right',
    title: undefined,
    content: '',
  } .. override(settings);

  var container = Html({ content: anchor.dompeer.parentNode });
  container.activate();
  container.activated();

  var style = [CSSPopover()];
  switch (settings.placement) {
  case 'left':
    style.push(CSSPopoverLeft());
    break;
  case 'right':
    style.push(CSSPopoverRight());
    break;
  case 'top':
    style.push(CSSPopoverTop());
    break;
  case 'bottom':
    style.push(CSSPopoverBottom());
    break;
  default:
    throw new Error("Invalid popover placement #{settings.placement}");
  }

  container.withUI(
    Html({
      style: style,
      content:`<div class='popover'>
                 <div class='arrow'></div>
                 <div class='popover-inner'>
                   ${settings.title ? `<h3 class='popover-title'>${settings.title}</h3>` : ''}
                   <div class='popover-content'>
                     ${settings.content}
                   </div>
                 </div>
               </div>`
    })
  ) {
    |ui|
    var { top, left } = getOffset(anchor.dompeer);
    switch (settings.placement) {
    case 'left':
      top += anchor.dompeer.offsetHeight/2 - ui.dompeer.offsetHeight/2;
      left -= ui.dompeer.offsetWidth;
      break;
    case 'right':
      top += anchor.dompeer.offsetHeight/2 - ui.dompeer.offsetHeight/2;
      left += anchor.dompeer.offsetWidth;
      break;
    case 'top':
      top -= ui.dompeer.offsetHeight;
      left += anchor.dompeer.offsetWidth/2 - ui.dompeer.offsetWidth/2;
      break;
    case 'bottom':
      top += anchor.dompeer.offsetHeight;
      left += anchor.dompeer.offsetWidth/2 - ui.dompeer.offsetWidth/2;
      break;
    }

    ui.dompeer.style.top = top+'px';
    ui.dompeer.style.left = left+'px'; 
    block();
  }
}

exports.withPopover = withPopover;


