var { shuffle } = require('sjs:collection/list');
var { test, context, assert } = require('sjs:test/suite');
var { Dict, Set, List, nil, equal, toJS,
      defaultSort, simpleSort, SortedSet, SortedDict } = require('sjs:collection/immutable');

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
        assert.ok(diff === -1 || diff === 0 || diff === 1);

        assert.is(node.size, left.size + right.size + node.array.length);
        loop(left);
        loop(right);
      }
    }
    loop(tree.root);

    assert.equal(toJS(tree), array);

    return tree;
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


  context("Dict", function () {
    var dict_empty = Dict();
    var dict_foo   = Dict().set("foo", 1);

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
      // TODO implement this
      //assert.isNot(SortedDict(simpleSort, dict_foo), dict_foo);

      assert.is(dict_empty.remove("foo"), dict_empty);

      assert.is(dict_foo.set("foo", 1), dict_foo);
      assert.isNot(dict_foo.set("foo", 2), dict_foo);
      assert.isNot(dict_foo.set("bar", 3), dict_foo);
      assert.isNot(dict_foo.remove("foo"), dict_foo);

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
  });


  context("Set", function () {
    var empty_set = Set();
    var five_set  = Set().add(1).add(2).add(3).add(4).add(5);

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
      assert.is(Set(five_set), five_set);
      assert.is(SortedSet(defaultSort, five_set), five_set);
      // TODO implement this
      //assert.isNot(SortedSet(simpleSort, five_set), five_set);

      assert.is(empty_set.remove(1), empty_set);

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
    });

    test("toJS", function () {
      assert.equal(toJS(empty_set), []);
      assert.equal(toJS(five_set), [1, 2, 3, 4, 5]);
      assert.equal(toJS(Set([1, 2, Set([3])])),
                   [1, 2, [3]]);
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
  });


  context("List", function () {
    var empty_list = List();
    var five_list  = List().push(1).push(2).push(3).push(4).push(5);

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

    test("nth", function () {
      assert.raises({
        message: "Index 0 is not valid"
      }, -> empty_list.nth(0));

      assert.raises({
        message: "Index -1 is not valid"
      }, -> empty_list.nth(-1));

      assert.is(empty_list.nth(0, 50), 50);

      assert.is(five_list.nth(0, 50), 1);
      assert.is(five_list.nth(4, 50), 5);
      assert.is(five_list.nth(-1, 50), 5);
      assert.is(five_list.nth(-2, 50), 4);
    });

    test("push", function () {
      assert.raises({
        message: "Index 1 is not valid"
      }, -> empty_list.push(5, 1));

      assert.raises({
        message: "Index -1 is not valid"
      }, -> empty_list.push(5, -2));

      var x = empty_list.push(10);

      verify_list(empty_list, []);
      verify_list(x, [10]);

      assert.is(empty_list.size(), 0);
      assert.is(x.size(), 1);
      assert.is(x.nth(0), 10);
      assert.is(x.nth(-1), 10);

      verify_list(five_list.push(10), [1, 2, 3, 4, 5, 10]);
      verify_list(five_list.push(10).push(20), [1, 2, 3, 4, 5, 10, 20]);
      verify_list(five_list.push(10, 0), [10, 1, 2, 3, 4, 5]);
      verify_list(five_list.push(10, 1), [1, 10, 2, 3, 4, 5]);
      verify_list(five_list.push(10, -1), [1, 2, 3, 4, 5, 10]);
      verify_list(five_list.push(10, -2), [1, 2, 3, 4, 10, 5]);
      verify_list(five_list, [1, 2, 3, 4, 5]);

      verify_list(List().push(5, 0).push(4, 0).push(3, 0).push(2, 0).push(1, 0),
                  [1, 2, 3, 4, 5]);
    });

    test("pop", function () {
      assert.raises({
        message: "Index -1 is not valid"
      }, -> empty_list.pop());

      assert.raises({
        message: "Index 0 is not valid"
      }, -> empty_list.pop(0));

      assert.raises({
        message: "Index -1 is not valid"
      }, -> empty_list.pop(-1));

      verify_list(five_list.pop(), [1, 2, 3, 4]);
      verify_list(five_list.pop().pop(), [1, 2, 3]);
      verify_list(five_list.pop(-1), [1, 2, 3, 4]);
      verify_list(five_list.pop(-2), [1, 2, 3, 5]);
      verify_list(five_list.pop(0), [2, 3, 4, 5]);
      verify_list(five_list.pop(1), [1, 3, 4, 5]);
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

    test("concat", function () {
      verify_list(empty_list.concat(empty_list), []);
      verify_list(five_list.concat(five_list), [1, 2, 3, 4, 5, 1, 2, 3, 4, 5]);
      verify_list(List([10, 20, 30]).concat(five_list), [10, 20, 30, 1, 2, 3, 4, 5]);
      verify_list(five_list.concat(List([10, 20, 30])), [1, 2, 3, 4, 5, 10, 20, 30]);
    });

    test("=== when not modified", function () {
      assert.is(List(five_list), five_list);

      assert.is(empty_list.concat(empty_list), empty_list);
      assert.is(five_list.concat(empty_list), five_list);
      assert.is(empty_list.concat(five_list), five_list);

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

        o = o.push(x, index);
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
        o = o.pop(index);
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
          il = il.push(x, index);
          al.splice(index, 0, x);
          verify_list(il, al);
        });

        a.slice(pivot).forEach(function (x) {
          var index = random_int(ir.size());
          ir = ir.push(x, index);
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
  });
}
