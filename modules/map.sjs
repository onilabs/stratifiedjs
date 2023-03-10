/*
 * StratifiedJS 'map' module
 * Functions for working with maps
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '1.0.0'
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2013-2022 Oni Labs, http://onilabs.com
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
   @module  map
   @summary Functions for working with maps
   @home    sjs:map
   @inlibrary sjs:std
   @inlibrary mho:std
*/
'use strict';

@ = require('./sequence');

/**
   @class Map
   @inherit ./sequence::Sequence
   @summary Abstraction of JS [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) datatype
   @desc
     * A Map object holds key-value pairs and maintains the original insertion order of the keys. 
     * Any values, whether primitive or object references, may be used as keys and values.
     * Maps are semi-concrete [./sequence::Sequence]s.
     * When iterated with [./sequence::each], maps produce [key,value] pair elements in insertion order.

   @function Map
   @summary Construct a new map
   @param {optional ./sequence::Sequence} [initial_elements] Initial elements in the map. Sequence elements must be [key,value] pairs.
   @return {::Map}
   @desc
     Note: A map itself is a sequence of [key,value] pair elements, so `Map` can be called with a map as `initial_arguments` (which would produce a clone of the map).

   @function Map.clear
   @summary Remove all elements from the map

   @function Map.delete
   @summary Remove the element with the given key from the map.
   @param {Any} [key] Key of element to remove
   @return {Boolean} Returns `true` if the element was removed from the map, `false` if the map didn't contain an element with the given key.

   @function Map.get
   @summary Returns the value associated with the given key, or `undefined` if the map doesn't contain an element under `key`.
   @param {Any} [key] Key of value to retrieve
   @return {Any} 

   @function Map.has
   @summary Test if the map contains an element under the given key.
   @param {Any} [key] 
   @return {Boolean} Returns `true` if the map contains an element under the given key, `false` otherwise.

   @function Map.set
   @summary Set the given `key` in the map to `value`
   @param {Any} [key]
   @param {Any} [value]
   @return {::Map} Returns the map object

   @variable Map.size
   @summary Integer representing the number of elements currently in the map

*/
function _Map(initial) {
  return new Map(initial ? (isMap(initial) ? initial : initial .. @toArray))
}
exports.Map = _Map;

/**
   @function isMap
   @param {Any} [x]
   @summary Returns whether `x` is a [::Map] object or not
   @return {Boolean} Whether `x` is a [::Map] object or not
*/
__js {
  function isMap(obj) {
    return obj instanceof Map;
  }
  exports.isMap = isMap;
} // __js



//----------------------------------------------------------------------
//----------------------------------------------------------------------
// SortedMap

/*
   As our underlying SortedMap implementation we're using
   fast AVL-trees with persistent dynamic sets for cheap cloning and 
   snapshot iterators, as well as folded-in rank information
   for efficient counting & mapping to arrays.

   Implementation following waterhouse & pauan:
     http://arclanguage.org/item?id=14181
     http://arclanguage.org/item?id=18936

*/
__js {
  function max(x,y) { return x > y ? x : y }

  // basics ------------------------------------------------------------

  var NIL = {KEY:null, VALUE:undefined, LEFT:null, RIGHT:null, DEPTH:0, SIZE:0};
  var AVLNode = (l, r, key, val) -> {KEY:key, VALUE:val, LEFT:l, RIGHT:r, 
                                     DEPTH:max(l.DEPTH,r.DEPTH)+1, SIZE:l.SIZE+r.SIZE+1};
  var AVLTree = () -> { root: NIL };

  var avl_clone = T -> { root: T.root };

  // mutations ---------------------------------------------------------

  function _avl_balanced_node(z, l, r) {
    var dd = l.DEPTH-r.DEPTH;
    if (dd > 1) { // left side is too deep
      var LL = l.LEFT, LR = l.RIGHT;
      if (LL.DEPTH >= LR.DEPTH) {
        //console.log('A@'+z.KEY);
        // right-rotate about z
        return AVLNode(LL, AVLNode(LR, r, z.KEY, z.VALUE),
                       l.KEY, l.VALUE);
      }
      else {
        //console.log('B@'+z.KEY);
        // inner + outer rotation
        return AVLNode(AVLNode(LL,LR.LEFT,l.KEY,l.VALUE),
                       AVLNode(LR.RIGHT,r,z.KEY,z.VALUE),
                       LR.KEY, LR.VALUE);
      }
    }
    else if (dd < -1) { // right side is too deep
      var RL = r.LEFT, RR = r.RIGHT;
      if (RR.DEPTH >= RL.DEPTH) {
        //console.log('C@'+z.KEY);
        // left-rotate about z
        return AVLNode(AVLNode(l,RL, z.KEY, z.VALUE), RR,
                       r.KEY, r.VALUE);
      }
      else {
        //console.log('D@'+z.KEY);
        // inner + outer rotation
        return AVLNode(AVLNode(l,RL.LEFT,z.KEY,z.VALUE),
                       AVLNode(RL.RIGHT,RR,r.KEY,r.VALUE),
                       RL.KEY,RL.VALUE);
      }
    }
    else {
      // if (z.LEFT === l && z.RIGHT === r) {
      //   This clause is hit if deleting a non-existing key.
      //   We could enable this clause as a (slight) performance enhancement for that case
      //  return z;
      // }
      return AVLNode(l, r, z.KEY, z.VALUE);
    }
  }

  // XXX this probably does too much work
  function _avl_concat(l,r) {
    if (l === NIL) return r;
    else if (r === NIL) return l;
    else if (l.DEPTH <= r.DEPTH)
      return _avl_balanced_node(r, _avl_concat(l, r.LEFT), r.RIGHT);
    else
      return _avl_balanced_node(l, l.LEFT, _avl_concat(l.RIGHT, r));
  }

  // z: start node, k: key, v: value, r: rank offset
  // returns [tree_node,modify_index|-insert_index] (negative index iff inserted new node)
  function _avl_node_set(z, k, v, r) {
    if (z === NIL) {
      return [AVLNode(NIL, NIL, k, v), -(r+1)];
    }
    if (k == z.KEY) { // XXX should this be '==='?
      return [AVLNode(z.LEFT, z.RIGHT, k, v), z.LEFT.SIZE+1+r];
    }
    else if (k < z.KEY) {
      var [L,r] = _avl_node_set(z.LEFT, k, v, r);
      return [_avl_balanced_node(z, L, z.RIGHT), r];
    }
    else {
      var [R,r] = _avl_node_set(z.RIGHT, k, v, z.LEFT.SIZE+1+r);
      return [_avl_balanced_node(z, z.LEFT, R), r];
    }
  }

  // z: start node, k: key, r: rank offset
  function _avl_node_del_by_key(z, k, r) {
    if (z === NIL)
      return [NIL,0];
    else if (k == z.KEY) { // XXX should this be '==='?
      return [_avl_concat(z.LEFT,z.RIGHT), z.LEFT.SIZE+1+r];
    }
    else if (k < z.KEY) {
      var [L,r] = _avl_node_del_by_key(z.LEFT, k, r);
      return [_avl_balanced_node(z, L, z.RIGHT), r];
    }
    else {
      var [R,r] = _avl_node_del_by_key(z.RIGHT, k, z.LEFT.SIZE+1+r);
      return [_avl_balanced_node(z, z.LEFT, R), r];
    }
  }

  // returns 1-based index of modified element, or -index if new element
  function avl_set(T, k, v) {
    var rv = _avl_node_set(T.root, k, v, 0);
    T.root = rv[0];
    return rv[1];
  }

  // returns 1-based index of deleted element, or 0 if not found
  function avl_del_by_key(T, k) {
    var rv = _avl_node_del_by_key(T.root, k, 0);
    T.root = rv[0];
    return rv[1];
  }

  // retrieval -----------------------------------------------------------------------------

  function _avl_node_get_by_key(z, k) {
    while (z !== NIL) { 
      if (k < z.KEY) z = z.LEFT;
      else if (k == z.KEY) break;
      else z = z.RIGHT;
    }
    return z;
  }

  function _avl_node_get_by_rank(z, r) {
    var s = z.LEFT.SIZE+1;
    if (s === r) return z;
    else if (r < s)
      return _avl_node_get_by_rank(z.LEFT, r);
    else
      return _avl_node_get_by_rank(z.RIGHT, r - s);
  }

  function avl_get_by_key(T, k) {
    var z = _avl_node_get_by_key(T.root, k);
    return z.VALUE;
  }

  function avl_has_key(T, k) {
    return _avl_node_get_by_key(T.root, k) !== NIL;
  }

  function avl_get_by_index(T, i) {
    if (i<=0||i>T.root.SIZE) throw new Error("Index out of bounds");
    var z = _avl_node_get_by_rank(T.root, i);
    return [z.KEY,z.VALUE];
  }

  function avl_count(T) {
    return T.root.SIZE;
  }


  // debugging -----------------------------------------------------------------------------

  function _avl_node_dump(z) {
    if (z === NIL) return '\u22a5';
    var rv = "("+z.KEY;
//    rv += '/'+z.VALUE;
//    rv += '['+z.DEPTH+']';
    rv += ": "+_avl_node_dump(z.LEFT)+", "+_avl_node_dump(z.RIGHT);
    rv += ')';
    return rv;
  }
  var avl_tree_dump = (T) -> _avl_node_dump(T.root);

  function avl_assert_valid_node(z) {
    if (z === NIL) {
      if (!(z.KEY === null && z.VALUE === null && z.LEFT === null && z.RIGHT === null && z.DEPTH === 0)) throw new Error('Invalid NIL Node '+z);
      return 0;
    }
    else {
      if (z.DEPTH !== max(z.LEFT.DEPTH,z.RIGHT.DEPTH)+1) throw new Error('Invalid depth '+z.DEPTH+' -- '+z.LEFT.DEPTH+' --- '+z.RIGHT.DEPTH);
      if (z.LEFT !== NIL && z.LEFT.KEY >= z.KEY) throw new Error('Invalid sorting 1');
      if (z.RIGHT !== NIL && z.RIGHT.KEY <= z.KEY) throw new Error('Invalid sorting 2');
      if (Math.abs(z.LEFT.DEPTH-z.RIGHT.DEPTH) >= 2) throw new Error('Unbalanced');
      if (z.SIZE !== z.LEFT.SIZE+z.RIGHT.SIZE+1) throw new Error("Invalid size");
      return avl_assert_valid_node(z.LEFT) + avl_assert_valid_node(z.RIGHT) +1;
    }
  }

  function avl_assert_valid_tree(T) {
//    console.log("DEPTH = #{T.root.DEPTH}");
    return T.root .. avl_assert_valid_node;
  }

} // __js

// streaming ----------------------------------------------------------
// (not js, because r might block)
function _avl_stream_node(z, r) {
  if (z === NIL) return;
  _avl_stream_node(z.LEFT,r);
  r([z.KEY,z.VALUE]);
  _avl_stream_node(z.RIGHT,r);
}
__js var avl_stream = (T) -> @Stream:: function(r) {
  return T.root .. _avl_stream_node(r);
}




/**
   @class SortedMap
   @summary key-value map sorted by key
   @desc
     * A SortedMap object holds key-value pairs sorted by key (with '<' & '=='). 
     * Any values, whether primitive or object references, may be used as keys and values.
     * Entries will be sorted on keys using '<' & '==' relations, and can be iterated in this order using [::SortedMap::elements].

   @function SortedMap
   @summary Construct a new SortedMap
   @param {optional ./sequence::Sequence|::SortedMap} [initial_elements] Initial elements. Sequence elements must be `[key,value]` pairs.
   @return {::SortedMap}
   @desc
     - Initializing with a sequence is of complexity `O(n*log(n))`; initializing with another
     SortedMap is of complexity `O(1)`.

   @function SortedMap.delete
   @summary Remove the element with the given key from the sorted map (`O(log n)`).
   @param {Any} [key] Key of element to remove
   @return {Integer} Returns the rank (1-based index) of the removed element or `0` if the map didn't contain an element with the given key.

   @function SortedMap.get
   @summary Returns the value associated with the given key, or `undefined` if the sorted map doesn't contain an element under `key` (`O(log n)`).
   @param {Any} [key] Key of value to retrieve
   @return {Any} 

   @function SortedMap.has
   @summary Test if the sorted map contains an element under the given key (`O(log n)`).
   @param {Any} [key] 
   @return {Boolean} Returns `true` if the sorted map contains an element under the given key, `false` otherwise.

   @function SortedMap.set
   @summary Set the given `key` in the map to `value` (`O(log n)`).
   @param {Any} [key]
   @param {Any} [value]
   @return {Integer} Returns the rank (1-based index) of the element changed, or,if a new element was added to the map, `-rank` of the new element (i.e. a negative number).

   @function SortedMap.count
   @summary Return number of elements in the sorted map (`O(1)`).

   @function SortedMap.clone
   @summary Return a clone of the SortedMap (`O(1)`).
   @return {::SortedMap}


   @variable SortedMap.elements
   @summary [./sequence::Stream] of `[key,value]` elements in the map, sorted by `key`.
   @desc
     Each iteration operates on the state of the SortedMap at the time that iteration starts. 
     Mutations to the SortedMap after this point will not be reflected in that iterated sequence.
*/

/**
   @function isSortedMap
   @param {Any} [x]
   @summary Returns whether `x` is a [::SortedMap] object or not
   @return {Boolean} Whether `x` is a [::SortedMap] object or not
*/
__js {
  function isSortedMap(obj) { return obj && obj.__oni_is_SortedMap; }
  exports.isSortedMap = isSortedMap;
} // __js

__js {
  function _SortedMap(T) {
    return {
      __oni_is_SortedMap: true,
      clone: -> _SortedMap(avl_clone(T)),
      count: -> T.root.SIZE,
      get: key -> T .. avl_get_by_key(key),
      has: key -> T .. avl_has_key(key),
      set: (key, val) ->  T .. avl_set(key, val),
      delete: key -> T .. avl_del_by_key(key),
      elements: avl_stream(T)
    };
  }

  function SortedMap(initial) {
    var T;
    if (isSortedMap(initial)) {
      return initial.clone();
    }
    else {
      T = AVLTree();
      if (initial) {
      initial .. @each {|[k,v]| avl_set(T, k, v); }
      }
      return _SortedMap(T);
    }
  }
  exports.SortedMap = SortedMap;
} // __js
