@ = require('sjs:test/std');

@context("AST parsing") {||
	var espree = require('nodejs:espree');
	var ast = require('sjs:compile/ast');
	var minify = require('sjs:compile/minify');
	var filename = @url.normalize('../fixtures/ast-sample.js', module.id) .. @url.toPath;
	var sampleProgram = @fs.readFile(filename);
	var espreeConfig = {
		ecmaFeatures: {
			destructuring: true,
			arrowFunctions: true,
		},
	};

	var canonicalize = function(node, depth, exclude) {
		if(!exclude) exclude = [];
		//XXX testing only:
		if(!depth) depth = 0; depth++; if(depth > 99) return "<infinite?>";
		if(!node) return node;
		if(typeof(node) !== 'object') return node;
		if(Array.isArray(node)) return @map(node, n -> canonicalize(n, depth, exclude));
		var rv = {};
		@keys(node) .. @sort .. @each {|k|
			if(exclude.indexOf(k) !== -1) continue;
			var v = node[k]
			if (typeof(v) === 'function') continue;
			rv[k] = canonicalize(v, depth, exclude);
		}
		return rv;
	}

	@test("JS subset is espree compatible") {||
		//@info("parsing with minifier");
		var minified = minify.compile(sampleProgram, {filename: filename,
		});
		@info("SYNTAX OK");

		@info("parsing wish AST");
		var compiled = ast.compile(sampleProgram, {filename:filename});
		@info(compiled .. canonicalize .. JSON.stringify(null, '  '));

		@info("parsing wish espree");
		var expected = espree.parse(sampleProgram, espreeConfig);
		@info(expected .. canonicalize .. JSON.stringify(null, '  '));

		compiled .. canonicalize .. @assert.eq(expected .. canonicalize);
	}.skip()

	@context("SJS specific syntax") {||
		var expr = ex -> {type:'ExpressionStatement', expression: ex};
		var dot = (parent, prop) -> {type:'MemberExpression', computed:false, object:parent, property:prop};
		var id = (name) -> {type:'Identifier', name:name};

		var singleton = function(a) {
			a.length .. @assert.eq(1);
			return a[0];
		}

		var compile = function(compiler, code) {
			var compiled = compiler(code, {loc:true, range:true}) .. canonicalize(null, ['loc','range']);
			@info("#{compiler === ast.compile ? "ast" : "espree"} compiled: ", compiled .. JSON.stringify(null, '  '));
			return compiled.body;
		}

		var expect = function(code, expected) {
			@test(code) {||
				ast.compile .. compile(code) .. singleton .. @assert.eq(expected .. canonicalize);
			}
		};

		var desugar = function(sjs, js, amendEspree) {
      if (!amendEspree) amendEspree = (x->x);
			@test(sjs) {||
				ast.compile .. compile(sjs)
					.. @assert.eq((code -> espree.parse(code, espreeConfig)) .. compile(js) .. amendEspree);
			}
		}

		//var desugar_stmt = function(sjs, js) {
		//}

		expect("@foo", expr(dot(id('@'), id('foo'))));

		desugar('"interp #{string}"', '"interp "+string');
		desugar('`quasi $quote`', '["quasi ", quote]');
		desugar('`quasi $call()`', '["quasi ", call()]');
		desugar('`quasi ${call()}`', '["quasi ", call()]');
		desugar('"interp #{`nested $quasi ${"quote"}`}"', '"interp "+["nested ",quasi, " ", "quote"]');

    // our double-dot operators add an 'is_doubledot' flag to the expression:
		desugar("foo .. bar", "bar(foo)", tree -> (tree[0].expression.is_doubledot=true,tree));
		desugar("foo .. bar(arg)", "bar(foo, arg)", tree -> (tree[0].expression.is_doubledot=true,tree));

		desugar("-> 1", "() => 1");
		desugar("x -> 1", "(x) => 1");
		desugar("(x,y) -> 1", "(x, y) => 1");
		desugar("x => 1", "(x) => 1");
		desugar("x ? 1", "x ? 1 : undefined");

		desugar(
			"try { x } retract { y }",
			"try { x } catch(__unused) { y }"
		);
		desugar(
			"try { x } catch(e) { y } retract { z }",
			"try { x } catch(e) { y;z }"
		);
		expect('collapse', expr({type:'EmptyStatement'}));
		desugar('waitfor { a } and { b }', '{ a; b }');
		desugar('waitfor { a } or { b }', '{ a; b }');
		desugar('waitfor { a } or { b } catch(e) { c }', 'try { a; b } catch(e) { c }');

		// XXX will we need to something clever here to make sure
		// waitfor() vars are seen as initialized by linters etc?
		desugar('waitfor() { a }', '{ a; }');
		desugar('waitfor() { b }', '{ b }');
		desugar('waitfor(a,b) { c }', '{ c }'); // XXX is this correct?
		desugar('waitfor() { a } retract { b }', 'try { a } catch(__unused) { b }');
		desugar('waitfor(var a, b) { c }', '{ var a, b; c }');
		desugar('__js { a; }', '{ a; }');

		desugar('__js a', 'a');
		desugar('foo {||}', 'foo(function() {while(true){}})');
		// XXX are linters going to complain about `continue` in a regular function?
		desugar('each(a) {|[b,c]| d; continue }', '
			each(a, function([b, c]) { while(true) { d; continue; } })
		');

	}

	@context("extended estree compatibility") {||
		// Aside from the base AST, estree relies on additional espree features.
		// Make sure we produce the same stuff:
		var config = { loc: true,
			range: true,
			raw: true,
			tokens: true,
			comment: true,
			attachComment: true,
		} .. @merge(espreeConfig);

		// XXX these sources intentionally don't have any trailing spaces after function calls,
		// etc. espree rolls trailing spaces into CallExpression and similar nodes, which seems wrong.
		var sources = [
			'123 + 456',
			'"function"',
			'""',
			"''",
			'"string"+1',
			'1+"string"',
			'"\\"string\\""',
			'foo["key"]',
			'var x = 1',

			// XXX not quite matching up yet
			//'var { d } = o',
			//'var x = (1,2)',
			
			'x ? 1 : 2',
			'(function() { })',
			'x()',
			';;',
			'throw exc',
			'switch(x) { case 1: x === 1; break; }',
			'x++',
			'do { loop()} while(1)',

			//'for (var i=0; i<a.length; a++) {
			//	loop();
			//}',

			

			'(1)',
			'(1);(2)',
			'console.log(1);', // doesn't match
			'\nconsole.log("string!\\\"");',
			

			//(function() {
			//	var loc = {
			//		start: { line: 1, column:0, },
			//		end: { line: 4, column:4, },
			//	};
			//	var range = [0, 23];
			//	return ['"#{x}yz"', {
			//		type: "Program",
			//		body: [
			//			{
			//				"expression": {
			//					"left": {
			//						"name": "x",
			//						"range": [
			//							3,
			//							4
			//						],
			//						"type": "Identifier"
			//					},
			//					"operator": "+",
			//					"range": [
			//						0,
			//						8
			//					],
			//					"right": {
			//						"range": [
			//							5,
			//							8
			//						],
			//						"raw": "\"yz\"",
			//						"type": "Literal",
			//						"value": "yz"
			//					},
			//					"type": "BinaryExpression"
			//				},
			//				"range": [
			//					0,
			//					8
			//				],
			//				"type": "ExpressionStatement"
			//			}
			//		],

			//		tokens: [
			//			{
			//				"range": [
			//					0,
			//					1
			//				],
			//				"type": "String",
			//				"value": "\"\""
			//			},
			//			{
			//				"range": [
			//					1,
			//					3
			//				],
			//				"type": "Punctuator",
			//				"value": '#{' // }
			//			},
			//			{
			//				"range": [
			//					3,
			//					4
			//				],
			//				"type": "Identifier",
			//				"value": "x"
			//			},
			//			{
			//				"range": [
			//					4,
			//					5
			//				],
			//				"type": "Punctuator",
			//				// {
			//				"value": "}"
			//			},
			//			{
			//				"range": [
			//					4,
			//					8
			//				],
			//				"type": "String",
			//				"value": "\"yz\""
			//			}
			//		],
			//	}];
			//})(),

			//(function() {
			//	var loc = {
			//		start: { line: 1, column:0, },
			//		end: { line: 4, column:4, },
			//	};
			//	var range = [0, 23];
			//	return ['`${x}yz`', {
			//	}];
			//})(),

			//(function() {
			//	var loc = {
			//		start: { line: 1, column:0, },
			//		end: { line: 4, column:4, },
			//	};
			//	var range = [0, 23];
			//	return ['`$x yz`', {
			//	}];
			//})(),

			(function() {
				var loc = {
					start: { line: 1, column:0, },
					end: { line: 4, column:4, },
				};
				var range = [0, 23];

				return ["'multi\nline\nstring\n...'", {
					type: 'Program',
					comments: [],
					loc: loc,
					range: range,
					body: [
						{
							type:'ExpressionStatement',
							loc: loc,
							range: range,
							expression: {
								type:'Literal',
								value:'multi\nline\nstring\n...',
								raw:"'multi\\nline\\nstring\\n...'",
								loc: loc,
								range: range,
							}
						},
					],
					tokens: [{
						loc:loc,
						range: range,
						type: 'String',
						value: "'multi\\nline\\nstring\\n...'",
					}],
				}];
			})(),

			(function() {
				var loc = {
					start: { line: 1, column:0, },
					end: { line: 4, column:4, },
				};
				var range = [0, 23];

				return ['"multi\nline\nstring\n..."', {
					type: 'Program',
					comments: [],
					loc: loc,
					range: range,
					body: [
						{
							type:'ExpressionStatement',
							loc: loc,
							range: range,
							expression: {
								type:'Literal',
								value:'multi\nline\nstring\n...',
								raw:'"multi\\nline\\nstring\\n..."',
								loc: loc,
								range: range,
							}
						},
					],
					tokens: [
						{
							loc: {
								start: { line: 1, column: 0 },
								end:   { line: 1, column: 6 },
							},
							range: [0, 6],
							type: 'String',
							value: '"multi"',
						},

						{
							loc: {
								start: { line: 1, column: 6 },
								end:   { line: 2, column: 0 },
							},
							range: [6, 7],
							type: 'String',
							value: '"\\n"',
						},
						{
							loc: {
								start: { line: 2, column: 0 },
								end:   { line: 2, column: 4 },
							},
							range: [7, 11],
							type: 'String',
							value: '"line"',
						},

						{
							loc: {
								start: { line: 2, column: 4 },
								end:   { line: 3, column: 0 },
							},
							range: [11, 12],
							type: 'String',
							value: '"\\n"',
						},
						{
							loc: {
								start: { line: 3, column: 0 },
								end:   { line: 3, column: 6 },
							},
							range: [12, 18],
							type: 'String',
							value: '"string"',
						},

						{
							loc: {
								start: { line: 3, column: 6 },
								end:   { line: 4, column: 0 },
							},
							range: [18, 19],
							type: 'String',
							value: '"\\n"',
						},
						{
							loc: {
								start: { line: 4, column: 0 },
								end:   { line: 4, column: 4 },
							},
							range: [19, 23],
							type: 'String',
							value: '"..."',
						},
					],
				}];
			})(),

			(function() {
				var loc = {
					start: { line: 1, column:0, },
					end:   { line: 2, column:2, },
				};
				var range = [0, 4];

				return ['"\nx"', {
					type: 'Program',
					comments: [],
					loc: loc,
					range: range,
					body: [
						{
							type:'ExpressionStatement',
							loc: loc,
							range: range,
							expression: {
								type:'Literal',
								value:'\nx',
								raw:'"\\nx"',
								loc: loc,
								range: range,
							}
						},
					],
					tokens: [
						{
							loc: {
								start: { line: 1, column: 0 },
								end:   { line: 2, column: 0 },
							},
							range: [0, 2],
							type: 'String',
							value: '"\\n"',
						},

						{
							loc: {
								start: { line: 2, column: 0 },
								end:   { line: 2, column: 2 },
							},
							range: [2, 4],
							type: 'String',
							value: '"x"',
						},
					],
				}];
			})(),
		];


		sources .. @indexed .. @each {|[i, source]|
			var expected;
			if(Array.isArray(source)) {
				[source, expected] = source;
			} else {
				expected = espree.parse(source, config)
			}

			var compile = function(exclude) {
				var compiled = ast.compile(source, config) .. canonicalize(null, exclude);
				@info("ast parse:", JSON.stringify(compiled .. canonicalize(null, ['loc']), null, '  '));

				@info("expected:", JSON.stringify(expected .. canonicalize(null, ['loc']), null, '  '));
				return [compiled, expected .. canonicalize(null, exclude)];
			};

			@context(source.length < 50 ? ("`" + source.replace(/\n/g,'\\n').replace(/\t/g,'')+"`") : "sample #{i}") {||
				@test("tokens") {||
					var [compiled, expected] = compile();
					compiled.tokens .. @assert.eq(expected.tokens);
				}

				@test("non-position information") {||
					var [compiled, expected] = compile(['loc','range', 'comments']);
					compiled .. @assert.eq(expected);
				}

				@test("full compatibility") {||
					var [compiled, expected] = compile();
					compiled .. @assert.eq(expected);
				}.skip("TODO");
			}
		};

	}

	// TODO: we could probably run many of espree's own unit tests. But the
	// failures might be very noisy.
}.serverOnly().skipIf((function() { 
  try {
    require('nodejs:espree');
  }
  catch(e) {
    return true;
  }
  return false;
})(), "Module nodejs:espree required");
