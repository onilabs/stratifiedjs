var { shuffle } = require('sjs:collection/list');
var { test, assert } = require('sjs:test/suite');
var { Dict, List, nil, equal, toJS } = require('sjs:collection/avl-tree');

__js {
  // TODO test that this works correctly
  function verify_key(tree) {
    function loop(node, lt, gt) {
      if (node !== nil) {
        var left  = node.left;
        var right = node.right;

        assert.is(node.depth, Math.max(left.depth, right.depth) + 1);

        var diff = left.depth - right.depth;
        assert.ok(diff === -1 || diff === 0 || diff === 1);

        // Every left node must be lower than the parent node
        lt.forEach(function (parent) {
          assert.ok(node.key < parent.key);
        });

        // Every right node must be greater than the parent node
        gt.forEach(function (parent) {
          assert.ok(node.key > parent.key);
        });

        loop(left,  lt.concat([node]), gt);
        loop(right, lt, gt.concat([node]));
      }
    }
    loop(tree.root, [], []);

    return tree;
  }

  function verify_list(tree) {
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

    return tree;
  }

  function random_int(max) {
    return Math.floor(Math.random() * max);
  }

  function random_list(max) {
    var out = [];
    for (var i = 0; i < max; ++i) {
      out.push("foo" + i);
    }
    shuffle(out);
    return out;
  }


  var dict_empty = Dict();
  var dict_foo   = Dict().set("foo", 1);

  test("Dict verify", function () {
    verify_key(dict_empty);
    verify_key(dict_foo);
  });

  test("Dict init", function () {
    var x = Dict({ foo: 1 });
    verify_key(x);
    assert.ok(equal(x, dict_foo));
    assert.ok(equal(dict_foo, x));
  });

  test("Dict isEmpty", function () {
    assert.ok(dict_empty.isEmpty());
    assert.notOk(dict_foo.isEmpty());
  });

  test("Dict has", function () {
    assert.notOk(dict_empty.has("foo"));
    assert.notOk(dict_empty.has("bar"));

    assert.ok(dict_foo.has("foo"));
    assert.notOk(dict_foo.has("bar"));
  });

  test("Dict get", function () {
    assert.raises(-> dict_empty.get("foo"), {
      message: "Key foo not found"
    });

    assert.is(dict_empty.get("foo", 50), 50);

    assert.is(dict_foo.get("foo"), 1);
    assert.is(dict_foo.get("foo", 50), 1);
  });

  test("Dict set", function () {
    var dict_bar = dict_empty.set("bar", 2);
    assert.notOk(dict_empty.has("bar"));
    assert.ok(dict_bar.has("bar"));
    assert.is(dict_bar.get("bar"), 2);

    var dict_foo2 = dict_foo.set("foo", 3);
    assert.is(dict_foo.get("foo"), 1);
    assert.is(dict_foo2.get("foo"), 3);
  });

  test("Dict modify", function () {
    var ran = false;

    assert.is(dict_empty, dict_empty.modify("foo", function (x) {
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

  test("Dict remove", function () {
    assert.notOk(dict_empty.has("foo"));

    var dict_empty2 = dict_empty.remove("foo");
    assert.notOk(dict_empty2.has("foo"));

    var dict_foo2 = dict_foo.remove("foo");
    assert.ok(dict_foo.has("foo"));
    assert.notOk(dict_foo2.has("foo"));
  });

  test("Dict === when not modified", function () {
    assert.is(dict_empty, dict_empty.remove("foo"));

    assert.is(dict_foo, dict_foo.set("foo", 1));
    assert.isNot(dict_foo, dict_foo.set("foo", 2));
    assert.isNot(dict_foo, dict_foo.set("bar", 3));
    assert.isNot(dict_foo, dict_foo.remove("foo"));

    assert.is(dict_foo, dict_foo.modify("foo", function () {
      return 1;
    }));

    assert.isNot(dict_foo, dict_foo.modify("foo", function () {
      return 2;
    }));
  });

  test("Dict equal", function () {
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

  test("Dict toJS", function () {
    assert.equal(toJS(dict_empty), {});
    assert.equal(toJS(dict_foo), { foo: 1 });
    assert.equal(toJS(Dict({ foo: Dict({ bar: 2 }) })),
                 { foo: { bar: 2 } });
  });

  test("Dict random keys", function () {
    var o = Dict();
    verify_key(o);

    random_list(200).forEach(function (key) {
      o = o.set(key, 5);
      verify_key(o);
    });

    random_list(200).forEach(function (key) {
      o = o.modify(key, function (x) {
        return x + 15;
      });
      verify_key(o);
    });

    random_list(200).forEach(function (key) {
      o = o.remove(key);
      verify_key(o);
    });
  });

  /*shuffle(a).forEach(function (s) {
    x = x.set(s, 1);
    verify(x);
  });

  shuffle(a).forEach(function (s) {
    x = x.remove(s);
    verify(x);
  });*/
}
