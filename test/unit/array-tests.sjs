var testUtil = require('../lib/testUtil');
var testEq = testUtil.test;
var {test, context, assert} = require('sjs:test/suite');
@ = require('sjs:std');

var array = require("sjs:array");

testEq("flatten recursively", "1|2|3|4|5|6|7|8|9|10", function() {
	var a = [1,2,[3,4,[5,6]],[[7,8]],[9],10];
	var b = array.flatten(a);
	return b.join("|")
});

test("flatten on non-array", function() {
	assert.raises(-> array.flatten(5));
	assert.raises(-> array.flatten({}));
})

context("cmp", function() {
	test("on two equal arrays", -> [1,2,3] .. array.cmp([1,2,3]) .. assert.eq(0));
	test("first element (a smaller)", -> [0,2,3] .. array.cmp([1,2,3]) .. assert.eq(-1));
	test("first element (b smaller)", -> [1,2,3] .. array.cmp([0,2,3]) .. assert.eq(1));
	test("last element (a smaller)", -> [1,2,2] .. array.cmp([1,2,3]) .. assert.eq(-1));
	test("last element (b smaller)", -> [1,2,3] .. array.cmp([1,2,2]) .. assert.eq(1));
	test("a shorter", -> [1,2] .. array.cmp([1,2,3]) .. assert.eq(-1));
	test("b shorter", -> [1,2,3] .. array.cmp([1,2]) .. assert.eq(1));
})

context("kCombinations", function() {
  test('4/0 -> 1 * 0 combination', function() {
    var rv = [1,2,3,4] .. array.kCombinations(0) .. @toArray;
    assert.eq(rv, [[]]);
  })
  test('4/1 -> 4 * 1 combinations', function() {
    var rv = [1,2,3,4] .. array.kCombinations(1) .. @toArray;
    assert.eq(rv, [[1], [2], [3], [4]]);
  })
  test('4/2 -> 6 * 2 combinations', function() {
    var rv = [1,2,3,4] .. array.kCombinations(2) .. @toArray;
    assert.eq(rv, [[1,2], [1,3], [1,4], [2,3], [2,4], [3,4]]);
  })
  test('4/3 -> 4 * 3 combinations', function() {
    var rv = [1,2,3,4] .. array.kCombinations(3) .. @toArray;
    assert.eq(rv, [[1,2,3], [1,2,4], [1,3,4], [2,3,4]]);
  })
  test('4/4 -> 1 * 4 combination', function() {
    var rv = [1,2,3,4] .. array.kCombinations(4) .. @toArray;
    assert.eq(rv, [[1,2,3,4]]);
  })
  test('4/5 -> 0 combinations', function() {
    var rv = [1,2,3,4] .. array.kCombinations(5) .. @toArray;
    assert.eq(rv, []);
  })
  test('0/0 -> 1 * 0 combination', function() {
    var rv = [] .. array.kCombinations(0) .. @toArray;
    assert.eq(rv, [[]]);
  })
  test('0/1 -> 0 combinations', function() {
    var rv = [] .. array.kCombinations(1) .. @toArray;
    assert.eq(rv, []);
  })
})

context("permutations", function() {
  test('0', function() {
    var rv = [] .. array.permutations .. @toArray;
    assert.eq(rv, [[]]);
  })
  test('1', function() {
    var rv = [1] .. array.permutations .. @toArray;
    assert.eq(rv, [[1]]);
  })
  test('2', function() {
    var rv = [1,2] .. array.permutations .. @toArray;
    assert.eq(rv, [[1,2],[2,1]]);
  })
  test('3', function() {
    var rv = [1,2,3] .. array.permutations .. @toArray;
    assert.eq(rv, [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]);
  })
})
