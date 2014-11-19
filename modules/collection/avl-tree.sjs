/**
  @nodoc
*/

// TODO should these use sjs: or ../
var assert   = require("sjs:assert");
var sequence = require("sjs:sequence");

// http://arclanguage.org/item?id=14181
// http://arclanguage.org/item?id=18936
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

  // Faster than using Math.max
  function max(x, y) {
    if (x > y) {
      return x;
    } else {
      return y;
    }
  }


  var nil     = {};
  nil.depth   = 0;
  nil.size    = 0;
  nil.forEach = function (f) {};


  function balanced_node(node, left, right) {
    var l_depth = left.depth;
    var r_depth = right.depth;

    // Left side is deeper
    if (l_depth > r_depth + 1) {
      var lleft  = left.left;
      var lright = left.right;

      // Right side is deeper
      if (lright.depth > lleft.depth) {
        // Left rotate -> Right rotate
        return lright.copy(left.copy(lleft, lright.left),
                           node.copy(lright.right, right));

      // Left side is deeper
      } else {
        // Right rotate
        return left.copy(lleft, node.copy(lright, right));
      }

    // Right side is deeper
    } else if (r_depth > l_depth + 1) {
      var rright = right.right;
      var rleft  = right.left;

      // Left side is deeper
      if (rleft.depth > rright.depth) {
        // Right rotate -> Left rotate
        return rleft.copy(node.copy(left, rleft.left),
                          right.copy(rleft.right, rright));


      // Right side is deeper
      } else {
        // Left rotate
        return right.copy(node.copy(left, rleft), rright);
      }

    // No balancing needed
    } else {
      return node.copy(left, right);
    }
  }

  function concat(x, y) {
    if (x === nil) {
      return y;

    } else if (y === nil) {
      return x;

    // TODO what if the depths are the same?
    } else if (x.depth < y.depth) {
      var left = concat(x, y.left);
      //assert.isNot(left, y.left); // TODO get rid of this?
      return balanced_node(y, left, y.right);

    } else {
      var right = concat(x.right, y);
      //assert.isNot(right, x.right); // TODO get rid of this?
      return balanced_node(x, x.left, right);
    }
  }

  function insert_min(node, new_node) {
    if (node === nil) {
      return new_node;
    } else {
      // TODO do we need to use balanced_node ?
      return balanced_node(node, insert_min(node.left, new_node), node.right);
    }
  }

  function insert_max(node, new_node) {
    if (node === nil) {
      return new_node;
    } else {
      // TODO do we need to use balanced_node ?
      return balanced_node(node, node.left, insert_max(node.right, new_node));
    }
  }


  // It's faster to use arrays for small lists
  var array_limit = 125;

  var ceiling = Math.ceil;

  function array_insert_at(array, index, value) {
    var len = array.length + 1;

    var out = new Array(len);

    var i = 0;
    while (i < index) {
      out[i] = array[i];
      ++i;
    }

    out[i] = value;
    ++i;

    while (i < len) {
      out[i] = array[i - 1];
      ++i;
    }

    return out;
  }

  function array_modify_at(array, index, f) {
    var old_value = array[index];
    var new_value = f(old_value);

    if (old_value === new_value) {
      return array;

    } else {
      var new_array = array.slice();
      new_array[index] = new_value;
      return new_array;
    }
  }

  function array_remove_at(array, index) {
    var len = array.length - 1;

    var out = new Array(len);

    var i = 0;
    while (i < index) {
      out[i] = array[i];
      ++i;
    }

    while (i < len) {
      out[i] = array[i + 1];
      ++i;
    }

    return out;
  }

  function ArrayNode(left, right, array) {
    this.left  = left;
    this.right = right;
    this.array = array;
    this.size  = left.size + right.size + array.length;
    this.depth = max(left.depth, right.depth) + 1;
  }

  ArrayNode.prototype.copy = function (left, right) {
    return new ArrayNode(left, right, this.array);
  };

  ArrayNode.prototype.forEach = function (f) {
    this.left.forEach(f);
    this.array.forEach(function (x) {
      f(x);
    });
    this.right.forEach(f);
  };

  function nth_has(index, len) {
    return index >= 0 && index < len;
  }

  function nth_get(node, index) {
    do {
      var left    = node.left;
      var l_index = left.size;

      if (index < l_index) {
        node = left;

      } else {
        index -= l_index;

        var array = node.array;
        var len   = array.length;
        if (index < len) {
          return array[index];

        } else {
          index -= len;
          node  = node.right;
        }
      }
    } while (true);
  }

  function nth_insert(node, index, value) {
    // TODO is this necessary ?
    if (node === nil) {
      return new ArrayNode(nil, nil, [value]);

    } else {
      var left    = node.left;
      var right   = node.right;
      var l_index = left.size;

      if (index < l_index) {
        var child = nth_insert(left, index, value);
        return balanced_node(node, child, right);

      } else {
        index -= l_index;

        var array = node.array;
        var len   = array.length;
        // TODO test this
        if (index <= len) {
          array = array_insert_at(array, index, value);

          if (len === array_limit) {
            var pivot  = ceiling(array.length / 2);
            var aleft  = array.slice(0, pivot);
            var aright = array.slice(pivot);

            console.log(aleft, aright);

            if (left.depth < right.depth) {
              return new ArrayNode(insert_max(left, new ArrayNode(nil, nil, aleft)), right, aright);
            } else {
              return new ArrayNode(left, insert_min(right, new ArrayNode(nil, nil, aright)), aleft);
            }

          } else {
            return new ArrayNode(left, right, array);
          }

        } else {
          var child = nth_insert(right, index - len, value);
          return balanced_node(node, left, child);
        }
      }
    }
  }

  function nth_modify(node, index, f) {
    var left    = node.left;
    var right   = node.right;
    var l_index = left.size;

    if (index < l_index) {
      var child = nth_modify(left, index, f);
      if (child === left) {
        return node;
      } else {
        return node.copy(child, right); // TODO test this
      }

    } else {
      index -= l_index;

      var array = node.array;
      var len   = array.length;
      // TODO test this
      if (index < len) {
        var new_array = array_modify_at(array, index, f);
        if (new_array === array) {
          return node;
        } else {
          return new ArrayNode(left, right, new_array);
        }

      } else {
        var child = nth_modify(right, index - len, f);
        if (child === right) {
          return node;
        } else {
          return node.copy(left, child); // TODO test this
        }
      }
    }
  }

  function nth_remove(node, index) {
    var left    = node.left;
    var right   = node.right;
    var l_index = left.size;

    if (index < l_index) {
      var child = nth_remove(left, index);
      return balanced_node(node, child, right);

    } else {
      index -= l_index;

      var array = node.array;
      var len   = array.length;
      // TODO test this
      if (index < len) {
        array = array_remove_at(array, index);

        if (array.length === 0) {
          return concat(left, right);
        } else {
          return new ArrayNode(left, right, array);
        }

      } else {
        var child = nth_remove(right, index - len);
        return balanced_node(node, left, child);
      }
    }
  }


  function SetNode(left, right, key) {
    this.left  = left;
    this.right = right;
    this.key   = key;
    this.depth = max(left.depth, right.depth) + 1;
  }

  SetNode.prototype.copy = function (left, right) {
    return new SetNode(left, right, this.key);
  };

  SetNode.prototype.modify = function (info) {
    var key = info.key;
    if (this.key === key) {
      return this;
    } else {
      return new SetNode(this.left, this.right, key);
    }
  };

  SetNode.prototype.forEach = function (f) {
    this.left.forEach(f);
    f(this.key);
    this.right.forEach(f);
  };


  function KeyNode(left, right, key, value) {
    this.left  = left;
    this.right = right;
    this.key   = key;
    this.value = value;
    this.depth = max(left.depth, right.depth) + 1;
  }

  KeyNode.prototype.copy = function (left, right) {
    return new KeyNode(left, right, this.key, this.value);
  };

  KeyNode.prototype.modify = function (info) {
    var key   = info.key;
    var value = info.value;
    if (this.key === key && this.value === value) {
      return this;
    } else {
      return new KeyNode(this.left, this.right, key, value);
    }
  };

  KeyNode.prototype.forEach = function (f) {
    this.left.forEach(f);
    f(this.value, this.key);
    this.right.forEach(f);
  };


  function key_get(node, sort, key) {
    while (node !== nil) {
      var order = sort(key, node.key);
      if (order === 0) {
        break;

      } else if (order < 0) {
        node = node.left;

      } else {
        node = node.right;
      }
    }

    return node;
  }

  function key_set(node, sort, key, new_node) {
    if (node === nil) {
      return new_node;

    } else {
      var left  = node.left;
      var right = node.right;

      var order = sort(key, node.key);
      if (order === 0) {
        return node.modify(new_node);

      } else if (order < 0) {
        var child = key_set(left, sort, key, new_node);
        if (child === left) {
          return node;
        } else {
          return balanced_node(node, child, right);
        }

      } else {
        var child = key_set(right, sort, key, new_node);
        if (child === right) {
          return node;
        } else {
          return balanced_node(node, left, child);
        }
      }
    }
  }

  // TODO code duplication with key_set
  function key_modify(node, sort, key, f) {
    if (node === nil) {
      return node;

    } else {
      var left  = node.left;
      var right = node.right;

      var order = sort(key, node.key);
      if (order === 0) {
        // TODO what if `f` suspends?
        return node.modify({ key: key, value: f(node.value) });

      } else if (order < 0) {
        var child = key_modify(left, sort, key, f);
        if (child === left) {
          return node;
        } else {
          return balanced_node(node, child, right);
        }

      } else {
        var child = key_modify(right, sort, key, f);
        if (child === right) {
          return node;
        } else {
          return balanced_node(node, left, child);
        }
      }
    }
  }

  function key_remove(node, sort, key) {
    if (node === nil) {
      return node;

    } else {
      var left  = node.left;
      var right = node.right;

      var order = sort(key, node.key);
      if (order === 0) {
        return concat(left, right);

      } else if (order < 0) {
        var child = key_remove(left, sort, key);
        if (child === left) {
          return node;
        } else {
          return balanced_node(node, child, right);
        }

      } else {
        var child = key_remove(right, sort, key);
        if (child === right) {
          return node;
        } else {
          return balanced_node(node, left, child);
        }
      }
    }
  }



  function ImmutableDict(root, sort) {
    this.root = root;
    this.sort = sort;
  }

  // TODO is this a good idea ?
  ImmutableDict.prototype = Object.create(null);

  ImmutableDict.prototype.toString = function () {
    var a = [];

    this.root.forEach(function (value, key) {
      a.push(key + " = " + value);
    });

    if (a.length) {
      return "Dict[ " + a.join(", ") + " ]";
    } else {
      return "Dict[]";
    }
  };

  ImmutableDict.prototype.isEmpty = function () {
    return this.root === nil;
  };

  ImmutableDict.prototype.has = function (key) {
    return key_get(this.root, this.sort, key) !== nil;
  };

  ImmutableDict.prototype.get = function (key, def) {
    var node = key_get(this.root, this.sort, key);
    if (node === nil) {
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
    var root = this.root;
    var sort = this.sort;
    var node = key_set(root, sort, key, new KeyNode(nil, nil, key, value));
    if (node === root) {
      return this;
    } else {
      return new ImmutableDict(node, sort);
    }
  };

  // TODO code duplication
  ImmutableDict.prototype.remove = function (key) {
    var root = this.root;
    var sort = this.sort;
    var node = key_remove(root, sort, key);
    if (node === root) {
      return this;
    } else {
      return new ImmutableDict(node, sort);
    }
  };

  // TODO code duplication
  ImmutableDict.prototype.modify = function (key, f) {
    var root = this.root;
    var sort = this.sort;
    var node = key_modify(root, sort, key, f);
    if (node === root) {
      return this;
    } else {
      return new ImmutableDict(node, sort);
    }
  };

  ImmutableDict.prototype.toJS = function () {
    var o = {};

    this.root.forEach(function (value, key) {
      // TODO use @isString test
      assert.is(typeof key, "string");
      o[key] = value;
    });

    return o;
  };



  function ImmutableSet(root, sort) {
    this.root = root;
    this.sort = sort;
  }

  // TODO is this a good idea ?
  ImmutableSet.prototype = Object.create(null);

  ImmutableSet.prototype.isEmpty = ImmutableDict.prototype.isEmpty;

  ImmutableSet.prototype.has = ImmutableDict.prototype.has;

  ImmutableSet.prototype.toString = function () {
    var a = [];

    this.root.forEach(function (value) {
      a.push("" + value);
    });

    if (a.length) {
      return "Set[ " + a.join(" ") + " ]";
    } else {
      return "Set[]";
    }
  };

  ImmutableSet.prototype.add = function (key) {
    var root = this.root;
    var sort = this.sort;
    var node = key_set(root, sort, key, new SetNode(nil, nil, key));
    if (node === root) {
      return this;
    } else {
      return new ImmutableSet(node, sort);
    }
  };

  ImmutableSet.prototype.remove = function (key) {
    var root = this.root;
    var sort = this.sort;
    var node = key_remove(root, sort, key);
    if (node === root) {
      return this;
    } else {
      return new ImmutableSet(node, sort);
    }
  };

  ImmutableSet.prototype.toJS = function () {
    var a = [];

    this.root.forEach(function (value) {
      a.push(value);
    });

    return a;
  };



  /*
  // TODO replace with interface
  ImmutableList.prototype.is = function (y) {
    if (y instanceof ImmutableList) {
      if (size(x.root) === size(y.root)) {
        // TODO @zip is okay in here, but it won't work for the Dicts or Sets
        return @zip(x, y) ..@all(function ([x, y]) {
          // TODO replace with @is
          return x === y;
        });
      } else {
        return false;
      }
    } else {
      return false;
    }
  };*/

  function ImmutableList(root) {
    this.root = root;
  }

  // TODO is this a good idea ?
  ImmutableList.prototype = Object.create(null);

  ImmutableList.prototype.toString = function () {
    var a = [];

    this.root.forEach(function (value) {
      a.push("" + value);
    });

    if (a.length) {
      return "List[ " + a.join(" ") + " ]";
    } else {
      return "List[]";
    }
  };

  ImmutableList.prototype.isEmpty = ImmutableDict.prototype.isEmpty;

  ImmutableList.prototype.size = function () {
    return this.root.size;
  };

  ImmutableList.prototype.has = function (index) {
    var len = this.size();

    if (index < 0) {
      index += len;
    }

    return nth_has(index, len);
  };

  ImmutableList.prototype.nth = function (index, def) {
    var len = this.size();

    if (index < 0) {
      index += len;
    }

    if (nth_has(index, len)) {
      return nth_get(this.root, index);
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

    var len = this.size();

    if (index < 0) {
      index += (len + 1);
    }

    // TODO code duplication with nth_has
    if (index >= 0 && index <= len) {
      return new ImmutableList(nth_insert(this.root, index, value));
    } else {
      throw new Error("Index is not valid");
    }
  };

  ImmutableList.prototype.pop = function (index) {
    if (arguments.length === 0) {
      index = -1;
    }

    var len = this.size();

    if (index < 0) {
      index += len;
    }

    if (nth_has(index, len)) {
      return new ImmutableList(nth_remove(this.root, index));
    } else {
      throw new Error("Index is not valid");
    }
  };

  ImmutableList.prototype.modify = function (index, f) {
    var len = this.size();

    if (index < 0) {
      index += len;
    }

    if (nth_has(index, len)) {
      var root = this.root;
      var node = nth_modify(root, index, f);
      if (node === root) {
        return this;
      } else {
        return new ImmutableList(node);
      }

    } else {
      throw new Error("Index is not valid");
    }
  };

  ImmutableList.prototype.concat = function (right) {
    var root = this.root;
    var node = concat(root, right.root);
    if (node === root) {
      return this;
    } else {
      return new ImmutableList(node);
    }
  };

  ImmutableList.prototype.toJS = ImmutableSet.prototype.toJS;


  exports.SortedDict = function (sort) {
    return new ImmutableDict(nil, sort);
  };

  exports.Dict = function (obj) {
    var o = new ImmutableDict(nil, defaultSort);
    if (arguments.length === 1) {
      // TODO
      obj ..@items ..@each(function ([key, value]) {
        o = o.set(key, value);
      });
    }
    return o;
  };

  exports.SortedSet = function (sort) {
    return new ImmutableSet(nil, sort);
  };

  exports.Set = function () {
    return new ImmutableSet(nil, defaultSort);
  };

  exports.List = function (array) {
    var o = new ImmutableList(nil);
    if (arguments.length === 1) {
      array ..sequence.each(function (x) {
        o = o.push(x);
      });
    }
    return o;
  };
}


/*__js {
  ;(function () {
    // TODO test that this works correctly
    function verify(tree) {
      function loop(node, lt, gt) {
        if (node !== null) {
          var left  = node.left;
          var right = node.right;

          assert.is(node.depth, max(left.depth, right.depth) + 1);

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

          if (node instanceof ListNode) {
            assert.is(node.size, left.size + right.size + 1);
            loop(left,  lt, gt);
            loop(right, lt, gt);

          } else {
            loop(left,  lt.concat([node]), gt);
            loop(right, lt, gt.concat([node]));
          }
        }
      }
      loop(tree.root, [], []);

      return tree;
    }

    var a = [];
    var i = 0;
    while (i < 1000) {
      a.push("foo" + i);
      ++i;
    }

    function forEachRev(a, f) {
      var i = array.length;
      while (i--) {
        f(array[i], i);
      }
    }

    function shuffle(array) {
      var out = [];
      for (var i = 0; i < array.length; ++i) {
        out.splice(Math.floor(Math.random() * out.length), 0, array[i]);
      }
      return out;
    }


    ;(function () {
      var x = exports.Dict();

      var y = exports.Dict();
      y = y.set("foo", 5);
      assert.ok(y === y.set("foo", 5));
      assert.ok(y !== y.set("foo", 6));
      assert.ok(y !== y.set("bar", 5));
      assert.ok(x === x.remove("foo"));

      verify(x);

      shuffle(a).forEach(function (s) {
        x = x.set(s, 1);
        verify(x);
      });

      shuffle(a).forEach(function (s) {
        x = x.remove(s);
        verify(x);
      });
    })();


    ;(function () {
      var x = exports.List();

      verify(x);

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


      var a2 = shuffle(a);

      var pivot = Math.floor(Math.random() * a2.length);
      var xa = a2.slice(0, pivot);
      var ya = a2.slice(pivot);

      var x = exports.List();
      var y = exports.List();

      xa.forEach(function (s) {
        var index = Math.floor(Math.random() * x.size());
        x = x.push(s, index);
        verify(x);
      });

      ya.forEach(function (s) {
        var index = Math.floor(Math.random() * y.size());
        y = y.push(s, index);
        verify(y);
      });

      verify(x.concat(y));

      verify(exports.List().concat(exports.List()));
    })();
  })();
}*/
