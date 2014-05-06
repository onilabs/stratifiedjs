#!/usr/bin/env sjs
/*
 * Oni StratifiedJS' wraplib inspector tool
 * A developer tool to inspect the coverage of sjs modules that wrap native JS
 * libraries using sjs's `wraplib` module.
 *
 * Usage: inspect.sjs module
 *
 * e.g:
 * $ tools/wraplib/inspect.sjs dynamo.sjs
 *
 * (c) 2012 Oni Labs, http://onilabs.com
 *
 * This file is licensed under the terms of the GPL v2, see
 * http://www.gnu.org/licenses/gpl-2.0.html
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

/** @nodoc */

var inspect = exports.inspect = function(obj) {
	/**
	 * Prints an inspection to the terminal.
	 * Returns the number of errors encountered.
	 */
	var errors = 0;

	var term = require("sjs:nodejs/terminal");

	var _c = function(c) {
		return function(str) {
			try {
				return term.color(c).write(str);
			} finally {
				term.reset();
			}
		}
	}
	var red = function() { errors += 1; return _c('red').apply(this, arguments);};
	var green = _c('green');
	var yellow = _c('yellow');
	var blue = _c('blue');
	var cyan = _c('cyan');
	var black = _c('black');

	function is_a(cls) {
		return this instanceof cls;
	}

	function crawl(subject, maxdepth, emitter) {
		maxdepth = maxdepth || 50;
		seen_objects = {};
		function _crawl(prefix, subject, depth)
		{
			depth += 1;
			if(depth > maxdepth) {
				prefix.push("... (max)");
				emitter(prefix);
				return;
			}

			var loop = function(subject) {
				var keys = []
				for(var k in subject) {
					keys.push(k);
				}
				//console.log("subject " + prefix + " has keys: " + keys);
				for(var k in subject) {
					var branch_prefix = prefix.slice();
					branch_prefix.push(k);

					var val = null;
					var emit = function() {
						emitter(branch_prefix, val, depth);
					}
					try {
						val = subject[k];
					} catch(e) {
						branch_prefix.push(" ... error: " + e);
						emit();
						continue;
					}
					if(val in seen_objects)
					{
						branch_prefix.push("... (dup)");
						emit();
					} else {
						emit();
						if(val != null && is_a.call(val, String)) {
							// strings have the inconvenient builtin loop that
							// string[0] == string[0][0]
							//console.log("STRING: " , val);
							continue;
						}
						_crawl(branch_prefix, val, depth);
					}
				}
			};
			loop(subject);
			// JS doesn't actually traverse prototypes, but we want to:
			if(Object.prototype.hasOwnProperty.call(subject, 'prototype')) {
				prefix.push('prototype');
				loop(subject.prototype);
			}
		}
		return _crawl([], subject, 0);
	}

	var visit = function(path, val) {
		if(path[path.length - 1].match(/^__sjs_/)) {
			return;
		}
		//yellow(this.key).nl();
		var desc = "(error)";
		var get_desc = function(val) {
			try {
				var s = String(val).replace(/[\n\t ]+/gm, ' ');
				if(typeof(val) == 'function') {
					var closing_paren = s.indexOf(")");
					if (closing_paren != -1) {
						return s.slice(0, closing_paren+1);
					}
				}
				return s.slice(0, 40);
			} catch(e) {
				return "(error)";
			}
		}
		desc = get_desc(val);
		var key = path[path.length-1];
		path = path.join(".");
		if(typeof(val) == 'function' && key != 'toString') {
			if(val.hasOwnProperty('__sjs_orig')) desc = get_desc(val.__sjs_orig);
			if(val.hasOwnProperty('__sjs_wrapped') || val.hasOwnProperty('__sjs_ok')) {
				green(path);
			} else {
				red(path);
			}
		} else {
			cyan(path);
		}
		if(val.hasOwnProperty('__sjs_length')) {
			length_desc = "["+val.__sjs_length+"]";
			if(val.__sjs_length + val.__sjs_callbacks != val.__sjs_orig.length) {
				red(length_desc);
			} else {
				yellow(length_desc);
			}
		}
		term.write(" ");
		blue(desc).nl();
	}

	crawl(obj, 50, visit);
	return errors;
}

exports.main = function(argv) {
	argv = argv || require('sjs:sys').argv();
	var argv = require('sjs:sys').argv();
	if(argv.length != 1) throw "Please supply exactly one argument!";
	var url = require('sjs:url');
	var module_name = argv[0] .. url.coerceToURL();
	if(module_name.indexOf(":") == -1) {
		// assume a path:
		var fs = require("nodejs:fs");
		module_name = fs.realpathSync(module_name);
	}
	return exports.inspect(require(module_name));
}

if (require.main === module) {
	process.exit(exports.main());
}
