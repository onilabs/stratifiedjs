var testUtil = require('../lib/testUtil');
var testEq = testUtil.test;
var testFn = testUtil.testFn;
var {test, context, assert} = require('sjs:test/suite');

@ = require('sjs:test/std');
var s = require("sjs:sequence");
var toArray = s.toArray;
var legacy = require('sjs:legacy');

context('partition') {||
  testEq('partition(integers(1,10) .. toArray, x->x%2)', [[1, 3, 5, 7, 9], [2, 4, 6, 8, 10]], function() {
    return legacy.partition(s.integers(1, 10) .. s.toArray, x -> x%2);
  });

  testEq('partition(integers(1,10), x->x%2)', [[1, 3, 5, 7, 9], [2, 4, 6, 8, 10]], function() {
    return legacy.partition(s.integers(1, 10), x -> x%2) .. s.map(s.toArray);
  });

  test('should consume only as many items as required') {||
    var seen = [];
    var log = function(item) { seen.push(item); return item; }
    var [odd, even] = s.integers()
      .. s.transform(log)
      .. legacy.partition(x -> x % 2);

    even = even .. s.take(3) .. toArray();
    odd = odd .. s.take(3) .. toArray();
    hold(100);
    even .. assert.eq([0, 2, 4]);
    odd .. assert.eq([1, 3, 5]);
    seen .. assert.eq([0, 1, 2, 3, 4, 5]);
  }.skip("BROKEN (return after spawn())");
}
