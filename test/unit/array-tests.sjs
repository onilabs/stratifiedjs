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

context("areEquivalentArrays") {||
	test("on two equivalent numerical arrays", 
       -> [1,2,3] .. array.areEquivalentArrays([1,2,3]) .. assert.eq(true));
	test("on two unequivalent numerical arrays", 
       -> [1,2,3] .. array.areEquivalentArrays([1,2,4]) .. assert.eq(false));
	test("unequal lengths", 
       -> [1,2,3] .. array.areEquivalentArrays([1,2,3,4]) .. assert.eq(false));
	test("null vs undefined", 
       -> [null] .. array.areEquivalentArrays([undefined]) .. assert.eq(false));
	test("null vs 0", 
       -> [null] .. array.areEquivalentArrays([0]) .. assert.eq(false));
	test("different objects", 
       -> [{}] .. array.areEquivalentArrays([{}]) .. assert.eq(false));
	test("same objects", function() {
    var a = {}, b = {}, c = {};
    [a,b,c] .. array.areEquivalentArrays([a,b,c]) .. assert.eq(true) });
  test("shallowness", 
       -> [1,2,[3,4]] .. array.areEquivalentArrays([1,2,[3,4]]) .. assert.eq(false));
}

context("cmp") {||
	test("on two equal arrays", -> [1,2,3] .. array.cmp([1,2,3]) .. assert.eq(0));
	test("first element (a smaller)", -> [0,2,3] .. array.cmp([1,2,3]) .. assert.eq(-1));
	test("first element (b smaller)", -> [1,2,3] .. array.cmp([0,2,3]) .. assert.eq(1));
	test("last element (a smaller)", -> [1,2,2] .. array.cmp([1,2,3]) .. assert.eq(-1));
	test("last element (b smaller)", -> [1,2,3] .. array.cmp([1,2,2]) .. assert.eq(1));
	test("a shorter", -> [1,2] .. array.cmp([1,2,3]) .. assert.eq(-1));
	test("b shorter", -> [1,2,3] .. array.cmp([1,2]) .. assert.eq(1));
}
