var testUtil = require('../lib/testUtil');
var testEq = testUtil.test;
var testFn = testUtil.testFn;
var {test, context, assert} = require('sjs:test/suite');

@ = require([
  'sjs:test/std',
  'sjs:set',
  'sjs:map'
]);
var s = require("sjs:sequence");
var seq = s;
var { eq } = require('sjs:compare');
var {Quasi} = require("sjs:quasi");
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
    hold(amount-=50);
    return fn.apply(this, arguments);
  };
};

var nonRepeatableSequence = function(arr) {
  var arr = arr.slice();
  var seq = s.Stream :: function(emit) { while(arr.length > 0) emit(arr.shift());}
  return seq;
};

var countSlowly = function(interval) {
  return s.Stream:: function(emit) {
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

test("each on String object", function() {
  var rv = "";
  new String('abc') .. s.each { |x| rv += x };
  assert.eq(rv, 'abc');
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

testEq("'abcdefghij' .. each.par(5)", 'abcdefghij', function() {
  var rv = '';
  var eachs = 0, max_concurrent_eachs = 0;
  'abcdefghij' .. s.each.par(5) {
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

testEq("isStream()", true, function() {
  return !s.isStream([1,2,3,4]) && s.isStream([1,2,3,4] .. s.take(5));
});

@test("concrete sequences", function() {
  [ 1, 2, 3] .. s.isConcreteSequence .. @assert.ok;
  "123" .. s.isConcreteSequence .. @assert.ok;
  ([1,2,3] .. s.toStream()) .. s.isConcreteSequence .. @assert.notOk;
});


testEq("skip", "45", function() {
  var rv = '';
  [1,2,3,4,5] .. s.skip(3) .. s.each { |x| rv += x }
  return rv;
});

context('toArray', function() {
  test('toArray on empty stream', function() {
    var seq = s.Stream :: function(r) { null };
    seq .. toArray .. assert.eq([]);
  });

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
})

testEq('each is ordered', [1,2,3], function() {
  var res = [];
  s.each([1,2,3],
    withDecreasingTimeout(function(elem) { res.push(elem); }));
  return res;
});

testEq('each.par is temporaly ordered', [3,2,1], function() {
  var res = [];
  [1,2,3] .. s.each.par(
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

testEq('map.par', {order: [3,2,1], result: [2,4,6]}, function() {
  var order = [];
  var result = [1,2,3] .. s.map.par(
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

testEq('transform.par', {order: [3,2,1], result: [2,4,6]}, function() {
  var order = [];
  var result = [1,2,3] .. s.transform.par(
    withDecreasingTimeout(function(elem) {
      order.push(elem);
      return elem * 2;
    }));
  assert.ok(s.isStream(result));
  return {order: order, result: result .. toArray()};
});

testEq('transform.par.unordered', {order: [3,2,1], result: [6,4,2]}, function() {
  var order = [];
  var result = [1,2,3] .. s.transform.par.unordered(
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

testEq('find.par returns early', {checked: [3,2], result: 2}, function() {
  var order = [];
  var result = [1,2,3] .. s.find.par(
    withDecreasingTimeout(function(elem) {
      order.push(elem);
      return elem == 2;
    }));
  return {checked: order, result: result};
});

testEq('find / find.par return defaultValue if not found',
    ['default1', 'default2', 'default3'],
    function() {
  var fn = function() { return false; };
  var c = [1,2,3];
  return [
    s.find.par(c, fn, 'default1'),
    s.find.par(c, 10, fn, 'default2'),
    s.find(c, fn, 'default3')
  ];
});

test('find / find.par throws', function() {
  assert.raises({ inherits: s.SequenceExhausted },
                -> [1,2,3] .. s.find(-> false));

  assert.raises({ inherits: s.SequenceExhausted },
                -> [1,2,3] .. s.find.par(-> false));

  assert.raises({ inherits: s.SequenceExhausted },
                -> [1,2,3] .. s.find.par(10, -> false));
})

testEq('filter', {checked: [1,2,3], result: [1,3]}, function() {
  var checked = [];
  var result = s.filter([1,2,3],
    withDecreasingTimeout(function(elem) {
      checked.push(elem);
      return elem != 2;
    })) .. s.toArray;
  return {checked:checked, result:result};
});

test('transform.filter', function() {
  var rv = [1,2,3, 4, 5] .. s.transform.filter(x -> x % 2 == 0 ? x*2);
  rv .. s.isStream() .. assert.ok();
  rv .. s.toArray() .. assert.eq([4, 8]);
});

test('map.filter', function() {
  var rv = [1,2,3, 4, 5] .. s.map.filter(x -> x % 2 == 0 ? x*2);
  rv .. assert.eq([4, 8]);
});

test('filter with no arguments', function() {
  s.filter([1,true, 0, 3, null]) .. s.toArray() .. assert.eq([1, true, 3]);
});

testEq('filter.par', {checked: [3,2,1], result: [3,1]}, function() {
  var checked = [];
  var result = [1,2,3] .. s.filter.par(
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

testEq('reduce1 with f_first', [3,6], function() {
  return s.reduce1([1,2,3], function([n,s],el) {return [++n,s+el];}, undefined, 
                   function(el) { return [1,el]; });
})

testEq('scan', [3, 6], function() {
  return s.scan([1,2,3], function(accum, el) { return accum + el; }) .. s.toArray();
});

test('scan on empty or single-element array', function() {
  [] .. s.scan(x -> x) .. s.toArray .. @assert.eq([]);
  [1] .. s.scan(x -> x) .. s.toArray .. @assert.eq([]);
});

test('all & any predicate is optional', function() {
  [true] .. s.all() .. assert.eq(true);
  [false] .. s.any() .. assert.eq(false);
})

testEq('any.par returns early', {checked: [3, 2], result: true}, function() {
  var checked = [];
  var result = [1,2,3] .. s.any.par(
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

testEq('all.par returns early', {checked: [3, 2], result: false}, function() {
  var checked = [];
  var result = [1,2,3] .. s.all.par(
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

testEq('all / all.par returns true when all match', [true, true], function() {
  var c = [1,2,3];
  var fn = function() { return true; };
  return [s.all(c, fn), s.all.par(c, fn)];
});

testEq('generate', [1,2,3], function() {
  var i=0;
  function generator() { return ++i; }
  return s.generate(generator) .. s.take(3) .. s.toArray ;
});

testEq('each.par scaling', 10000, function() {
  var i=0;
  s.integers() .. s.each.par(10000) { 
    |x|
    
    if (++i == 10000) break;
    //if (i%1000 == 0) process.stdout.write('.');
    hold();
  }
  return i;
});

testEq('each.par teardown', '123ff.', function() {
  var rv='';
  s.integers(1) .. s.each.par {
    |x|
    rv += x;
    if (x == 3) break;
    try { hold(); } finally { rv += 'f'; }
  }
  rv += '.';
  return rv;
});

testEq('each.par teardown on exception', '12345fffffe.', function() {
  var rv='';
  try {
    s.integers(1) .. s.each.par(5) {
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


context('take and skip', function() {
  test("take(0)", function() {
    s.take([1,2,3],0) .. toArray .. assert.eq([]);
  })

  test("take with a negative argument", function() {
    s.take([1,2,3],-1) .. toArray .. assert.eq([]);
  })

  testEq("take() leaves the rest", [[1], [2,3,4]], function() {
    var arr = [1,2,3,4];
    var seq = nonRepeatableSequence([1,2,3,4]);
    var head = seq .. s.take(1) .. s.toArray();
    var tail = seq .. s.toArray();
    return [head, tail];
  });

  test('async take', function() {
    s.integers() .. s.monitor(->hold(0)) .. s.take(7) .. s.toArray .. assert.eq([0,1,2,3,4,5,6]);
  })

  test('take async', function() {
    s.integers() .. s.take(7) .. s.monitor(->hold(0)) .. s.toArray .. assert.eq([0,1,2,3,4,5,6]);
  })

  test('take all async', function() {
    s.integers() .. s.monitor(->hold(0)) .. s.take(7) .. s.monitor(->hold(0)) .. s.toArray .. assert.eq([0,1,2,3,4,5,6]);
  })

  test('skipWhile', function() {
    [2,4,6,7,8,9,10] .. s.skipWhile(even) .. s.toArray .. assert.eq([7,8,9,10]);
  })

  test('takeWhile', function() {
    [2,4,6,7,8,9,10] .. s.takeWhile(even) .. s.toArray .. assert.eq([2,4,6]);
  })

  test('takeUntil', function() {
    s.integers() .. s.takeUntil(x->x>5) .. s.toArray .. assert.eq([0,1,2,3,4,5,6]);
  })

  test('async takeUntil', function() {
    s.integers() .. s.monitor(->hold(0)) .. s.takeUntil(x->x>5) .. s.toArray .. assert.eq([0,1,2,3,4,5,6]);
  })

  test('takeUntil async', function() {
    s.integers() .. s.takeUntil(x->x>5) .. s.monitor(->hold(0)) .. s.toArray .. assert.eq([0,1,2,3,4,5,6]);
  })

  test('takeUntil async pred', function() {
    s.integers() .. s.takeUntil(x->(hold(0),x>5)) .. s.toArray .. assert.eq([0,1,2,3,4,5,6]);
  })

  test('takeUntil all async', function() {
    s.integers() .. s.monitor(->hold(0)) .. s.takeUntil(x->(hold(0),x>5)) .. s.monitor(->hold(0)) .. s.toArray .. assert.eq([0,1,2,3,4,5,6]);
  })

})

context('at', function() {
  test('first element', -> [1,2,3] .. s.at(0) .. assert.eq(1));
  test('first element (by negative index)', -> [1,2,3] .. s.at(-3) .. assert.eq(1));
  test('last element', -> [1,2,3] .. s.at(2) .. assert.eq(3));
  test('last element (by negative index)', -> [1,2,3] .. s.at(-1) .. assert.eq(3));
  test('middle element (by negative index)', -> [1,2,3] .. s.at(-2) .. assert.eq(2));
  test('beyond array bounds', function() {
    assert.raises({ inherits: s.SequenceExhausted },
      -> [1,2,3] .. s.at(3));

    assert.raises({ inherits: s.SequenceExhausted },
      -> [1,2,3] .. s.at(300));

    assert.raises({ inherits: s.SequenceExhausted },
      -> [1,2,3] .. s.at(-4));

    assert.raises({ inherits: s.SequenceExhausted },
      -> [1,2,3] .. s.at(-300));
  })
  test('beyond last element (with default)', -> [1,2,3] .. s.at(5, undefined) .. assert.eq(undefined));
  test('beyond first element (with default)', -> [1,2,3] .. s.at(-5, 'default') .. assert.eq('default'));
})

context('indexed', function() {
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
})

testEq('combine', ['a','b','b','a','c'], function() {
  var as = s.Stream:: function(r) {
    r('a');
    hold(5);
    r('a');
  }

  var bs = s.Stream:: function(r) {
    r('b');
    r('b');
  }

  var cs = s.Stream:: function(r) {
    hold(10);
    r('c');
  }
  return s.combine(as, bs, cs) .. toArray();
});

testEq('combine with blocking receiver', ['a'], function() {
  var as = s.Stream:: function(r) {
    r('a');
    hold(5);
    r('a');
  }

  var bs = s.Stream:: function(r) {
    r('b');
    r('b');
  }

  var cs = s.Stream:: function(r) {
    hold(10);
    r('c');
  }
  var rv = [];
  s.combine(as, bs, cs) .. s.each {
    |x|
    rv.push(x);
    hold(100);
  }
  return rv;
});

testEq('concat([1,2],[3,4])', [1,2,3,4], function () { return s.concat([1,2], [3,4]) .. toArray; });
testEq('concat([[1,2],[3,4]])', [1,2,3,4], function () { return s.concat([[1,2], [3,4]]) .. toArray; });
testEq('concat(Stream([1,2],[3,4]))', [1,2,3,4], function () { return s.concat(nonRepeatableSequence([[1,2], [3,4]])) .. toArray; });


context('first', function() {
  test('fails on an empty array', function() {
    assert.raises({
      inherits: s.SequenceExhausted,
      message: 'sequence exhausted'},
      -> s.first([]));
  })

  test('fails on an empty stream', function() {
    assert.raises({
      inherits: s.SequenceExhausted,
      message: 'sequence exhausted'},
      -> s.first(s.Stream:: function(r) { }));
  })

  test('consumes and returns the first element of a nonempty sequence', function() {
    var seq = nonRepeatableSequence(['one','two','three']);
    s.first(seq) .. assert.eq('one');
    s.toArray(seq) .. assert.eq(['two', 'three']);
  })

  test('waits for non-atomic values', function() {
    var seq = s.Stream:: function(r) {
      hold(100);
      r('one');
      
      // first() should not wait for this second value:
      hold(1000 * 10);
      r('two');
    };
    s.first(seq) .. assert.eq('one');
  })
}).timeout(0.5);

test('last', function() {
  nonRepeatableSequence(['one','two','three']) .. s.last .. assert.eq('three');
  ['one','two','three'] .. s.last .. assert.eq('three');
  [] .. s.last('def') .. assert.eq('def');

  assert.raises({
    inherits: s.SequenceExhausted,
    message: 'sequence exhausted'},
    -> s.last(s.Stream:: function(r) { }));
})

context('zip', function() {
  test('zip on same-sized arrays', function() {
    s.zip([1,2,3], ['one','two','three']) .. toArray .. assert.eq([
      [1, 'one'],
      [2, 'two'],
      [3, 'three'],
    ]);
  })

  test('zip on uneven arrays', function() {
    s.zip([1,2,3], ['one']) .. toArray .. assert.eq([[1, 'one']]);
  })

  test('zip on empty arrays', function() {
    s.zip([], []) .. toArray .. assert.eq([]);
  })

  test('zipLongest on uneven arrays', function() {
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
  })
})

test('product', function() {
  s.product([1,2], [3,4,5], [6,7]) .. s.toArray .. assert.eq([
    [1,3,6], [1,3,7], [1,4,6], [1,4,7], [1,5,6], [1,5,7],
    [2,3,6], [2,3,7], [2,4,6], [2,4,7], [2,5,6], [2,5,7]
  ]);

  s.product([1]) .. s.toArray .. assert.eq([[1]]);

  s.product([1,2], [3], [4]) .. s.toArray .. assert.eq([
    [1,3,4], [2,3,4]
  ]);

})

test('groupBy', function() {
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
})

context('sortBy', function() {
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
})

context('unique', function() {
  test('unique', -> [1,3,1,2,4] .. nonRepeatableSequence .. s.unique() .. assert.eq([1,3,2,4]));
  test('unique with custom `eq`', -> [{}, {}, {a:1}, {a:1}] .. s.unique(eq) .. assert.eq([{}, {a:1}]));
  test('uniqueBy property name', -> ['333', '22', 'xxx'] .. s.uniqueBy('length') .. assert.eq(['333','22']));
  test('uniqueBy function', -> ['333', '22', 'xxx'] .. s.uniqueBy(x -> x.length) .. assert.eq(['333','22']));
})

context('slice', function() {
  var seq = ['0','1','2','3','4','5'];

  test('parity with array.slice()', function() {
    // just brute force all interesting indexes for our input
    var indexes = [undefined, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7];


    var flattenToString = arr -> arr .. s.map(String) .. s.join;
    var conversions = [
      ['toArray', s.toArray],
      ['toStream', s.toStream],
      ['flattenToString', flattenToString],
      ['flattenToTypedArray',
        arr -> new Uint8Array(arr .. @concat .. @map(ch -> ch.charCodeAt(0))),
        String.fromCharCode
      ],
    ];

    if(@isServer) {
      conversions.push(['flattenToBuffer', arr -> Buffer.from(arr .. flattenToString), String.fromCharCode]);
    } else {
      conversions.push(['toNodeList', function(arr) {
        var parent = document.createElement('div');
        arr .. s.each {|text|
          var node = document.createElement('span');
          node.appendChild(document.createTextNode(text));
          parent.appendChild(node);
        }
        return parent.childNodes;
      }, (node) -> node.textContent]);
    }

    indexes .. s.each {|start|
      indexes .. s.each {|end|
        var args = [start];
        if (end !== undefined) args.push(end);
        var expected = seq.slice.apply(seq, args);

        conversions .. s.each {|[method, convert, convertBack]|
          var desc = "seq .. #{method} .. slice(#{args.join(",")})";
          var input = seq .. convert();
          var result = input .. s.slice(start, end);
          if(convertBack) result = result .. s.map(convertBack);
          result .. toArray .. assert.eq(expected, desc);
          result .. toArray .. assert.eq(expected, "(re-enumerate) #{desc}");

          // we may gain concreteness in some code paths, but we should never lose it:
          if(input .. s.isConcreteSequence) {
            s.isConcreteSequence(result) .. assert.ok("result lost concreteness in #{desc}");
          }
        }
      }
    }
  })

  test('infinite emitter', function() {
    s.integers() .. s.slice(1, 5) .. toArray .. assert.eq([1,2,3,4]);
    s.integers() .. s.slice(1, -5) .. s.take(4) .. toArray .. assert.eq([1,2,3,4]);
  })

  test('integers with skip', function() {
    s.integers(0, 10, 2) .. toArray .. assert.eq([0,2,4,6,8,10]);
  })

  test('slow emitter', function() {
    var emitted = [];
    var receivedNeg = [];
    var receivedPos = [];
    var interval = 400;

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
  })
})

context('intersperse', function() {
  testEq('[1, 2, 3] .. intersperse(4)', [1,4,2,4,3], function() {
    return [1, 2, 3] .. s.intersperse(4) .. s.toArray;
  });

  testEq('[1] .. intersperse(4)', [1], function() {
    return [1] .. s.intersperse(4) .. s.toArray;
  });

  testEq('[] .. intersperse(4)', [], function() {
    return [] .. s.intersperse(4) .. s.toArray;
  });

})

context('intersperse_n_1', function() {
  testEq('[1, 2, 3, 4, 5] .. intersperse_n_1(6, 7)', [1,6,2,6,3,6,4,7,5], function() {
    return [1, 2, 3, 4, 5] .. s.intersperse_n_1(6, 7) .. s.toArray;
  });

  testEq('[1] .. intersperse_n_1(2, 3)', [1], function() {
    return [1] .. s.intersperse_n_1(2, 3) .. s.toArray;
  });

  testEq('[] .. intersperse_n_1(1,2)', [], function() {
    return [] .. s.intersperse_n_1(1,2) .. s.toArray;
  });

  testEq('[1,2] .. intersperse_n_1(3, 4)', [1,4,2], function() {
    return [1,2] .. s.intersperse_n_1(3, 4) .. s.toArray;
  });

})


context("iterable nodejs datatypes", function() {
  var stream = require('sjs:nodejs/stream');
  test("Buffer", function() {
    Buffer.from("12345") .. s.isSequence() .. assert.eq(true);
    Buffer.from("12345") .. s.take(3) .. s.toArray .. assert.eq([49, 50, 51]);
  })
}).serverOnly();

context("node lists", function() {
  test.beforeEach:: function(s) {
    s.added = [];
    s.cls = 'nodelist-iter-test';
    s.div = function(content) {
      var child = document.createElement("div");
      child.appendChild(document.createTextNode(content));
      return child;
    };
    var add = function(content) {
      var child = s.div(content);
      child.setAttribute('class',s.cls);
      document.body.appendChild(child);
      s.added.push(child);
    };
    add('one');
    add('two');
    add('three');
  }

  test.afterEach:: function(s) {
    s.added .. seq.each {|elem|
      document.body.removeChild(elem);
    }
  }

  test("querySelectorAll result is iterable", function(s) {
    document.body.querySelectorAll("div.#{s.cls}") .. seq.map(el -> el.textContent) .. assert.eq([
      'one', 'two', 'three',
    ]);
  })

  test("element.children is iterable", function(s) {
    var elem = document.body.querySelector("div.#{s.cls}");
    elem.appendChild(s.div("child1"));
    elem.appendChild(s.div("child2"));
    elem.appendChild(s.div("child3"));
    elem.children .. seq.map(el -> el.textContent) .. assert.eq([
      'child1', 'child2', 'child3',
    ]);
  })

  test("getElementsByTagName result is iterable", function(s) {
    document.body.getElementsByTagName("div")
      .. seq.filter(el -> el.getAttribute('class') === s.cls)
      .. seq.map(el -> el.textContent)
      .. assert.eq([
      'one', 'two', 'three',
    ]);
  })

  test("select.options is iterable", function(s) {
    var elem = document.body.querySelector("div.#{s.cls}");
    elem.innerHTML = '
      <select>
        <option name="keyOne">one</option>
        <option name="keyTwo">two</option>
        <option name="keyThree">three</option>
      </select>
    ';
    var select = elem.querySelector('select');
    select.options .. seq.map(el -> el.textContent) .. assert.eq([
      'one', 'two', 'three',
    ]);
  })
}).browserOnly();

context('buffer', function() {
  testEq('integers .. hold .. buffer(5) .. each { hold }', 
         'S0R0S1S2S3S4S5R1S6R2S7R3S8R4S9R5R6R7R8R9', 
         function() {
           var rv = '';
           s.integers() .. 
             s.take(10) .. 
             s.transform(x->(hold(0),rv+="S#{x}",x)) ..
             s.buffer(5) ..
             s.each { 
               |x|
               rv+="R#{x}";
               hold(100);
             }
           return rv;
         });

  testEq('integers .. buffer(5) .. each { hold }', 
         'S0R0S1S2S3S4S5S6R1S7R2S8R3S9R4R5R6R7R8R9', 
         function() {
           var rv = '';
           s.integers() .. 
             s.take(10) .. 
             s.transform(x->(rv+="S#{x}",x)) ..
             s.buffer(5) ..
             s.each { 
               |x|
               rv+="R#{x}";
               hold(100);
             }
           return rv;
         });
})

context("tailbuffer", function() {
  testEq('integers .. hold .. tailbuffer(5) .. each { hold }',
         'S0R0S1S2S3S4S5S6S7S8S9R5R6R7R8R9',
         function() {
           var rv = '';
           s.integers() ..
             s.take(10) .. 
             s.transform(x->(hold(0),rv+="S#{x}", x)) ..
             s.tailbuffer(5) ..
             s.each { 
               |x|
               rv+="R#{x}";
               hold(100);
             }
           return rv;
         });

  testEq('integers .. tailbuffer() .. each { }',
         'S0R0S1R1S2R2S3R3S4R4',
         function() {
           var rv = '';
           s.integers() ..
             s.take(5) .. 
             s.transform(x->(rv+="S#{x}", x)) ..
             s.tailbuffer() ..
             s.each { 
               |x|
               rv+="R#{x}";
             }
           return rv;
         });

  testEq('integers .. tailbuffer() .. each { hold }',
         'S0R0S1S2S3S4R4',
         function() {
           var rv = '';
           s.integers() ..
             s.take(5) .. 
             s.transform(x->(rv+="S#{x}", x)) ..
             s.tailbuffer() ..
             s.each { 
               |x|
               rv+="R#{x}";
               hold(100);
             }
           return rv;
         });
})

context("join", function() {
  test("with string separator", function() {
    nonRepeatableSequence([1,2,3]) .. s.join(" ") .. assert.eq("1 2 3");
  })

  test("with quasi separator", function() {
    nonRepeatableSequence([1,2,3]) .. s.join(`|`) .. assert.eq(Quasi(['', 1, '|', 2, '|', 3]));
  })

  context("on buffers", function() {
    test("with no separator", function() {
      nonRepeatableSequence([
        Buffer.from('abc', 'ascii'),
        Buffer.from('def', 'ascii'),
      ]) .. s.join() .. assert.eq(Buffer.from('abcdef', 'ascii'));
    })

    test("with a buffer separator", function() {
      nonRepeatableSequence([
        Buffer.from('abc', 'ascii'),
        Buffer.from('def', 'ascii'),
      ]) .. s.join(Buffer.from('||')) .. assert.eq(Buffer.from('abc||def', 'ascii'));
    })
  }).skipIf(@isBrowser || process.versions.node.split('.') .. @map(i -> parseInt(i, 10)) .. @cmp([0, 8]) < 0, "nodejs 0.6 lacks Buffer.concat")

  context("on TypedArrays", function() {
    test("with no separator", function() {
      nonRepeatableSequence([
        new Uint8Array([1, 2, 3]),
        new Uint8Array([4, 5, 6]),
      ]) .. s.join() .. assert.eq(new Uint8Array([1,2,3,4,5,6]));
    })

    test("with a TypedArray separator", function() {
      nonRepeatableSequence([
        new Uint8Array([1, 2, 3]),
        new Uint8Array([4, 5, 6]),
      ]) .. s.join(new Uint8Array([100,100])) .. assert.eq(new Uint8Array([1,2,3,100,100,4,5,6]));

      nonRepeatableSequence([
        new Uint8Array([1, 2, 3]),
        new Uint8Array([4, 5, 6]),
      ]) .. s.join([100,100]) .. assert.eq(new Uint8Array([1,2,3,100,100,4,5,6]));
    })
  })

  context("on Arrays", function() {
    test("with no separator", function() {
      nonRepeatableSequence([
        [1, 2, 3],
        [4, 5, 6],
      ]) .. s.join() .. assert.eq([1,2,3,4,5,6]);
    })

    test("with an Array separator", function() {
      nonRepeatableSequence([
        [1, 2, 3],
        [4, 5, 6],
      ]) .. s.join([100,100]) .. assert.eq([1,2,3,100,100,4,5,6]);
    })
  })
})

test("hasElem", function() {
  assert.ok(nonRepeatableSequence([1,2,3]) .. s.hasElem(2));
  assert.notOk(nonRepeatableSequence([1,2,3]) .. s.hasElem(5));
})

testEq("transform.par.unordered doesn't call downstream reentrantly", 1, function() {
  var reentrancy = 0, max_reentrancy = 0;
  [1,2,3,4,5,6,7,8,9,10] .. s.transform.par.unordered(3, x->x) .. s.each {
    |x|
    ++reentrancy;
    max_reentrancy = Math.max(max_reentrancy, reentrancy);
    hold(0);
    --reentrancy;
  }
  return max_reentrancy;
});

testEq("filter.par doesn't call downstream reentrantly", 1, function() {
  var reentrancy = 0, max_reentrancy = 0;
  [1,2,3,4,5,6,7,8,9,10] .. s.filter.par(3, x->x) .. s.each {
    |x|
    ++reentrancy;
    max_reentrancy = Math.max(max_reentrancy, reentrancy);
    hold(0);
    --reentrancy;
  }
  return max_reentrancy;
});

testEq("reentrant cancellation propagation edgecase", true, function() {
  // this used to cause a hang because reentrant cancellations weren't propagated across FCalls 
  try {
    [1] .. s.transform.par(x -> (hold(100),x)) .. 
      s.each.par { |x| throw 'foo' }
  }
  catch (e) {
    if (e === 'foo') return true;
  }
  return false;
}); 

testEq('monitor', ['a1',1,'a2',2,'a3',3], function() {
  var rv = [];
  [1, 2, 3] .. s.monitor(x->rv.push('a'+x)) .. s.each { |x| rv.push(x) };
  return rv;
});

testEq('monitor async', ['a1',1,'a2',2,'a3',3], function() {
  var rv = [];
  [1, 2, 3] .. s.monitor(x->(rv.push('a'+x),hold(10))) .. s.each { |x| rv.push(x) };
  return rv;
});

testEq('each.track', "5", function() {
  var rv = "";
  [1,2,3,4,5] .. s.transform(x->(hold(10),x)) .. s.each.track {
    |x|
    hold(100);
    rv += x;
  }
  return rv;
});

testEq('each.track break', '12b', function() {
  var rv = "";
  [1,2,3,4] .. s.each.track {
    |x|
    if (x === 3) break;
    rv += x;
  }
  rv += 'b';
  return rv;
});

testEq('each.track break 2', '12b', function() {
  var rv = "";
  [1,2,3,4] .. s.each.track {
    |x|
    if (x === 3) {
      try {
        break;
      }
      finally {
        hold(10);
      }
    }
    rv += x;
  }
  rv += 'b';
  return rv;
});

testEq('each.track break 3', '12b', function() {
  var rv = "";
  [1,2,3,4] .. s.monitor(-> hold(1)) .. s.each.track {
    |x|
    if (x === 3) {
      try {
        break;
      }
      finally {
        hold(10);
      }
    }
    rv += x;
  }
  rv += 'b';
  return rv;
});

testEq('each.track break 4', '4b', function() {
  var rv = "";
  [1,2,3,4] .. s.monitor(-> hold(1)) .. s.each.track {
    |x|
    hold(10);
    rv += x;
    try {
      break;
    }
    finally {
      hold(10);
    }
  }
  rv += 'b';
  return rv;
});

testEq('each.track return', '12', function() {
  var rv = "";
  function foo() {
    [1,2,3,4] .. s.each.track {
      |x|
      if (x === 3) return;
      rv += x;
    }
    rv += 'b';
  }
  foo();
  return rv;
});

testEq('each.track return 2', '12', function() {
  var rv = "";
  function foo() {
    [1,2,3,4] .. s.each.track {
      |x|
      if (x === 3) {
        try {
          return;
        }
        finally {
          hold(10);
        }
      }
      rv += x;
    }
    rv += 'b';
  }
  foo();
  return rv;
});

testEq('each.track return 3', '12', function() {
  var rv = "";
  function foo() {
    [1,2,3,4] .. s.monitor(-> hold(1)) .. s.each.track {
      |x|
      if (x === 3) {
        try {
          return;
        }
        finally {
          hold(10);
        }
      }
      rv += x;
    }
    rv += 'b';
  }
  foo();
  return rv;
});

testEq('each.track return 4', '4', function() {
  var rv = "";
  function foo() {
    [1,2,3,4] .. s.monitor(-> hold(1)) .. s.each.track {
      |x|
      hold(10);
      rv += x;
      try {
        return;
      }
      finally {
        hold(10);
      }
    }
    rv += 'b';
  }
  foo();
  return rv;
});


testEq('each.track exception 1', '1e', function() {
  var rv = '';
  function f() { 
    [1,2,3] .. s.each.track {
      |x|
      rv += x;
      throw new Error('foo');
    }
  }
  try {
    f();
  }
  catch(e) {
    rv += 'e';
  }
  return rv;
});

testEq('each.track exception 2', '1e', function() {
  var rv = '';
  function f() { 
    [1,2,3] .. s.monitor(-> hold(1)) .. s.each.track {
      |x|
      rv += x;
      throw new Error('foo');
    }
  }
  try {
    f();
  }
  catch(e) {
    rv += 'e';
  }
  return rv;
});

testEq('each.track exception 3', '1e', function() {
  var rv = '';
  function f() { 
    [1,2,3] .. s.each.track {
      |x|
      rv += x;
      try {
        throw new Error('foo');
      }
      finally {
        hold(10);
      }
    }
  }
  try {
    f();
  }
  catch(e) {
    rv += 'e';
  }
  return rv;
});

testEq('each.track exception 4', '1e', function() {
  var rv = '';
  function f() { 
    [1,2,3] .. s.monitor(-> hold(1)) .. s.each.track {
      |x|
      rv += x;
      try {
        throw new Error('foo');
      }
      finally {
        hold(10);
      }
    }
  }
  try {
    f();
  }
  catch(e) {
    rv += 'e';
  }
  return rv;
});

testEq('each.track exception 5', '3e', function() {
  var rv = '';
  function f() { 
    [1,2,3] .. s.monitor(-> hold(1)) .. s.each.track {
      |x|
      hold(50);
      rv += x;
      try {
        throw new Error('foo');
      }
      finally {
        hold(10);
      }
    }
  }
  try {
    f();
  }
  catch(e) {
    rv += 'e';
  }
  return rv;
});


context("pack", function() {
  test("with count", function() {
    [1,2,3,4,5] .. s.pack({count:2}) .. s.toArray .. assert.eq([[1,2],[3,4],[5]]);
  })

  test("with count, shorthand", function() {
    [1,2,3,4,5] .. s.pack(2) .. s.toArray .. assert.eq([[1,2],[3,4],[5]]);
  })

  test("with packing function", function() {
    [1,2,3,4,5] .. s.pack({packing_func:next -> [next(),next()], pad:'pad'}) .. s.toArray .. assert.eq([[1,2],[3,4],[5,'pad']]);
  })

  test("with packing function, shorthand", function() {
    [1,2,3,4,5] .. s.pack(next -> [next(),next()], 'pad') .. s.toArray .. assert.eq([[1,2],[3,4],[5,'pad']]);
  })

  test("with packing function, pad default", function() {
    [1,2,3,4,5] .. s.pack({packing_func:next -> [next(),next()]}) .. s.toArray .. assert.eq([[1,2],[3,4],[5, undefined]]);
  })

  test("with packing function, pad default, shorthand", function() {
    [1,2,3,4,5] .. s.pack(next -> [next(),next()]) .. s.toArray .. assert.eq([[1,2],[3,4],[5, undefined]]);
  })


  test("settings precedence 1", function() {
    // packing_func overrides count & interval:
    [1,2,3,4,5] .. s.pack({count: 3, interval: 200, packing_func:next -> [next(),next()], pad:'pad'}) .. s.toArray .. assert.eq([[1,2],[3,4],[5,'pad']]);
  })

  test("settings precedence 2", function() {
    // count overrides interval:
    [1,2,3,4,5] .. s.pack({count: 2, interval: 200}) .. s.toArray .. assert.eq([[1,2],[3,4],[5]]);
  })

  test("with interval", function() {
    [1,2,3,4,5] .. s.pack({interval: 100}) .. s.toArray .. assert.eq([[1,2,3,4,5]]);
  })

  test("with interval 2", function() {
    var source = s.Stream(function(r) { 
      r(1);
      hold(20);
      r(2);
      hold(20);
      r(3);
      hold(80);
      r(4);
      hold(20);
      r(5);
    });
    source .. s.pack({interval:80}) .. s.toArray .. assert.eq([[1,2,3],[4,5]]);
  })

})

context("mirror", function() {
  context(function() {
    test.beforeEach:: function(s) {
      s.log = [];
      var upstream = @integers(1) .. @transform(function(i) {
        hold(10);
        s.log.push(i);
        return i;
      });
      s.mirror = upstream .. @mirror();
    }

    test("single consumer", function(s) {
      s.mirror .. @each {|i|
        if (i === 3) break;
      }
      hold(50);
      s.log .. @assert.eq([1,2,3]);
    })

    test("multiple consumers", function(s) {
      waitfor {
        var seena = [];
        s.mirror .. @each {|i|
          //console.log("A: seen " + i);
          seena.push(i);
          if (i === 3) {
            //console.log("BREAK a");
            break;
          }
        }
      } and {
        var seenb = [];
        s.mirror .. @each {|i|
          //console.log("B: seen " + i);
          seenb.push(i);
          if (i === 6) {
            //console.log("BREAK b");
            break;
          }
        }
      }
      hold(50);
      seena .. @assert.eq([1,2,3]);
      seenb .. @assert.eq([1,2,3,4,5,6]);
      s.log .. @assert.eq([1,2,3,4,5,6]);
    })

    test("non-overlapping consumers cause restart", function(s) {
      var seena = [];
      var seenb = [];

      s.mirror .. @each {|i|
        seena.push(i);
        if (i === 2) break;
      }
      hold(0);
      s.mirror .. @each {|i|
        seenb.push(i);
        if (i === 4) break;
      }
      hold(50);
      s.log .. @assert.eq([1,2,1,2,3,4]);
      seena .. @assert.eq([1,2]);
      seenb .. @assert.eq([1,2,3,4]);
    })

    test("non-overlapping (but contiguous) consumers cause restart", function(s) {
      var seena = [];
      var seenb = [];

      s.mirror .. @each {|i|
        seena.push(i);
        if (i === 2) break;
      }
      s.mirror .. @each {|i|
        seenb.push(i);
        if (i === 4) break;
      }
      s.log .. @assert.eq([1,2,1,2,3,4]);
      seena .. @assert.eq([1,2]);
      seenb .. @assert.eq([1,2,3,4]);
    })

    test("beginning iteration as previous iteration is aborting", function(s) {
      var stream = @Stream(function(emit) {
        s.log.push("start");
        try {
          emit(1);
          hold(100);
          emit(2);
        } retract {
          s.log.push("retract");
          hold(10);
          s.log.push("retracted");
        }
      });

      s.mirror = stream .. @mirror;
      s.mirror .. @each {|i|
        s.log.push(i);
        break;
      }
      // this iteration should wait for the previous iteration to be cleaned up before iterating
      s.mirror .. @each {|i|
        s.log.push(i);
        break;
      }
      s.log .. @assert.eq([
        'start', 1, 'retract', 'retracted',
        'start', 1, 'retract', 'retracted'
      ]);
    })
  })

  context("on slow emitter", function(s) {
    test.beforeEach:: function(s) {
      s.log = [];
      s.upstream = @Stream(function(e) {
        hold(100);
        s.log.push(1);
        e(1);
        hold(100);
        s.log.push(2)
        e(2);
      });
    }

    test("subsequent consumers are given the most recent value if latest=true", function(s) {
      var ready = @Condition();
      var mirror = s.upstream .. @mirror;
      waitfor {
        mirror .. @each {|item|
          ready.set();
        }
      } and {
        ready.wait();
        @assert.atomic {||
          mirror .. @first .. @assert.eq(1);
        }
      }
    })

    test("slow consumers are given the most recent value if latest=true", function(s) {
      var log = [];
      var mirror = s.upstream .. @mirror;
      mirror .. @each {|item|
        log.push(item);
        hold(300);
      }
      log .. @assert.eq([1,2]);
      s.log .. @assert.eq([1,2]);
    })

    test("subsequent consumers dont get the latest value if latest=false", function(s) {
      var ready = @Condition();
      var mirror = s.upstream .. @mirror(false);
      waitfor {
        mirror .. @each {|item|
          ready.set();
        }
      } and {
        ready.wait();
        @assert.suspends {||
          mirror .. @first .. @assert.eq(2);
        }
      }
    })

    test("slow consumers are not given the most recent value if latest=false", function(s) {
      var log = [];
      var mirror = s.upstream .. @mirror(false);
      mirror .. @each {|item|
        log.push(item);
        hold(300);
      }
      log .. @assert.eq([1]);
      s.log .. @assert.eq([1,2]);
    })

  })

  test("retraction is honoured", function(s) {
    var log = [];
    var stream = @Stream(function(emit) {
      try {
        hold(100);
        log.push(1);
        emit(1);
        hold();
      } retract {
        hold(10);
        log.push('retract');
      }
    });
    stream .. @mirror() .. @first .. @assert.eq(1);
    hold(50);
    log .. @assert.eq([1,'retract']);
  })

  test("exceptions are propagated", function(s) {
    var log = [];
    var stream = @Stream(function(emit) {
      emit(1);
      hold(100);
      throw new Error("stream failed");
    });

    var s = stream .. @mirror();
    try {
      s .. @each {|item|
        log.push(item);
      }
    } catch(e) {
      log.push("ERROR: " + e.message);
    }

    log .. @assert.eq([1, 'ERROR: stream failed']);
  })

  test("immediate exceptions are propagated", function(s) {
    var log = [];
    var stream = @Stream(function(emit) {
      throw new Error("stream failed");
    });

    var s = stream .. @mirror();
    try {
      s .. @each {|item|
        log.push(item);
      }
    } catch(e) {
      log.push("ERROR: " + e.message);
    }

    log .. @assert.eq(['ERROR: stream failed']);
  })


  test("NaN edge case", function(s) {
    var stream = @Stream(function(emit) {
      emit(NaN);
      hold();
    });
    var s = stream .. @mirror();
    var count = 0;
    waitfor {
      s .. @each { |x|
        ++count;
        hold(0);
      }
    }
    or {
      hold(100);
    }
    
    count .. @assert.eq(1);
  })
  
})

context("batchN", function() {
  test("exact batching", function() {
    s.integers(1,100) .. s.batchN(10) .. s.count() .. assert.eq(100);
  })

  test("batching with remainder", function() {
    s.integers(1,102) .. s.batchN(10) .. s.count() .. assert.eq(102);
  })

  test("batching larger than sequence", function() {
    s.integers(1,102) .. s.batchN(1000) .. s.count() .. assert.eq(102);
  })

  test("double batching", function() {
    s.integers(1,102) .. s.batchN(10) .. s.batchN(10) .. s.count() .. assert.eq(102);
  })
})

context("batch", function() {
  test("exact batching", function() {
    s.integers(1,100) .. s.batch(10) .. s.count() .. assert.eq(100);
  })

  test("batching with remainder", function() {
    s.integers(1,102) .. s.batch(10) .. s.count() .. assert.eq(102);
  })

  test("batching larger than sequence", function() {
    s.integers(1,102) .. s.batch(1000) .. s.count() .. assert.eq(102);
  })

  test("double batching", function() {
    s.integers(1,102) .. s.batch(10) .. s.batch(10) .. s.isStructuredStream('batched') .. assert.ok();
    (s.integers(1,102) .. s.batch(10) .. s.batch(10)).base .. s.isStructuredStream() .. assert.notOk();
    s.integers(1,102) .. s.batch(10) .. s.batch(10) .. s.count() .. assert.eq(102);
  })

  test("batching structured streams", function() {
    // it doesn't really make sense to have a rolling stream wrapped by a batch stream, but this is
    // just a synthetic example to test that, when applying `batch` to this stream, it will be 
    // applied as innermost structured stream:

    var S = s.StructuredStream('batched') :: s.StructuredStream('rolling') :: 
      [ [0, [ [1],[1,2] ] ],
        [2, [ [1,2,3], [2,3] ] ],
        [2, [ [2,3,4] ] ]
      ];
    assert.truthy(S .. s.isStructuredStream('batched'));
    assert.truthy(S.base .. s.isStructuredStream('rolling'));
    assert.falsy(S.base.base .. s.isStructuredStream());
    assert.eq(S.base .. @toArray,
              [ [ [1], [1,2] ],
                [ [1,2,3], [2,3] ],
                [ [2,3,4] ]
              ]);
    assert.eq(S .. @toArray,
              [ [1], [1,2], [1,2,3], [2,3], [2,3,4] ]);

    // apply `batch`:
    var T = S .. s.batch(2);
    assert.truthy(T .. s.isStructuredStream('batched'));
    assert.truthy(T.base .. s.isStructuredStream('rolling'));
    assert.truthy(T.base.base .. s.isStructuredStream('batched'));
    assert.falsy(T.base.base.base .. s.isStructuredStream());

    assert.eq(T.base.base.base .. @toArray,
              [ [ [0, [ [1],[1,2] ] ],
                  [2, [ [1,2,3], [2,3] ] ] ],
                [ [2, [ [2,3,4] ] ] ]
              ]);
    assert.eq(T.base.base .. @toArray, S.base.base);
    assert.eq(T .. @toArray,
              [ [1], [1,2], [1,2,3], [2,3], [2,3,4] ]);

    // finally check that another `batch` application gets consolidated with the innermost `batched` 
    // stream:
    var U = T .. s.batch(2);
    assert.truthy(U .. s.isStructuredStream('batched'));
    assert.truthy(U.base .. s.isStructuredStream('rolling'));
    assert.truthy(U.base.base .. s.isStructuredStream('batched'));
    assert.falsy(U.base.base.base .. s.isStructuredStream());
    assert.eq(U.base.base.base .. @toArray,
              [ [ [0, [ [1],[1,2] ] ],
                  [2, [ [1,2,3], [2,3] ] ],
                  [2, [ [2,3,4] ] ] ]
              ]);
    assert.eq(U.base.base .. @toArray, S.base.base);
    assert.eq(U .. @toArray,
              [ [1], [1,2], [1,2,3], [2,3], [2,3,4] ]);


  });
})


test("consume/retract edge case", function() {
  var producer = s.Stream(function(r) {
    r('a');
    hold(50);
    r('b');
  });

  producer .. s.consume {
    |next|
    assert.eq(next(), 'a');
    waitfor { next() } or { hold(0); } // retracted next()
    hold(100); // give producer a chance to emit next item
    assert.eq(next(), 'b');
  }
})

test("consume exception propagation", function() {
  var producer = s.Stream(function(r) {
    r('a');
    hold(50);
    throw 'b';
  });

  producer .. s.consume {
    |next|
    assert.eq(next(), 'a');
    try {
      next();
      assert.fail('should not be reached')
    }
    catch(e) {
      assert.eq(e, 'b');
    }
    // exception should repeat:
    try {
      next();
      assert.fail('should not be reached')
    }
    catch(e) {
      assert.eq(e, 'b');
    }
  }
})

test("consume exception propagation / retract edge case", function() {
  var producer = s.Stream(function(r) {
    r('a');
    hold(50);
    throw 'b';
  });

  producer .. s.consume {
    |next|
    assert.eq(next(), 'a');
    waitfor { next(); } or { hold(0); }
    hold(100); // give producer a chance to emit next item
    try {
      next();
      assert.fail('should not be reached')
    }
    catch(e) {
      assert.eq(e, 'b');
    }
    // exception should repeat:
    try {
      next();
      assert.fail('should not be reached')
    }
    catch(e) {
      assert.eq(e, 'b');
    }
  }
})

test("consume eos / retract edge case", function() {
  var producer = s.Stream(function(r) {
    r('a');
    hold(50);
  });

  var eos = {};

  producer .. s.consume(eos) {
    |next|
    assert.eq(next(), 'a');
    waitfor { next() } or { hold(0); } // retracted next()
    hold(100); // give producer a chance to get to eos
    assert.eq(next(), eos);

    // should be repeatable:
    assert.eq(next(), eos);
  }
});

test("async exception during each.track abortion", function() {
  function t() {
    waitfor {
      [1] .. @each.track {
        |x|
        try { 
          hold();
        }
        finally {
          hold(0);
          throw new Error("should not be swallowed");
        }
      }
    }
    or {
      // retract the first branch
    }
  }
  
  assert.raises({message:'should not be swallowed'}, t);

});

test('each.track blocking behavior', function() {
  var rv = '';

  var src = @Stream :: function(r) {
    for (var x = 0; x<=10; ++x) {
      try {
        r(x);
        if (x === 5) hold(100);
      }
      finally {
        rv += '('+x+')';
      }
    }
  };

  src .. @each.track { |x|
    rv += x;
    if (x === 9) break;
    try { hold(); } finally { if (x<5) hold(0); }
  }
  assert.eq(rv, '0(0)(1)(2)(3)(4)5(5)6(6)7(7)8(8)9(9)');
});

context("withOpenStream", function() {
  test("sequence sync", function() {
    [1,2,3,4] .. s.withOpenStream {
      |S|
      S .. s.first .. assert.eq(1);
      S .. s.take(10) .. s.toArray .. assert.eq([2,3,4]);
      S .. s.take(10) .. s.toArray .. assert.eq([]);
    }
  })
  test("sequence async", function() {
    [1,2,3,4] .. s.withOpenStream {
      |S|
      S .. s.monitor(->hold(0)) .. s.first .. assert.eq(1);
      S .. s.monitor(->hold(0)) .. s.take(10) .. s.toArray .. assert.eq([2,3,4]);
      S .. s.monitor(->hold(0)) .. s.take(10) .. s.toArray .. assert.eq([]);
    }
  })
  test("stream sync", function() {
    s.integers(1) .. s.withOpenStream {
      |S|
      S .. s.first .. assert.eq(1);
      S .. s.take(3) .. s.toArray .. assert.eq([2,3,4]);
      S .. s.take(5) .. s.toArray .. assert.eq([5,6,7,8,9]);
    }
  })
  test("stream async", function() {
    s.integers(1) .. s.withOpenStream {
      |S|
      S .. s.monitor(->hold(0)) .. s.first .. assert.eq(1);
      S .. s.monitor(->hold(0)) .. s.take(3) .. s.toArray .. assert.eq([2,3,4]);
      S .. s.monitor(->hold(0)) .. s.take(5) .. s.toArray .. assert.eq([5,6,7,8,9]);
    }
  })
  test("async stream sync", function() {
    s.integers(1) .. s.monitor(->hold(0)) .. s.withOpenStream {
      |S|
      S .. s.first .. assert.eq(1);
      S .. s.take(3) .. s.toArray .. assert.eq([2,3,4]);
      S .. s.take(5) .. s.toArray .. assert.eq([5,6,7,8,9]);
    }
  })
  test("async stream async", function() {
    s.integers(1) .. s.monitor(->hold(0)) .. s.withOpenStream {
      |S|
      S .. s.monitor(->hold(0)) .. s.first .. assert.eq(1);
      S .. s.monitor(->hold(0)) .. s.take(3) .. s.toArray .. assert.eq([2,3,4]);
      S .. s.monitor(->hold(0)) .. s.take(5) .. s.toArray .. assert.eq([5,6,7,8,9]);
    }
  })
  test("exhausted", function() {
    [1] .. s.withOpenStream {
      |S|
      S .. s.first .. assert.eq(1);
      assert.raises({ inherits: s.SequenceExhausted },
                    -> S .. @first());
    };
    [] .. s.withOpenStream {
      |S|
      assert.raises({ inherits: s.SequenceExhausted },
                    -> S .. @first());
      assert.raises({ inherits: s.SequenceExhausted },
                    -> S .. @first());
    }
  })
  test("takeWhile", function() {
    [0,2,4,5,6,7,8] .. s.withOpenStream {
      |S|
      S .. s.takeWhile(x->x%2==0) .. s.toArray .. assert.eq([0,2,4]);
      // 5 is swallowed by takeWhile
      S .. s.toArray .. assert.eq([6,7,8]);
    }
  })
})

context("rollingWindow", function() {
  test("typing", function() {
    [1,2,3,4] .. s.rollingWindow(3) .. s.isStructuredStream('rolling') .. assert.ok();
  })
  test("basic", function() {
    [1,2,3,4] .. s.rollingWindow(3) .. s.toArray .. 
      assert.eq([[1,2,3],[2,3,4]]);
  })
  test("no cliff", function() {
    [1,2,3,4] .. s.rollingWindow({window:3,cliff:false}) .. s.toArray .. 
      assert.eq([[1],[1,2],[1,2,3],[2,3,4],[3,4],[4]]);
  })
  test("window size barely reached", function() {
    [1,2,3,4] .. s.rollingWindow(4) .. s.toArray .. assert.eq([[1,2,3,4]]);
  })
  test("window size not reached", function() {
    [1,2,3,4] .. s.rollingWindow(5) .. s.toArray .. assert.eq([]);
  })
  test("window size not reached, cliff=false", function() {
    [1,2,3,4] .. s.rollingWindow({window:5,cliff:false}) .. s.toArray .. 
      assert.eq([ [1],[1,2],[1,2,3],[1,2,3,4], [2,3,4], [3,4], [4] ]);
  })

  test("stream", function() {
    s.integers(1) .. s.rollingWindow(3) .. s.take(5) .. s.toArray ..
      assert.eq([[1,2,3],[2,3,4],[3,4,5],[4,5,6],[5,6,7]]);
  })
  test("stream, no cliff", function() {
    s.integers(1) .. s.rollingWindow({window:3,cliff:false}) .. s.take(5) .. s.toArray ..
      assert.eq([[1],[1,2],[1,2,3],[2,3,4],[3,4,5]]);
  })
  test("async stream", function() {
    s.integers(1) .. s.monitor(->hold(0)) .. s.rollingWindow(3) .. s.take(5) .. s.toArray ..
      assert.eq([[1,2,3],[2,3,4],[3,4,5],[4,5,6],[5,6,7]]);
  })
  test("async stream, no cliff", function() {
    s.integers(1) .. s.monitor(->hold(0)) .. s.rollingWindow({window:3,cliff:false}) .. s.take(5) .. s.toArray ..
      assert.eq([[1],[1,2],[1,2,3],[2,3,4],[3,4,5]]);
  })
  test("stream async", function() {
    s.integers(1) .. s.rollingWindow(3) .. s.monitor(->hold(0)) .. s.take(5) .. s.toArray ..
      assert.eq([[1,2,3],[2,3,4],[3,4,5],[4,5,6],[5,6,7]]);
  })
  test("stream  async, no cliff", function() {
    s.integers(1) .. s.rollingWindow({window:3,cliff:false}) .. s.monitor(->hold(0)) .. s.take(5) .. s.toArray ..
      assert.eq([[1],[1,2],[1,2,3],[2,3,4],[3,4,5]]);
  })
  test("async stream async", function() {
    s.integers(1) .. s.monitor(->hold(0)) .. s.rollingWindow(3) .. s.monitor(->hold(0)) .. s.take(5) .. s.toArray ..
      assert.eq([[1,2,3],[2,3,4],[3,4,5],[4,5,6],[5,6,7]]);
  })
  test("async stream async, no cliff", function() {
    s.integers(1) .. s.monitor(->hold(0)) .. s.rollingWindow({window:3,cliff:false}) .. s.monitor(->hold(0)) .. s.take(5) .. s.toArray ..
      assert.eq([[1],[1,2],[1,2,3],[2,3,4],[3,4,5]]);
  })
  test("window(window)", function() {
    [1,2,3,4] .. s.rollingWindow(3) .. s.rollingWindow(2) .. @toArray ..
      assert.eq([[[1,2,3],[2,3,4]]]);
  })
  test("window no cliff(window)", function() {
    // [[1],[1,2],[1,2,3],[2,3,4],[3,4],[4]]
    [1,2,3,4] .. s.rollingWindow({window:3,cliff:false}) .. s.rollingWindow(2) .. @toArray ..
      assert.eq([ [[1],[1,2]], [[1,2],[1,2,3]], [[1,2,3],[2,3,4]], [[2,3,4],[3,4]], [[3,4],[4]] ]);
  })
  test("batched 1", function() {
    [1,2,3,4,5] .. s.batch(2) .. @rollingWindow({window:3, cliff: false}) .. @toArray ..
      assert.eq([ [1], [1,2], [1,2,3], [2,3,4], [3,4,5], [4,5], [5] ]);
  });
  test("batched 2", function() {
    [1,2,3,4,5] .. s.batch(2) .. @rollingWindow({window:3, cliff: false, batched:true}) .. @toArray ..
      assert.eq([ [1,2], [2,3,4], [3,4,5] ]);
  });
  test("batched 3", function() {
    [1,2,3,4,5] .. s.batch(2) .. @rollingWindow({window:3, batched:true}) .. @toArray ..
      assert.eq([ [2,3,4], [3,4,5] ]);
  });

})

context("chunk.json", function() {
  test("typing", function() {
    [1,10,100] .. s.chunk.json(2) .. s.isStructuredStream('chunked.json') .. assert.ok();
  });
  test("basic", function() {
    [1,10,100, 'test', {a:1, b:'foo'}] .. s.chunk.json(2) .. s.toArray .. assert.eq([1,10,100, 'test', {a:1, b:'foo'}]);
  });
  test("base stream structure", function() {
    ([1,10,100] .. s.chunk.json(2)).base .. s.toArray .. assert.eq([[true,'1'],[true,'10'],[false,'10'],[true,'0']]);
  });
});

context("transform typing/batching", function() {
  test("typing", function() {
    var a = [1,2,3,4] .. s.transform(x->x*x);
    assert.ok(a .. s.isStream);
    assert.notOk(a .. s.isStructuredStream);

    var b = [1,2,3,4] .. s.batch(2) .. s.transform(x->x*x);
    assert.ok(b .. s.isStream);
    assert.ok(b .. s.isStructuredStream('batched'));
  })
  test("batching", function() {
    var a = [1,2,3,4,5] .. s.batch(2) .. s.transform(x->x*x);
    assert.eq(a..s.toArray, [1,4,9,16,25]);
    assert.eq(a.base ..  s.toArray, [[1,4],[9,16],[25]]);
  })
  test("async batching", function() {
    var a = [1,2,3,4,5] .. s.monitor(->hold(0)) .. s.batch(2) .. s.transform(x->x*x);
    assert.eq(a..s.toArray, [1,4,9,16,25]);
    assert.eq(a.base ..  s.toArray, [[1,4],[9,16],[25]]);
  })
  test("batching async", function() {
    var a = [1,2,3,4,5] .. s.batch(2) .. s.transform(x->x*x);
    assert.eq(a.. s.monitor(->hold(0)) .. s.toArray, [1,4,9,16,25]);
    assert.eq(a.base ..  s.monitor(->hold(0)) .. s.toArray, [[1,4],[9,16],[25]]);
  })
  test("async batching async", function() {
    var a = [1,2,3,4,5] .. s.monitor(->hold(0)) .. s.batch(2) .. s.transform(x->x*x);
    assert.eq(a.. s.monitor(->hold(0)) .. s.toArray, [1,4,9,16,25]);
    assert.eq(a.base ..  s.monitor(->hold(0)) .. s.toArray, [[1,4],[9,16],[25]]);
  })
})

context("transform$map", function() {
  test("typing", function() {
    var a = [[1,2],[2,3],[3,4]] .. s.transform$map(x->x*x);
    assert.ok(a .. s.isStream);
    assert.notOk(a .. s.isStructuredStream);

    var b = [1,2,3,4] .. s.rollingWindow(2) .. s.transform$map(x->x*x);
    assert.ok(b .. s.isStream);
    assert.ok(b .. s.isStructuredStream('rolling'));
  })
  test("plain", function() {
    var executions = 0;
    [[1,2],[2,3],[3,4]] .. s.transform$map(x->(++executions,x*x)) .. s.toArray ..
      assert.eq([[1,4],[4,9],[9,16]]);
    assert.eq(executions, 6);
  })
  test("rolling", function() {
    var executions = 0;
    [1,2,3,4] .. s.rollingWindow(2) .. s.transform$map(x->(++executions,x*x)) .. s.toArray ..
      assert.eq([[1,4],[4,9],[9,16]]);
    assert.eq(executions, 4);
  })
})

context("monitor.raw", function() {
  test("typing", function() {
    var a = [1,2,3,4] .. s.monitor.raw(x->0);
    assert.notOk(a .. s.isStructuredStream());
    assert.ok(a .. s.isStream());

    var b = [1,2,3,4] .. s.rollingWindow(2) .. s.batch(2) .. s.monitor.raw(x->0);
    assert.ok(b .. s.isStructuredStream('rolling'));
    assert.ok(b.base .. s.isStructuredStream('batched'));
  })
  test("batched", function() {
    var log = [];
    var rv = [1,2,3,4] .. s.batch(2) .. s.monitor.raw(x->log.push(x)) .. s.toArray;
    assert.eq(rv,[1,2,3,4]);
    assert.eq(log,[[1,2],[3,4]]);
  })
  test("rolling", function() {
    var log = [];
    var rv = [1,2,3,4] .. s.rollingWindow(2) .. s.monitor.raw(x->log.push(x)) .. s.toArray;
    assert.eq(rv,[[1,2],[2,3],[3,4]]);
    assert.eq(log,[[0,[1,2]],[1,[3]],[1,[4]]]);
  })
  test("rolling batched", function() {
    var log = [];
    var rv = [1,2,3,4] .. s.rollingWindow(2) .. s.batch(2) .. s.monitor.raw(x->log.push(x)) .. s.toArray;
    assert.eq(rv,[[1,2],[2,3],[3,4]]);
    assert.eq(log,[ [[0,[1,2]],[1,[3]]],[[1,[4]]]]);
  })
  test("async", function() {
    var log = [];
    var rv = [1,2,3,4] .. s.batch(2) .. s.monitor.raw(x->(hold(0),log.push(x))) .. s.toArray;
    assert.eq(rv,[1,2,3,4]);
    assert.eq(log,[[1,2],[3,4]]);
  })
  test("sync break", function() {
    var log = [];
    var run = mf -> [1,2,3,4] .. s.monitor.raw(mf) .. @each {||}
    run {|x| log.push(x); if (x>2) break; }
    assert.eq(log,[1,2,3]);
  });
  test("async break", function() {
    var log = [];
    var run = mf -> [1,2,3,4] .. s.monitor.raw(mf) .. @each {||}
    run {|x| hold(0); log.push(x); if (x>2) break;}
    assert.eq(log,[1,2,3]);
  });
})

context("monitor", function() {
  test("typing", function() {
    var a = [1,2,3,4] .. s.monitor(x->0);
    assert.notOk(a .. s.isStructuredStream());
    assert.ok(a .. s.isStream());

    var b = [1,2,3,4] .. s.batch(2) .. s.monitor(x->0);
    assert.ok(b .. s.isStructuredStream('batched'));
    assert.notOk(b.base .. s.isStructuredStream());
  })
  test("batched", function() {
    var log = [];
    var rv = [1,2,3,4] .. s.batch(2) .. s.monitor(x->log.push(x)) .. s.toArray;
    assert.eq(rv,[1,2,3,4]);
    assert.eq(log,[1,2,3,4]);
  })
  test("async", function() {
    var log = [];
    var rv = [1,2,3,4] .. s.batch(2) .. s.monitor(x->(hold(0),log.push(x))) .. s.toArray;
    assert.eq(rv,[1,2,3,4]);
    assert.eq(log,[1,2,3,4]);
  })    
  test("sync break", function() {
    var log = [];
    var run = mf -> [1,2,3,4] .. s.monitor(mf) .. @each {||}
    run {|x| log.push(x); if (x>2) break;}
    assert.eq(log,[1,2,3]);
  });
  test("async break", function() {
    var log = [];
    var run = mf -> [1,2,3,4] .. s.monitor(mf) .. @each {||}
    run {|x| hold(0); log.push(x); if (x>2) break;}
    assert.eq(log,[1,2,3]);
  });
})

context("monitor.start", function() {
  test("typing", function() {
    var a = [1,2,3,4] .. s.monitor.start(->0);
    assert.notOk(a .. s.isStructuredStream());
    assert.ok(a .. s.isStream());

    var b = [1,2,3,4] .. s.rollingWindow(2) .. s.batch(2) .. s.monitor.start(->0);
    assert.ok(b .. s.isStructuredStream('rolling'));
    assert.ok(b.base .. s.isStructuredStream('batched'));
  })
  test("batched", function() {
    var log = [];
    var rv = [1,2,3,4] .. s.batch(2) .. s.monitor.start(x->log.push('START1')) .. s.monitor.raw(x->log.push(x)) .. s.monitor.start(x->log.push('START2')) .. s.toArray;
    assert.eq(rv,[1,2,3,4]);
    assert.eq(log,['START2', 'START1', [1,2],[3,4]]);
  })

  test("rolling", function() {
    var log = [];
    var rv = [1,2,3,4] .. s.rollingWindow(2) .. s.monitor.start(x->log.push('START1')) .. s.monitor.raw(x->log.push(x)) .. s.monitor.start(x->log.push('START2')) .. s.toArray;
    assert.eq(rv,[[1,2],[2,3],[3,4]]);
    assert.eq(log,['START2', 'START1', [0,[1,2]],[1,[3]],[1,[4]]]);
  })
  test("rolling batched", function() {
    var log = [];
    var rv = [1,2,3,4] .. s.rollingWindow(2) .. s.batch(2).. s.monitor.start(x->log.push('START1')) .. s.monitor.raw(x->log.push(x)) .. s.monitor.start(x->log.push('START2')) .. s.toArray;
    assert.eq(rv,[[1,2],[2,3],[3,4]]);
    assert.eq(log,['START2', 'START1', [[0,[1,2]],[1,[3]]],[[1,[4]]]]);
  })
  test("async 1", function() {
    var log = [];
    var rv = [1,2,3,4] .. s.batch(2) .. s.monitor.start(x->log.push('START1')) .. s.monitor.raw(x->(hold(0),log.push(x))) .. s.monitor.start(x->log.push('START2')) .. s.toArray;
    assert.eq(rv,[1,2,3,4]);
    assert.eq(log,['START2', 'START1', [1,2],[3,4]]);
  })
  test("async 2", function() {
    var log = [];
    var rv = [1,2,3,4] .. s.batch(2) .. s.monitor.start(x->log.push('START1')) .. s.monitor.raw(x->(log.push(x))) .. s.monitor.start(x->(hold(0),log.push('START2'))) .. s.toArray;
    assert.eq(rv,[1,2,3,4]);
    assert.eq(log,['START2', 'START1', [1,2],[3,4]]);
  })
  test("async 3", function() {
    var log = [];
    var rv = [1,2,3,4] .. s.batch(2) .. s.monitor.start(x->(hold(0),log.push('START1'))) .. s.monitor.raw(x->(log.push(x))) .. s.monitor.start(x->(hold(0),log.push('START2'))) .. s.toArray;
    assert.eq(rv,[1,2,3,4]);
    assert.eq(log,['START2', 'START1', [1,2],[3,4]]);
  })
  test("sync break 1", function() {
    var log = [];
    var run = mf -> [1,2,3,4] .. s.monitor.start(mf) .. s.monitor.raw(x->log.push(x)) .. s.monitor.start(x->log.push('START2')) .. @each {||}
    run {|| break}
    assert.eq(log,['START2']);
  });
  test("sync break 2", function() {
    var log = [];
    var run = mf -> [1,2,3,4] .. s.monitor.start(x->log.push('START1')) .. s.monitor.raw(x->log.push(x)) .. s.monitor.start(mf) .. @each {||}
    run {|| break}
    assert.eq(log,[]);
  });
  test("async break 1", function() {
    var log = [];
    var run = mf -> [1,2,3,4] .. s.monitor.start(mf) .. s.monitor.raw(x->log.push(x)) .. s.monitor.start(x->log.push('START2')) .. @each {||}
    run {|| hold(0); break}
    assert.eq(log,['START2']);
  });
  test("async break 2", function() {
    var log = [];
    var run = mf -> [1,2,3,4] .. s.monitor.start(x->log.push('START1')) .. s.monitor.raw(x->log.push(x)) .. s.monitor.start(mf) .. @each {||}
    run {|| hold(0); break}
    assert.eq(log,[]);
  });
})

context('filter', function() {
  test('sync', function() {
    [1,2,3,4] .. s.filter(s->s%2==0) .. s.toArray() .. assert.eq([2,4]);
  })
  test('async', function() {
    [1,2,3,4] .. s.monitor(->hold(0)) .. s.filter(s->s%2==0) .. s.toArray() .. assert.eq([2,4]);
  })
  test('async async', function() {
    [1,2,3,4] .. s.monitor(->hold(0)) .. s.filter(s->(hold(0),s%2==0)) .. s.toArray() .. assert.eq([2,4]);
  })
  test('sync async', function() {
    [1,2,3,4] .. s.filter(s->(hold(0),s%2==0)) .. s.toArray() .. assert.eq([2,4]);
  })
  test("typing", function() {
    var a = [1,2,3,4] .. s.filter(x->x%2==0);
    assert.ok(a .. s.isStream);
    assert.notOk(a .. s.isStructuredStream);

    var b = [1,2,3,4] .. s.batch(2) .. s.filter(x->x%2==0);
    assert.ok(b .. s.isStream);
    assert.ok(b .. s.isStructuredStream('batched'));
  })
  test("batching", function() {
    var a = [1,2,3,4,5,6,7,8,9,9,9,9,9,9,9,9,9,9,9] .. s.batch(4) .. s.filter(x->x%2==0);
    assert.eq(a..s.toArray, [2,4,6,8]);
    assert.eq(a.base .. s.toArray, [[2,4],[6,8]]);
  })
  test("async batching", function() {
    var a = [1,2,3,4,5,6,7,8,9,9,9,9,9,9,9,9,9,9,9] .. s.monitor(->hold(0)) ..s.batch(4) .. s.filter(x->x%2==0);
    assert.eq(a..s.toArray, [2,4,6,8]);
    assert.eq(a.base .. s.toArray, [[2,4],[6,8]]);
  })
})

context('Set', function() {
  test('iterate', function() {
    @Set([1,2,3,4]) .. s.toArray() .. assert.eq([1,2,3,4]);
  });
  test('from stream', function() {
    @Set(s.integers() .. s.take(5)) .. s.toArray .. assert.eq([0,1,2,3,4]);
  });
  test('count', function() {
    @Set(s.integers() .. s.take(5)) .. @count .. assert.eq(5);
  });
});

context('Map', function() {
  var some_obj = {};
  var arr = [[1,'a'],[some_obj,'b'],['x',3],['y','z']];
  test('iterate', function() {
    var some_obj = {};
    var arr = [[1,'a'],[some_obj,'b'],['x',3],['y','z']];
    @Map(arr) .. s.toArray() .. assert.eq(arr);
  });
  test('from stream', function() {
    @Map(s.toStream(arr)) .. s.toArray .. assert.eq(arr);
  });
  test('count', function() {
    @Map(s.toStream(arr)) .. @count .. assert.eq(4);
  });
});
