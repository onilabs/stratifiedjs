var testUtil = require('./lib/testUtil');
var test = testUtil.test;

var array = require("sjs:array");

test("flatten recursively", "1|2|3|4|5|6|7|8|9|10", function() {
	var a = [1,2,[3,4,[5,6]],[[7,8]],[9],10];
	var b = array.flatten(a);
	return b.join("|")
});
