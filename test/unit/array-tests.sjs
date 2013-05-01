var testUtil = require('../lib/testUtil');
var testEq = testUtil.test;
var {test, context, assert} = require('sjs:test/suite');

var array = require("sjs:array");

testEq("flatten recursively", "1|2|3|4|5|6|7|8|9|10", function() {
	var a = [1,2,[3,4,[5,6]],[[7,8]],[9],10];
	var b = array.flatten(a);
	return b.join("|")
});

test("contains") {||
	assert.ok([1,2,3] .. array.contains(2));
	assert.notOk([1,2,3] .. array.contains(5));
}
