/**
  @nodoc
*/

var assert = require("sjs:assert");

__js {
  function defaultSort(x, y) {
    if (x === y) {
      return 0;
    } else if (x < y) {
      return -1;
    } else {
      return 1;
    }
  }

  function depth(x) {
    if (x === null) {
      return 0;
    } else {
      return x.depth;
    }
  }

  function size(x) {
    if (x === null) {
      return 0;
    } else {
      return x.size;
    }
  }

  function max(x, y) {
    if (x > y) {
      return x;
    } else {
      return y;
    }
  }


  function KeyNode(left, right, info) {
    this.left  = left;
    this.right = right;
    this.key   = info.key;
    this.value = info.value;
    this.depth = max(depth(left), depth(right)) + 1;
  }

  function SetNode(left, right, info) {
    this.left  = left;
    this.right = right;
    this.key   = info.key;
    this.depth = max(depth(left), depth(right)) + 1;
  }

  function ListNode(left, right, info) {
    this.left  = left;
    this.right = right;
    this.value = info.value;
    this.size  = size(left) + size(right) + 1;
    this.depth = max(depth(left), depth(right)) + 1;
  }


  function KeyNodeEqual(node, info) {
    return info.key === node.key && info.value === node.value;
  }

  function SetNodeEqual(node, info) {
    return info.key === node.key;
  }

  function ListNodeEqual(node, info) {
    return info.value === node.value;
  }


  /*function rotate_left(from, left, right, node) {
    return new from(new from(left, right.left, node), right.right, right);
  }

  function rotate_right(from, left, right, node) {
    return new from(left.left, new from(left.right, right, node), left);
  }*/

  function balanced_node(from, left, right, node) {
    var l_depth = depth(left);
    var r_depth = depth(right);

    // Left side is deeper
    if (l_depth > r_depth + 1) {
      var lleft  = left.left;
      var lright = left.right;

      // Right side is deeper
      if (depth(lright) > depth(lleft)) {
        // Left rotate -> Right rotate
        return new from(new from(lleft, lright.left, left),
                        new from(lright.right, right, node),
                        lright);

      // Left side is deeper
      } else {
        // Right rotate
        return new from(lleft,
                        new from(lright, right, node),
                        left);
      }

    // Right side is deeper
    } else if (r_depth > l_depth + 1) {
      var rright = right.right;
      var rleft  = right.left;

      // Left side is deeper
      if (depth(rleft) > depth(rright)) {
        // Right rotate -> Left rotate
        return new from(new from(left, rleft.left, node),
                        new from(rleft.right, rright, right),
                        rleft);


      // Right side is deeper
      } else {
        // Left rotate
        return new from(new from(left, rleft, node),
                        rright,
                        right);
      }

    // No balancing needed
    } else {
      return new from(left, right, node);
    }
  }

  /*function node_min(from, x) {
    if (x.left === null) {
      return [x, x.right];
    } else {
      var a = node_min(from, x.left);
      return [a[0], balanced_node(from, a[1], x.right, x)];
    }
  }*/

  // Assumes [every key in x] <= [every key in y]
  function concat(from, x, y) {
    /*if (x === null) {
      return y;
    } else if (y === null) {
      return x;
    } else {
      var a = node_min(from, y);
      return balanced_node(from, x, a[1], a[0]);
    }*/

    if (x === null) {
      return y;
    } else if (y === null) {
      return x;
    } else if (depth(x) < depth(y)) {
      var left = concat(from, x, y.left);
      assert.isNot(left, y.left);
      return balanced_node(from, left, y.right, y);
    } else {
      var right = concat(from, x.right, y);
      assert.isNot(right, x.right);
      return balanced_node(from, x.left, right, x);
    }
  }

  function each(node, f) {
    if (node !== null) {
      each(node.left, f);
      f(node);
      each(node.right, f);
    }
  }


  function key_get(node, sort, key) {
    while (node !== null) {
      var order = sort(key, node.key);
      if (order === 0) {
        break;
      } else if (order < 1) {
        node = node.left;
      } else {
        node = node.right;
      }
    }

    return node;
  }

  function key_set(from, equal, node, sort, info) {
    if (node === null) {
      return new from(null, null, info);

    } else {
      var order = sort(info.key, node.key);
      if (order === 0) {
        if (equal(node, info)) {
          return node;
        } else {
          return new from(node.left, node.right, info);
        }

      } else if (order < 0) {
        var left = key_set(from, equal, node.left, sort, info);
        if (left === node.left) {
          return node;
        } else {
          return balanced_node(from, left, node.right, node);
        }

      } else {
        var right = key_set(from, equal, node.right, sort, info);
        if (right === node.right) {
          return node;
        } else {
          return balanced_node(from, node.left, right, node);
        }
      }
    }
  }

  function key_remove(from, node, sort, key) {
    if (node === null) {
      return node;

    } else {
      var order = sort(key, node.key);
      if (order === 0) {
        return concat(from, node.left, node.right);

      } else if (order < 0) {
        var left = key_remove(from, node.left, sort, key);
        if (left === node.left) {
          return node;
        } else {
          return balanced_node(from, left, node.right, node);
        }

      } else {
        var right = key_remove(from, node.right, sort, key);
        if (right === node.right) {
          return node;
        } else {
          return balanced_node(from, node.left, right, node);
        }
      }
    }
  }

  // TODO code duplication with key_set
  function key_modify(from, equal, node, sort, key, f) {
    if (node === null) {
      return node;

    } else {
      var order = sort(key, node.key);
      if (order === 0) {
        // TODO a bit gross
        var info = {
          key:   key,
          value: f(node.value) // TODO what if `f` suspends?
        };

        if (equal(node, info)) {
          return node;
        } else {
          return new from(node.left, node.right, info);
        }

      } else if (order < 0) {
        var left = key_modify(from, equal, node.left, sort, key, f);
        if (left === node.left) {
          return node;
        } else {
          return balanced_node(from, left, node.right, node);
        }

      } else {
        var right = key_modify(from, equal, node.right, sort, key, f);
        if (right === node.right) {
          return node;
        } else {
          return balanced_node(from, node.left, right, node);
        }
      }
    }
  }


  function nth_has(index, len) {
    return index >= 0 && index < len;
  }

  function nth_get(node, index) {
    while (node !== null) {
      var left = node.left;

      var l_index = size(left);

      if (index === l_index) {
        break;

      } else if (index < l_index) {
        node = left;

      } else {
        node  = node.right;
        index = index - (l_index + 1);
      }
    }

    return node;
  }

  function nth_insert(from, node, index, info) {
    if (node === null) {
      return new from(null, null, info);

    } else {
      var l_index = size(node.left);

      if (index <= l_index) {
        var left = nth_insert(from, node.left, index, info);
        return balanced_node(from, left, node.right, node);

      } else {
        var right = nth_insert(from, node.right, index - (l_index + 1), info);
        return balanced_node(from, node.left, right, node);
      }
    }
  }

  function nth_remove(from, node, index) {
    var l_index = size(node.left);

    if (index === l_index) {
      return concat(from, node.left, node.right);

    } else if (index < l_index) {
      var left = nth_remove(from, node.left, index);
      return balanced_node(from, left, node.right, node);

    } else {
      var right = nth_remove(from, node.right, index - (l_index + 1));
      return balanced_node(from, node.left, right, node);
    }
  }

  // TODO code duplication
  function nth_modify(from, node, index, f) {
    if (node === null) {
      return node;

    } else {
      var l_index = size(node.left);

      if (index === l_index) {
        var value = f(node.value);
        // TODO ListNodeEqual
        if (node.value === value) {
          return node;
        } else {
          // TODO a little gross
          return new from(node.left, node.right, { value: value });
        }

      } else if (index < l_index) {
        var left = nth_modify(from, node.left, index, f);
        if (left === node.left) {
          return node;
        } else {
          return balanced_node(from, left, node.right, node);
        }

      } else {
        var right = nth_modify(from, node.right, index - (l_index + 1), f);
        if (right === node.right) {
          return node;
        } else {
          return balanced_node(from, node.left, right, node);
        }
      }
    }
  }



  function ImmutableDict(root, sort) {
    this.root = root;
    this.sort = sort;
  }

  ImmutableDict.prototype.isEmpty = function () {
    return this.root === null;
  };

  ImmutableDict.prototype.has = function (key) {
    return key_get(this.root, this.sort, key) !== null;
  };

  ImmutableDict.prototype.get = function (key, def) {
    var node = key_get(this.root, this.sort, key);
    if (node === null) {
      if (arguments.length === 2) {
        return def;
      } else {
        throw new Error("Key #{key} not found");
      }
    } else {
      return node.value;
    }
  };

  // TODO code duplication
  ImmutableDict.prototype.set = function (key, value) {
    var node = key_set(KeyNode, KeyNodeEqual, this.root, this.sort, { key: key, value: value });
    if (node === this.root) {
      return this;
    } else {
      return new ImmutableDict(node, this.sort);
    }
  };

  // TODO code duplication
  ImmutableDict.prototype.remove = function (key) {
    var node = key_remove(KeyNode, this.root, this.sort, key);
    if (node === this.root) {
      return this;
    } else {
      return new ImmutableDict(node, this.sort);
    }
  };

  // TODO code duplication
  ImmutableDict.prototype.modify = function (key, f) {
    var node = key_modify(KeyNode, KeyNodeEqual, this.root, this.sort, key, f);
    if (node === this.root) {
      return this;
    } else {
      return new ImmutableDict(node, this.sort);
    }
  };

  ImmutableDict.prototype.toJS = function () {
    var o = {};

    each(this.root, function (node) {
      // TODO use @isString test
      assert.is(typeof node.key, "string");
      o[node.key] = node.value;
    });

    return o;
  };



  function ImmutableSet(root, sort) {
    this.root = root;
    this.sort = sort;
  }

  ImmutableSet.prototype.isEmpty = ImmutableDict.prototype.isEmpty;

  ImmutableSet.prototype.has = ImmutableDict.prototype.has;

  ImmutableSet.prototype.add = function (key) {
    var node = key_set(SetNode, SetNodeEqual, this.root, this.sort, { key: key });
    if (node === this.root) {
      return this;
    } else {
      return new ImmutableSet(node, this.sort);
    }
  };

  ImmutableSet.prototype.remove = function (key) {
    var node = key_remove(SetNode, this.root, this.sort, key);
    if (node === this.root) {
      return this;
    } else {
      return new ImmutableSet(node, this.sort);
    }
  };

  ImmutableSet.prototype.toJS = function () {
    var a = [];

    each(this.root, function (node) {
      a.push(node.key);
    });

    return a;
  };



  function ImmutableList(root) {
    this.root = root;
  }

  ImmutableList.prototype.isEmpty = ImmutableDict.prototype.isEmpty;

  ImmutableList.prototype.size = function () {
    return size(this.root);
  };

  ImmutableList.prototype.has = function (index) {
    var len = size(this.root);

    if (index < 0) {
      index += len;
    }

    return nth_has(index, len);
  };

  ImmutableList.prototype.nth = function (index, def) {
    var len = size(this.root);

    if (index < 0) {
      index += len;
    }

    if (nth_has(index, len)) {
      return nth_get(this.root, index).value;
    } else if (arguments.length === 2) {
      return def;
    } else {
      throw new Error("Index is not valid");
    }
  };

  ImmutableList.prototype.push = function (value, index) {
    if (arguments.length === 1) {
      index = -1;
    }

    var len = size(this.root);

    if (index < 0) {
      index += (len + 1);
    }

    // TODO code duplication with nth_has
    if (index >= 0 && index <= len) {
      return new ImmutableList(nth_insert(ListNode, this.root, index, { value: value }));
    } else {
      throw new Error("Index is not valid");
    }
  };

  ImmutableList.prototype.pop = function (index) {
    if (arguments.length === 0) {
      index = -1;
    }

    var len = size(this.root);

    if (index < 0) {
      index += len;
    }

    if (nth_has(index, len)) {
      return new ImmutableList(nth_remove(ListNode, this.root, index));
    } else {
      throw new Error("Index is not valid");
    }
  };

  ImmutableList.prototype.modify = function (index, f) {
    var len = size(this.root);

    if (index < 0) {
      index += len;
    }

    if (nth_has(index, len)) {
      var node = nth_modify(ListNode, this.root, index, f);
      if (node === this.root) {
        return this;
      } else {
        return new ImmutableList(node);
      }
    } else {
      throw new Error("Index is not valid");
    }
  };

  ImmutableList.prototype.concat = function (other) {
    var node = concat(ListNode, this.root, other.root);
    // TODO test this
    if (node === this.root) {
      return this;
    } else {
      return new ImmutableList(node);
    }
  };

  ImmutableList.prototype.toJS = function () {
    var a = [];

    each(this.root, function (node) {
      a.push(node.value);
    });

    return a;
  };


  function verify(tree) {
    function loop(node, tests) {
      if (node !== null) {
        var left  = node.left;
        var right = node.right;

        assert.is(depth(node), max(depth(left), depth(right)) + 1);

        var diff = depth(left) - depth(right);
        assert.ok(diff === -1 || diff === 0 || diff === 1);

        tests.forEach(function (test) {
          test(node);
        });

        if (node instanceof ListNode) {
          assert.is(size(node), size(left) + size(right) + 1);
          loop(left, tests);
          loop(right, tests);

        } else {
          // Every left node must be lower than the parent node
          loop(left,  tests.concat([function (x) { assert.ok(x.key < node.key); }]));

          // Every right node must be greater than the parent node
          loop(right, tests.concat([function (x) { assert.ok(x.key > node.key); }]));
        }
      }
    }
    loop(tree.root, []);

    return tree;
  }


  exports.SortedDict = function (sort) {
    return new ImmutableDict(null, sort);
  };

  exports.Dict = function () {
    return new ImmutableDict(null, defaultSort);
  };

  exports.SortedSet = function (sort) {
    return new ImmutableSet(null, sort);
  };

  exports.Set = function () {
    return new ImmutableSet(null, defaultSort);
  };

  exports.List = function () {
    return new ImmutableList(null);
  };
}


/*;(function () {
  var x = exports.Dict();

  //x = x.set("foo", 5);
  //assert.ok(x === x.set("foo", 5));
  //assert.ok(x !== x.set("foo", 6));
  //assert.ok(x !== x.set("bar", 5));

  //assert.ok(x === x.remove("foo"));

  var a = [];
  var i = 0;
  while (i < 1000) {
    a.push("foo" + i);
    ++i;
  }

  function down(array, f) {
    var i = array.length;
    while (i--) {
      f(array[i], array.length - 1 - i);
    }
  }

  function up(array, f) {
    for (var i = 0; i < array.length; ++i) {
      f(array[i], i);
    }
  }

  function rand(array, f) {
    var a = array.slice();
    while (a.length) {
      var i = Math.floor(Math.random() * a.length);
      f(a[i], array.length - a.length);
      a.splice(i, 1);
    }
  }

  verify(x);

  rand(a, function (s) {
    x = x.set(s, 1);
    verify(x);
  });

  rand(a, function (s, i) {
    x = x.remove(s);
    verify(x);
  });
})();


;(function () {
  var x = exports.List();

  //x = x.set("foo", 5);
  //assert.ok(x === x.set("foo", 5));
  //assert.ok(x !== x.set("foo", 6));
  //assert.ok(x !== x.set("bar", 5));

  //assert.ok(x === x.remove("foo"));

  verify(x);

  var a = [];
  var i = 0;
  while (i < 1000) {
    a.push(i);
    ++i;
  }


  function check(array, x) {
    var i = 0;
    each(x.root, function (node) {
      assert.is(node.value, array[i]);
      ++i;
    });

    var tojs = x.toJS();
    assert.is(tojs.length, array.length);
    array.forEach(function (x, i) {
      assert.is(tojs[i], x);
    });
  }


  var array = [];

  a.forEach(function (s) {
    var index = Math.floor(Math.random() * array.length);
    array.splice(index, 0, s);
    x = x.push(s, index);
    verify(x);
    check(array, x);
  });

  while (array.length) {
    var index = Math.floor(Math.random() * array.length);
    array.splice(index, 1);
    x = x.pop(index);
    verify(x);
    check(array, x);
  }


  var x = x.push(10).push(20).push(30).push(40).push(50)
                        .push(60).push(70).push(80).push(90).push(100);
  var y = exports.List().push(5);

  console.log(verify(x.concat(x)).toJS());
  console.log(verify(x.concat(y)).toJS());
})();

throw 42;*/
