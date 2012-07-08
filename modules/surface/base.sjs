/*
 * Oni Apollo 'surface/base' module
 * Lightweight cross-browser UI toolkit - Core functionality
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
   @module  surface/base
   @summary Lightweight cross-browser UI toolkit - Core functionality (unstable work-in-progress)
   @home    apollo:surface/base
   @hostenv xbrowser
   @desc    Work-in-progress
*/
var tt = new Date();
waitfor {
  var common = require('../common');
} 
and {
  var coll   = require('../collection');
} 
and {
  var dom    = require('../xbrowser/dom');
} 
and {
  var debug  = require('../debug');
} 
and {
var func   = require('../function');
}
console.log("surface.sjs loading deps: #{(new Date())-tt}");
tt = new Date();
//----------------------------------------------------------------------
// StyleElement: stylesheet conditioned on unique css classes


/*
A coarse CSS parser, parsing into an array BLOCK, which takes elements:
   - "decl_str"
   - [ "kw_or_selector", BLOCK ]
*/
var blockRE = /\s*((?:[^\"\'\{\}\;\/]|\/[^\*])*)(\"|\'|\/\*|\{|\}|\;)/g;
var dstrRE = /(\"(?:[^\"]|\\\")*\")/g;
var sstrRE = /(\'(?:[^\']|\\\')*\')/g;
var commentRE = /\*\//g;
var wsRE = /\s*$/g;

__js function parseCSSBlocks(src) {
  var index = 0;
  function block() {
    var matches, chunk = '', content = [];
    // parse chunk up to next 'operator':  " OR ' OR /* OR { OR } OR ; 
    blockRE.lastIndex = index;
    while ((matches = blockRE.exec(src))) {
      //console.log(matches);
      index = blockRE.lastIndex;
      if (matches[1]) chunk += matches[1];
      switch (matches[2]) {
      case '"':
        dstrRE.lastIndex = index-1;
        matches = dstrRE.exec(src);
        if (!matches) throw new Error('Invalid CSS: Unterminated string');
        chunk += matches[1];
        index = dstrRE.lastIndex;
        break;
      case "'":
        sstrRE.lastIndex = index-1;
        matches = sstrRE.exec(src);
        if (!matches) throw new Error('Invalid CSS: Unterminated string');
        chunk += matches[1];
        index = sstrRE.lastIndex;
        break;
      case '/*':
        commentRE.lastIndex = index;
        matches = commentRE.exec(src);
        if (!matches) throw new Error('Invalid CSS: Unterminated comment');
        // ignore comment
        index = commentRE.lastIndex;
        break;
      case '{':
        content.push([chunk, block()]);
        if (src.charAt(index-1) != '}') throw new Error('Invalid CSS: Unterminated block');
        chunk = '';
        break;
      case '}':
        if (chunk.length) content.push(chunk);
        return content;
        break;
      case ';':
        content.push(chunk + ';');
        chunk = '';
        break;
      }
      blockRE.lastIndex = index;
    }
    if (chunk.length) throw new Error('Invalid CSS: Trailing content in block');
    return content;
  }
  var rv = block();
  if (index != src.length) {
    // allow trailing whitespace:
    wsRE.lastIndex = index;
    if (wsRE.exec(src) == null)
      throw new Error(
        "Invalid CSS: Unparsable around '#{src.substr(Math.max(0,index-20), 40).replace(/\n/g,'\\n')}'"
      );
  }
  return rv;
}

/**
   @class   StyleElement
   @summary Object with style information to be applied to a [::UIElement]
*/

var StyleElement = {};

var styleClassCounter = 0;
__js StyleElement.init = function(content, global) {
  if (!global) {
    var cssClass = this.cssClass = "__oni"+(++styleClassCounter);
    // fold cssClass into selectors:
    var tt = new Date();
    var blocks = parseCSSBlocks(content);
    console.log("parse style=#{(new Date())-tt}ms");    

    function processBlock(b,lvl) {
      return coll.map(b, function(b) {
        if (!Array.isArray(b))
          return b; // a decl
        else {
          if (lvl) {
            throw new Error("Invalid CSS: invalid nesting of '#{b[0]}{#{b[1].join(' ')}}'");
          }
          if (b[0].charAt(0) != '@') {
            // fold cssClass into selector
            b[0] = coll.map(b[0].split(','), function(s){ return ".#{cssClass} #{s}" }).join(',');
          }
          return "#{b[0]} { #{processBlock(b[1],lvl+1)} }";
        }
      }).join('\n');
    }
    tt = new Date();
    content = processBlock(blocks, 0);
    console.log("process style=#{(new Date())-tt}ms");
  }
  var elem = this.dompeer = document.createElement('style');
  elem.setAttribute('type', 'text/css');
  elem.innerHTML = content;

  this.refCount = 0;
};

__js StyleElement.use = function() {
  if (this.refCount++ == 0)
    document.head.appendChild(this.dompeer);
};
__js StyleElement.unuse = function() {
  if (--this.refCount == 0)
    this.dompeer.parentNode.removeChild(this.dompeer);
};

/**
   @function CSS
   @summary  Create a local [::StyleElement] from CSS style rules
   @param    [String] CSS style rules
   @return   {::StyleElement}
   @desc
      Creates a [::StyleElement] that, when applied to a [::UIElement] `ui`, will be 
      have its rules only applied to `ui` and descendents of `ui`.
 */
__js var CSS = exports.CSS = function(content) { 
  var obj = Object.create(StyleElement);
  obj.init(content); 
  return obj;
};

/**
   @function GlobalCSS
   @summary  Create a global [::StyleElement] from CSS style rules
   @param    [String] CSS style rules
   @return   {::StyleElement}
   @desc
     Create a [::StyleElement] that, when applied to an [::UIElement], will have its rules 
     applied globally to all elements in the webapp.
*/
__js var GlobalCSS = exports.GlobalCSS = function(content) { 
  var obj = Object.create(StyleElement);
  obj.init(content, true);
  return obj;
};

//----------------------------------------------------------------------
// DOM Measuring helpers

__js {
  // see http://erik.eae.net/archives/2007/07/27/18.54.15/
  function getStyle(el, prop) {
    if (document.defaultView && document.defaultView.getComputedStyle) {
      return document.defaultView.getComputedStyle(el, null)[prop];
    } else if (el.currentStyle) {
      return getPixelValue(el, el.currentStyle[prop]);
    } else {
      return getPixelValue(el, el.style[prop]);
    }
  }
  
  var PIXEL = /^\d+(.\d*)+(px)?$/i;
  function getPixelValue(element, value) {
    if (!value) return 0;
    if (PIXEL.test(value)) {
      return parseInt(value);
    }
    var style = element.style.left;
    var runtimeStyle = element.runtimeStyle.left;
    element.runtimeStyle.left = element.currentStyle.left;
    element.style.left = value || 0;
    value = element.style.pixelLeft;
    element.style.left = style;
    element.runtimeStyle.left = runtimeStyle;
    return value;
  }
}

//----------------------------------------------------------------------
/*
  Constrained quantity used for box layouts
  {
    explicit : explicit value || undefined
    flex     : flex value || 0
    min      : minimum constraint || 0
    max      : maximum constraint || UNCONSTRAINED
    val      : value calculated by box layout
  }

*/

var UNCONSTRAINED = 1e10;
exports.UNCONSTRAINED = UNCONSTRAINED;

// parse the quantity into a [unit, value] array 
__js function parseQuantity(q) {
  if (q===undefined) return undefined;
  var rv;
  if (typeof q == "number")
    rv = ["px", q];
  else {
    var val = parseFloat(q);
    if (isNaN(val)) val = 1;
    if (/\*$/.exec(q)) {
      // starred (flex) size
      rv = ["*", val];
    }
    else {
      // map everything else to px:
      rv = ["px", val];
    }
  }
//  console.log("val="+rv);
  return rv;
}

// For entity 'X', parse X, minX, maxX into a 'constrained
// quantity struct'
__js function makeConstrainedQuantity(entity, attribs) {
  var cq = {};
  var v;
  cq.flex=0;
  if ((v=parseQuantity(attribs[entity])) !== undefined) {
    if (v[0] == "*") {
      cq.flex = v[1];
    }
    else {
      // we'll treat everything else as 'px' for now
      cq.explicit = v[1];
    }
  }
  cq.min = 0;
  if ((v=parseQuantity(attribs['min'+entity])) !== undefined) {
    if (v[0] != "*") {
      cq.min = v[1];
    }
  }
  cq.max = UNCONSTRAINED;
  if ((v=parseQuantity(attribs['max'+entity])) !== undefined) {
    if (v[0] != "*") {
      cq.max = v[1];
    }
  }

  return cq;
}

//----------------------------------------------------------------------
// UIElement base class
/*

  abstract base class for ui elements

  {
    dompeer:   root DOM element
    style:     ...
  }    
*/
/**
   @class    UIElement
   @summary  Base class for UI elements
   @variable UIElement
*/
var UIElement = exports.UIElement = {};

/**
   @function UIElement.init
   @summary Called by constructor functions to initialize UIElement objects
   @param   {Object} [attribs] Hash with attributes
   @attrib  {optional Function|Array} [run] Function or array of functions that will 
               be spawned when the element 
               is activated and aborted when the element is deactivated 
               (see [::UIElement::activated] & [::UIElement::deactivated]).
               The function will be executed with `this` pointing to the UIElement.
   @attrib  {optional ::StyleElement|Array} [style] [::StyleElement] 
               (or array of elements) to apply to this UIElement.
   @attrib  {optional String} [content] HTML content for this UIElement.
*/
__js UIElement.init = function(attribs) {
  if (attribs.debug) {
    this.debugtags = attribs.debug.tags || "";
    this.debugid = attribs.debug.id || "DEBUG";
  }
  else {
    this.debugtags = "";
    this.debugid = "";
  }
  this.dompeer = document.createElement('surface-ui');
  this.dompeer.setAttribute('style', 'display:block;visibility:hidden'); 
  this.dompeer.ui = this;
  this.run = attribs.run;
  this.style = attribs.style || [];
  if (StyleElement.isPrototypeOf(this.style)) this.style = [this.style];
  coll.each(this.style, function(s) { 
    if (s.cssClass) this.dompeer.setAttribute('class', s.cssClass+" "+this.dompeer.getAttribute('class')); }, this);
  if (typeof attribs.content !== 'undefined')
    this.dompeer.innerHTML = attribs.content;
};

/**
   @function UIElement.debug
   @summary Check if debugging is enabled for the given tag 
   @param {String} [tag] Debugging tag
   @return {Boolean} 
*/
UIElement.debug = function(tag) { return this.debugtags.indexOf(tag)!=-1; };

/**
   @function UIElement.select1
   @summary Selects first matching DOM child
   @param {String} CSS selector
   @return {DOMElement|null}
*/
UIElement.select1 = function(selector) { return this.dompeer.querySelector(selector); };

/**
   @function UIElement.select
   @summary Select all matching DOM children
   @param {String} CSS selector
   @return {NodeList}
*/
UIElement.select = function(selector) { return this.dompeer.querySelectorAll(selector); };

/**
   @function UIElement.activated
   @summary Called when this UIElement has been attached (directly or indirectly) to the global surface
*/
UIElement.activated = function() {
  if (this.isActivated) throw new Error("UIElement already activated");
  this.isActivated = true;
  coll.each(this.style, {|s| s.use() });
  this.dompeer.style.visibility = 'visible';
  if (this.run) {
    if (Array.isArray(this.run))
      this.stratum = spawn coll.par.waitforAll(this.run, undefined, this);
    else
      this.stratum = spawn this.run.apply(this);
  }
};

/**
   @function UIElement.deactivated
   @summary Called when this UIElement has become detached from the global surface
*/
UIElement.deactivated = function() {
  if (!this.isActivated) throw new Error("UIElement already deactivated");
  if (this.stratum) {
    this.stratum.abort();
    this.stratum = undefined;
  }
  this.isActivated = false;
  this.dompeer.style.visibility = 'hidden';
  coll.each(this.style, {|s| s.unuse() });
};

/**
   @function UIElement.attached
   @summary Called when this UIElement has been attached to a container
   @param   {::UIContainerElement} [parent]
   @desc    Sets [::UIElement::parent]
*/
UIElement.attached = function(parent) {
  this.parent = parent;
};

/**
   @function UIElement.detached
   @summary Called when this UIElement has been detached from a container
   @desc    Clears [::UIElement::parent]
*/
UIElement.detached = function() {
  this.parent = undefined;
};

/**
   @variable UIElement.parent
   @summary [::UIContainerElement] to which this UIElement is currently attached
   @desc See [::UIElement::attached] and [::UIElement::detached]
*/
UIElement.parent = undefined;

/**
   @variable UIElement.parentSlot
   @summary Slot for use by element's parent
*/
UIElement.parentSlot = undefined;

/**
   UIElement::layout(layoutSpec) -> layoutSpec
   @function UIElement.layout
   @purevirtual
   @summary Lay out this UIElement
   @param {Object} [layout_spec] Object with layout specification; see below for description
   @return {Object} layout_spec (potentially modified; see below)
   @desc
     `layout_spec` is an object which can take the following forms:

      * **{ type: 'abs', w: integer|undefined, h: integer|undefined }**

        The element is to be layed out absolutely. Fields `w` and `h`
        specify the explicit width and/or height that the element should have.
        If either or both are undefined, the undefined value(s) should be determined
        implicitly and set in the layout_spec object before this is returned.

        The position of the object will be set in (a) future call(s) to [::UIElement::place].

      * **{ type: 'w', w: integer }**:

        The element is to be layed out relatively. The width is given; the height should
        be determined implicitly. If the element is a passive element 
        (see [::UIElement::active]), it should set its width to '100%', rather than 
        an absolute width: When the available width of the container changes later on,
        passive elements will not receive layout calls.

      * **{ type: 'h', h: integer }**:

        The element is to be layed out relatively. The height is given; the width should
        be determined implicitly. If the element is a passive element 
        (see [::UIElement::active]), it should set its height to '100%', rather than 
        an absolute height: When the available height of the container changes later on,
        passive elements will not receive layout calls.

      * **{ type: 'wh', w: integer, h: integer }**

        The element is to be layed out absolutely. Width and height are given. 
        If the element is a passive element (see [::UIElement::active]), it 
        should set its width and height to '100%', rather than an absolute value: When the 
        available width/height of the container changes later on,
        passive elements will not receive layout calls.
*/

/**
   @variable UIElement.active
   @summary Flag that determines if element needs relayout when dimensions of container change
   @desc 
      `false` by default.

      If this flag is `true` when a UIElement is added to a container, the container 
      will relayout the element on size changes, even if the current layout mode is 
      one of the relative positioning modes.
*/
UIElement.active = false;

/**
   @function UIElement.place
   @summary  Place this UIElement
   @param    {Integer} [x]
   @param    {Integer} [y]
   @desc
      Called by containers to set the position of this element. Only called when the 
      the layout mode is 'abs' (see [::UIElement::layout]).
*/
__js UIElement.place = function(x,y) {
  this.dompeer.style.left = x+"px";
  this.dompeer.style.top  = y+"px";
};

/**
   @function UIElement.getMargins
   @summary  Retrieve total margin width and height in pixels
   @return {Array} [ ] [mw,mh]
*/
__js UIElement.getMargins = function() {
  var elem = this.dompeer;
  return [parseInt(getStyle(elem, "marginLeft"))+parseInt(getStyle(elem, "marginRight")),
          parseInt(getStyle(elem, "marginTop"))+parseInt(getStyle(elem, "marginBottom"))];
};

/**
   @function UIElement.getPadding
   @summary  Retrieve padding (left, right, top and bottom) in pixels
   @return   {Array} [ ] [pl,pr,pt,pb]
*/
__js UIElement.getPadding = function() {
  var elem = this.dompeer;
  return [parseInt(getStyle(elem, "paddingLeft")),
          parseInt(getStyle(elem, "paddingRight")),
          parseInt(getStyle(elem, "paddingTop")),
          parseInt(getStyle(elem, "paddingBottom"))];
};

/**
   @function UIElement.getBorders
   @summary  Retrieve border width and height (including scrollbars if applicable) in pixels
   @return   {Array} [ ] [bw,bh]
*/
__js UIElement.getBorders = function() {
  var elem = this.dompeer;
    // border sizes (including scrollbars):
  return [elem.offsetWidth-elem.clientWidth, elem.offsetHeight-elem.clientHeight];
};


//----------------------------------------------------------------------
// UIContainerElement

/**
   @class   UIContainerElement
   @summary Base class for UI containers
   @inherit ::UIElement
   @variable UIContainerElement
*/
__js var UIContainerElement = exports.UIContainerElement = Object.create(UIElement);

/**
   @function UIContainerElement.init
   @summary Called by constructor functions to initialize UIContainerElement objects
   @param {Object} [attribs] Hash with attributes. Will also be passed to [::UIElement::init]
*/
// nothing special for UIContainerElement... just inherit for now

/**
   @variable UIContainerElement.active
   @summary see [::UIElement.active]
   @desc 
     Set to `true` for UIContainerElements
*/
UIContainerElement.active = true;

/**
   @function UIContainerElement.remove
   @purevirtual
   @summary Remove a UIElement from this container
   @param {::UIElement} [child] The child to be removed
*/

//----------------------------------------------------------------------
// ChildManagement mixin

var ChildManagement = {
  init: function(attribs) {
    this.children = [];
    coll.each(attribs.children,
              { |c|
                if (UIElement.isPrototypeOf(c))
                  this.append(c);
                else // [child, attribs]
                  this.append(c[0],c[1]);
              });
  },

  remove: function(ui) {
    coll.remove(this.children, ui);
    this.dompeer.removeChild(ui.dompeer);
    ui.detached();
  },

  activated: function() {
    coll.each(this.children, { |c| c.activated() });
  },

  deactivated: function() {
    coll.each(this.children, { |c| c.deactivated() });
  },

  mixinto: function(target) {
    target.init = func.seq(target.init, this.init);
    target.remove = this.remove;
    target.activated = func.seq(target.activated, this.activated);
    target.deactivated = func.seq(target.deactivated, this.deactivated);
  }
};

//----------------------------------------------------------------------
// BoxElement

/**
   @class   BoxElement
   @summary Box layout container
   @inherit ::UIContainerElement
   @variable BoxElement
*/
__js var BoxElement = exports.BoxElement = Object.create(UIContainerElement);

__js var Box = exports.Box = function(attribs) { 
  var obj = Object.create(BoxElement);
  obj.init(attribs);
  return obj;
};

/**
   @function HBox
   @summary Construct a horizontally-stacking [::BoxElement]
   @param   [attribs] ...
*/
__js var HBox = exports.HBox = function(attribs) { 
  return Box(common.mergeSettings(attribs, {direction:'w'}));
};
/**
   @function VBox
   @summary Construct a vertically-stacking [::BoxElement]
   @param   [attribs] ...
*/
__js var VBox = exports.VBox = function(attribs) { 
  return Box(common.mergeSettings(attribs, {direction:'h'}));
}

/**
   @function BoxElement.init
   @summary Called by constructor functions to initialize BoxElement objects
   @param {Object} [attribs] Hash with attributes. Will also be passed to [::UIContainerElement::init]
   @attrib {String} [direction='h'] 'w' for horizontal-stacking box, 'h' for vertically-stacking box
 */
BoxElement.init = function(attribs) {
  UIContainerElement.init.apply(this, [attribs]);
  this.direction = attribs.direction || 'h';
}

ChildManagement.mixinto(BoxElement);

BoxElement.append = function(ui, attribs) {
  attribs || (attribs = {});
//  attribs.w || (attribs.w = "*");
//  attribs.h || (attribs.h = "*");
  ui.parentSlot = { 
    w: makeConstrainedQuantity("w", attribs),
    h: makeConstrainedQuantity("h", attribs),
    align: attribs.align || "<"
  };
  this.children.push(ui);
  this.dompeer.appendChild(ui.dompeer);
  ui.attached(this);
  if (this.isActivated)
    ui.activated();
  this.invalidate(ui);
};

__js BoxElement.invalidate = function(child) {
  // XXX be more specific
  surface.scheduleLayout();
};

BoxElement.layoutBox = function(entity, avail, oentity, ostart,
                                centity, cavail, coentity, costart) {
//  console.log('layout '+entity+': '+avail+' '+centity+': '+cavail);

  // relaxation algorithm inspired by
  // http://users.encs.concordia.ca/~haarslev/publications/jvlc92/node5.html
  // amended with flex weighting

  /*
    PRIMARY DIMENSION:

      'avail' undefined:
      (0) flex: set to min
      (1) fix : layout( entity=undefined, . )
      'avail' given:
      (2) flex: set to min; LATER share from S (<max)
      (3) fix: layout( entity=undefined, . ) 
       
    COMPLEMENTARY DIMENSION:

      'cavail' undefined:
      (~0) cflex: set to min; LATER sized to Sc (< max)
      (~1) cfix : layout( centity=undefined, . )
      'cavail' given:
      (~2) cflex: set to min(cavail,max)
      (~3) cfix: layout( centity=undefined, . )


      i: needs initial layout
      s: needs second  layout
      .: either will do

            2   0   1   3

        ~0  s   s   is  is

        ~2  s   .   i   i

        ~1  is  i   i   i

        ~3  is  i   i   i

   */

  var Sp = 0; // space taken in primary direction
  var Sc = cavail ? cavail : 0; // max space taken in complementary direction
  var F = 0; // total flex
  var A = []; // remaining quantities flexible in primary direction 
  var B = []; // remaining quantities to be resized in complementary direction
  var M = 1e10; // lowest individual distributed space
  
  // 1. satisfy minimum space requirements, construct A&B, determine Sp,
  // Sc (for non-primary flexibles), note M, and sum up F:
  for (var i=0; i<this.children.length; ++i) {
    var child = this.children[i];
    var p = child.parentSlot[entity], c = child.parentSlot[centity];
    // set up initial dimensions:

    // primary dimension:
    if (p.flex > 0) { // flexible in primary direction
      p.val = p.min;
      if (avail) {
        var min = p.val/p.flex;
        if (min < M) M = min;
        F += p.flex;
        A.push(child);
      }
    }
    else { // inflexible in primary direction
      p.val = undefined; // we'll measure
    }
    // complementary dimension:
    if (c.flex > 0) { // flexible in complementary direction
      if (cavail) {
        c.val = Math.min(Sc, c.max);
      }
      else {
        c.val = c.min;
        B.push(child);
      }
    }
    else { // inflexible in complementary direction
      c.val = undefined; // we'll measure
    }

    // measure shrink-wrap if we need to:
    if (p.val == undefined || ((c.val == undefined )&& !cavail)) {
      var child_spec = child.layout({type:'abs', w:child.parentSlot.w.val, h:child.parentSlot.h.val});
      child.parentSlot.w.val = child_spec.w; 
      child.parentSlot.h.val = child_spec.h; 
      child.parentSlot.layed_out = true;
    }
    else
      child.parentSlot.layed_out = false;

    // sum up Sc, Sp
    Sp += p.val;
    if (!cavail)
      Sc = Math.max(Sc, c.val);
  }

  // S = space to be distributed to primary direction:
  var S = avail ? avail - Sp : 0;

  // 2. distribute remaining space until none left, or until we run
  // out of flexible children:
  while (S >= 1 && A.length > 0) {
    if (this.debug('bld')) {
      console.log(this.debugid+" bld: S:"+S+" A.l:"+A.length);
    }
    // portion/flex to distribute:
    var P = S/F;
    var m = M; // m: level from which to distribute
    var distributed = 0; // total distributed space in this round
    M = 1e10; 
    for (var i=0; i<A.length; ++i) {
      var child = A[i];
      var l = child.parentSlot[entity];
      // level for this layout:
      var level =  Math.floor((P + m)*l.flex);
      if (this.debug('bld')) {
        console.log(this.debugid+" bld: "+i+" level:"+level+" P:"+P );
      }
      level = Math.min(l.max, level);
      if (level > l.val) {
        distributed += (level - l.val);
        l.val = level;
        child.parentSlot.layed_out = false; // need to re-layout
      }
      if (l.val >= l.max) {
        // max flex reached
        A.splice(i, 1);
        --i;
        F -= l.flex;
      }
      else {
        if (this.debug('bld')) {
          console.log(this.debugid+" bld: min:"+min );
        }
        var min = l.val/l.flex;
        if (min < M) M = min;
      }
    }
    if (distributed < 0.1) break;
    S -= distributed;
  }
  if (this.debug('bld')) {
    console.log(this.debugid+" bld: S left at end of first round:"+S );
  }
  // add any leftover space to the last flexible element:
  while (S >= 1 && A.length > 0) {
    if (this.debug('bld')) {
      console.log(this.debugid+" bld: distribute to last:"+S );
    }
    var last = A.length-1, child = A[last];
    var l = child.parentSlot[entity];
    l.val += S;
    if (l.val > l.max) {
      S = l.max - l.val;
      l.val = l.max;
      A.splice(last,1);
    }
    else
      break;
  }

  // 3. adjust complementary dimensions:
  for (i=0; i<B.length; ++i) {
    var child = B[i];
    var c = child.parentSlot[centity];
    if (c.val < Sc) {
      c.val = Math.min(Sc, c.max);
      child.parentSlot.layed_out = false; // need to re-layout
    }
  }
  
  // 4. re-layout & adjust offsets:
  var offset = ostart;
  for (var i=0; i<this.children.length; ++i) {
    var child = this.children[i];
    if (!child.parentSlot.layed_out) {
      child.parentSlot[entity].val = Math.round(child.parentSlot[entity].val);
      child.layout({type:'abs', w:child.parentSlot.w.val, h:child.parentSlot.h.val});
      child.parentSlot.layed_out = true;
    }
    // stack up in primary direction:
    child.parentSlot[oentity] = offset;
    if (child.parentSlot.align == "<")
      child.parentSlot[coentity] = costart;
    else if (child.parentSlot.align == ">")
      child.parentSlot[coentity] = costart+Sc-child.parentSlot[centity].val;
    else // align == "|"
      child.parentSlot[coentity] = costart+(Sc-child.parentSlot[centity].val)/2;
    child.place(child.parentSlot.x, child.parentSlot.y);
    offset += child.parentSlot[entity].val;
  }

  // 5. ALL DONE :-)  
  
  if (!avail) avail = Sp;

  return entity == 'w' ? [avail,Sc] : [Sc,avail];
};

BoxElement.layout = function(layout_spec) {
  var margins = this.getMargins();
  var padding = this.getPadding();
  var borders = this.getBorders(); // including scrollbars
  var elem = this.dompeer;
  var style = elem.style;

  if (layout_spec.type == "abs" || layout_spec.type == "wh")
    style.position = "absolute";
  else
    style.position = "relative";

  var w = layout_spec.w;
  var h = layout_spec.h;

  if (typeof w != 'undefined')
    w -= (margins[0] + padding[0] + padding[1] + borders[0]);
  if (typeof h != 'undefined')
    h -= (margins[1] + padding[2] + padding[3] + borders[1]);

  if (this.direction == "w")
    [w,h] = this.layoutBox("w", w, "x", padding[0],
                           "h", h, "y", padding[2]);
  else
    [w,h] = this.layoutBox("h", h, "y", padding[2],
                           "w", w, "x", padding[0]);
  
  switch (layout_spec.type) {
  case 'wh':
    style.top = "0px";
    style.left = "0px";
    style.width = "100%";
    style.height = "100%";
    break;
  default:
    style.width  = (w + padding[0] + padding[1] + borders[0]) + "px";
    style.height = (h + padding[2] + padding[3] + borders[1]) + "px";  
  }
  layout_spec.w = w+margins[0]+padding[0]+padding[1]+borders[0];
  if (this.debug("ow"))
    console.log(this.debugid + " ow: "+layout_spec.w);
  layout_spec.h = h+margins[1]+padding[2]+padding[3]+borders[1];
  return layout_spec;
};

//----------------------------------------------------------------------
/**
   @class   VScrollBoxElement
   @summary Vertically scrolling list
   @inherit ::UIContainerElement
   @variable VScrollBoxElement
*/
__js var VScrollBoxElement = exports.VScrollBoxElement = Object.create(UIContainerElement);


/**
   @function VScrollBox
   @summary  Construct a [::VScrollBox] object
   @param    [attribs] ...
*/
var VScrollBox = exports.VScrollBox = function(attribs) { 
  var obj = Object.create(VScrollBoxElement);
  obj.init(attribs); 
  return obj;
};

ChildManagement.mixinto(VScrollBoxElement);

__js VScrollBoxElement.append = function(ui) {
  this.children.push(ui);
  this.dompeer.appendChild(ui.dompeer);
  ui.attached(this);
  if (this.isActivated) {
    if (this.debug('activated')) 
      console.log(this.debugid+": activating "+ui);
    ui.activated();
    if (this.clientW !== undefined)
      ui.layout({type:"w", "w":this.clientW});
  }
};

__js VScrollBoxElement.invalidate = function(child) {
  // nothing to do
};

VScrollBoxElement.layout = function(layout_spec) {
  HtmlFragmentElement.layout.apply(this, [layout_spec]);
  // we always require a width; set one arbitrarily if we haven't got one:
  if (layout_spec.w === undefined)
    style.width = (layout_spec.w = 300)+'px';

  var first_layout = (this.clientW === undefined);
  var margins = this.getMargins();
  var padding = this.getPadding();
  var borders = this.getBorders();
  this.clientW = layout_spec.w - (margins[0] + padding[0] + padding[1] + borders[0]);

  if (this.debug("iw"))
    console.log(this.debugid + " iw: "+this.clientW);

  var child_spec = {type:"w", "w":this.clientW};
  if (first_layout)
    coll.each(this.children, {|c| c.layout(child_spec)});
  else // only lay out active children:
    coll.each(this.children, {|c| if (c.active) c.layout(child_spec)});

  return layout_spec;
};


//----------------------------------------------------------------------
// HtmlFragmentElement
/**
   @class   HtmlFragmentElement
   @summary Generic HTML UI element
   @inherit ::UIElement
   @variable HtmlFragmentElement
*/

__js var HtmlFragmentElement = exports.HtmlFragmentElement = Object.create(UIElement);

__js HtmlFragmentElement.layout = function(layout_spec) {
  var elem = this.dompeer;
  var style = elem.style;

  if (layout_spec.type == 'abs') {
    var margins = this.getMargins();
    if (typeof layout_spec.w != 'undefined' && typeof layout_spec.h != 'undefined') {
      // both w and h defined
      style.width  = Math.max(0,layout_spec.w-margins[0]) + "px";
      style.height = Math.max(0,layout_spec.h-margins[1]) + "px";
    }
    else {
      // xxx chrome has a bug whereby absolutely positioned content doesn't obey 
      // 'box-sizing: border-box'. we need to measure with static positioning:
      style.position = "static";
      var measure_display = "table";
      if (typeof layout_spec.w == 'undefined' && typeof layout_spec.h == 'undefined') {
        style.width   = "1px";
        style.height  = "1px";
        style.display = measure_display;
        layout_spec.w = elem.offsetWidth + margins[0];
        layout_spec.h = elem.offsetHeight + margins[1];
        style.width  = Math.max(0,layout_spec.w-margins[0]) + "px";
        style.height = Math.max(0,layout_spec.h-margins[1]) + "px";
      }
      else if (typeof layout_spec.w != 'undefined' && typeof layout_spec.h == 'undefined') {
        style.width   =  Math.max(0,layout_spec.w-margins[0]) + "px";
        style.height  = "1px";
        style.display = measure_display;
        layout_spec.h = elem.offsetHeight + margins[1];
        style.height = Math.max(0,layout_spec.h-margins[1]) + "px";
      }
      else { //typeof layout_spec.w == 'undefined' && typeof layout_spec.h != 'undefined'
        style.width   = "1px";
        style.height  = Math.max(0,layout_spec.h-margins[1]) + "px";
        style.display = measure_display;
        layout_spec.w = elem.offsetWidth + margins[0];
        style.width  = Math.max(0,layout_spec.w-margins[0]) + "px";
      }
    }
    style.display  = "block";
    style.position = "absolute";
  }
  else {
    if (layout_spec.type == 'w') {
      style.display  = "table";
      style.left = "0px";
      style.top = "0px";
      style.position = "relative";
      style.width  = "100%";
      style.height = "";
    }
    else if (layout_spec.type == 'h') {
      style.display  = "table";
      style.left = "0px";
      style.top = "0px";
      style.position = "relative";
      style.width  = "";
      style.height = "100%";
    }
    else if (layout_spec.type == 'wh') {
      style.display = "block";
      style.position = "absolute";
      style.left = "0px";
      style.top = "0px";
      style.width  = "100%";
      style.height = "100%";
    }
    else if (layout_spec.type == 'flow') {
      style.display = "";
      style.position = "static";
      style.left = undefined;
      style.top = undefined;
      style.width = undefined;
      style.height = undefined;
    }
    else {
      throw new Error("Layout type "+layout_spec.type+" unsupported for HtmlFragmentElement");
    }
  }
  if (this.debug("ow"))
    console.log(this.debugid + " ow: "+layout_spec.w);

  return layout_spec;
};

/**
   @function Html
   @summary Construct a [::HtmlFragmentElement]
   @param   {Object} [attribs] Object with attributes
   @attrib  {String} [content] HTML content
   @return  {::HtmlFragmentElement}
*/
exports.Html = function(attribs) { 
  var obj = Object.create(HtmlFragmentElement);
  obj.init(attribs); 
  return obj;
};

//----------------------------------------------------------------------
// animation aperture:

/**
   @function Aperture
   @summary  XXX to be documented
*/
exports.Aperture = function(ui,f) {
  var aperture = document.createElement('surface-aperture');
  
  var margins = ui.getMargins();
  var w = ui.dompeer.offsetWidth;
  var h = ui.dompeer.offsetHeight;
  var oldWidth = ui.dompeer.style.width;
  var oldHeight = ui.dompeer.style.height;
  var oldPosition = ui.dompeer.style.position;
  var oldTop = ui.dompeer.style.left;
  var oldLeft = ui.dompeer.style.top;
  var oldLayout = ui.layout;
  
  ui.layout = function(spec) {
    spec.w = w; //+margin xx
    spec.h = h; //+margin xx
  };
  
  aperture.style.position = oldPosition;
  aperture.style.top = oldTop;
  aperture.style.left = oldLeft;
  aperture.style.width  = w+'px'; //+margin XX
  aperture.style.height = h+'px'; //+margin XX
  
  ui.dompeer.style.position = 'relative'; 
  ui.dompeer.style.top = '0px';
  ui.dompeer.style.left = '0px';
  ui.dompeer.style.width = w+'px';
  ui.dompeer.style.height = h+'px';
  
  ui.dompeer.parentNode.replaceChild(aperture, ui.dompeer);
  aperture.appendChild(ui.dompeer);

  var sizer = {
    getWidth  : function() { return w; },
    getHeight : function() { return h; },
    setWidth : function(new_w) { 
      w = new_w;
      aperture.style.width = w+'px';
      ui.parent.invalidate(ui);
    },
    setHeight : function(new_h) { 
      h = new_h;
      aperture.style.height = h+'px';
      ui.parent.invalidate(ui);
    },
    style : aperture.style
  };

  try {
    f(sizer);
  }
  finally {
    ui.dompeer.style.position = oldPosition;
    ui.dompeer.style.top = oldTop;
    ui.dompeer.style.left = oldLeft;
    ui.dompeer.style.width  = oldWidth;
    ui.dompeer.style.height = oldHeight;
    ui.layout = oldLayout;
    aperture.parentNode.replaceChild(ui.dompeer, aperture);
  }
};

//----------------------------------------------------------------------


//----------------------------------------------------------------------
// Root element

/**
   @class RootElement
   @summary Root layout container
   @inherit ::UIContainerElement
   @desc
     The `RootElement` lays out active and passive elements separately:

       * active elements will be layed out as 'wh'

       * passive elements will be layed out as 'flow'
*/
__js var RootElement = Object.create(UIContainerElement);

__js RootElement.init = function(attribs) {
  UIContainerElement.init.apply(this, [attribs]);
};

ChildManagement.mixinto(RootElement);

RootElement.append = function(ui) {
  this.children.push(ui);
  this.dompeer.appendChild(ui.dompeer);
  ui.attached(this);
  if (this.isActivated)
    ui.activated();
  this.layoutChild(ui);
};

RootElement.invalidate = function(child) {
//XXX nothing to do?
};

RootElement.layoutChild = function(child) {
  if (child.active) {
    //XXX
  }
  else {
    child.layout({type:'flow'});
  }
};

RootElement.layout = function(layout_spec) {
  if (layout_spec.type != 'wh') throw new Error("Unexpected layout type for RootElement");
  coll.each(this.children) { 
    |c|
    this.layoutChild(c);
  }
};


/**
   @variable surface
   @summary  The one and only instance of [::RootElement]
*/
__js var surface = exports.surface = Object.create(RootElement);

surface.init({
  style: 
  [ GlobalCSS('
/*body { overflow:hidden; margin:0px;}*/
surface-ui, surface-aperture { -moz-box-sizing: border-box; -webkit-box-sizing: border-box; box-sizing: border-box;border-collapse:separate}
surface-aperture { overflow:hidden; display:block; }
')],
  run() {
    document.body.appendChild(this.dompeer);
    try {
      hold();
    }
    finally {
      document.body.removeChild(this.dompeer);
    }
  }
});
surface.activated();

/*
exports.surface = Box({
  style: 
  [ GlobalCSS('
body { overflow:hidden; margin:0px;}
surface-ui { -moz-box-sizing: border-box; -webkit-box-sizing: border-box; box-sizing: border-box;border-collapse:separate}
surface-aperture { overflow:hidden; display:block; }
')],
  run: function() {
    console.log('surface running ;-)');
    document.body.appendChild(this.dompeer);
    var W,H;
    while (1) {
      using(var Q = dom.eventQueue(window, "resize")) {
        var w = document.documentElement.clientWidth;
        var h = document.documentElement.clientHeight;
        // the W/H check is to debounce redundant resize events sent by e.g. chrome
        if (!this.pendingLayout && (W!=w || H!=h)) { 
          this.layout({type:'wh',w:w,h:h});
          W = w;
          H = h;
        }
        Q.get();
      }
    }
    console.log('surface shut down ;-)');
  }
});

surface.scheduleLayout = function() {
  if (this.pendingLayout) return;
  this.pendingLayout = spawn (hold(0), this.pendingLayout = undefined, 
                              this.layout({type: 'wh', 
                                           w: document.documentElement.clientWidth,
                                           h: document.documentElement.clientHeight}));
};

surface.activated();
*/

console.log("surface.sjs executing rest: #{(new Date())-tt}");
//tt = new Date();
