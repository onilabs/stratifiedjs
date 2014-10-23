/*
 * StratifiedJS 'collection/rb-tree' module
 * Functions for creating and manipulating Red Black trees
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
   @module    collection/rb-tree
   @summary   Functions for creating and manipulating Red Black trees
   @home      sjs:collection/rb-tree
*/

/*

  All valid configurations

    *N = ()

    *B = (BLACK *N *N)
       | (BLACK *N (RED *N *N))
       | (BLACK (RED *N *N) *N)
       | (BLACK (RED *N *N) (RED *N *N))

       # These might violate property #5
       | (BLACK *B *B)
       | (BLACK *B (RED *B *B))
       | (BLACK (RED *B *B) *B)
       | (BLACK (RED *B *B) (RED *B *B))


  All insertion situations

    | (NEW *N *N)

    # All the rest should be mirrored
    | (BLACK (NEW *N *N) *N)
    | (BLACK (NEW *N *N) (RED *N *N))
    | (RED (NEW *N *N) *N)


  All deletion situations

    | (OLD *N *N)

    # All the rest should be mirrored
    | (BLACK (OLD *N *N) (BLACK *N *N))
    | (BLACK (OLD *N *N) (BLACK *N (RED *N *N)))
    | (BLACK (OLD *N *N) (BLACK (RED *N *N) *N))
    | (BLACK (OLD *N *N) (BLACK (RED *N *N) (RED *N *N)))

    | (BLACK (OLD *N *N) (RED (BLACK *N *N) (BLACK *N *N)))
    | (BLACK (OLD *N *N) (RED (BLACK *N *N) (BLACK *N (RED *N *N))))
    | (BLACK (OLD *N *N) (RED (BLACK *N *N) (BLACK (RED *N *N) *N)))
    | (BLACK (OLD *N *N) (RED (BLACK *N *N) (BLACK (RED *N *N) (RED *N *N))))
    | (BLACK (OLD *N *N) (RED (BLACK *N (RED *N *N)) (BLACK *N *N)))
    | (BLACK (OLD *N *N) (RED (BLACK *N (RED *N *N)) (BLACK *N (RED *N *N))))
    | (BLACK (OLD *N *N) (RED (BLACK *N (RED *N *N)) (BLACK (RED *N *N) *N)))
    | (BLACK (OLD *N *N) (RED (BLACK *N (RED *N *N)) (BLACK (RED *N *N) (RED *N *N))))
    | (BLACK (OLD *N *N) (RED (BLACK (RED *N *N) *N) (BLACK *N *N)))
    | (BLACK (OLD *N *N) (RED (BLACK (RED *N *N) *N) (BLACK *N (RED *N *N))))
    | (BLACK (OLD *N *N) (RED (BLACK (RED *N *N) *N) (BLACK (RED *N *N) *N)))
    | (BLACK (OLD *N *N) (RED (BLACK (RED *N *N) *N) (BLACK (RED *N *N) (RED *N *N))))
    | (BLACK (OLD *N *N) (RED (BLACK (RED *N *N) (RED *N *N)) (BLACK *N *N)))
    | (BLACK (OLD *N *N) (RED (BLACK (RED *N *N) (RED *N *N)) (BLACK *N (RED *N *N))))
    | (BLACK (OLD *N *N) (RED (BLACK (RED *N *N) (RED *N *N)) (BLACK (RED *N *N) *N)))
    | (BLACK (OLD *N *N) (RED (BLACK (RED *N *N) (RED *N *N)) (BLACK (RED *N *N) (RED *N *N))))

    | (RED (OLD *N *N) (BLACK *N *N))
    | (RED (OLD *N *N) (BLACK *N (RED *N *N)))
    | (RED (OLD *N *N) (BLACK (RED *N *N) *N))
    | (RED (OLD *N *N) (BLACK (RED *N *N) (RED *N *N)))


  (insert Parent Node) =

    # Color black
    | () (RED a b) -> (BLACK a b)

    # Do nothing
    | P (BLACK a (RED b c))         -> (BLACK a (RED b c))
    | P (BLACK (RED a b) c)         -> (BLACK (RED a b) c)
    | P (BLACK (RED a b) (RED c d)) -> (BLACK (RED a b) (RED c d))

    # Color parent and uncle black, color grandparent red, recurse on grandparent
    | P (BLACK (RED (RED a b) c) (RED d e)) -> (insert P (RED (BLACK (RED a b) c) (BLACK d e)))
    | P (BLACK (RED a (RED b c)) (RED d e)) -> (insert P (RED (BLACK a (RED b c)) (BLACK d e)))
    | P (BLACK (RED a b) (RED (RED c d) e)) -> (insert P (RED (BLACK a b) (BLACK (RED c d) e)))
    | P (BLACK (RED a b) (RED c (RED d e))) -> (insert P (RED (BLACK a b) (BLACK c (RED d e))))

    # Rotate left with parent, recurse on parent
    | P (BLACK (RED a (RED b c)) d) -> (insert P (BLACK (RED (RED a b) c) d))

    # Rotate right with parent, recurse on parent
    | P (BLACK a (RED (RED b c) d)) -> (insert P (BLACK a (RED b (RED c d))))

    # Color parent black, color grandparent red, rotate parent right with grandparent
    | P (BLACK (RED (RED a b) c) d) -> (BLACK (RED a b) (RED c d))

    # Color parent black, color grandparent red, rotate parent left with grandparent
    | P (BLACK a (RED b (RED c d))) -> (BLACK (RED a b) (RED c d))


  (remove Parent Node) =

    # Remove root
    | () (BLACK () ()) -> ()

    | P (BLACK () (RED () ())) -> (BLACK () ())
    | P (BLACK (RED () ()) ()) -> (BLACK () ())

    # Remove the successor node instead
    | P (BLACK a b) -> (remove P (min b))

 */

var dictionary = require('./dictionary');
var string     = require('../string');
var sequence   = require('../sequence');
var assert     = require('../assert');

__js {
  var NEGATIVE_RED = -1;
  var RED          = 0;
  var BLACK        = 1;
  var DOUBLE_BLACK = 2;

  function ColoredNode(parent, color, key, value) {
    this.parent = parent;
    this.left   = null;
    this.right  = null;
    this.color  = color;
    this.key    = key;
    this.value  = value;
  }

  function toString(x) {
    if (x === null) {
      return "()"
    } else {
      var color = "INVALID";
      if (x.color === RED) {
        color = "*";
      } else if (x.color === BLACK) {
        color = "";
      }

      var left  = toString(x.left).split(/\n/);
      var right = toString(x.right).split(/\n/);

      var max_l = 0;
      var max_r = 0;

      sequence.each(left, function (x) {
        max_l = Math.max(max_l, x.length + 1);
      });

      sequence.each(right, function (x) {
        max_r = Math.max(max_r, x.length);
      });

      var self = "/" + color + " " + (x.key + ": " + x.value) + " " + color + "\\";

      // left[0].length + 1
      var middle = (max_l - left[0].length + /^ */.exec(right[0])[0].length) / 2;
      var spaces = Math.floor(left[0].length + middle - (self.length / 2));

      max_l = Math.max(max_l, self.length);

      // TODO string.repeat
      var children = [new Array(Math.max(1, spaces) + 1).join(" ") + self];

      sequence.each(sequence.zipLongest(left, right), function (a) {
        var l = a[0] || "";
        var r = a[1] || "";
        children.push(string.padRight(l, max_l, " ") + r);
      });

      return children.join("\n");
      //return "(" + [color, toString(x.left), (x.key + ": " + x.value), toString(x.right)].join(" ") + ")"
    }
  }


  function get_by_key(tree, key) {
    var node = tree.root;
    var sort = tree.sort;

    while (true) {
      if (node === null) {
        return node;
      } else {
        var order = sort(key, node.key);
        if (order === 0) {
          return node;
        } else if (order < 0) {
          node = node.left;
        } else {
          node = node.right;
        }
      }
    }
  }

  function max(node) {
    while (true) {
      var right = node.right;
      if (right === null) {
        return node;
      } else {
        node = right;
      }
    }
  }

  function min(node) {
    while (true) {
      var left = node.left;
      if (left === null) {
        return node;
      } else {
        node = left;
      }
    }
  }

  function prev_by_key(tree, key) {
    var node = tree.root;
    var sort = tree.sort;

    var parent = null;

    while (true) {
      if (node === null) {
        return node;
      } else {
        var order = sort(key, node.key);
        if (order === 0) {
          var left = node.left;

          if (left === null) {
            return parent;
          } else {
            return max(left);
          }

        } else if (order < 0) {
          node = node.left;

        } else {
          parent = node;
          node = node.right;
        }
      }
    }
  }

  // TODO code duplication with prev_by_key
  function next_by_key(tree, key) {
    var node = tree.root;
    var sort = tree.sort;

    var parent = null;

    while (true) {
      if (node === null) {
        return node;
      } else {
        var order = sort(key, node.key);
        if (order === 0) {
          var right = node.right;

          if (right === null) {
            return parent;
          } else {
            return min(right);
          }

        } else if (order < 0) {
          parent = node;
          node = node.left;

        } else {
          node = node.right;
        }
      }
    }
  }

  function sibling(node) {
    var parent = node.parent;
    if (parent.left === node) {
      return parent.right;
    } else {
      return parent.left;
    }
  }

  function replace_node(tree, old_node, new_node) {
    var parent = old_node.parent;

    if (parent === null) {
      tree.root = new_node;
    } else {
      if (parent.left === old_node) {
        parent.left = new_node;
      } else {
        parent.right = new_node;
      }
    }

    if (new_node !== null) {
      new_node.parent = parent;
    }
  }

  function rotate_left(tree, node, parent) {
    replace_node(tree, parent, node);

    var left = node.left;
    parent.right = left;

    if (left !== null) {
      left.parent = parent;
    }

    node.left = parent;
    parent.parent = node;
  }

  function rotate_right(tree, node, parent) {
    replace_node(tree, parent, node);

    var right = node.right;
    parent.left = right;

    if (right !== null) {
      right.parent = parent;
    }

    node.right = parent;
    parent.parent = node;
  }

  function balance_insert(tree, node) {
    while (true) {
      var parent = node.parent;
      // The root node must always be black
      if (parent === null) {
        node.color = BLACK;
        return;

      // The parent node of a red node must be black
      } else if (parent.color === BLACK) {
        return;

      } else {
        var grandparent = parent.parent;
        var uncle       = sibling(parent);

        if (uncle !== null && uncle.color === RED) {
          parent.color = BLACK;
          uncle.color  = BLACK;
          grandparent.color = RED;
          node = grandparent;

        } else {
          // Left rotation
          if (parent.right === node && grandparent.left === parent) {
            rotate_left(tree, node, parent);

            // TODO This is equivalent to replace_node, but a bit faster
            //grandparent.left = node;
            //node.parent = grandparent;

            // TODO this is hacky
            var temp = node;
            node = parent;
            parent = temp;

          // Right rotation
          } else if (parent.left === node && grandparent.right === parent) {
            rotate_right(tree, node, parent);

            // TODO This is equivalent to replace_node, but a bit faster
            //grandparent.right = node;
            //node.parent = grandparent;

            // TODO this is hacky
            var temp = node;
            node = parent;
            parent = temp;
          }

          parent.color = BLACK;
          grandparent.color = RED;

          if (parent.left === node) {
            rotate_right(tree, parent, grandparent);
          } else {
            rotate_left(tree, parent, grandparent);
          }

          return;
        }
      }
    }
  }

  function color(node) {
    if (node === null) {
      return BLACK;
    } else {
      return node.color;
    }
  }

  function balance_remove(tree, node) {
    while (true) {
      var parent = node.parent;
      if (parent === null) {
        return;

      } else {
        var sib = sibling(node);

        if (sib.color === RED) {
          parent.color = RED;
          sib.color = BLACK;

          if (parent.left === sib) {
            var right = sib.right;
            rotate_right(tree, sib, parent);
            sib = right;
          } else {
            var left = sib.left;
            rotate_left(tree, sib, parent);
            sib = left;
          }
        }

        var c_left  = color(sib.left);
        var c_right = color(sib.right);

        if (c_left  === BLACK &&
            c_right === BLACK) {

          sib.color = RED;

          if (parent.color === RED) {
            parent.color = BLACK;
            return;
          } else {
            node = parent;
          }

        } else {
          if (c_right     === BLACK &&
              parent.left === node) {

            sib.color = RED;
            sib.left.color = BLACK;

            var left = sib.left;
            rotate_right(tree, left, sib);
            sib = left;

          } else if (c_left       === BLACK &&
                     parent.right === node) {

            sib.color = RED;
            sib.right.color = BLACK;

            var right = sib.right;
            rotate_left(tree, right, sib);
            sib = right;
          }

          sib.color = parent.color;
          parent.color = BLACK;

          if (parent.left === node) {
            sib.right.color = BLACK;
            rotate_left(tree, sib, parent);

          } else {
            sib.left.color = BLACK;
            rotate_right(tree, sib, parent);
          }

          return;
        }
      }
    }
  }

  function set_by_key(tree, key, value) {
    var node = tree.root;
    var sort = tree.sort;

    if (node === null) {
      tree.root = new ColoredNode(null, BLACK, key, value);
    } else {
      while (true) {
        var order = sort(key, node.key);
        if (order === 0) {
          node.value = value;
          return;

        } else if (order < 0) {
          if (node.left === null) {
            var new_node = new ColoredNode(node, RED, key, value);
            node.left = new_node;
            balance_insert(tree, new_node);
            return;
          } else {
            node = node.left;
          }

        } else {
          if (node.right === null) {
            var new_node = new ColoredNode(node, RED, key, value);
            node.right = new_node;
            balance_insert(tree, new_node);
            return;
          } else {
            node = node.right;
          }
        }
      }
    }
  }

  function del_by_key(tree, key) {
    var node = get_by_key(tree, key);

    if (node === null) {
      throw new Error("key " + key + " does not exist in tree");

    } else {
      if (node.left !== null && node.right !== null) {
        // TODO use min or max ?
        var next = min(node.right);
        // TODO copy operation
        node.key   = next.key;
        node.value = next.value;
        node = next;
      }

      var child = (node.right === null
                    ? node.left
                    : node.right);

      if (node.color === BLACK) {
        // (BLACK *N (RED *N *N))
        // (BLACK (RED *N *N) *N)
        if (child !== null && child.color === RED) {
          child.color = BLACK;

        // (BLACK *N *N)
        } else {
          balance_remove(tree, node);
        }
      }

      replace_node(tree, node, child);
    }
  }

  /*function length(node) {
    if (node === null) {
      return 0;
    } else {
      return node.key;
    }
  }

  function get_by_index(tree, index) {
    var node = tree.root;
    var sort = tree.sort;

    while (true) {
      if (node === null) {
        return node;
      } else {
        var left = length(node.left);
        if (index === left) {
          return node;
        } else if (index < left) {
          node = node.left;
        } else {
          index = index - (left + 1);
          node = node.right;
        }
      }
    }
  }*/

  /*function set_by_index(tree, index, value) {
    var node = tree.root;
    var sort = tree.sort;

    if (node === null) {
      tree.root = new ColoredNode(null, null, null, BLACK, 1, value);
    } else {
      while (true) {
        var left = length(node.left);
        if (index === left) {
          var new_node = new ColoredNode(node, null, null, RED, key, value);
          if (node.left === null) {

          } else if (node.right === null) {
          }

          node.left = new_node;
          balance_insert(tree, new_node);
          return;
        } else if (index < left) {
          node = node.left;
        } else {
          index = index - (left + 1);
          node = node.right;
        }
      }
    }
  }*/


  function Mutable(sort) {
    this.root = null;
    this.sort = sort;
  }

  Mutable.prototype.toString = function () {
    return toString(this.root);
  };

  Mutable.prototype[dictionary.interface_has] = function (tree, key) {
    return get_by_key(tree, key) !== null;
  };

  Mutable.prototype[dictionary.interface_get] = function (tree, key) {
    return get_by_key(tree, key).value;
  };

  Mutable.prototype[dictionary.interface_set] = function (tree, key, value) {
    set_by_key(tree, key, value);
  };

  Mutable.prototype[dictionary.interface_del] = function (tree, key) {
    del_by_key(tree, key, value);
  };

  Mutable.prototype.get = function (key) {
    return get_by_key(this, key).value;
  };

  Mutable.prototype.set = function (key, value) {
    set_by_key(this, key, value);
  };

  Mutable.prototype.del = function (key) {
    del_by_key(this, key);
  };

  exports.Mutable = function (sort) {
    return new Mutable(sort);
  };


  // TODO is this verification function correct ?
  function verify(tree) {
    var top_counter = -1;

    function check_counter(counter) {
      if (top_counter === -1) {
        top_counter = counter;
      } else {
        // #5 Every path must have the same number of black nodes
        assert.ok(counter === top_counter);
      }
    }

    // #4 every red node must have 2 black children
    function check_red_null(node) {
      assert.ok(node.color === RED);
      assert.ok(node.left === null);
      assert.ok(node.right === null);
    }

    // #4 every red node must have 2 black children
    function check_red_children(node) {
      assert.ok(node.color === RED);
      assert.ok(node.left !== null);
      assert.ok(node.right !== null);
      assert.ok(node.left.color === BLACK);
      assert.ok(node.right.color === BLACK);
    }

    function loop(node, counter) {
      // #2 The root node must be black
      assert.ok(node.color === BLACK);
      ++counter;

      var left  = node.left;
      var right = node.right;

      // (B *N *N)
      if (left === null && right === null) {
        check_counter(counter);

      // (B *N (R *N *N))
      } else if (left === null) {
        check_red_null(right);
        check_counter(counter);

      // (B (R *N *N) *N)
      } else if (right === null) {
        check_red_null(left);
        check_counter(counter);

      // (B *B *B)
      } else if (left.color === BLACK && right.color === BLACK) {
        loop(left, counter);
        loop(right, counter);

      // (B *B (R *B *B))
      } else if (left.color === BLACK) {
        check_red_children(right);
        loop(left, counter);
        loop(right.left, counter);
        loop(right.right, counter);

      // (B (R *B *B) *B)
      } else if (right.color === BLACK) {
        check_red_children(left);
        loop(left.left, counter);
        loop(left.right, counter);
        loop(right, counter);

      // (B (R *N *N) (R *N *N))
      } else if (left.left === null) {
        check_red_null(left);
        check_red_null(right);
        check_counter(counter);

      // (B (R *B *B) (R *B *B))
      } else {
        check_red_children(left);
        check_red_children(right);
        loop(left.left, counter);
        loop(left.right, counter);
        loop(right.left, counter);
        loop(right.right, counter);
      }
    }

    if (tree.root !== null) {
      loop(tree.root, 0);
    }
  }
}


/*var x = new Mutable(function (x, y) {
  if (x === y) {
    return 0;
  } else if (x < y) {
    return -1;
  } else {
    return 1;
  }
});

console.log("\n" + x);

set_by_key(x, "c", 1);
console.log("\n" + x);

set_by_key(x, "b", 1);
console.log("\n" + x);

set_by_key(x, "a", 1);
console.log("\n" + x);

var i = 0;
while (i < 10) {
  set_by_key(x, "foo" + i, 1);
  ++i;
}
console.log("\n" + x);


var a = [];
var i = 0;
while (i < 1000) {
  a.push("foo" + i);
  ++i;
}

function rand(array, f) {
  var a = array.slice();
  while (a.length) {
    var i = Math.floor(Math.random() * a.length);
    f(a[i]);
    a.splice(i, 1);
  }
}

rand(a, function (s) {
  x.set(s, 1);
  verify(x);
});

rand(a, function (s) {
  x.del(s);
  verify(x);
});

console.log("\n" + x);*/
