/*
 * Oni Apollo 'surface' module
 * Modular HTML-based UIs
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
   @module  surface
   @summary Modular HTML-based UIs
   @home    apollo:surface
   @hostenv xbrowser
   @desc    Work-in-progress; to be documented
*/

function log(x) {/*
  var div = document.createElement('div');
  div.innerText = x;
  document.body.appendChild(div);
*/
}

var common = require('apollo:common');
var coll = require('apollo:collection');
var dom = require('apollo:xbrowser/dom');

//----------------------------------------------------------------------
// StyleElement: stylesheet conditioned on unique css classes

var styleClassCounter = 0;

function StyleElement(content, global) {
  if (!global) {
    this.cssClass = "__oni"+(++styleClassCounter);
    content = content.replace(/\s*([^{]*)({[^}]+})/g, 
                              { |str,p1,p2|
                                (p1.charAt(0) == ':') ?
                                "\n ."+this.cssClass+p1+p2
                                :
                                "\n ."+this.cssClass+" "+p1+p2;
                              });
//    content = content.replace(/(?:\s*)(:[^:{]+{[^}]+})/g, "\n ."+this.cssClass+"$1");
  }
  var elem = this.dompeer = document.createElement('style');
  elem.setAttribute('type', 'text/css');
  elem.innerHTML = content;

  this.refCount = 0;
}

StyleElement.prototype = {};

__js StyleElement.prototype.use = function() {
  if (this.refCount++ == 0)
    document.head.appendChild(this.dompeer);
};
__js StyleElement.prototype.unuse = function() {
  if (--this.refCount == 0)
    this.dompeer.parentNode.removeChild(this.dompeer);
};

// XXX deprecated:
var Style = exports.Style = function(content) { return new StyleElement(content); };
var GlobalStyle = exports.GlobalStyle = function(content) { return new StyleElement(content, true); };
// new names:
exports.CSS = Style;
exports.GlobalCSS = GlobalStyle;

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

  function setBaseIntrinsics(intrinsics, elem) {
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

  lifecycle:

   detached --> attached --> displayed/enabled
         [attached()]   enable()

   detached <-- attached <-- displayed/enabled
         [detached()]   disable()

*/
function UIElement() {}
UIElement.prototype = {};

UIElement.prototype.enable = function() {
  if (this.isEnabled) throw new Error("UIElement already enabled");
  this.isEnabled = true;
  coll.each(this.style, {|s| s.use() });
  this.dompeer.style.visibility = 'visible';
  if (this.run) {
    this.stratum = spawn this.run.apply(this);
  }
};

UIElement.prototype.disable = function() {
  if (!this.isEnabled) throw new Error("UIElement already disabled");
  if (this.stratum) {
    this.stratum.abort();
    this.stratum = undefined;
  }
  this.isEnabled = false;
  this.dompeer.style.visibility = 'hidden';
  coll.each(this.style, {|s| s.unuse() });
};

UIElement.prototype.initUIElement = function(attribs) {
  this.dompeer = document.createElement('surface-ui');
  this.dompeer.setAttribute('style', 'display:block;visibility:hidden;position:absolute;');
  this.run = attribs.run;
  this.style = attribs.style || [];
  if (this.style instanceof StyleElement) this.style = [this.style];
  coll.each(this.style, {|s| 
                         if (s.cssClass) this.dompeer.setAttribute('class', s.cssClass+" "+this.dompeer.getAttribute('class')); });
  if (typeof attribs.content !== 'undefined')
    this.dompeer.innerHTML = attribs.content;
};

__js UIElement.prototype.place = function(x,y) {
  this.dompeer.style.left = x+"px";
  this.dompeer.style.top  = y+"px";
};


// returns [mw,mh]
__js UIElement.prototype.getMargins = function() {
  var elem = this.dompeer;
  return [parseInt(getStyle(elem, "marginLeft"))+parseInt(getStyle(elem, "marginRight")),
          parseInt(getStyle(elem, "marginTop"))+parseInt(getStyle(elem, "marginBottom"))];
};

// returns [pl,pr,pt,pb]
__js UIElement.prototype.getPadding = function() {
  var elem = this.dompeer;
  return [parseInt(getStyle(elem, "paddingLeft")),
          parseInt(getStyle(elem, "paddingRight")),
          parseInt(getStyle(elem, "paddingTop")),
          parseInt(getStyle(elem, "paddingBottom"))];
};

// returns [bw,bh]
__js UIElement.prototype.getBorders = function() {
  var elem = this.dompeer;
    // border sizes (including scrollbars):
  return [elem.offsetWidth-elem.clientWidth, elem.offsetHeight-elem.clientHeight];

//  return [parseInt(getStyle(elem, "borderLeftWidth"))+parseInt(getStyle(elem, "borderRightWidth")),
//          parseInt(getStyle(elem, "borderTopWidth"))+parseInt(getStyle(elem, "borderBottomWidth"))];
};

/*

UIElement::layout(type, w, h) -> [w,h]
type = relative: 'w' | 'h' | 'wh' | 
       absolute: 'abs'

UIElement::active == true // <-- element needs relayout when dimensions of container change

*/

//----------------------------------------------------------------------
// BoxElement

// attribs.direction == 'w' for HBox, 'h' for VBox (default)
function BoxElement(attribs) {
  this.initUIElement(attribs);
  this.direction = attribs.direction || 'h';
  this.children  = [];
  coll.each(attribs.children, 
            { |c| 
              if (c instanceof UIElement)
                this.append(c);
              else
                this.append(c[0],c[1]);
            });
}
var Box = exports.Box = function(attribs) { return new BoxElement(attribs); };
var HBox = exports.HBox = function(attribs) { 
  return new BoxElement(common.mergeSettings(attribs, {direction:'w'}));
};
var VBox = exports.VBox = function(attribs) { 
  return new BoxElement(common.mergeSettings(attribs, {direction:'h'}));
}


BoxElement.prototype = new UIElement;

BoxElement.prototype.active = true;

BoxElement.prototype.enable = function() {
  UIElement.prototype.enable.apply(this, arguments);
  coll.each(this.children, { |c| c.elem.enable() });
};

BoxElement.prototype.disable = function() {
  UIElement.prototype.disable.apply(this, arguments);
  coll.each(this.children, { |c| c.elem.disable() });
};

__js BoxElement.prototype.append = function(ui, attribs) {
  attribs || (attribs = {});
//  attribs.w || (attribs.w = "*");
//  attribs.h || (attribs.h = "*");
  this.children.push({
    elem: ui, 
    w: makeConstrainedQuantity("w", attribs),
    h: makeConstrainedQuantity("h", attribs),
    align: attribs.align || "<"
  });
  this.dompeer.appendChild(ui.dompeer);
  ui.parent = this;
  ui.parentIndex = this.children.length-1;
  if (this.isEnabled)
    ui.enable();
  this.invalidate(ui);
};

__js BoxElement.prototype.invalidate = function(child) {
  // XXX be more specific
  surface.scheduleLayout();
};

__js BoxElement.prototype.layoutBox = function(entity, avail, oentity, ostart,
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
    var p = child[entity], c = child[centity];
    // set up initial dimensions:

    // primary dimension:
    if (p.flex > 0) { // flexible in primary direction
      p.val = p.min;
      if (avail) {
        var min = p.val/=p.flex;
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
      var dims = child.elem.layout(child.w.val, child.h.val);
      child.w.val = dims[0]; child.h.val = dims[1]; 
      child.layed_out = true;
    }
    else
      child.layed_out = false;

    // sum up Sc, Sp
    Sp += p.val;
    if (!cavail)
      Sc = Math.max(Sc, c.val);
  }

  // S = space to be distributed to primary direction:
  var S = avail ? avail - Sp : 0;

  // 2. distribute remaining space until none left, or until we run
  // out of flexible children:
//  log("Remaining space: "+S);
  while (S >= 0.1 && A.length > 0) {
    // portion/flex to distribute:
    var P = S/F;
    var m = M; // m: level from which to distribute
    var distributed = 0; // total distributed space in this round
    M = 1e10; 
    for (var i=0; i<A.length; ++i) {
      var child = A[i];
      var l = child[entity];
      // level for this layout:
      var level =  (P + m)*l.flex;
      level = Math.min(l.max, level);
      if (level > l.val) {
        distributed += (level - l.val);
        l.val = level;
        child.layed_out = false; // need to re-layout
      }
      if (l.val >= l.max) {
        // max flex reached
        A.splice(i, 1);
        F -= l.flex;
      }
      var min = l.val/l.flex;
      if (min < M) M = min;
    }
    if (distributed < 0.1) break;
    S -= distributed;
  }

  // 3. adjust complementary dimensions:
  for (i=0; i<B.length; ++i) {
    var child = B[i];
    var c = child[centity];
    if (c.val < Sc) {
      c.val = Math.min(Sc, c.max);
      child.layed_out = false; // need to re-layout
    }
  }
  
  // 4. re-layout & adjust offsets:
  var offset = ostart;
  for (var i=0; i<this.children.length; ++i) {
    var child = this.children[i];
    if (!child.layed_out) {
      child[entity].val = Math.round(child[entity].val);
      child.elem.layout('abs', child.w.val, child.h.val);
      child.layed_out = true;
    }
    // stack up in primary direction:
    child[oentity] = offset;
    if (child.align == "<")
      child[coentity] = costart;
    else if (child.align == ">")
      child[coentity] = costart+Sc-child[centity].val;
    else // align == "|"
      child[coentity] = costart+(Sc-child[centity].val)/2;
    child.elem.place(child.x, child.y);
    offset += child[entity].val;
  }

  // 5. ALL DONE :-)  
  
  if (!avail) avail = Sp;

  return entity == 'w' ? [avail,Sc] : [Sc,avail];
};

BoxElement.prototype.layout = function(type,w,h) {
  var margins = this.getMargins();
  var padding = this.getPadding();
  var borders = this.getBorders(); // including scrollbars
  var elem = this.dompeer;
  var style = elem.style;

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
  

  style.width  = (w + padding[0] + padding[1] + borders[0]) + "px";
  style.height = (h + padding[2] + padding[3] + borders[1]) + "px";  
  return [w+margins[0]+padding[0]+padding[1]+borders[0],h+margins[1]+padding[2]+padding[3]+borders[1]];

};

//----------------------------------------------------------------------
function VScrollBoxElement(attribs) {
  this.initUIElement(attribs);
  this.children = [];
  coll.each(attribs.children, { |c| this.append(c) });
}
var VScrollBox = exports.VScrollBox = function(attribs) { return new VScrollBoxElement(attribs); };

VScrollBoxElement.prototype = new UIElement;

VScrollBoxElement.prototype.active = true;

VScrollBoxElement.prototype.enable = function() {
  UIElement.prototype.enable.apply(this, arguments);
  coll.each(this.children, { |c| c.elem.enable() });
};

VScrollBoxElement.prototype.disable = function() {
  UIElement.prototype.disable.apply(this, arguments);
  coll.each(this.children, { |c| c.elem.disable() });
};

__js VScrollBoxElement.prototype.append = function(ui) {
  this.children.push(ui);
  this.dompeer.appendChild(ui.dompeer);
  ui.parent = this;
  ui.parentIndex = this.children.length-1;
  if (this.isEnabled)
    ui.enable();
 // XXX layout element
  ui.layoutPassive("width");
};

__js VScrollBoxElement.prototype.invalidate = function(child) {
  // nothing to do
};

VScrollBoxElement.prototype.layout = function(type,w,h) {
//  var margins = this.getMargins();
//  var padding = this.getPadding();
//  var borders = this.getBorders(); // including scrollbars
  var elem = this.dompeer;
  var style = elem.style;

  // default sizes:
  if (typeof w == 'undefined') w = 300;
  if (typeof h == 'undefined') h = 500;

  style.width  = w + "px";
  style.height = h + "px";  

//  w -= (margins[0] + padding[0] + padding[1] + borders[0]);
//  h -= (margins[1] + padding[2] + padding[3] + borders[1]);

//  this.w = 
};


//----------------------------------------------------------------------
// HtmlFragmentElement

function HtmlFragmentElement(attribs) {
  this.initUIElement(attribs);
}
HtmlFragmentElement.prototype = new UIElement;

HtmlFragmentElement.prototype.layoutPassive = function(stretch) {
  var elem = this.dompeer;
  var style = elem.style;
  style.position = "static";
  style.display  = "table";
  style[stretch] = "100%";
};

__js HtmlFragmentElement.prototype.layout = function(type,w,h) {
  var margins = this.getMargins();
  var elem = this.dompeer;
  var style = elem.style;

  if (typeof w != 'undefined' && typeof h != 'undefined') {
    // both w and h defined
    style.width  = Math.max(0,w-margins[0]) + "px";
    style.height = Math.max(0,h-margins[1]) + "px";
  }
  else {
    // xxx chrome has a bug whereby absolutely positioned content doesn't obey 
    // box-sizing: border-box
    var old_position = style.position;
    style.position = "static";
    var measure_display = "table";
    if (typeof w == 'undefined' && typeof h == 'undefined') {
      style.width   = "1px";
      style.height  = "1px";
      style.display = measure_display;
      //hold(1000);
      w = elem.offsetWidth + margins[0];
      h = elem.offsetHeight + margins[1];
      style.display = "block";
      style.width  = Math.max(0,w-margins[0]) + "px";
      style.height = Math.max(0,h-margins[1]) + "px";
    }
    else if (typeof w != 'undefined' && typeof h == 'undefined') {
      style.width   =  Math.max(0,w-margins[0]) + "px";
      style.height  = "1px";
      style.display = measure_display;
      //hold(1000);
      h = elem.offsetHeight + margins[1];
      style.display = "block";
      style.height = Math.max(0,h-margins[1]) + "px";
    }
    else { //if (typeof w == 'undefined' && typeof h != 'undefined') {
      style.width   = "1px";
      style.height  = Math.max(0,h-margins[1]) + "px";
      style.display = measure_display;
      //hold(1000);
      w = elem.offsetWidth + margins[0];
      style.display = "block";
      style.width  = Math.max(0,w-margins[0]) + "px";
    }
    //hold(1000);
    style.position = old_position;
  }
  return [w,h];
};

exports.Html = function(attribs) { return new HtmlFragmentElement(attribs); };


//----------------------------------------------------------------------

var surface = exports.surface = Box({
  style: 
  [ GlobalStyle('
body { overflow:hidden; margin:0px;}
*  { -moz-box-sizing: border-box; -webkit-box-sizing: border-box; box-sizing: border-box;border-collapse:separate}
')],
  run: function() {
    console.log('surface running ;-)');
    document.body.appendChild(this.dompeer);
    while (1) {
      using(var Q = dom.eventQueue(window, "resize")) {
        var w = document.documentElement.clientWidth;
        var h = document.documentElement.clientHeight;
        this.dompeer.setAttribute('style', 'position:absolute;width:'+w+'px;height:'+h+'px;');
        if (!this.layoutStratum) 
          this.layout('wh',w,h);
        Q.get();
      }
    }
    console.log('surface shut down ;-)');
  }
});

surface.scheduleLayout = function() {
  if (this.layoutStratum) return;
  this.layoutStratum = spawn (hold(0), this.layoutStratum = undefined, 
                              this.layout(document.documentElement.clientWidth,document.documentElement.clientHeight));
};

surface.enable();

