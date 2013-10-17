var {test, context, assert} = require('sjs:test/suite');

test("basic") {||
	var compiled = require('sjs:compile/minify').compile("
		// comment
		while(true) {
			waitfor {
				x();
			} and {
				y(); // comment 2
			}
		}");
	assert.eq(compiled, 'while(true){waitfor{x()}and{y()}}');
}

test("quasi interpolation") {||
	var compiled = require('sjs:compile/minify').compile('`string ${literal}`;');
	assert.eq(compiled, '`string ${literal}`;');
}

test("string interpolation") {||
	var compiled = require('sjs:compile/minify').compile('"string #{literal}";');
	assert.eq(compiled, '"string #{literal}";');
}

test("altns") {||
	var compiled = require('sjs:compile/minify').compile('@val;');
	assert.eq(compiled, '@val;');
}

test("string interpolation inside __js") {||
	var compiled = require('sjs:compile/minify').compile('
		__js {
			print("#{");
		}
	');
	assert.eq(compiled, '__js {print("#{");}');
}.skip("BROKEN");
