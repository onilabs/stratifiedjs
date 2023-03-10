var testUtil = require('../lib/testUtil');
var testEq = testUtil.test;
var {test, context, assert} = require('sjs:test/suite');
@ = require('sjs:std');

context('SortedMap', function() {
  var arr_sorted = [[5, 'a'], [10, 'b'], [20, 'c'], [30, 'd']];
  var arr_sorted_replaced = [[5, 'a'], [10, 'x'], [20, 'c'], [30, 'd']];
  var arr_sorted_replaced_added = [[5, 'a'], [7, 'y'], [10, 'x'], [20, 'c'], [30, 'd']];
  var arr_sorted_replaced_added_removed = [[5, 'a'], [7, 'y'], [10, 'x'], [30, 'd']];
  var arr_permuted = [[10, 'b'], [5, 'a'], [30, 'd'], [20, 'c']];

  function test_start_config(M) {
    assert.ok(M .. @isSortedMap);
    assert.eq(M.count(), arr_sorted.length);
    assert.eq(M.elements .. @toArray, arr_sorted);
    assert.eq(M.get(10), 'b');
    assert.eq(M.get(100), undefined);
    assert.eq(M.has(10), true);
    assert.eq(M.has(100), false);
  }

  test('basic', function() {
    var SM = @SortedMap(arr_permuted);
    test_start_config(SM);

    var EMPTY = @SortedMap();
    arr_permuted .. @each {|x| EMPTY.set(...x) }
    test_start_config(EMPTY);

    var C1 = @SortedMap(SM);
    var C2 = SM.clone();

    assert.eq(SM.set(10, 'x'), 2);
    assert.eq(SM.get(10), 'x');

    assert.eq(SM.elements .. @toArray, arr_sorted_replaced);

    assert.eq(SM.set(7, 'y'), -2);
    assert.eq(SM.elements .. @toArray, arr_sorted_replaced_added);
    assert.eq(SM.get(7), 'y');
    assert.eq(SM.count(), 5);

    assert.eq(SM.delete(100), 0);
    assert.eq(SM.elements .. @toArray, arr_sorted_replaced_added);
    assert.eq(SM.count(), 5);

    assert.eq(SM.delete(20), 4);
    assert.eq(SM.elements .. @toArray, arr_sorted_replaced_added_removed);
    assert.eq(SM.get(20), undefined);
    assert.eq(SM.count(), 4);

    test_start_config(C1);
    test_start_config(C2);
  });

  test('mutation during iteration', function() {
    var ARR = @integers() .. @take(100) .. @map(x->[x,x*x]);
    var M = @SortedMap(ARR .. @clone .. @shuffle);
    assert.eq(M.elements ..  @toArray, ARR);
    @withOpenStream(M.elements) {
      |S|
      assert.eq(M.delete(0),1);
      assert.eq(M.delete(1),1);
      assert.eq(M.get(1),undefined);
      assert.eq(M.set(2, 5), 1);
      assert.eq(M.set(100, 100*100), -99);

      assert.eq(S..@toArray(), ARR);
    }
  });

  test('mutation during iteration - blocking', function() {
    var ARR = @integers() .. @take(100) .. @map(x->[x,x*x]);
    var M = @SortedMap(ARR .. @clone .. @shuffle);
    assert.eq(M.elements ..  @toArray, ARR);
    @withOpenStream(M.elements) {
      |S|
      assert.eq(M.delete(0),1);
      assert.eq(M.delete(1),1);
      assert.eq(M.get(1),undefined);
      assert.eq(M.set(2, 5), 1);
      assert.eq(M.set(100, 100*100), -99);
      hold(0);
      assert.eq(S..@toArray(), ARR);
    }
  });

});

