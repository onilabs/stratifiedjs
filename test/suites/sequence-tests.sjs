var testUtil = require('../lib/testUtil');
var test = testUtil.test;

var s = require("sjs:sequence");
var cutil = require("sjs:cutil");
var toArray = s.toArray;

//----------------------------------------------------------------------
// helpers

// return a function that sleeps for a smaller increment
// each time it's called (and then calls the wrapped function),
// to effectively reverse the return order
// when run multiple times in parallel.
var withDecreasingTimeout = function(fn) {
  var amount = 200;
  return function() {
    hold(amount-=40);
    return fn.apply(this, arguments);
  };
};


//----------------------------------------------------------------------
// tests

test("each(['a','b','c'], f)", 'abc', function() {
  var rv = "";
  s.each(['a','b','c'], function(x) { rv += x });
  return rv;
});

test("each(['a','b','c']) {|x| ...}", 'abc', function() {
  var rv = "";
  s.each(['a','b','c']) { |x| rv += x };
  return rv;
});

test("['a','b','c'] .. each{|x| ...}", 'abc', function() {
  var rv = "";
  ['a','b','c'] .. s.each { |x| rv += x };
  return rv;
});

test("'abc' .. each{|x| ...}", 'abc', function() {
  var rv = "";
  'abc' .. s.each { |x| rv += x };
  return rv;
});

test("['a','b','c'] .. iterate{ |next| ...}", 'abc', function() {
  var rv = "", eos = {};
  ['a','b','c'] .. s.iterate(eos) { 
    |next|
    var x;
    while((x = next()) != eos)
      rv += x;
  }
  return rv;
});

test("['a','b','c'] .. iterate{ |next| hold(.) ...}", 'abcx', function() {
  var rv = "", eos = 'x';
  ['a','b','c'] .. s.iterate(eos) { 
    |next|
    var x;
    hold(10);
    while((x = next()) != eos) {
      hold(10);
      rv += x;
    }
    // try to retrieve another eos:
    rv += next();
  }
  return rv;
});

test("'abcdefghij' .. parallelize(5) .. each", 'abcdefghij', function() {
  var rv = '';
  var eachs = 0, max_concurrent_eachs = 0;
  'abcdefghij' .. s.parallelize(5) .. s.each {
    |x|
    ++eachs;
    max_concurrent_eachs = Math.max(eachs, max_concurrent_eachs);
    rv += x;
    hold(Math.random()*100);
    --eachs;
  }
  if (max_concurrent_eachs != 5) return "Parallelism didn't feed through";
  return rv;
});


test("'abcdefghij' .. parallelize(5) .. iterate", 'abcdefghij', function() {
  var rv = '';
  var loops = 0;
  'abcdefghij' .. s.parallelize(5) .. s.iterate {
    |next|
    var x;
    ++loops;
    while (x = next()) {
      rv += x;
      hold(Math.random()*100);
    }
  }
  if (loops != 5) return "Parallelism didn't feed through";
  return rv;
});

test("isStream()", true, function() {
  return !s.isStream([1,2,3,4]) && s.isStream([1,2,3,4] .. s.take(5));
});

test("skip", "45", function() {
  var rv = '';
  [1,2,3,4,5] .. s.skip(3) .. s.each { |x| rv += x }
  return rv;
});

test('toArray on an array does nothing', true, function() {
  var a = [1,2,3];
  return a === s.toArray(a);
});

test('toArray on `arguments`', {wasArray: false, isArray: true, value: [1,2,3]}, function() {
  var args = null;
  (function() {
    args = arguments;
  })(1,2,3);
  var arr = s.toArray(args);
  return {
    wasArray: args instanceof Array,
    isArray: arr instanceof Array,
    value: arr
  }
});

test('each is ordered', [1,2,3], function() {
  var res = [];
  s.each([1,2,3],
    withDecreasingTimeout(function(elem) { res.push(elem); }));
  return res;
});

test('parallelized each is temporaly ordered', [3,2,1], function() {
  var res = [];
  [1,2,3] .. s.parallelize .. s.each(
    withDecreasingTimeout(function(elem) { res.push(elem); }));
  return res;
});

test('each doesn\'t swallow all exceptions', 'expected error', function() {
  try {
    s.each([1,2,3], function() { throw new Error("expected error"); });
    return "no error thrown!"
  } catch (e) {
    return e.message;
  }
});

test('parallelized map', {order: [3,2,1], result: [6,4,2]}, function() {
  var order = [];
  var result = [1,2,3] .. s.parallelize .. s.map(
    withDecreasingTimeout(function(elem) {
      order.push(elem);
      return elem * 2;
    })) .. s.toArray;
  return {order: order, result: result};
});

test('map', {order: [1,2,3], result: [2,4,6]}, function() {
  var order = [];
  var result = s.map([1,2,3],
    withDecreasingTimeout(function(elem) {
      order.push(elem);
      return elem * 2;
    })) .. s.toArray;
  return {order: order, result: result};
});

test('find returns early', {checked: [1,2], result: 2}, function() {
  var order = [];
  var result = s.find([1,2,3],
    withDecreasingTimeout(function(elem) {
      order.push(elem);
      return elem == 2;
    }));
  return {checked: order, result: result};
});

test('parallelized find returns early', {checked: [3,2], result: 2}, function() {
  var order = [];
  var result = [1,2,3] .. s.parallelize .. s.find(
    withDecreasingTimeout(function(elem) {
      order.push(elem);
      return elem == 2;
    }));
  return {checked: order, result: result};
});

test('find / parallelized find return undefined if not found',
    [undefined, undefined],
    function() {
  var fn = function() { return false; };
  var c = [1,2,3];
  return [
    s.find(s.parallelize(c), fn),
    s.find(c, fn)
  ];
});

test('filter', {checked: [1,2,3], result: [1,3]}, function() {
  var checked = [];
  var result = s.filter([1,2,3],
    withDecreasingTimeout(function(elem) {
      checked.push(elem);
      return elem != 2;
    })) .. s.toArray;
  return {checked:checked, result:result};
});

test('parallelized filter', {checked: [3,2,1], result: [3,1]}, function() {
  var checked = [];
  var result = [1,2,3] .. s.parallelize .. s.filter(
    withDecreasingTimeout(function(elem) {
      checked.push(elem);
      return elem != 2;
    })) .. s.toArray;
  return {checked:checked, result:result};
});

test('reduce', 6, function() {
  return s.reduce([1,2,3], 0, function(accum, el) { return accum + el; });
});

test('reduce1', 6, function() {
  return s.reduce1([1,2,3], function(accum, el) { return accum + el; });
});

test('reduce1 on empty array', 'reduce1 on empty sequence', function() {
  try {
    return s.reduce1([], function() { throw 'should not be run'; }, 'reduce1 on empty sequence');
  } catch(e) {
    return e.message;
  }
});

test('parallel any returns early', {checked: [3, 2], result: true}, function() {
  var checked = [];
  var result = [1,2,3] .. s.parallelize .. s.any(
    withDecreasingTimeout(function(elem) {
      checked.push(elem);
      return elem == 2;
    }));
  return {checked:checked, result:result};
});

test('any returns early', {checked: [1, 2], result: true}, function() {
  var checked = [];
  var result = s.any([1,2,3],
    withDecreasingTimeout(function(elem) {
      checked.push(elem);
      return elem == 2;
    }));
  return {checked:checked, result:result};
});

test('any returns false when there is no match', false, function() {
  var c = [1,2,3];
  var fn = function() { return false; };
  return s.any(c, fn);
});

test('parallelized all returns early', {checked: [3, 2], result: false}, function() {
  var checked = [];
  var result = [1,2,3] .. s.parallelize .. s.all(
    withDecreasingTimeout(function(elem) {
      checked.push(elem);
      return elem != 2;
    }));
  return {checked:checked, result:result};
});

test('all returns early', {checked: [1, 2], result: false}, function() {
  var checked = [];
  var result = s.all([1,2,3],
    withDecreasingTimeout(function(elem) {
      checked.push(elem);
      return elem != 2;
    }));
  return {checked:checked, result:result};
});

test('all / parallelized all returns true when all match', [true, true], function() {
  var c = [1,2,3];
  var fn = function() { return true; };
  return [s.all(c, fn), s.all(s.parallelize(c), fn)];
});

test('generate', [1,2,3], function() {
  var i=0;
  function generator() { return ++i; }
  return s.generate(generator) .. s.take(3) .. s.toArray ;
});

test('parallelize scaling', 10000, function() {
  var i=0;
  s.integers() .. s.parallelize(10000) .. s.each { 
    |x|
    
    if (++i == 10000) break;
//    if (i%1000 == 0) process.stdout.write('.');
    hold();
  }
  return i;
});

test('parallelize teardown', '123ff.', function() {
  var rv='';
  s.integers(1) .. s.parallelize .. s.each {
    |x|
    rv += x;
    if (x == 3) break;
    try { hold(); } finally { rv += 'f' }
  }
  rv += '.';
  return rv;
});

test('parallelize teardown on exception', '12345fffffe.', function() {
  var rv='';
  try {
    s.integers(1) .. s.parallelize(5) .. s.each {
      |x|
      try {
        rv += x; 
        hold(0);
        if (x == 3) throw new Error('done');
        hold(); 
      } 
      finally { 
        rv += 'f';
      }
    }
  }
  catch (e) { rv += 'e' }
    rv += '.';
  return rv;
})


test("take() leaves the rest", [[1], [2,3,4]], function() {
  var arr = [1,2,3,4];
  var seq = s.Stream() {|emit| while(arr.length > 0) emit(arr.shift());}
  var head = seq .. s.take(1) .. s.toArray();
  var tail = seq .. s.toArray();
  return [head, tail];
});

test('indexed(["one","two","three"], 1)', [[1,"one"],[2,"two"],[3,"three"]], function() {
  return s.indexed(["one","two","three"], 1) .. toArray;
});

test('indexed(["zero","one"])', [[0,"zero"],[1,"one"]], function() {
  return s.indexed(["zero","one"]) .. toArray;
});

test('indexed() stream restarts at 0', [[[0,0],[1,1]],[[0,0],[1,1]]], function() {
  var indexedIntegers = s.indexed(s.integers());
  var rv = [];
  rv.push(indexedIntegers .. s.take(2) .. s.toArray);
  rv.push(indexedIntegers .. s.take(2) .. s.toArray);
  return rv;
});

test('eventStream()', [1,2,3,4], function() {
  var evt = cutil.Event();
  var result = [];
  waitfor {
    s.eventStream(evt) .. s.each {|item|
      result.push(item);
    }
  } or {
    hold(10);
    evt.emit(1)
    hold(10);
    evt.emit(2)
    evt.emit(3)
    evt.emit(4)
  }
  return result;
});

test('combine', ['a','b','b','a','c'], function() {
  var as = s.Stream() {|r|
    r('a');
    hold(5);
    r('a');
  }

  var bs = s.Stream() {|r|
    r('b');
    r('b');
  }

  var cs = s.Stream() {|r|
    hold(10);
    r('c');
  }
  return s.combine(as, bs, cs) .. toArray();
});

test('concat([1,2],[3,4])', [1,2,3,4], function () { return s.concat([1,2], [3,4]) .. toArray; });
test('concat([[1,2],[3,4]])', [1,2,3,4], function () { return s.concat([[1,2], [3,4]]) .. toArray; });

test('partition(integers(1,10), x->x%2)', [[1, 3, 5, 7, 9], [2, 4, 6, 8, 10]], function() {
  return s.partition(s.integers(1, 10), x -> x%2) .. s.map(s.toArray) .. s.toArray;
});

test('eventStream() only buffers events while iterating', [2,3,4], function() {
  var evt = cutil.Event();
  var result = [];
  var stream = s.eventStream(evt)
  waitfor {
    evt.emit(1)
    hold(10);
    evt.emit(2)
    hold(10);
    evt.emit(3)
    evt.emit(4)
  } or {
    stream .. s.each {|item|
      result.push(item);
    }
  }
  return result;
});
