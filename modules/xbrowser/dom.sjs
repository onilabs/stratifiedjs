/*
 * StratifiedJS 'xbrowser/dom' module
 * DOM utilities
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.20.0-development'
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2010-2013 Oni Labs, http://onilabs.com
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
  @module    xbrowser/dom
  @summary   Basic DOM functionality
  @home      sjs:xbrowser/dom
  @hostenv   xbrowser
  @desc
     Note: This module will automatically load the [./dom-shim::] module on 
     non-conformant browsers.
*/

var sys = require('builtin:apollo-sys');
if (sys.hostenv != 'xbrowser') 
  throw new Error('the dom module only runs in an xbrowser environment');

var { map, toArray, find } = require('../sequence');

// see if we need to load the shim:
if (typeof document !== "undefined" && !("classList" in document.createElement("a")))
  require('./dom-shim');

/**
  @function addListener
  @summary Cross-platform event helper. Adds event listener.
  @param {DOMElement} [elem] DOM element to set handler on.
  @param {String} [type] Event type (e.g. 'click', 'mousemove').
  @param {Function} [handler] Handler function.
  @desc
     * By default the event listener will fire in the bubbling phase.
     * On modern browsers (>IE8, FF, Safari, Chrome), to get the listener to fire during 
       the capture phase, prefix the event name with '!':

          `dom.addListener(elem, '!click', handler); // fires during capture phase`
     
*/
__js {
  function addListener(elem, type, handler) {
    var capture = false;
    if (type.charAt(0) == "!") {
      type = type.substr(1);
      capture = true;
    }
    if (elem.addEventListener)
      elem.addEventListener(type, handler, capture);
    else // <=IE8 XXX need capture backfill
      elem.attachEvent("on"+type, handler);
  }
  exports.addListener = addListener;
}

/**
  @function removeListener
  @summary Cross-platform event helper. Removes event listener.
  @param {DOMElement} [elem] DOM element to remove handler from.
  @param {String} [type] Event type (e.g. 'click', 'mousemove').
  @param {Function} [handler] Handler function.
*/
__js {
  function removeListener(elem, type, handler) {
    var capture = false;
    if (type.charAt(0) == "!") {
      type = type.substr(1);
      capture = true;
    }
    if (elem.removeEventListener)
      elem.removeEventListener(type, handler, capture);
    else // <=IE8 XXX need capture backfill
      elem.detachEvent("on"+type, handler);
  }
  exports.removeListener = removeListener;
}

/**
  @function  eventTarget
  @summary Cross-platform event helper. Retrieves event target.
  @param {DOMEvent} [ev] DOM event object.
  @return {DOMElement} Event target (ev.srcElement on IE, ev.target elsewhere)
*/
__js exports.eventTarget = function(ev) {
  return ev.target || ev.srcElement;
};

/**
  @function pageX
  @summary Cross-platform event helper. Returns page coordinate of event.
  @param {DOMEvent} [ev] DOM event object.
  @return {Integer}
  @desc 
     **Note:** Also works for touch events
*/
__js {
  exports.pageX = function(ev) {
    if (ev.touches) ev = ev.touches[0];
    if (ev.pageX !== undefined) return ev.pageX;
    return ev.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
  };
}

/**
  @function pageY
  @summary Cross-platform event helper. Returns page coordinate of event.
  @param {DOMEvent} [ev] DOM event object.
  @return {Integer}
  @desc 
     **Note:** Also works for touch events
*/
__js exports.pageY = function(ev) {
  if (ev.touches) ev = ev.touches[0];
  if (ev.pageY !== undefined) return ev.pageY;
  return ev.clientY + document.body.scrollTop + document.documentElement.scrollTop;
};

/**
  @function preventDefault
  @summary Cross-platform event helper. Cancels default action of given event.
  @param {DOMEvent} [ev] DOM event object.
*/
__js exports.preventDefault = function(ev) {
  if (ev.preventDefault) {
    ev.preventDefault();
  }
  else {
    // IE
    ev.returnValue = false;
  }
};

/**
  @function stopPropagation
  @summary Cross-platform event helper. Cancels propagation and bubbling of the given event
  @param {DOMEvent} [ev] DOM event object.
*/
__js exports.stopPropagation = function(ev) {
  if (ev.stopPropagation) {
    ev.stopPropagation();
  }
  else {
    // IE
    ev.cancelBubble = true;
  }
};


/**
  @function stopEvent
  @summary Cross-platform event helper. Cancels propagation, bubbling and default action of given event.
  @param {DOMEvent} [ev] DOM event object.
*/
__js {
  exports.stopEvent = function(ev) {
    exports.preventDefault(ev);
    exports.stopPropagation(ev);
  };
}

//----------------------------------------------------------------------


var _pendingScripts = {};
var _loadedScripts = {};

/**
  @function  script
  @summary   Load and execute a plain JavaScript file.
  @param {URLSPEC} [url] Request URL (in the same format as accepted by [url::build])
  @desc
    It is safe to call this function simultaneously from several strata,
    even for the same URL: The given URL will only be loaded **once**, and
    all callers will block until it is loaded.
    
    If a browser supports the error event for script tags, 
    this function will throw if it fails to load the URL.

    ### Example:

        var dom = require("sjs:xbrowser/dom");
        dom.script("http://code.jquery.com/jquery.js");
        jQuery("body").css({background:"red"});
*/
exports.script = function(/*url, queries*/) {
  var url = sys.constructURL(arguments);
  if (_loadedScripts[url])
  return;
  var hook = _pendingScripts[url];
  if (hook != null) {
    waitfor(var error) {
      hook.push(resume);
    }
    if (error) {
      throw error;
    }
    //    retract {
    // XXX could remove resume function from hook here
    //    }
  }
  else {
    // we're the initial requester
    waitfor() {
      var elem = document.createElement("script");
      var hook = [];
      var error;
      _pendingScripts[url] = hook;
      
      function listener(e) {
        if (e.type == "error") {
          error = "Could not load script: '" + url + "'."
        }
        resume();
      }
      
      function listenerIE(e) {
        if (e.srcElement.readyState == "loaded" ||
            e.srcElement.readyState == "complete") {
          hold(0);
          resume();
        }
      }
      
      if (elem.addEventListener) {
        elem.addEventListener("load", listener, false);
        elem.addEventListener("error", listener, false);
      }
      else {
        // IE
        elem.attachEvent("onreadystatechange", listenerIE);
      }
      
      // kick off the load:
      document.getElementsByTagName("head")[0].appendChild(elem);
      elem.src = url;
    }
    retract {
      _pendingScripts[url] = null;
    }
    finally {
      if (elem.removeEventListener) {
        elem.removeEventListener("load", listener, false);
        elem.removeEventListener("error", listener, false);
      }
      else {
        elem.detachEvent("onreadystatechange", listenerIE);
      }
    }

    _pendingScripts[url] = null;
    _loadedScripts[url] = true;
    for (var i = 0; i < hook.length; ++i) {
      hook[i](error);
    }
    if (error) {
      throw error;
    }
  }
};

/**
   @function addCSS
   @summary Programatically add CSS to current document
   @param {String} [cssCode] CSS code.
   @desc
     Borrowed from [tomhoppe.com](http://www.tomhoppe.com/index.php/2008/03/dynamically-adding-css-through-javascript/)
*/
__js exports.addCSS = function(cssCode) {
  var styleElement = document.createElement("style");
  styleElement.type = "text/css";
  if (styleElement.styleSheet) {
    styleElement.styleSheet.cssText = cssCode;
  } 
  else {
    styleElement.appendChild(document.createTextNode(cssCode));
  }
  document.getElementsByTagName("head")[0].appendChild(styleElement);
}

/**
  @function css
  @summary Load a CSS file into the current document.
  @param {URLSPEC} [url] Request URL (in the same format as accepted by [url::build])
*/
__js exports.css = function (/* url, queries */) {
  url = sys.constructURL(arguments);
  var elem = document.createElement("link");
  elem.setAttribute("rel", "stylesheet");
  elem.setAttribute("type", "text/css");
  elem.setAttribute("href", url);
  document.getElementsByTagName("head")[0].appendChild(elem);
};

//----------------------------------------------------------------------

/**
   @function traverseDOM
   @altsyntax traverseDOM(from, to) { |e| ... }
   @summary Do a bottom-up DOM traversal beginning at element `from` up to (exclusively) element(s) `to`.
   @param {DOMElement} [from] DOM element at which to start traversal
   @param {DOMElement|Array} [to] DOM element (or array of elements) at which to end traversal (exclusively)
   @param {Function} [f] Function `f(elem)` to execute for each DOM node
*/
__js function traverseDOM(from, to, f) {
  if (!Array.isArray(to)) to = [to];
  while (from && to.indexOf(from) == -1) {
    f(from);
    from = from.parentNode;
  }
}
exports.traverseDOM = traverseDOM;


/**
    @function matchesSelector
    @summary  Check if a given DOM element matches a CSS selector
    @param    {DOMElement} [elem] DOM element
    @param    {String} [selector] CSS selector
    @return   {Boolean} 
*/
__js var matchesSelectorFunc = 
  [ 'matches',
    'matchesSelector',
   'webkitMatchesSelector',
   'mozMatchesSelector',
   'msMatchesSelector'
  ] .. 
  find(f -> document.body[f] != undefined, undefined);

__js function matchesSelector(elem, selector) {
  return elem[matchesSelectorFunc](selector);
}
exports.matchesSelector = matchesSelectorFunc ? 
  matchesSelector : 
  require('./dom-shim').matchesSelector;


/**
   @function findNode
   @summary Traverse DOM bottom-up beginning at `from` up to element(s) `to` and return first element that matches `selector` or `null` if no such element is found
   @param {String} [selector] CSS selector
   @param {DOMElement} [from] DOM element at which to start traversal
   @param {optional DOMElement|Array} [to] DOM element (or array of elements) at which to end traversal
   @param {optional Boolean} [inclusive=false] Whether to include element(s) `to` in the match or not
   @return {DOMElement|null}
*/
function findNode(selector, from, to, inclusive) {
  try {
    if (inclusive && to) {
      if (!Array.isArray(to)) to = [to];
      to = to .. map(elem -> elem ? null : elem.parentNode);
    }
    if (!to) to = document;
    traverseDOM(from, to) { |c| if (exports.matchesSelector(c, selector)) return c }
    return null;
  }
  catch(e) {
    throw new Error("findNode(#{selector}, #{from}, #{to}, #{inclusive}): #{e}");
  }
}
exports.findNode= findNode;

/**
   @function getOffset
   @summary Retrieve the current position of the given DOM element *relative to the document*
   @param {DOMElement} [elem] DOM element
   @return {Object} Object with members `top` and `left`
*/
function getOffset(elem) {
  var { top, left } = elem.getBoundingClientRect();
  return {
    top: top  + window.pageYOffset - document.documentElement.clientTop,
    left: left + window.pageXOffset - document.documentElement.clientLeft
  };
}
exports.getOffset = getOffset;

/**
   @function pageOffsetTo
   @summary Determine page offset to the given DOM element
   @param {DOMElement} [elem] DOM element
   @return {Object} Object with members `x` and `y`
   @desc
     This function can be used in conjunction with [::pageX] and [::pageY] to determine 
     event coordinates relative to given DOM element
*/
__js {
  function pageOffsetTo(elem) {
    var x=0, y=0;
    while (elem.offsetParent) {
      x += elem.offsetLeft;
      y += elem.offsetTop;
      elem = elem.offsetParent;
    }
    return { x: x, y: y };
  }
  exports.pageOffsetTo = pageOffsetTo;
}

//----------------------------------------------------------------------

/**
  @function setCookie
  @summary  Sets a cookie to keep data across browsing sessions.
  @param    {String} [name] Name of the cookie.
  @param    {String} [value] Value of the cookie.
  @param    {optional Number} [days] Integer defining the number of days this cookie will be stored.
  @desc
    If the optional *days* parameter is undefined or '==0',
    the cookie will live until the browser is closed.
*/

exports.setCookie = function(name, value, days) {
  var v = name + "=" + escape(value);
	if (days) {
		var date = new Date();
		date.setDate(date.getDate()+days);
    v += ";expires="+date.toUTCString();
	}
	document.cookie = v;
};

/**
  @function getCookie
  @summary  Retrieves a previously set cookie.
  @param    {String} [name] Name of the requested cookie.
  @return   {String} Value of the cookie or empty string if the cookie is not set.
*/
exports.getCookie = function(name) {
  var c, start;
  if (!(c = document.cookie) ||
      (start = c.indexOf(name+"=")) == -1)
    return "";
  start += name.length+1;
  var end = c.indexOf(";", start);
  if (end == -1) end = c.length;
  return unescape(c.substring(start,end));
};

/**
  @function removeCookie
  @summary  Removes a previously set cookie.
  @param    {String} [name] Name of the cookie that is about to be eaten.
*/
exports.removeCookie = function(name) {
	exports.setCookie(name,"",-1);
};

/**
  @function isDOMNode
  @summary  test whether an object is a DOM node
  @param    {Object} [obj] the object to test
  @return   {Boolean} whether the argument is a DOM node
  @desc
     Checks well-known property names (i.e. duck typing). This may
     result in false positives in some cases, but will work even for
     elements that are from a different document (e.g from an iframe).
 */
exports.isDOMNode = function(o) {
  return o && typeof o === "object" && o !== null && o.nodeType > 0 && typeof o.nodeName==="string";
}

/**
  @function locationHash
  @summary  return a consistent version of `document.location.hash`
  @return   {String}
  @desc
     In some browsers (notably [Firefox](https://bugzilla.mozilla.org/show_bug.cgi?id=483304)),
     accessing `document.location.hash` gives you a _decoded_ version of the location hash
     (as if you had passed it through [../url::decode]).
     This loses information, and creates inconsistencies between browsers.

     This function returns the raw hash string in all browsers, without URL decoding.
     You should always use it in preference to `document.location.hash`.
 */
__js exports.locationHash = function() {
  var l = String(document.location);
  var i = l.indexOf('#');
  return i === -1 ? '' : l.slice(i);
};
