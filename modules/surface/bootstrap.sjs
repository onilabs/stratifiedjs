/*
 * Oni Apollo 'surface/bootstrap' module
 * Lightweight cross-browser UI toolkit - Twitter Bootstrap Components
 *
 * Part of the Oni Apollo Standard Module Library
 * Version: 'unstable'
 * http://onilabs.com/apollo
 *
 * (c) 2012 Oni Labs, http://onilabs.com
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
   @home    apollo:surface/base
   @hostenv xbrowser
   @desc
      * Port of [Twitter Bootstrap](http://twitter.github.com/bootstrap/)
      * Work-in-progress
      
     
*/

var surface = require('./base');
var coll = require('../collection');
var tt = new Date();
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
    rgba = coll.map(matches[1].match(/.{2}/g), function(c){ return parseInt(c,16) });
    rgba.push(1);
  }
  else if (matches[2]) {
    // 3 digit hex string
    rgba = coll.map(matches[2].split(''),function(c){ return parseInt(c+c,16) });
    rgba.push(1);
  }
  else if (matches[3]) {
    // rgb(.)
    rgba = coll.map(matches[3].split(","),function(n){ return n.indexOf("%") > -1 ? parseFloat(n)*2.55 : parseFloat(n) });
    rgba.push(1);
    if (rgba.length != 4) throw new Error("invalid css color "+css_color);
  }
  else if (matches[4]) {
    // rgba(.)
    rgba = coll.map(matches[4].split(","),function(n){ return n.indexOf("%") > -1 ? parseFloat(n)*2.55 : parseFloat(n) });
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
    return "rgba(#{ coll.map(rgba,function(c){return Math.round(c) }).join(',') })";
  }
  else {
    rgba.pop();
    return "##{ coll.map(rgba,hexByte).join('') }";
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
  // we'll round to 2 decimals
  val[0] = Math.round(val[0]*100)/100;
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

__js var defaultLookAndFeel = exports.defaultLookAndFeel = {

  // GLOBAL VALUES
  // --------------------------------------------------

  // Grays
  // -------------------------
  black()               { '#000' },
  grayDarker()          { '#222' },
  grayDark()            { '#333' },
  gray()                { '#555' },
  grayLight()           { '#999' },
  grayLighter()         { '#eee' },
  white()               { '#fff' },


  // Accent colors
  // -------------------------
  blue()                { '#049cdb' },
  blueDark()            { '#0064cd' },
  green()               { '#46a546' },
  red()                 { '#9d261d' },
  yellow()              { '#ffc40d' },
  orange()              { '#f89406' },
  pink()                { '#c3325f' },
  purple()              { '#7a43b6' },


  // Scaffolding
  // -------------------------
  bodyBackground()      { this.white() },
  textColor()           { this.grayDark() },


  // Links
  // -------------------------
  linkColor()           { '#08c' },
  linkColorHover()      { darken(this.linkColor(), 0.15) },


  // Typography
  // -------------------------
  sansFontFamily()      { '"Helvetica Neue", Helvetica, Arial, sans-serif' },
  serifFontFamily()     { 'Georgia, "Times New Roman", Times, serif' },
  monoFontFamily()      { 'Menlo, Monaco, Consolas, "Courier New", monospace' },

  baseFontSize()        { '13px' },
  baseFontFamily()      { this.sansFontFamily() },
  baseLineHeight()      { '18px' },
  altFontFamily()       { this.serifFontFamily() },

  headingsFontFamily()  { 'inherit' }, // empty to use BS default, @baseFontFamily
  headingsFontWeight()  { 'bold' },    // instead of browser default, bold
  headingsColor()       { 'inherit' }, // empty to use BS default, @textColor


  // Tables
  // -------------------------
  tableBackground()                 { 'transparent' }, // overall background-color
  tableBackgroundAccent()           { '#f9f9f9' }, // for striping
  tableBackgroundHover()            { '#f5f5f5' }, // for hover
  tableBorder()                     { '#ddd' }, // table and cell border


  // Buttons
  // -------------------------
  btnBackground()                     { this.white() },
  btnBackgroundHighlight()            { darken(this.white(), 0.1) },
  btnBorder()                         { '#ccc' },
  
  btnPrimaryBackground()              { this.linkColor() },
  btnPrimaryBackgroundHighlight()     { spin(this.btnPrimaryBackground(), 15) },
  
  btnInfoBackground()                 { '#5bc0de' },
  btnInfoBackgroundHighlight()        { '#2f96b4' },
  
  btnSuccessBackground()              { '#62c462' },
  btnSuccessBackgroundHighlight()     { '#51a351' },
  
  btnWarningBackground()              { lighten(this.orange(), 0.15) },
  btnWarningBackgroundHighlight()     { this.orange() },
  
  btnDangerBackground()               { '#ee5f5b' },
  btnDangerBackgroundHighlight()      { '#bd362f' },
  
  btnInverseBackground()              { this.gray() },
  btnInverseBackgroundHighlight()     { this.grayDarker() },


  // Forms
  // -------------------------
  inputBackground()               { this.white() },
  inputBorder()                   { '#ccc' },
  inputBorderRadius()             { '3px' },
  inputDisabledBackground()       { this.grayLighter() },
  formActionsBackground()         { '#f5f5f5' },

  // Dropdowns
  // -------------------------
  dropdownBackground()            { this.white() },
  dropdownBorder()                { 'rgba(0,0,0,.2)' },
  dropdownLinkColor()             { this.grayDark() },
  dropdownLinkColorHover()        { this.white() },
  dropdownLinkBackgroundHover()   { this.linkColor() },
  dropdownDividerTop()            { '#e5e5e5' },
  dropdownDividerBottom()         { this.white() },

  // COMPONENT VARIABLES
  // --------------------------------------------------

  // Z-index master list
  // -------------------------
  // Used for a bird's eye view of components dependent on the z-axis
  // Try to avoid customizing these :)
  zindexDropdown()          { '1000' },
  zindexPopover()           { '1010' },
  zindexTooltip()           { '1020' },
  zindexFixedNavbar()       { '1030' },
  zindexModalBackdrop()     { '1040' },
  zindexModal()             { '1050' },

  // Sprite icons path
  // -------------------------
  //@iconSpritePath:          "../img/glyphicons-halflings.png";
  //@iconWhiteSpritePath:     "../img/glyphicons-halflings-white.png";
    
  // Input placeholder text color
  // -------------------------
  placeholderText()         { this.grayLight() },
  
  // Hr border color
  // -------------------------
  hrBorder()                { this.grayLighter() },

  // XXX SOME OMISSIONS

  // Form states and alerts
  // -------------------------
  warningText()             { '#c09853' },
  warningBackground()       { '#fcf8e3' },
  warningBorder()           { darken(spin(this.warningBackground(), -10), .03) },
  
  errorText()               { '#b94a48' },
  errorBackground()         { '#f2dede' },
  errorBorder()             { darken(spin(this.errorBackground(), -10), .03) },
  
  successText()             { '#468847' },
  successBackground()       { '#dff0d8' },
  successBorder()           { darken(spin(this.successBackground(), -10), .05) },
  
  infoText()                { '#3a87ad' },
  infoBackground()          { '#d9edf7' },
  infoBorder()              { darken(spin(this.infoBackground(), -10), .07) },


  // GRID
  // --------------------------------------------------

  // Default 940px grid
  // -------------------------
  gridColumns()             { 12 },
  gridColumnWidth()         { "60px" },
  gridGutterWidth()         { "20px" },
  gridRowWidth()            { add(scale(this.gridColumnWidth(), this.gridColumns()), 
                                  scale(this.gridGutterWidth(), this.gridColumns()-1)) }

  
};


//----------------------------------------------------------------------
// port of Reset.less
// Adapted from Normalize.css http://github.com/necolas/normalize.css

var CSSReset = exports.CSSReset = function() {
//XXX cache
  return surface.GlobalCSS("
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
  return {
    
    // UTILITY MIXINS
    // --------------------------------------------------

    // Clearfix
    // --------
    // For clearing floats like a boss h5bp.com/q
    clearfix(selector) {
      "#{selector} { *zoom: 1; }
       #{selector}:before,
       #{selector}:after {
            display: table;
            content: '';
       }
       #{selector}:after {
            clear: both;
       }"
    },



    // Webkit-style focus
    // ------------------
    tab_focus() {
      "/* Default */
       outline: thin dotted #333;
       /* Webkit */
       outline: 5px auto -webkit-focus-ring-color;
       outline-offset: -2px;"
    },

    // IE7 inline-block
    // ----------------
    ie7_inline_block() {
      "*display: inline; /* IE7 inline-block hack */
       *zoom: 1;"
    },

    // IE7 likes to collapse whitespace on either side of the inline-block elements.
    // Ems because we're attempting to match the width of a space character. Left
    // version is for form buttons, which typically come after other elements, and
    // right version is for icons, which come before. Applying both is ok, but it will
    // mean that space between those elements will be .6em (~2 space characters) in IE7,
    // instead of the 1 space in other browsers.
    ie7_restore_left_whitespace(selector) {
      "#{selector} { *margin-left: .3em; }
       #{selector}:first-child { *margin-left: 0; }"
    },



    // Placeholder text
    // -------------------------
    placeholder(selector, color) {
      color = color || vars.placeholderText(),
      "#{selector}:-moz-placeholder {
         color: #{color};
       }
       #{selector}:-ms-input-placeholder {
         color: #{color};
       }
       #{selector}::-webkit-input-placeholder {
         color: #{color};
       }"
    },


    // Text overflow
    // -------------------------
    // Requires inline-block or block for proper styling
    text_overflow() { 
      "overflow: hidden;
       text-overflow: ellipsis;
       white-space: nowrap;" 
    },

    // FONTS
    // --------------------------------------------------

    font : {
      family : {
        serif() { "font-family: #{vars.serifFontFamily()};" },
        sans_serif() { "font-family: #{vars.sansFontFamily()};" },
        monospace() { "font-family: #{vars.monoFontFamily()};" }
      },
  
      shorthand(size,weight,lineHeight) {
        "font-size:   #{size||vars.baseFontSize()};
         font-weight: #{weight||'normal'};
         line-height: #{lineHeight||vars.baseLineHeight()};"
      },
      serif(size, weight, lineHeight) {
        "#{this.font.family.serif()}
         #{this.font.shorthand(size, weight, lineHeight)}"
      },
      sans_serif(size, weight, lineHeight) {
        "#{this.font.family.sans_serif()}
         #{this.font.shorthand(size, weight, lineHeight)}"
      },
      monospace(size, weight, lineHeight) {
        "#{this.font.family.monospace()}
         #{this.font.shorthand(size, weight, lineHeight)}"
      }
    },

    // FORMS
    // --------------------------------------------------

    // Mixin for form field states
    formFieldState(selector, textColor, borderColor, backgroundColor) {
      textColor = textColor || '#555',
      borderColor = borderColor || '#ccc',
      backgroundColor = backgroundColor || '#f5f5f5',

      "/* Set the text color */
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
    border_radius(radius) {
      "-webkit-border-radius: #{radius};
       -moz-border-radius: #{radius};
       border-radius: #{radius};"
    },

    // Drop shadows
    box_shadow(shadow) {
      "-webkit-box-shadow: #{shadow};
       -moz-box-shadow: #{shadow};
       box-shadow: #{shadow};"
    },

    // Transitions
    transition(transition) {
      "-webkit-transition: #{transition};
       -moz-transition: #{transition};
       -ms-transition: #{transition};
       -o-transition: #{transition};
       transition: #{transition};"
    },

    // Opacity
      opacity(opacity) {
        "opacity: #{opacity};
         filter: \"alpha(opacity=#{opacity})\";"
      },

    // BACKGROUNDS
    // --------------------------------------------------

    // Gradient Bar Colors for buttons and alerts
    gradientBar(primaryColor, secondaryColor) {
     "#{this.gradient.vertical(primaryColor, secondaryColor)}
      border-color: #{secondaryColor} #{secondaryColor} #{darken(secondaryColor, .15)};
      border-color: rgba(0,0,0,.1) rgba(0,0,0,.1) #{fadein('rgba(0,0,0,.1)', .15)};"
    },

    // Gradients
    gradient : {
      horizontal(startColor, endColor) {
        startColor = startColor || '#555',
        endColor = endColor || '#333',
        "background-color: #{endColor};
         background-image: -moz-linear-gradient(left, #{startColor}, #{endColor}); /* FF 3.6+ */
         background-image: -ms-linear-gradient(left, #{startColor}, #{endColor}); /* IE10 */
         background-image: -webkit-gradient(linear, 0 0, 100% 0, from(#{startColor}), to(#{endColor})); /* Safari 4+, Chrome 2+ */
         background-image: -webkit-linear-gradient(left, #{startColor}, #{endColor}); /* Safari 5.1+, Chrome 10+ */
         background-image: -o-linear-gradient(left, #{startColor}, #{endColor}); /* Opera 11.10 */
         background-image: linear-gradient(left, #{startColor}, #{endColor}); /* Le standard */
         background-repeat: repeat-x;
         filter: e(%(\"progid:DXImageTransform.Microsoft.gradient(startColorstr='%d', endColorstr='%d', GradientType=1)\",#{startColor},#{endColor})); /* IE9 and down */"
      },
      vertical(startColor, endColor) {
        startColor = startColor || '#555',
        endColor = endColor || '#333',
        "background-color: #{mix(startColor, endColor, .6)};
         background-image: -moz-linear-gradient(top, #{startColor}, #{endColor}); /* FF 3.6+ */
         background-image: -ms-linear-gradient(top, #{startColor}, #{endColor}); /* IE10 */
         background-image: -webkit-gradient(linear, 0 0, 0 100%, from(#{startColor}), to(#{endColor})); /* Safari 4+, Chrome 2+ */
         background-image: -webkit-linear-gradient(top, #{startColor}, #{endColor}); /* Safari 5.1+, Chrome 10+ */
         background-image: -o-linear-gradient(top, #{startColor}, #{endColor}); /* Opera 11.10 */
         background-image: linear-gradient(top, #{startColor}, #{endColor}); /* The standard */
         background-repeat: repeat-x;
         filter: e(%(\"progid:DXImageTransform.Microsoft.gradient(startColorstr='%d', endColorstr='%d', GradientType=0)\",#{startColor},#{endColor})); /* IE9 and down */"
      }
    },

    // Reset filters for IE
    reset_filter() {
      "filter: e(%(\"progid:DXImageTransform.Microsoft.gradient(enabled = false)\"));"
    },


    // COMPONENT MIXINS
    // --------------------------------------------------

    // Button backgrounds
    // ------------------
    buttonBackground(selector, startColor, endColor) {
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
    },

    // Table columns
    tableColumns(columnSpan) {
      columnSpan = columnSpan || 1,
      "float: none; /* undo default grid column styles */
       width: #{add(add(scale(vars.gridColumnWidth(),columnSpan), 
                        scale(vars.gridGutterWidth(),columnSpan-1)), 
                    - 16) /* 16 is total padding on left and right of table cells */
               }
       margin-left: 0; /* undo default grid column styles */"
    }
  };
};

//----------------------------------------------------------------------
// port of scaffolding.less
// Basic and global styles for generating a grid system, structural
// layout, and page templates

__js var CSSScaffolding = exports.CSSScaffolding = function() {
  var vars = defaultLookAndFeel;
  var mixins = Mixins(vars);

  // XXX cache
  return surface.GlobalCSS("
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
");
};

//----------------------------------------------------------------------
// port of type.less
// Headings, body text, lists, code, and more for a versatile and
// durable typography system

__js var CSSType = exports.CSSType = function() {
  var vars = defaultLookAndFeel;
  var mixins = Mixins(vars);

  // XXX cache
  return surface.CSS("
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

__js var CSSCode = exports.CSSCode = function() {
  var vars = defaultLookAndFeel;
  var mixins = Mixins(vars);
  
  // XXX cache
  return surface.CSS("
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

__js var CSSTables = exports.CSSTables = function() {
  var vars = defaultLookAndFeel;
  var mixins = Mixins(vars);
  
  // XXX cache
  return surface.CSS("
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
  #{mixins.border_radius('4px')}
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
    -webkit-border-top-left-radius: 4px;
            border-top-left-radius: 4px;
        -moz-border-radius-topleft: 4px;
}

.table-bordered thead:first-child tr:first-child th:last-child,
.table-bordered tbody:first-child tr:first-child td:last-child {
    -webkit-border-top-right-radius: 4px;
            border-top-right-radius: 4px;
        -moz-border-radius-topright: 4px;
}

  /* For first th or td in the first row in the first thead or tbody */
.table-bordered thead:last-child tr:last-child th:first-child,
.table-bordered tbody:last-child tr:last-child td:first-child {
    #{mixins.border_radius('0 0 0 4px')}
    -webkit-border-bottom-left-radius: 4px;
            border-bottom-left-radius: 4px;
        -moz-border-radius-bottomleft: 4px;
}

.table-bordered thead:last-child tr:last-child th:last-child,
.table-bordered tbody:last-child tr:last-child td:last-child {
    -webkit-border-bottom-right-radius: 4px;
            border-bottom-right-radius: 4px;
        -moz-border-radius-bottomright: 4px;
}


/* ZEBRA-STRIPING */

/* Default zebra-stripe styles (alternating gray and transparent backgrounds) */
.table-striped tbody tr:nth-child(odd) td,
.table-striped tbody tr:nth-child(odd) th {
      background-color: #{vars.tableBackgroundAccent()};
}


/* HOVER EFFECT */
/* Placed here since it has to come after the potential zebra striping */
.table tbody tr:hover td,
.table tbody tr:hover th {
    background-color: #{vars.tableBackgroundHover()};
}


/* TABLE CELL SIZING */

/* Change the columns */
 #{ coll.map([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24],function(i){ 
             return "table .span#{i} { #{ mixins.tableColumns(i) } }" })
  }
"); 
};


//----------------------------------------------------------------------
// port of wells.less
// WELLS

__js var CSSWells = exports.CSSWells = function() {
  var vars = defaultLookAndFeel;
  var mixins = Mixins(vars);

  // XXX cache
  return surface.CSS("
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

__js var CSSForms = exports.CSSForms = function() {
  var vars = defaultLookAndFeel;
  var mixins = Mixins(vars);

  // XXX cache
  return surface.CSS("
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

/* XXX
#grid > .input(@gridColumnWidth, @gridGutterWidth);
*/


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
.input-append .btn:last-child {
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
.form-horizontal input,
.form-horizontal textarea,
.form-horizontal select,
.form-horizontal .help-inline,
.form-horizontal .uneditable-input,
.form-horizontal .input-prepend,
.form-horizontal .input-append {
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

__js var CSSButtons = exports.CSSButtons = function() {
  var vars = defaultLookAndFeel;
  var mixins = Mixins(vars);

  // XXX cache
  return surface.CSS("
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
  background-color: #{darken(vars.white(), .1)};
  *background-color: #{darken(vars.white(), .15)}; /* Buttons in IE7 don't get borders, so darken on hover */
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
  background-color: #{darken(vars.white(), .1)};
  background-color: #{darken(vars.white(), .15)} \\9;
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
  #{mixins.opacity(.65)}
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

console.log("bootstrap.sjs loading: #{(new Date())-tt}");
