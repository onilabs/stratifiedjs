/*
 * StratifiedJS 'compile/lint' module
 * Functions for working with arrays
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.20.0-development'
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2015 Oni Labs, http://onilabs.com
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
  @nodoc
  @eslint
    {
      "rules": {
        "no-console": 0,
        "curly": 0,
        "no-process-exit": 0
      }
    }
*/

@ = require([
	'../sequence',
	'../sys',
	'../object',
	{id:'../docutil', name:'docutil'},
]);
var { linter:@eslint, @CLIEngine } = require('nodejs:eslint/lib/api');
@url = require('sjs:url');
var compile = require('./ast').compile;

var DEFAULT_GLOBALS = [];
['module','exports','require','hold','resume', '@','console', 'process'] .. @each {|key|
	DEFAULT_GLOBALS[key] = true;
}

var OK = 0, WARN = 1, ERROR = 2;

function checkStatus(s) {
	if(![0,1,2] .. @hasElem(s)) {
		console.warn("Unknown lint severity: #{s}");
		return 1;
	}
	return s;
}

function worseStatus(a,b) {
	a = checkStatus(a);
	b = checkStatus(b);
	//console.warn("CMP: #{a},#{b}");
	if(a === ERROR || b === ERROR) return ERROR;
	if(a === WARN || b === WARN) return WARN;
	if(a === OK && b === OK) return OK;
	console.warn("Unknown lint status: #{a}/#{b}");
}
exports.mergeStatus = worseStatus;

exports.verify = function(opts) {
	var text = opts.text;
	var filename = opts.filename;
	var globalConf = opts.config;

	if(text == null) {
		text = require('sjs:nodejs/fs').readFile(filename, 'utf-8');
	}
	var defaults = @eslint.defaults();

	var rules = defaults.rules .. @merge({
		// eslint by default is very opinionated. Until we hve a good way of
		// wrangling this, let's just disable a bunch of nitpick style rules,
		// because we mostly care about semantic issues (undefined vars, etc)
		camelcase:0,
		strict: 0,
		quotes: 0,
		'semi': 0, // XXX this is a legit issue, but has too many false positives with blocks
		'semi-spacing':0, // as above (although just cosmetic)
		'no-trailing-spaces':0,
		'no-underscore-dangle':0,
		'no-console':1,
		'space-infix-ops':0,
		'comma-spacing': 0,
		'no-shadow':1,
		'no-loop-func':0, // false positives from AST hack
		'no-lone-blocks': 0, // triggered by __js { ... }
		'no-spaced-func': 0, // XXX breaks due to AST differences
		'no-constant-condition': 0, // XXX false positives triggered by AST hack
		'no-multi-spaces': 0,
		'curly': 1,
		'new-cap': 0, // SJS has different idioms here
		'no-unreachable': 0, // confused by waitfor/*
		'comma-dangle':0, // deficiency in JS parsers, fine in SJS
	});
	var globals = DEFAULT_GLOBALS;

	function extendConfig(config) {
		if(!config) return;
		if(config.rules) {
			rules .. @extend(config.rules);
		}
		if(config.globals) {
			var g = config.globals;
			if(Array.isArray(g)) {
				var keys = g;
				g = {};
				keys .. @each{|key| g[key]=true; };
			}
			globals = globals .. @merge(g);
		}
	}

	extendConfig(globalConf);

	var moduleMetadata = @docutil.parseModuleDocs(text);
	var moduleConfig = moduleMetadata.eslint;
	if(moduleConfig) {
		try {
			moduleConfig = moduleConfig .. JSON.parse();
		} catch(e) {
			throw new Error("invalid JSON in @lint-config for #{filename}:\n#{e}");
		}
		extendConfig(moduleConfig);
	}

	var eslintConfig = defaults .. @merge({
		rules: rules,
		// XXX replace this with object when we can upstream
		parser: @url.normalize('./ast.js', module.id) .. @url.toPath(),
		modules: true,
		globals: globals,
	});

	var messages = @eslint.verify(text, eslintConfig, filename);
	//console.log(messages);
	var engine = new @CLIEngine();
	var fmt = engine.getFormatter();
	fmt([{filePath: filename, messages: messages}]) .. console.log();
	//console.log(messages .. @map(m -> m.severity));
	return messages .. @reduce(0, (sev, msg) -> worseStatus(sev, msg.severity));
}

if (require.main === module) {
	@dd = require('sjs:dashdash');
	var parser = @dd.createParser({options: [
		{
			names: ['c', 'config'],
			type: 'string',
			help: 'config file (JSON)',
		},
		{
			name: 'help',
			type: 'bool',
		},
	]});
	var opts = parser.parse();
	if(opts.help) {
		console.log("Usage: compile/lint [OPTIONS] file1 [file2 ...]\n\n#{parser.help()}");
		process.exit(1);
	}
	var config = null;
	if (opts.config) {
		config = @fs.readFile(opts.config, 'utf-8') .. JSON.parse();
	}
	var rv = opts._args .. @reduce(OK, function(rv, path) {
		return worseStatus(rv, exports.verify({
			filename: path,
			config: config
		}));
	});
	process.exit(rv);
}
