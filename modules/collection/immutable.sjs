/*
 * StratifiedJS 'collection/immutable' module
 * Various immutable data structures, including dictionaries, lists, and sets
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
   @module    collection/immutable
   @summary   Various immutable data structures, including dictionaries, lists, and sets
   @home      sjs:collection/immutable
*/

// TODO should these use sjs: or ../
@ = require([
  { id: 'sjs:assert', name: 'assert' },
  { id: 'sjs:object' },
  { id: 'sjs:sequence' },
  { id: 'sjs:type' },
  { id: 'sjs:string', exclude: 'isString' } // TODO get rid of this exclude
]);

module.setCanonicalId('sjs:collection/immutable');

// http://arclanguage.org/item?id=14181
// http://arclanguage.org/item?id=18936
__js {
  function simpleSort(x, y) {
    if (x === y) {
      return 0;
    } else if (x < y) {
      return -1;
    } else {
      return 1;
    }
  }
  exports.simpleSort = simpleSort;

  // TODO store the hash rather than the key for Dict and Set ?
  function defaultSort(x, y) {
    x = hash(x);
    y = hash(y);
    return simpleSort(x, y);
  }
  exports.defaultSort = defaultSort;


  // Faster than using Math.max
  function max(x, y) {
    if (x > y) {
      return x;
    } else {
      return y;
    }
  }


  var interface_hash = @Interface(module, "hash");

  var mutable_hash_id = 0;

  function hash_dict(a, max_key, spaces) {
    return a.map(function (x) {
      var key = x.key.map(function (x) {
        return x ..@padRight(max_key, " ");
      }).join("\n" + spaces);

      var value = x.value.replace(/\n/g, "\n" + spaces + " " ..@repeat(max_key + 3));

      return key + " = " + value;
    }).join("\n" + spaces);
  }

  function hash_set(a, spaces) {
    return a.map(function (x) {
      return x.replace(/\n/g, "\n" + spaces);
    }).join("\n" + spaces);
  }

  function hash(x) {
    var type = typeof x;
    if (type === "string") {
      return "\"" + x.replace(/\\/g, "\\\\").replace(/\"/g, "\\\"").replace(/\n/g, "\n ") + "\"";

    } else if (type === "number"    ||
               type === "boolean"   ||
               type === "undefined" ||
               x === null) {
      return "" + x;

    } else {
      var hasher = x[interface_hash];
      if (hasher != null) {
        return hasher(x);

      } else {
        var id = "(Mutable " + (++mutable_hash_id) + ")";

        Object.defineProperty(x, interface_hash, {
          configurable: false,
          enumerable: false,
          writable: false,
          value: function () {
            return id;
          }
        });

        return id;
      }
    }
  }

  /**
     @function equal
     @param {Any} [x]
     @param {Any} [y]
     @return {Boolean} `true` if `x` and `y` are equal
     @summary Returns whether `x` and `y` are equal
     @desc
       Simple things like numbers and strings are
       treated as equal if they have the same value:

           @equal(1, 1); // true
           @equal("foo", "foo"); // true

       This takes `O(1)` time.

       ----

       Mutable objects are treated as equal if they
       are exactly the same object:

           var obj = {};

           @equal(obj, obj); // true

       This takes `O(1)` time.

       ----

       [::Dict] are treated as equal if they have
       the same keys/values:

           @equal(@Dict({ foo: 1 }),
                  @Dict({ foo: 1 })); // true

       This takes `O(n)` time, except the results
       are cached so that afterwards it takes `O(1)`
       time.

       ----

       [::Set] are treated as equal if they have
       the same values:

           @equal(@Set([1]),
                  @Set([1])); // true

       This takes `O(n)` time, except the results
       are cached so that afterwards it takes `O(1)`
       time.

       ----

       [::List] are treated as equal if they have
       the same values in the same order:

           @equal(@List([1]),
                  @List([1])); // true

       This takes `O(n)` time, except the results
       are cached so that afterwards it takes `O(1)`
       time.

       ----

       [::SortedDict] and [::SortedSet] are the
       same as [::Dict] and [::Set] except that
       the sort order must also be the same.
   */
  function equal(x, y) {
    return x === y || hash(x) === hash(y);
  }
  exports.equal = equal;


  var interface_toJS = @Interface(module, "toJS");

  /**
     @function toJS
     @param {Any} [x]
     @return {Any}
     @summary Converts a [::Dict], [::Set], or [::List]
              to its JavaScript equivalent
     @desc
       Most things are returned as-is, except:

       * [::Dict] is converted to a JavaScript object. The keys must be strings.
       * [::Set] is converted to a JavaScript array.
       * [::List] is converted to a JavaScript array.

       This conversion takes `O(n)` time.

       This is useful if you like using [::Dict], [::Set],
       or [::List], but you want to use a library that
       requires ordinary JavaScript objects/arrays.
   */
  function toJS(x) {
    if (@isObject(x)) {
      var fn = x[interface_toJS];
      if (fn != null) {
        return fn(x);
      } else {
        return x;
      }
    } else {
      return x;
    }
  }
  exports.toJS = toJS;


  var nil     = {};
  nil.depth   = 0;
  nil.size    = 0;
  nil.forEach = function (f) {};
  exports.nil = nil;


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
      //@assert.isNot(left, y.left); // TODO get rid of this?
      return balanced_node(y, left, y.right);

    } else {
      var right = concat(x.right, y);
      //@assert.isNot(right, x.right); // TODO get rid of this?
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

    if (equal(old_value, new_value)) {
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

  // We use conses at the very end of the list for very fast O(1) push
  function Cons(car, cdr) {
    this.car = car;
    this.cdr = cdr;
  }

  // Converts a stack (reversed cons) into an array
  function stack_to_array(a, size) {
    var out = new Array(size);

    while (size--) {
      out[size] = a.car;
      a = a.cdr;
    }

    return out;
  }

  function stack_nth(a, size, i) {
    while (--size !== i) {
      a = a.cdr;
    }

    return a.car;
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

            //console.log(aleft, aright);

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
    if (equal(this.key, key)) {
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
    if (equal(this.key, key) && equal(this.value, value)) {
      return this;
    } else {
      return new KeyNode(this.left, this.right, key, value);
    }
  };

  KeyNode.prototype.forEach = function (f) {
    this.left.forEach(f);
    f([this.key, this.value]);
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
      throw new Error("Key #{key} not found");

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
    this.hash = null;
  }

  // TODO is this a good idea ?
  ImmutableDict.prototype = Object.create(null);

  ImmutableDict.prototype[@interface_each] = function (x, f) {
    x.root.forEach(f);
  };

  ImmutableDict.prototype[interface_hash] = function (x) {
    if (x.hash === null) {
      var a = [];

      var max_key = 0;

      x ..@each(function ([key, value]) {
        key   = hash(key);
        value = hash(value);

        key = key.split(/\n/);

        key ..@each(function (key) {
          max_key = Math.max(max_key, key.length);
        });

        a.push({
          key: key,
          value: value
        });
      });

      if (equal(x.sort, defaultSort)) {
        if (a.length) {
          x.hash = "(Dict\n  " + hash_dict(a, max_key, "  ") + ")";
        } else {
          x.hash = "(Dict)";
        }
      } else {
        if (a.length) {
          x.hash = "(SortedDict #{hash(x.sort)}\n  " + hash_dict(a, max_key, "  ") + ")";
        } else {
          x.hash = "(SortedDict #{hash(x.sort)})";
        }
      }
    }

    return x.hash;
  };

  ImmutableDict.prototype.toString = function () {
    return hash(this);
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

  ImmutableDict.prototype[interface_toJS] = function (x) {
    var o = {};

    x ..@each(function ([key, value]) {
      // TODO use @isString test
      @assert.is(typeof key, "string");
      o[key] = toJS(value);
    });

    return o;
  };



  function ImmutableSet(root, sort) {
    this.root = root;
    this.sort = sort;
    this.hash = null;
  }

  // TODO is this a good idea ?
  ImmutableSet.prototype = Object.create(null);

  ImmutableSet.prototype.isEmpty = ImmutableDict.prototype.isEmpty;

  ImmutableSet.prototype.has = ImmutableDict.prototype.has;

  ImmutableSet.prototype[@interface_each] = ImmutableDict.prototype[@interface_each];

  ImmutableSet.prototype.toString = ImmutableDict.prototype.toString;

  ImmutableSet.prototype[interface_hash] = function (x) {
    if (x.hash === null) {
      var a = [];

      x ..@each(function (value) {
        a.push(hash(value));
      });

      var spaces = "  ";

      if (equal(x.sort, defaultSort)) {
        if (a.length) {
          x.hash = "(Set\n  " + hash_set(a, spaces) + ")";
        } else {
          x.hash = "(Set)";
        }
      } else {
        if (a.length) {
          x.hash = "(SortedSet #{hash(x.sort)}\n  " + hash_set(a, spaces) + ")";
        } else {
          x.hash = "(SortedSet #{hash(x.sort)})";
        }
      }
    }

    return x.hash;
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

  ImmutableSet.prototype.union = function (other) {
    var self = this;

    other ..@each(function (value) {
      self = self.add(value);
    });

    return self;
  };

  ImmutableSet.prototype.intersect = function (other) {
    var self = this;
    if (self.root === nil) {
      return self;

    } else {
      var out = new ImmutableSet(nil, self.sort);

      other ..@each(function (value) {
        if (self.has(value)) {
          out = out.add(value);
        }
      });

      return out;
    }
  };

  ImmutableSet.prototype.disjoint = function (other) {
    var self = this;

    other ..@each(function (value) {
      if (self.has(value)) {
        self = self.remove(value);
      } else {
        self = self.add(value);
      }
    });

    return self;
  };

  // TODO what about the empty set ?
  ImmutableSet.prototype.subtract = function (other) {
    var self = this;

    if (self.root !== nil) {
      other ..@each(function (value) {
        self = self.remove(value);
      });
    }

    return self;
  };

  ImmutableSet.prototype[interface_toJS] = function (x) {
    var a = [];

    x ..@each(function (value) {
      a.push(toJS(value));
    });

    return a;
  };


  function ImmutableList(root, tail, tail_size) {
    this.root = root;
    this.tail = tail;
    this.tail_size = tail_size;
    this.hash = null;
  }

  // TODO is this a good idea ?
  ImmutableList.prototype = Object.create(null);

  ImmutableList.prototype.toString = ImmutableSet.prototype.toString;

  ImmutableList.prototype[interface_toJS] = ImmutableSet.prototype[interface_toJS];

  ImmutableList.prototype.isEmpty = function () {
    return this.root === nil && this.tail === nil;
  };

  ImmutableList.prototype[@interface_each] = function (x, f) {
    x.root.forEach(f);

    // TODO put this into a function
    ;(function anon(x) {
      if (x !== nil) {
        anon(x.cdr);
        f(x.car);
      }
    })(x.tail);
  };

  ImmutableList.prototype[interface_hash] = function (x) {
    if (x.hash === null) {
      var a = [];

      x ..@each(function (value) {
        a.push(hash(value));
      });

      if (a.length) {
        x.hash = "(List\n  " + a.map(function (x) {
          return x.replace(/\n/g, "\n  ");
        }).join("\n  ") + ")";
      } else {
        x.hash = "(List)";
      }
    }

    return x.hash;
  };

  ImmutableList.prototype.size = function () {
    return this.root.size + this.tail_size;
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
      var root = this.root;
      var size = root.size;
      if (index < size) {
        return nth_get(root, index);
      } else {
        return stack_nth(this.tail, this.tail_size, index - size);
      }

    } else if (arguments.length === 2) {
      return def;

    } else {
      throw new Error("Index " + index + " is not valid");
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

    var root      = this.root;
    var tail      = this.tail;
    var tail_size = this.tail_size;
    if (index === len) {
      if (tail_size === array_limit) {
        var node = insert_max(root, new ArrayNode(nil, nil, stack_to_array(tail, tail_size)));
        return new ImmutableList(node, new Cons(value, nil), 1);

      } else {
        return new ImmutableList(root, new Cons(value, tail), tail_size + 1);
      }

    } else if (nth_has(index, len)) {
      var size = root.size;
      if (index < size) {
        return new ImmutableList(nth_insert(root, index, value), tail, tail_size);

      } else {
        var array = array_insert_at(stack_to_array(tail, tail_size), index - size, value);
        var node  = insert_max(root, new ArrayNode(nil, nil, array));
        return new ImmutableList(node, nil, 0);
      }

    } else {
      throw new Error("Index " + index + " is not valid");
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

    var root      = this.root;
    var tail      = this.tail;
    var tail_size = this.tail_size;

    if (tail !== nil && index === len - 1) {
      return new ImmutableList(root, tail.cdr, tail_size - 1);

    } else if (nth_has(index, len)) {
      var size = root.size;
      if (index < size) {
        return new ImmutableList(nth_remove(root, index), tail, tail_size);

      } else {
        var array = array_remove_at(stack_to_array(tail, tail_size), index - size);
        // TODO test this
        @assert.isNot(array.length, 0); // TODO remove this later
        var node  = insert_max(root, new ArrayNode(nil, nil, array));
        return new ImmutableList(node, nil, 0);
      }

    } else {
      throw new Error("Index " + index + " is not valid");
    }
  };

  ImmutableList.prototype.modify = function (index, f) {
    var len = this.size();

    if (index < 0) {
      index += len;
    }

    if (nth_has(index, len)) {
      var root = this.root;
      var tail = this.tail;
      var tail_size = this.tail_size;
      var size = root.size;

      if (tail !== nil && index === len - 1) {
        var value = f(tail.car);
        if (equal(value, tail.car)) {
          return this;
        } else {
          return new ImmutableList(root, new Cons(value, tail.cdr), tail_size);
        }

      } else if (index < size) {
        var node = nth_modify(root, index, f);
        if (node === root) {
          return this;
        } else {
          return new ImmutableList(node, tail, tail_size);
        }

      } else {
        var stack = stack_to_array(tail, tail_size);
        var array = array_modify_at(stack, index - size, f);
        if (array === stack) {
          return this;
        } else {
          var node = insert_max(root, new ArrayNode(nil, nil, array));
          return new ImmutableList(node, nil, 0);
        }
      }

    } else {
      throw new Error("Index " + index + " is not valid");
    }
  };

  ImmutableList.prototype.concat = function (right) {
    var lroot = this.root;
    var ltail = this.tail;

    var rroot = right.root;
    var rtail = right.tail;

    if (rroot === nil && rtail === nil) {
      return this;

    } else if (lroot === nil && ltail === nil) {
      return right;

    } else {
      if (ltail !== nil) {
        lroot = insert_max(lroot, new ArrayNode(nil, nil, stack_to_array(ltail, this.tail_size)));
      }

      var node = concat(lroot, rroot);
      return new ImmutableList(node, rtail, right.tail_size);
    }
  };


  // TODO sjs:type utility for this
  function isJSLiteral(x) {
    var proto = Object.getPrototypeOf(x);
    // TODO this won't work cross-realm
    return proto === null || proto === Object.prototype;
  }

  /**
     @function SortedDict
     @param {Function} [sort] Function that determines the sort order
     @param {optional sequence::Sequence|Object} [obj]
     @return {::Dict} A dictionary where the keys are sorted by `sort`
     @summary Returns a [::Dict] where the keys are sorted by `sort`
     @desc
       The sort order for the keys is determined by the `sort` function.

       The `sort` function is given two keys:

       * If it returns `0` the keys are treated as equal.
       * If it returns `-1` the first key is lower than the second key.
       * If it returns `1` the first key is greater than the second key.

       The sort order must be consistent:

       * If given the same keys, the function must return the same result.
       * If it returns `0` for `foo` and `bar`, it must return `0` for `bar` and `foo`.
       * If it returns `-1` for `foo` and `bar`, it must return `1` for `bar` and `foo`.
       * If it returns `1` for `foo` and `bar`, it must return `-1` for `bar` and `foo`.

       If the sort order is not consistent, the behavior of
       [::SortedDict] will be unpredictable. This is not a
       bug in [::SortedDict], it is a bug in your sort
       function.

       ----

       The `obj` parameter is exactly the same as for [::Dict],
       except that the keys are sorted.
   */
  exports.SortedDict = function (sort, obj) {
    if (obj != null) {
      if (obj instanceof ImmutableDict && equal(obj.sort, sort)) {
        return obj;
      } else {
        var o = new ImmutableDict(nil, sort);

        // TODO a little hacky
        if (!obj ..@isSequence) {
          @assert.ok(isJSLiteral(obj));
          obj = obj ..@ownPropertyPairs;
        }

        obj ..@each(function ([key, value]) {
          o = o.set(key, value);
        });

        return o;
      }
    } else {
      return new ImmutableDict(nil, sort);
    }
  };

  /**
     @function SortedSet
     @param {Function} [sort] Function that determines the sort order
     @param {optional sequence::Sequence} [seq]
     @return {::Set} A set where the values are sorted by `sort`
     @summary Returns a [::Set] where the values are sorted by `sort`
     @desc
       The sort order for the values is determined by the `sort` function.

       The `sort` function is given two values:

       * If it returns `0` the values are treated as equal.
       * If it returns `-1` the first value is lower than the second value.
       * If it returns `1` the first value is greater than the second value.

       The sort order must be consistent:

       * If given the same values, the function must return the same result.
       * If it returns `0` for `foo` and `bar`, it must return `0` for `bar` and `foo`.
       * If it returns `-1` for `foo` and `bar`, it must return `1` for `bar` and `foo`.
       * If it returns `1` for `foo` and `bar`, it must return `-1` for `bar` and `foo`.

       If the sort order is not consistent, the behavior of
       [::SortedSet] will be unpredictable. This is not a
       bug in [::SortedSet], it is a bug in your sort
       function.

       ----

       The `seq` parameter is exactly the same as for [::Set],
       except that the values are sorted.
   */
  exports.SortedSet = function (sort, array) {
    if (array != null) {
      if (array instanceof ImmutableSet && equal(array.sort, sort)) {
        return array;
      } else {
        var o = new ImmutableSet(nil, sort);

        array ..@each(function (x) {
          o = o.add(x);
        });

        return o;
      }
    } else {
      return new ImmutableSet(nil, sort);
    }
  };

  /**
     @class Dict
     @summary An immutable dictionary mapping keys to values

     @function Dict
     @param {optional sequence::Sequence|Object} [obj]
     @desc
       If `obj` is a [sequence::Sequence], the values must
       be arrays of `[key, value]`, which will be added to
       the dict.

       If `obj` is a JavaScript literal like `{ foo: 1 }`,
       then the keys/values will be added to the dict.

       This takes `O(n * log2(n))` time, unless `obj` is already
       a [::Dict], in which case it takes `O(1)` time.

       ----

       The keys are in unsorted order, so you cannot rely upon
       the order. If you need to maintain key order, use a [::SortedDict].

       Mutable objects can be used as keys, and they are treated as
       equal only if they are exactly the same object:

           var obj1 = { foo: 1 };
           var obj2 = { foo: 1 };

           var dict = @Dict().set(obj1, "bar")
                             .set(obj2, "qux");

           // Returns "bar"
           dict.get(obj1);

           // Returns "qux"
           dict.get(obj2);

       You can also use a [::Dict], [::Set], or [::List] as keys, and
       they are treated as equal if their keys/values are equal:

           var obj1 = @Dict({ foo: 1 });
           var obj2 = @Dict({ foo: 1 });

           var dict = @Dict().set(obj1, "bar")
                             .set(obj2, "qux");

           // Returns "qux"
           dict.get(obj1);

           // Returns "qux"
           dict.get(obj2);

       Because `obj1` and `obj2` have the same keys/values, they are
       equal.

     @function Dict.isEmpty
     @return {Boolean} `true` if the dict is empty
     @summary Returns whether the dict is empty or not
     @desc
       This function runs in `O(1)` time.

       A dict is empty if it has no keys/values in it.

     @function Dict.has
     @param {Any} [key] The key to search for in the dict
     @return {Boolean} `true` if `key` exists in the dict
     @summary Returns whether `key` exists in the dict
     @desc
       This function runs in `O(log2(n))` worst-case time.

     @function Dict.get
     @param {Any} [key] The key to search for in the dict
     @param {optional Any} [default] Value to return if `key` is not in the dict
     @return {Any} The value for `key` in the dict, or `default` if not found
     @summary Returns the value for `key` in the dict, or `default` if not found
     @desc
       This function runs in `O(log2(n))` worst-case time.

       If `key` is not in the dict:

       * If `default` is provided, it is returned.
       * If `default` is not provided, an error is thrown.

     @function Dict.set
     @param {Any} [key] The key to set in the dict
     @param {Any} [value] The value to use for `key`
     @return {::Dict} A new dict with `key` set to `value`
     @summary Returns a new dict with `key` set to `value`
     @desc
       This function runs in `O(log2(n))` worst-case time.

       This does not modify the dict, it returns a new dict.

       If `key` already exists, it is overwritten.

       If `key` does not exist, it is created.

     @function Dict.remove
     @param {Any} [key] The key to remove from the dict
     @return {::Dict} A new dict with `key` removed
     @summary Returns a new dict with `key` removed
     @desc
       This function runs in `O(log2(n))` worst-case time.

       This does not modify the dict, it returns a new dict.

       If `key` is not in the dict, it will do nothing.

     @function Dict.modify
     @param {Any} [key] The key to modify in the dict
     @param {Function} [fn] The function which will modify the value at `key`
     @return {::Dict} A new dict with `key` modified by `fn`
     @summary Returns a new dict with `key` modified by `fn`
     @desc
       This function runs in `O(log2(n))` worst-case time.

       This does not modify the dict, it returns a new dict.

       This function calls `fn` with the value for `key`, and
       whatever `fn` returns will be used as the new value for
       `key`:

           var dict = @Dict({
             "foo": 1,
             "bar": 2
           });

           // This returns the dict { "foo": 11, "bar": 2 }
           dict.modify("foo", x -> x + 10);

           // This returns the dict { "foo": 1, "bar": 12 }
           dict.modify("bar", x -> x + 10);

       If `key` is not in the dict, it will throw an error.
   */
  exports.Dict = function (obj) {
    return exports.SortedDict(defaultSort, obj);
  };

  /**
     @class Set
     @summary An immutable unordered sequence of values, without duplicates

     @function Set
     @param {optional sequence::Sequence} [seq]
     @desc
       The values from `seq` will be inserted into the set,
       without duplicates.

       This takes `O(n)` time, unless `seq` is already a
       [::Set], in which case it takes `O(1)` time.

       ----

       The values are in unsorted order, so you cannot rely upon
       the order. If you need to maintain order, use a [::SortedSet]
       or [::List].

       Mutable objects can be used as values, and they are treated
       as equal only if they are exactly the same object:

           var obj1 = { foo: 1 };
           var obj2 = { foo: 1 };

           var set = @Set([obj1, obj2]);

           // Returns true
           set.has(obj1);

           // Returns true
           set.has(obj2);

           // Removes obj1 from the set
           set = set.remove(obj1);

           // Returns true
           set.has(obj2);

       You can also use a [::Dict], [::Set], or [::List] as values,
       and they are treated as equal if their keys/values are equal:

           var obj1 = @Dict({ foo: 1 });
           var obj2 = @Dict({ foo: 1 });

           var set = @Set([obj1, obj2]);

           // Returns true
           set.has(obj1);

           // Returns true
           set.has(obj2);

           // Removes obj1 from the set
           set = set.remove(obj1);

           // Returns false
           set.has(obj2);

       Because `obj1` and `obj2` have the same keys/values, they are
       equal, and so they are treated as duplicates.

     @function Set.isEmpty
     @return {Boolean} `true` if the set is empty
     @summary Returns whether the set is empty or not
     @desc
       This function runs in `O(1)` time.

       A set is empty if it has no values in it.

     @function Set.has
     @param {Any} [value] The value to search for in the set
     @return {Boolean} `true` if `value` exists in the set
     @summary Returns whether `value` exists in the set
     @desc
       This function runs in `O(log2(n))` worst-case time.

     @function Set.add
     @param {Any} [value] The value to add to the set
     @return {::Set} A new set with `value` added to it
     @summary Returns a new set with `value` added to it
     @desc
       This function runs in `O(log2(n))` worst-case time.

       This does not modify the set, it returns a new set.

       If `value` is already in the set, it will do nothing.

     @function Set.remove
     @param {Any} [value] The value to remove from the set
     @return {::Set} A new set with `value` removed
     @summary Returns a new set with `value` removed
     @desc
       This function runs in `O(log2(n))` worst-case time.

       This does not modify the set, it returns a new set.

       If `value` is not in the set, it will do nothing.

     @function Set.union
     @param {sequence::Sequence} [other] Sequence of values to union with this set
     @return {::Set} A new set which is the union of this set and `other`
     @summary Returns a new set which is the union of this set and `other`
     @desc
       This function runs in `O(n * log2(n))` worst-case time.

       This does not modify the set, it returns a new set.

       This function returns a set which contains all the values from
       this set, and also all the values from `other`.

       This is a standard [set union](http://en.wikipedia.org/wiki/Union_%28set_theory%29).

       `other` can be any [sequence::Sequence] of values.

     @function Set.intersect
     @param {sequence::Sequence} [other] Sequence of values to intersect with this set
     @return {::Set} A new set which is the intersection of this set and `other`
     @summary Returns a new set which is the intersection of this set and `other`
     @desc
       This function runs in `O(n * 2 * log2(n))` worst-case time.

       This does not modify the set, it returns a new set.

       This function returns a set which contains all the values that
       are in both this set *and* `other`.

       This is a standard [set intersection](http://en.wikipedia.org/wiki/Intersection_%28set_theory%29).

       `other` can be any [sequence::Sequence] of values.

     @function Set.disjoint
     @param {sequence::Sequence} [other] Sequence of values to disjoint with this set
     @return {::Set} A new set which is disjoint with this set and `other`
     @summary Returns a new set which is disjoint with this set and `other`
     @desc
       This function runs in `O(n * 2 * log2(n))` worst-case time.

       This does not modify the set, it returns a new set.

       This function returns a set which contains all the values in
       this set, and all the values in `other`, but *not* the
       values which are in both this set and `other`.

       This is also called the [symmetric difference](http://en.wikipedia.org/wiki/Symmetric_difference)
       of the two sets.

       `other` can be any [sequence::Sequence] of values.

     @function Set.subtract
     @param {sequence::Sequence} [other] Sequence of values to subtract from this set
     @return {::Set} A new set which is this set subtracted by `other`
     @summary Returns a new set which is this set subtracted by `other`
     @desc
       This function runs in `O(n * log2(n))` worst-case time.

       This does not modify the set, it returns a new set.

       This function returns a set which contains all the values in
       this set, but without the values from `other`.

       This is also called the [relative complement](http://en.wikipedia.org/wiki/Complement_%28set_theory%29) of the two sets.

       `other` can be any [sequence::Sequence] of values.
   */
  exports.Set = function (array) {
    return exports.SortedSet(defaultSort, array);
  };

  /**
     @class List
     @summary An immutable ordered sequence of values

     @function List
     @param {optional sequence::Sequence} [seq]
     @desc
       The values from `seq` will be inserted into
       the list, in the same order as `seq`.

       This takes `O(n)` time, unless `seq` is already a
       [::List], in which case it takes `O(1)` time.

       ----

       Duplicate values are allowed, and duplicates don't
       have to be in the same order.

       The values in the list can have whatever order you
       want, but they are not sorted. If you want the values
       to be sorted, use a [::SortedSet] instead.

     @function List.isEmpty
     @return {Boolean} `true` if the list is empty
     @summary Returns whether the list is empty or not
     @desc
       This function runs in `O(1)` time.

       A list is empty if it has no values in it.

     @function List.size
     @return {Integer} The number of values in the list
     @summary Returns the number of values in the list
     @desc
       This function runs in `O(1)` time.

     @function List.has
     @param {Integer} [index] An index within the list
     @return {Boolean} `true` if `index` is valid
     @summary Returns whether `index` is valid for the list
     @desc
       This function runs in `O(1)` time.

       `index` is valid if it is between `0` and
       `list.size() - 1`.

       If `index` is negative, it starts counting from
       the end of the list, so `-1` is the last index for
       the list, `-2` is the second-from-last index, etc.

     @function List.nth
     @param {Integer} [index] A valid index within the list
     @return {Any} The value in the list at `index`
     @summary Returns the value in the list at `index`
     @desc
       This function runs in `O(log2(n / 125))` worst-case time.

       `index` must be between `0` and `list.size() - 1`.

       If `index` is negative, it starts counting from
       the end of the list, so `-1` is the last value
       in the list, `-2` is the second-from-last value,
       etc.

     @function List.push
     @param {Any} [value] The value to insert into the list
     @param {optional Integer} [index] The index to insert `value`. Defaults to `-1`.
     @return {::List} A new list with `value` inserted at `index`
     @summary Returns a new list with `value` inserted at `index`
     @desc
       This function runs in `O(log2(n / 125) + 125)` worst-case time.
       If inserting at the end of the list, it runs in `O(1)` time.

       This does not modify the list, it returns a new list.

       `index` defaults to `-1`, which inserts `value` at
       the end of the list.

       If `index` is negative, it starts counting from
       the end of the list, so `-1` inserts `value` as
       the last value, `-2` inserts `value` as the
       second-from-last value, etc.

     @function List.pop
     @param {optional Integer} [index] The index to remove from the list. Defaults to `-1`.
     @return {::List} A new list with the value at `index` removed
     @summary Returns a new list with the value at `index` removed
     @desc
       This function runs in `O(log2(n / 125) + 125)` worst-case time.
       If removing at the end of the list, it runs in `O(1)` time.

       This does not modify the list, it returns a new list.

       `index` defaults to `-1`, which removes the value
       at the end of the list.

       If `index` is negative, it starts counting from
       the end of the list, so `-1` removes the last value,
       `-2` removes the second-from-last value, etc.

     @function List.modify
     @param {Integer} [index] The index to modify in the list
     @param {Function} [fn] The function which will modify the value at `index`
     @return {::List} A new list with the value at `index` modified by `fn`
     @summary Returns a new list with the value at `index` modified by `fn`
     @desc
       This function runs in `O(log2(n / 125) + 125)` worst-case time.
       If modifying the value at the end of the list, it runs in `O(1)` time.

       This does not modify the list, it returns a new list.

       This function calls `fn` with the value at `index`, and
       whatever `fn` returns will be used as the new value at
       `index`:

           var list = @List([1, 2, 3]);

           // This returns the list [11, 2, 3]
           list.modify(0, x -> x + 10);

           // This returns the list [1, 12, 3]
           list.modify(1, x -> x + 10);

       If `index` is negative, it starts counting from
       the end of the list, so `-1` modifies the last value,
       `-2` modifies the second-from-last value, etc.

     @function List.concat
     @param {::List} [other] The list to append to this list
     @return {::List} A new list with all the values of this list followed
                      by all the values of `other` list.
     @summary Returns a new list with all the values of this list followed
              by all the values of `other` list.
     @desc
       This function runs in `O(125 + log2(n / 125) + log2(min(n / 125, m / 125)))`
       worst-case time.

       This does not modify either list, it returns a new list.
  */
  exports.List = function (array) {
    if (array != null) {
      if (array instanceof ImmutableList) {
        return array;
      } else {
        var o = new ImmutableList(nil, nil, 0);

        array ..@each(function (x) {
          o = o.push(x);
        });

        return o;
      }
    } else {
      return new ImmutableList(nil, nil, 0);
    }
  };


  /**
     @function isDict
     @param {Any} [x]
     @return {Boolean} `true` if `x` is a [::Dict] or [::SortedDict]
     @summary Returns whether `x` is a [::Dict] or [::SortedDict]
   */
  function isDict(x) {
    return x instanceof ImmutableDict;
  }
  exports.isDict = isDict;

  /**
     @function isSet
     @param {Any} [x]
     @return {Boolean} `true` if `x` is a [::Set] or [::SortedSet]
     @summary Returns whether `x` is a [::Set] or [::SortedSet]
   */
  function isSet(x) {
    return x instanceof ImmutableSet;
  }
  exports.isSet = isSet;

  /**
     @function isSortedDict
     @param {Any} [x]
     @return {Boolean} `true` if `x` is a [::SortedDict]
     @summary Returns whether `x` is a [::SortedDict]
   */
  function isSortedDict(x) {
    return isDict(x) && x.sort !== defaultSort;
  }
  exports.isSortedDict = isSortedDict;

  /**
     @function isSortedSet
     @param {Any} [x]
     @return {Boolean} `true` if `x` is a [::SortedSet]
     @summary Returns whether `x` is a [::SortedSet]
   */
  function isSortedSet(x) {
    return isSet(x) && x.sort !== defaultSort;
  }
  exports.isSortedSet = isSortedSet;

  /**
     @function isList
     @param {Any} [x]
     @return {Boolean} `true` if `x` is a [::List]
     @summary Returns whether `x` is a [::List]
   */
  function isList(x) {
    return x instanceof ImmutableList;
  }
  exports.isList = isList;
}
