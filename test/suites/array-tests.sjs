var testUtil = require('../lib/testUtil');
var test = testUtil.test;

var array = require("sjs:array");

test("flatten recursively", "1|2|3|4|5|6|7|8|9|10", function() {
	var a = [1,2,[3,4,[5,6]],[[7,8]],[9],10];
	var b = array.flatten(a);
	return b.join("|")
});

test("concat single argument", "1|2|3|4|5,6|7|8,9", function() {
	var a = [[1,2],[3,4,[5,6]],[], [7,[8,9]]];
	var b = array.concat(a);
	return b.join("|")
});

test("concat multiple arguments", "1|2|3|4|5,6|7|8,9", function() {
	var b = array.concat([1,2],[3,4,[5,6]],[], [7,[8,9]]);
	return b.join("|")
});
