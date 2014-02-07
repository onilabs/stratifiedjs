/*
 * StratifiedJS 'xbrowser/driver' module
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.17.0'
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
  @home      sjs:xbrowser/dom
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

// TODO: (tjc) document.

var {extend, propertyPairs} = require('sjs:object');
var logging = require('sjs:logging');
var {each} = require('sjs:sequence');
var {AssertionError} = require('sjs:assert');
var Url = require('sjs:url');


// global functions, which can optionally be mixed into a context
var fns = {};

var DriverProto = Object.create({});

DriverProto.mixInto = function(ctx, inclusive) {
	if (inclusive) {
		// if they want the whole kit & caboodle, give them this module's standalone functions
		ctx .. extend(fns);
	}
	propertyPairs(this) .. each{|[k, v]|
		if (k === 'mixInto') continue;
		ctx[k] = v;
	}
	ctx.driver = this;
	return this;
}

DriverProto.interceptLogging = function() {
	this.frame.contentWindow.require('sjs:logging').setConsole(logging.getConsole());
	this.frame.contentWindow.onerror = function (e) {
		logging.error("Uncaught: " + e);
	};
}
DriverProto.removeLogIntercept = function() {
	this.frame.contentWindow.require('sjs:logging').setConsole(null);
};

DriverProto.body = -> this.frame.contentDocument.body;
DriverProto.document = -> this.frame.contentDocument;
DriverProto.window = -> this.frame.contentWindow;
DriverProto.close = -> document.body.removeChild(this.frame);
DriverProto.__finally__ = DriverProto.close;
DriverProto.isLoaded = -> this.frame.contentWindow && this.frame.contentWindow.require;
DriverProto.waitUntilLoaded = function(timeout) {
	exports.waitforCondition(=> this.isLoaded(), "Page not loaded", timeout || 10);
}

DriverProto.elem = (a, b) -> exports.elem.apply(exports, arguments.length == 2 ? arguments : [this.body(), a]);
DriverProto.elems = (a, b) -> exports.elems.apply(exports, arguments.length == 2 ? arguments : [this.body(), a]);

DriverProto.navigate = function(url) {
	var currentUrl = this.document().location.href;
	url = Url.normalize(url, currentUrl);
	logging.verbose("Navigating from #{currentUrl} -> #{url}");
	this.frame.contentDocument.location.href = url;
	hold(0);
	logging.verbose("waiting until loaded");
	this.waitUntilLoaded();
	logging.verbose("loaded");
}

DriverProto.click = function(elem) {
	var doc = elem.ownerDocument;
	var currentHref = doc.location.href;
	var propagate = elem .. exports.trigger('click');
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
	}
}

DriverProto._init = function(url) {
	this.frame = document.createElement("iframe");
	if (url) this.frame.setAttribute("src", url);
	this.frame.setAttribute("style", "position:fixed; right:0; top:0; width: 600; height: 400;");
	document.body.appendChild(this.frame);
}

exports.Driver = function(url) {
	var rv = Object.create(DriverProto);
	rv._init.apply(rv, arguments);
	return rv;
}

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
					// chrome has a but that prevent KeyboardEvents from working, but
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
	logging.info("dispatching #{name} to elem", elem, evt);
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


fns.sendKey = function(elem, code) {
	var details = { which: code };
	elem .. exports.trigger("keydown", details);
	elem .. exports.trigger("keypress", details);
	elem .. exports.trigger("keyup", details);
}

fns.set = function(elem, key, val) {
	return elem.setAttribute(key, val);
}

fns.computedStyle = function(elem, prop) {
	var style = elem.ownerDocument.defaultView.getComputedStyle(elem, null);
	if (prop !== undefined) {
		return style.getPropertyValue(prop);
	}
	return style;
}

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

fns.assertVisibility = function(elem, expected, desc) {
	if (exports.isVisibl(eelem) !== expected) {
		var msg = "Expected element to be #{expected ? "" : "in"}visible";
		if (desc) msg += " (#{desc})";
		throw new AssertionError(msg);
	}
}

fns.assertHidden = (elem, desc) -> fns.assertVisibility(elem, false, desc);
fns.assertShown = (elem, desc) -> fns.assertVisibility(elem, true, desc);
fns.hasClass = (elem, cls) -> elem.classList.contains(cls);

var DEFAULT_TIMEOUT = 2; // seconds
var DEFAULT_INTERVAL = 100; // ms
fns.waitforSuccess = function(fn, desc, timeout, interval) {
	timeout = timeout || DEFAULT_TIMEOUT;
	interval = interval || DEFAULT_INTERVAL;
	var lastError;
	waitfor {
		var result;
		try {
			result = fn();
		} catch(e) {
			lastError = e;
			hold(interval);
		}
		return result;
	} or {
		hold(timeout * 1000);
		if (lastError) throw lastError;
		var msg = "Timed out after #{timeout}s"
		if (desc) msg += " (#{desc})"
		throw new AssertionError(msg);
	}
}

fns.waitforCondition = function(fn, desc, timeout, interval) {
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

fns.elem = function(container, selector) {
	var elem = container.querySelector(selector);
	if(!elem) {
		throw new Error("No element found: #{selector}");
	}
	return elem;
}

fns.elems = function(container, selector) {
	var list = container.querySelectorAll(selector);
	var ret = [];
	for (var i=0; i<list.length; i++) {
		ret[i] = list[i];
	}
	return ret;
}

exports.addTestHooks = function(t, getDriver) {
	t = t || require('sjs:test/suite').test;
	getDriver = getDriver || ((s) -> s.driver);
	t.beforeEach {|s|
		var d = getDriver(s);
		d.waitUntilLoaded();
		d.interceptLogging();
	}
	t.afterAll {|s|
		try {
			getDriver(s).removeLogIntercept();
		} catch(e) {
			logging.warn(String(e));
		}
	}
	return this;
}


exports .. extend(fns);
exports.mixInto = (subject) -> subject .. extend(fns);
