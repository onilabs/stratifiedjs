@ = require(['sjs:sequence', 'sjs:sys', 'sjs:object']);
var { linter:@eslint, @CLIEngine } = require('nodejs:eslint/lib/api');
@url = require('sjs:url');
var compile = require('./ast').compile;

var globals = [];
['module','exports','require','hold','resume', '@','console'] .. @each {|key|
	globals[key] = true;
}

exports.verify = function(filename, text) {
	if(text === undefined) {
		text = require('sjs:nodejs/fs').readFile(filename, 'utf-8');
	}
	var defaults = @eslint.defaults();

	var config = defaults .. @merge({
		rules: defaults.rules .. @merge({
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
			'no-constant-condition': 0, // XXX false positives triggered by AST hack
			'no-multi-spaces': 0,
			'curly': 1,
			'new-cap': 0, // SJS has different idioms here
			'no-unreachable': 0, // confused by waitfor/*
			'comma-dangle':0, // deficiency in JS parsers, fine in SJS
		}),
		parser: @url.normalize('./ast.js', module.id) .. @url.toPath(),
		modules: true,
		globals: globals,
	});

	var messages = @eslint.verify(text, config, filename);
	var engine = new @CLIEngine();
	var fmt = engine.getFormatter();
	fmt([{filePath: filename, messages: messages}]) .. console.log();
}

if (require.main === module) {
	@argv() .. @each {|path|
		exports.verify(path);
	}
	process.exit(1); // TODO: get error status from eslint
}
