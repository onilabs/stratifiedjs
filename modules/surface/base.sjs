/*
 * Oni Apollo 'surface/base' module
 * Lightweight cross-browser UI toolkit - Core functionality
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
   @module  surface/base
   @summary Lightweight cross-browser UI toolkit - Core functionality (unstable work-in-progress)
   @home    sjs:surface/base
   @hostenv xbrowser
   @desc    Work-in-progress
*/
//TODO: document

var tt = new Date();
var sys = require('builtin:apollo-sys');

waitfor {
  var { each, isStream, toArray, join, map, indexed } = require('../sequence');
}
and {
  var { remove } = require('../array');
}
and {
  var dom = require('../xbrowser/dom');
}
and {
  var events = require('../events');
}
and {
  var func = require('../function');
}
and {
  var { sanitize } = require('../string');
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
    //var tt = new Date();
    var blocks = parseCSSBlocks(content);
    //console.log("parse style=#{(new Date())-tt}ms");    

    function processBlock(b,lvl,cssClass) {
      return b .. map(function(b) {
        if (!Array.isArray(b))
          return b; // a decl
        else {
          if (lvl) {
            throw new Error("Invalid CSS: invalid nesting of '#{b[0]}{#{b[1].join(' ')}}'");
          }
          if (b[0].charAt(0) != '@') {
            // fold cssClass into selector; if selector starts with '&' append without space (
            // e.g. a class selector that should apply to the top-level)
            b[0] = b[0].split(',') .. 
              map(s => s.charAt(0) == '&' ? "#{cssClass}#{s.substring(1)}" : "#{cssClass} #{s}") .. 
              join(',');
            return "#{b[0]} { #{processBlock(b[1],lvl+1,cssClass)} }";
          }
          else if (b[0].indexOf('@global') == 0) {
            // apply style globally (i.e. don't fold cssClass into selector)
            return processBlock(b[1],lvl,'');
          }
          else if (b[0].indexOf('keyframes') != -1) {
            // @keyframe ... don't pass through cssClass
            return "#{b[0]} { #{processBlock(b[1],lvl,'')} }";
          }
          else {
            // generic '@'-rule (maybe a media query)
            return "#{b[0]} { #{processBlock(b[1],lvl,cssClass)} }";
          }
        }
      }) .. join('\n');
    }
    //tt = new Date();
    content = processBlock(blocks, 0, '.'+cssClass);
    //console.log("process style=#{(new Date())-tt}ms");
  }
  var elem = this.dompeer = document.createElement('style');
  elem.setAttribute('type', 'text/css');
  if (elem.styleSheet) {
    // IE
    elem.styleSheet.cssText = content;
  } else {
    elem.appendChild(document.createTextNode(content));
  }

  this.refCount = 0;
};

__js StyleElement.use = function() {
  if (this.refCount++ == 0)
    (document.head || document.getElementsByTagName("head")[0] /* IE<9 */).appendChild(this.dompeer);
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
   @function isUIElement
   @param {Object} [obj]
   @summary Returns `true` if `obj` is a [::UIElement], `false` otherwise.
*/
function isUIElement(obj) {
  return UIElement.isPrototypeOf(obj);
}
exports.isUIElement = isUIElement;

/**
   @function UIElement.init
   @summary Called by constructor functions to initialize UIElement objects
   @param   {Object} [attribs] Hash with attributes
   @attrib  {optional Function} [mechanism] Function that will 
               be spawned when the element has been activated and aborted when 
               the element is deactivated
               (see [::UIElement::activated] & [::UIElement::deactivated]).
               See description below for more information.
   @attrib  {optional ::StyleElement|String|Array} [style] [::StyleElement] 
               (or array of elements) to apply to this UIElement. If a string is given, it will be converted to a StyleElement using [::CSS].
   @desc
      ### Mechanisms
      
      A mechanism is a function that will be spawned automatically by 
      [::UIElement::activated] and aborted (if it is still running) by
      [::UIElement::deactivated].

      A mechanism function has the signature `f()`, and will be called with `this` set
      to the `UIElement`.
*/
UIElement.init = function(attribs) {
  if (attribs.debug) {
    this.debugtags = attribs.debug.tags || "";
    this.debugid = attribs.debug.id || "DEBUG";
  }
  else {
    this.debugtags = "";
    this.debugid = "";
  }
  this.mechanism = attribs.mechanism || func.nop;
  this.style = attribs.style || [];
  if (!Array.isArray(this.style)) this.style = [this.style];
  indexed(this.style) .. each { 
    |style| 
    var [i,s] = style;
    if (typeof s == 'string') this.style[i] = CSS(s);
  }
};

/**
   @variable UIElement.dompeer
   @summary The root DOM node of this UIElement
*/

/**
   @function UIElement.debug
   @summary Check if debugging is enabled for the given tag 
   @param {String} [tag] Debugging tag
   @return {Boolean} 
*/
UIElement.debug = function(tag) { return this.debugtags.indexOf(tag)!=-1; };

/**
   @function UIElement.select1
   @summary Selects first matching child of this UIElement's dompeer
   @param {String} CSS selector
   @return {DOMElement|null}
*/
UIElement.select1 = function(selector) { 
  /* return dom.matchesSelector(this.dompeer, selector) ? 
    this.dompeer : this.dompeer.querySelector(selector); */
  return this.dompeer.querySelector(selector);
};

/**
   @function UIElement.select
   @summary Select all matching DOM children of this UIElement's dompeer
   @param {String} CSS selector
   @return {Array of DOM nodes}
*/
UIElement.select = function(selector) { 
  var rv = toArray(this.dompeer.querySelectorAll(selector));
  /* if (dom.matchesSelector(this.dompeer, selector))
    rv.unshift(this.dompeer);
  */
  return rv;
};

/**
   @function UIElement.waitforEvent
   @summary Waits for an event on the element's dompeer or one of its children
   @param {String} [event] String containing one or more space-separated DOM event names. E.g.: "click mouseover". 
   @param {optional String} [selector=null] CSS selector to match children of this element's dompeer.
   @return {DOMEvent}
   @desc
      * Blocks until the given `event` occurs on a DOM child mached by `selector`, or, if `selector is `null`, on the [::UIElement::dompeer] of this UIElement.
      * Stops further propagation of the event
      * To listen for an event during the capturing phase, prefix the event name with a '!'
*/
UIElement.waitforEvent = function(event, selector, filter) {
  var ev;
  if (!selector)
    ev = events.wait(this.dompeer, event, filter);
  else
    ev = events.wait(this.dompeer, event,
                          ev => dom.findNode(selector, ev.target, this.dompeer) && (!filter || filter(ev)));
  dom.stopEvent(ev);
  return ev;
};

/**
   @function UIElement.waitforCommand
   @summary Wait for a click on a DOM child (or one of its descendants) with a 'data-command' attribute
   @return {String} Value of the 'data-command' attribute of the clicked DOM element
   @desc

     - When `waitforCommand` registers a matching click, further
       processing of the event (propagation, bubbeling and default action of
       given event) will be stopped.  
*/
mixinCommandAPI(UIElement);

/**
   @function UIElement.activate
   @summary Called when this UIElement is about to be attached (directly or indirectly) 
   to a root element. When attaching to a container that is active, this method will 
   (by design) be called before [::UIElement:attached] 
*/
UIElement.activate = function() {
  if (this.isActivated) throw new Error("UIElement already activated");
  this.style .. each {|s| s.use() };
};

/**
   @function UIElement.activated
   @summary Called when this UIElement has been attached (directly or indirectly) to a root element
*/
UIElement.activated = function() {
  if (this.isActivated == 2) throw new Error("UIElement already activated");
  this.isActivated = 1;
  //abc this.dompeer.style.visibility = 'visible';
  if (this.mechanism) {
    this.stratum = spawn this.mechanism(this);
  }
  /*
     A note on the usage of "isActivated":

     isActivated can be false, 1, or 2

     false means we're not activated
     1 means we've called 'activate' on ourselves and our children, and are now
       calling 'activated'
     2 means we've called 'activated'

     The reason for distinguishing between 1 and 2 is that we need to prevent 
     any children that are added as part of mechanisms (which are executed in 'activated')
     from being activated before our mechanism is activated.

  */
  this.isActivated = 2;
};

/**
   @function UIElement.deactivated
   @summary Called when this UIElement has become detached from the root element
*/
UIElement.deactivated = function() {
  if (!this.isActivated) throw new Error("UIElement already deactivated");
  if (this.stratum) {
    this.stratum.abort();
    this.stratum = undefined;
  }
  this.isActivated = false;
  //abc this.dompeer.style.visibility = 'hidden';
  this.style .. each {|s| s.unuse() };
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
   @function UIContainerElement.remove
   @purevirtual
   @summary Remove a UIElement from this container
   @param {::UIElement} [child] The child to be removed
*/

/**
   @function UIContainerElement.append
   @purevirtual
   @summary Append a UIElement to this container
   @param {::UIElement|String} [child] The child to be appended
   @param {optional Object} [attribs] Optional layout attributes (see UIContainer subclasses)
   @desc
     - If a string is passed as parameter `child`, it will be wrapped by [::Html]
*/

/**
   @function UIContainerElement.withUI
   @altsyntax withUI(ui, [append_attribs]) { |ui| ... }
   @summary Append a UI element, perform a function, and remove the UI element
   @param {::UIElement|String|Quasi|Array} [ui] UI element to append to `container`
   @param {optional Object} [append_attribs] Optional attribute object to pass to [::UIContainerElement::append]   
   @param {Function} [f] Function to execute; will be passed `ui` as parameter
   @desc
     - If a String, Quasi, Array or [../sequence::Stream] are passed as `ui`, they will be converted to a [::HtmlFragmentElement]
*/
UIContainerElement.withUI = function() {
  var args = toArray(arguments);
  args.unshift(this);
  return exports.withUI.apply(this, args);
};

//----------------------------------------------------------------------
// ChildManagement mixin

var ChildManagement = {
  init: function(attribs) {
    this.children = [];
  },

  remove: function(ui) {
    if (! remove(this.children, ui)) return false;
    ui.dompeer.parentNode.removeChild(ui.dompeer);
    if (ui.isActivated)
      ui.deactivated();
    ui.detached();
    return true;
  },

  replaceAll: function(new_children) {
    this.children .. each { |c| this.remove(c) };
    new_children .. each { |c| this.append(c); };
  },

  activate: function() {
    this.children .. each { |c| c.activate() };
  },

  activated: function() {
    this.children .. each { |c| c.activated() };
  },

  deactivated: function() {
    this.children .. each { |c| c.deactivated() };
  },

  mixinto: function(target) {
    target.init = func.seq(target.init, this.init);
    target.remove = this.remove;
    target.replaceAll = this.replaceAll;
    target.activate = func.seq(target.activate, this.activate);
    target.activated = func.seq(target.activated, this.activated);
    target.deactivated = func.seq(target.deactivated, this.deactivated);
  }
};



//----------------------------------------------------------------------
// HtmlFragmentElement
/**
   @class   HtmlFragmentElement
   @summary Generic HTML UI element
   @inherit ::UIContainerElement
   @variable HtmlFragmentElement
*/

__js var HtmlFragmentElement = exports.HtmlFragmentElement = Object.create(UIContainerElement);

ChildManagement.mixinto(HtmlFragmentElement);

var makeDomNode = (function() {
  /* convert HTML string -> dom node (used in HtmlFragmentElement).
   * This function adapted from JQuery code (src/manipulation.js),
   * which is distributed under the MIT licence, and is
   * Copyright 2013 jQuery Foundation and other contributors
   * http://jquery.com/
   */
  var rtagName = /<([\w:]+)/;
  var wrapMap = {
    // Support: IE 9
    option: [ 1, "<select multiple='multiple'>", "</select>" ],

    thead: [ 1, "<table>", "</table>" ],
    tr: [ 2, "<table><tbody>", "</tbody></table>" ],
    td: [ 3, "<table><tbody><tr>", "</tr></tbody></table>" ],
  };

  // Support: IE 9
  wrapMap.optgroup = wrapMap.option;

  wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.col = wrapMap.thead;
  wrapMap.th = wrapMap.td;

  return function(html, substitutePlaceholders) {
    var elem = document.createElement('surface-ui');
    if(html === undefined) return elem;
    html = html.trim();

    var tag = ( rtagName.exec( html ) || ["", ""] )[ 1 ].toLowerCase();
    var wrap = wrapMap[ tag ];
    if (wrap) {
      elem.innerHTML = wrap[ 1 ] + html + wrap[ 2 ];
      if (substitutePlaceholders) substitutePlaceholders(elem);
      var initial_elem = elem;
      var j = wrap[ 0 ];
      while ( j-- ) {
        elem = elem.firstChild;
      }
      if (elem.childNodes.length == 1) {
        elem = elem.firstChild;
      } else {
        // html generated multiple tags, append them to initial_elem and remove wrapper
        while (elem.firstChild) {
          initial_elem.appendChild(elem.firstChild);
        }
        elem = initial_elem;
        elem.removeChild(elem.firstChild);
      }
    } else {
      // no wrapping required:
      elem.innerHTML = html;
      if (substitutePlaceholders) substitutePlaceholders(elem);

      // remove the surrogate if there is only one child.
      // We do this, so that CSS rules work more predictably (so that there are no
      // intermediate 'surface-ui' tags that have to be worked into CSS rules).
      if (elem.childNodes.length == 1 && elem.firstChild.nodeType == 1 /* ELEMENT_NODE */) {
        elem = elem.firstChild;
      }
    }
    return elem;
  };
})();


// HtmlFragmentElement.init needs to come *after* mixing in ChildManagement, so that
// this.children is initialized

/**
   @function HtmlFragmentElement.init
   @summary Called by constructor function to initialize HtmlFragmentElement object
   @param {Object} [attribs] Hash with attributes. Will also be passed to [::UIContainerElement::init], and understands all the attributes listed there.
   @attrib {optional String|Quasi|Array|../sequence::Stream} [content=''] HTML content for this HtmlFragmentElement
   @attrib {optional Array} [subelems] Elements that will be statically inserted into the HTML content. Deprecated; use Quasi mechanism instead.
*/
HtmlFragmentElement.init = func.seq(
  HtmlFragmentElement.init, 
  function(attribs) {
    
    if (attribs.content instanceof Element) {
      // content is a DOM object. This is e.g. used by the
      // to create the RootElement, where attribs.content is set to 'document.body'
      this.dompeer = attribs.content;
    }
    else {
      if (sys.isQuasi(attribs.content) || Array.isArray(attribs.content) || 
          isStream(attribs.content)) {
        // Complex Content:

        // * a Quasi, e.g.:
        //   Html(`<h1>#{name}</h1>#{Button('click')}`)
        //   -> content = { parts:['<h1>', name, '</h1>', Button] }
        //   strategy: build html from the parts with string values at odd
        //   indices sanitized. If there is a UIElement at at odd index, we
        //   create a placeholder for it, which we replace later with the
        //   element's dompeer.
        // * an Array: treat like Quasi, but treat every element like
        //   an 'odd' indexed value (i.e. sanitized).

        // We'll parse recursively; i.e. we allow quasis|Arrays|Elements at odd indexes. 
        // we'll also add the UIElements to our child array. Towards the end 
        // of init(.) we'll make sure attached() is called on them. 
        
        var placeholders = [];
        var html = '';
        
        function parseArray(arr, quasi) {
          for (var i=0,l=arr.length; i<l; ++i) {
            var part = arr[i];
            if (!quasi || i%2) {
              if (UIElement.isPrototypeOf(part)) {
                var tag = part.dompeer.tagName;
                html += "<#{tag} id='__oni_placeholder#{placeholders.length}'></#{tag}>";
                placeholders.push(part);
              }
              else if (Array.isArray(part) || isStream(part)) {
                parseArray(toArray(part), false);
              }
              else if (sys.isQuasi(part)) {
                parseArray(part.parts, true);
              }
              else {
                html += sanitize(part);
              }
            }
            else 
              html += part;
          }
        }

        if (sys.isQuasi(attribs.content))
          parseArray(attribs.content.parts, true);
        else
          parseArray(toArray(attribs.content), false);
        
        this.dompeer = makeDomNode(html) { |rootNode|
          // replace UIElement placeholders with UIElements:
          indexed(placeholders) .. each  {
            |placeholder|
            var [idx, part] = placeholder;
            var old = rootNode.querySelector("#__oni_placeholder#{idx}");
            if (!old) {
              // placeholder not found in the dom... probably caused by
              // user-provided html not being valid
              throw new Error("Invalid HTML: #{html}");
            }
            old.parentNode.replaceChild(part.dompeer, old);
            this.children.push(part);
          }
        }

      }
      else {
        // content is a string (or will be coerced to one); 
        //XXX sanitize it!! - This might break existing surface code

        // create a surrogate dompeer: 
        this.dompeer = makeDomNode(attribs.content);
      }
    }

    // set styles on our dompeer:
    this.style .. each {
      |s|
      if (s.cssClass) this.dompeer.classList.add(s.cssClass)
    }

    // now that we are *nearly* fully initialized, we need to make
    // sure that any children we've added for placeholders become properly attached:
    this.children .. each {
      |c|
      c.attached(this);
    }

    // finally, the deprecated subelems handling
    if (attribs.subelems)
      attribs.subelems .. each {
        |e|
        if (UIElement.isPrototypeOf(e))
          this.append(e);
        else
          this.selectContainer(e.container ? e.container : "##{e.id}").append(e.elem);
      }
  }
);


HtmlFragmentElement.append = function(ui, insertionpoint) {
  if (typeof ui == 'string' || Array.isArray(ui) || isStream(ui) || sys.isQuasi(ui)) ui = exports.Html(ui);
  var parent;
  if (insertionpoint) {
    parent = this.select1(insertionpoint);
    if (!parent) throw new Error("Cannot find insertion point '#{insertionpoint}'");
  }
  else
    parent = this.dompeer;
  this.children.push(ui);
  if (this.isActivated)
    ui.activate();
  parent.appendChild(ui.dompeer);
  ui.attached(this);
  if (this.isActivated == 2)
    ui.activated();
  //this.invalidate(ui);
};

/**
   @function HtmlFragmentElement.selectContainer
   @summary Obtain a container to which [::UIElement] objects can be appended
   @param {String} CSS selector
   @return {::UIContainerElement}
*/
HtmlFragmentElement.selectContainer = function(selector) {
  if (!this.insertionPoints) this.insertionPoints = {};
  var ip = this.insertionPoints[selector];
  if (!ip) {
    ip = Object.create(this);
    var parent = this;
    ip.append = function(ui) { return parent.append(ui, selector); };
    ['activate','activated','deactivated','attached','detached','selectContainer'] .. each {
      |method|
      ip[method] = ip[method].bind(parent);
    }
    this.insertionPoints[selector] = ip;
  }
  
  return ip;
};

/**
   @function Html
   @altsyntax Html(content)
   @summary Construct a [::HtmlFragmentElement]
   @param   {Object} [attribs] Object with attributes
   @attrib  {String|Array|../sequence::Stream|Quasi} [content] HTML content
   @attrib {optional ::StyleElement|String|Array} [style]
   @attrib {Function} [mechanism] Mechanism function
   @attrib {Array} [subelems] Array of {container,elem} subelement objects
   @return  {::HtmlFragmentElement}
*/
function Html(attribs) { 
  if (typeof attribs != 'object' || Array.isArray(attribs) || isStream(attribs) || sys.isQuasi(attribs))
    attribs = { content: attribs }
  var obj = Object.create(HtmlFragmentElement);
  obj.init(attribs); 
  return obj;
};
exports.Html = Html;

/**
   @function Mechanism
   @altsyntax content .. Mechanism(m)
   @summary Associates a mechanism with the given content
   @param {String|Array|../sequence::Stream|Quasi} [content] HTML content
   @param {Function} [m] Mechanism function
   @return {::HtmlFragmentElement}
*/
function Mechanism(content, m) {
  return Html({content:content, mechanism: m});
};
exports.Mechanism = Mechanism;

/**
   @function Style
   @altsyntax content .. Style(m)
   @summary Associates CSS styling with the given content
   @param {String|Array|../sequence::Stream|Quasi} [content] HTML content
   @param {CSS|String|Array} [style] Style to apply to content
   @return {::HtmlFragmentElement}
*/
function Style(content, style) {
  return Html({content:content, style: style});
};
exports.Style = Style;


//----------------------------------------------------------------------
// Root element

/**
   @class RootElement
   @summary Root layout container
   @inherit ::HtmlFragmentElement
*/
__js var RootElement = Object.create(HtmlFragmentElement);

RootElement.init = function(attribs) {
  HtmlFragmentElement.init.apply(this, [attribs]);
};

ChildManagement.mixinto(RootElement);

RootElement.append = function(ui) {
  if (typeof ui == 'string' || Array.isArray(ui) || isStream(ui) || sys.isQuasi(ui)) ui = exports.Html(ui);
  this.children.push(ui);
  if (this.isActivated)
    ui.activate();
  this.dompeer.appendChild(ui.dompeer);
  ui.attached(this);
  if (this.isActivated == 2)
    ui.activated();
  //this.layoutChild(ui);
};


/**
   @variable root
   @summary  [::RootElement] instance for the current main browser window 
*/
__js var root = exports.root = Object.create(RootElement);

root.init({
  style: 
  [ GlobalCSS('
/*body { overflow:hidden; margin:0px;}*/
surface-ui, surface-aperture { display:block; -moz-box-sizing: border-box; -webkit-box-sizing: border-box; box-sizing: border-box;border-collapse:separate;}
surface-aperture { overflow:hidden; }
')],
  content: document.body
});
root.activate();
root.activated();

//----------------------------------------------------------------------
// mixins


/**
   @function mixinCommandAPI
   @param {::UIElement} [elem] Element to mix the Command API into
   @param {optional String} [attrib='data-command'] Name of DOM attribute
   @param {optional String} [method_name='waitforCommand'] Name of method to install
   @summary Installs a 'Command API' on `elem` (see description for details)
   @desc
     Installs the method `method_name` on `elem`. 

     `elem[method_name]()` waits for a click on a DOM child (or one of its 
     descendants) that has the given DOM attribute. It returns the value of the attribute.
*/
function mixinCommandAPI(elem, attrib, method_name) {
  attrib = attrib || 'data-command';
  method_name = method_name || 'waitforCommand';
  elem[method_name] = function() {
    var me = this;
    var ev = events.wait(this.dompeer, 'click', function(ev) {
      if ((ev.node = dom.findNode("[#{attrib}]", ev.target, me.dompeer))) {
        dom.stopEvent(ev);
        return true;
      }
      return false;
    });
    return ev.node.getAttribute(attrib);
  };
};
exports.mixinCommandAPI = mixinCommandAPI;

//----------------------------------------------------------------------
// utilities

/**
   @function withUI
   @altsyntax withUI(container, ui, [append_attribs]) { |ui| ... }
   @summary Append a UI element to a container, perform a function, and remove the UI element
   @param {::UIContainerElement} [container] The container
   @param {::UIElement|String|Quasi|Array} [ui] UI element to append to `container`
   @param {optional Object} [append_attribs] Optional attribute object to pass to [::UIContainerElement::append]   
   @param {Function} [f] Function to execute; will be passed `ui` as parameter
   @desc
     - If a String, Quasi, Array or [../sequence::Stream] are passed as `ui`, they will be converted to a [::HtmlFragmentElement]
*/
exports.withUI = function(/*container, ui, [append_attribs], f*/) {
  var container = arguments[0];
  var args = Array.prototype.slice.call(arguments, 1);
  var f = args.pop();
  // ensure ui is a UIElement:
  if (typeof args[0] == 'string' || Array.isArray(args[0])  || isStream(args[0]) || sys.isQuasi(args[0]))
    args[0] = exports.Html(args[0]);
  container.append.apply(container, args);
  try {
    f(args[0]);
  }
  finally {
    container.remove(args[0]);
  }
}


console.log("surface.sjs executing rest: #{(new Date())-tt}");
//tt = new Date();
