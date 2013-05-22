/*
 * Oni Apollo 'surface/bootstrap' module
 * Lightweight cross-browser UI toolkit - Twitter Bootstrap Components
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
   @module  surface/bootstrap
   @summary Lightweight cross-browser UI toolkit - Twitter Bootstrap Components (unstable work-in-progress)
   @home    sjs:surface/bootstrap
   @hostenv xbrowser
   @desc
      * Port of [Twitter Bootstrap](http://twitter.github.com/bootstrap/)
      * Also contains [Font Awesome](http://fortawesome.github.com/Font-Awesome)
      * Twitter Bootstrap is licensed under the Apache License V2
      * Font Awesome is licensed under [CC BY 3.0](http://creativecommons.org/licenses/by/3.0/) with the following provision:

          A mention of Font Awesome -
          http://fortawesome.github.com/Font-Awesome in human-readable
          source code is considered acceptable attribution (most
          common on the web). If human readable source code is not
          available to the end user, a mention in an 'About' or
          'Credits' screen is considered acceptable (most common in
          desktop or mobile software).

      * Work-in-progress
      
     
*/
//TODO: document

waitfor { var base = require('./base');                                        }
and     { var { toArray, map, each, join, integers } = require('../sequence'); }
and     { var func = require('../function');                                   }
and     { var { merge } = require('../object');                                }

var tt = new Date();

//----------------------------------------------------------------------

/**
   @variable root
   @summary  Copy of [base::root] (instance of [base::RootElement] for main window of the webapp)
*/
__js exports.root = base.root;

/**
   @function  Container
   @altsyntax Container(child1, ...)
   @summary Create a [base::UIContainerElement] with full [bootstrap::] 
            styles and mechanisms applied.
   @param {Object} [attribs] Object with attributes 
   @attrib {Array} [children] Array of children
   @attrib {String} [containerClass='container'] CSS class of the container (e.g. 'container-fluid' or '')
   @attrib {Boolean} [responsive=false] Wether or not to enable responsive Bootstrap features
   @attrib {Object} [lookAndFeel=::defaultLookAndFeel] Bootstrap customization object
   @attrib {Array|base::StyleElement} [style] Additional styles
   @attrib {Object} [mechanism] Mechanism (by default the dropdown, tabs, collapsing, alerts and modal mechanisms will be applied)
   @return {base::UIContainerElement}
*/
exports.Container = function(/*attribs*/) {

  var attribs;
  if (arguments.length == 1 && !base.UIElement.isPrototypeOf(arguments[0]))
    attribs = arguments[0];
  else 
    attribs = { children: toArray(arguments ) };

  attribs = merge({containerClass:'container'}, attribs);

  var lf = Object.create(attribs.lookAndFeel ? attribs.lookAndFeel : defaultLookAndFeel);

  var style = [CSSReset(lf), CSSScaffolding(lf), CSSGrid(lf), CSSLayouts(lf),
      CSSComponentAnimations(lf), CSSType(lf), CSSCode(lf), CSSTables(lf), CSSWells(lf),
      CSSForms(lf), CSSButtons(lf), CSSButtonGroups(lf), CSSAlerts(lf), CSSDropdowns(lf),
      CSSLabelsBadges(lf), CSSThumbnails(lf), CSSProgressBars(lf), CSSHeroUnit(lf),
      CSSNavs(lf), CSSNavbar(lf), CSSBreadcrumbs(lf), CSSModals(lf), CSSFontAwesome(lf),
               CSSClose(lf)];
  if (attribs.responsive)
    style.push(CSSResponsive(lf));

  var mech;
  if (attribs.mechanism !== undefined)
    mech = attribs.mechanism;
  else
    mech = func.par(mechanism.dropdowns, 
                    mechanism.tabs,
                    mechanism.collapsing,
                    mechanism.alert, 
                    mechanism.modal);

  if (attribs.style)
      style = style.concat(attribs.style);

  var rv = base.Html({
    content: "<div><div class='#{attribs.containerClass}'></div></div>",
    style: style,
    mechanism: mech
  }).selectContainer('div > div');

  (attribs.children || []) .. each { |c| rv.append(c) }

  return rv;
};

//----------------------------------------------------------------------
// color arithmetic 

// partially derived from code by the less.js project (http://lesscss.org/), which
// is licensed under the Apache License V 2.0

/*
 formats:

  css:
    3 digit hex string:   #RGB
    6 digit hex string:   #RRGGBB
    rgb functional str:   rgb(num_or_num%, num_or_num%, num_or_num%)
    rgba functional str:  rgba(num_or_num%, num_or_num%, num_or_num, num)
    hsl functional str:   hsl(num, num%, num%)
    hsla functional str:  hsla(num, num%, num%, num)
    color keywords not supported!!

  rgba: [r,g,b,a] (r,g,b: 0-255, a:0-1)

  hsla: [h,s,l,a] (h:0-360, s:0-1, l:0-1, a:0-1)
*/
__js {

function rgbaToHsla(rgba) {
  var r = rgba[0]/255, g = rgba[1]/255, b = rgba[2]/255;
  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var h, s, l = (max + min) / 2, d = max - min;

  if (max == min) {
    h = s = 0;
  } 
  else {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (r == max)
      h = (g - b) / d + (g < b ? 6 : 0);
    else if (g == max)
      h = (b - r) / d + 2;
    else
      h = (r - g) / d + 4;            
    h /= 6;
  }
  return [h * 360, s, l, rgba[3]];
}


var cssColorRE = /#([a-fA-F0-9]{6})|#([a-fA-F0-9]{3})|rgb\(([^\)]+)\)|rgba\(([^\)]+)\)|hsl\(([^\)]+)\)|hsla\(([^\)]+)\)/;
function cssToRgba(css_color) {
  var matches = cssColorRE.exec(css_color);
  if (!matches) throw new Error("invalid css color "+css_color);

  var rgba;
  if (matches[1]) {
    // 6 digit hex string
    rgba = matches[1].match(/.{2}/g) .. map(c => parseInt(c,16)) .. toArray;
    rgba.push(1);
  }
  else if (matches[2]) {
    // 3 digit hex string
    rgba = matches[2].split('') .. map(c => parseInt(c+c,16)) .. toArray;
    rgba.push(1);
  }
  else if (matches[3]) {
    // rgb(.)
    rgba = matches[3].split(",") .. 
      map(n => n.indexOf("%") > -1 ? parseFloat(n)*2.55 : parseFloat(n)) ..
      toArray;
    rgba.push(1);
    if (rgba.length != 4) throw new Error("invalid css color "+css_color);
  }
  else if (matches[4]) {
    // rgba(.)
    rgba = matches[4].split(",") .. 
      map(n => n.indexOf("%") > -1 ? parseFloat(n)*2.55 : parseFloat(n)) ..
      toArray;
    if (rgba.length != 4) throw new Error("invalid css color "+css_color);
  }
  else if (matches[5]) {
    throw new Error("write me");
    // hsl(.)
  }
  else if (matches[6]) {
    throw new Error("write me");
    // hsla(.)
  }

  return rgba;
}

function cssToHsla(css_color) {
  return rgbaToHsla(cssToRgba(css_color));
}

function clamp01(val) { return Math.min(1, Math.max(0,val)); }
function clamp0255(val) { return Math.min(255, Math.max(0,val)); }

function hexByte(v) {
  v = clamp0255(Math.round(v)).toString(16);
  return v.length == 1 ? "0#{v}" : v;
}

function hslaToRgba(hsla) {
  var h = (hsla[0] % 360)/360;
  var s = hsla[1];
  var l = hsla[2];
  var a = hsla[3];

  var m2 = l <= 0.5 ? l * (s + 1) : l + s - l * s;
  var m1 = l * 2 - m2;

  function hue(h) {
    h = h < 0 ? h + 1 : (h > 1 ? h - 1 : h);
    if      (h * 6 < 1) return m1 + (m2 - m1) * h * 6;
    else if (h * 2 < 1) return m2;
    else if (h * 3 < 2) return m1 + (m2 - m1) * (2/3 - h) * 6;
    else                return m1;
  }
  
  return [hue(h+1/3)*255, hue(h)*255, hue(h-1/3)*255, a];
}


function rgbaToCss(rgba) {
  if (rgba[3] < 1.0) {
    return "rgba(#{ rgba .. map(c => Math.round(c)) .. join(',') })";
  }
  else {
    rgba.pop();
    return "##{ rgba .. map(hexByte) .. join('') }";
  }
}

function hslaToCss(hsla) {
  return rgbaToCss(hslaToRgba(hsla));
}

function darken(css_color, amount) {
  var hsla = cssToHsla(css_color);
  hsla[2] = clamp01(hsla[2] - amount);
  return hslaToCss(hsla);
}

function lighten(css_color, amount) {
  var hsla = cssToHsla(css_color);
  hsla[2] = clamp01(hsla[2] + amount);
  return hslaToCss(hsla);  
}

function fadein(css_color, amount) {
  var hsla = cssToHsla(css_color);
  hsla[3] = clamp01(hsla[3] + amount);
  return hslaToCss(hsla);
}

function spin(css_color, amount) {
  var hsla = cssToHsla(css_color);
  hsla[0] = (hsla[0] + amount) % 360;
  if (hsla[0] < 0) hsla[0] += 360;
  return hslaToCss(hsla);
}

//
// Copyright (c) 2006-2009 Hampton Catlin, Nathan Weizenbaum, and Chris Eppstein
// http://sass-lang.com
//
function mix(color1, color2, weight) {
  color1 = cssToRgba(color1);
  color2 = cssToRgba(color2);
  var w = weight * 2 - 1;
  var a = color1[3] - color2[3];

  var w1 = (((w * a == -1) ? w : (w + a) / (1 + w * a)) + 1) / 2.0;
  var w2 = 1 - w1;
  
  var rgba = [color1[0] * w1 + color2[0] * w2,
              color1[1] * w1 + color2[1] * w2,
              color1[2] * w1 + color2[2] * w2,
              color1[3] * weight + color2[3] * (1 - weight)
             ];
  
  return rgbaToCss(rgba);
};

exports.darken = darken;
exports.lighten = lighten;
exports.spin = spin;
exports.mix = mix;

} // __js

//----------------------------------------------------------------------
// css value arithmetic

__js {

var cssValueRE = /^\s*(-?\d*\.?\d*)(\D*)$/;

function parseCssValue(css_val) {
  if (typeof css_val == 'number') return [css_val, 'px'];
  // else... we assume it's a string
  var matches = cssValueRE.exec(css_val);
  if (!matches || !matches[0]) throw new Error("invalid css value #{css_val}");
  return [parseFloat(matches[1]),matches[2]];
}

function encodeCssValue(val) {
  // we'll round to 5 decimals
  val[0] = Math.round(val[0]*100000)/100000;
  return "#{val[0]}#{val[1]}";
}

function scale(css_val, factor) {
  var val = parseCssValue(css_val);
  val[0] *= factor;
  return encodeCssValue(val);
}

function add(css_val1, css_val2) {
  var val1 = parseCssValue(css_val1), val2 = parseCssValue(css_val2);
  if (val1[1] != val2[1]) 
    throw new Error("cannot add mismatching css values (#{css_val1},#{css_val2})");
  val1[0] += val2[0];
  return encodeCssValue(val1);
}

exports.scale = scale;
exports.add = add;

} // __js

//----------------------------------------------------------------------
// port of Variables.less
// Variables to customize the look and feel of Bootstrap

/**
   @variable defaultLookAndFeel
   @summary  Object with functions to customize the look and feel of Bootstrap (port of Variables.less)
   @desc
      You can use this as prototype for a custom lookAndFeel object, which can then be passed to 
      e.g. [::Container].
*/
__js var defaultLookAndFeel = exports.defaultLookAndFeel = {

  // GLOBAL VALUES
  // --------------------------------------------------

  // Grays
  // -------------------------
  black:               -> '#000',
  grayDarker:          -> '#222',
  grayDark:            -> '#333',
  gray:                -> '#555',
  grayLight:           -> '#999',
  grayLighter:         -> '#eee',
  white:               -> '#fff',


  // Accent colors
  // -------------------------
  blue:                -> '#049cdb',
  blueDark:            -> '#0064cd',
  green:               -> '#46a546',
  red:                 -> '#9d261d',
  yellow:              -> '#ffc40d',
  orange:              -> '#f89406',
  pink:                -> '#c3325f',
  purple:              -> '#7a43b6',


  // Scaffolding
  // -------------------------
  bodyBackground:      -> this.white(),
  textColor:           -> this.grayDark(),


  // Links
  // -------------------------
  linkColor:           -> '#08c',
  linkColorHover:      -> darken(this.linkColor(), 0.15),


  // Typography
  // -------------------------
  sansFontFamily:      -> '"Helvetica Neue", Helvetica, Arial, sans-serif',
  serifFontFamily:     -> 'Georgia, "Times New Roman", Times, serif',
  monoFontFamily:      -> 'Menlo, Monaco, Consolas, "Courier New", monospace',

  baseFontSize:        -> '13px',
  baseFontFamily:      -> this.sansFontFamily(),
  baseLineHeight:      -> '18px',
  altFontFamily:       -> this.serifFontFamily(),

  headingsFontFamily:  -> 'inherit', // empty to use BS default, @baseFontFamily
  headingsFontWeight:  -> 'bold',    // instead of browser default, bold
  headingsColor:       -> 'inherit', // empty to use BS default, @textColor

  // Component sizing
  // -------------------------
  // Based on 14px font-size and 20px line-height

  baseBorderRadius:    -> '4px',

  // Tables
  // -------------------------
  tableBackground:                 -> 'transparent', // overall background-color
  tableBackgroundAccent:           -> '#f9f9f9', // for striping
  tableBackgroundHover:            -> '#f5f5f5', // for hover
  tableBorder:                     -> '#ddd', // table and cell border


  // Buttons
  // -------------------------
  btnBackground:                     -> this.white(),
  btnBackgroundHighlight:            -> darken(this.white(), 0.1),
  btnBorder:                         -> '#ccc',
  
  btnPrimaryBackground:              -> this.linkColor(),
  btnPrimaryBackgroundHighlight:     -> spin(this.btnPrimaryBackground(), 15),
  
  btnInfoBackground:                 -> '#5bc0de',
  btnInfoBackgroundHighlight:        -> '#2f96b4',
  
  btnSuccessBackground:              -> '#62c462',
  btnSuccessBackgroundHighlight:     -> '#51a351',
  
  btnWarningBackground:              -> lighten(this.orange(), 0.15),
  btnWarningBackgroundHighlight:     -> this.orange(),
  
  btnDangerBackground:               -> '#ee5f5b',
  btnDangerBackgroundHighlight:      -> '#bd362f',
  
  btnInverseBackground:              -> this.gray(),
  btnInverseBackgroundHighlight:     -> this.grayDarker(),


  // Forms
  // -------------------------
  inputBackground:               -> this.white(),
  inputBorder:                   -> '#ccc',
  inputBorderRadius:             -> '3px',
  inputDisabledBackground:       -> this.grayLighter(),
  formActionsBackground:         -> '#f5f5f5',

  // Dropdowns
  // -------------------------
  dropdownBackground:            -> this.white(),
  dropdownBorder:                -> 'rgba(0,0,0,.2)',
  dropdownLinkColor:             -> this.grayDark(),
  dropdownLinkColorHover:        -> this.white(),
  dropdownLinkBackgroundHover:   -> this.linkColor(),
  dropdownDividerTop:            -> '#e5e5e5',
  dropdownDividerBottom:         -> this.white(),

  // COMPONENT VARIABLES
  // --------------------------------------------------

  // Z-index master list
  // -------------------------
  // Used for a bird's eye view of components dependent on the z-axis
  // Try to avoid customizing these :)
  zindexDropdown:          -> 1000,
  zindexPopover:           -> 1010,
  zindexTooltip:           -> 1020,
  zindexFixedNavbar:       -> 1030,
  zindexModalBackdrop:     -> 1040,
  zindexModal:             -> 1050,

  // Sprite icons path
  // -------------------------
  //@iconSpritePath:          "../img/glyphicons-halflings.png";
  //@iconWhiteSpritePath:     "../img/glyphicons-halflings-white.png";
  // in lieu of the sprite icons we use Font Awesome:  
  fontAwesomePath:         -> 'sjs:surface/resources/',

  // Input placeholder text color
  // -------------------------
  placeholderText:         -> this.grayLight(),
  
  // Hr border color
  // -------------------------
  hrBorder:                -> this.grayLighter(),

  // Navbar
  // -------------------------
  navbarHeight:                    -> '40px',
  navbarBackground:                -> this.grayDarker(),
  navbarBackgroundHighlight:       -> this.grayDark(),
  
  navbarText:                      -> this.grayLight(),
  navbarLinkColor:                 -> this.grayLight(),
  navbarLinkColorHover:            -> this.white(),
  navbarLinkColorActive:           -> this.navbarLinkColorHover(),
  navbarLinkBackgroundHover:       -> 'transparent',
  navbarLinkBackgroundActive:      -> this.navbarBackground(),
  
  navbarSearchBackground:          -> lighten(this.navbarBackground(), .25),
  navbarSearchBackgroundFocus:     -> this.white(),
  navbarSearchBorder:              -> darken(this.navbarSearchBackground(), .30),
  navbarSearchPlaceholderColor:    -> '#ccc',
  navbarBrandColor:                -> this.navbarLinkColor(),

  // Hero unit
  // -------------------------
  heroUnitBackground:              -> this.grayLighter(),
  heroUnitHeadingColor:            -> 'inherit',
  heroUnitLeadColor:               -> 'inherit',


  // Form states and alerts
  // -------------------------
  warningText:             -> '#c09853',
  warningBackground:       -> '#fcf8e3',
  warningBorder:           -> darken(spin(this.warningBackground(), -10), .03),
  
  errorText:               -> '#b94a48',
  errorBackground:         -> '#f2dede',
  errorBorder:             -> darken(spin(this.errorBackground(), -10), .03),
  
  successText:             -> '#468847',
  successBackground:       -> '#dff0d8',
  successBorder:           -> darken(spin(this.successBackground(), -10), .05),
  
  infoText:                -> '#3a87ad',
  infoBackground:          -> '#d9edf7',
  infoBorder:              -> darken(spin(this.infoBackground(), -10), .07),

  // Tooltips and popovers
  // -----------------------

  popoverBackground:       -> '#fff',
  popoverArrowWidth:       -> '10px',
  popoverArrowColor:       -> '#fff',
  popoverTitleBackground:  -> darken(this.popoverBackground(), .03),

  // Special enhancement for popovers
  popoverArrowOuterWidth:  -> add(this.popoverArrowWidth(), 1),
  popoverArrowOuterColor:  -> 'rgba(0,0,0,.25)',



  // GRID
  // --------------------------------------------------

  // Default 940px grid
  // -------------------------
  gridColumns:             -> 12,
  gridColumnWidth:         -> "60px",
  gridGutterWidth:         -> "20px",
  gridRowWidth:            -> add(scale(this.gridColumnWidth(), this.gridColumns()), 
                                  scale(this.gridGutterWidth(), this.gridColumns()-1)),

  // Fluid grid
  //--------------------------
  fluidGridColumnWidth:    -> "6.382978723%",
  fluidGridGutterWidth:    -> "2.127659574%"
};


//----------------------------------------------------------------------
// port of Reset.less
// Adapted from Normalize.css http://github.com/necolas/normalize.css

var CSSReset = exports.CSSReset = function() {
//XXX cache
  return base.GlobalCSS("
/* Display in IE6-9 and FF3  */
/* ------------------------  */

article,
aside,
details,
figcaption,
figure,
footer,
header,
hgroup,
nav,
section {
  display: block;
}

/* Display block in IE6-9 and FF3 */
/* ------------------------------ */

audio,
canvas,
video {
  display: inline-block;
  *display: inline;
  *zoom: 1;
}

/* Prevents modern browsers from displaying 'audio' without controls */
/* ----------------------------------------------------------------- */

audio:not([controls]) {
    display: none;
}

/* Base settings             */
/* ------------------------- */

html {
  font-size: 100%;
  -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
}
/* Focus states */
a:focus {
  .tab-focus();
}
/* Hover & Active */
a:hover,
a:active {
  outline: 0;
}

/* Prevents sub and sup affecting line-height in all browsers */
/* ---------------------------------------------------------- */

sub,
sup {
  position: relative;
  font-size: 75%;
  line-height: 0;
  vertical-align: baseline;
}
sup {
  top: -0.5em;
}
sub {
  bottom: -0.25em;
}

/* Img border in a's and image quality */
/* ----------------------------------- */

img {
  max-width: 100%; /* Make images inherently responsive */
  vertical-align: middle;
  border: 0;
  -ms-interpolation-mode: bicubic;
}

/* Prevent max-width from affecting Google Maps */
#map_canvas img {
  max-width: none;
}

/* Forms                     */
/* ------------------------- */

/* Font size in all browsers, margin changes, misc consistency */
button,
input,
select,
textarea {
  margin: 0;
  font-size: 100%;
  vertical-align: middle;
}
button,
input {
  *overflow: visible; /* Inner spacing ie IE6/7 */
  line-height: normal; /* FF3/4 have !important on line-height in UA stylesheet */
}
button::-moz-focus-inner,
input::-moz-focus-inner { /* Inner padding and border oddities in FF3/4 */
  padding: 0;
  border: 0;
}
button,
input[type='button'],
input[type='reset'],
input[type='submit'] {
  cursor: pointer; /* Cursors on all buttons applied consistently */
  -webkit-appearance: button; /* Style clickable inputs in iOS */
}
input[type='search'] { /* Appearance in Safari/Chrome */
  -webkit-box-sizing: content-box;
     -moz-box-sizing: content-box;
          box-sizing: content-box;
  -webkit-appearance: textfield;
}
input[type='search']::-webkit-search-decoration,
input[type='search']::-webkit-search-cancel-button {
  -webkit-appearance: none; /* Inner-padding issues in Chrome OSX, Safari 5 */
}
textarea {
  overflow: auto; /* Remove vertical scrollbar in IE6-9 */
  vertical-align: top; /* Readability and alignment cross-browser */
}
"); // CSSReset
};

//----------------------------------------------------------------------
// port of mixins.less
// Snippets of reusable CSS to develop faster and keep code readable

__js var Mixins = exports.Mixins = function(vars) {
  var mixins = {
    
    // UTILITY MIXINS
    // --------------------------------------------------

    // Clearfix
    // --------
    // For clearing floats like a boss h5bp.com/q
    clearfix: selector -> 
      "#{selector} { *zoom: 1; }
       #{selector}:before,
       #{selector}:after {
            display: table;
            content: '';
       }
       #{selector}:after {
            clear: both;
       }"
    ,

    // Webkit-style focus
    // ------------------
    tab_focus: ->
      "/* Default */
       outline: thin dotted #333;
       /* Webkit */
       outline: 5px auto -webkit-focus-ring-color;
       outline-offset: -2px;"
    ,

    // IE7 inline-block
    // ----------------
    ie7_inline_block: ->
      "*display: inline; /* IE7 inline-block hack */
       *zoom: 1;"
    ,

    // IE7 likes to collapse whitespace on either side of the inline-block elements.
    // Ems because we're attempting to match the width of a space character. Left
    // version is for form buttons, which typically come after other elements, and
    // right version is for icons, which come before. Applying both is ok, but it will
    // mean that space between those elements will be .6em (~2 space characters) in IE7,
    // instead of the 1 space in other browsers.
    ie7_restore_left_whitespace: selector -> 
      "#{selector} { *margin-left: .3em; }
       #{selector}:first-child { *margin-left: 0; }"
    ,

    // Placeholder text
    // -------------------------
    placeholder: function(selector, color) {
      color = color || vars.placeholderText();
      return "#{selector}:-moz-placeholder {
                color: #{color};
              }
              #{selector}:-ms-input-placeholder {
                color: #{color};
              }
              #{selector}::-webkit-input-placeholder {
                color: #{color};
              }";
    },

    // Text overflow
    // -------------------------
    // Requires inline-block or block for proper styling
    text_overflow: ->  
      "overflow: hidden;
       text-overflow: ellipsis;
       white-space: nowrap;" 
    ,

    // FONTS
    // --------------------------------------------------

    font : {
      family : {
        serif: -> "font-family: #{vars.serifFontFamily()};",
        sans_serif: -> "font-family: #{vars.sansFontFamily()};",
        monospace: ->"font-family: #{vars.monoFontFamily()};"
      },
  
      shorthand: (size,weight,lineHeight) ->
        "font-size:   #{size||vars.baseFontSize()};
         font-weight: #{weight||'normal'};
         line-height: #{lineHeight||vars.baseLineHeight()};"
      ,
      serif: (size, weight, lineHeight) ->
        "#{this.family.serif()}
         #{this.shorthand(size, weight, lineHeight)}"
      ,
      sans_serif: (size, weight, lineHeight) ->
        "#{this.family.sans_serif()}
         #{this.shorthand(size, weight, lineHeight)}"
      ,
      monospace: (size, weight, lineHeight) ->
        "#{this.family.monospace()}
         #{this.shorthand(size, weight, lineHeight)}"
    },

    // FORMS
    // --------------------------------------------------

    // Block level inputs
    input_block_level: ->
        "display: block;
         width: 100%;
         min-height: 28px;        /* Make inputs at least the height of their button counterpart */
         #{this.box_sizing('border-box'); /* Makes inputs behave like true block-level elements */
        "
    ,

    // Mixin for form field states
    formFieldState: function(selector, textColor, borderColor, backgroundColor) {
      textColor = textColor || '#555';
      borderColor = borderColor || '#ccc';
      backgroundColor = backgroundColor || '#f5f5f5';

      return "
       /* Set the text color */
       #{selector} > label,
       #{selector} .help-block,
       #{selector} .help-inline {
          color: #{textColor};
        }
       /* Style inputs accordingly */
       #{selector} .checkbox,
       #{selector} .radio,
       #{selector} input,
       #{selector} select,
       #{selector} textarea {
        color: #{textColor};
        border-color: #{borderColor};
       }
       #{selector} .checkbox:focus,
       #{selector} .radio:focus,
       #{selector} input:focus,
       #{selector} select:focus,
       #{selector} textarea:focus {
            border-color: #{darken(borderColor, .1)};
            #{this.box_shadow('0 0 6px '+lighten(borderColor, .2))}
       }
       /* Give a small background color for input-prepend/-append */
       #{selector} .input-prepend .add-on,
       #{selector} .input-append .add-on {
          color: #{textColor};
          background-color: #{backgroundColor};
          border-color: #{textColor};
       }";
    },

    // CSS3 PROPERTIES
    // --------------------------------------------------

    // Border Radius
    border_radius: radius ->
      "-webkit-border-radius: #{radius};
       -moz-border-radius: #{radius};
       border-radius: #{radius};"
    ,

    // Drop shadows
    box_shadow: shadow ->
      "-webkit-box-shadow: #{shadow};
       -moz-box-shadow: #{shadow};
       box-shadow: #{shadow};"
    ,

    // Transitions
    transition: transition ->
      "-webkit-transition: #{transition};
       -moz-transition: #{transition};
       -ms-transition: #{transition};
       -o-transition: #{transition};
       transition: #{transition};"
    ,

    // XXX some omissions

    // Background clipping
    // Heads up: FF 3.6 and under need "padding" instead of "padding-box"
    background_clip: clip ->
      "-webkit-background-clip: #{clip};
       -moz-background-clip: #{clip};
       background-clip: #{clip};"
    ,

    // Background sizing
    background_size: size ->
      "-webkit-background-size: #{size};
       -moz-background-size: #{size};
       -o-background-size: #{size};
       background-size: #{size};"
    ,

    // Box sizing
    box_sizing: boxmodel ->
      "-webkit-box-sizing: #{boxmodel};
       -moz-box-sizing: #{boxmodel};
       -ms-box-sizing: #{boxmodel};
       box-sizing: #{boxmodel};"
    ,

    // User select
    // For selecting text on the page
    user_select: select ->
        "-webkit-user-select: #{select};
            -moz-user-select: #{select};
             -ms-user-select: #{select};
              -o-user-select: #{select};
                  user-select: #{select};"
    ,

    // XXX some omissions
    
    // Opacity
    opacity: opacity ->
      "opacity: #{Math.round(opacity*100)/10000};
       filter: alpha(opacity=#{opacity});"
    ,

    // BACKGROUNDS
    // --------------------------------------------------

    // Gradient Bar Colors for buttons and alerts
    gradientBar: (primaryColor, secondaryColor) ->
     "#{this.gradient.vertical(primaryColor, secondaryColor)}
      border-color: #{secondaryColor} #{secondaryColor} #{darken(secondaryColor, .15)};
      border-color: rgba(0,0,0,.1) rgba(0,0,0,.1) #{fadein('rgba(0,0,0,.1)', .15)};"
    ,

    // Gradients
    gradient : {
      horizontal: function(startColor, endColor) {
        startColor = startColor || '#555';
        endColor = endColor || '#333';
        return "
         background-color: #{endColor};
         background-image: -moz-linear-gradient(left, #{startColor}, #{endColor}); /* FF 3.6+ */
         background-image: -ms-linear-gradient(left, #{startColor}, #{endColor}); /* IE10 */
         background-image: -webkit-gradient(linear, 0 0, 100% 0, from(#{startColor}), to(#{endColor})); /* Safari 4+, Chrome 2+ */
         background-image: -webkit-linear-gradient(left, #{startColor}, #{endColor}); /* Safari 5.1+, Chrome 10+ */
         background-image: -o-linear-gradient(left, #{startColor}, #{endColor}); /* Opera 11.10 */
         background-image: linear-gradient(left, #{startColor}, #{endColor}); /* Le standard */
         background-repeat: repeat-x;
         filter: e(%(\"progid:DXImageTransform.Microsoft.gradient(startColorstr='%d', endColorstr='%d', GradientType=1)\",#{startColor},#{endColor})); /* IE9 and down */"
      },
      vertical: function(startColor, endColor) {
        startColor = startColor || '#555';
        endColor = endColor || '#333';
        return "
         background-color: #{mix(startColor, endColor, .6)};
         background-image: -moz-linear-gradient(top, #{startColor}, #{endColor}); /* FF 3.6+ */
         background-image: -ms-linear-gradient(top, #{startColor}, #{endColor}); /* IE10 */
         background-image: -webkit-gradient(linear, 0 0, 0 100%, from(#{startColor}), to(#{endColor})); /* Safari 4+, Chrome 2+ */
         background-image: -webkit-linear-gradient(top, #{startColor}, #{endColor}); /* Safari 5.1+, Chrome 10+ */
         background-image: -o-linear-gradient(top, #{startColor}, #{endColor}); /* Opera 11.10 */
         background-image: linear-gradient(top, #{startColor}, #{endColor}); /* The standard */
         background-repeat: repeat-x;
         filter: e(%(\"progid:DXImageTransform.Microsoft.gradient(startColorstr='%d', endColorstr='%d', GradientType=0)\",#{startColor},#{endColor})); /* IE9 and down */"
      },
      striped: function(color, angle) {
        angle = angle || '-45deg';
        return "
         background-color: #{color};
         background-image: -webkit-gradient(linear, 0 100%, 100% 0, color-stop(.25, rgba(255,255,255,.15)), color-stop(.25, transparent), color-stop(.5, transparent), color-stop(.5, rgba(255,255,255,.15)), color-stop(.75, rgba(255,255,255,.15)), color-stop(.75, transparent), to(transparent));
         background-image: -webkit-linear-gradient(#{angle}, rgba(255,255,255,.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.15) 50%, rgba(255,255,255,.15) 75%, transparent 75%, transparent);
         background-image: -moz-linear-gradient(#{angle}, rgba(255,255,255,.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.15) 50%, rgba(255,255,255,.15) 75%, transparent 75%, transparent);
         background-image: -ms-linear-gradient(#{angle}, rgba(255,255,255,.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.15) 50%, rgba(255,255,255,.15) 75%, transparent 75%, transparent);
         background-image: -o-linear-gradient(#{angle}, rgba(255,255,255,.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.15) 50%, rgba(255,255,255,.15) 75%, transparent 75%, transparent);
         background-image: linear-gradient(#{angle}, rgba(255,255,255,.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.15) 50%, rgba(255,255,255,.15) 75%, transparent 75%, transparent);"
      }
    },

    // Reset filters for IE
    reset_filter: ->
      "filter: e(%(\"progid:DXImageTransform.Microsoft.gradient(enabled = false)\"));"
    ,

    // COMPONENT MIXINS
    // --------------------------------------------------

    // Horizontal dividers
    // -------------------------
    // Dividers (basically an hr) within dropdowns and nav lists
    nav_divider: function(top, bottom) {
      top = top || '#e5e5e5';
      bottom = bottom || vars.white();
      return "
       /* IE7 needs a set width since we gave a height. Restricting just */
       /* to IE7 to keep the 1px left/right space in other browsers. */
       /* It is unclear where IE is getting the extra space that we need */
       /* to negative-margin away, but so it goes. */
       *width: 100%;
       height: 1px;
       margin: #{add(scale(vars.baseLineHeight(), 1/2), -1)} 1px; /* 8px 1px */
       *margin: -5px 0 5px;
       overflow: hidden;
       background-color: #{top};
       border-bottom: 1px solid #{bottom};"
    },

    // Button backgrounds
    // ------------------
    buttonBackground: (selector, startColor, endColor) ->
      "#{selector} {
         /* gradientBar will set the background to a pleasing blend of these, to support IE<=9 */
         #{this.gradientBar(startColor, endColor)}
         *background-color: #{endColor}; /* Darken IE7 buttons by default so they stand out more given they won't have borders */
         #{this.reset_filter()}
       }
       /* in these cases the gradient won't cover the background, so we override */
       #{selector}:hover, #{selector}:active, #{selector}.active, 
       #{selector}.disabled, #{selector}[disabled] {
         background-color: #{endColor};
         *background-color: #{darken(endColor, .05)};
       }
       /* IE 7 + 8 can't handle box-shadow to show active, so we darken a bit ourselves */
       #{selector}:active,
       #{selector}.active {
         background-color: #{darken(endColor, .1)} \\9;
       }"
    ,

    // Navbar vertical align
    // -------------------------
    // Vertically center elements in the navbar.
    // Example: an element has a height of 30px, so write out `mixins.navbarVerticalAlign('30px');` to calculate the appropriate top margin.
    navbarVerticalAlign: elementHeight ->
      "margin-top: #{scale(add(vars.navbarHeight(), '-'+elementHeight), 1/2)};"
    ,

    // Grid System
    // -----------

    // Centered container element
    container_fixed: selector ->
      "#{selector} { 
        margin-right: auto;
        margin-left: auto;
       }
       #{this.clearfix(selector)}"
    ,

    // Table columns
    tableColumns: function(columnSpan) {
      columnSpan = columnSpan || 1;
      return "
       float: none; /* undo default grid column styles */
       width: #{add(add(scale(vars.gridColumnWidth(),columnSpan), 
                        scale(vars.gridGutterWidth(),columnSpan-1)), 
                    - 16) /* 16 is total padding on left and right of table cells */
               }
       margin-left: 0; /* undo default grid column styles */"
    },

    // Make a Grid
    // Use .makeRow and .makeColumn to assign semantic layouts grid system behaviour
    // XXX

    // The Grid
    grid : {
      coreSpan: columns ->
        "width: #{add(scale(vars.gridColumnWidth(),columns),scale(vars.gridGutterWidth(),columns-1))};"
      ,

      core: function(gridColumnWidth, gridGutterWidth) {
        function span(columns) {
          return "width: #{add(scale(gridColumnWidth,columns),scale(gridGutterWidth,columns-1))};";
        }

        function spans() {
          var rv = "";
          for (var i=1; i<=vars.gridColumns(); ++i)
            rv += ".span#{i} { #{span(i)} }";
          return rv;
        }

        function offset(columns) {
          return "margin-left: #{add(scale(gridColumnWidth,columns),scale(gridGutterWidth,columns+1))};";
        }

        function offsets() {
          var rv = "";
          for (var i=1; i<=vars.gridColumns(); ++i)
            rv += ".offset#{i} { #{offset(i)} }";
          return rv;
        }

        return ".row { margin-left: #{scale(gridGutterWidth,-1)}; }
                #{mixins.clearfix('.row')}
                [class*='span'],
                .formrow > * /* Oni Labs edit: allow compound components on the same row in a form */
                {
                  float: left;
                  margin-left: #{gridGutterWidth};
                }
                /* Set the container width, and override it for 
                   fixed navbars in media queries */
                .container,
                .navbar-fixed-top .container,
                .navbar-fixed-bottom .container { #{span(vars.gridColumns()); }
                
                #{spans()}
                #{offsets()}
               ";
      },
      fluid: function(fluidGridColumnWidth, fluidGridGutterWidth) {
        function span(columns) {
          return "width: #{add(scale(fluidGridColumnWidth,columns),scale(fluidGridGutterWidth,columns-1))};";
          // XXX IE7 *width: (@fluidGridColumnWidth * @columns) + (@fluidGridGutterWidth * (@columns - 1)) - (.5 / @gridRowWidth * 100 * 1%);
          
        }

        function spans() {
          var rv = "";
          for (var i=1; i<=vars.gridColumns(); ++i)
            rv += ".row-fluid .span#{i} { #{span(i)} }";
          return rv;
        }

        return ".row-fluid { width: 100% }
                #{mixins.clearfix('.row-fluid')}
                .row-fluid [class*='span']
                {
                  #{mixins.input_block_level()}
                  float: left;
                  margin-left: #{fluidGridGutterWidth};
                /* IE7XXX *margin-left: #XXX{add(fluidGridGutterWidth,scale('1%',-.5/#XXX{vars.gridRowWidth()}*100))}; */
                }
                .row-fluid [class*='span']:first-child {
                  margin-left: 0;
                }

                #{spans()}
               ";
      },
      input: function() {
        // XXX write me
        return "";
      }
    }
  };
  return mixins;
};

//----------------------------------------------------------------------
// port of scaffolding.less
// Basic and global styles for generating a grid system, structural
// layout, and page templates

__js var CSSScaffolding = exports.CSSScaffolding = function(lookAndFeel) {
  var vars = lookAndFeel || defaultLookAndFeel;
  var mixins = Mixins(vars);

  // XXX cache
  return base.GlobalCSS("
/* Body reset */
/* ---------- */

body {
  margin: 0;
  font-family: #{vars.baseFontFamily()};
  font-size: #{vars.baseFontSize()};
  line-height: #{vars.baseLineHeight()};
  color: #{vars.textColor()};
  background-color: #{vars.bodyBackground()};
}


/* Links */
/* ----- */

a {
  color: #{vars.linkColor()};
  text-decoration: none;
}
a:hover {
  color: #{vars.linkColorHover()};
  text-decoration: underline;
}

/* Images */
/* ------------------------- */

/* Rounded corners */
.img-rounded {
  #{mixins.border_radius('6px')}
}

/* Add polaroid-esque trim */
.img-polaroid {
  padding: 4px;
  background-color: #fff;
  border: 1px solid #ccc;
  border: 1px solid rgba(0,0,0,.2);
  #{mixins.box_shadow('0 1px 3px rgba(0,0,0,.1)')}
}

/* Perfect circle */
.img-circle {
  #{mixins.border_radius('500px')} /* crank the border-radius so it works with most reasonably sized images */
}

");
};

//----------------------------------------------------------------------
// port of responsive.less
// Bootstrap Responsive v2.0.4

__js var CSSResponsive = exports.CSSResponsive = function(lookAndFeel) {
  var vars = lookAndFeel || defaultLookAndFeel;
  var mixins = Mixins(vars);

  // XXX cache
  return base.CSS("
/* ---------------------------------------------------------------------- */
/* responsive-utilities.less */
/* RESPONSIVE CLASSES */
/* ------------------ */
/* XXX order matters! This needs to be included AFTER every other bootstrap stylesheet */

/* Hide from screenreaders and browsers */
/* Credit: HTML5 Boilerplate */
.hidden {
  display: none;
  visibility: hidden;
}

/* Visibility utilities */

/* For desktops */
.visible-phone     { display: none !important; }
.visible-tablet    { display: none !important; }
.visible-desktop   { } /* Don't set initially */
.hidden-phone      { }
.hidden-tablet     { }
.hidden-desktop    { display: none !important; }

/* Phones only */
@media (max-width: 767px) {
  /* Show */
  .visible-phone     { display: inherit !important; } /* Use inherit to restore previous behavior */
  /* Hide */
  .hidden-phone      { display: none !important; }
  /* Hide everything else */
  .hidden-desktop    { display: inherit !important; }
  .visible-desktop   { display: none !important; }
}

/* Tablets & small desktops only */
@media (min-width: 768px) and (max-width: 979px) {
  /* Show */
  .visible-tablet    { display: inherit !important; }
  /* Hide */
  .hidden-tablet     { display: none !important; }
  /* Hide everything else */
  .hidden-desktop    { display: inherit !important; }
  .visible-desktop   { display: none !important ; }
}

/* MEDIA QUERIES */
/* ------------------ */
/* ---------------------------------------------------------------------- */
/* Phones to portrait tablets and narrow desktops */
/* responsive-767px-max.less */
/* UP TO LANDSCAPE PHONE */
/* --------------------- */

@media (max-width: 480px) {

  /* Smooth out the collapsing/expanding nav */
  .nav-collapse {
    -webkit-transform: translate3d(0, 0, 0); /* activate the GPU */
  }

  /* Block level the page header small tag for readability */
  .page-header h1 small {
    display: block;
    line-height: #{vars.baseLineHeight()};
  }

  /* Update checkboxes for iOS */
  input[type='checkbox'],
  input[type='radio'] {
    border: 1px solid #ccc;
  }

  /* Remove the horizontal form styles */
  .form-horizontal .control-group > label {
    float: none;
    width: auto;
    padding-top: 0;
    text-align: left;
  }
  /* Move over all input controls and content */
  .form-horizontal .controls {
    margin-left: 0;
  }
  /* Move the options list down to align with labels */
  .form-horizontal .control-list {
    padding-top: 0; /* has to be padding because margin collaspes */
  }
  /* Move over buttons in .form-actions to align with .controls */
  .form-horizontal .form-actions {
    padding-left: 10px;
    padding-right: 10px;
  }

  /* Modals */
  .modal {
    position: absolute;
    top:   10px;
    left:  10px;
    right: 10px;
    width: auto;
    margin: 0;
  }
  .modal.fade.in { top: auto; }
  .modal-header .close {
    padding: 10px;
    margin: -10px;
  }

  /* Carousel */
  .carousel-caption {
    position: static;
  }

}



/* LANDSCAPE PHONE TO SMALL DESKTOP & PORTRAIT TABLET */
/* -------------------------------------------------- */

@media (max-width: 767px) {

  /* Padding to set content in a bit */
  @global {
    body {
      padding-left: 20px;
      padding-right: 20px;
    }
  }
  /* Negative indent the now static 'fixed' navbar */
  .navbar-fixed-top,
  .navbar-fixed-bottom {
    margin-left: -20px;
    margin-right: -20px;
  }
  /* Remove padding on container given explicit padding set on body */
  .container-fluid {
    padding: 0;
  }

  /* TYPOGRAPHY */
  /* ---------- */
  /* Reset horizontal dl */
  .dl-horizontal dt {
      float: none;
      clear: none;
      width: auto;
      text-align: left;
  }
  .dl-horizontal dd {
      margin-left: 0;
  }

  /* GRID & CONTAINERS */
  /* ----------------- */
  /* Remove width from containers */
  .container {
    width: auto;
  }
  /* Fluid rows */
  .row-fluid {
    width: 100%;
  }
  /* Undo negative margin on rows and thumbnails */
  .row,
  .thumbnails {
    margin-left: 0;
  }
  /* Make all grid-sized elements block level again */
  [class*='span'],
  .row-fluid [class*='span'],
  .formrow > *  /* Oni Labs edit: allow compound components on the same row in a form */
  {
    float: none;
    display: block;
    width: auto;
    margin-left: 0;
  }

  /* FORM FIELDS */
  /* ----------- */
  /* Make span* classes full width */
  .input-large,
  .input-xlarge,
  .input-xxlarge,
  input[class*='span'],
  select[class*='span'],
  textarea[class*='span'],
  .uneditable-input {
    .input-block-level();
  }
  /* But don't let it screw up prepend/append inputs */
  .input-prepend input,
  .input-append input,
  .input-prepend input[class*='span'],
  .input-append input[class*='span'] {
    display: inline-block; /* redeclare so they don't wrap to new lines */
    width: auto;
  }

}

/* ---------------------------------------------------------------------- */
/* Phones to portrait tablets and narrow desktops */
/* responsive-768px-979px.less */
/* PORTRAIT TABLET TO DEFAULT DESKTOP */
/* ---------------------------------- */

@media (min-width: 768px) and (max-width: 979px) {

  /* Fixed grid */
  #{mixins.grid.core('42px', '20px')}

  /* Fluid grid */
  #{mixins.grid.fluid('5.801104972%', '2.762430939%')}

  /* Input grid */
  #{mixins.grid.input('42px', '20px')}

  /* No need to reset .thumbnails here since it's the same @gridGutterWidth */

}

/* ---------------------------------------------------------------------- */
/* Large desktops */
/* responsive-768px-979px.less */
/* LARGE DESKTOP & UP */
/* ------------------ */

@media (min-width: 1200px) {

  /* Fixed grid */
  #{mixins.grid.core('70px', '30px')}

  /* Fluid grid */
  #{mixins.grid.fluid('5.982905983%', '2.564102564%')}

  /* Input grid */
  #{mixins.grid.input('70px', '30px')}

  // Thumbnails
  .thumbnails {
    margin-left: -30px;
  }
  .thumbnails > li {
    margin-left: 30px;
  }
  .row-fluid .thumbnails {
    margin-left: 0;
  }

}

/* ---------------------------------------------------------------------- */
/* RESPONSIVE NAVBAR  */
/* ------------------ */
/* From 979px and below, show a button to toggle navbar contents */
/* responsive-navbar.less */
/* TABLETS AND BELOW */
/* ----------------- */
@media (max-width: 979px) {

  /* UNFIX THE TOPBAR */
  /* ---------------- */
  /* Remove any padding from the body */
  body {
    padding-top: 0;
  }
  /* Unfix the navbar */
  .navbar-fixed-top,
  .navbar-fixed-bottom {
    position: static;
  }
  .navbar-fixed-top {
    margin-bottom: #{vars.baseLineHeight()};
  }
  .navbar-fixed-bottom {
    margin-top: #{vars.baseLineHeight()};
  }
  .navbar-fixed-top .navbar-inner,
  .navbar-fixed-bottom .navbar-inner {
    padding: 5px;
  }
  .navbar .container {
    width: auto;
    padding: 0;
  }
  /* Account for brand name */
  .navbar .brand {
    padding-left: 10px;
    padding-right: 10px;
    margin: 0 0 0 -5px;
  }

  /* COLLAPSIBLE NAVBAR */
  /* ------------------ */
  /* Nav collapse clears brand */
  .nav-collapse {
    clear: both;
  }
  /* Block-level the nav */
  .nav-collapse .nav {
    float: none;
    margin: 0 0 #{scale(vars.baseLineHeight(), 1/2)};
  }
  .nav-collapse .nav > li {
    float: none;
  }
  .nav-collapse .nav > li > a {
    margin-bottom: 2px;
  }
  .nav-collapse .nav > .divider-vertical {
    display: none;
  }
  .nav-collapse .nav .nav-header {
    color: #{vars.navbarText()};
    text-shadow: none;
  }
  /* Nav and dropdown links in navbar */
  .nav-collapse .nav > li > a,
  .nav-collapse .dropdown-menu a {
    padding: 6px 15px;
    font-weight: bold;
    color: #{vars.navbarLinkColor()};
    #{mixins.border_radius('3px')}
  }
  /* Buttons */
  .nav-collapse .btn {
    padding: 4px 10px 4px;
    font-weight: normal;
    #{mixins.border_radius('4px')}
  }
  .nav-collapse .dropdown-menu li + li a {
    margin-bottom: 2px;
  }
  .nav-collapse .nav > li > a:hover,
  .nav-collapse .dropdown-menu a:hover {
    background-color: #{vars.navbarBackground()};
  }
  /* Buttons in the navbar */
  .nav-collapse.in .btn-group {
    margin-top: 5px;
    padding: 0;
  }
  /* Dropdowns in the navbar */
  .nav-collapse .dropdown-menu {
    position: static;
    top: auto;
    left: auto;
    float: none;
    display: block;
    max-width: none;
    margin: 0 15px;
    padding: 0;
    background-color: transparent;
    border: none;
    #{mixins.border_radius('0')}
    #{mixins.box_shadow('none')}
  }
  .nav-collapse .dropdown-menu:before,
  .nav-collapse .dropdown-menu:after {
    display: none;
  }
  .nav-collapse .dropdown-menu .divider {
    display: none;
  }
  /* Forms in navbar */
  .nav-collapse .navbar-form,
  .nav-collapse .navbar-search {
    float: none;
    padding: #{scale(vars.baseLineHeight(), 1/2)} 15px;
    margin: #{scale(vars.baseLineHeight(), 1/2)} 0;
    border-top: 1px solid #{vars.navbarBackground()};
    border-bottom: 1px solid #{vars.navbarBackground()};
    #{mixins.box_shadow('inset 0 1px 0 rgba(255,255,255,.1), 0 1px 0 rgba(255,255,255,.1)')}
  }
  /* Pull right (secondary) nav content */
  .navbar .nav-collapse .nav.pull-right {
    float: none;
    margin-left: 0;
  }
  /* Hide everything in the navbar save .brand and toggle button */
  .nav-collapse,
  .nav-collapse.collapse {
    overflow: hidden;
    height: 0;
  }
  /* Navbar button */
  .navbar .btn-navbar {
    display: block;
  }

  /* STATIC NAVBAR */
  /* ------------- */
  .navbar-static .navbar-inner {
    padding-left:  10px;
    padding-right: 10px;
  }
}


/* DEFAULT DESKTOP */
/* --------------- */

/* Required to make the collapsing navbar work on regular desktops */
@media (min-width: 980px) {
  .nav-collapse.collapse {
    height: auto !important;
    overflow: visible !important;
  }
}

");
};

//----------------------------------------------------------------------
// port of grid.less
// 

__js var CSSGrid = exports.CSSGrid = function(lookAndFeel) {
  var vars = lookAndFeel || defaultLookAndFeel;
  var mixins = Mixins(vars);

  // XXX cache
  return base.CSS("
/* Fixed (940px) */
#{mixins.grid.core(vars.gridColumnWidth(), vars.gridGutterWidth())}

/* Fluid (940px) */
#{mixins.grid.fluid(vars.fluidGridColumnWidth(), vars.fluidGridGutterWidth())} 

");
};

//----------------------------------------------------------------------
// port of layouts.less
// 

__js var CSSLayouts = exports.CSSLayouts = function(lookAndFeel) {
  var vars = lookAndFeel || defaultLookAndFeel;
  var mixins = Mixins(vars);

  // XXX cache
  return base.CSS("
/* Layouts */
/* Fixed-width and fluid (with sidebar) layouts */
/* -------------------------------------------- */

/* Oni Labs edit; put .clearfix somewhere 
   XXX not sure this is the right place for this */
#{mixins.clearfix('.clearfix')}

/* Container (centered, fixed-width layouts) */
#{mixins.container_fixed('.container')}

/* Fluid layouts (left aligned, with sidebar, min- & max-width content) */
.container-fluid {
  padding-right: #{vars.gridGutterWidth()};
  padding-left: #{vars.gridGutterWidth()};
}
#{mixins.clearfix('.container-fluid')}
");
};

//----------------------------------------------------------------------
// port of component-animations.less
// COMPONENT ANIMATIONS
// --------------------
__js var CSSComponentAnimations = exports.CSSComponentAnimations = function(lookAndFeel) {
  var vars = lookAndFeel || defaultLookAndFeel;
  var mixins = Mixins(vars);

  // XXX cache
  return base.CSS("
.fade {
  opacity: 0;
  #{mixins.transition('opacity .15s linear')}
}
.fade.in {
    opacity: 1;
}

.collapse {
  position: relative;
  height:0;
  overflow: hidden;
  #{mixins.transition('height .35s ease')} 
}
.collapse.in {
  height: auto;
}

");
};

//----------------------------------------------------------------------
// port of type.less
// Headings, body text, lists, code, and more for a versatile and
// durable typography system

__js var CSSType = exports.CSSType = function(lookAndFeel) {
  var vars = lookAndFeel || defaultLookAndFeel;
  var mixins = Mixins(vars);

  // XXX cache
  return base.CSS("
/* BODY TEXT */
/* --------- */

p {
  margin: 0 0 #{scale(vars.baseLineHeight(), 1/2)};
}
p small {
    font-size: #{add(vars.baseFontSize(), -2)};
    color: #{vars.grayLight()};
}
.lead {
  margin-bottom: #{vars.baseLineHeight()};
  font-size: 20px;
  font-weight: 200;
  line-height: #{scale(vars.baseLineHeight(), 1.5)};
}

/* HEADINGS */
/* -------- */

h1, h2, h3, h4, h5, h6 {
  margin: 0;
  font-family: #{vars.headingsFontFamily()};
  font-weight: #{vars.headingsFontWeight()};
  color: #{vars.headingsColor()};
  text-rendering: optimizelegibility; /* Fix the character spacing for headings */
}
h1 small, h2 small, h3 small, h4 small, h5 small, h6 small {
    font-weight: normal;
    color: #{vars.grayLight()};
}
h1 {
  font-size: 30px;
  line-height: #{scale(vars.baseLineHeight(), 2)};
}
h1 small {
    font-size: 18px;
  }
h2 {
  font-size: 24px;
  line-height: #{scale(vars.baseLineHeight(), 2)};
}
h2 small {
    font-size: 18px;
  }
h3 {
  font-size: 18px;
  line-height: #{scale(vars.baseLineHeight(), 1.5)};
}
h3 small {
    font-size: 14px;
  }
h4, h5, h6 {
  line-height: #{vars.baseLineHeight()};
}
h4 {
  font-size: 14px;
}
h4 small {
    font-size: 12px;
  }
h5 {
  font-size: 12px;
}
h6 {
  font-size: 11px;
  color: #{vars.grayLight()};
  text-transform: uppercase;
}

/* Page header */
.page-header {
  padding-bottom: #{add(vars.baseLineHeight(), 1)};
  margin: #{vars.baseLineHeight()} 0;
  border-bottom: 1px solid #{vars.grayLighter()};
}
.page-header h1 {
  line-height: 1;
}



/* LISTS */
/* ----- */

/* Unordered and Ordered lists */
ul, ol {
  padding: 0;
  margin: 0 0 #{scale(vars.baseLineHeight(), 1/2)} 25px;
}
ul ul,
ul ol,
ol ol,
ol ul {
  margin-bottom: 0;
}
ul {
  list-style: disc;
}
ol {
  list-style: decimal;
}
li {
  line-height: #{vars.baseLineHeight()};
}
ul.unstyled,
ol.unstyled {
  margin-left: 0;
  list-style: none;
}

/* Description Lists */
dl {
  margin-bottom: #{vars.baseLineHeight()};
}
dt,
dd {
  line-height: #{vars.baseLineHeight()};
}
dt {
  font-weight: bold;
  line-height: #{add(vars.baseLineHeight(), -1)}; /* fix jank Helvetica Neue font bug */
}
dd {
  margin-left: #{scale(vars.baseLineHeight()/2)};
}
/* Horizontal layout (like forms) */
.dl-horizontal dt {
    float: left;
    width: 120px;
    clear: left;
    text-align: right;
    #{mixins.text_overflow()}
}
.dl-horizontal dd {
    margin-left: 130px;
}

/* MISC */
/* ---- */

/* Horizontal rules */
hr {
  margin: #{vars.baseLineHeight()} 0;
  border: 0;
  border-top: 1px solid #{vars.hrBorder()};
  border-bottom: 1px solid #{vars.white()};
}

/* Emphasis */
strong {
  font-weight: bold;
}
em {
  font-style: italic;
}
.muted {
  color: #{vars.grayLight()};
}

/* Abbreviations and acronyms */
abbr[title] {
  cursor: help;
  border-bottom: 1px dotted #{vars.grayLight()};
}
abbr.initialism {
  font-size: 90%;
  text-transform: uppercase;
}

/* Blockquotes */
blockquote {
  padding: 0 0 0 15px;
  margin: 0 0 #{vars.baseLineHeight()};
  border-left: 5px solid #{vars.grayLighter()};
}
  /* Float right with text-align: right */
  blockquote.pull-right {
    float: right;
    padding-right: 15px;
    padding-left: 0;
    border-right: 5px solid #{vars.grayLighter()};
    border-left: 0;
}

blockquote.pull-right p,
blockquote.pull-right small {
      text-align: right;
}

blockquote p {
    margin-bottom: 0;
    #{mixins.font.shorthand('16px','300',scale(vars.baseLineHeight(),1.25))}
}

blockquote small {
    display: block;
    line-height: #{vars.baseLineHeight()};
    color: #{vars.grayLight()};
}

blockquote small:before {
      content: '\\2014 \\00A0';
}

/* Quotes */
q:before,
q:after,
blockquote:before,
blockquote:after {
  content: '';
}

/* Addresses */
address {
  display: block;
  margin-bottom: #{vars.baseLineHeight()};
  font-style: normal;
  line-height: #{vars.baseLineHeight()};
}

/* Misc */
small {
  font-size: 100%;
}
cite {
  font-style: normal;
}
"); // CSSType
};


//----------------------------------------------------------------------
// port of code.less
// Code typography styles for the <code> and <pre> elements

__js var CSSCode = exports.CSSCode = function(lookAndFeel) {
  var vars = lookAndFeel || defaultLookAndFeel;
  var mixins = Mixins(vars);
  
  // XXX cache
  return base.CSS("
/* Inline and block code styles */
code,
pre {
  padding: 0 3px 2px;
  #{mixins.font.family.monospace()}
  font-size: #{add(vars.baseFontSize(), -1)};
  color: #{vars.grayDark() };
  #{mixins.border_radius('3px')}
}

/* Inline code */
code {
  padding: 2px 4px;
  color: #d14;
  background-color: #f7f7f9;
  border: 1px solid #e1e1e8;
}

/* Blocks of code */
pre {
  display: block;
  padding: #{scale(add(vars.baseLineHeight(), -1), 1/2)};
  margin: 0 0 #{scale(vars.baseLineHeight(), 1/2)};
  font-size: #{scale(vars.baseFontSize(), .925)}; /* 13px to 12px */
  line-height: #{vars.baseLineHeight()};
  word-break: break-all;
  word-wrap: break-word;
  white-space: pre;
  white-space: pre-wrap;
  background-color: #f5f5f5;
  border: 1px solid #ccc; /* fallback for IE7-8 */
  border: 1px solid rgba(0,0,0,.15);
  #{mixins.border_radius('4px')}
}

  /* Make prettyprint styles more spaced out for readability */
pre.prettyprint {
    margin-bottom: #{vars.baseLineHeight()};
}

  /* Account for some code outputs that place code tags in pre tags */
pre code {
    padding: 0;
    color: inherit;
    background-color: transparent;
    border: 0;
}


/* Enable scrollable blocks of code */
.pre-scrollable {
  max-height: 340px;
  overflow-y: scroll;
}
");
};

//----------------------------------------------------------------------
// port of tables.less
// Tables for, you guessed it, tabular data

__js var CSSTables = exports.CSSTables = function(lookAndFeel) {
  var vars = lookAndFeel || defaultLookAndFeel;
  var mixins = Mixins(vars);
  
  // XXX cache
  return base.CSS("
/* BASE TABLES */

table {
  max-width: 100%;
  background-color: #{vars.tableBackground()};
  border-collapse: collapse;
  border-spacing: 0;
}

/* BASELINE STYLES */

.table {
  width: 100%;
  margin-bottom: #{vars.baseLineHeight()};
}
  /* Cells */
.table  th,
.table  td {
    padding: 8px;
    line-height: #{vars.baseLineHeight()};
    text-align: left;
    vertical-align: top;
    border-top: 1px solid #{vars.tableBorder()};
}

.table th {
    font-weight: bold;
}

  /* Bottom align for column headings */
.table thead th {
    vertical-align: bottom;
}

  /* Remove top border from thead by default */
.table caption + thead tr:first-child th,
.table caption + thead tr:first-child td,
.table colgroup + thead tr:first-child th,
.table colgroup + thead tr:first-child td,
.table thead:first-child tr:first-child th,
.table thead:first-child tr:first-child td {
    border-top: 0;
}
  /* Account for multiple tbody instances */
.table tbody + tbody {
    border-top: 2px solid #{vars.tableBorder()};
}

 /* Nesting */
.table .table {
  background-color: #{vars.bodyBackground()};
}

/* CONDENSED TABLE W/ HALF PADDING */

.table-condensed th,
.table-condensed td {
    padding: 4px 5px;
}


/* BORDERED VERSION */

.table-bordered {
  border: 1px solid #{vars.tableBorder()};
  border-collapse: separate; /* Done so we can round those corners! */
  *border-collapse: collapsed; /* IE7 can't round corners anyway */
  border-left: 0;
  #{mixins.border_radius(vars.baseBorderRadius())}
}

.table-bordered th,
.table-bordered td {
    border-left: 1px solid #{vars.tableBorder()};
}

  /* Prevent a double border */
.table-bordered caption + thead tr:first-child th,
.table-bordered caption + tbody tr:first-child th,
.table-bordered caption + tbody tr:first-child td,
.table-bordered colgroup + thead tr:first-child th,
.table-bordered colgroup + tbody tr:first-child th,
.table-bordered colgroup + tbody tr:first-child td,
.table-bordered thead:first-child tr:first-child th,
.table-bordered tbody:first-child tr:first-child th,
.table-bordered tbody:first-child tr:first-child td {
    border-top: 0;
}

  /* For first th or td in the first row in the first thead or tbody */
.table-bordered thead:first-child tr:first-child th:first-child,
.table-bordered tbody:first-child tr:first-child td:first-child {
    -webkit-border-top-left-radius: #{vars.baseBorderRadius()};
            border-top-left-radius: #{vars.baseBorderRadius()};
        -moz-border-radius-topleft: #{vars.baseBorderRadius()};
}

.table-bordered thead:first-child tr:first-child th:last-child,
.table-bordered tbody:first-child tr:first-child td:last-child {
    -webkit-border-top-right-radius: #{vars.baseBorderRadius()};
            border-top-right-radius: #{vars.baseBorderRadius()};
        -moz-border-radius-topright: #{vars.baseBorderRadius()};
}

  /* For first th or td in the first row in the first thead or tbody */
.table-bordered thead:last-child tr:last-child th:first-child,
.table-bordered tbody:last-child tr:last-child td:first-child {
    #{mixins.border_radius('0 0 0 '+vars.baseBorderRadius())}
    -webkit-border-bottom-left-radius: #{vars.baseBorderRadius()};
            border-bottom-left-radius: #{vars.baseBorderRadius()};
        -moz-border-radius-bottomleft: #{vars.baseBorderRadius()};
}

.table-bordered thead:last-child tr:last-child th:last-child,
.table-bordered tbody:last-child tr:last-child td:last-child {
    -webkit-border-bottom-right-radius: #{vars.baseBorderRadius()};
            border-bottom-right-radius: #{vars.baseBorderRadius()};
        -moz-border-radius-bottomright: #{vars.baseBorderRadius()};
}


/* ZEBRA-STRIPING */

/* Default zebra-stripe styles (alternating gray and transparent backgrounds) */
.table-striped tbody tr:nth-child(odd) td,
.table-striped tbody tr:nth-child(odd) th {
      background-color: #{vars.tableBackgroundAccent()};
}


/* HOVER EFFECT */
/* Placed here since it has to come after the potential zebra striping */
.table-hover tbody tr:hover td,
.table-hover tbody tr:hover th {
    background-color: #{vars.tableBackgroundHover()};
}


/* TABLE CELL SIZING */

/* Change the columns */
 #{ integers(1,12) .. 
    map(i => "table .span#{i} { #{ mixins.tableColumns(i) } }") .. 
    join(' ')
  }

/* TABLE BACKGROUNDS */
/* Exact selectors below required to override .table-striped */

.table tbody tr.success td {
  background-color: #{vars.successBackground()};
}
.table tbody tr.error td {
  background-color: #{vars.errorBackground()};
}
.table tbody tr.warning td {
  background-color: #{vars.warningBackground()};
}
.table tbody tr.info td {
  background-color: #{vars.infoBackground()};
}

/* Hover states for .table-hover */
.table-hover tbody tr.success:hover td {
  background-color: #{darken(vars.successBackground(), 0.05)};
}
.table-hover tbody tr.error:hover td {
  background-color: #{darken(vars.errorBackground(), 0.05)};

}
.table-hover tbody tr.warning:hover td {
  background-color: #{darken(vars.warningBackground(), 0.05)};
}
.table-hover tbody tr.info:hover td {
  background-color: #{darken(vars.infoBackground(), 0.05)};
}
"); 
};


//----------------------------------------------------------------------
// port of wells.less
// WELLS

__js var CSSWells = exports.CSSWells = function(lookAndFeel) {
  var vars = lookAndFeel || defaultLookAndFeel;
  var mixins = Mixins(vars);

  // XXX cache
  return base.CSS("
.well {
  min-height: 20px;
  padding: 19px;
  margin-bottom: 20px;
  background-color: #f5f5f5;
  border: 1px solid #eee;
  border: 1px solid rgba(0,0,0,.05);
  #{mixins.border_radius('4px')}
  #{mixins.box_shadow('inset 0 1px 1px rgba(0,0,0,.05)')}
}

.well blockquote {
    border-color: #ddd;
    border-color: rgba(0,0,0,.15);
}

/* Sizes */
.well-large {
  padding: 24px;
  #{mixins.border_radius('6px')}
}
.well-small {
  padding: 9px;
  #{mixins.border_radius('3px')}
}
");
};

//----------------------------------------------------------------------
// port of forms.less
// Base styles for various input types, form layouts, and states

__js var CSSForms = exports.CSSForms = function(lookAndFeel) {
  var vars = lookAndFeel || defaultLookAndFeel;
  var mixins = Mixins(vars);

  // XXX cache
  return base.CSS("
/* GENERAL STYLES */
/* -------------- */

/* Make all forms have space below them */
form {
  margin: 0 0 #{vars.baseLineHeight()};
}

fieldset {
  padding: 0;
  margin: 0;
  border: 0;
}

/* Groups of fields with labels on top (legends) */
legend {
  display: block;
  width: 100%;
  padding: 0;
  margin-bottom: #{scale(vars.baseLineHeight(), 1.5)};
  font-size: #{scale(vars.baseFontSize(), 1.5)};
  line-height: #{scale(vars.baseLineHeight(), 2)};
  color: #{vars.grayDark()};
  border: 0;
  border-bottom: 1px solid #e5e5e5;

}
  /* Small */
legend small {
    font-size: #{scale(vars.baseLineHeight(), .75)};
    color: #{vars.grayLight()};
}

/* Set font for forms */
label,
input,
button,
select,
textarea {
  #{mixins.font.shorthand(vars.baseFontSize(),'normal',vars.baseLineHeight())} /* Set size, weight, line-height here */
}
input,
button,
select,
textarea {
  font-family: #{vars.baseFontFamily()}; /* And only set font-family here for those that need it (note the missing label element) */
}

/* Identify controls by their labels */
label {
  display: block;
  margin-bottom: 5px;
}

/* Form controls */
/* ------------------------- */

/* Shared size and type resets */
select,
textarea,
input[type='text'],
input[type='password'],
input[type='datetime'],
input[type='datetime-local'],
input[type='date'],
input[type='month'],
input[type='time'],
input[type='week'],
input[type='number'],
input[type='email'],
input[type='url'],
input[type='search'],
input[type='tel'],
input[type='color'],
.uneditable-input {
  display: inline-block;
  height: #{vars.baseLineHeight()};
  padding: 4px;
  margin-bottom: 9px;
  font-size: #{vars.baseFontSize()};
  line-height: #{vars.baseLineHeight()};
  color: #{vars.gray()};
}

/* Reset appearance properties for textual inputs and textarea */
/* Declare width for legacy (can't be on input[type=*] selectors or it's too specific) */
input,
textarea {
  width: 210px;
}
/* Reset height since textareas have rows */
textarea {
  height: auto;
}
/* Everything else */
textarea,
input[type='text'],
input[type='password'],
input[type='datetime'],
input[type='datetime-local'],
input[type='date'],
input[type='month'],
input[type='time'],
input[type='week'],
input[type='number'],
input[type='email'],
input[type='url'],
input[type='search'],
input[type='tel'],
input[type='color'],
.uneditable-input {
  background-color: #{vars.inputBackground()};
  border: 1px solid #{vars.inputBorder()};
  #{mixins.border_radius(vars.inputBorderRadius())}
  #{mixins.box_shadow('inset 0 1px 1px rgba(0,0,0,.075)')}
  #{mixins.transition('border linear .2s, box-shadow linear .2s')}
}

  /* Focus state */
textarea:focus,
input[type='text']:focus,
input[type='password']:focus,
input[type='datetime']:focus,
input[type='datetime-local']:focus,
input[type='date']:focus,
input[type='month']:focus,
input[type='time']:focus,
input[type='week']:focus,
input[type='number']:focus,
input[type='email']:focus,
input[type='url']:focus,
input[type='search']:focus,
input[type='tel']:focus,
input[type='color']:focus,
.uneditable-input:focus {
    border-color: rgba(82,168,236,.8);
    outline: 0;
    outline: thin dotted \\9; /* IE6-9 */
    #{mixins.box_shadow('inset 0 1px 1px rgba(0,0,0,.075), 0 0 8px rgba(82,168,236,.6)')}
}


/* Position radios and checkboxes better */
input[type='radio'],
input[type='checkbox'] {
  margin: 3px 0;
  *margin-top: 0; /* IE7 */
  line-height: normal;
  cursor: pointer;
}

/* Reset width of input buttons, radios, checkboxes */
input[type='submit'],
input[type='reset'],
input[type='button'],
input[type='radio'],
input[type='checkbox'] {
  width: auto; /* Override of generic input selector */
}

/* Make uneditable textareas behave like a textarea */
.uneditable-textarea {
  width: auto;
  height: auto;
}

/* Set the height of select and file controls to match text inputs */
select,
input[type='file'] {
  height: 28px; /* In IE7, the height of the select element cannot be changed by height, only font-size */
  *margin-top: 4px; /* For IE7, add top margin to align select with labels */
  line-height: 28px;
}

/* Make select elements obey height by applying a border */
select {
  width: 220px; /* default input width + 10px of padding that doesn't get applied */
  border: 1px solid #bbb;
}

/* Make multiple select elements height not fixed */
select[multiple],
select[size] {
  height: auto;
}

/* Focus for select, file, radio, and checkbox */
select:focus,
input[type='file']:focus,
input[type='radio']:focus,
input[type='checkbox']:focus {
  #{mixins.tab_focus()}
}



/* CHECKBOXES & RADIOS */
/* ------------------- */

/* Indent the labels to position radios/checkboxes as hanging */
.radio,
.checkbox {
  min-height: 18px; /* clear the floating input if there is no label text */
  padding-left: 18px;
}
.radio input[type='radio'],
.checkbox input[type='checkbox'] {
  float: left;
  margin-left: -18px;
}

/* Move the options list down to align with labels */
.controls > .radio:first-child,
.controls > .checkbox:first-child {
  padding-top: 5px; /* has to be padding because margin collaspes */
}

/* Radios and checkboxes on same line */
/* TODO v3: Convert .inline to .control-inline */
.radio.inline,
.checkbox.inline {
  display: inline-block;
  padding-top: 5px;
  margin-bottom: 0;
  vertical-align: middle;
}
.radio.inline + .radio.inline,
.checkbox.inline + .checkbox.inline {
  margin-left: 10px; /* space out consecutive inline controls */
}



/* INPUT SIZES */
/* ----------- */

/* General classes for quick sizes */
.input-mini       { width: 60px; }
.input-small      { width: 90px; }
.input-medium     { width: 150px; }
.input-large      { width: 210px; }
.input-xlarge     { width: 270px; }
.input-xxlarge    { width: 530px; }

/* Grid style input sizes */
input[class*='span'],
select[class*='span'],
textarea[class*='span'],
.uneditable-input[class*='span'],
/* Redeclare since the fluid row class is more specific */
.row-fluid input[class*='span'],
.row-fluid select[class*='span'],
.row-fluid textarea[class*='span'],
.row-fluid .uneditable-input[class*='span'] {
  float: none;
  margin-left: 0;
}
/* Ensure input-prepend/append never wraps */
.input-append input[class*='span'],
.input-append .uneditable-input[class*='span'],
.input-prepend input[class*='span'],
.input-prepend .uneditable-input[class*='span'],
.row-fluid .input-prepend [class*='span'],
.row-fluid .input-append [class*='span'] {
  display: inline-block;
}



/* GRID SIZING FOR INPUTS */
/* ---------------------- */

#{mixins.grid.input(vars.gridColumnWidth(), vars.gridGutterWidth())}


/* DISABLED STATE */
/* -------------- */

/* Disabled and read-only inputs */
input[disabled],
select[disabled],
textarea[disabled],
input[readonly],
select[readonly],
textarea[readonly] {
  cursor: not-allowed;
  background-color: #{vars.inputDisabledBackground()};
  border-color: #ddd;
}
/* Explicitly reset the colors here */
input[type='radio'][disabled],
input[type='checkbox'][disabled],
input[type='radio'][readonly],
input[type='checkbox'][readonly] {
  background-color: transparent;
}




/* FORM FIELD FEEDBACK STATES */
/* -------------------------- */

/* Warning */
#{mixins.formFieldState('.control-group.warning', vars.warningText(), 
                        vars.warningText(), vars.warningBackground())}

/* Error */
#{mixins.formFieldState('.control-group.error', vars.errorText(), 
                        vars.errorText(), vars.errorBackground())}

/* Success */
#{mixins.formFieldState('.control-group.success', vars.successText(), 
                        vars.successText(), vars.successBackground())}

/* HTML5 invalid states */
/* Shares styles with the .control-group.error above */
input:focus:required:invalid,
textarea:focus:required:invalid,
select:focus:required:invalid {
  color: #b94a48;
  border-color: #ee5f5b;
}
input:focus:required:invalid:focus,
textarea:focus:required:invalid:focus,
select:focus:required:invalid:focus {
    border-color: #{darken('#ee5f5b', .1)};
    #{mixins.box_shadow('0 0 6px '+lighten('#ee5f5b', .2))}
}



/* FORM ACTIONS */
/* ------------ */

.form-actions {
  padding: #{add(vars.baseLineHeight(), -1)} 20px #{vars.baseLineHeight()};
  margin-top: #{vars.baseLineHeight()};
  margin-bottom: #{vars.baseLineHeight()};
  background-color: #{vars.formActionsBackground()};
  border-top: 1px solid #e5e5e5;
}
#{mixins.clearfix('.form-actions')} /* Adding clearfix to allow for .pull-right button containers */

/* For text that needs to appear as an input but should not be an input */
.uneditable-input {
  overflow: hidden; /* prevent text from wrapping, but still cut it off like an input does */
  white-space: nowrap;
  cursor: not-allowed;
  background-color: #{vars.inputBackground()};
  border-color: #eee;
  #{mixins.box_shadow('inset 0 1px 2px rgba(0,0,0,.025)') }
}

/* Placeholder text gets special styles; can't be bundled together though for some reason */
/* XXX does the '*' matter? */
#{mixins.placeholder('*')}



/* HELP TEXT */
/* --------- */

.help-block,
.help-inline {
  color: #{vars.gray()}; /* lighten the text some for contrast */
}

.help-block {
  display: block; /* account for any element using help-block */
  margin-bottom: #{scale(vars.baseLineHeight(), 1/2)};
}

.help-inline {
  display: inline-block;
  #{mixins.ie7_inline_block()}
  vertical-align: middle;
  padding-left: 5px;
}



/* INPUT GROUPS */
/* ------------ */

/* Allow us to put symbols and text within the input field for a cleaner look */
.input-prepend,
.input-append {
  margin-bottom: 5px;
}

.input-prepend input,
.input-prepend select,
.input-prepend .uneditable-input,
.input-append input,
.input-append select,
.input-append .uneditable-input {
    position: relative; /* placed here by default so that on :focus we can place the input above the .add-on for full border and box-shadow goodness */
    margin-bottom: 0; /* prevent bottom margin from screwing up alignment in stacked forms */
    *margin-left: 0;
    vertical-align: middle;
    #{mixins.border_radius('0 '+vars.inputBorderRadius()+' '+vars.inputBorderRadius()+' 0') }
}

/* Make input on top when focused so blue border and shadow always show */
.input-prepend input:focus,
.input-prepend select:focus,
.input-prepend .uneditable-input:focus,
.input-append input:focus,
.input-append select:focus,
.input-append .uneditable-input:focus {
      z-index: 2;
}

.input-prepend .uneditable-input,
.input-append .uneditable-input {
    border-left-color: #ccc;
}

.input-prepend .add-on,
.input-append .add-on {
    display: inline-block;
    width: auto;
    height: #{vars.baseLineHeight()};
    min-width: 16px;
    padding: 4px 5px;
    font-weight: normal;
    line-height: #{vars.baseLineHeight()};
    text-align: center;
    text-shadow: 0 1px 0 #{vars.white()};
    vertical-align: middle;
    background-color: #{vars.grayLighter()};
    border: 1px solid #ccc;
}

.input-prepend .add-on,
.input-append .add-on,
.input-prepend .btn,
.input-append .btn {
    margin-left: -1px;
    #{mixins.border_radius('0')}
}
.input-prepend .active,
.input-append .active {
    background-color: #{lighten(vars.green(), .3)};
    border-color: #{vars.green()};
}

.input-prepend .add-on,
.input-prepend .btn {
    margin-right: -1px;
}
.input-prepend .add-on:first-child,
.input-prepend .btn:first-child {
    #{mixins.border_radius(vars.inputBorderRadius()+' 0 0 '+vars.inputBorderRadius())}
}

.input-append input,
.input-append select,
.input-append .uneditable-input {
    #{mixins.border_radius(vars.inputBorderRadius()+' 0 0 '+vars.inputBorderRadius())}
}
.input-append .uneditable-input {
    border-right-color: #ccc;
    border-left-color: #eee;
}
.input-append .add-on:last-child,
.input-append .btn:last-child,
.input-append .dropdown-toggle /* Oni Labs edit: dropdowns aren't last-child, because of the <ul> */ { 
    #{mixins.border_radius('0 '+vars.inputBorderRadius()+' '+vars.inputBorderRadius()+' 0')}
}

/* Remove all border-radius for inputs with both prepend and append */
.input-prepend.input-append input,
.input-prepend.input-append select,
.input-prepend.input-append .uneditable-input {
    #{mixins.border_radius('0')}
}
.input-prepend.input-append .add-on:first-child,
.input-prepend.input-append .btn:first-child {
    margin-right: -1px;
    #{mixins.border_radius(vars.inputBorderRadius()+' 0 0 '+vars.inputBorderRadius())}
}
.input-prepend.input-append .add-on:last-child,
.input-prepend.input-append .btn:last-child {
    margin-left: -1px;
    #{mixins.border_radius('0 '+vars.inputBorderRadius()+' '+vars.inputBorderRadius()+' 0')}
}


/* SEARCH FORM */
/* ----------- */

.search-query {
  padding-right: 14px;
  padding-right: 4px \\9;
  padding-left: 14px;
  padding-left: 4px \\9; /* IE7-8 doesn't have border-radius, so don't indent the padding */
  margin-bottom: 0; /* remove the default margin on all inputs */
  #{mixins.border_radius('14px')}
}



/* HORIZONTAL & VERTICAL FORMS */
/* --------------------------- */

/* Common properties */
/* ----------------- */

.form-search input,
.form-search textarea,
.form-search select,
.form-search .help-inline,
.form-search .uneditable-input,
.form-search .input-prepend,
.form-search .input-append,
.form-inline input,
.form-inline textarea,
.form-inline select,
.form-inline .help-inline,
.form-inline .uneditable-input,
.form-inline .input-prepend,
.form-inline .input-append,
.form-inline surface-ui,
.form-inline .control-group, /* XXX Oni Labs edit */
.form-horizontal input,
.form-horizontal textarea,
.form-horizontal select,
.form-horizontal .help-inline,
.form-horizontal .uneditable-input,
.form-horizontal .input-prepend
/* .form-horizontal .input-append XXX Oni Labs edit: removed for proper alignment of compound widgets */ {
    display: inline-block;
    #{mixins.ie7_inline_block()}
    margin-bottom: 0;
}
  /* Re-hide hidden elements due to specifity */
.form-search .hide,
.form-inline .hide,
.form-horizontal .hide {
    display: none;
}

.form-search label,
.form-inline label {
  display: inline-block;
  /* Oni Labs edits: */
  margin-bottom: 0;
  vertical-align: middle;
}
/* Remove margin for input-prepend/-append */
.form-search .input-append,
.form-inline .input-append,
.form-search .input-prepend,
.form-inline .input-prepend {
  margin-bottom: 0;
}
/* Inline checkbox/radio labels (remove padding on left) */
.form-search .radio,
.form-search .checkbox,
.form-inline .radio,
.form-inline .checkbox {
  padding-left: 0;
  margin-bottom: 0;
  vertical-align: middle;
}
/* Remove float and margin, set to inline-block */
.form-search .radio input[type='radio'],
.form-search .checkbox input[type='checkbox'],
.form-inline .radio input[type='radio'],
.form-inline .checkbox input[type='checkbox'] {
  float: left;
  margin-right: 3px;
  margin-left: 0;
}


/* Margin to space out fieldsets */
.control-group {
  margin-bottom: #{scale(vars.baseLineHeight(), 1/2)};
}

/* Legend collapses margin, so next element is responsible for spacing */
legend + .control-group {
  margin-top: #{vars.baseLineHeight()};
  -webkit-margin-top-collapse: separate;
}

/* Horizontal-specific styles */
/* -------------------------- */

  /* Increase spacing between groups */
.form-horizontal .control-group {
    margin-bottom: #{vars.baseLineHeight()};
}
#{mixins.clearfix('.form-horizontal .control-group')}

  /* Float the labels left */
.form-horizontal .control-label {
    float: left;
    width: 140px;
    padding-top: 5px;
    text-align: right;
}
  /* Move over all input controls and content */
.form-horizontal .controls {
    /* Super jank IE7 fix to ensure the inputs in .input-append and input-prepend */
    /* don't inherit the margin of the parent, in this case .controls */
    *display: inline-block;
    *padding-left: 20px;
    margin-left: 160px;
    *margin-left: 0;
}

.form-horizontal .controls:first-child {
      *padding-left: 160px;
}

  /* Remove bottom margin on block level help text since that's accounted for on .control-group */
.form-horizontal .help-block {
    margin-top: #{scale(vars.baseLineHeight(),1/2)};
    margin-bottom: 0;
}
  /* Move over buttons in .form-actions to align with .controls */
.form-horizontal .form-actions {
    padding-left: 160px;
}

");
};

//----------------------------------------------------------------------
// port of buttons.less
// BUTTON STYLES

__js var CSSButtons = exports.CSSButtons = function(lookAndFeel) {
  var vars = lookAndFeel || defaultLookAndFeel;
  var mixins = Mixins(vars);

  // XXX cache
  return base.CSS("
/* Base styles */
/* -------------------------------------------------- */

/* Core */
.btn {
  display: inline-block;
  #{mixins.ie7_inline_block()}
  padding: 4px 10px 4px;
  margin-bottom: 0; /* For input.btn */
  font-size: #{vars.baseFontSize()};
  line-height: #{vars.baseLineHeight()};
  *line-height: 20px;
  color: #{vars.grayDark()};
  text-align: center;
  text-shadow: 0 1px 1px rgba(255,255,255,.75);
  vertical-align: middle;
  cursor: pointer;
  border: 1px solid #{vars.btnBorder()};
  *border: 0; /* Remove the border to prevent IE7's black border on input:focus */
  border-bottom-color: #{darken(vars.btnBorder(), .1)};
  #{mixins.border_radius('4px')}
  #{mixins.box_shadow('inset 0 1px 0 rgba(255,255,255,.2), 0 1px 2px rgba(0,0,0,.05)')}
}
#{mixins.ie7_restore_left_whitespace('.btn')} /* Give IE7 some love */
#{mixins.buttonBackground('.btn', vars.btnBackground(), vars.btnBackgroundHighlight())}

/* Hover state */
.btn:hover {
  color: #{vars.grayDark()};
  text-decoration: none;
  background-color: #{vars.btnBackgroundHighlight()};
  background-position: 0 -15px;

  /* transition is only when going to hover, otherwise the background */
  /* behind the gradient (there for IE<=9 fallback) gets mismatched */
  #{mixins.transition('background-position .1s linear')}
}

/* Focus state for keyboard and accessibility */
.btn:focus {
  #{mixins.tab_focus()}
}

/* Active state */
.btn.active,
.btn:active {
  background-color: #{vars.btnBackgroundHighlight()};
  background-image: none;
  outline: 0;
  #{mixins.box_shadow('inset 0 2px 4px rgba(0,0,0,.15), 0 1px 2px rgba(0,0,0,.05)')}
}

/* Disabled state */
.btn.disabled,
.btn[disabled] {
  cursor: default;
  background-color: #{darken(vars.white(), .1)};
  background-image: none;
  #{mixins.opacity(65)}
  #{mixins.box_shadow('none')}
}


/* Button Sizes */
/* -------------------------------------------------- */

/* Large */
.btn-large {
  padding: 9px 14px;
  font-size: #{add(vars.baseFontSize(), '2px')};
  line-height: normal;
  #{mixins.border_radius('5px')}
}
.btn-large [class^='icon-'] {
  margin-top: 1px;
}

/* Small */
.btn-small {
  padding: 5px 9px;
  font-size: #{add(vars.baseFontSize(), '-2px')};
  line-height: #{add(vars.baseLineHeight(), '-2px')};
}
.btn-small [class^='icon-'] {
  margin-top: -1px;
}

/* Mini */
.btn-mini {
  padding: 2px 6px;
  font-size: #{add(vars.baseFontSize(), '-2px')};
  line-height: #{add(vars.baseLineHeight(), '-4px')};
}


/* Alternate buttons */
/* -------------------------------------------------- */

/* Set text color */
/* ------------------------- */
.btn-primary,
.btn-primary:hover,
.btn-warning,
.btn-warning:hover,
.btn-danger,
.btn-danger:hover,
.btn-success,
.btn-success:hover,
.btn-info,
.btn-info:hover,
.btn-inverse,
.btn-inverse:hover {
  color: #{vars.white()};
  text-shadow: 0 -1px 0 rgba(0,0,0,.25);
}
/* Provide *some* extra contrast for those who can get it */
.btn-primary.active,
.btn-warning.active,
.btn-danger.active,
.btn-success.active,
.btn-info.active,
.btn-inverse.active {
  color: rgba(255,255,255,.75);
}

/* Set the backgrounds */
/* ------------------------- */
.btn {
  /* reset here as of 2.0.3 due to Recess property order */
  border-color: #ccc;
  border-color: rgba(0,0,0,.1) rgba(0,0,0,.1) rgba(0,0,0,.25);
}
#{mixins.buttonBackground('.btn-primary', vars.btnPrimaryBackground(), vars.btnPrimaryBackgroundHighlight())}
/* Warning appears are orange */
#{mixins.buttonBackground('.btn-warning', vars.btnWarningBackground(), vars.btnWarningBackgroundHighlight())}
/* Danger and error appear as red */
#{mixins.buttonBackground('.btn-danger', vars.btnDangerBackground(), vars.btnDangerBackgroundHighlight())}
/* Success appears as green */
#{mixins.buttonBackground('.btn-success', vars.btnSuccessBackground(), vars.btnSuccessBackgroundHighlight())}
/* Info appears as a neutral blue */
#{mixins.buttonBackground('.btn-info', vars.btnInfoBackground(), vars.btnInfoBackgroundHighlight())}
/* Inverse appears as dark gray */
#{mixins.buttonBackground('.btn-inverse', vars.btnInverseBackground(), vars.btnInverseBackgroundHighlight())}


/* Cross-browser Jank */
/* -------------------------------------------------- */

  /* Firefox 3.6 only I believe */
button.btn::-moz-focus-inner,
input[type='submit'].btn::-moz-focus-inner {
    padding: 0;
    border: 0;
}

  /* IE7 has some default padding on button controls */
button.btn,
input[type='submit'].btn {
  *padding-top: 2px;
  *padding-bottom: 2px;
}

button.btn.btn-large,
input[type='submit'].btn.btn-large {
    *padding-top: 7px;
    *padding-bottom: 7px;
}
button.btn.btn-small,
input[type='submit'].btn.btn-small {
    *padding-top: 3px;
    *padding-bottom: 3px;
}
button.btn.btn-mini,
input[type='submit'].btn.btn-mini {
    *padding-top: 1px;
    *padding-bottom: 1px;
}
");
};

//----------------------------------------------------------------------
// port of button-groups.less
// BUTTON GROUPS
// -------------

__js var CSSButtonGroups = exports.CSSButtonGroups = function(lookAndFeel) {
  var vars = lookAndFeel || defaultLookAndFeel;
  var mixins = Mixins(vars);

  // XXX cache
  return base.CSS("
/* Make the div behave like a button */
.btn-group {
  position: relative;
}
#{mixins.clearfix('.btn-group')} /* clears the floated buttons */
#{mixins.ie7_restore_left_whitespace('.btn-group')}

/* Space out series of button groups */
.btn-group + .btn-group {
  margin-left: 5px;
}

/* Optional: Group multiple button groups together for a toolbar */
.btn-toolbar {
  margin-top: #{scale(vars.baseLineHeight(), 1/2)};
  margin-bottom: #{scale(vars.baseLineHeight(), 1/2)};
}
.btn-toolbar .btn-group {
    display: inline-block;
    #{mixins.ie7_inline_block()}
}


/* Float them, remove border radius, then re-add to first and last elements */
.btn-group > .btn {
  position: relative;
  float: left;
  margin-left: -1px;
  #{mixins.border_radius('0')}
}
/* Set corners individual because sometimes a single button can be in a .btn-group and we need :first-child and :last-child to both match */
.btn-group > .btn:first-child {
  margin-left: 0;
     -webkit-border-top-left-radius: 4px;
         -moz-border-radius-topleft: 4px;
             border-top-left-radius: 4px;
  -webkit-border-bottom-left-radius: 4px;
      -moz-border-radius-bottomleft: 4px;
          border-bottom-left-radius: 4px;
}
/* Need .dropdown-toggle since :last-child doesn't apply given a .dropdown-menu immediately after it */
.btn-group > .btn:last-child,
.btn-group > .dropdown-toggle {
     -webkit-border-top-right-radius: 4px;
         -moz-border-radius-topright: 4px;
             border-top-right-radius: 4px;
  -webkit-border-bottom-right-radius: 4px;
      -moz-border-radius-bottomright: 4px;
          border-bottom-right-radius: 4px;
}
/* Reset corners for large buttons */
.btn-group > .btn.large:first-child {
  margin-left: 0;
     -webkit-border-top-left-radius: 6px;
         -moz-border-radius-topleft: 6px;
             border-top-left-radius: 6px;
  -webkit-border-bottom-left-radius: 6px;
      -moz-border-radius-bottomleft: 6px;
          border-bottom-left-radius: 6px;
}
.btn-group > .btn.large:last-child,
.btn-group > .large.dropdown-toggle {
     -webkit-border-top-right-radius: 6px;
         -moz-border-radius-topright: 6px;
             border-top-right-radius: 6px;
  -webkit-border-bottom-right-radius: 6px;
      -moz-border-radius-bottomright: 6px;
          border-bottom-right-radius: 6px;
}

/* On hover/focus/active, bring the proper btn to front */
.btn-group > .btn:hover,
.btn-group > .btn:focus,
.btn-group > .btn:active,
.btn-group > .btn.active {
  z-index: 2;
}

/* On active and open, don't show outline */
.btn-group .dropdown-toggle:active,
.btn-group.open .dropdown-toggle {
  outline: 0;
}



/* Split button dropdowns */
/* ---------------------- */

/* Give the line between buttons some depth */
.btn-group > .dropdown-toggle {
  padding-left: 8px;
  padding-right: 8px;
  #{mixins.box_shadow('inset 1px 0 0 rgba(255,255,255,.125), inset 0 1px 0 rgba(255,255,255,.2), 0 1px 2px rgba(0,0,0,.05)')}
  *padding-top: 4px;
  *padding-bottom: 4px;
}
.btn-group > .btn-mini.dropdown-toggle {
  padding-left: 5px;
  padding-right: 5px;
}
.btn-group > .btn-small.dropdown-toggle {
  *padding-top: 4px;
  *padding-bottom: 4px;
}
.btn-group > .btn-large.dropdown-toggle {
  padding-left: 12px;
  padding-right: 12px;
}

/* The clickable button for toggling the menu */
/* Remove the gradient and set the same inset shadow as the :active state */
.btn-group.open .dropdown-toggle {
    background-image: none;
    #{mixins.box_shadow('inset 0 2px 4px rgba(0,0,0,.15), 0 1px 2px rgba(0,0,0,.05)')}
}

  /* Keep the hover's background when dropdown is open */
.btn-group.open .btn.dropdown-toggle {
    background-color: #{vars.btnBackgroundHighlight()};
}
.btn-group.open .btn-primary.dropdown-toggle {
    background-color: #{vars.btnPrimaryBackgroundHighlight()};
}
.btn-group.open .btn-warning.dropdown-toggle {
    background-color: #{vars.btnWarningBackgroundHighlight()};
}
.btn-group.open .btn-danger.dropdown-toggle {
    background-color: #{vars.btnDangerBackgroundHighlight()};
}
.btn-group.open .btn-success.dropdown-toggle {
    background-color: #{vars.btnSuccessBackgroundHighlight()};
}
.btn-group.open .btn-info.dropdown-toggle {
    background-color: #{vars.btnInfoBackgroundHighlight()};
}
.btn-group.open .btn-inverse.dropdown-toggle {
    background-color: #{vars.btnInverseBackgroundHighlight()};
}


/* Reposition the caret */
.btn .caret {
  margin-top: 7px;
  margin-left: 0;
}
.btn:hover .caret,
.open.btn-group .caret {
  #{mixins.opacity(100)}
}
/* Carets in other button sizes */
.btn-mini .caret {
  margin-top: 5px;
}
.btn-small .caret {
  margin-top: 6px;
}
.btn-large .caret {
  margin-top: 6px;
  border-left-width:  5px;
  border-right-width: 5px;
  border-top-width:   5px;
}
/* Upside down carets for .dropup */
.dropup .btn-large .caret {
  border-bottom: 5px solid #{vars.black()};
  border-top: 0;
}



/* Account for other colors */
.btn-primary .caret,
.btn-warning .caret,
.btn-danger .caret,
.btn-info .caret,
.btn-success .caret,
.btn-inverse .caret {
    border-top-color: #{vars.white()};
    border-bottom-color: #{vars.white()};
    #{mixins.opacity(75)}
}
");
};

//----------------------------------------------------------------------
// port of alerts.less
// ALERT STYLES
// ------------

__js var CSSAlerts = exports.CSSAlerts = function(lookAndFeel) {
  var vars = lookAndFeel || defaultLookAndFeel;
  var mixins = Mixins(vars);

  // XXX cache
  return base.CSS("
/* Base alert styles */
.alert {
  padding: 8px 35px 8px 14px;
  margin-bottom: #{vars.baseLineHeight()};
  text-shadow: 0 1px 0 rgba(255,255,255,.5);
  background-color: #{vars.warningBackground()};
  border: 1px solid #{vars.warningBorder()};
  #{mixins.border_radius('4px')}
  color: #{vars.warningText()};
}
.alert-heading {
  color: inherit;
}

/* Adjust close link position */
.alert .close {
  position: relative;
  top: -2px;
  right: -21px;
  line-height: 18px;
}

/* Alternate styles */
/* ---------------- */

.alert-success {
  background-color: #{vars.successBackground()};
  border-color: #{vars.successBorder()};  
  color: #{vars.successText()};
}
.alert-danger,
.alert-error {
  background-color: #{vars.errorBackground()};
  border-color: #{vars.errorBorder()};
  color: #{vars.errorText()};
}
.alert-info {
  background-color: #{vars.infoBackground()};
  border-color: #{vars.infoBorder()};
  color: #{vars.infoText()};
}

/* Block alerts */
/* ------------------------ */
.alert-block {
  padding-top: 14px;
  padding-bottom: 14px;
}
.alert-block > p,
.alert-block > ul {
  margin-bottom: 0;
}
.alert-block p + p {
  margin-top: 5px;
}
");
};

//----------------------------------------------------------------------
// port of dropdowns.less
// DROPDOWN MENUS
// --------------

__js var CSSDropdowns = exports.CSSDropdowns = function(lookAndFeel) {
  var vars = lookAndFeel || defaultLookAndFeel;
  var mixins = Mixins(vars);

  // XXX cache
  return base.CSS("
/* Use the .menu class on any <li> element within the topbar or ul.tabs and you'll get some superfancy dropdowns */
.dropup,
.dropdown {
  position: relative;
}
.dropdown-toggle {
  /* The caret makes the toggle a bit too tall in IE7 */
  *margin-bottom: -3px;
}
.dropdown-toggle:active,
.open .dropdown-toggle {
  outline: 0;
}

/* Dropdown arrow/caret */
/* -------------------- */
.caret {
  display: inline-block;
  width: 0;
  height: 0;
  vertical-align: top;
  border-top:   4px solid #{vars.black()};
  border-right: 4px solid transparent;
  border-left:  4px solid transparent;
  content: '';
  #{mixins.opacity(30)}
}

/* Place the caret */
.dropdown .caret {
  margin-top: 8px;
  margin-left: 2px;
}
.dropdown:hover .caret,
.open .caret {
  #{mixins.opacity(100)}
}

/* The dropdown menu (ul) */
/* ---------------------- */
.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: #{vars.zindexDropdown()};
  display: none; /* none by default, but block on 'open' of the menu */
  float: left;
  min-width: 160px;
  padding: 4px 0;
  margin: 1px 0 0; /* override default ul */
  list-style: none;
  background-color: #{vars.dropdownBackground()};
  border: 1px solid #ccc;
  border: 1px solid rgba(0,0,0,.2);
  *border-right-width: 2px;
  *border-bottom-width: 2px;
  #{mixins.border_radius('5px')}
  #{mixins.box_shadow('0 5px 10px rgba(0,0,0,.2)')}
  -webkit-background-clip: padding-box;
     -moz-background-clip: padding;
          background-clip: padding-box;
}
  /* Aligns the dropdown menu to right */
.dropdown-menu.pull-right {
    right: 0;
    left: auto;
}

  /* Dividers (basically an hr) within the dropdown */
.dropdown-menu .divider {
    #{mixins.nav_divider(vars.dropdownDividerTop(), vars.dropdownDividerBottom())}
}

  /* Links within the dropdown menu */
.dropdown-menu a {
    display: block;
    padding: 3px 15px;
    clear: both;
    font-weight: normal;
    line-height: #{vars.baseLineHeight()};
    color: #{vars.dropdownLinkColor()};
    white-space: nowrap;
}

/* Hover state */
/* ----------- */
.dropdown-menu li > a:hover,
.dropdown-menu .active > a,
.dropdown-menu .active > a:hover {
  color: #{vars.dropdownLinkColorHover()};
  text-decoration: none;
  background-color: #{vars.dropdownLinkBackgroundHover()};
}

/* Open state for the dropdown */
/* --------------------------- */
.open {
  /* IE7's z-index only goes to the nearest positioned ancestor, which would */
  /* make the menu appear below buttons that appeared later on the page */
  *z-index: #{vars.zindexDropdown()};
}
.open > .dropdown-menu {
    display: block;
}

/* Right aligned dropdowns */
/* --------------------------- */
.pull-right > .dropdown-menu {
  right: 0;
  left: auto;
}

/* Allow for dropdowns to go bottom up (aka, dropup-menu) */
/* ------------------------------------------------------ */
/* Just add .dropup after the standard .dropdown class and you're set, bro. */
/* TODO: abstract this so that the navbar fixed styles are not placed here? */
.dropup,
.navbar-fixed-bottom .dropdown {
}
  /* Reverse the caret */
.dropup .caret,
.navbar-fixed-bottom .dropdown .caret {
    border-top: 0;
    border-bottom: 4px solid #{vars.black()};
    content: '\2191';
}
  /* Different positioning for bottom up menu */
.dropup .dropdown-menu,
.navbar-fixed-bottom .dropdown .dropdown-menu {
    top: auto;
    bottom: 100%;
    margin-bottom: 1px;
}

/* Typeahead */
/* --------- */
.typeahead {
  margin-top: 2px; /* give it some space to breathe */
  #{mixins.border_radius('4px')}
}

");

};

//----------------------------------------------------------------------
// port of labels-badges.less
// LABELS & BADGES
// ---------------

__js var CSSLabelsBadges = exports.CSSLabelsBadges = function(lookAndFeel) {
  var vars = lookAndFeel || defaultLookAndFeel;
  var mixins = Mixins(vars);

  // XXX cache
  return base.CSS("
/* LABELS & BADGES */
/* --------------- */

/* Base classes */
.label,
.badge {
  font-size: #{scale(vars.baseFontSize(),.846)};
  font-weight: bold;
  line-height: 14px; /* ensure proper line-height if floated */
  color: #{vars.white()};
  vertical-align: baseline;
  white-space: nowrap;
  text-shadow: 0 -1px 0 rgba(0,0,0,.25);
  background-color: #{vars.grayLight()};
}
/* Set unique padding and border-radii */
.label {
  padding: 1px 4px 2px;
  #{mixins.border_radius('3px')}
}
.badge {
  padding: 1px 9px 2px;
  #{mixins.border_radius('9px')}
}

/* Hover state, but only for links */
a.label:hover,
a.badge:hover {
    color: #{vars.white()};
    text-decoration: none;
    cursor: pointer;
}

/* Colors */
/* Only give background-color difference to links (and to simplify, we don't qualifty with `a` but [href] attribute) */
/* Important (red) */
.label-important, .badge-important { background-color: #{vars.errorText()}; }
.label-important[href],
.badge-important[href] { background-color: #{ darken(vars.errorText(), .1) }; }
/* Warnings (orange) */
.label-warning, .badge-warning { background-color: #{vars.orange()}; }
.label-warning[href], 
.badge-warning[href] { background-color: #{darken(vars.orange(), .1)}; }
  /* Success (green) */
.label-success, .badge-success { background-color: #{vars.successText()}; }
.label-success[href],
.badge-success[href] { background-color: #{darken(vars.successText(), .1)}; }
  /* Info (turquoise) */
.label-info, .badge-info { background-color: #{vars.infoText()}; }
.label-info[href], 
.badge-info[href]  { background-color: #{darken(vars.infoText(), .1)}; }
  /* Inverse (black) */
.label-inverse, .badge-inverse { background-color: #{vars.grayDark()}; }
.label-inverse[href], 
.badge-inverse[href] { background-color: #{darken(vars.grayDark(), .1)}; }
");
};

//----------------------------------------------------------------------
// port of thumbnails.less
// THUMBNAILS
// ----------


__js var CSSThumbnails = exports.CSSThumbnails = function(lookAndFeel) {
  var vars = lookAndFeel || defaultLookAndFeel;
  var mixins = Mixins(vars);

  // XXX cache
  return base.CSS("
/* Note: `.thumbnails` and `.thumbnails > li` are overriden in responsive files */

/* Make wrapper ul behave like the grid */
.thumbnails {
  margin-left: -#{vars.gridGutterWidth()};
  list-style: none;
}
#{mixins.clearfix('.thumbnails')}

/* Fluid rows have no left margin */
.row-fluid .thumbnails {
  margin-left: 0;
}

/* Float li to make thumbnails appear in a row */
.thumbnails > li {
  float: left; /* Explicity set the float since we don't require .span* classes */
  margin-bottom: #{vars.baseLineHeight()};
  margin-left: #{vars.gridGutterWidth()};
}

/* The actual thumbnail (can be `a` or `div`) */
.thumbnail {
  display: block;
  padding: 4px;
  line-height: 1;
  border: 1px solid #ddd;
  #{mixins.border_radius('4px')}
  #{mixins.box_shadow('0 1px 1px rgba(0,0,0,.075)')}
}
/* Add a hover state for linked versions only */
a.thumbnail:hover {
  border-color: #{vars.linkColor()};
  #{mixins.box_shadow('0 1px 4px rgba(0,105,214,.25)')}
}

/* Images and captions */
.thumbnail > img {
  display: block;
  max-width: 100%;
  margin-left: auto;
  margin-right: auto;
}
.thumbnail .caption {
  padding: 9px;
}

");
};

//----------------------------------------------------------------------
// port of progess-bars.less
// PROGRESS BARS
// -------------

__js var CSSProgressBars = exports.CSSProgressBars = function(lookAndFeel) {
  var vars = lookAndFeel || defaultLookAndFeel;
  var mixins = Mixins(vars);

  // XXX cache
  return base.CSS("
/* ANIMATIONS */
/* ---------- */

@global {
/* Webkit */
@-webkit-keyframes __oni_bootstrap-progress-bar-stripes {
  from  { background-position: 40px 0; }
  to    { background-position: 0 0; }
}

/* Firefox */
@-moz-keyframes __oni_bootstrap-progress-bar-stripes {
  from  { background-position: 40px 0; }
  to    { background-position: 0 0; }
}

/* IE9 */
@-ms-keyframes __oni_bootstrap-progress-bar-stripes {
  from  { background-position: 40px 0; }
  to    { background-position: 0 0; }
}

/* Opera */
@-o-keyframes __oni_bootstrap-progress-bar-stripes {
  from  { background-position: 0 0; }
  to    { background-position: 40px 0; }
}

/* Spec */
@keyframes __oni_bootstrap-progress-bar-stripes {
  from  { background-position: 40px 0; }
  to    { background-position: 0 0; }
}
}


/* THE BARS */
/* -------- */

/* Outer container */
.progress {
  overflow: hidden;
  height: 18px;
  margin-bottom: 18px;
  #{mixins.gradient.vertical('#f5f5f5', '#f9f9f9')}
  #{mixins.box_shadow('inset 0 1px 2px rgba(0,0,0,.1)')}
  #{mixins.border_radius('4px')}
}

/* Bar of progress */
.progress .bar {
  width: 0%;
  height: 18px;
  color: #{vars.white()};
  font-size: 12px;
  text-align: center;
  text-shadow: 0 -1px 0 rgba(0,0,0,.25);
  #{mixins.gradient.vertical('#149bdf', '#0480be')}
  #{mixins.box_shadow('inset 0 -1px 0 rgba(0,0,0,.15)')}
  #{mixins.box_sizing('border-box')}
  #{mixins.transition('width .6s ease')}
}

/* Striped bars */
.progress-striped .bar {
  #{mixins.gradient.striped('#149bdf')}
  #{mixins.background_size('40px 40px')}
}

/* Call animation for the active one */
.progress.active .bar {
  -webkit-animation: __oni_bootstrap-progress-bar-stripes 2s linear infinite;
     -moz-animation: __oni_bootstrap-progress-bar-stripes 2s linear infinite;
      -ms-animation: __oni_bootstrap-progress-bar-stripes 2s linear infinite;
       -o-animation: __oni_bootstrap-progress-bar-stripes 2s linear infinite;
          animation: __oni_bootstrap-progress-bar-stripes 2s linear infinite;
}



/* COLORS */
/* ------ */

/* Danger (red) */
.progress-danger .bar {
  #{mixins.gradient.vertical('#ee5f5b', '#c43c35')}
}
.progress-danger.progress-striped .bar {
  #{mixins.gradient.striped('#ee5f5b') }
}

/* Success (green) */
.progress-success .bar {
  #{mixins.gradient.vertical('#62c462', '#57a957')}
}
.progress-success.progress-striped .bar {
  #{mixins.gradient.striped('#62c462')}
}

/* Info (teal) */
.progress-info .bar {
  #{mixins.gradient.vertical('#5bc0de', '#339bb9')}
}
.progress-info.progress-striped .bar {
  #{mixins.gradient.striped('#5bc0de')}
}

/* Warning (orange) */
.progress-warning .bar {
  #{mixins.gradient.vertical(lighten(vars.orange(), .15), vars.orange())}
}
.progress-warning.progress-striped .bar {
  #{mixins.gradient.striped(lighten(vars.orange(), .15))}
}
");
};

//----------------------------------------------------------------------
// port of hero-unit.less
// HERO UNIT
// ---------

__js var CSSHeroUnit = exports.CSSHeroUnit = function(lookAndFeel) {
  var vars = lookAndFeel || defaultLookAndFeel;
  var mixins = Mixins(vars);

  // XXX cache
  return base.CSS("
.hero-unit {
  padding: 60px;
  margin-bottom: 30px;
  background-color: #{vars.heroUnitBackground()};
  #{mixins.border_radius('6px')}
}
.hero-unit h1 {
    margin-bottom: 0;
    font-size: 60px;
    line-height: 1;
    color: #{vars.heroUnitHeadingColor()};
    letter-spacing: -1px;
}
.hero-unit p {
    font-size: 18px;
    font-weight: 200;
    line-height: #{scale(vars.baseLineHeight(), 1.5)};
    color: #{vars.heroUnitLeadColor()};
}
");
};

//----------------------------------------------------------------------
// port of navs.less
// NAVIGATIONS
// -----------

__js var CSSNavs = exports.CSSNavs = function(lookAndFeel) {
  var vars = lookAndFeel || defaultLookAndFeel;
  var mixins = Mixins(vars);

  // XXX cache
  return base.CSS("
/* BASE CLASS */
/* ---------- */

.nav {
  margin-left: 0;
  margin-bottom: #{vars.baseLineHeight()};
  list-style: none;
}

/* Make links block level */
.nav > li > a {
  display: block;
}
.nav > li > a:hover {
  text-decoration: none;
  background-color: #{vars.grayLighter()};
}

/* Redeclare pull classes because of specifity */
.nav > .pull-right {
  float: right;
}

/* Nav headers (for dropdowns and lists) */
.nav .nav-header {
  display: block;
  padding: 3px 15px;
  font-size: 11px;
  font-weight: bold;
  line-height: #{vars.baseLineHeight()};
  color: #{vars.grayLight()};
  text-shadow: 0 1px 0 rgba(255,255,255,.5);
  text-transform: uppercase;
}
/* Space them out when they follow another list item (link) */
.nav li + .nav-header {
  margin-top: 9px;
}


/* NAV LIST */
/* -------- */

.nav-list {
  padding-left: 15px;
  padding-right: 15px;
  margin-bottom: 0;
}
.nav-list > li > a,
.nav-list .nav-header {
  margin-left:  -15px;
  margin-right: -15px;
  text-shadow: 0 1px 0 rgba(255,255,255,.5);
}
.nav-list > li > a {
  padding: 3px 15px;
}
.nav-list > .active > a,
.nav-list > .active > a:hover {
  color: #{vars.white()};
  text-shadow: 0 -1px 0 rgba(0,0,0,.2);
  background-color: #{vars.linkColor()};
}
.nav-list [class^='icon-'] {
  margin-right: 2px;
}
/* Dividers (basically an hr) within the dropdown */
.nav-list .divider {
  #{mixins.nav_divider()}
}



/* TABS AND PILLS */
/* ------------- */

/* Common styles */
#{mixins.clearfix('.nav-tabs')}
#{mixins.clearfix('.nav-pills')}
.nav-tabs > li,
.nav-pills > li {
  float: left;
}
.nav-tabs > li > a,
.nav-pills > li > a {
  padding-right: 12px;
  padding-left: 12px;
  margin-right: 2px;
  line-height: 14px; /* keeps the overall height an even number */
}

/* TABS */
/* ---- */

/* Give the tabs something to sit on */
.nav-tabs {
  border-bottom: 1px solid #ddd;
}
/* Make the list-items overlay the bottom border */
.nav-tabs > li {
  margin-bottom: -1px;
}
/* Actual tabs (as links) */
.nav-tabs > li > a {
  padding-top: 8px;
  padding-bottom: 8px;
  line-height: #{vars.baseLineHeight()};
  border: 1px solid transparent;
  #{mixins.border_radius('4px 4px 0 0')}
}
.nav-tabs > li > a:hover {
    border-color: #{vars.grayLighter()} #{vars.grayLighter()} #ddd;
}

/* Active state, and it's :hover to override normal :hover */
.nav-tabs > .active > a,
.nav-tabs > .active > a:hover {
  color: #{vars.gray()};
  background-color: #{vars.white()};
  border: 1px solid #ddd;
  border-bottom-color: transparent;
  cursor: default;
}


/* PILLS */
/* ----- */

/* Links rendered as pills */
.nav-pills > li > a {
  padding-top: 8px;
  padding-bottom: 8px;
  margin-top: 2px;
  margin-bottom: 2px;
  #{mixins.border_radius('5px')}
}

/* Active state */
.nav-pills > .active > a,
.nav-pills > .active > a:hover {
  color: #{vars.white()};
  background-color: #{vars.linkColor()};
}



/* STACKED NAV */
/* ----------- */

/* Stacked tabs and pills */
.nav-stacked > li {
  float: none;
}
.nav-stacked > li > a {
  margin-right: 0; /* no need for the gap between nav items */
}

/* Tabs */
.nav-tabs.nav-stacked {
  border-bottom: 0;
}
.nav-tabs.nav-stacked > li > a {
  border: 1px solid #ddd;
  #{mixins.border_radius('0')}
}
.nav-tabs.nav-stacked > li:first-child > a {
  #{mixins.border_radius('4px 4px 0 0')}
}
.nav-tabs.nav-stacked > li:last-child > a {
  #{mixins.border_radius('0 0 4px 4px')}
}
.nav-tabs.nav-stacked > li > a:hover {
  border-color: #ddd;
  z-index: 2;
}

/* Pills */
.nav-pills.nav-stacked > li > a {
  margin-bottom: 3px;
}
.nav-pills.nav-stacked > li:last-child > a {
  margin-bottom: 1px; /* decrease margin to match sizing of stacked tabs */
}



/* DROPDOWNS */
/* --------- */

.nav-tabs .dropdown-menu {
  #{mixins.border_radius('0 0 5px 5px')} /* remove the top rounded corners here since there is a hard edge above the menu */
}
.nav-pills .dropdown-menu {
  #{mixins.border_radius('4px')} /* make rounded corners match the pills */
}

/* Default dropdown links */
/* ------------------------- */
/* Make carets use linkColor to start */
.nav-tabs .dropdown-toggle .caret,
.nav-pills .dropdown-toggle .caret {
  border-top-color: #{vars.linkColor()};
  border-bottom-color: #{vars.linkColor()};
  margin-top: 6px;
}
.nav-tabs .dropdown-toggle:hover .caret,
.nav-pills .dropdown-toggle:hover .caret {
  border-top-color: #{vars.linkColorHover()};
  border-bottom-color: #{vars.linkColorHover()};
}

/* Active dropdown links */
/* ------------------------- */
.nav-tabs .active .dropdown-toggle .caret,
.nav-pills .active .dropdown-toggle .caret {
  border-top-color: #{vars.grayDark()};
  border-bottom-color: #{vars.grayDark()};
}

/* Active:hover dropdown links */
/* ------------------------- */
.nav > .dropdown.active > a:hover {
  color: #{vars.black()};
  cursor: pointer;
}

/* Open dropdowns */
/* ------------------------- */
.nav-tabs .open .dropdown-toggle,
.nav-pills .open .dropdown-toggle,
.nav > li.dropdown.open.active > a:hover {
  color: #{vars.white()};
  background-color: #{vars.grayLight()};
  border-color: #{vars.grayLight()};
}
.nav li.dropdown.open .caret,
.nav li.dropdown.open.active .caret,
.nav li.dropdown.open a:hover .caret {
  border-top-color: #{vars.white()};
  border-bottom-color: #{vars.white()};
  #{mixins.opacity(100)}
}

/* Dropdowns in stacked tabs */
.tabs-stacked .open > a:hover {
  border-color: #{vars.grayLight()};
}



/* TABBABLE */
/* -------- */


/* COMMON STYLES */
/* ------------- */

/* Clear any floats */
#{mixins.clearfix('.tabbable')}
.tab-content {
  overflow: auto; /* prevent content from running below tabs */
}

/* Remove border on bottom, left, right */
.tabs-below > .nav-tabs,
.tabs-right > .nav-tabs,
.tabs-left > .nav-tabs {
  border-bottom: 0;
}

/* Show/hide tabbable areas */
.tab-content > .tab-pane,
.pill-content > .pill-pane {
  display: none;
}
.tab-content > .active,
.pill-content > .active {
  display: block;
}


/* BOTTOM */
/* ------ */

.tabs-below > .nav-tabs {
  border-top: 1px solid #ddd;
}
.tabs-below > .nav-tabs > li {
  margin-top: -1px;
  margin-bottom: 0;
}
.tabs-below > .nav-tabs > li > a {
  #{mixins.border_radius('0 0 4px 4px')}
}
.tabs-below > .nav-tabs > li > a:hover {
    border-bottom-color: transparent;
    border-top-color: #ddd;
}

.tabs-below > .nav-tabs > .active > a,
.tabs-below > .nav-tabs > .active > a:hover {
  border-color: transparent #ddd #ddd #ddd;
}

/* LEFT & RIGHT */
/* ------------ */

/* Common styles */
.tabs-left > .nav-tabs > li,
.tabs-right > .nav-tabs > li {
  float: none;
}
.tabs-left > .nav-tabs > li > a,
.tabs-right > .nav-tabs > li > a {
  min-width: 74px;
  margin-right: 0;
  margin-bottom: 3px;
}

/* Tabs on the left */
.tabs-left > .nav-tabs {
  float: left;
  margin-right: 19px;
  border-right: 1px solid #ddd;
}
.tabs-left > .nav-tabs > li > a {
  margin-right: -1px;
  #{mixins.border_radius('4px 0 0 4px')}
}
.tabs-left > .nav-tabs > li > a:hover {
  border-color: #{vars.grayLighter()} #ddd #{vars.grayLighter()} #{vars.grayLighter()};
}
.tabs-left > .nav-tabs .active > a,
.tabs-left > .nav-tabs .active > a:hover {
  border-color: #ddd transparent #ddd #ddd;
  *border-right-color: #{vars.white()};
}

/* Tabs on the right */
.tabs-right > .nav-tabs {
  float: right;
  margin-left: 19px;
  border-left: 1px solid #ddd;
}
.tabs-right > .nav-tabs > li > a {
  margin-left: -1px;
  #{mixins.border_radius('0 4px 4px 0')}
}
.tabs-right > .nav-tabs > li > a:hover {
  border-color: #{vars.grayLighter()} #{vars.grayLighter()} #{vars.grayLighter()} #ddd;
}
.tabs-right > .nav-tabs .active > a,
.tabs-right > .nav-tabs .active > a:hover {
  border-color: #ddd #ddd #ddd transparent;
  *border-left-color: #{vars.white()};
}
");
};

//----------------------------------------------------------------------
// port of navbar.less
/* NAVBAR (FIXED AND STATIC) */
/* ------------------------- */


__js var CSSNavbar = exports.CSSNavbar = function(lookAndFeel) {
  var vars = lookAndFeel || defaultLookAndFeel;
  var mixins = Mixins(vars);

  // XXX cache
  return base.CSS("
/* COMMON STYLES */
/* ------------- */

.navbar {
  /* Fix for IE7's bad z-indexing so dropdowns don't appear below content that follows the navbar */
  *position: relative;
  *z-index: 2;

  overflow: visible;
  margin-bottom: #{vars.baseLineHeight()};
}

/* Gradient is applied to it's own element because overflow visible is not honored by IE when filter is present */
.navbar-inner {
  min-height: #{vars.navbarHeight()};
  padding-left:  20px;
  padding-right: 20px;
  #{mixins.gradient.vertical(vars.navbarBackgroundHighlight(), vars.navbarBackground()) }
  #{mixins.border_radius('4px')}
  #{mixins.box_shadow('0 1px 3px rgba(0,0,0,.25), inset 0 -1px 0 rgba(0,0,0,.1)')}
}

/* Set width to auto for default container */
/* We then reset it for fixed navbars in the #gridSystem mixin */
.navbar .container {
  width: auto;
}

/* Override the default collapsed state */
.nav-collapse.collapse {
  height: auto;
}


/* Brand, links, text, and buttons */
.navbar {
  color: #{vars.navbarText()};
  /* Hover and active states */
}
.navbar .brand:hover {
    text-decoration: none;
}
  /* Website or project name */
.navbar .brand {
    float: left;
    display: block;
    /* Vertically center the text given @navbarHeight */
    /* @elementHeight: 20px; */
    padding: #{add(scale(add(vars.navbarHeight(), '-20px'),1/2), -2)} 20px #{add(scale(add(vars.navbarHeight(), '-20px'),1/2), 2)};

    margin-left: -20px; /* negative indent to left-align the text down the page */
    font-size: 20px;
    font-weight: 200;
    line-height: 1;
    color: #{vars.navbarBrandColor()};
}
  /* Plain text in topbar */
.navbar .navbar-text {
    margin-bottom: 0;
    line-height: #{vars.navbarHeight()};
}
  /* Janky solution for now to account for links outside the .nav */
.navbar .navbar-link {
    color: #{vars.navbarLinkColor()};
}
.navbar .navbar-link:hover {
      color: #{vars.navbarLinkColorHover()};
}
  /* Buttons in navbar */
.navbar .btn,
.navbar .btn-group {
    #{mixins.navbarVerticalAlign('30px')} /* Vertically center in navbar */
}
 .navbar .btn-group .btn {
    margin: 0; /* then undo the margin here so we don't accidentally double it */
}

/* Navbar forms */
.navbar-form {
  margin-bottom: 0; /* remove default bottom margin */
}
#{mixins.clearfix('.navbar-form')}

.navbar-form input,
.navbar-form select,
.navbar-form .radio,
.navbar-form .checkbox {
    #{mixins.navbarVerticalAlign('30px')} /* Vertically center in navbar */
}
.navbar-form input,
.navbar-form select {
    display: inline-block;
    margin-bottom: 0;
}
.navbar-form input[type='image'],
.navbar-form input[type='checkbox'],
.navbar-form input[type='radio'] {
    margin-top: 3px;
}
.navbar-form .input-append,
.navbar-form .input-prepend {
    margin-top: 6px;
    white-space: nowrap; /* preven two  items from separating within a .navbar-form that has .pull-left */
}

.navbar-form .input-append input,
.navbar-form .input-prepend input {
      margin-top: 0; /* remove the margin on top since it's on the parent */
}

/* Navbar search */
.navbar-search {
  position: relative;
  float: left;
  #{mixins.navbarVerticalAlign('28px')} /* Vertically center in navbar */
  margin-bottom: 0;
}
.navbar-search .search-query {
    padding: 4px 9px;
    #{mixins.font.sans_serif('13px', 'normal', '1')}
    color: #{vars.white()};
    background-color: #{vars.navbarSearchBackground()};
    border: 1px solid #{vars.navbarSearchBorder()};
    #{mixins.box_shadow('inset 0 1px 2px rgba(0,0,0,.1), 0 1px 0 rgba(255,255,255,.15)')}
    #{mixins.transition('none')}
}
#{mixins.placeholder('.navbar-search .search-query', vars.navbarSearchPlaceholderColor())}

    /* Focus states (we use .focused since IE7-8 and down doesn't support :focus) */
.navbar-search .search-query:focus,
.navbar-search .search-query.focused {
      padding: 5px 10px;
      color: #{vars.grayDark()};
      text-shadow: 0 1px 0 #{vars.white()};
      background-color: #{vars.navbarSearchBackgroundFocus()};
      border: 0;
      #{mixins.box_shadow('0 0 3px rgba(0,0,0,.15)')}
      outline: 0;
}

/* FIXED NAVBAR */
/* ------------ */

/* Shared (top/bottom) styles */
.navbar-fixed-top,
.navbar-fixed-bottom {
  position: fixed;
  right: 0;
  left: 0;
  z-index: #{vars.zindexFixedNavbar()};
  margin-bottom: 0; /* remove 18px margin for static navbar */
}
.navbar-fixed-top .navbar-inner,
.navbar-fixed-bottom .navbar-inner {
  padding-left:  0;
  padding-right: 0;
  #{mixins.border_radius('0')}
}

.navbar-fixed-top .container,
.navbar-fixed-bottom .container {
  #{mixins.grid.coreSpan(vars.gridColumns())}
}

/* Fixed to top */
.navbar-fixed-top {
  top: 0;
}

/* Fixed to bottom */
.navbar-fixed-bottom {
  bottom: 0;
}



/* NAVIGATION */
/* ---------- */

.navbar .nav {
  position: relative;
  left: 0;
  display: block;
  float: left;
  margin: 0 10px 0 0;
}
.navbar .nav.pull-right {
  float: right; /* redeclare due to specificity */
}
.navbar .nav > li {
  display: block;
  float: left;
}

/* Links */
.navbar .nav > li > a {
  float: none;
  /* Vertically center the text given @navbarHeight */
  /* @elementHeight: 20px; */
    padding: #{add(scale(add(vars.navbarHeight(), '-20px'),1/2), -1)} 10px #{add(scale(add(vars.navbarHeight(), '-20px'),1/2), 1)};
  line-height: 19px;
  color: #{vars.navbarLinkColor()};
  text-decoration: none;
  text-shadow: 0 -1px 0 rgba(0,0,0,.25);
}
/* Buttons */
.navbar .btn {
  display: inline-block;
  padding: 4px 10px 4px;
  /* Vertically center the button given @navbarHeight */
  /* @elementHeight: 28px; */
  margin: #{add(scale(add(vars.navbarHeight(), '-28px'),1/2), -1)} 5px #{scale(add(vars.navbarHeight(), '-28px'),1/2)};
  line-height: #{vars.baseLineHeight()};
}
.navbar .btn-group {
  margin: 0;
  /* Vertically center the button given @navbarHeight */
  /* @elementHeight: 28px; */
  padding: #{add(scale(add(vars.navbarHeight(), '-28px'),1/2), -1)} 5px #{scale(add(vars.navbarHeight(), '-28px'),1/2)};
}
/* Hover */
.navbar .nav > li > a:hover {
  background-color: #{vars.navbarLinkBackgroundHover()}; /* 'transparent' is default to differentiate :hover from .active */
  color: #{vars.navbarLinkColorHover()};
  text-decoration: none;
}

/* Active nav items */
.navbar .nav .active > a,
.navbar .nav .active > a:hover {
  color: #{vars.navbarLinkColorActive()};
  text-decoration: none;
  background-color: #{vars.navbarLinkBackgroundActive()};
}

/* Dividers (basically a vertical hr) */
.navbar .divider-vertical {
  height: #{vars.navbarHeight()};
  width: 1px;
  margin: 0 9px;
  overflow: hidden;
  background-color: #{vars.navbarBackground()};
  border-right: 1px solid #{vars.navbarBackgroundHighlight()};
}

/* Secondary (floated right) nav in topbar */
.navbar .nav.pull-right {
  margin-left: 10px;
  margin-right: 0;
}

/* Navbar button for toggling navbar items in responsive layouts */
/* These definitions need to come after '.navbar .btn' */
.navbar .btn-navbar {
  display: none;
  float: right;
  padding: 7px 10px;
  margin-left: 5px;
  margin-right: 5px;
  #{mixins.box_shadow('inset 0 1px 0 rgba(255,255,255,.1), 0 1px 0 rgba(255,255,255,.075)')}
}
#{mixins.buttonBackground('.navbar .btn-navbar', vars.navbarBackgroundHighlight(), vars.navbarBackground())}

.navbar .btn-navbar .icon-bar {
  display: block;
  width: 18px;
  height: 2px;
  background-color: #f5f5f5;
  #{mixins.border_radius('1px')}
  #{mixins.box_shadow('0 1px 0 rgba(0,0,0,.25)')}
}
.btn-navbar .icon-bar + .icon-bar {
  margin-top: 3px;
}


/* Dropdown menus */
/* -------------- */

/* Menu position and menu carets */
.navbar .dropdown-menu:before {
    content: '';
    display: inline-block;
    border-left:   7px solid transparent;
    border-right:  7px solid transparent;
    border-bottom: 7px solid #ccc;
    border-bottom-color: #{vars.dropdownBorder()};
    position: absolute;
    top: -7px;
    left: 9px;
}
.navbar .dropdown-menu:after {
    content: '';
    display: inline-block;
    border-left:   6px solid transparent;
    border-right:  6px solid transparent;
    border-bottom: 6px solid #{vars.dropdownBackground()};
    position: absolute;
    top: -6px;
    left: 10px;
}

/* Menu position and menu caret support for dropups via extra dropup class */
.navbar-fixed-bottom .dropdown-menu:before {
    border-top: 7px solid #ccc;
    border-top-color: #{vars.dropdownBorder()};
    border-bottom: 0;
    bottom: -7px;
    top: auto;
}
.navbar-fixed-bottom .dropdown-menu:after {
    border-top: 6px solid #{vars.dropdownBackground()};
    border-bottom: 0;
    bottom: -6px;
    top: auto;
}

/* Dropdown toggle caret */
.navbar .nav li.dropdown .dropdown-toggle .caret,
.navbar .nav li.dropdown.open .caret {
  border-top-color: #{vars.white()};
  border-bottom-color: #{vars.white()};
}
.navbar .nav li.dropdown.active .caret {
  #{mixins.opacity(100)}
}

/* Remove background color from open dropdown */
.navbar .nav li.dropdown.open > .dropdown-toggle,
.navbar .nav li.dropdown.active > .dropdown-toggle,
.navbar .nav li.dropdown.open.active > .dropdown-toggle {
  background-color: transparent;
}

/* Dropdown link on hover */
.navbar .nav li.dropdown.active > .dropdown-toggle:hover {
  color: #{vars.white()};
}

/* Right aligned menus need alt position */
/* TODO: rejigger this at some point to simplify the selectors */
.navbar .pull-right .dropdown-menu,
.navbar .dropdown-menu.pull-right {
  left: auto;
  right: 0;
}
.navbar .pull-right .dropdown-menu:before,
.navbar .dropdown-menu.pull-right:before {
    left: auto;
    right: 12px;
  }
.navbar .pull-right .dropdown-menu:after, 
.navbar .dropdown-menu.pull-right:after {
    left: auto;
    right: 13px;
}

");
};

//----------------------------------------------------------------------
// port of breadcrumbs.less
// BREADCRUMBS
// -----------
__js var CSSBreadcrumbs = exports.CSSBreadcrumbs = function(lookAndFeel) {
  var vars = lookAndFeel || defaultLookAndFeel;
  var mixins = Mixins(vars);

  // XXX cache
  return base.CSS("
.breadcrumb {
  padding: 7px 14px;
  margin: 0 0 #{vars.baseLineHeight()};
  list-style: none;
  #{mixins.gradient.vertical(vars.white(), '#f5f5f5')}
  border: 1px solid #ddd;
  #{mixins.border_radius('3px')}
  #{mixins.box_shadow('inset 0 1px 0 '+vars.white())}
}
.breadcrumb li {
    display: inline-block;
    #{mixins.ie7_inline_block()}
    text-shadow: 0 1px 0 #{vars.white()};
}
.breadcrumb .divider {
    padding: 0 5px;
    color: #{vars.grayLight()};
}
.breadcrumb .active a {
    color: #{vars.grayDark()};
}
");
};

//----------------------------------------------------------------------
// port of modals.less
// MODALS
// ------
__js var CSSModals = exports.CSSModals = function(lookAndFeel) {
  var vars = lookAndFeel || defaultLookAndFeel;
  var mixins = Mixins(vars);

  // XXX cache
  return base.CSS("
/* Recalculate z-index where appropriate */
.modal-open .dropdown-menu {  z-index: #{vars.zindexDropdown() + vars.zindexModal()}; }
.modal-open .dropdown.open { *z-index: #{vars.zindexDropdown() + vars.zindexModal()}; }
.modal-open .popover       {  z-index: #{vars.zindexPopover()  + vars.zindexModal()}; }
.modal-open .tooltip       {  z-index: #{vars.zindexTooltip()  + vars.zindexModal()}; }


/* Background */
.modal-backdrop {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: #{vars.zindexModalBackdrop()};
  background-color: #{vars.black()};
}
  /* Fade for backdrop */
.modal-backdrop.fade { opacity: 0; }

.modal-backdrop,
.modal-backdrop.fade.in {
  #{mixins.opacity(80)}
}

/* Base modal */
.modal {
  position: fixed;
  top: 50%;
  left: 50%;
  z-index: #{vars.zindexModal()};
  overflow: auto;
  width: 560px;
  margin: -250px 0 0 -280px;
  background-color: #{vars.white()};
  border: 1px solid #999;
  border: 1px solid rgba(0,0,0,.3);
  *border: 1px solid #999; /* IE6-7 */
  #{mixins.border_radius('6px')}
  #{mixins.box_shadow('0 3px 7px rgba(0,0,0,0.3)')}
  #{mixins.background_clip('padding-box')}
}
.modal.fade {
    #{mixins.transition('opacity .3s linear, top .3s ease-out')}
    top: -25%;
  }
.modal.fade.in { top: 50%; }

.modal-header {
  padding: 9px 15px;
  border-bottom: 1px solid #eee;
}
  /* Close icon */
.modal-header .close { margin-top: 2px; }

/* Body (where all modal content resides) */
.modal-body {
  overflow-y: auto;
  max-height: 400px;
  padding: 15px;
}
/* Remove bottom margin if need be */
.modal-form {
  margin-bottom: 0;
}

/* Footer (for actions) */
.modal-footer {
  padding: 14px 15px 15px;
  margin-bottom: 0;
  text-align: right; /* right align buttons */
  background-color: #f5f5f5;
  border-top: 1px solid #ddd;
  #{mixins.border_radius('0 0 6px 6px')}
  #{mixins.box_shadow('inset 0 1px 0 '+vars.white())}
}
#{mixins.clearfix('.modal-footer')} /* clear it in case folks use .pull-* classes on buttons */

  /* Properly space out buttons */
.modal-footer .btn + .btn {
    margin-left: 5px;
    margin-bottom: 0; /* account for input[type='submit'] which gets the bottom margin like all other inputs */
}
  /* but override that for button groups */
.modal-footer .btn-group .btn + .btn {
    margin-left: -1px;
}
");
};

//----------------------------------------------------------------------
// port of Font Awesome's font-awesome.css v3.0.2 (in lieu of Bootstrap's
// sprites.less)

__js var CSSFontAwesome = exports.CSSFontAwesome = function(lookAndFeel) {
  var vars = lookAndFeel || defaultLookAndFeel;
  var mixins = Mixins(vars);

  var fontPath = require('builtin:apollo-sys').resolve(vars.fontAwesomePath()).path;

  // XXX cache
  return base.CSS("
@font-face {
  font-family: 'FontAwesome';
  src: url('#{fontPath}fontawesome-webfont.eot?v=3.0.1');
  src: url('#{fontPath}fontawesome-webfont.eot?#iefix&v=3.0.1') format('embedded-opentype'),
    url('#{fontPath}fontawesome-webfont.woff?v=3.0.1') format('woff'),
    url('#{fontPath}fontawesome-webfont.ttf?v=3.0.1') format('truetype');
  font-weight: normal;
  font-style: normal;
}

/*  Font Awesome styles
    ------------------------------------------------------- */
[class^='icon-'],
[class*=' icon-'] {
  font-family: FontAwesome;
  font-weight: normal;
  font-style: normal;
  text-decoration: inherit;
  -webkit-font-smoothing: antialiased;

  /* sprites.less reset */
  display: inline;
  width: auto;
  height: auto;
  line-height: normal;
  vertical-align: baseline;
  background-image: none;
  background-position: 0% 0%;
  background-repeat: repeat;
  margin-top: 0;
}
/* more sprites.less reset */
.icon-white,
.nav-pills > .active > a > [class^='icon-'],
.nav-pills > .active > a > [class*=' icon-'],
.nav-list > .active > a > [class^='icon-'],
.nav-list > .active > a > [class*=' icon-'],
.navbar-inverse .nav > .active > a > [class^='icon-'],
.navbar-inverse .nav > .active > a > [class*=' icon-'],
.dropdown-menu > li > a:hover > [class^='icon-'],
.dropdown-menu > li > a:hover > [class*=' icon-'],
.dropdown-menu > .active > a > [class^='icon-'],
.dropdown-menu > .active > a > [class*=' icon-'],
.dropdown-submenu:hover > a > [class^='icon-'],
.dropdown-submenu:hover > a > [class*=' icon-'] {
  background-image: none;
}
[class^='icon-']:before,
[class*=' icon-']:before {
  text-decoration: inherit;
  display: inline-block;
  speak: none;
}
/* makes sure icons active on rollover in links */
a [class^='icon-'],
a [class*=' icon-'] {
  display: inline-block;
}
/* makes the font 33% larger relative to the icon container */
.icon-large:before {
  vertical-align: -10%;
  font-size: 1.3333333333333333em;
}
.btn [class^='icon-'],
.nav [class^='icon-'],
.btn [class*=' icon-'],
.nav [class*=' icon-'] {
  display: inline;
  /* keeps button heights with and without icons the same */
}
.btn [class^='icon-'].icon-large,
.nav [class^='icon-'].icon-large,
.btn [class*=' icon-'].icon-large,
.nav [class*=' icon-'].icon-large {
  line-height: .9em;
}
.btn [class^='icon-'].icon-spin,
.nav [class^='icon-'].icon-spin,
.btn [class*=' icon-'].icon-spin,
.nav [class*=' icon-'].icon-spin {
  display: inline-block;
}
.nav-tabs [class^='icon-'],
.nav-pills [class^='icon-'],
.nav-tabs [class*=' icon-'],
.nav-pills [class*=' icon-'] {
  /* keeps button heights with and without icons the same */

}
.nav-tabs [class^='icon-'],
.nav-pills [class^='icon-'],
.nav-tabs [class*=' icon-'],
.nav-pills [class*=' icon-'],
.nav-tabs [class^='icon-'].icon-large,
.nav-pills [class^='icon-'].icon-large,
.nav-tabs [class*=' icon-'].icon-large,
.nav-pills [class*=' icon-'].icon-large {
  line-height: .9em;
}
li [class^='icon-'],
.nav li [class^='icon-'],
li [class*=' icon-'],
.nav li [class*=' icon-'] {
  display: inline-block;
  width: 1.25em;
  text-align: center;
}
li [class^='icon-'].icon-large,
.nav li [class^='icon-'].icon-large,
li [class*=' icon-'].icon-large,
.nav li [class*=' icon-'].icon-large {
  /* increased font size for icon-large */

  width: 1.5625em;
}
ul.icons {
  list-style-type: none;
  text-indent: -0.75em;
}
ul.icons li [class^='icon-'],
ul.icons li [class*=' icon-'] {
  width: .75em;
}
.icon-muted {
  color: #eeeeee;
}
.icon-border {
  border: solid 1px #eeeeee;
  padding: .2em .25em .15em;
  -webkit-border-radius: 3px;
  -moz-border-radius: 3px;
  border-radius: 3px;
}
.icon-2x {
  font-size: 2em;
}
.icon-2x.icon-border {
  border-width: 2px;
  -webkit-border-radius: 4px;
  -moz-border-radius: 4px;
  border-radius: 4px;
}
.icon-3x {
  font-size: 3em;
}
.icon-3x.icon-border {
  border-width: 3px;
  -webkit-border-radius: 5px;
  -moz-border-radius: 5px;
  border-radius: 5px;
}
.icon-4x {
  font-size: 4em;
}
.icon-4x.icon-border {
  border-width: 4px;
  -webkit-border-radius: 6px;
  -moz-border-radius: 6px;
  border-radius: 6px;
}
.pull-right {
  float: right;
}
.pull-left {
  float: left;
}
[class^='icon-'].pull-left,
[class*=' icon-'].pull-left {
  margin-right: .3em;
}
[class^='icon-'].pull-right,
[class*=' icon-'].pull-right {
  margin-left: .3em;
}
.btn [class^='icon-'].pull-left.icon-2x,
.btn [class*=' icon-'].pull-left.icon-2x,
.btn [class^='icon-'].pull-right.icon-2x,
.btn [class*=' icon-'].pull-right.icon-2x {
  margin-top: .18em;
}
.btn [class^='icon-'].icon-spin.icon-large,
.btn [class*=' icon-'].icon-spin.icon-large {
  line-height: .8em;
}
.btn.btn-small [class^='icon-'].pull-left.icon-2x,
.btn.btn-small [class*=' icon-'].pull-left.icon-2x,
.btn.btn-small [class^='icon-'].pull-right.icon-2x,
.btn.btn-small [class*=' icon-'].pull-right.icon-2x {
  margin-top: .25em;
}
.btn.btn-large [class^='icon-'],
.btn.btn-large [class*=' icon-'] {
  margin-top: 0;
}
.btn.btn-large [class^='icon-'].pull-left.icon-2x,
.btn.btn-large [class*=' icon-'].pull-left.icon-2x,
.btn.btn-large [class^='icon-'].pull-right.icon-2x,
.btn.btn-large [class*=' icon-'].pull-right.icon-2x {
  margin-top: .05em;
}
.btn.btn-large [class^='icon-'].pull-left.icon-2x,
.btn.btn-large [class*=' icon-'].pull-left.icon-2x {
  margin-right: .2em;
}
.btn.btn-large [class^='icon-'].pull-right.icon-2x,
.btn.btn-large [class*=' icon-'].pull-right.icon-2x {
  margin-left: .2em;
}
.icon-spin {
  display: inline-block;
  -moz-animation: spin 2s infinite linear;
  -o-animation: spin 2s infinite linear;
  -webkit-animation: spin 2s infinite linear;
  animation: spin 2s infinite linear;
}
@-moz-keyframes spin {
  0% { -moz-transform: rotate(0deg); }
  100% { -moz-transform: rotate(359deg); }
}
@-webkit-keyframes spin {
  0% { -webkit-transform: rotate(0deg); }
  100% { -webkit-transform: rotate(359deg); }
}
@-o-keyframes spin {
  0% { -o-transform: rotate(0deg); }
  100% { -o-transform: rotate(359deg); }
}
@-ms-keyframes spin {
  0% { -ms-transform: rotate(0deg); }
  100% { -ms-transform: rotate(359deg); }
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(359deg); }
}
@-moz-document url-prefix() {
  .icon-spin {
    height: .9em;
  }
  .btn .icon-spin {
    height: auto;
  }
  .icon-spin.icon-large {
    height: 1.25em;
  }
  .btn .icon-spin.icon-large {
    height: .75em;
  }
}
/*  Font Awesome uses the Unicode Private Use Area (PUA) to ensure screen
    readers do not read off random characters that represent icons */
.icon-glass:before                { content: '\\f000'; }
.icon-music:before                { content: '\\f001'; }
.icon-search:before               { content: '\\f002'; }
.icon-envelope:before             { content: '\\f003'; }
.icon-heart:before                { content: '\\f004'; }
.icon-star:before                 { content: '\\f005'; }
.icon-star-empty:before           { content: '\\f006'; }
.icon-user:before                 { content: '\\f007'; }
.icon-film:before                 { content: '\\f008'; }
.icon-th-large:before             { content: '\\f009'; }
.icon-th:before                   { content: '\\f00a'; }
.icon-th-list:before              { content: '\\f00b'; }
.icon-ok:before                   { content: '\\f00c'; }
.icon-remove:before               { content: '\\f00d'; }
.icon-zoom-in:before              { content: '\\f00e'; }

.icon-zoom-out:before             { content: '\\f010'; }
.icon-off:before                  { content: '\\f011'; }
.icon-signal:before               { content: '\\f012'; }
.icon-cog:before                  { content: '\\f013'; }
.icon-trash:before                { content: '\\f014'; }
.icon-home:before                 { content: '\\f015'; }
.icon-file:before                 { content: '\\f016'; }
.icon-time:before                 { content: '\\f017'; }
.icon-road:before                 { content: '\\f018'; }
.icon-download-alt:before         { content: '\\f019'; }
.icon-download:before             { content: '\\f01a'; }
.icon-upload:before               { content: '\\f01b'; }
.icon-inbox:before                { content: '\\f01c'; }
.icon-play-circle:before          { content: '\\f01d'; }
.icon-repeat:before               { content: '\\f01e'; }

/* \\f020 doesn't work in Safari. all shifted one down */
.icon-refresh:before              { content: '\\f021'; }
.icon-list-alt:before             { content: '\\f022'; }
.icon-lock:before                 { content: '\\f023'; }
.icon-flag:before                 { content: '\\f024'; }
.icon-headphones:before           { content: '\\f025'; }
.icon-volume-off:before           { content: '\\f026'; }
.icon-volume-down:before          { content: '\\f027'; }
.icon-volume-up:before            { content: '\\f028'; }
.icon-qrcode:before               { content: '\\f029'; }
.icon-barcode:before              { content: '\\f02a'; }
.icon-tag:before                  { content: '\\f02b'; }
.icon-tags:before                 { content: '\\f02c'; }
.icon-book:before                 { content: '\\f02d'; }
.icon-bookmark:before             { content: '\\f02e'; }
.icon-print:before                { content: '\\f02f'; }

.icon-camera:before               { content: '\\f030'; }
.icon-font:before                 { content: '\\f031'; }
.icon-bold:before                 { content: '\\f032'; }
.icon-italic:before               { content: '\\f033'; }
.icon-text-height:before          { content: '\\f034'; }
.icon-text-width:before           { content: '\\f035'; }
.icon-align-left:before           { content: '\\f036'; }
.icon-align-center:before         { content: '\\f037'; }
.icon-align-right:before          { content: '\\f038'; }
.icon-align-justify:before        { content: '\\f039'; }
.icon-list:before                 { content: '\\f03a'; }
.icon-indent-left:before          { content: '\\f03b'; }
.icon-indent-right:before         { content: '\\f03c'; }
.icon-facetime-video:before       { content: '\\f03d'; }
.icon-picture:before              { content: '\\f03e'; }

.icon-pencil:before               { content: '\\f040'; }
.icon-map-marker:before           { content: '\\f041'; }
.icon-adjust:before               { content: '\\f042'; }
.icon-tint:before                 { content: '\\f043'; }
.icon-edit:before                 { content: '\\f044'; }
.icon-share:before                { content: '\\f045'; }
.icon-check:before                { content: '\\f046'; }
.icon-move:before                 { content: '\\f047'; }
.icon-step-backward:before        { content: '\\f048'; }
.icon-fast-backward:before        { content: '\\f049'; }
.icon-backward:before             { content: '\\f04a'; }
.icon-play:before                 { content: '\\f04b'; }
.icon-pause:before                { content: '\\f04c'; }
.icon-stop:before                 { content: '\\f04d'; }
.icon-forward:before              { content: '\\f04e'; }

.icon-fast-forward:before         { content: '\\f050'; }
.icon-step-forward:before         { content: '\\f051'; }
.icon-eject:before                { content: '\\f052'; }
.icon-chevron-left:before         { content: '\\f053'; }
.icon-chevron-right:before        { content: '\\f054'; }
.icon-plus-sign:before            { content: '\\f055'; }
.icon-minus-sign:before           { content: '\\f056'; }
.icon-remove-sign:before          { content: '\\f057'; }
.icon-ok-sign:before              { content: '\\f058'; }
.icon-question-sign:before        { content: '\\f059'; }
.icon-info-sign:before            { content: '\\f05a'; }
.icon-screenshot:before           { content: '\\f05b'; }
.icon-remove-circle:before        { content: '\\f05c'; }
.icon-ok-circle:before            { content: '\\f05d'; }
.icon-ban-circle:before           { content: '\\f05e'; }

.icon-arrow-left:before           { content: '\\f060'; }
.icon-arrow-right:before          { content: '\\f061'; }
.icon-arrow-up:before             { content: '\\f062'; }
.icon-arrow-down:before           { content: '\\f063'; }
.icon-share-alt:before            { content: '\\f064'; }
.icon-resize-full:before          { content: '\\f065'; }
.icon-resize-small:before         { content: '\\f066'; }
.icon-plus:before                 { content: '\\f067'; }
.icon-minus:before                { content: '\\f068'; }
.icon-asterisk:before             { content: '\\f069'; }
.icon-exclamation-sign:before     { content: '\\f06a'; }
.icon-gift:before                 { content: '\\f06b'; }
.icon-leaf:before                 { content: '\\f06c'; }
.icon-fire:before                 { content: '\\f06d'; }
.icon-eye-open:before             { content: '\\f06e'; }

.icon-eye-close:before            { content: '\\f070'; }
.icon-warning-sign:before         { content: '\\f071'; }
.icon-plane:before                { content: '\\f072'; }
.icon-calendar:before             { content: '\\f073'; }
.icon-random:before               { content: '\\f074'; }
.icon-comment:before              { content: '\\f075'; }
.icon-magnet:before               { content: '\\f076'; }
.icon-chevron-up:before           { content: '\\f077'; }
.icon-chevron-down:before         { content: '\\f078'; }
.icon-retweet:before              { content: '\\f079'; }
.icon-shopping-cart:before        { content: '\\f07a'; }
.icon-folder-close:before         { content: '\\f07b'; }
.icon-folder-open:before          { content: '\\f07c'; }
.icon-resize-vertical:before      { content: '\\f07d'; }
.icon-resize-horizontal:before    { content: '\\f07e'; }

.icon-bar-chart:before            { content: '\\f080'; }
.icon-twitter-sign:before         { content: '\\f081'; }
.icon-facebook-sign:before        { content: '\\f082'; }
.icon-camera-retro:before         { content: '\\f083'; }
.icon-key:before                  { content: '\\f084'; }
.icon-cogs:before                 { content: '\\f085'; }
.icon-comments:before             { content: '\\f086'; }
.icon-thumbs-up:before            { content: '\\f087'; }
.icon-thumbs-down:before          { content: '\\f088'; }
.icon-star-half:before            { content: '\\f089'; }
.icon-heart-empty:before          { content: '\\f08a'; }
.icon-signout:before              { content: '\\f08b'; }
.icon-linkedin-sign:before        { content: '\\f08c'; }
.icon-pushpin:before              { content: '\\f08d'; }
.icon-external-link:before        { content: '\\f08e'; }

.icon-signin:before               { content: '\\f090'; }
.icon-trophy:before               { content: '\\f091'; }
.icon-github-sign:before          { content: '\\f092'; }
.icon-upload-alt:before           { content: '\\f093'; }
.icon-lemon:before                { content: '\\f094'; }
.icon-phone:before                { content: '\\f095'; }
.icon-check-empty:before          { content: '\\f096'; }
.icon-bookmark-empty:before       { content: '\\f097'; }
.icon-phone-sign:before           { content: '\\f098'; }
.icon-twitter:before              { content: '\\f099'; }
.icon-facebook:before             { content: '\\f09a'; }
.icon-github:before               { content: '\\f09b'; }
.icon-unlock:before               { content: '\\f09c'; }
.icon-credit-card:before          { content: '\\f09d'; }
.icon-rss:before                  { content: '\\f09e'; }

.icon-hdd:before                  { content: '\\f0a0'; }
.icon-bullhorn:before             { content: '\\f0a1'; }
.icon-bell:before                 { content: '\\f0a2'; }
.icon-certificate:before          { content: '\\f0a3'; }
.icon-hand-right:before           { content: '\\f0a4'; }
.icon-hand-left:before            { content: '\\f0a5'; }
.icon-hand-up:before              { content: '\\f0a6'; }
.icon-hand-down:before            { content: '\\f0a7'; }
.icon-circle-arrow-left:before    { content: '\\f0a8'; }
.icon-circle-arrow-right:before   { content: '\\f0a9'; }
.icon-circle-arrow-up:before      { content: '\\f0aa'; }
.icon-circle-arrow-down:before    { content: '\\f0ab'; }
.icon-globe:before                { content: '\\f0ac'; }
.icon-wrench:before               { content: '\\f0ad'; }
.icon-tasks:before                { content: '\\f0ae'; }

.icon-filter:before               { content: '\\f0b0'; }
.icon-briefcase:before            { content: '\\f0b1'; }
.icon-fullscreen:before           { content: '\\f0b2'; }

.icon-group:before                { content: '\\f0c0'; }
.icon-link:before                 { content: '\\f0c1'; }
.icon-cloud:before                { content: '\\f0c2'; }
.icon-beaker:before               { content: '\\f0c3'; }
.icon-cut:before                  { content: '\\f0c4'; }
.icon-copy:before                 { content: '\\f0c5'; }
.icon-paper-clip:before           { content: '\\f0c6'; }
.icon-save:before                 { content: '\\f0c7'; }
.icon-sign-blank:before           { content: '\\f0c8'; }
.icon-reorder:before              { content: '\\f0c9'; }
.icon-list-ul:before              { content: '\\f0ca'; }
.icon-list-ol:before              { content: '\\f0cb'; }
.icon-strikethrough:before        { content: '\\f0cc'; }
.icon-underline:before            { content: '\\f0cd'; }
.icon-table:before                { content: '\\f0ce'; }

.icon-magic:before                { content: '\\f0d0'; }
.icon-truck:before                { content: '\\f0d1'; }
.icon-pinterest:before            { content: '\\f0d2'; }
.icon-pinterest-sign:before       { content: '\\f0d3'; }
.icon-google-plus-sign:before     { content: '\\f0d4'; }
.icon-google-plus:before          { content: '\\f0d5'; }
.icon-money:before                { content: '\\f0d6'; }
.icon-caret-down:before           { content: '\\f0d7'; }
.icon-caret-up:before             { content: '\\f0d8'; }
.icon-caret-left:before           { content: '\\f0d9'; }
.icon-caret-right:before          { content: '\\f0da'; }
.icon-columns:before              { content: '\\f0db'; }
.icon-sort:before                 { content: '\\f0dc'; }
.icon-sort-down:before            { content: '\\f0dd'; }
.icon-sort-up:before              { content: '\\f0de'; }

.icon-envelope-alt:before         { content: '\\f0e0'; }
.icon-linkedin:before             { content: '\\f0e1'; }
.icon-undo:before                 { content: '\\f0e2'; }
.icon-legal:before                { content: '\\f0e3'; }
.icon-dashboard:before            { content: '\\f0e4'; }
.icon-comment-alt:before          { content: '\\f0e5'; }
.icon-comments-alt:before         { content: '\\f0e6'; }
.icon-bolt:before                 { content: '\\f0e7'; }
.icon-sitemap:before              { content: '\\f0e8'; }
.icon-umbrella:before             { content: '\\f0e9'; }
.icon-paste:before                { content: '\\f0ea'; }
.icon-lightbulb:before            { content: '\\f0eb'; }
.icon-exchange:before             { content: '\\f0ec'; }
.icon-cloud-download:before       { content: '\\f0ed'; }
.icon-cloud-upload:before         { content: '\\f0ee'; }

.icon-user-md:before              { content: '\\f0f0'; }
.icon-stethoscope:before          { content: '\\f0f1'; }
.icon-suitcase:before             { content: '\\f0f2'; }
.icon-bell-alt:before             { content: '\\f0f3'; }
.icon-coffee:before               { content: '\\f0f4'; }
.icon-food:before                 { content: '\\f0f5'; }
.icon-file-alt:before             { content: '\\f0f6'; }
.icon-building:before             { content: '\\f0f7'; }
.icon-hospital:before             { content: '\\f0f8'; }
.icon-ambulance:before            { content: '\\f0f9'; }
.icon-medkit:before               { content: '\\f0fa'; }
.icon-fighter-jet:before          { content: '\\f0fb'; }
.icon-beer:before                 { content: '\\f0fc'; }
.icon-h-sign:before               { content: '\\f0fd'; }
.icon-plus-sign-alt:before        { content: '\\f0fe'; }

.icon-double-angle-left:before    { content: '\\f100'; }
.icon-double-angle-right:before   { content: '\\f101'; }
.icon-double-angle-up:before      { content: '\\f102'; }
.icon-double-angle-down:before    { content: '\\f103'; }
.icon-angle-left:before           { content: '\\f104'; }
.icon-angle-right:before          { content: '\\f105'; }
.icon-angle-up:before             { content: '\\f106'; }
.icon-angle-down:before           { content: '\\f107'; }
.icon-desktop:before              { content: '\\f108'; }
.icon-laptop:before               { content: '\\f109'; }
.icon-tablet:before               { content: '\\f10a'; }
.icon-mobile-phone:before         { content: '\\f10b'; }
.icon-circle-blank:before         { content: '\\f10c'; }
.icon-quote-left:before           { content: '\\f10d'; }
.icon-quote-right:before          { content: '\\f10e'; }

.icon-spinner:before              { content: '\\f110'; }
.icon-circle:before               { content: '\\f111'; }
.icon-reply:before                { content: '\\f112'; }
.icon-github-alt:before           { content: '\\f113'; }
.icon-folder-close-alt:before     { content: '\\f114'; }
.icon-folder-open-alt:before      { content: '\\f115'; }

");
};

//----------------------------------------------------------------------
// port of close.less
// CLOSE ICONS
// -----------

__js var CSSClose = exports.CSSClose = function(lookAndFeel) {
  var vars = lookAndFeel || defaultLookAndFeel;
  var mixins = Mixins(vars);

  // XXX cache
  return base.CSS("
.close {
  float: right;
  font-size: 20px;
  font-weight: bold;
  line-height: #{vars.baseLineHeight()};
  color: #{vars.black()};
  text-shadow: 0 1px 0 rgba(255,255,255,1);
  #{mixins.opacity(20)}
}
.close:hover {
    color: #{vars.black()};
    text-decoration: none;
    cursor: pointer;
    #{mixins.opacity(40)}
}

/* Additional properties for button version */
/* iOS requires the button element instead of an anchor tag. */
/* If you want the anchor version, it requires `href='#'`. */
button.close {
  padding: 0;
  cursor: pointer;
  background: transparent;
  border: 0;
  -webkit-appearance: none;
}
");
};


//----------------------------------------------------------------------
// Mechanisms (inspired by the bootstrap plugins)

var dom = require('../xbrowser/dom');
var events = require('../events');

// dom module backfill:

function domFindData(name, value, from, to) {
// no 'dataset' property on IE9!
//  traverseDOM(from, to) { |c| if (value.indexOf(c.dataset[name]) != -1) return c }
  dom.traverseDOM(from, to) { |c| if (c.getAttribute && (value.indexOf(c.getAttribute("data-#{name}")) != -1)) return c }
  return null;
}

var mechanism = exports.mechanism = {};


mechanism.dropdowns = function() {
  var ignore = false;
  using (var Q = events.Queue(events.HostEmitter(this.dompeer, 'click', function (e){
    if ((e.node = domFindData('toggle', 'dropdown', e.target, this.dompeer))) {
      dom.stopEvent(e);
      if (ignore) { // see explanation below
        ignore = false;
        return false;
      }          
      return true;
    }
    else
      return false;
  }))) {
    while (1) {
      var ev = Q.get();
      var current = ev.node;
      current.parentNode.classList.add('open');
      try {
        ev = events.wait(window, '!click');
        if (domFindData('toggle', 'dropdown', ev.target, this.dompeer) == current) {
          // we could stop the event here, to prevent the dropdown from reappearing, 
          // but that is bad form: there might be other capturing listenern that 
          // clear some state, so we should *never* stop events during the capturing
          // phase
          // dom.stopEvent(ev);
          // Instead we set a flag that ignores the next event:
          ignore = true;
        }
      }
      finally {
        current.parentNode.classList.remove('open');
      }
    }
  }
};

mechanism.tabs = function() {
  using (var Q = events.Queue(events.HostEmitter(this.dompeer, 'click', function(e) {
    if (domFindData('toggle', ['tab','pill'], e.target, this.dompeer)) {
      dom.stopEvent(e);
      return true;
    }
    else
      return false;
  }))) {
    while (1) {
      var ev = Q.get();
      // ev.target is the <a> we want to activate
      var newTab = dom.findNode('li', ev.target);
      if (newTab.classList.contains('active')) continue;
      var tabContainer = dom.findNode('ul:not(.dropdown-menu)', ev.target);
      // deactivate current tab...
      var currentTab = tabContainer.querySelector('li.active');
      currentTab.classList.remove('active');
      // ... and activate  the new one
      newTab.classList.add('active');
      
      // special case for dropdowns within tabs:
      var olddropdown = currentTab.querySelector('.dropdown-menu > .active');
      if (olddropdown) 
        olddropdown.classList.remove('active');
      if (newTab.parentNode.classList.contains('dropdown-menu'))
        dom.findNode('li.dropdown', newTab).classList.add('active');
      
      // now switch to new content:
      var newContent = tabContainer.parentNode.querySelector(ev.target.getAttribute('data-target') || ev.target.getAttribute('href'));
      
      var oldContent = newContent.parentNode.querySelector('.active');
      oldContent.classList.remove('active');
      newContent.classList.add('active');
    }
  }
};

mechanism.collapsing = function() {
  using (var Q = events.Queue(events.HostEmitter(this.dompeer, 'click', function(e) {
    if (e.node = domFindData('toggle', 'collapse', e.target, this.dompeer)) {
      dom.stopEvent(e);
      return true;
    }
    else
      return false;
  }))) {
    while (1) {
      var ev = Q.get();
      var targetSelector = ev.node.getAttribute('data-target');
      var container = ev.node.parentNode;
      var target = container.querySelector(targetSelector);
      var forceUpdate = target.offsetHeight;
      //        if (!target.classList.contains('collapse'))
      //          target.classList.add('collapse');
      if (target.classList.contains('in')) {
        target.classList.remove('in');
        target.style.height = null;
      }
      else {
        target.classList.add('in');
        target.style.height = 'auto';
      }
    }
  }
};

mechanism.alert = function() {
  using (var Q = events.Queue(events.HostEmitter(this.dompeer, 'click', function(e) {
    if (e.node = domFindData('dismiss', 'alert', e.target, this.dompeer)) {
      dom.stopEvent(e);
      return true;
    }
    else 
      return false;
  }))) {
    while (1) {
      var ev = Q.get();
      var target = dom.findNode('.alert', ev.node);
      //target.classList.remove('in');
      target.parentNode.removeChild(target);
    }
  }
};

mechanism.modal = function() {
  // XXX should really only run one instance in each tree of ui components
  // XXX or maybe get rid of it altogether
  while (1) {
    var ev = events.wait(this.dompeer, 'click', function(e) {
      if (e.node = domFindData('toggle', 'modal', e.target, this.dompeer)) {
        dom.stopEvent(e);
        return true;
      }
      else
        return false;
    });
    var modal = ev.node.parentNode.querySelector(ev.node.getAttribute('href'));
    try {
      var backdrop = document.createElement('div');
      backdrop.classList.add('modal-backdrop');
      this.dompeer.classList.add('modal-open');
      this.dompeer.appendChild(backdrop);
      modal.style.display = 'block';
      modal.classList.add('in');
      waitfor {
        events.wait(document, 'keyup', e -> e.which == 27);
      }
      or {
        events.wait(backdrop, 'click');
      }
      or {
        events.wait(modal, 'click', e -> domFindData('dismiss', 'modal', e.target, modal));
      }
    }
    finally {
      modal.style.display = '';
      modal.classList.remove('in');
      backdrop.parentNode.removeChild(backdrop);
      this.dompeer.classList.remove('modal-open');
    }
  }
};

//----------------------------------------------------------------------

console.log("bootstrap.sjs loading: #{(new Date())-tt}");
