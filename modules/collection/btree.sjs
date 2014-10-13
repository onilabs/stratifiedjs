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
  var empty        = {};

  var min_elements = 5;
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


  function rebalance(btree, parents, node, sort) {
    while (node.records.length > max_elements) {
      var pivot = node.split();
      if (parents.length) {
        var parent = parents.pop();
        parent.addRecord(pivot, sort);
        node = parent;
      } else {
        btree.root = new Node([pivot], node);
        break;
      }
    }
  }


  // Uses constructors for much more speed
  function Record(key, value) {
    this.key   = key;
    this.value = value;
  }

  Record.prototype.toString = function () {
    return "#{this.key}: #{this.value}";
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
        records.splice(i, 0, new Record(key, value));
        rebalance(btree, parents, this, sort);
        return;
      }
    }

    records.push(new Record(key, value));
    rebalance(btree, parents, this, sort);
  };


  function Node(records, last) {
    this.records = records;
    this.last    = last;
  }

  Node.prototype = Object.create(Leaf.prototype);

  Node.prototype.toString = function () {
    var records  = [];
    var children = [];

    this.records ..sequence.each(function (x) {
      records.push("" + x);
      children.push("" + x.child);
    });

    records = sequence.zip(records, children) ..sequence.map(function ([record, child]) {
                                      // TODO a bit hacky
      return (record + ",") ..string.padRight(child.length - 4, " ");
    });

    var last = "" + this.last;
    children.push(last);
    // TODO string.repeat
    records.push(new Array(last.length - 4 + 1).join(" "));

    return "[ " + records.join("     ") + " ]\n" + children.join(" ");
  };

  Node.prototype.addRecord = function (new_record, sort) {
    var records = this.records;
    var key     = new_record.key;

    // TODO use binary search ?
    for (var i = 0, len = records.length; i < len; ++i) {
      var record = records[i];
      var order  = sort(key, record.key);
      if (order === 0) {
        @assert.fail();
      } else if (order < 0) {
        records.splice(i, 0, new_record);
        return;
      }
    }

    @assert.fail();
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

    parents.push(this);

    // TODO use binary search ?
    for (var i = 0, len = records.length; i < len; ++i) {
      var record = records[i];
      var order  = sort(key, record.key);
      if (order === 0) {
        record.value = value;
        return;
      } else if (order < 0) {
        record.child.set(btree, parents, key, value, sort);
        return;
      }
    }

    this.last.set(btree, parents, key, value, sort);
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
  }

  BTree.prototype.set = function (key, value) {
    var node = this.root;
    var sort = this.sort;
    var parents = [];
    node.set(this, parents, key, value, sort);
  }

  BTree.prototype[dictionary.interface_has] = function (btree, key) {
    return btree.get(key) !== empty;
  };

  BTree.prototype[dictionary.interface_get] = function (btree, key) {
    return btree.get(key);
  };

  BTree.prototype[dictionary.interface_set] = function (btree, key, value) {
    btree.set(key, value);
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
console.log("" + y);*/
