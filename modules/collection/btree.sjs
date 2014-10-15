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

  var min_elements = 32;
  var max_elements = min_elements * 2;

  function defaultSort(x, y) {
    if (x === y) {
      return 0
    } else if (x < y) {
      return -1
    } else {
      return 1
    }
  }
  exports.defaultSort = defaultSort;


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

      // Merge left into right
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


  function Path(node, index) {
    this.node  = node;
    this.index = index;
  }

  // Uses constructors for much more speed
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
    var index  = Math.floor(left.length / 2);
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

    for (var i = 0, len = records_right.length; i < len; ++i) {
      records_left.push(records_right[i]);
    }

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

  Leaf.prototype.get = function (key, sort) {
    var records = this.records;

    // TODO use binary search ?
    for (var i = 0, len = records.length; i < len; ++i) {
      var record = records[i];
      var order  = sort(key, record.key);
      if (order === 0) {
        return record.value;
      } else if (order < 0) {
        break;
      }
    }

    return empty;
  };

  Leaf.prototype.set = function (btree, parents, key, value, sort) {
    var records = this.records;

    // TODO use binary search ?
    for (var i = 0, len = records.length; i < len; ++i) {
      var record = records[i];
      var order  = sort(key, record.key);
      if (order === 0) {
        record.value = value;
        return;
      } else if (order < 0) {
        add_at(records, i, new Record(key, value));
        rebalance_set(btree, parents, this);
        return;
      }
    }

    records.push(new Record(key, value));
    rebalance_set(btree, parents, this, sort);
  };

  Leaf.prototype.del = function (btree, parents, key, sort) {
    var records = this.records;

    // TODO use binary search ?
    for (var i = 0, len = records.length; i < len; ++i) {
      var record = records[i];
      var order  = sort(key, record.key);
      if (order === 0) {
        remove_at(records, i);
        rebalance_del(btree, parents, this);
        return;
      } else if (order < 0) {
        break;
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
    var index  = Math.floor(left.length / 2);
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

    for (var i = 0, len = records_right.length; i < len; ++i) {
      records_left.push(records_right[i]);
    }

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

  Node.prototype.get = function (key, sort) {
    var records = this.records;

    // TODO use binary search ?
    for (var i = 0, len = records.length; i < len; ++i) {
      var record = records[i];
      var order  = sort(key, record.key);
      if (order === 0) {
        return record.value;
      } else if (order < 0) {
        return record.child.get(key, sort);
      }
    }

    return this.last.get(key, sort);
  };

  Node.prototype.set = function (btree, parents, key, value, sort) {
    var records = this.records;

    // TODO use binary search ?
    for (var i = 0, len = records.length; i < len; ++i) {
      var record = records[i];
      var order  = sort(key, record.key);
      if (order === 0) {
        record.value = value;
        return;
      } else if (order < 0) {
        parents.push(new Path(this, i));
        record.child.set(btree, parents, key, value, sort);
        return;
      }
    }

    parents.push(new Path(this, i));
    this.last.set(btree, parents, key, value, sort);
  };

  Node.prototype.del = function (btree, parents, key, sort) {
    var records = this.records;

    // TODO use binary search ?
    for (var i = 0, len = records.length; i < len; ++i) {
      var record = records[i];
      var order  = sort(key, record.key);
      if (order === 0) {
        parents.push(new Path(this, i));

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
        parents.push(new Path(this, i));
        record.child.del(btree, parents, key, sort);
        return;
      }
    }

    parents.push(new Path(this, i));
    this.last.del(btree, parents, key, sort);
  };


  function BTree(sort) {
    this.sort = sort;
    this.root = new Leaf([]);
  }

  BTree.prototype.toString = function () {
    return "" + this.root;
  };

  BTree.prototype.get = function (key) {
    var node = this.root;
    var sort = this.sort;
    return node.get(key, sort);
  };

  BTree.prototype.set = function (key, value) {
    var node = this.root;
    var sort = this.sort;
    var parents = [];
    node.set(this, parents, key, value, sort);
  };

  BTree.prototype.del = function (key) {
    var node = this.root
    var sort = this.sort;
    var parents = [];
    node.del(this, parents, key, sort);
  };

  BTree.prototype[dictionary.interface_has] = function (btree, key) {
    return btree.get(key) !== empty;
  };

  BTree.prototype[dictionary.interface_get] = function (btree, key) {
    return btree.get(key);
  };

  BTree.prototype[dictionary.interface_set] = function (btree, key, value) {
    btree.set(key, value);
  };

  BTree.prototype[dictionary.interface_del] = function (btree, key) {
    btree.del(key);
  };

  exports.BTree = function (sort) {
    return new BTree(sort);
  };
}


/*var x = new BTree(defaultSort);

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

var y = new BTree(defaultSort);

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
console.log("" + y);*/
