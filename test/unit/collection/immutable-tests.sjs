var { shuffle } = require('sjs:collection/list');
var { zip, toArray } = require('sjs:sequence');
var { test, context, assert } = require('sjs:test/suite');
var { Dict, Set, List, Queue, Stack, nil, equal, toJS,
      defaultSort, simpleSort, SortedSet, SortedDict,
      isDict, isSet, isList, isSortedDict, isSortedSet,
      isQueue, isStack } = require('sjs:collection/immutable');

__js {
  // TODO test that this works correctly
  function verify_dict(tree) {
    var sort = tree.sort;

    function loop(node, lt, gt) {
      if (node !== nil) {
        var left  = node.left;
        var right = node.right;

        assert.is(node.depth, Math.max(left.depth, right.depth) + 1);

        var diff = left.depth - right.depth;
        assert.ok(diff === -1 || diff === 0 || diff === 1);

        // Every left node must be lower than the parent node
        lt.forEach(function (parent) {
          assert.ok(sort(node.key, parent.key) < 0);
        });

        // Every right node must be greater than the parent node
        gt.forEach(function (parent) {
          assert.ok(sort(node.key, parent.key) > 0);
        });

        loop(left,  lt.concat([node]), gt);
        loop(right, lt, gt.concat([node]));
      }
    }
    loop(tree.root, [], []);

    return tree;
  }

  function verify_set(tree, array) {
    verify_dict(tree);

    assert.equal(toJS(tree), array);

    return tree;
  }

  function verify_list(tree, array) {
    function loop(node) {
      if (node !== nil) {
        var left  = node.left;
        var right = node.right;

        assert.is(node.depth, Math.max(left.depth, right.depth) + 1);

        var diff = left.depth - right.depth;
        assert.ok(diff === -1 || diff === 0 || diff === 1, diff);

        assert.ok(node.array.length <= 125);

        assert.is(node.size, left.size + right.size + node.array.length);
        loop(left);
        loop(right);
      }
    }
    loop(tree.root);

    var count = 0;
    var cons = tree.tail;
    while (cons !== nil) {
      ++count;
      cons = cons.cdr;
    }

    assert.is(count, tree.tail_size);
    assert.ok(tree.tail_size <= 125);

    assert.equal(toJS(tree), array);

    return tree;
  }

  function verify_queue(queue, array) {
    if (!queue.isEmpty()) {
      assert.isNot(queue.left, nil);
    }

    assert.equal(toJS(queue), array);

    return queue;
  }

  function verify_stack(stack, array) {
    assert.equal(toJS(stack), array);

    return stack;
  }

  function random_int(max) {
    return Math.floor(Math.random() * max);
  }

  function random_list(max) {
    var out = [];
    for (var i = 0; i < max; ++i) {
      out.push(i);
    }
    shuffle(out);
    return out;
  }
}


context("Dict", function () {
  var dict_empty = Dict();
  var dict_foo   = Dict().set("foo", 1);

  test("isDict", function () {
    assert.notOk(isDict(Set()));

    assert.ok(isDict(Dict()));
    assert.ok(isDict(SortedDict(defaultSort)));

    assert.ok(isSortedDict(SortedDict(simpleSort)));
    assert.notOk(isSortedDict(SortedDict(defaultSort)));
    assert.notOk(isSortedDict(Dict()));
  });

  test("verify", function () {
    verify_dict(dict_empty);
    verify_dict(dict_foo);
  });

  test("init", function () {
    var x = Dict({ foo: 1 });
    verify_dict(x);
    assert.ok(equal(x, dict_foo));
    assert.ok(equal(dict_foo, x));
  });

  test("isEmpty", function () {
    assert.ok(dict_empty.isEmpty());
    assert.notOk(dict_foo.isEmpty());
  });

  test("has", function () {
    assert.notOk(dict_empty.has("foo"));
    assert.notOk(dict_empty.has("bar"));

    assert.ok(dict_foo.has("foo"));
    assert.notOk(dict_foo.has("bar"));
  });

  test("get", function () {
    assert.raises({
      message: "Key foo not found"
    }, -> dict_empty.get("foo"));

    assert.is(dict_empty.get("foo", 50), 50);

    assert.is(dict_foo.get("foo"), 1);
    assert.is(dict_foo.get("foo", 50), 1);
  });

  test("set", function () {
    var dict_bar = dict_empty.set("bar", 2);
    assert.notOk(dict_empty.has("bar"));
    assert.ok(dict_bar.has("bar"));
    assert.is(dict_bar.get("bar"), 2);

    var dict_foo2 = dict_foo.set("foo", 3);
    assert.is(dict_foo.get("foo"), 1);
    assert.is(dict_foo2.get("foo"), 3);
  });

  test("modify", function () {
    var ran = false;

    assert.raises({
      message: "Key foo not found"
    }, -> dict_empty.modify("foo", function (x) {
      ran = true;
      return x + 1;
    }));

    assert.is(ran, false);


    var ran = false;

    var dict_foo2 = dict_foo.modify("foo", function (x) {
      ran = true;
      assert.is(x, 1);
      return x + 5;
    });

    assert.is(ran, true);

    assert.is(dict_foo.get("foo"), 1);
    assert.is(dict_foo2.get("foo"), 6);
  });

  test("remove", function () {
    assert.notOk(dict_empty.has("foo"));

    var dict_empty2 = dict_empty.remove("foo");
    assert.notOk(dict_empty2.has("foo"));

    var dict_foo2 = dict_foo.remove("foo");
    assert.ok(dict_foo.has("foo"));
    assert.notOk(dict_foo2.has("foo"));
  });

  test("complex keys", function () {
    var o = Dict();

    var m1 = {};
    var m2 = {};

    var i1 = Dict();
    var i2 = Dict();
    var i3 = Dict({ foo: 10 });

    o = o.set(m1, 1);
    o = o.set(m2, 2);
    o = o.set(i1, 3);
    o = o.set(i2, 4);
    o = o.set(i3, 5);

    assert.ok(o.has(m1));
    assert.ok(o.has(m2));
    assert.ok(o.has(i1));
    assert.ok(o.has(i2));
    assert.ok(o.has(i3));

    assert.is(o.get(m1), 1);
    assert.is(o.get(m2), 2);
    assert.is(o.get(i1), 4);
    assert.is(o.get(i2), 4);
    assert.is(o.get(i3), 5);

    o = o.remove(m1);
    o = o.remove(m2);
    o = o.remove(i1);
    o = o.remove(i3);

    assert.notOk(o.has(m1));
    assert.notOk(o.has(m2));
    assert.notOk(o.has(i1));
    assert.notOk(o.has(i2));
    assert.notOk(o.has(i3));
  });

  test("=== when not modified", function () {
    assert.is(Dict(dict_foo), dict_foo);
    assert.is(SortedDict(defaultSort, dict_foo), dict_foo);
    assert.isNot(SortedDict(simpleSort, dict_foo), dict_foo);

    assert.is(dict_empty.remove("foo"), dict_empty);

    assert.is(dict_foo.set("foo", 1), dict_foo);
    assert.isNot(dict_foo.set("foo", 2), dict_foo);
    assert.isNot(dict_foo.set("bar", 3), dict_foo);
    assert.isNot(dict_foo.remove("foo"), dict_foo);

    var dict1 = Dict().set(Dict({ foo: 1 }), Dict({ bar: 2 }));

    assert.isNot(dict1.modify(Dict({ foo: 1 }), function () {
      return Dict({ bar: 2 });
    }), dict1);

    assert.isNot(dict1.modify(Dict({ foo: 1 }), function () {
      return Dict({ bar: 3 });
    }), dict1);

    assert.is(dict_foo.modify("foo", function () {
      return 1;
    }), dict_foo);

    assert.isNot(dict_foo.modify("foo", function () {
      return 2;
    }), dict_foo);
  });

  test("equal", function () {
    assert.notOk(equal(dict_empty, dict_foo));
    assert.ok(equal(dict_empty, dict_empty));
    assert.ok(equal(dict_foo, dict_foo));
    assert.ok(equal(Dict(), Dict()));
    assert.ok(equal(Dict({ foo: 1 }), Dict({ foo: 1 })));
    assert.ok(equal(Dict({ foo: Dict({ bar: 2 }) }),
                    Dict({ foo: Dict({ bar: 2 }) })));
    assert.notOk(equal(Dict({ foo: Dict({ bar: 2 }) }),
                       Dict({ foo: Dict({ bar: 3 }) })));

    assert.ok(equal(SortedDict(defaultSort, { foo: 1 }),
                    Dict({ foo: 1 })));

    assert.notOk(equal(SortedDict(simpleSort, { foo: 1 }),
                       Dict({ foo: 1 })));
  });

  test("toJS", function () {
    assert.equal(toJS(dict_empty), {});
    assert.equal(toJS(dict_foo), { foo: 1 });
    assert.equal(toJS(Dict({ foo: Dict({ bar: 2 }) })),
                 { foo: { bar: 2 } });
  });

  test("random keys", function () {
    var o = Dict();
    verify_dict(o);

    random_list(200).forEach(function (i) {
      o = o.set("foo" + i, 5);
      verify_dict(o);
    });

    random_list(200).forEach(function (i) {
      o = o.modify("foo" + i, function (x) {
        return x + 15;
      });
      verify_dict(o);
    });

    random_list(200).forEach(function (i) {
      o = o.remove("foo" + i);
      verify_dict(o);
    });
  });

  test("zip", function () {
    var a = [["a", 1], ["b", 2], ["c", 3], ["d", 4],
             ["e", 5], ["f", 6], ["g", 7], ["h", 8]];
    assert.equal(toArray(zip(Dict(a))), toArray(zip(a)));
  });
});


context("Set", function () {
  var empty_set = Set();
  var five_set  = Set().add(1).add(2).add(3).add(4).add(5);

  test("isSet", function () {
    assert.notOk(isSet(Dict()));

    assert.ok(isSet(Set()));
    assert.ok(isSet(SortedSet(defaultSort)));

    assert.ok(isSortedSet(SortedSet(simpleSort)));
    assert.notOk(isSortedSet(SortedSet(defaultSort)));
    assert.notOk(isSortedSet(Set()));
  });

  test("verify", function () {
    verify_set(empty_set, []);
    verify_set(five_set, [1, 2, 3, 4, 5]);
  });

  test("init", function () {
    verify_set(Set([1, 2, 3]), [1, 2, 3]);
  });

  test("isEmpty", function () {
    assert.ok(empty_set.isEmpty());
    assert.notOk(five_set.isEmpty());
  });

  test("has", function () {
    assert.notOk(empty_set.has(1));
    assert.notOk(five_set.has(0));
    assert.ok(five_set.has(1));
    assert.ok(five_set.has(2));
    assert.ok(five_set.has(3));
    assert.ok(five_set.has(4));
    assert.ok(five_set.has(5));
    assert.notOk(five_set.has(6));
  });

  test("add", function () {
    verify_set(empty_set, []);
    verify_set(empty_set.add(5), [5]);
    verify_set(empty_set, []);

    verify_set(five_set, [1, 2, 3, 4, 5]);
    verify_set(five_set.add(5), [1, 2, 3, 4, 5]);
    verify_set(five_set, [1, 2, 3, 4, 5]);
  });

  test("remove", function () {
    verify_set(empty_set.remove(1), []);

    verify_set(five_set.remove(1), [2, 3, 4, 5]);
    verify_set(five_set.remove(1).remove(4), [2, 3, 5]);
  });

  test("union", function () {
    verify_set(five_set.union(five_set), [1, 2, 3, 4, 5]);
    verify_set(five_set.union(Set([1, 2, 6, 9])), [1, 2, 3, 4, 5, 6, 9]);
    verify_set(Set([1, 2]).union(five_set), [1, 2, 3, 4, 5]);
    verify_set(Set([1, 2, 6]).union(five_set), [1, 2, 3, 4, 5, 6]);
    verify_set(five_set.union([1, 2, 6, 9]), [1, 2, 3, 4, 5, 6, 9]);
  });

  test("intersect", function () {
    verify_set(five_set.intersect(five_set), [1, 2, 3, 4, 5]);
    verify_set(empty_set.intersect(five_set), []);
    verify_set(five_set.intersect(empty_set), []);
    verify_set(five_set.intersect([1, 3, 4]), [1, 3, 4]);
    verify_set(five_set.intersect([1, 3, 4, 6, 10, 20]), [1, 3, 4]);
  });

  test("disjoint", function () {
    verify_set(five_set.disjoint(five_set), []);
    verify_set(five_set.disjoint(empty_set), [1, 2, 3, 4, 5]);
    verify_set(empty_set.disjoint(five_set), [1, 2, 3, 4, 5]);
    verify_set(five_set.disjoint([1, 2, 3]), [4, 5]);
    verify_set(five_set.disjoint([1, 2, 3, 6, 7, 8]), [4, 5, 6, 7, 8]);
  });

  test("subtract", function () {
    verify_set(five_set.subtract(empty_set), [1, 2, 3, 4, 5]);
    verify_set(empty_set.subtract(five_set), []);
    verify_set(five_set.subtract(five_set), []);
    verify_set(five_set.subtract([1, 2, 3]), [4, 5]);
    verify_set(five_set.subtract([1, 2, 3, 6, 7, 9]), [4, 5]);
  });

  test("complex elements", function () {
    var o = Set();

    var m1 = {};
    var m2 = {};

    var i1 = Set();
    var i2 = Set();
    var i3 = Set([1, 2, 3]);

    o = o.add(m1);
    o = o.add(m2);
    o = o.add(i1);
    o = o.add(i2);
    o = o.add(i3);

    assert.ok(o.has(m1));
    assert.ok(o.has(m2));
    assert.ok(o.has(i1));
    assert.ok(o.has(i2));
    assert.ok(o.has(i3));

    o = o.remove(m1);
    o = o.remove(m2);
    o = o.remove(i1);
    o = o.remove(i3);

    assert.notOk(o.has(m1));
    assert.notOk(o.has(m2));
    assert.notOk(o.has(i1));
    assert.notOk(o.has(i2));
    assert.notOk(o.has(i3));
  });

  test("=== when not modified", function () {
    assert.is(empty_set.union(empty_set), empty_set);
    assert.isNot(empty_set.union(five_set), five_set);
    assert.is(five_set.union(empty_set), five_set);
    assert.is(five_set.union(five_set), five_set);
    assert.is(five_set.union(Set([1, 2, 3])), five_set);

    assert.is(Set(five_set), five_set);
    assert.is(SortedSet(defaultSort, five_set), five_set);
    assert.isNot(SortedSet(simpleSort, five_set), five_set);

    assert.is(empty_set.remove(1), empty_set);

    var set1 = Set([Set([])]);

    assert.isNot(set1.add(Set([])), set1);

    assert.is(five_set.add(5), five_set);
    assert.isNot(five_set.add(6), five_set);
    assert.isNot(five_set.remove(5), five_set);
  });

  test("equal", function () {
    assert.notOk(equal(empty_set, five_set));
    assert.ok(equal(empty_set, empty_set));
    assert.ok(equal(five_set, five_set));
    assert.ok(equal(Set(), Set()));
    assert.ok(equal(Set([1]), Set([1])));
    assert.ok(equal(Set([Set([1])]), Set([Set([1])])));
    assert.notOk(equal(Set([Set([1])]), Set([Set([2])])));

    assert.ok(equal(SortedSet(defaultSort, [1, 2, 3]),
                    Set([1, 2, 3])));
    assert.notOk(equal(SortedSet(simpleSort, [1, 2, 3]),
                       Set([1, 2, 3])));
  });

  test("toJS", function () {
    assert.equal(toJS(empty_set), []);
    assert.equal(toJS(five_set), [1, 2, 3, 4, 5]);
    assert.equal(toJS(Set([1, 2, Set([3])])),
                 [[3], 1, 2]);
  });

  test("random elements", function () {
    var o = Set();
    var a = [];

    var sort = o.sort;

    // TODO utilities for these
    function push_sorted(a, x, sort) {
      for (var i = 0, l = a.length; i < l; ++i) {
        if (sort(x, a[i]) <= 0) {
          a.splice(i, 0, x);
          return;
        }
      }
      a.push(x);
    }

    function remove(a, x) {
      var index = a.indexOf(x);
      assert.isNot(index, -1);
      a.splice(index, 1);
    }

    verify_set(o, a);

    random_list(200).forEach(function (i) {
      o = o.add(i);
      push_sorted(a, i, sort);
      verify_set(o, a);
    });

    random_list(200).forEach(function (i) {
      o = o.remove(i);
      remove(a, i);
      verify_set(o, a);
    });

    verify_set(o, []);
  });

  test("zip", function () {
    var a = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    assert.equal(toArray(zip(Set(a))), toArray(zip(a)));
  });
});


context("List", function () {
  var empty_list = List();
  var five_list  = List().insert(1).insert(2).insert(3).insert(4).insert(5);

  test("isList", function () {
    assert.notOk(isList(Dict()));
    assert.ok(isList(List()));
  });

  test("verify", function () {
    verify_list(empty_list, []);
    verify_list(five_list, [1, 2, 3, 4, 5]);
  });

  test("init", function () {
    verify_list(List([1, 2, 3]), [1, 2, 3]);
  });

  test("isEmpty", function () {
    assert.ok(empty_list.isEmpty());
    assert.notOk(five_list.isEmpty());
  });

  test("size", function () {
    assert.is(empty_list.size(), 0);
    assert.is(five_list.size(), 5);
  });

  test("has", function () {
    assert.notOk(empty_list.has(0));
    assert.notOk(empty_list.has(-1));

    assert.ok(five_list.has(0));
    assert.ok(five_list.has(4));
    assert.ok(five_list.has(-1));
    assert.ok(five_list.has(-5));
    assert.notOk(five_list.has(5));
    assert.notOk(five_list.has(-6));
  });

  test("get", function () {
    assert.is(empty_list.get(0, 50), 50);
    assert.is(empty_list.get(-1, 50), 50);

    assert.raises({
      message: "Index 0 is not valid"
    }, -> empty_list.get(0));

    assert.raises({
      message: "Index -1 is not valid"
    }, -> empty_list.get(-1));

    assert.is(empty_list.get(0, 50), 50);

    assert.is(five_list.get(0, 50), 1);
    assert.is(five_list.get(4, 50), 5);
    assert.is(five_list.get(-1, 50), 5);
    assert.is(five_list.get(-2, 50), 4);
  });

  test("insert", function () {
    assert.raises({
      message: "Index 1 is not valid"
    }, -> empty_list.insert(5, 1));

    assert.raises({
      message: "Index -1 is not valid"
    }, -> empty_list.insert(5, -2));

    var x = empty_list.insert(10);

    verify_list(empty_list, []);
    verify_list(x, [10]);

    assert.is(empty_list.size(), 0);
    assert.is(x.size(), 1);
    assert.is(x.get(0), 10);
    assert.is(x.get(-1), 10);

    verify_list(five_list.insert(10), [1, 2, 3, 4, 5, 10]);
    verify_list(five_list.insert(10).insert(20), [1, 2, 3, 4, 5, 10, 20]);
    verify_list(five_list.insert(10, 0), [10, 1, 2, 3, 4, 5]);
    verify_list(five_list.insert(10, 1), [1, 10, 2, 3, 4, 5]);
    verify_list(five_list.insert(10, -1), [1, 2, 3, 4, 5, 10]);
    verify_list(five_list.insert(10, -2), [1, 2, 3, 4, 10, 5]);
    verify_list(five_list, [1, 2, 3, 4, 5]);

    verify_list(List().insert(5, 0).insert(4, 0).insert(3, 0).insert(2, 0).insert(1, 0),
                [1, 2, 3, 4, 5]);
  });

  test("remove", function () {
    assert.raises({
      message: "Index -1 is not valid"
    }, -> empty_list.remove());

    assert.raises({
      message: "Index 0 is not valid"
    }, -> empty_list.remove(0));

    assert.raises({
      message: "Index -1 is not valid"
    }, -> empty_list.remove(-1));

    verify_list(five_list.remove(), [1, 2, 3, 4]);
    verify_list(five_list.remove().remove(), [1, 2, 3]);
    verify_list(five_list.remove(-1), [1, 2, 3, 4]);
    verify_list(five_list.remove(-2), [1, 2, 3, 5]);
    verify_list(five_list.remove(0), [2, 3, 4, 5]);
    verify_list(five_list.remove(1), [1, 3, 4, 5]);
  });

  test("modify", function () {
    var ran = false;

    assert.raises({
      message: "Index 0 is not valid"
    }, -> empty_list.modify(0, function () { ran = true; }));

    assert.raises({
      message: "Index -1 is not valid"
    }, -> empty_list.modify(-1, function () { ran = true; }));

    assert.is(ran, false);


    var ran = false;

    verify_list(five_list.modify(0, function (x) {
      ran = true;
      assert.is(x, 1);
      return x + 100;
    }), [101, 2, 3, 4, 5]);

    assert.is(ran, true);


    verify_list(five_list.modify(-1, x -> x + 100), [1, 2, 3, 4, 105]);
    verify_list(five_list.modify(1, x -> x + 100), [1, 102, 3, 4, 5]);
    verify_list(five_list.modify(-2, x -> x + 100), [1, 2, 3, 104, 5]);
  });

  test("slice", function () {
    verify_list(empty_list.slice(0, 0), []);
    verify_list(five_list.slice(0, 0), []);
    verify_list(five_list.slice(0, 2), [1, 2]);
    verify_list(five_list.slice(2, 3), [3]);
    verify_list(five_list.slice(3, 5), [4, 5]);
    verify_list(five_list.slice(0, 5), [1, 2, 3, 4, 5]);

    verify_list(empty_list.slice(), []);

    assert.raises({
      message: "Index 5 is greater than index 1"
    }, -> five_list.slice(5, 1));

    assert.raises({
      message: "Index 6 is not valid"
    }, -> five_list.slice(6, 7));

    assert.raises({
      message: "Index 6 is not valid"
    }, -> five_list.slice(0, 6));

    assert.raises({
      message: "Index 10 is not valid"
    }, -> five_list.slice(10, 10));

    verify_list(five_list.slice(null, 5), [1, 2, 3, 4, 5]);
    verify_list(five_list.slice(0, null), [1, 2, 3, 4, 5]);
    verify_list(five_list.slice(null, null), [1, 2, 3, 4, 5]);

    verify_list(five_list.slice(), [1, 2, 3, 4, 5]);
    verify_list(five_list.slice(0), [1, 2, 3, 4, 5]);
    verify_list(five_list.slice(-1), [5]);
    verify_list(five_list.slice(-3), [3, 4, 5]);
    verify_list(five_list.slice(-3, 4), [3, 4]);

    verify_list(five_list.slice(0, -1), [1, 2, 3, 4]);
    verify_list(five_list.slice(-2, -1), [4]);
    verify_list(five_list.slice(-4, -1), [2, 3, 4]);
    verify_list(five_list.slice(-4, 4), [2, 3, 4]);


    var double_list  = List();
    var double_array = [];

    var len = 125 * 2;
    for (var i = 0; i < len; ++i) {
      double_list = double_list.insert(i);
      double_array.push(i);
    }

    verify_list(double_list.slice(0, 124), double_array.slice(0, 124));
    verify_list(double_list.slice(0, 125), double_array.slice(0, 125));
    verify_list(double_list.slice(0, 126), double_array.slice(0, 126));

    verify_list(double_list.slice(124, 250), double_array.slice(124, 250));
    verify_list(double_list.slice(125, 250), double_array.slice(125, 250));
    verify_list(double_list.slice(126, 250), double_array.slice(126, 250));

    verify_list(double_list.slice(124, 125), double_array.slice(124, 125));
    verify_list(double_list.slice(125, 126), double_array.slice(125, 126));

    verify_list(double_list.slice(0, 250), double_array.slice(0, 250));


    var big_list  = List();
    var big_array = [];

    var len = 125 * 1000;
    for (var i = 0; i < len; ++i) {
      big_list = big_list.insert(i);
      big_array.push(i);
    }

    verify_list(big_list.slice(0, 125), big_array.slice(0, 125));
    verify_list(big_list.slice(0, 126), big_array.slice(0, 126));
    verify_list(big_list.slice(125, 250), big_array.slice(125, 250));
    verify_list(big_list.slice(50, 125), big_array.slice(50, 125));
    verify_list(big_list.slice(50, 126), big_array.slice(50, 126));
    verify_list(big_list.slice(50, 2546), big_array.slice(50, 2546));

    verify_list(big_list.slice(0, len), big_array.slice(0, len));
    verify_list(big_list.slice(0, len - 1), big_array.slice(0, len - 1));
    verify_list(big_list.slice(1, len), big_array.slice(1, len));
    verify_list(big_list.slice(1, len - 1), big_array.slice(1, len - 1));
    verify_list(big_list.slice(50, 60), big_array.slice(50, 60));
    verify_list(big_list.slice(50, 125), big_array.slice(50, 125));
    verify_list(big_list.slice(50, 126), big_array.slice(50, 126));
    verify_list(big_list.slice(125, 126), big_array.slice(125, 126));
    verify_list(big_list.slice(124, 126), big_array.slice(124, 126));
    verify_list(big_list.slice(Math.ceil(len / 2)), big_array.slice(Math.ceil(len / 2)));
  });

  test("concat", function () {
    verify_list(empty_list.concat(empty_list), []);
    verify_list(five_list.concat(five_list), [1, 2, 3, 4, 5, 1, 2, 3, 4, 5]);
    verify_list(List([10, 20, 30]).concat(five_list), [10, 20, 30, 1, 2, 3, 4, 5]);
    verify_list(five_list.concat(List([10, 20, 30])), [1, 2, 3, 4, 5, 10, 20, 30]);
    verify_list(five_list.concat([10, 20, 30]), [1, 2, 3, 4, 5, 10, 20, 30]);
  });

  test("=== when not modified", function () {
    assert.is(List(five_list), five_list);

    assert.is(empty_list.concat(empty_list), empty_list);
    assert.is(five_list.concat(empty_list), five_list);
    assert.is(empty_list.concat(five_list), five_list);

    assert.is(empty_list.slice(), empty_list);
    assert.is(five_list.slice(), five_list);
    assert.is(five_list.slice(0, 5), five_list);
    assert.isNot(five_list.slice(1, 5), five_list);
    assert.isNot(five_list.slice(0, 4), five_list);

    var list1 = List([List([])]);

    assert.isNot(list1.modify(0, function () {
      return List([]);
    }), list1);

    assert.is(five_list.modify(0, function () {
      return 1;
    }), five_list);

    assert.isNot(five_list.modify(0, function () {
      return 2;
    }), five_list);

    assert.is(five_list.modify(1, function () {
      return 2;
    }), five_list);

    assert.isNot(five_list.modify(1, function () {
      return 3;
    }), five_list);

    assert.is(five_list.modify(-1, function () {
      return 5;
    }), five_list);

    assert.isNot(five_list.modify(-1, function () {
      return 6;
    }), five_list);
  });

  test("equal", function () {
    assert.ok(equal(empty_list, empty_list));
    assert.ok(equal(five_list, five_list));

    assert.ok(equal(List([1, 2, 3]), List([1, 2, 3])));
    assert.notOk(equal(List([1, 2, 3]), List([1, 2, 4])));
    assert.notOk(equal(List([1, 2, 3]), List([1, 3, 2])));

    assert.ok(equal(List([1, 2, 3, 4, 5]), five_list));
    assert.ok(equal(five_list, List([1, 2, 3, 4, 5])));

    assert.ok(equal(List([List([1, 2, 3])]), List([List([1, 2, 3])])));
  });

  test("toJS", function () {
    assert.equal(toJS(empty_list), []);
    assert.equal(toJS(five_list), [1, 2, 3, 4, 5]);
    assert.equal(toJS(List([1, 2, List([3])])), [1, 2, [3]]);
  });

  test("random elements", function () {
    var o = List();
    var a = [];

    verify_list(o, a);

    random_list(200).forEach(function (x) {
      var index = random_int(o.size());

      o = o.insert(x, index);
      a.splice(index, 0, x);

      verify_list(o, a);
    });

    random_list(200).forEach(function (i) {
      o = o.modify(i, function (x) {
        return x + 15;
      });

      a[i] = a[i] + 15;

      verify_list(o, a);
    });

    while (o.size()) {
      var index = random_int(o.size());
      o = o.remove(index);
      a.splice(index, 1);
      verify_list(o, a);
    }

    assert.ok(o.isEmpty());
    verify_list(o, []);


    var a = random_list(200);
    var pivot = random_int(200);

    function test_concat(pivot) {
      var al = [];
      var ar = [];

      var il = List();
      var ir = List();

      a.slice(0, pivot).forEach(function (x) {
        var index = random_int(il.size());
        il = il.insert(x, index);
        al.splice(index, 0, x);
        verify_list(il, al);
      });

      a.slice(pivot).forEach(function (x) {
        var index = random_int(ir.size());
        ir = ir.insert(x, index);
        ar.splice(index, 0, x);
        verify_list(ir, ar);
      });

      verify_list(il.concat(ir), al.concat(ar));
      verify_list(ir.concat(il), ar.concat(al));
    }

    test_concat(0);
    test_concat(5);
    test_concat(pivot);
    test_concat(194);
    test_concat(199);
  });

  test("zip", function () {
    assert.equal(toArray(zip(List())), toArray(zip([])));

    assert.equal(toArray(zip(List([1, 2, 3, 4, 5]))), [[1], [2], [3], [4], [5]]);

    var a = random_list(200);
    assert.equal(toArray(zip(List(a))), toArray(zip(a)));
  });
});


context("Queue", function () {
  var empty_queue = Queue();
  var five_queue  = Queue().push(1).push(2).push(3).push(4).push(5);

  test("isQueue", function () {
    assert.notOk(isQueue(List()));
    assert.ok(isQueue(Queue()));
  });

  test("verify", function () {
    verify_queue(empty_queue, []);
    verify_queue(five_queue, [1, 2, 3, 4, 5]);
  });

  test("init", function () {
    verify_queue(Queue([1, 2, 3]), [1, 2, 3]);
  });

  test("isEmpty", function () {
    assert.ok(empty_queue.isEmpty());
    assert.notOk(five_queue.isEmpty());
  });

  test("size", function () {
    assert.is(empty_queue.size(), 0);
    assert.is(five_queue.size(), 5);
  });

  test("peek", function () {
    assert.raises({
      message: "Cannot peek from an empty queue"
    }, -> empty_queue.peek());

    assert.is(empty_queue.peek(50), 50);

    assert.is(five_queue.peek(), 1);
    assert.is(five_queue.peek(50), 1);
  });

  test("push", function () {
    var x = empty_queue.push(10);

    verify_queue(empty_queue, []);
    verify_queue(x, [10]);

    assert.is(empty_queue.size(), 0);
    assert.is(x.size(), 1);
    assert.is(x.peek(), 10);

    verify_queue(five_queue.push(10), [1, 2, 3, 4, 5, 10]);
    verify_queue(five_queue.push(10).push(20), [1, 2, 3, 4, 5, 10, 20]);
    verify_queue(five_queue, [1, 2, 3, 4, 5]);

    verify_queue(Queue().push(5).push(4).push(3).push(2).push(1),
                 [5, 4, 3, 2, 1]);
  });

  test("pop", function () {
    assert.raises({
      message: "Cannot pop from an empty queue"
    }, -> empty_queue.pop());

    verify_queue(five_queue.pop(), [2, 3, 4, 5]);
    verify_queue(five_queue.pop().pop(), [3, 4, 5]);

    verify_queue(Queue(), []);
    verify_queue(Queue().push(5).push(10).push(20).push(30), [5, 10, 20, 30]);
    verify_queue(Queue().push(5).push(10).push(20).push(30).pop(), [10, 20, 30]);
  });

  test("concat", function () {
    verify_queue(empty_queue.concat(empty_queue), []);
    verify_queue(five_queue.concat(five_queue), [1, 2, 3, 4, 5, 1, 2, 3, 4, 5]);
    verify_queue(Queue([10, 20, 30]).concat(five_queue), [10, 20, 30, 1, 2, 3, 4, 5]);
    verify_queue(five_queue.concat(Queue([10, 20, 30])), [1, 2, 3, 4, 5, 10, 20, 30]);
    verify_queue(five_queue.concat([10, 20, 30]), [1, 2, 3, 4, 5, 10, 20, 30]);
  });

  test("=== when not modified", function () {
    assert.is(Queue(five_queue), five_queue);

    assert.is(empty_queue.concat(empty_queue), empty_queue);
    assert.is(five_queue.concat(empty_queue), five_queue);
    assert.isNot(empty_queue.concat(five_queue), five_queue);
  });

  test("equal", function () {
    assert.ok(equal(empty_queue, empty_queue));
    assert.ok(equal(five_queue, five_queue));

    assert.ok(equal(Queue([1, 2, 3]), Queue([1, 2, 3])));
    assert.notOk(equal(Queue([1, 2, 3]), Queue([1, 2, 4])));
    assert.notOk(equal(Queue([1, 2, 3]), Queue([1, 3, 2])));

    assert.ok(equal(Queue([1, 2, 3, 4, 5]), five_queue));
    assert.ok(equal(five_queue, Queue([1, 2, 3, 4, 5])));

    assert.ok(equal(Queue([Queue([1, 2, 3])]), Queue([Queue([1, 2, 3])])));
  });

  test("toJS", function () {
    assert.equal(toJS(empty_queue), []);
    assert.equal(toJS(five_queue), [1, 2, 3, 4, 5]);
    assert.equal(toJS(Queue([1, 2, Queue([3])])), [1, 2, [3]]);
  });

  test("zip", function () {
    var a = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    assert.equal(toArray(zip(Queue(a))), toArray(zip(a)));
  });
});


context("Stack", function () {
  var empty_stack = Stack();
  var five_stack  = Stack().push(1).push(2).push(3).push(4).push(5);

  test("isStack", function () {
    assert.notOk(isStack(Queue()));
    assert.ok(isStack(Stack()));
  });

  test("verify", function () {
    verify_stack(empty_stack, []);
    verify_stack(five_stack, [1, 2, 3, 4, 5]);
  });

  test("init", function () {
    verify_stack(Stack([1, 2, 3]), [1, 2, 3]);
  });

  test("isEmpty", function () {
    assert.ok(empty_stack.isEmpty());
    assert.notOk(five_stack.isEmpty());
  });

  test("size", function () {
    assert.is(empty_stack.size(), 0);
    assert.is(five_stack.size(), 5);
  });

  test("peek", function () {
    assert.raises({
      message: "Cannot peek from an empty stack"
    }, -> empty_stack.peek());

    assert.is(empty_stack.peek(50), 50);

    assert.is(five_stack.peek(), 5);
    assert.is(five_stack.peek(50), 5);
  });

  test("push", function () {
    var x = empty_stack.push(10);

    verify_stack(empty_stack, []);
    verify_stack(x, [10]);

    assert.is(empty_stack.size(), 0);
    assert.is(x.size(), 1);
    assert.is(x.peek(), 10);

    verify_stack(five_stack.push(10), [1, 2, 3, 4, 5, 10]);
    verify_stack(five_stack.push(10).push(20), [1, 2, 3, 4, 5, 10, 20]);
    verify_stack(five_stack, [1, 2, 3, 4, 5]);

    verify_stack(Stack().push(5).push(4).push(3).push(2).push(1),
                 [5, 4, 3, 2, 1]);
  });

  test("pop", function () {
    assert.raises({
      message: "Cannot pop from an empty stack"
    }, -> empty_stack.pop());

    verify_stack(five_stack.pop(), [1, 2, 3, 4]);
    verify_stack(five_stack.pop().pop(), [1, 2, 3]);
  });

  test("concat", function () {
    verify_stack(empty_stack.concat(empty_stack), []);
    verify_stack(five_stack.concat(five_stack), [1, 2, 3, 4, 5, 1, 2, 3, 4, 5]);
    verify_stack(Stack([10, 20, 30]).concat(five_stack), [10, 20, 30, 1, 2, 3, 4, 5]);
    verify_stack(five_stack.concat(Stack([10, 20, 30])), [1, 2, 3, 4, 5, 10, 20, 30]);
    verify_stack(five_stack.concat([10, 20, 30]), [1, 2, 3, 4, 5, 10, 20, 30]);
  });

  test("=== when not modified", function () {
    assert.is(Stack(five_stack), five_stack);

    assert.is(empty_stack.concat(empty_stack), empty_stack);
    assert.is(five_stack.concat(empty_stack), five_stack);
    assert.isNot(empty_stack.concat(five_stack), five_stack);
  });

  test("equal", function () {
    assert.ok(equal(empty_stack, empty_stack));
    assert.ok(equal(five_stack, five_stack));

    assert.ok(equal(Stack([1, 2, 3]), Stack([1, 2, 3])));
    assert.notOk(equal(Stack([1, 2, 3]), Stack([1, 2, 4])));
    assert.notOk(equal(Stack([1, 2, 3]), Stack([1, 3, 2])));

    assert.ok(equal(Stack([1, 2, 3, 4, 5]), five_stack));
    assert.ok(equal(five_stack, Stack([1, 2, 3, 4, 5])));

    assert.ok(equal(Stack([Stack([1, 2, 3])]), Stack([Stack([1, 2, 3])])));
  });

  test("toJS", function () {
    assert.equal(toJS(empty_stack), []);
    assert.equal(toJS(five_stack), [1, 2, 3, 4, 5]);
    assert.equal(toJS(Stack([1, 2, Stack([3])])), [1, 2, [3]]);
  });

  test("zip", function () {
    var a = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    assert.equal(toArray(zip(Stack(a))), toArray(zip(a)));
  });
});
