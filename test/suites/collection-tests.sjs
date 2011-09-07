var testUtil = require('../lib/testUtil')
var test = testUtil.test;
var collection = require('apollo:collection');

// return a function that sleeps for a smaller increment
// each time it's called (and then calls the wrapped function),
// to effectively reverse the return order
// when run multiple times in parallel.
var withDecreasingTimeout = function(fn) {
  var amount = 200;
  return function() {
    hold(amount-=20);
    return fn.apply(this, arguments);
  };
};

test('identity(1)', 1, function() { return collection.identity(1); });

test('eachSeq is ordered', [1,2,3], function() {
  var res = [];
  collection.eachSeq([1,2,3],
    withDecreasingTimeout(function(elem) { res.push(elem); }));
  return res;
});

test('each is run in parallel', [3,2,1], function() {
  var res = [];
  collection.each([1,2,3],
    withDecreasingTimeout(function(elem) { res.push(elem); }));
  return res;
});

test('map', {order: [3,2,1], result: [2,4,6]}, function() {
  var order = [];
  var result = collection.map([1,2,3],
    withDecreasingTimeout(function(elem) {
      order.push(elem);
      return elem * 2;
    }));
  return {order: order, result: result};
});

test('mapSeq', {order: [1,2,3], result: [2,4,6]}, function() {
  var order = [];
  var result = collection.mapSeq([1,2,3],
    withDecreasingTimeout(function(elem) {
      order.push(elem);
      return elem * 2;
    }));
  return {order: order, result: result};
});


test('findSeq returns early', {checked: [1,2], result: 2}, function() {
  var order = [];
  var result = collection.findSeq([1,2,3],
    withDecreasingTimeout(function(elem) {
      order.push(elem);
      return elem == 2;
    }));
  return {checked: order, result: result};
});

test('find returns early', {checked: [3,2], result: 2}, function() {
  var order = [];
  var result = collection.find([1,2,3],
    withDecreasingTimeout(function(elem) {
      order.push(elem);
      return elem == 2;
    }));
  return {checked: order, result: result};
});

test('find and findSeq return undefined if not found', [undefined, undefined], function() {
  var fn = function() { return false; };
  var c = [1,2,3];
  return [collection.find(c, fn), collection.findSeq(c, fn)];
});

test('find / findSeq don\'t swallow all exceptions', 'expected error', function() {
  try {
    collection.find([1,2,3], function() { throw new Error("expected error"); });
    return "no error thrown!"
  } catch (e) {
    return e.message;
  }
});

test('filterSeq', {checked: [1,2,3], result: [1,3]}, function() {
  var checked = [];
  var result = collection.filterSeq([1,2,3],
    withDecreasingTimeout(function(elem) {
      checked.push(elem);
      return elem != 2;
    }));
  return {checked:checked, result:result};
});

test('filter', {checked: [3,2,1], result: [1,3]}, function() {
  var checked = [];
  var result = collection.filter([1,2,3],
    withDecreasingTimeout(function(elem) {
      checked.push(elem);
      return elem != 2;
    }));
  return {checked:checked, result:result};
});

test('reduce', 6, function() {
  return collection.reduce([1,2,3], 0, function(accum, el) { return accum + el; });
});
test('reduce1', 6, function() {
  return collection.reduce1([1,2,3], function(accum, el) { return accum + el; });
});
test('reduce1 fails on empty array', 'reduce1 on empty collection', function() {
  try {
    return collection.reduce1([], function() { return 'should not be run'; });
  } catch(e) {
    return e.message;
  }
});

test('`this` binding for all functions').skip();

test('any').skip();
test('anySeq').skip();

test('all').skip();
test('allSeq').skip();

