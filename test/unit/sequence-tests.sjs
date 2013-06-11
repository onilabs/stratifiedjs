var testUtil = require('../lib/testUtil');
var testEq = testUtil.test;
var testFn = testUtil.testFn;
var {test, context, assert} = require('sjs:test/suite');

var s = require("sjs:sequence");
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

var nonRepeatableSequence = function(arr) {
  var arr = arr.slice();
  var seq = s.Stream() {|emit| while(arr.length > 0) emit(arr.shift());}
  return seq;
};

var countSlowly = function(interval) {
  return s.Stream {|emit|
    s.integers() .. s.each {|i|
      emit(i);
      hold(interval);
    }
  }
};


var even = (x) -> x % 2 == 0;

//----------------------------------------------------------------------
// tests

testEq("each(['a','b','c'], f)", 'abc', function() {
  var rv = "";
  s.each(['a','b','c'], function(x) { rv += x });
  return rv;
});

testEq("each(['a','b','c']) {|x| ...}", 'abc', function() {
  var rv = "";
  s.each(['a','b','c']) { |x| rv += x };
  return rv;
});

testEq("['a','b','c'] .. each{|x| ...}", 'abc', function() {
  var rv = "";
  ['a','b','c'] .. s.each { |x| rv += x };
  return rv;
});

testEq("'abc' .. each{|x| ...}", 'abc', function() {
  var rv = "";
  'abc' .. s.each { |x| rv += x };
  return rv;
});

testEq("['a','b','c'] .. consume{ |next| ...}", 'abc', function() {
  var rv = "", eos = {};
  ['a','b','c'] .. s.consume(eos) { 
    |next|
    var x;
    while((x = next()) != eos)
      rv += x;
  }
  return rv;
});

testEq("['a','b','c'] .. consume{ |next| hold(.) ...}", 'abcx', function() {
  var rv = "", eos = 'x';
  ['a','b','c'] .. s.consume(eos) { 
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

testEq("'abcdefghij' .. parallelize(5) .. each", 'abcdefghij', function() {
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


testEq("'abcdefghij' .. parallelize(5) .. consume", 'abcdefghij', function() {
  var rv = '';
  var loops = 0;
  'abcdefghij' .. s.parallelize(5) .. s.consume {
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

testEq("isStream()", true, function() {
  return !s.isStream([1,2,3,4]) && s.isStream([1,2,3,4] .. s.take(5));
});

testEq("skip", "45", function() {
  var rv = '';
  [1,2,3,4,5] .. s.skip(3) .. s.each { |x| rv += x }
  return rv;
});

context('toArray') {||
  test('toArray on empty stream') {||
    var seq = s.Stream({|r| null });
    seq .. toArray .. assert.eq([]);
  };

  testEq('toArray on an array does nothing', true, function() {
    var a = [1,2,3];
    return a === s.toArray(a);
  });

  testEq('toArray on `arguments`', {wasArray: false, isArray: true, value: [1,2,3]}, function() {
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
}

testEq('each is ordered', [1,2,3], function() {
  var res = [];
  s.each([1,2,3],
    withDecreasingTimeout(function(elem) { res.push(elem); }));
  return res;
});

testEq('parallelized each is temporaly ordered', [3,2,1], function() {
  var res = [];
  [1,2,3] .. s.parallelize .. s.each(
    withDecreasingTimeout(function(elem) { res.push(elem); }));
  return res;
});

testEq('each doesn\'t swallow all exceptions', 'expected error', function() {
  try {
    s.each([1,2,3], function() { throw new Error("expected error"); });
    return "no error thrown!"
  } catch (e) {
    return e.message;
  }
});

testEq('parallelized map', {order: [3,2,1], result: [6,4,2]}, function() {
  var order = [];
  var result = [1,2,3] .. s.parallelize .. s.map(
    withDecreasingTimeout(function(elem) {
      order.push(elem);
      return elem * 2;
    }));
  return {order: order, result: result};
});

testEq('map', {order: [1,2,3], result: [2,4,6]}, function() {
  var order = [];
  var result = s.map([1,2,3],
    withDecreasingTimeout(function(elem) {
      order.push(elem);
      return elem * 2;
    }));
  assert.notOk(s.isStream(result));
  return {order: order, result: result};
});

testEq('transform', {order: [1,2,3], result: [2,4,6]}, function() {
  var order = [];
  var result = s.transform([1,2,3],
    withDecreasingTimeout(function(elem) {
      order.push(elem);
      return elem * 2;
    }));
  assert.ok(s.isStream(result));
  return {order: order, result: result .. toArray()};
});

testEq('find returns early', {checked: [1,2], result: 2}, function() {
  var order = [];
  var result = s.find([1,2,3],
    withDecreasingTimeout(function(elem) {
      order.push(elem);
      return elem == 2;
    }));
  return {checked: order, result: result};
});

testEq('parallelized find returns early', {checked: [3,2], result: 2}, function() {
  var order = [];
  var result = [1,2,3] .. s.parallelize .. s.find(
    withDecreasingTimeout(function(elem) {
      order.push(elem);
      return elem == 2;
    }));
  return {checked: order, result: result};
});

testEq('find / parallelized find return undefined if not found',
    [undefined, undefined],
    function() {
  var fn = function() { return false; };
  var c = [1,2,3];
  return [
    s.find(s.parallelize(c), fn),
    s.find(c, fn)
  ];
});

testEq('filter', {checked: [1,2,3], result: [1,3]}, function() {
  var checked = [];
  var result = s.filter([1,2,3],
    withDecreasingTimeout(function(elem) {
      checked.push(elem);
      return elem != 2;
    })) .. s.toArray;
  return {checked:checked, result:result};
});

test('filter with no arguments') {||
  s.filter([1,true, 0, 3, null]) .. s.toArray() .. assert.eq([1, true, 3]);
};

testEq('parallelized filter', {checked: [3,2,1], result: [3,1]}, function() {
  var checked = [];
  var result = [1,2,3] .. s.parallelize .. s.filter(
    withDecreasingTimeout(function(elem) {
      checked.push(elem);
      return elem != 2;
    })) .. s.toArray;
  return {checked:checked, result:result};
});

testEq('reduce', 6, function() {
  return s.reduce([1,2,3], 0, function(accum, el) { return accum + el; });
});

testEq('reduce1', 6, function() {
  return s.reduce1([1,2,3], function(accum, el) { return accum + el; });
});

testEq('reduce1 on empty array', 'reduce1 on empty sequence', function() {
  try {
    return s.reduce1([], function() { throw 'should not be run'; }, 'reduce1 on empty sequence');
  } catch(e) {
    return e.message;
  }
});

testEq('parallel any returns early', {checked: [3, 2], result: true}, function() {
  var checked = [];
  var result = [1,2,3] .. s.parallelize .. s.any(
    withDecreasingTimeout(function(elem) {
      checked.push(elem);
      return elem == 2;
    }));
  return {checked:checked, result:result};
});

testEq('any returns early', {checked: [1, 2], result: true}, function() {
  var checked = [];
  var result = s.any([1,2,3],
    withDecreasingTimeout(function(elem) {
      checked.push(elem);
      return elem == 2;
    }));
  return {checked:checked, result:result};
});

testEq('any returns false when there is no match', false, function() {
  var c = [1,2,3];
  var fn = function() { return false; };
  return s.any(c, fn);
});

testEq('parallelized all returns early', {checked: [3, 2], result: false}, function() {
  var checked = [];
  var result = [1,2,3] .. s.parallelize .. s.all(
    withDecreasingTimeout(function(elem) {
      checked.push(elem);
      return elem != 2;
    }));
  return {checked:checked, result:result};
});

testEq('all returns early', {checked: [1, 2], result: false}, function() {
  var checked = [];
  var result = s.all([1,2,3],
    withDecreasingTimeout(function(elem) {
      checked.push(elem);
      return elem != 2;
    }));
  return {checked:checked, result:result};
});

testEq('all / parallelized all returns true when all match', [true, true], function() {
  var c = [1,2,3];
  var fn = function() { return true; };
  return [s.all(c, fn), s.all(s.parallelize(c), fn)];
});

testEq('generate', [1,2,3], function() {
  var i=0;
  function generator() { return ++i; }
  return s.generate(generator) .. s.take(3) .. s.toArray ;
});

testEq('parallelize scaling', 10000, function() {
  var i=0;
  s.integers() .. s.parallelize(10000) .. s.each { 
    |x|
    
    if (++i == 10000) break;
//    if (i%1000 == 0) process.stdout.write('.');
    hold();
  }
  return i;
});

testEq('parallelize teardown', '123ff.', function() {
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

testEq('parallelize teardown on exception', '12345fffffe.', function() {
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


context('take and skip') {||
  test("take(0)") {||
    s.take(0, [1,2,3]) .. toArray .. assert.eq([]);
  }

  test("take with a negative argument") {||
    s.take(-1, [1,2,3]) .. toArray .. assert.eq([]);
  }

  testEq("take() leaves the rest", [[1], [2,3,4]], function() {
    var arr = [1,2,3,4];
    var seq = nonRepeatableSequence([1,2,3,4]);
    var head = seq .. s.take(1) .. s.toArray();
    var tail = seq .. s.toArray();
    return [head, tail];
  });

  test('skipWhile') {||
    [2,4,6,7,8,9,10] .. s.skipWhile(even) .. s.toArray .. assert.eq([7,8,9,10]);
  }

  test('takeWhile') {||
    [2,4,6,7,8,9,10] .. s.takeWhile(even) .. s.toArray .. assert.eq([2,4,6]);
  }
}

context('at') {||
  test('first element', -> [1,2,3] .. s.at(0) .. assert.eq(1));
  test('first element (by negative index)', -> [1,2,3] .. s.at(-3) .. assert.eq(1));
  test('last element', -> [1,2,3] .. s.at(2) .. assert.eq(3));
  test('last element (by negative index)', -> [1,2,3] .. s.at(-1) .. assert.eq(3));
  test('middle element (by negative index)', -> [1,2,3] .. s.at(-2) .. assert.eq(2));
  test('beyond array bounds') {||
    assert.raises({ inherits: s.SequenceExhausted },
      -> [1,2,3] .. s.at(3));

    assert.raises({ inherits: s.SequenceExhausted },
      -> [1,2,3] .. s.at(300));

    assert.raises({ inherits: s.SequenceExhausted },
      -> [1,2,3] .. s.at(-4));

    assert.raises({ inherits: s.SequenceExhausted },
      -> [1,2,3] .. s.at(-300));
  }
  test('beyond last element (with default)', -> [1,2,3] .. s.at(5, undefined) .. assert.eq(undefined));
  test('beyond first element (with default)', -> [1,2,3] .. s.at(-5, 'default') .. assert.eq('default'));
}

context('indexed') {||
  testEq('indexed(["one","two","three"], 1)', [[1,"one"],[2,"two"],[3,"three"]], function() {
    return s.indexed(["one","two","three"], 1) .. toArray;
  });

  testEq('indexed(["zero","one"])', [[0,"zero"],[1,"one"]], function() {
    return s.indexed(["zero","one"]) .. toArray;
  });

  testEq('stream restarts at 0', [[[0,0],[1,1]],[[0,0],[1,1]]], function() {
    var indexedIntegers = s.indexed(s.integers());
    var rv = [];
    rv.push(indexedIntegers .. s.take(2) .. s.toArray);
    rv.push(indexedIntegers .. s.take(2) .. s.toArray);
    return rv;
  });
}

testEq('combine', ['a','b','b','a','c'], function() {
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

testEq('concat([1,2],[3,4])', [1,2,3,4], function () { return s.concat([1,2], [3,4]) .. toArray; });
testEq('concat([[1,2],[3,4]])', [1,2,3,4], function () { return s.concat([[1,2], [3,4]]) .. toArray; });

testEq('partition(integers(1,10), x->x%2)', [[1, 3, 5, 7, 9], [2, 4, 6, 8, 10]], function() {
  return s.partition(s.integers(1, 10), x -> x%2) .. s.map(s.toArray);
});

context('first') {||
  test('fails on an empty array') {||
    assert.raises({
      inherits: s.SequenceExhausted,
      message: 'sequence exhausted'},
      -> s.first([]));
  }

  test('fails on an empty stream') {||
    assert.raises({
      inherits: s.SequenceExhausted,
      message: 'sequence exhausted'},
      -> s.first(s.Stream {|r| }));
  }

  test('consumes and returns the first element of a nonempty sequence') {||
    var seq = nonRepeatableSequence(['one','two','three']);
    s.first(seq) .. assert.eq('one');
    s.toArray(seq) .. assert.eq(['two', 'three']);
  }

  test('waits for non-atomic values') {||
    var seq = s.Stream {|r|
      hold(100);
      r('one');
      
      // first() should not wait for this second value:
      hold(1000 * 10);
      r('two');
    };
    s.first(seq) .. assert.eq('one');
  }
}.timeout(0.5);

context('zip') {||
  test('zip on same-sized arrays') {||
    s.zip([1,2,3], ['one','two','three']) .. toArray .. assert.eq([
      [1, 'one'],
      [2, 'two'],
      [3, 'three'],
    ]);
  }

  test('zip on uneven arrays') {||
    s.zip([1,2,3], ['one']) .. toArray .. assert.eq([[1, 'one']]);
  }

  test('zip on empty arrays') {||
    s.zip([], []) .. toArray .. assert.eq([]);
  }

  test('zipLongest on uneven arrays') {||
    s.zipLongest([1,2,3], ['one']) .. toArray .. assert.eq([
      [1, 'one'],
      [2, undefined],
      [3, undefined],
    ]);

    s.zipLongest([1], ['one','two','three']) .. toArray .. assert.eq([
      [1, 'one'],
      [undefined, 'two'],
      [undefined, 'three'],
    ]);
  }
}


test('groupBy') {||
  [2,4,6,7,9,10] .. s.groupBy(even) .. s.toArray .. assert.eq([
    [true, [2, 4, 6]],
    [false, [7, 9]],
    [true, [10]],
  ]);

  ['one', 'two', 'three', 'four'] .. s.groupBy(x -> x.length) .. s.toArray .. assert.eq([
    [3, ['one', 'two']],
    [5, ['three']],
    [4, ['four']],
  ]);

  ['one', 'two', 'three', 'four'] .. s.groupBy('length') .. s.toArray .. assert.eq([
    [3, ['one', 'two']],
    [5, ['three']],
    [4, ['four']],
  ]);

  [1,1,2,'2',{},{}] .. s.groupBy(null) .. s.toArray .. assert.eq([
    [1, [1, 1]],
    [2, [2]],
    ['2', ['2']],
    [{}, [{}]],
    [{}, [{}]],
  ]);
}

context('sortBy') {||
  var input = [
    'zz',
    'lsdfjd',
    'a',
    'abcd',
    'jjj',
  ].slice();
  
  var expected = [
    'a',
    'zz',
    'jjj',
    'abcd',
    'lsdfjd'
  ];

  test('property name', -> input.slice() .. s.sortBy('length') .. assert.eq(expected));
  test('key function', -> input.slice() .. s.sortBy(x -> x.length) .. assert.eq(expected));
}

context('slice') {||
  var seq = [0,1,2,3,4,5];
  test('parity with array.slice()') {||
    // just brute force all interesting indexes for our input
    var indexes = [undefined, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7];
    indexes .. s.each {|start|
      indexes .. s.each {|end|
        var args = [start];
        if (end !== undefined) args.push(end);

        var desc = "seq .. slice(#{args.join(",")})";
        var result = seq .. s.slice(start, end);
        var expected = seq.slice.apply(seq, args);
        result .. toArray .. assert.eq(expected, desc);
        result .. toArray .. assert.eq(expected, "(re-enumerate) #{desc}");
      }
    }
  }

  test('infinite emitter') {||
    s.integers() .. s.slice(1, 5) .. toArray .. assert.eq([1,2,3,4]);
    s.integers() .. s.slice(1, -5) .. s.take(4) .. toArray .. assert.eq([1,2,3,4]);
  }

  test('slow emitter') {||
    var emitted = [];
    var receivedNeg = [];
    var receivedPos = [];
    var interval = 50;

    waitfor {
      countSlowly(interval) .. s.each(x-> emitted.push(x));
    } or {
      countSlowly(interval) .. s.slice(0, -2) .. s.each(x -> receivedNeg.push(x));
    } or {
      countSlowly(interval) .. s.slice(0, 10) .. s.each(x -> receivedPos.push(x));
    } or {
      hold((interval * 4) + (interval / 2));
    }
    emitted .. assert.eq([0,1,2,3,4]);
    
    // even though the stream never ended, the negative-end slice should
    // have started emitting with a buffer of 2
    receivedNeg .. assert.eq([0,1,2], "negative end index");

    // and the positive slice should have emitted everything so far
    receivedPos .. assert.eq([0,1,2,3,4], "positive end index");
  }
}
