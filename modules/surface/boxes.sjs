// box-layout components. work-in-progress

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
// BoxElement

/*WIP - Not in official documentation yet
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

/*WIP - Not in official documentation yet
   @function HBox
   @summary Construct a horizontally-stacking [::BoxElement]
   @param   [attribs] ...
*/
__js var HBox = exports.HBox = function(attribs) { 
  return Box(merge(attribs, {direction:'w'}));
};
/*WIP - Not in official documentation yet
   @function VBox
   @summary Construct a vertically-stacking [::BoxElement]
   @param   [attribs] ...
*/
__js var VBox = exports.VBox = function(attribs) { 
  return Box(merge(attribs, {direction:'h'}));
}

/*WIP - Not in official documentation yet
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
  if (typeof ui == 'string') ui = exports.Html(ui);
  attribs || (attribs = {});
//  attribs.w || (attribs.w = "*");
//  attribs.h || (attribs.h = "*");
  ui.parentSlot = { 
    w: makeConstrainedQuantity("w", attribs),
    h: makeConstrainedQuantity("h", attribs),
    align: attribs.align || "<"
  };
  this.children.push(ui);
  if (this.isActivated)
    ui.activate();
  this.dompeer.appendChild(ui.dompeer);
  ui.attached(this);
  if (this.isActivated == 2)
    ui.activated();
  this.invalidate(ui);
};

__js BoxElement.invalidate = function(child) {
  // XXX be more specific
  root.scheduleLayout();
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
/*WIP - Not in official documentation yet
   @class   VScrollBoxElement
   @summary Vertically scrolling list
   @inherit ::UIContainerElement
   @variable VScrollBoxElement
*/
__js var VScrollBoxElement = exports.VScrollBoxElement = Object.create(UIContainerElement);


/*WIP - Not in official documentation yet
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
  if (typeof ui == 'string') ui = exports.Html(ui);
  this.children.push(ui);
  if (this.isActivated)
    ui.activate();
  this.dompeer.appendChild(ui.dompeer);
  ui.attached(this);
  if (this.isActivated == 2) {
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
    coll.each(this.children) {|c| c.layout(child_spec)};
  else // only lay out active children:
    coll.each(this.children) {|c| if (c.active) c.layout(child_spec)};

  return layout_spec;
};


//----------------------------------------------------------------------
// Things that need to be mixed into UIElement: (or a new subclass of UIElement)

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
   @variable UIContainerElement.active
   @summary see [::UIElement.active]
   @desc 
     Set to `true` for UIContainerElements
*/
UIContainerElement.active = true;


//----------------------------------------------------------------------
// Things that need to be mixed into RootElement:

/**
   @class RootElement
   @summary Root layout container
   @inherit ::UIContainerElement
   @desc
     The `RootElement` lays out active and passive elements separately:

       * active elements will be layed out as 'wh'

       * passive elements will be layed out as 'flow'
*/


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

RootElement.invalidate = function(child) {
//XXX nothing to do?
};




//----------------------------------------------------------------------
// animation aperture:

/*WIP - Not in official documentation yet
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
// Things that need to be mixed into HtmlFragmentElement:

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

HtmlFragmentElement.invalidate = function(child) { /* XXX */ };

