var {test, context, assert} = require('sjs:test/suite');

test("basic", function() {
	var compiled = require('sjs:compile/stringify').compile('
		// comment
		while(true) {
			waitfor {
				x("one");
			} and {
				y(); // comment 2
			}
		}');
	assert.eq(compiled, '"while(true){waitfor{x(\\"one\\")}and{y()}}"');
})
