/*
 * StratifiedJS 'xbrowser/driver' module
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
  @module    xbrowser/driver
  @summary   Iframe web driver
  @hostenv   xbrowser
  @desc
     This module provides a [Selenium][] style API for controlling an iframe.
     It is much simpler and faster, since it has direct in-process access to the
     loaded page and its associated JavaScript context. It makes no attempt to be
     compatible with Selenium's WebDriver API, it merely serves a similar purpose.

     **Note**: because this module runs in a browser environment, it is subject
     to same-origin policies: it will not be functional if you attempt to navigate
     to a URL on a different domain.

     [Selenium]: http://docs.seleniumhq.org/
*/

var {get, extend, ownPropertyPairs, allPropertyPairs} = require('sjs:object');
var {isDOMNode, findNode} = require('sjs:xbrowser/dom');
var logging = require('sjs:logging');
var {each, toArray} = require('sjs:sequence');
var {AssertionError} = require('sjs:assert');
var Url = require('sjs:url');


// global functions, which can optionally be mixed into a context
var fns = {};

/**
  @class Driver
  @summary Driver object
  @function Driver
  @param {String} [url] Initial URL
  @param {optional Object} [attrs] Additional attributes to set on the <iframe> element
*/
var DriverProto = Object.create(fns);

/**
  @function Driver.mixInto
  @param {Object} [dest]
  @summary Mix all properties of `this` into `dest`
*/
DriverProto.mixInto = function(ctx) {
	allPropertyPairs(this) .. each{|[k, v]|
		if (k === 'mixInto') continue;
		ctx[k] = v;
	}
	ctx.driver = this;
	return this;
}

/**
  @function Driver.interceptLogging
  @summary Forward [sjs:logging::] messages from the iframe to the host
*/
DriverProto.interceptLogging = function() {
	this.frame.contentWindow.require('sjs:logging').setConsole(logging.getConsole());
	this.frame.contentWindow.onerror = function (e) {
		logging.error("Uncaught: " + e);
	};
}

/**
  @function Driver.removeLogIntercept
  @summary Reverse the effect of [::Driver::interceptLogging]
*/
DriverProto.removeLogIntercept = function() {
	this.frame.contentWindow.require('sjs:logging').setConsole(null);
};

/**
  @function Driver.body
  @summary Get the iframe's <body> element
*/
DriverProto.body = -> this.frame.contentDocument.body;
/**
  @function Driver.document
  @summary Get the iframe's `document` object
*/
DriverProto.document = -> this.frame.contentDocument;
/**
  @function Driver.window
  @summary Get the iframe's `window` object
*/
DriverProto.window = -> this.frame.contentWindow;
/**
  @function Driver.close
  @summary Close the iframe
*/
DriverProto.close = -> document.body.removeChild(this.frame);
/**
  @function Driver.isLoaded
  @summary Return whether the frame is loaded
  @desc
    This function treats "loaded" as the client's window being available
    with a global `require` object.
    This will be true once StratifiedJS is initialized in the iframe.
*/
DriverProto.isLoaded = -> this.frame.contentWindow && this.frame.contentWindow.require;
/**
  @function Driver.waitUntilLoaded
  @summary Wait until [::Driver::isLoaded] returns true
*/
DriverProto.waitUntilLoaded = function(timeout) {
	exports.waitforCondition(=> this.isLoaded(), "Page not loaded", timeout || 10);
}

DriverProto.elem  = () -> exports.elem.apply( exports, isDOMNode(arguments[0]) ? arguments : [this.body()].concat(arguments .. toArray));
DriverProto.elems = () -> exports.elems.apply(exports, isDOMNode(arguments[0]) ? arguments : [this.body()].concat(arguments .. toArray));

/**
  @function Driver.navigate
  @param {String} [url]
  @param {optional Boolean} [wait=true]
  @summary Navigate to a new URL
  @desc
    If `wait` is true, this function won't return until [::Driver::waitUntilLoaded]
    completes post-navigation.
*/
DriverProto.navigate = function(url, wait) {
	var currentUrl = this.document().location.href;
	url = Url.normalize(url, currentUrl);
	logging.verbose("Navigating from #{currentUrl} -> #{url}");
	this.frame.contentDocument.location.href = url;
	hold(0);
	if(wait === false) return;
	logging.verbose("waiting until loaded");
	this.waitUntilLoaded();
	logging.verbose("loaded");
}

/**
  @function Driver.reload
  @param {optional Boolean} [wait=false]
  @summary Navigate to a new URL
  @desc
    If `wait` is true, this function won't return until [::Driver::waitUntilLoaded]
    completes post-reload.
*/
DriverProto.reload = function(wait) {
	this.frame.contentDocument.location.reload();
	hold(0);
	if(wait === false) return;
	this.waitUntilLoaded();
}

/**
  @function Driver.click
  @param {DOMElement} [elem]
  @summary Click an element
  @desc
    This function acts like [::Driver.trigger(elem, 'click')],
    but includes default behaviours for when the click event is not handled entirely in JavaScript
    (e.g for a link element, it will [::Driver::navigate] to the `href` attribute).
*/
DriverProto.click = function(elem) {
	var doc = elem.ownerDocument;
	var currentHref = doc.location.href;
	var propagate = true;
	;['mousedown', 'click', 'mouseup'] .. each {|evt|
		if(!fns.trigger(elem, evt)) propagate = false;
	}
	if (!propagate) return;

	switch(elem.tagName.toLowerCase()) {
		case 'a':
			var href = elem.getAttribute('href');
			if (href) {
				href = Url.normalize(href, currentHref);
				if (doc.location.href != href) {
					logging.verbose("manually navigating to href (#{href})");
					this.navigate(href);
				}
			}
			break;
		case 'input':
			switch(elem.getAttribute("type")) {
				case 'checkbox':
				case 'radio':
					elem .. exports.trigger('change');
					break;
			}
			break;
		case 'button':
			if(elem.getAttribute('type') === 'submit') {
				var form = findNode('form', elem);
				if(form) {
					form .. exports.trigger('submit');
				}
			}
			break;
	}
}

DriverProto._init = function(url, props) {
	this.frame = document.createElement("iframe");
	if (url) this.frame.setAttribute("src", url);
	this.frame.setAttribute("style", "position:fixed; right:0; top:0;");
	if (props)  {
		props .. ownPropertyPairs .. each {|[k,v]|
			this.frame.setAttribute(k, v);
		}
	}
	document.body.appendChild(this.frame);
}

exports.Driver = function(url) {
	var rv = Object.create(DriverProto);
	rv._init.apply(rv, arguments);
	return rv;
}

/**
  @function Driver.enter
  @param {DOMElement} [elem]
  @param {String|Boolean} [value]
  @summary Enter a value into an element (typically an <input>, <checkbox>, etc)
*/
fns.enter = function(elem, value) {
	var typ = elem.getAttribute('type');
	if(typ === 'checkbox') {
		elem.checked = Boolean(value);
	} else {
		elem.value = value;
		elem .. fns.trigger('input');
	}
	elem .. fns.trigger('change');
};

/**
  @function Driver.trigger
  @param {DOMElement} [elem]
  @param {String} [eventName]
  @param {optional Object} [attrs]
  @summary Trigger an `eventName` event on `elem`
  @return {Boolean} Whether the event should propagate.
*/
fns.trigger = function(elem, name, attrs) {
	var evt;

	// pre-actions
	switch(name) {
		case 'click':
			// TODO: is this incorrect if we stop propagation of the click?
			if(elem.tagName.toLowerCase() == 'input' && elem.getAttribute('type') === 'checkbox') {
				elem.checked = !elem.checked;
			} else if (elem.tagName.toLowerCase() == 'option') {
				elem.selected = !elem.selected;
			}
			break;
	}

	// create the event
	if (document.createEvent) {
		var type, init;
		switch(name) {
			case 'keyup':
				evt = document.createEvent('KeyboardEvent');
				if (evt.initKeyEvent) {
					// present on firefox.
					// chrome has a bug that prevent KeyboardEvents from working, but
					// *does* work with HTMLEvents (so we just let it fall through)
					evt.initKeyEvent(name, true, true,
						null, false, false, false, false,
						attrs.which,
						0);
					break;
				}
			default:
				evt = document.createEvent('HTMLEvents');
				evt.initEvent(name, true, true);
				break;
		}
	} else {
		evt = document.createEventObject();
		evt.eventType = name;
	}
	if (attrs) evt .. extend(attrs);

	// send the event
	logging.debug("dispatching #{name} to elem", elem, evt);
	var propagate;
	if (elem.dispatchEvent) {
		propagate = elem.dispatchEvent(evt);
	} else { // IE<9
		// NOTE: can trigger only real event (e.g. 'click')
		propagate = elem.fireEvent('on'+evt.eventType,evt);
	}

	if (propagate) {
		// allow default actions to occur
		hold(0);
	}
	return propagate;
}


/**
  @function Driver.sendKey
  @param {DOMElement} [elem]
  @param {Number} [code]
  @summary Send an individual keypress to the given element
 */
fns.sendKey = function(elem, code) {
	var details = { which: code };
	elem .. exports.trigger("keydown", details);
	elem .. exports.trigger("keypress", details);
	elem .. exports.trigger("keyup", details);
}

/**
  @function Driver.set
  @param {DOMElement} [elem]
  @param {String} [key]
  @param {String} [value]
  @summary Set an element's attribute
*/
fns.set = function(elem, key, val) {
	return elem.setAttribute(key, val);
}

/**
  @function Driver.computedStyle
  @param {DOMElement} [elem]
  @param {optional String} [property]
  @summary Get the computed style for an element
  @desc
    If `prop` is provided, returns the computed style for just that property.
    Otherwise, returns the entire computed style object.
*/
fns.computedStyle = function(elem, prop) {
	var style = elem.ownerDocument.defaultView.getComputedStyle(elem, null);
	if (prop !== undefined) {
		return style.getPropertyValue(prop);
	}
	return style;
}

/**
  @function Driver.isVisible
  @param {DOMElement} [elem]
  @summary Return whether the element is visible
  @desc
    Calculated by checking the `display` and `visibility` CSS
    properties. Does not perform other visual checks like whether the
    element is actually on-screen, transparent or obscured by another element.
*/
fns.isVisible = function(elem) {
	do {
		var style = exports.computedStyle(elem);
		if (style.getPropertyValue("display") === "none"
				|| style.getPropertyValue("visibility" == "hidden"))
			return false;

		elem = elem.parentNode;
	} while (elem && elem.ownerDocument);
	return true;
}

/**
  @function Driver.assertVisibility
  @param {DOMElement} [elem]
  @param {Boolean} [expected]
  @param {optional String} [expected]
  @summary Assert that the given element is visible (or not)
*/
fns.assertVisibility = function(elem, expected, desc) {
	if (exports.isVisibl(eelem) !== expected) {
		var msg = "Expected element to be #{expected ? "" : "in"}visible";
		if (desc) msg += " (#{desc})";
		throw new AssertionError(msg);
	}
}

/**
  @function Driver.assertHidden
  @param {DOMElement} [elem]
  @summary Assert that the given element is hidden
*/
fns.assertHidden = (elem, desc) -> fns.assertVisibility(elem, false, desc);
/**
  @function Driver.assertShown
  @param {DOMElement} [elem]
  @summary Assert that the given element is shown
*/
fns.assertShown = (elem, desc) -> fns.assertVisibility(elem, true, desc);
/**
  @function Driver.hasClass
  @param {DOMElement} [elem]
  @param {String} [cls]
  @summary Return whether the given element has the given class
*/
fns.hasClass = (elem, cls) -> elem.classList.contains(cls);

/**
  @function Driver.waitforSuccess
  @param {Function} [fn]
  @param {optional String} [desc] Failure description
  @param {optional Number} [timeout] Timeout (seconds)
  @param {optional Number} [interval] Interval (milliseconds)
  @summary Keep calling `fn` until it completes without throwing an exception
  @desc

    Note: `desc` can be omitted - if the second argument is a Number, it will be interpreted
    as the `timeout` argument.
*/
var DEFAULT_TIMEOUT = 2; // seconds
var DEFAULT_INTERVAL = 100; // ms
fns.waitforSuccess = function(fn, desc, timeout, interval) {
	if(typeof(desc) === 'number') {
		// desc not provided; shift up the timeout & interval
		interval = timeout;
		timeout = desc;
		desc = undefined;
	}
	timeout = timeout || DEFAULT_TIMEOUT;
	interval = interval || DEFAULT_INTERVAL;
	var lastError;
	waitfor {
		while(true) {
			try {
				return fn();
			} catch(e) {
				lastError = e;
				hold(interval);
			}
		}
	} or {
		hold(timeout * 1000);
		if (lastError) throw lastError;
		var msg = "Timed out after #{timeout}s"
		if (desc) msg += " (#{desc})"
		throw new AssertionError(msg);
	}
}

/**
  @function Driver.waitforCondition
  @param {Function} [fn]
  @param {optional String} [desc] Failure description
  @param {optional Number} [timeout] Timeout (seconds)
  @param {optional Number} [interval] Interval (milliseconds)
  @summary Keep calling `fn` until it returns a truthy value
  @desc

    Note: `desc` can be omitted - if the second argument is a Number, it will be interpreted
    as the `timeout` argument.
*/
fns.waitforCondition = function(fn, desc, timeout, interval) {
	if(typeof(desc) === 'number') {
		// desc not provided; shift up the timeout & interval
		interval = timeout;
		timeout = desc;
		desc = undefined;
	}
	timeout = timeout || DEFAULT_TIMEOUT;
	interval = interval || DEFAULT_INTERVAL;
	waitfor {
		var result;
		while(!(result = fn())) {
			hold(interval);
		}
		return result;
	} or {
		hold(timeout * 1000);
		var msg = "Timed out after #{timeout}s"
		if (desc) msg += " (#{desc})"
		throw new AssertionError(msg);
	}
}

/**
  @function Driver.elem
  @param {optional DOMElement} [elem] parent element
  @param {String} [selector]
  @param {optional Function} [predicate]
  @return {DOMElement}
  @summary Get the first element with the given selector
  @desc
    An exception is thrown if no element can be found.

    If `elem` is not provided, [::Driver::body] will be used.

    If `predicate` is provided, elements matching the selector but
    where `fn(elem)` returns falsy will be skipped.

*/
fns.elem = function(container, selector, predicate) {
	var elem;
	if (predicate) {
		elem = fns.elems(container, selector, predicate)[0];
	} else {
		elem = container.querySelector(selector);
	}
	if(!elem) {
		throw new Error("No element found: #{selector}");
	}
	return elem;
}

/**
  @function Driver.elems
  @param {DOMElement} [elem] parent element
  @param {String} [selector]
  @param {optional Function} [predicate]
  @return {Array}
  @summary Get all elements with the given selector
  @desc
    If `elem` is not provided, [::Driver::body] will be used.

    If `predicate` is provided, elements matching the selector but
    where `fn(elem)` returns falsy will be skipped.
*/
fns.elems = function(container, selector, predicate) {
	var list = container.querySelectorAll(selector);
	var ret = [];
	for (var i=0; i<list.length; i++) {
		if(predicate && !predicate(list[i])) continue;
		ret.push(list[i]);
	}
	return ret;
}

/**
  @function addTestHooks
  @param {optional Object} [subject=../suite::test]
  @param {optional Function} [getDriver] Function to return the current driver
  @return {Array}
  @summary Add before & after hooks to set up basic driver functionality per-test
  @desc
    These hooks ensure that [::Driver::waitUntilLoaded] and [::Driver::interceptLogging]
    are called at the start of each test, and that [::Driver::removeLogIntercept] is called
    after all tests.
 
    If `getDriver` is not provided (or is falsy), it's assumed that the
    driver can be found as a `driver` property on the test's state.
*/
exports.addTestHooks = function(t, getDriver) {
	t = t || require('sjs:test/suite').test;
	getDriver = getDriver || ((s) -> s .. get('driver'));
	t.beforeEach {|s|
		var d = getDriver(s);
		d.waitUntilLoaded();
		d.interceptLogging();
	}
	t.afterAll {|s|
		try {
			getDriver(s).removeLogIntercept();
		} catch(e) {
			logging.warn("Can't remove log intercept: #{e}");
		}
	}
	return this;
}


exports .. extend(fns);

exports.mixInto = (subject) -> subject .. extend(fns);
