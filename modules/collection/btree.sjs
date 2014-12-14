/*
 * StratifiedJS 'collection/btree' module
 * Functions for creating various tree data structures
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.20.0-development'
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2013 Oni Labs, http://onilabs.com
 *
 * This file is licensed under the terms of the MIT License:
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */
/**
   @nodoc
   @module    collection/btree
   @summary   Functions for creating and manipulating B-trees
   @home      sjs:collection/btree
*/

var dictionary = require('./dictionary');
var sequence   = require('../sequence');
var string     = require('../string');

/**
   @class BTree
   @summary
     A data structure that has a *root* node which may have multiple *child* nodes.
     Each child node can then have more child nodes, until eventually you reach the
     *leaf* nodes, which do not have children.

   @desc
     You can use them for a wide variety of different things, including (but not
     limited to) lists, dictionaries, queues, stacks, and heaps.
*/

__js {
  var empty = {};

  var floor = Math.floor;

  // Created using http://www.generateuuid.com/
  var hash_uuid = '__symbol_hash_7167F200-A399-422A-A528-516788091F46__';

  var hash_id = 0;

  // TODO module for this
  function isObject(x) {
    return Object(x) === x;
  }

  var undef = void 0;

  function isNaN(x) {
    return x !== x;
  }

  // TODO replace with Object.is
  // TODO module for this
  // http://wiki.ecmascript.org/doku.php?id=harmony:egal
  function is(x, y) {
    if (x === y) {
      // 0 === -0, but they are not identical
      return x !== 0 || 1 / x === 1 / y;
    } else {
      // NaN !== NaN, but they are identical.
      // NaNs are the only non-reflexive value, i.e., if x !== x,
      // then x is a NaN.
      // isNaN is broken: it converts its argument to number, so
      // isNaN("foo") => true
      return isNaN(x) && isNaN(y);
    }
  }

  // TODO module for this
  // null < undefined < false < true < NaN < Number < String/Object
  // Objects are handled by getHash, which returns a string
  // TODO what about ES6 Symbols?
  function lt(x, y) {
    // String is the greatest, but it's put first for performance reasons,
    // because most keys will be strings/objects.
    if (typeof x === "string") {
      if (typeof y === "string") {
        return x < y;
      } else {
        return false;
      }
    } else if (typeof y === "string") {
      return true;

    } else if (x === null) {
      return true;
    } else if (y === null) {
      return false;

    } else if (x === undef) {
      return true;
    } else if (y === undef) {
      return false;

    } else if (x === false) {
      return true;
    } else if (y === false) {
      return false;

    } else if (x === true) {
      return true;
    } else if (y === true) {
      return false;

    } else if (isNaN(x)) {
      return true;
    } else if (isNaN(y)) {
      return false;

    } else if (typeof x === "number") {
      if (typeof y === "number") {
        return x < y;
      } else {
        return true;
      }
    } else if (typeof y === "number") {
      return false;

    } else {
      throw new Error("cannot lt " + x + " and " + y);
    }
  }

  function getHash(x) {
    if (isObject(x)) {
      var id = x[hash_uuid];

      if (id == null) {
        id = hash_uuid + (++hash_id);

        // TODO throw an error if `x` is not extensible
        Object.defineProperty(x, hash_uuid, {
          enumerable: false,
          configurable: false,
          writable: false,
          value: id
        });
      }

      return id;
    } else {
      return x;
    }
  }

  function defaultSort(x, y) {
    x = getHash(x);
    y = getHash(y);
    if (is(x, y)) {
      return 0
    } else if (lt(x, y)) {
      return -1
    } else {
      return 1
    }
  }
  exports.defaultSort = defaultSort;


  function push_into(to, from) {
    for (var i = 0, len = from.length; i < len; ++i) {
      to.push(from[i]);
    }
  }

  // TODO code duplication with sjs:collection/list
  function remove_at(array, index) {
    // Optimization to make it go a lot faster
    // http://jsperf.com/array-push-splice-unshift
    if (index === 0) {
      array.shift();
    } else if (index === array.length - 1) {
      array.pop();
    } else {
      array.splice(index, 1);
    }
  }

  // TODO code duplication with sjs:collection/list
  function add_at(array, index, value) {
    // Optimization to make it go a lot faster
    // http://jsperf.com/array-push-splice-unshift
    if (index === array.length) {
      array.push(value);
    } else {
      array.splice(index, 0, value);
    }
  }

  function get_at(node, records, index) {
    if (index < records.length) {
      return records[index].child;
    } else {
      return node.last;
    }
  }

  function rebalance_set(btree, parents, node) {
    var max_elements = btree.max_elements;

    while (node.records.length > max_elements) {
      var pivot = node.split();
      if (parents.length) {
        var parent      = parents.pop();
        var parent_node = parent.node;

        add_at(parent_node.records, parent.index, pivot);

        node = parent_node;
      } else {
        btree.root = new Node([pivot], node);
        break;
      }
    }
  }

  function rebalance_del(btree, parents, left) {
    var min_elements = btree.min_elements;

    // The root is the only node allowed to have less than min_elements
    while (parents.length !== 0 && left.records.length < min_elements) {
      var parent         = parents.pop();
      var parent_node    = parent.node;
      var parent_index   = parent.index;
      var parent_records = parent_node.records;

      var index, pivot, right;

      // Rotate right
      if (parent_index !== 0) {
        index = parent_index - 1;
        pivot = parent_records[index];
        right = left;
        left  = pivot.child;

        if (left.records.length > min_elements) {
          right.rotateFromLeft(left, pivot);
          return;
        }
      }

      // Rotate left
      if (parent_index !== parent_records.length) {
        index = parent_index;
        pivot = parent_records[index];
        right = get_at(parent_node, parent_records, index + 1);
        left  = pivot.child;

        if (right.records.length > min_elements) {
          left.rotateFromRight(right, pivot);
          return;
        }
      }

      // Merge left and pivot into right
      right.merge(left, pivot);
      remove_at(parent_records, index);

      if (parent_records.length === 0) {
        btree.root = right;
        return;
      } else {
        left = parent_node;
      }
    }
  }


  // Uses constructors for much more speed
  function Path(node, index) {
    this.node  = node;
    this.index = index;
  }

  function Record(key, value) {
    this.key   = key;
    this.value = value;
  }

  Record.prototype.swap = function (other) {
    var key     = this.key;
    var value   = this.value;

    this.key    = other.key;
    this.value  = other.value;

    other.key   = key;
    other.value = value;
  };

  Record.prototype.toString = function () {
    return this.key + ": " + this.value;
  };

  function ChildRecord(key, value, child) {
    this.key   = key;
    this.value = value;
    this.child = child;
  }

  ChildRecord.prototype = Object.create(Record.prototype);


  function Leaf(records) {
    this.records = records;
  }

  Leaf.prototype.toString = function () {
    return "[ " + this.records.join(", ") + " ]";
  };

  Leaf.prototype.split = function () {
    var left   = this.records;
    var index  = floor(left.length / 2);
    var middle = left[index];
    var right  = left.slice(index + 1);

    // Cuts it off just before (and excluding) the middle record
    left.length = index;

    this.records = right;
    var left_node = new Leaf(left);

    return new ChildRecord(middle.key, middle.value, left_node);
  };

  Leaf.prototype.merge = function (left, pivot) {
    var records_left  = left.records;
    var records_right = this.records;

    records_left.push(new Record(pivot.key, pivot.value));

    push_into(records_left, records_right);

    this.records = records_left;
  };

  Leaf.prototype.rotateFromLeft = function (left, pivot) {
    var last = left.records.pop();
    pivot.swap(last);
    this.records.unshift(last);
  };

  Leaf.prototype.rotateFromRight = function (right, pivot) {
    var first = right.records.shift();
    pivot.swap(first);
    this.records.push(first);
  };

  // TODO code duplication
  Leaf.prototype.get = function (key, sort) {
    var records = this.records;

    var left  = 0;
    var right = records.length;

    while (left < right) {
      var pivot  = floor((left + right) / 2);
      var record = records[pivot];
      var order  = sort(key, record.key);
      if (order === 0) {
        return record.value;
      } else if (order < 0) {
        right = pivot;
      } else {
        left = pivot + 1;
      }
    }

    return empty;
  };

  // TODO code duplication
  Leaf.prototype.set = function (btree, parents, key, value, sort) {
    var records = this.records;

    var left  = 0;
    var right = records.length;

    while (left < right) {
      var pivot  = floor((left + right) / 2);
      var record = records[pivot];
      var order  = sort(key, record.key);
      if (order === 0) {
        record.value = value;
        return;
      } else if (order < 0) {
        right = pivot;
      } else {
        left = pivot + 1;
      }
    }

    add_at(records, left, new Record(key, value));
    rebalance_set(btree, parents, this);
  };

  // TODO code duplication
  Leaf.prototype.del = function (btree, parents, key, sort) {
    var records = this.records;

    var left  = 0;
    var right = records.length;

    while (left < right) {
      var pivot  = floor((left + right) / 2);
      var record = records[pivot];
      var order  = sort(key, record.key);
      if (order === 0) {
        remove_at(records, pivot);
        rebalance_del(btree, parents, this);
        return;
      } else if (order < 0) {
        right = pivot;
      } else {
        left = pivot + 1;
      }
    }

    // TODO is this correct ?
    throw new Error("INVALID STATE");
  };


  function Node(records, last) {
    this.records = records;
    this.last    = last;
  }

  Node.prototype = Object.create(Leaf.prototype);

  // TODO verify that this is correct
  Node.prototype.toString = function () {
    var records  = [];
    var children = [];

    sequence.each(this.records, function (x) {
      records.push("" + x);
      children.push("" + x.child);
    });

    records = sequence.map(sequence.zip(records, children), function (a) {
      var record = a[0];
      var child  = a[1];
                                      // TODO a bit hacky
      return string.padRight(record + ",", child.length - 4, " ");
    });

    var last = "" + this.last;
    children.push(last);
    // TODO string.repeat
    records.push(new Array(last.length - 4 + 1).join(" "));

    return "[ " + records.join("     ") + " ]\n" + children.join(" ");
  };

  // Splits into two parts: each part contains half the number of elements.
  // The left part is a new node, the right part is the same node.
  // It's important that it splits to the left, so that we don't need to
  // update a bunch of pointers in the parent node.
  // TODO code duplication with Leaf.prototype.split
  Node.prototype.split = function () {
    var left   = this.records;
    var index  = floor(left.length / 2);
    var middle = left[index];
    var right  = left.slice(index + 1);

    // Cuts it off just before (and excluding) the middle record
    left.length = index;

    this.records = right;
    var left_node = new Node(left, middle.child);

    middle.child = left_node;
    return middle;
  };

  // Takes a left sibling node and the separator node and
  // merges them into a single node.
  // It's important that it merges from the left into the
  // right, that way we don't need to update parent pointers.
  Node.prototype.merge = function (left, node) {
    var records_left  = left.records;
    var records_right = this.records;

    node.child = left.last;
    records_left.push(node);

    push_into(records_left, records_right);

    this.records = records_left;
  };

  Node.prototype.rotateFromLeft = function (left, pivot) {
    var end = left.records.pop();

    var last = left.last;
    left.last  = end.child;
    end.child = last;

    pivot.swap(end);
    this.records.unshift(end);
  };

  Node.prototype.rotateFromRight = function (right, pivot) {
    var first = right.records.shift();

    var last = this.last;
    this.last  = first.child;
    first.child = last;

    pivot.swap(first);
    this.records.push(first);
  };

  // TODO code duplication
  Node.prototype.get = function (key, sort) {
    var records = this.records;

    var left  = 0;
    var right = records.length;

    while (left < right) {
      var pivot  = floor((left + right) / 2);
      var record = records[pivot];
      var order  = sort(key, record.key);
      if (order === 0) {
        return record.value;
      } else if (order < 0) {
        right = pivot;
      } else {
        left = pivot + 1;
      }
    }

    return get_at(this, records, left).get(key, sort);
  };

  // TODO code duplication
  Node.prototype.set = function (btree, parents, key, value, sort) {
    var records = this.records;

    var left  = 0;
    var right = records.length;

    while (left < right) {
      var pivot  = floor((left + right) / 2);
      var record = records[pivot];
      var order  = sort(key, record.key);
      if (order === 0) {
        record.value = value;
        return;
      } else if (order < 0) {
        right = pivot;
      } else {
        left = pivot + 1;
      }
    }

    parents.push(new Path(this, left));

    get_at(this, records, left).set(btree, parents, key, value, sort);
  };

  // TODO code duplication
  Node.prototype.del = function (btree, parents, key, sort) {
    var records = this.records;

    var left  = 0;
    var right = records.length;

    while (left < right) {
      var pivot  = floor((left + right) / 2);
      var record = records[pivot];
      var order  = sort(key, record.key);
      if (order === 0) {
        parents.push(new Path(this, pivot));

        // Get the right-most leaf for this node
        var leaf = record.child;
        while (!(leaf instanceof Leaf)) {
          parents.push(new Path(leaf, leaf.records.length));
          leaf = leaf.last;
        }

        var last = leaf.records.pop();
        record.key   = last.key;
        record.value = last.value;
        rebalance_del(btree, parents, leaf);
        return;
      } else if (order < 0) {
        right = pivot;
      } else {
        left = pivot + 1;
      }
    }

    parents.push(new Path(this, left));

    get_at(this, records, left).del(btree, parents, key, sort);
  };


  function Mutable(sort, min) {
    this.min_elements = min;
    this.max_elements = min * 2;
    this.sort = sort;
    this.root = new Leaf([]);
  }

  Mutable.prototype.toString = function () {
    return "" + this.root;
  };

  // TODO make these inaccessible to the outside
  Mutable.prototype.get = function (key) {
    var node = this.root;
    var sort = this.sort;
    return node.get(key, sort);
  };

  Mutable.prototype.set = function (key, value) {
    var node = this.root;
    var sort = this.sort;
    var parents = [];
    node.set(this, parents, key, value, sort);
  };

  Mutable.prototype.del = function (key) {
    var node = this.root
    var sort = this.sort;
    var parents = [];
    node.del(this, parents, key, sort);
  };

  Mutable.prototype[dictionary.interface_has] = function (btree, key) {
    return btree.get(key) !== empty;
  };

  Mutable.prototype[dictionary.interface_get] = function (btree, key) {
    return btree.get(key);
  };

  Mutable.prototype[dictionary.interface_set] = function (btree, key, value) {
    btree.set(key, value);
  };

  Mutable.prototype[dictionary.interface_del] = function (btree, key) {
    btree.del(key);
  };


  exports.Mutable = function (sort, min) {
    return new Mutable(sort, min);
  };

  exports.toMutable = function (seq, sort, min) {
    var root = new Mutable(sort, min);

    sequence.each(seq, function (a) {
      var key   = a[0];
      var value = a[1];
      root.set(key, value);
    });

    return root;

    /*var array = [];

    sequence.each(seq, function (a) {
      var key   = a[0];
      var value = a[1];
      array.push(new Record(key, value));
    });

    array.sort(function (left, right) {
      return -sort(left.key, right.key);
    });

    var leafs = [];

    while (array.length) {
      var counter = max_elements + 1;
      var leaf    = new Leaf([]);

      leafs.push(leaf);

      while (array.length && counter--) {
        leaf.records.push(array.pop());
      }
    }

    var i = 0;
    while (i < leafs.length) {
      var counter = max_elements + 1;
      var node    = new Node();

      while (i < leafs.length && counter--) {
      }
    }

    sequence.each(leafs, function (leaf) {
      var last = leaf.records.pop();
      var node = new Node();
    });

    console.log(leafs);*/
  };
}


/*var x = exports.Mutable(defaultSort, 32);

var leaf1 = new Leaf([new Record("a", 1), new Record("b", 2)]);

var leaf2 = new Leaf([new Record("d", 4), new Record("e", 5)]);

x.root = new Node([new ChildRecord("c", 3, leaf1)], leaf2);

console.log(x.get("a"));
console.log(x.get("b"));
console.log(x.get("c"));
console.log(x.get("d"));
console.log(x.get("e"));
console.log(x.get("f"));
console.log("" + x);


console.log("" + exports.toMutable([["d", 4], ["a", 1], ["h", 8], ["b", 2], ["f", 6], ["g", 7], ["c", 3], ["i", 9], ["e", 5], ["j", 10]], defaultSort, 32));


var y = exports.Mutable(defaultSort, 8);

y.set("a", 1);
console.log("" + y);

y.set("b", 2);
console.log("" + y);

y.set("c", 3);
console.log("" + y);

y.set("d", 4);
console.log("" + y);

y.set("e", 5);
console.log("" + y);

y.set("f", 6);
console.log("" + y);

y.set("g", 7);
console.log("" + y);

y.set("h", 8);
console.log("" + y);

y.set("i", 9);
console.log("" + y);

y.set("j", 10);
console.log("" + y);

y.del("j");
console.log("" + y);

y.del("i");
console.log("" + y);


var y = exports.Mutable(defaultSort, 32);

y.set({ foo: 1 }, 2);
console.log("" + y);

y.set({ bar: 2 }, 3);
console.log("" + y);

y.set({ qux: 3 }, 4);
console.log("" + y);

console.log(y.root.records[0].key);*/
